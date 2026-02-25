import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  ChevronDown,
  ChevronRight,
  Phone,
  Shield,
  FileText,
  RefreshCw,
  Download,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui';
import { incidentApi } from '../../api/admin';
import type { IncidentRevisionActionType } from '../../types';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface RevisionHistoryProps {
  incidentId: string;
}

const actionTypeLabels: Record<IncidentRevisionActionType, string> = {
  field_change: 'Field Changes',
  comment_added: 'Comments Added',
  comment_modified: 'Comments Modified',
  comment_deleted: 'Comments Deleted',
  attachment_added: 'Attachments Added',
  attachment_removed: 'Attachments Removed',
  assignee_changed: 'Assignment Changes',
  status_changed: 'Status Changes',
  created: 'Created',
};

export const RevisionHistory: React.FC<RevisionHistoryProps> = ({ incidentId }) => {
  const [page, setPage] = useState(1);
  const [expandedRevisions, setExpandedRevisions] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<IncidentRevisionActionType | ''>('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['incident', incidentId, 'revisions', page, filterType],
    queryFn: () =>
      incidentApi.getRevisions(incidentId, {
        page,
        limit: 20,
        action_type: filterType || undefined,
      }),
    enabled: !!incidentId,
  });

  const revisions = data?.data || [];
  const totalPages = data?.total_pages || 1;
  const totalItems = data?.total_items || 0;

  const toggleExpand = (revisionId: string) => {
    const newExpanded = new Set(expandedRevisions);
    if (newExpanded.has(revisionId)) {
      newExpanded.delete(revisionId);
    } else {
      newExpanded.add(revisionId);
    }
    setExpandedRevisions(newExpanded);
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const handleExport = async () => {
    // Fetch all revisions for export
    const allData = await incidentApi.getRevisions(incidentId, {
      page: 1,
      limit: 10000,
      action_type: filterType || undefined,
    });

    const rows = allData.data.map((rev) => ({
      '#': rev.revision_number,
      Timestamp: formatDateTime(rev.created_at),
      Action: rev.action_description,
      'Action Taken By': rev.performed_by
        ? `${rev.performed_by.first_name || ''} ${rev.performed_by.last_name || ''}`.trim() ||
        rev.performed_by.username
        : 'System',
      Role: rev.performed_by_roles?.join(', ') || '',
      Mobile: rev.performed_by_phone || rev.performed_by?.phone || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Revisions');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const filename = `incident-revisions-${incidentId}-${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(blob, filename);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[hsl(var(--muted-foreground))]">Loading revision history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as IncidentRevisionActionType | '');
                setPage(1);
              }}
              className="pl-8 pr-4 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
            >
              <option value="">All Actions</option>
              {Object.entries(actionTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </div>
          {totalItems > 0 && (
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              {totalItems} revision{totalItems !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            leftIcon={<RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={revisions.length === 0}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Revision Table */}
      {revisions.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[hsl(var(--border))] rounded-lg">
          <FileText className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
          <p className="text-[hsl(var(--foreground))] font-medium">No revisions found</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Changes to this incident will appear here
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[hsl(var(--border))] rounded-lg">
          <table className="min-w-full">
            <thead>
              <tr className="bg-[hsl(var(--muted)/0.5)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Action Taken By
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Mobile
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider w-20">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))] bg-[hsl(var(--card))]">
              {revisions.map((revision) => (
                <React.Fragment key={revision.id}>
                  <tr className="hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-[hsl(var(--foreground))]">
                      {revision.revision_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-[hsl(var(--foreground))]">
                        <Clock className="w-4 h-4 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
                        <span className="whitespace-nowrap">{formatDateTime(revision.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[hsl(var(--foreground))]">
                        {revision.action_description}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-semibold">
                            {revision.performed_by?.first_name?.[0] ||
                              revision.performed_by?.username?.[0] ||
                              'S'}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                          {revision.performed_by
                            ? `${revision.performed_by.first_name || ''} ${revision.performed_by.last_name || ''}`.trim() ||
                            revision.performed_by.username
                            : 'System'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {revision.performed_by?.roles?.map((role, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-full"
                          >
                            <Shield className="w-3 h-3" />
                            {role.name}
                          </span>
                        ))}
                        {(!revision.performed_by_roles || revision.performed_by_roles.length === 0) && (
                          <span className="text-sm text-[hsl(var(--muted-foreground))]">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(revision.performed_by_phone || revision.performed_by?.phone) ? (
                        <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                          <Phone className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                          {revision.performed_by_phone || revision.performed_by?.phone}
                        </div>
                      ) : (
                        <span className="text-sm text-[hsl(var(--muted-foreground))]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {revision.changes && revision.changes.length > 0 && (
                        <button
                          onClick={() => toggleExpand(revision.id)}
                          className="flex items-center gap-1 text-sm text-[hsl(var(--primary))] hover:underline"
                        >
                          {expandedRevisions.has(revision.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          {revision.changes.length}
                        </button>
                      )}
                    </td>
                  </tr>
                  {/* Expanded details row */}
                  {expandedRevisions.has(revision.id) && revision.changes && revision.changes.length > 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-3 bg-[hsl(var(--muted)/0.2)]">
                        <div className="pl-8 space-y-2">
                          <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase mb-2">
                            Field Changes
                          </p>
                          {revision.changes.map((change, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 text-sm py-1 px-3 bg-[hsl(var(--background))] rounded-lg"
                            >
                              <span className="font-medium text-[hsl(var(--foreground))] min-w-[140px]">
                                {change.field_label}:
                              </span>
                              <span className="text-[hsl(var(--muted-foreground))] line-through">
                                {change.old_value || '(empty)'}
                              </span>
                              <ArrowRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
                              <span className="text-[hsl(var(--foreground))] font-medium">
                                {change.new_value || '(empty)'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[hsl(var(--border))]">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevisionHistory;
