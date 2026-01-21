import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Building2,
  UserCheck,
  PenLine,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { incidentApi } from '../../api/admin';
import type { Incident } from '../../types';
import { cn } from '@/lib/utils';

interface MyRequestsPageProps {
  type: 'assigned' | 'created';
}

export const MyRequestsPage: React.FC<MyRequestsPageProps> = ({ type }) => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const isAssigned = type === 'assigned';
  const pageTitle = isAssigned ? 'Assigned to Me' : 'Created by Me';
  const pageDescription = isAssigned
    ? 'Requests that are currently assigned to you'
    : 'Requests that you have created';
  const PageIcon = isAssigned ? UserCheck : PenLine;

  const { data: requestsData, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['requests', type === 'assigned' ? 'my-assigned' : 'my-created', page, limit],
    queryFn: () => type === 'assigned'
      ? incidentApi.getMyAssigned(page, limit, 'request')
      : incidentApi.getMyReported(page, limit, 'request'),
  });

  const requests = requestsData?.data || [];
  const totalPages = requestsData?.total_pages ?? 1;
  const totalItems = requestsData?.total_items ?? 0;

  // Client-side search filter
  const filteredRequests = searchTerm
    ? requests.filter((request: Incident) =>
        request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.incident_number.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : requests;

  const getLookupValue = (request: Incident, categoryCode: string) => {
    return request.lookup_values?.find(lv => lv.category?.code === categoryCode);
  };

  const getLookupLabel = (value: any) => {
    if (!value) return null;
    return i18n.language === 'ar' && value.name_ar ? value.name_ar : value.name;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (error) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-[hsl(var(--destructive)/0.1)] rounded-2xl flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-[hsl(var(--destructive))]" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">Failed to Load Requests</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6 text-center max-w-sm">
            There was an error loading your requests. Please try again.
          </p>
          <Button onClick={() => refetch()} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <PageIcon className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">{pageTitle}</h1>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">{pageDescription}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            leftIcon={!isFetching ? <RefreshCw className="w-4 h-4" /> : undefined}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{totalItems}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                {requests.filter((r: Incident) => r.current_state?.state_type === 'initial').length}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Open</p>
            </div>
          </div>
        </div>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                {requests.filter((r: Incident) => r.current_state?.state_type === 'terminal').length}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
          <input
            type="text"
            placeholder="Search by title or request number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] focus:bg-[hsl(var(--background))] transition-all text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[hsl(var(--primary)/0.1)] rounded-2xl mb-4">
              <div className="w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-[hsl(var(--muted-foreground))]">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[hsl(var(--muted))] rounded-2xl mb-4">
              <PageIcon className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
            </div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">No Requests Found</h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              {searchTerm
                ? 'No requests match your search'
                : isAssigned
                ? 'No requests are currently assigned to you'
                : 'You have not created any requests yet'}
            </p>
            {searchTerm && (
              <Button variant="outline" onClick={() => setSearchTerm('')}>Clear Search</Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        Request
                      </span>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        State
                      </span>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        Priority
                      </span>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {isAssigned ? 'Department' : 'Assignee'}
                      </span>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        Created Date
                      </span>
                    </th>
                    <th className="px-6 py-4 text-right">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        Actions
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {filteredRequests.map((request: Incident) => {
                    const priority = getLookupValue(request, 'PRIORITY');
                    return (
                    <tr
                      key={request.id}
                      className="hover:bg-[hsl(var(--muted)/0.5)] transition-colors cursor-pointer"
                      onClick={() => navigate(`/requests/${request.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="text-xs font-medium text-[hsl(var(--primary))] mb-0.5">
                            {request.incident_number}
                          </p>
                          <p className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">
                            {request.title}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {request.current_state ? (
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: request.current_state.color ? `${request.current_state.color}20` : 'hsl(var(--muted))',
                              color: request.current_state.color || 'hsl(var(--foreground))',
                            }}
                          >
                            {request.current_state.name}
                          </span>
                        ) : (
                          <span className="text-sm text-[hsl(var(--muted-foreground))]">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                          {priority ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-white"
                                  style={{ backgroundColor: priority.color || 'bg-gray-400' }}>
                              {getLookupLabel(priority)}
                            </span>
                          ) : <span className="text-sm text-[hsl(var(--muted-foreground))]">-</span>}
                      </td>
                      <td className="px-6 py-4">
                        {isAssigned ? (
                          request.department ? (
                            <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                              <Building2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                              {request.department.name}
                            </div>
                          ) : (
                            <span className="text-sm text-[hsl(var(--muted-foreground))]">-</span>
                          )
                        ) : (
                          request.assignee ? (
                            <div className="flex items-center gap-2">
                              {request.assignee.avatar ? (
                                <img
                                  src={request.assignee.avatar}
                                  alt={request.assignee.username}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center">
                                  <span className="text-white text-xs font-semibold">
                                    {request.assignee.first_name?.[0] || request.assignee.username[0]}
                                  </span>
                                </div>
                              )}
                              <span className="text-sm text-[hsl(var(--foreground))]">
                                {request.assignee.first_name || request.assignee.username}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                              <User className="w-4 h-4" />
                              Unassigned
                            </span>
                          )
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                          <Calendar className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                          {formatDate(request.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Eye className="w-4 h-4" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/requests/${request.id}`);
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[hsl(var(--muted)/0.3)]">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Showing{' '}
                  <span className="font-semibold text-[hsl(var(--foreground))]">
                    {(page - 1) * limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-semibold text-[hsl(var(--foreground))]">
                    {Math.min(page * limit, totalItems)}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-[hsl(var(--foreground))]">{totalItems}</span> requests
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={cn(
                            "w-10 h-10 rounded-lg text-sm font-semibold transition-all",
                            page === pageNum
                              ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/0.3)]"
                              : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] hover:border-[hsl(var(--border))] border border-transparent"
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                    className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
