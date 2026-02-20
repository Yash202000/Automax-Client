import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
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
  AlertCircle,
  Filter,
  Calendar,
  User,
  Building2,
  Settings2,
  Check,
  ArrowRightLeft,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { incidentApi, workflowApi, userApi, departmentApi, classificationApi, locationApi } from '../../api/admin';
import type { Incident, IncidentFilter, Workflow, User as UserType, Department, WorkflowState, Classification, Location } from '../../types';
import { useIncidentListWebSocket } from '../../lib/services/incidentListWebSocket';
import { cn } from '@/lib/utils';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../constants/permissions';
import { MergeIncidentsModal } from '../../components/incidents';

// Column configuration
interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean; // Can't be hidden
}

const COLUMN_STORAGE_KEY = 'incident_columns_config';

const defaultColumns: ColumnConfig[] = [
  { id: 'incident', label: 'Incident', visible: true, required: true },
  { id: 'state', label: 'State', visible: true },
  { id: 'priority', label: 'Priority', visible: true },
  { id: 'assignee', label: 'Assignee', visible: true },
  { id: 'department', label: 'Department', visible: false },
  { id: 'due_date', label: 'Due Date', visible: true },
  { id: 'created_at', label: 'Created', visible: false },
  { id: 'sla', label: 'SLA', visible: true },
  { id: 'actions', label: 'Actions', visible: true, required: true },
];

const loadColumnsFromStorage = (): ColumnConfig[] => {
  try {
    const stored = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ColumnConfig[];
      // Merge with defaults to ensure all columns exist
      return defaultColumns.map(def => {
        const stored = parsed.find(p => p.id === def.id);
        return stored ? { ...def, visible: stored.visible } : def;
      });
    }
  } catch {
    // Ignore parse errors
  }
  return defaultColumns;
};

