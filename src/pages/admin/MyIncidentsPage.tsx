import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Eye,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Building2,
  UserCheck,
  PenLine,
  Repeat,
} from 'lucide-react';
import { Button, Checkbox } from '../../components/ui';
import { incidentApi } from '../../api/admin';
import type { Incident } from '../../types';
import { useIncidentListWebSocket } from '../../lib/services/incidentListWebSocket';
import { cn } from '@/lib/utils';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../constants/permissions';
import BulkConvertToRequestModal from '@/components/incidents/BulkConvertToRequestModal';

interface MyIncidentsPageProps {
  type: 'assigned' | 'created';
}

export const MyIncidentsPage: React.FC<MyIncidentsPageProps> = ({ type }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIncidents, setSelectedIncidents] = useState<any[]>([]);
  const [showConvertModal, setShowConvertModal] = useState<boolean>(false);

  const isAssigned = type === 'assigned';
  const canCreateIncident = isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_CREATE);
  const pageTitle = isAssigned ? 'Assigned to Me' : 'Created by Me';
  const pageDescription = isAssigned
    ? 'Incidents that are currently assigned to you'
    : 'Incidents that you have reported or created';
  const PageIcon = isAssigned ? UserCheck : PenLine;

  const { data: incidentsData, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['incidents', type === 'assigned' ? 'my-assigned' : 'my-reported', page, limit],
    queryFn: () => type === 'assigned'
      ? incidentApi.getMyAssigned(page, limit, 'incident')
      : incidentApi.getMyReported(page, limit, 'incident'),
  });

  // Real-time viewer count updates via WebSocket (no polling!)
  useIncidentListWebSocket();

  const incidents = incidentsData?.data || [];
  const totalPages = incidentsData?.total_pages ?? 1;
  const totalItems = incidentsData?.total_items ?? 0;

  // Client-side search filter
  const filteredIncidents = searchTerm
    ? incidents.filter((incident: Incident) =>
        incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.incident_number.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : incidents;

  const getLookupValue = (incident: Incident, categoryCode: string) => {
    return incident.lookup_values?.find(lv => lv.category?.code === categoryCode);
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

   const toggleSelectAll = (checked: boolean, incidents: any[]) => {
    if (checked) {
      setSelectedIncidents(incidents);
    } else {
      setSelectedIncidents([]);
    }
  };

  const handleCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    item: Incident
    ) => {
      const { checked } = e.target;
  
      setSelectedIncidents((prev) =>
        checked
          ? [...prev, item]
          : prev.filter((i) => i.id !== item.id)
      );
    };
  
   const allSameState =
      selectedIncidents?.length > 0 &&
      selectedIncidents.every((incident) =>
        incident?.current_state?.name === selectedIncidents[0]?.current_state?.name &&
        incident?.location?.id === selectedIncidents[0]?.location?.id &&
        incident?.classification?.id === selectedIncidents[0]?.classification?.id
      );

    const isSelected = (item: Incident) =>
      selectedIncidents.some((i) => i?.id === item?.id);
  

  if (error) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-[hsl(var(--destructive)/0.1)] rounded-2xl flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-[hsl(var(--destructive))]" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">Failed to Load Incidents</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6 text-center max-w-sm">
            There was an error loading your incidents. Please try again.
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
           {selectedIncidents?.length > 1 && allSameState ? 
          <Button leftIcon={<Repeat className="w-4 h-4" />} onClick={() => setShowConvertModal(true)}>
            {t('incidents.convertToRequest')}
          </Button> : null }
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            leftIcon={!isFetching ? <RefreshCw className="w-4 h-4" /> : undefined}
          >
            Refresh
          </Button>
          {canCreateIncident && (
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/incidents/new')}>
              Create Incident
            </Button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <AlertTriangle className="w-5 h-5 text-blue-500" />
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
                {incidents.filter((i: Incident) => i.current_state?.state_type === 'initial').length}
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
                {incidents.filter((i: Incident) => i.current_state?.state_type === 'terminal').length}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Resolved</p>
            </div>
          </div>
        </div>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                {incidents.filter((i: Incident) => i.sla_breached).length}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">SLA Breached</p>
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
            placeholder="Search by title or incident number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] focus:bg-[hsl(var(--background))] transition-all text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
          />
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[hsl(var(--primary)/0.1)] rounded-2xl mb-4">
              <div className="w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-[hsl(var(--muted-foreground))]">Loading incidents...</p>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[hsl(var(--muted))] rounded-2xl mb-4">
              <PageIcon className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
            </div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">No Incidents Found</h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              {searchTerm
                ? 'No incidents match your search'
                : isAssigned
                ? 'No incidents are currently assigned to you'
                : 'You have not created any incidents yet'}
            </p>
            {searchTerm ? (
              <Button variant="outline" onClick={() => setSearchTerm('')}>Clear Search</Button>
            ) : canCreateIncident ? (
              <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/incidents/new')}>
                Create Incident
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="ps-4">
                        <Checkbox
                          checked={selectedIncidents.length === incidents.length && incidents.length > 0}
                          onChange={(e) => toggleSelectAll(e.target.checked, incidents)}
                        />
                      </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        Incident
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
                        Due Date
                      </span>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        SLA
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
                  {filteredIncidents.map((incident: Incident) => {
                    const priority = getLookupValue(incident, 'PRIORITY');
                    return (
                    <tr
                      key={incident.id}
                      className="hover:bg-[hsl(var(--muted)/0.5)] transition-colors cursor-pointer"
                    >
                      <td  onClick={(e) => e.stopPropagation()} className='ps-4'>
                          <Checkbox
                          id={incident.id}
                          checked={isSelected(incident)}
                          // disabled={isDisabled(incident)}
                          onChange={(e) => handleCheckboxChange(e, incident)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-[hsl(var(--primary))] mb-0.5 cursor-pointer hover:underline"
                            onClick={() => navigate(`/incidents/${incident.id}`)}
                            >
                              {incident.incident_number}
                            </p>
                            {incident.active_viewers && incident.active_viewers > 0 && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300"
                                title={`${incident.active_viewers} user${incident.active_viewers > 1 ? 's' : ''} currently viewing`}
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                                {incident.active_viewers}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">
                            {incident.title}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {incident.current_state ? (
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: incident.current_state.color ? `${incident.current_state.color}20` : 'hsl(var(--muted))',
                              color: incident.current_state.color || 'hsl(var(--foreground))',
                            }}
                          >
                            {incident.current_state.name}
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
                          incident.department ? (
                            <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                              <Building2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                              {incident.department.name}
                            </div>
                          ) : (
                            <span className="text-sm text-[hsl(var(--muted-foreground))]">-</span>
                          )
                        ) : (
                          incident.assignee ? (
                            <div className="flex items-center gap-2">
                              {incident.assignee.avatar ? (
                                <img
                                  src={incident.assignee.avatar}
                                  alt={incident.assignee.username}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center">
                                  <span className="text-white text-xs font-semibold">
                                    {incident.assignee.first_name?.[0] || incident.assignee.username[0]}
                                  </span>
                                </div>
                              )}
                              <span className="text-sm text-[hsl(var(--foreground))]">
                                {incident.assignee.first_name || incident.assignee.username}
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
                          {formatDate(incident.due_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {incident.sla_breached ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-600">
                            <AlertTriangle className="w-3 h-3" />
                            Breached
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-600">
                            <CheckCircle2 className="w-3 h-3" />
                            On Track
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Eye className="w-4 h-4" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/incidents/${incident.id}`);
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
                  <span className="font-semibold text-[hsl(var(--foreground))]">{totalItems}</span> incidents
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
      <BulkConvertToRequestModal
        incidents={selectedIncidents}
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        onSuccess={(newRequestId) => {
          setShowConvertModal(false);
          navigate(`/requests/${newRequestId}`);
        }}
      />
    </div>
  );
};
