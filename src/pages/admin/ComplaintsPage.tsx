import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Filter,
  Calendar,
  User,
  Building2,
  Settings2,
  Check,
  MessageSquareWarning,
  ExternalLink,
  Phone,
  Plus,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { complaintApi, workflowApi, userApi, departmentApi, classificationApi, locationApi } from '../../api/admin';
import type { Incident, IncidentFilter, Workflow, User as UserType, Department, WorkflowState, Classification, Location } from '../../types';
import { cn } from '@/lib/utils';
import { CreateComplaintModal } from '@/components/complaints/CreateComplaintModal';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../constants/permissions';

// Column configuration
interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean;
}

const COLUMN_STORAGE_KEY = 'complaint_columns_config';

const defaultColumns: ColumnConfig[] = [
  { id: 'complaint', label: 'Complaint', visible: true, required: true },
  { id: 'channel', label: 'Channel', visible: true },
  { id: 'created_by', label: 'Created By', visible: true },
  { id: 'source', label: 'Source Incident', visible: true },
  { id: 'state', label: 'State', visible: true },
  { id: 'assignee', label: 'Assignee', visible: true },
  { id: 'department', label: 'Department', visible: false },
  { id: 'created_at', label: 'Created', visible: true },
  { id: 'evaluation', label: 'Evaluations', visible: false },
  { id: 'actions', label: 'Actions', visible: true, required: true },
];