export const IncidentsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<IncidentFilter>({
    page: 1,
    limit: 10,
    record_type: 'incident',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(loadColumnsFromStorage);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [selectedIncidents, setSelectedIncidents] = useState<Set<string>>(new Set());
  const [showMergeModal, setShowMergeModal] = useState(false);
  const columnConfigRef = useRef<HTMLDivElement>(null);

  const canViewAllIncidents = isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_VIEW_ALL);
  const canCreateIncident = isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_CREATE);
  const canMergeIncidents = isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_UPDATE);

  // Get status from URL - users with view permission can access if status filter is applied
  const urlStatusParam = searchParams.get('status');
  const urlSlaBreachedParam = searchParams.get('sla_breached');
  const hasUrlFilter = !!urlStatusParam || urlSlaBreachedParam === 'true';

  // Redirect to my-assigned if user doesn't have view_all permission AND no status filter is applied
  useEffect(() => {
    if (!canViewAllIncidents && !hasUrlFilter) {
      navigate('/incidents/my-assigned', { replace: true });
    }
  }, [canViewAllIncidents, hasUrlFilter, navigate]);

  // Handle click outside column config dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnConfigRef.current && !columnConfigRef.current.contains(event.target as Node)) {
        setShowColumnConfig(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save columns to localStorage when changed
  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  const toggleColumn = (columnId: string) => {
    setColumns(prev => prev.map(col =>
      col.id === columnId && !col.required ? { ...col, visible: !col.visible } : col
    ));
  };

  const isColumnVisible = (columnId: string) => {
    return columns.find(c => c.id === columnId)?.visible ?? true;
  };

  const visibleColumnCount = columns.filter(c => c.visible).length;

  // Multi-select handlers
  const toggleSelectIncident = (incidentId: string) => {
    setSelectedIncidents(prev => {
      const next = new Set(prev);
      if (next.has(incidentId)) {
        next.delete(incidentId);
      } else {
        next.add(incidentId);
      }
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean, incidentIds: string[]) => {
    if (checked) {
      setSelectedIncidents(prev => new Set([...Array.from(prev), ...incidentIds]));
    } else {
      setSelectedIncidents(new Set());
    }
  };

  const clearSelection = () => {
    setSelectedIncidents(new Set());
  };

  const handleMergeSuccess = () => {
    clearSelection();
    setShowMergeModal(false);
    refetch();
    toast.success(t('incidentMerge.mergeSuccess'));
  };

  // Queries - only fetch incident-type workflows
  const { data: workflowsData } = useQuery({
    queryKey: ['workflows', 'incident'],
    queryFn: async () => {
      const [incidentRes, bothRes] = await Promise.all([
        workflowApi.listByRecordType('incident', false),
        workflowApi.listByRecordType('both', false),
      ]);
      const combined = [...(incidentRes.data || []), ...(bothRes.data || [])];
      const unique = combined.filter((item, index, self) =>
        index === self.findIndex(t => t.id === item.id)
      );
      return { success: true, data: unique };
    },
  });

  // Get all states from incident workflows for filter
  const allStates = workflowsData?.data?.flatMap((w: Workflow) => w.states || []) || [];
  const uniqueStates = allStates.reduce((acc: WorkflowState[], state: WorkflowState) => {
    if (!acc.find(s => s.name === state.name)) {
      acc.push(state);
    }
    return acc;
  }, []);

  // Read status and sla_breached from URL and sync with filter
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const slaBreachedParam = searchParams.get('sla_breached');

    // Build new filter state based on URL params
    const newFilterUpdates: Partial<IncidentFilter> = {};
    let needsUpdate = false;

    // Handle sla_breached param
    if (slaBreachedParam === 'true') {
      if (filter.sla_breached !== true) {
        newFilterUpdates.sla_breached = true;
        needsUpdate = true;
      }
    } else {
      if (filter.sla_breached !== undefined) {
        newFilterUpdates.sla_breached = undefined;
        needsUpdate = true;
      }
    }

    // Handle status param
    if (statusParam) {
      if (statusParam !== statusFilter) {
        setStatusFilter(statusParam);
        // Find the state ID by name
        const matchingState = uniqueStates.find(
          (s: WorkflowState) => s.name.toLowerCase() === statusParam.toLowerCase()
        );
        if (matchingState && filter.current_state_id !== matchingState.id) {
          newFilterUpdates.current_state_id = matchingState.id;
          needsUpdate = true;
        }
      }
    } else {
      if (statusFilter) {
        setStatusFilter(null);
      }
      if (filter.current_state_id !== undefined) {
        newFilterUpdates.current_state_id = undefined;
        needsUpdate = true;
      }
    }

    // Apply updates if needed
    if (needsUpdate) {
      setFilter(prev => ({
        ...prev,
        ...newFilterUpdates,
        page: 1,
      }));
    }
  }, [searchParams, uniqueStates]);

  const { data: incidentsData, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['incidents', filter],
    queryFn: () => incidentApi.list(filter),
  });

  // Real-time viewer count updates via WebSocket (no polling!)
  useIncidentListWebSocket();

  const { data: statsData } = useQuery({
    queryKey: ['incidents', 'stats', 'incident'],
    queryFn: () => incidentApi.getStats('incident'),
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin', 'users', 1, 100],
    queryFn: () => userApi.list(1, 100),
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['admin', 'departments', 'list'],
    queryFn: () => departmentApi.list(),
  });

  const { data: classificationsData } = useQuery({
    queryKey: ['admin', 'classifications', 'list'],
    queryFn: () => classificationApi.list(),
  });

  const { data: locationsData } = useQuery({
    queryKey: ['admin', 'locations', 'list'],
    queryFn: () => locationApi.list(),
  });

  const stats = statsData?.data;
  const incidents = incidentsData?.data || [];
  const totalPages = incidentsData?.total_pages ?? 1;
  const totalItems = incidentsData?.total_items ?? 0;

  const handleFilterChange = (key: keyof IncidentFilter, value: string | number | boolean | undefined) => {
    setFilter(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page on filter change
    }));
  };

  const clearFilters = () => {
    setFilter({
      page: 1,
      limit: 10,
      record_type: 'incident',
    });
    setStatusFilter(null);
    setSearchParams({});
  };

  const hasActiveFilters = !!(
    filter.search ||
    filter.workflow_id ||
    filter.current_state_id ||
    filter.classification_id ||
    filter.location_id ||
    filter.assignee_id ||
    filter.department_id ||
    filter.sla_breached !== undefined
  );

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

  if (error) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-[hsl(var(--destructive)/0.1)] rounded-2xl flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-[hsl(var(--destructive))]" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{t('incidents.failedToLoad')}</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6 text-center max-w-sm">
            {t('incidents.errorLoading')}
          </p>
          <Button onClick={() => refetch()} leftIcon={<RefreshCw className="w-4 h-4" />}>
            {t('common.tryAgain')}
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
            <div className={`p-2 rounded-lg ${filter.sla_breached ? 'bg-red-500/10' : 'bg-[hsl(var(--primary)/0.1)]'}`}>
              <AlertTriangle className={`w-5 h-5 ${filter.sla_breached ? 'text-red-500' : 'text-[hsl(var(--primary))]'}`} />
            </div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {filter.sla_breached ? t('incidents.slaBreached') : statusFilter ? `${statusFilter} ${t('incidents.title')}` : t('incidents.title')}
            </h1>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">
            {filter.sla_breached
              ? t('incidents.showingSlaBreach')
              : statusFilter
              ? `${t('incidents.showingStatus')}: ${statusFilter}`
              : t('incidents.subtitle')
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIncidents.size >= 2 && canMergeIncidents && (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                <span className="text-sm font-medium text-indigo-700">
                  {selectedIncidents.size} {t('common.selected')}
                </span>
                <button
                  onClick={clearSelection}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  {t('common.clear')}
                </button>
              </div>
              <Button
                variant="default"
                onClick={() => setShowMergeModal(true)}
                leftIcon={<ArrowRightLeft className="w-4 h-4" />}
              >
                {t('incidentMerge.title')}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            leftIcon={!isFetching ? <RefreshCw className="w-4 h-4" /> : undefined}
          >
            {t('common.refresh')}
          </Button>
          {canCreateIncident && (
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/incidents/new')}>
              {t('incidents.createIncident')}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && !statusFilter && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <AlertTriangle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{stats.total}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('incidents.total', 'Total')}</p>
              </div>
            </div>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{stats.open}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('incidents.initial', 'Initial')}</p>
              </div>
            </div>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{stats.in_progress}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('incidents.inProgress', 'In Progress')}</p>
              </div>
            </div>
          </div>
          <div
            className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm cursor-pointer hover:border-red-500/50 transition-colors"
            onClick={() => setSearchParams({ sla_breached: 'true' })}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{stats.sla_breached}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('incidents.slaBreached', 'SLA Breached')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
            <input
              type="text"
              placeholder={t('incidents.searchPlaceholder')}
              value={filter.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
              className="w-full pl-12 pr-4 py-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] focus:bg-[hsl(var(--background))] transition-all text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="sm"
              leftIcon={<Filter className="w-4 h-4" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              {t('common.filters')}
              {hasActiveFilters && (
                <span className="ml-1 w-2 h-2 rounded-full bg-[hsl(var(--primary))]" />
              )}
            </Button>
            {hasActiveFilters && canViewAllIncidents && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {t('common.clear')}
              </Button>
            )}
            {/* Column Configuration */}
            <div className="relative" ref={columnConfigRef}>
              <Button
                variant={showColumnConfig ? 'secondary' : 'outline'}
                size="sm"
                leftIcon={<Settings2 className="w-4 h-4" />}
                onClick={() => setShowColumnConfig(!showColumnConfig)}
              >
                {t('common.columns')}
                <span className="ml-1 text-xs text-[hsl(var(--muted-foreground))]">
                  ({visibleColumnCount})
                </span>
              </Button>
              {showColumnConfig && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{t('common.configureColumns')}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      {t('common.toggleColumnVisibility')}
                    </p>
                  </div>
                  <div className="py-2 max-h-64 overflow-y-auto">
                    {columns.map((col) => (
                      <button
                        key={col.id}
                        onClick={() => toggleColumn(col.id)}
                        disabled={col.required}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                          col.required
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-[hsl(var(--muted)/0.5)]"
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                            col.visible
                              ? "bg-[hsl(var(--primary))] border-[hsl(var(--primary))]"
                              : "border-[hsl(var(--border))]"
                          )}
                        >
                          {col.visible && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className={cn(
                          "flex-1 text-left",
                          col.visible ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"
                        )}>
                          {col.label}
                        </span>
                        {col.required && (
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">{t('common.required')}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                    <button
                      onClick={() => setColumns(defaultColumns)}
                      className="text-xs text-[hsl(var(--primary))] hover:text-[hsl(var(--primary)/0.8)] font-medium"
                    >
                      {t('common.resetToDefaults')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-[hsl(var(--border))] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">{t('common.workflow')}</label>
              <select
                value={filter.workflow_id || ''}
                onChange={(e) => handleFilterChange('workflow_id', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
              >
                <option value="">{t('common.allWorkflows')}</option>
                {workflowsData?.data?.map((workflow: Workflow) => (
                  <option key={workflow.id} value={workflow.id}>{workflow.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">{t('common.state')}</label>
              <select
                value={filter.current_state_id || ''}
                onChange={(e) => handleFilterChange('current_state_id', e.target.value || undefined)}
                disabled={!canViewAllIncidents && hasUrlFilter}
                className={cn(
                  "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]",
                  !canViewAllIncidents && hasUrlFilter && "opacity-60 cursor-not-allowed"
                )}
              >
                <option value="">{t('common.allStates')}</option>
                {uniqueStates.map((state: WorkflowState) => (
                  <option key={state.id} value={state.id}>{state.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">{t('common.assignee')}</label>
              <select
                value={filter.assignee_id || ''}
                onChange={(e) => handleFilterChange('assignee_id', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
              >
                <option value="">{t('common.allAssignees')}</option>
                {usersData?.data?.map((user: UserType) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">{t('common.department')}</label>
              <select
                value={filter.department_id || ''}
                onChange={(e) => handleFilterChange('department_id', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
              >
                <option value="">{t('common.allDepartments')}</option>
                {departmentsData?.data?.map((dept: Department) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">{t('common.classification')}</label>
              <select
                value={filter.classification_id || ''}
                onChange={(e) => handleFilterChange('classification_id', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
              >
                <option value="">{t('common.allClassifications')}</option>
                {classificationsData?.data?.map((classification: Classification) => (
                  <option key={classification.id} value={classification.id}>{classification.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">{t('common.location')}</label>
              <select
                value={filter.location_id || ''}
                onChange={(e) => handleFilterChange('location_id', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
              >
                <option value="">{t('common.allLocations')}</option>
                {locationsData?.data?.map((location: Location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">{t('common.priority', 'Priority')}</label>
              <select
                value={filter.priority ?? ''}
                onChange={(e) => handleFilterChange('priority', e.target.value === '' ? undefined : Number(e.target.value))}
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
              >
                <option value="">{t('common.allPriorities', 'All Priorities')}</option>
                <option value="1">{t('priorities.critical', 'Critical')}</option>
                <option value="2">{t('priorities.high', 'High')}</option>
                <option value="3">{t('priorities.medium', 'Medium')}</option>
                <option value="4">{t('priorities.low', 'Low')}</option>
                <option value="5">{t('priorities.veryLow', 'Very Low')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">{t('common.slaStatus')}</label>
              <select
                value={filter.sla_breached === undefined ? '' : filter.sla_breached.toString()}
                onChange={(e) => handleFilterChange('sla_breached', e.target.value === '' ? undefined : e.target.value === 'true')}
                disabled={!canViewAllIncidents && hasUrlFilter}
                className={cn(
                  "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]",
                  !canViewAllIncidents && hasUrlFilter && "opacity-60 cursor-not-allowed"
                )}
              >
                <option value="">{t('common.all')}</option>
                <option value="true">{t('common.breached')}</option>
                <option value="false">{t('common.onTrack')}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Incidents Table */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[hsl(var(--primary)/0.1)] rounded-2xl mb-4">
              <div className="w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-[hsl(var(--muted-foreground))]">{t('incidents.loadingIncidents')}</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[hsl(var(--muted))] rounded-2xl mb-4">
              <AlertTriangle className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
            </div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{t('incidents.noIncidents')}</h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              {hasActiveFilters ? t('incidents.adjustFilters') : t('incidents.noIncidentsDesc')}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>{t('common.clearFilters')}</Button>
            ) : canCreateIncident ? (
              <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/incidents/new')}>
                {t('incidents.createIncident')}
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    {/* Select Checkbox Column */}
                    <th className="px-6 py-4 w-12">
                      <input
                        type="checkbox"
                        checked={selectedIncidents.size === incidents.length && incidents.length > 0}
                        onChange={(e) => toggleSelectAll(e.target.checked, incidents.map(i => i.id))}
                        className="w-4 h-4 rounded border-gray-300 text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                      />
                    </th>
                    {isColumnVisible('incident') && (
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('incidents.title')}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('state') && (
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('common.state')}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('priority') && (
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('common.priority')}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('assignee') && (
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('common.assignee')}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('department') && (
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('common.department')}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('due_date') && (
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('common.dueDate')}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('created_at') && (
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('common.created')}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('sla') && (
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('common.sla')}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('actions') && (
                      <th className="px-6 py-4 text-right">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('common.actions')}
                        </span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {incidents.map((incident: Incident) => {
                    const priority = getLookupValue(incident, 'PRIORITY');
                    return (
                    <tr
                      key={incident.id}
                      className="hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
                    >
                      {/* Select Checkbox */}
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIncidents.has(incident.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelectIncident(incident.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-300 text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                        />
                      </td>
                      {isColumnVisible('incident') && (
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium text-[hsl(var(--primary))] mb-0.5">
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
                      )}
                      {isColumnVisible('state') && (
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
                      )}
                      {isColumnVisible('priority') && (
                        <td className="px-6 py-4">
                          {priority ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-white"
                                  style={{ backgroundColor: priority.color || 'bg-gray-400' }}>
                              {getLookupLabel(priority)}
                            </span>
                          ) : <span className="text-sm text-[hsl(var(--muted-foreground))]">-</span>}
                        </td>
                      )}
                      {isColumnVisible('assignee') && (
                        <td className="px-6 py-4">
                          {incident.assignee ? (
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
                              {t('common.unassigned')}
                            </span>
                          )}
                        </td>
                      )}
                      {isColumnVisible('department') && (
                        <td className="px-6 py-4">
                          {incident.department ? (
                            <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                              <Building2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                              {incident.department.name}
                            </div>
                          ) : (
                            <span className="text-sm text-[hsl(var(--muted-foreground))]">-</span>
                          )}
                        </td>
                      )}
                      {isColumnVisible('due_date') && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                            <Calendar className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                            {formatDate(incident.due_date)}
                          </div>
                        </td>
                      )}
                      {isColumnVisible('created_at') && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                            <Clock className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                            {formatDate(incident.created_at)}
                          </div>
                        </td>
                      )}
                      {isColumnVisible('sla') && (
                        <td className="px-6 py-4">
                          {incident.sla_breached ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-600">
                              <AlertTriangle className="w-3 h-3" />
                              {t('common.breached')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-600">
                              <CheckCircle2 className="w-3 h-3" />
                              {t('common.onTrack')}
                            </span>
                          )}
                        </td>
                      )}
                      {isColumnVisible('actions') && (
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
                            {t('common.view')}
                          </Button>
                        </td>
                      )}
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[hsl(var(--muted)/0.3)]">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {t('common.showing')}{' '}
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {((filter.page || 1) - 1) * (filter.limit || 10) + 1}
                </span>{' '}
                {t('common.to')}{' '}
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {Math.min((filter.page || 1) * (filter.limit || 10), totalItems)}
                </span>{' '}
                {t('common.of')}{' '}
                <span className="font-semibold text-[hsl(var(--foreground))]">{totalItems}</span> {t('incidents.title').toLowerCase()}
              </p>

              <div dir='ltr' className="flex items-center gap-2">
                <button
                  onClick={() => setFilter(prev => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
                  disabled={(filter.page || 1) === 1}
                  className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const currentPage = filter.page || 1;
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setFilter(prev => ({ ...prev, page: pageNum }))}
                        className={cn(
                          "w-10 h-10 rounded-lg text-sm font-semibold transition-all",
                          currentPage === pageNum
                            ? "bg-linear-to-br from-primary to-accent text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/0.3)]"
                            : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] hover:border-[hsl(var(--border))] border border-transparent"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setFilter(prev => ({ ...prev, page: Math.min(totalPages, (prev.page || 1) + 1) }))}
                  disabled={(filter.page || 1) === totalPages}
                  className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Merge Incidents Modal */}
      {selectedIncidents.size >= 2 && (
        <MergeIncidentsModal
          isOpen={showMergeModal}
          onClose={() => setShowMergeModal(false)}
          selectedIncidents={incidents.filter(i => selectedIncidents.has(i.id))}
          onMergeSuccess={handleMergeSuccess}
        />
      )}
    </div>
  );
};