const loadColumnsFromStorage = (): ColumnConfig[] => {
  try {
    const stored = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ColumnConfig[];
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

export const ComplaintsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<IncidentFilter>({
    page: 1,
    limit: 10,
    record_type: 'complaint',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(loadColumnsFromStorage);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const columnConfigRef = useRef<HTMLDivElement>(null);

  const canCreateComplaint = isSuperAdmin || hasPermission(PERMISSIONS.COMPLAINTS_CREATE);
  const canViewAllComplaints = isSuperAdmin || hasPermission(PERMISSIONS.COMPLAINTS_VIEW_ALL);

  // Get status from URL - users with view permission can access if status filter is applied
  const urlStatusParam = searchParams.get('status');
  const hasUrlFilter = !!urlStatusParam;

  // Redirect to my-assigned if user doesn't have view_all permission AND no status filter is applied
  useEffect(() => {
    if (!canViewAllComplaints && !hasUrlFilter) {
      navigate('/complaints/my-assigned', { replace: true });
    }
  }, [canViewAllComplaints, hasUrlFilter, navigate]);

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

  // Queries
  const { data: workflowsData } = useQuery({
    queryKey: ['workflows', 'complaint'],
    queryFn: async () => {
      const [complaintRes, allRes] = await Promise.all([
        workflowApi.listByRecordType('complaint', false),
        workflowApi.listByRecordType('all', false),
      ]);
      const combined = [...(complaintRes.data || []), ...(allRes.data || [])];
      const unique = combined.filter((item, index, self) =>
        index === self.findIndex(t => t.id === item.id)
      );
      return { success: true, data: unique };
    },
  });

  // Get all states from complaint workflows for filter
  const allStates = workflowsData?.data?.flatMap((w: Workflow) => w.states || []) || [];
  const uniqueStates = allStates.reduce((acc: WorkflowState[], state: WorkflowState) => {
    if (!acc.find(s => s.name === state.name)) {
      acc.push(state);
    }
    return acc;
  }, []);

  // Read status from URL and sync with filter
  useEffect(() => {
    const statusParam = searchParams.get('status');

    if (statusParam) {
      if (statusParam !== statusFilter) {
        setStatusFilter(statusParam);
        const matchingState = uniqueStates.find(
          (s: WorkflowState) => s.name.toLowerCase() === statusParam.toLowerCase()
        );
        if (matchingState && filter.current_state_id !== matchingState.id) {
          setFilter(prev => ({
            ...prev,
            current_state_id: matchingState.id,
            page: 1,
          }));
        }
      }
    } else {
      if (statusFilter) {
        setStatusFilter(null);
      }
      if (filter.current_state_id !== undefined) {
        setFilter(prev => ({
          ...prev,
          current_state_id: undefined,
          page: 1,
        }));
      }
    }
  }, [searchParams, uniqueStates]);

  const { data: complaintsData, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['complaints', filter],
    queryFn: () => complaintApi.list(filter),
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin', 'users', 1, 100],
    queryFn: () => userApi.list(1, 100),
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['admin', 'departments', 'list'],
    queryFn: () => departmentApi.list(),
  });

  const { data: locationsData } = useQuery({
    queryKey: ['admin', 'locations', 'list'],
    queryFn: () => locationApi.list(),
  });

  const { data: classificationsData } = useQuery({
    queryKey: ['admin', 'classifications', 'complaint'],
    queryFn: async () => {
      const [complaintRes, allRes] = await Promise.all([
        classificationApi.listByType('complaint'),
        classificationApi.listByType('all'),
      ]);
      const combined = [...(complaintRes.data || []), ...(allRes.data || [])];
      const unique = combined.filter((item, index, self) =>
        index === self.findIndex(t => t.id === item.id)
      );
      return { success: true, data: unique };
    },
  });

  const complaints = complaintsData?.data || [];
  const totalPages = complaintsData?.total_pages ?? 1;
  const totalItems = complaintsData?.total_items ?? 0;

  const handleFilterChange = (key: keyof IncidentFilter, value: string | number | boolean | undefined) => {
    setFilter(prev => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFilter({
      page: 1,
      limit: 10,
      record_type: 'complaint',
    });
    setStatusFilter(null);
    setSearchParams({});
  };

  const hasActiveFilters = !!(
    filter.search ||
    filter.workflow_id ||
    filter.current_state_id ||
    filter.classification_id ||
    filter.channel ||
    filter.assignee_id ||
    filter.department_id
  );

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
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{t('complaints.failedToLoad', 'Failed to Load')}</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6 text-center max-w-sm">
            {t('complaints.errorLoading', 'There was an error loading the complaints. Please try again.')}
          </p>
          <Button onClick={() => refetch()} leftIcon={<RefreshCw className="w-4 h-4" />}>
            {t('common.tryAgain', 'Try Again')}
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
            <div className="p-2 rounded-lg bg-amber-500/10">
              <MessageSquareWarning className="w-5 h-5 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {statusFilter ? `${statusFilter} ${t('complaints.title', 'Complaints')}` : t('complaints.title', 'Complaints')}
            </h1>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">
            {statusFilter
              ? `${t('complaints.showingStatus', 'Showing status')}: ${statusFilter}`
              : t('complaints.subtitle', 'Manage citizen complaints and feedback')
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            leftIcon={!isFetching ? <RefreshCw className="w-4 h-4" /> : undefined}
          >
            {t('common.refresh', 'Refresh')}
          </Button>
          {canCreateComplaint && (
            <Button
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreateModal(true)}
              className="bg-linear-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              {t('complaints.createComplaint', 'Create Complaint')}
            </Button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
            <input
              type="text"
              placeholder={t('complaints.searchPlaceholder', 'Search by title or complaint number...')}
              value={filter.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
              className="w-full pl-12 pr-4 py-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-[hsl(var(--background))] transition-all text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="sm"
              leftIcon={<Filter className="w-4 h-4" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              {t('common.filters', 'Filters')}
              {hasActiveFilters && (
                <span className="ml-1 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </Button>
            {hasActiveFilters && canViewAllComplaints && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {t('common.clear', 'Clear')}
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
                {t('common.columns', 'Columns')}
                <span className="ml-1 text-xs text-[hsl(var(--muted-foreground))]">
                  ({visibleColumnCount})
                </span>
              </Button>
              {showColumnConfig && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{t('common.configureColumns', 'Configure Columns')}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      {t('common.toggleColumnVisibility', 'Toggle column visibility')}
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
                              ? "bg-amber-500 border-amber-500"
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
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">{t('common.required', 'Required')}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                    <button
                      onClick={() => setColumns(defaultColumns)}
                      className="text-xs text-amber-500 hover:text-amber-600 font-medium"
                    >
                      {t('common.resetToDefaults', 'Reset to defaults')}
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
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">{t('common.workflow', 'Workflow')}</label>
              <select
                value={filter.workflow_id || ''}
                onChange={(e) => handleFilterChange('workflow_id', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="">{t('common.allWorkflows', 'All Workflows')}</option>
                {workflowsData?.data?.map((workflow: Workflow) => (
                  <option key={workflow.id} value={workflow.id}>{workflow.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">{t('common.state', 'State')}</label>
              <select
                value={filter.current_state_id || ''}
                onChange={(e) => handleFilterChange('current_state_id', e.target.value || undefined)}
                disabled={!canViewAllComplaints && hasUrlFilter}
                className={cn(
                  "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500",
                  !canViewAllComplaints && hasUrlFilter && "opacity-60 cursor-not-allowed"
                )}
              >
                <option value="">{t('common.allStates', 'All States')}</option>
                {uniqueStates.map((state: WorkflowState) => (
                  <option key={state.id} value={state.id}>{state.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">{t('common.channel', 'Channel')}</label>
              <select
                value={filter.channel || ''}
                onChange={(e) => handleFilterChange('channel', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="">{t('common.allChannels', 'All Channels')}</option>
                <option value="phone">{t('channels.phone', 'Phone')}</option>
                <option value="email">{t('channels.email', 'Email')}</option>
                <option value="web">{t('channels.web', 'Web')}</option>
                <option value="mobile">{t('channels.mobile', 'Mobile App')}</option>
                <option value="in_person">{t('channels.inPerson', 'In Person')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">{t('common.assignee', 'Assignee')}</label>
              <select
                value={filter.assignee_id || ''}
                onChange={(e) => handleFilterChange('assignee_id', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="">{t('common.allAssignees', 'All Assignees')}</option>
                {usersData?.data?.map((user: UserType) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">{t('common.department', 'Department')}</label>
              <select
                value={filter.department_id || ''}
                onChange={(e) => handleFilterChange('department_id', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="">{t('common.allDepartments', 'All Departments')}</option>
                {departmentsData?.data?.map((dept: Department) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">{t('common.classification', 'Classification')}</label>
              <select
                value={filter.classification_id || ''}
                onChange={(e) => handleFilterChange('classification_id', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="">{t('common.allClassifications', 'All Classifications')}</option>
                {classificationsData?.data?.map((classification: Classification) => (
                  <option key={classification.id} value={classification.id}>{classification.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">{t('common.location', 'Location')}</label>
              <select
                value={filter.location_id || ''}
                onChange={(e) => handleFilterChange('location_id', e.target.value || undefined)}
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="">{t('common.allLocations', 'All Locations')}</option>
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
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="">{t('common.allPriorities', 'All Priorities')}</option>
                <option value="1">{t('priorities.critical', 'Critical')}</option>
                <option value="2">{t('priorities.high', 'High')}</option>
                <option value="3">{t('priorities.medium', 'Medium')}</option>
                <option value="4">{t('priorities.low', 'Low')}</option>
                <option value="5">{t('priorities.veryLow', 'Very Low')}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Complaints Table */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-[hsl(var(--muted-foreground))]">{t('complaints.loading', 'Loading complaints...')}</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[hsl(var(--muted))] rounded-2xl mb-4">
              <MessageSquareWarning className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
            </div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{t('complaints.noComplaintsFound', 'No Complaints Found')}</h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              {hasActiveFilters ? t('complaints.tryAdjustingFilters', 'Try adjusting your filters') : t('complaints.noComplaintsYet', 'No complaints have been created yet')}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>{t('common.clearFilters', 'Clear Filters')}</Button>
            ) : canCreateComplaint ? (
              <Button
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setShowCreateModal(true)}
                className="bg-linear-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
              >
                {t('complaints.createFirstComplaint', 'Create First Complaint')}
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    {isColumnVisible('complaint') && (
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('complaints.complaint', 'Complaint')}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('channel') && (
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('common.channel', 'Channel')}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('created_by') && (
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('complaints.createdBy', 'Created By')}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('source') && (
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('complaints.sourceIncident', 'Source Incident')}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('state') && (
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('common.state', 'State')}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('assignee') && (
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('common.assignee', 'Assignee')}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('department') && (
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('common.department', 'Department')}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('created_at') && (
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('common.created', 'Created')}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('evaluation') && (
                      <th className="px-6 py-4 text-left">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('complaints.evaluations', 'Evaluations')}
                        </span>
                      </th>
                    )}
                    {isColumnVisible('actions') && (
                      <th className="px-6 py-4 text-right">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t('common.actions', 'Actions')}
                        </span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {complaints.map((complaint: Incident) => (
                    <tr
                      key={complaint.id}
                      className="hover:bg-[hsl(var(--muted)/0.5)] transition-colors cursor-pointer"
                      onClick={() => navigate(`/complaints/${complaint.id}`)}
                    >
                      {isColumnVisible('complaint') && (
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <p className="text-xs font-medium text-primary mb-0.5">
                              {complaint.incident_number}
                            </p>
                            <p className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">
                              {complaint.title}
                            </p>
                          </div>
                        </td>
                      )}
                      {isColumnVisible('channel') && (
                        <td className="px-6 py-4">
                          {complaint.channel ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                              {complaint.channel}
                            </span>
                          ) : (
                            <span className="text-sm text-[hsl(var(--muted-foreground))]">-</span>
                          )}
                        </td>
                      )}
                      {isColumnVisible('created_by') && (
                        <td className="px-6 py-4">
                          {complaint.created_by_name ? (
                            <div>
                              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                                {complaint.created_by_name}
                              </p>
                              {complaint.created_by_mobile && (
                                <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3" />
                                  {complaint.created_by_mobile}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-[hsl(var(--muted-foreground))]">-</span>
                          )}
                        </td>
                      )}
                      {isColumnVisible('source') && (
                        <td className="px-6 py-4">
                          {complaint.source_incident ? (
                            <Link
                              to={`/incidents/${complaint.source_incident_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              {complaint.source_incident.incident_number}
                            </Link>
                          ) : complaint.source_incident_id ? (
                            <Link
                              to={`/incidents/${complaint.source_incident_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              {t('complaints.viewSource', 'View Source')}
                            </Link>
                          ) : (
                            <span className="text-sm text-[hsl(var(--muted-foreground))]">-</span>
                          )}
                        </td>
                      )}
                      {isColumnVisible('state') && (
                        <td className="px-6 py-4">
                          {complaint.current_state ? (
                            <span
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: complaint.current_state.color ? `${complaint.current_state.color}20` : 'hsl(var(--muted))',
                                color: complaint.current_state.color || 'hsl(var(--foreground))',
                              }}
                            >
                              {complaint.current_state.name}
                            </span>
                          ) : (
                            <span className="text-sm text-[hsl(var(--muted-foreground))]">-</span>
                          )}
                        </td>
                      )}
                      {isColumnVisible('assignee') && (
                        <td className="px-6 py-4">
                          {complaint.assignee ? (
                            <div className="flex items-center gap-2">
                              {complaint.assignee.avatar ? (
                                <img
                                  src={complaint.assignee.avatar}
                                  alt={complaint.assignee.username}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center">
                                  <span className="text-white text-xs font-semibold">
                                    {complaint.assignee.first_name?.[0] || complaint.assignee.username[0]}
                                  </span>
                                </div>
                              )}
                              <span className="text-sm text-[hsl(var(--foreground))]">
                                {complaint.assignee.first_name || complaint.assignee.username}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {t('common.unassigned', 'Unassigned')}
                            </span>
                          )}
                        </td>
                      )}
                      {isColumnVisible('department') && (
                        <td className="px-6 py-4">
                          {complaint.department ? (
                            <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                              <Building2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                              {complaint.department.name}
                            </div>
                          ) : (
                            <span className="text-sm text-[hsl(var(--muted-foreground))]">-</span>
                          )}
                        </td>
                      )}
                      {isColumnVisible('created_at') && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                            <Calendar className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                            {formatDate(complaint.created_at)}
                          </div>
                        </td>
                      )}
                      {isColumnVisible('evaluation') && (
                        <td className="px-6 py-4">
                          {complaint.current_state?.state_type === 'terminal' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-600">
                              <CheckCircle2 className="w-3 h-3" />
                              {complaint.evaluation_count || 0}
                            </span>
                          ) : (
                            <span className="text-sm text-[hsl(var(--muted-foreground))]">-</span>
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
                              navigate(`/complaints/${complaint.id}`);
                            }}
                          >
                            {t('common.view', 'View')}
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[hsl(var(--muted)/0.3)]">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {t('common.showing', 'Showing')}{' '}
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {((filter.page || 1) - 1) * (filter.limit || 10) + 1}
                </span>{' '}
                {t('common.to', 'to')}{' '}
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {Math.min((filter.page || 1) * (filter.limit || 10), totalItems)}
                </span>{' '}
                {t('common.of', 'of')}{' '}
                <span className="font-semibold text-[hsl(var(--foreground))]">{totalItems}</span> {t('complaints.complaints', 'complaints')}
              </p>

              <div className="flex items-center gap-2">
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
                            ? "bg-linear-to-br from-primary to-accent text-white shadow-lg "
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

      {/* Create Complaint Modal */}
      <CreateComplaintModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          refetch();
        }}
      />
    </div>
  );
};
