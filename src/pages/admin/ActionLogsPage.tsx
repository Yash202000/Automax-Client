import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
  Download,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Globe,
  Calendar,
  X,
  Eye,
  ChevronDown,
  BarChart3,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { actionLogApi } from '../../api/admin';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../constants/permissions';
import type { ActionLog, ActionLogFilter } from '../../types';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

const actionColors: Record<string, string> = {
  create: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
  update: 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]',
  delete: 'bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]',
  login: 'bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent-foreground))]',
  logout: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
  view: 'bg-[hsl(var(--secondary)/0.1)] text-[hsl(var(--secondary-foreground))]',
};

const statusColors: Record<string, string> = {
  success: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
  failed: 'bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]',
};

const exportToCSV = (logs: ActionLog[]) => {
  const headers = [
    'Time',
    'User',
    'Username',
    'Action',
    'Module',
    'Description',
    'Status',
    'Duration (ms)',
    'IP Address',
  ];

  const rows = logs.map((log) => [
    new Date(log?.created_at).toLocaleString(),
    `${log.user?.first_name || ''} ${log?.user?.last_name || ''}`,
    log?.user?.username || '',
    log?.action,
    log?.module,
    log?.description,
    log?.status,
    log?.duration,
    log?.ip_address,
  ]);

  const csvContent =
    [headers, ...rows]
      .map((row) =>
        row
          .map((field) =>
            `"${String(field ?? '').replace(/"/g, '""')}"`
          )
          .join(',')
      )
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `Action_Logs_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};


const exportToExcel = (logs: ActionLog[]) => {
  const formattedData = logs.map((log) => ({
    Time: new Date(log?.created_at).toLocaleString(),
    User: `${log?.user?.first_name || ''} ${log?.user?.last_name || ''}`,
    Username: log?.user?.username,
    Action: log?.action,
    Module: log?.module,
    Description: log?.description,
    Status: log?.status,
    Duration: log?.duration,
    'IP Address': log?.ip_address,
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

   worksheet['!cols'] = [
    { wch: 22 }, 
    { wch: 22 }, 
    { wch: 18 }, 
    { wch: 15 }, 
    { wch: 18 }, 
    { wch: 40 }, 
    { wch: 14 }, 
    { wch: 12 }, 
    { wch: 20 }, 
  ];
  
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Action Logs');

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `Action_Logs_${new Date().toISOString().split('T')[0]}.xlsx`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

export const ActionLogsPage: React.FC = () => {
  const { hasPermission } = usePermissions();
  const [filter, setFilter] = useState<ActionLogFilter>({
    page: 1,
    limit: 20,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActionLog | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'action-logs', filter],
    queryFn: () => actionLogApi.list(filter),
  });

  const { data: statsData } = useQuery({
    queryKey: ['admin', 'action-logs', 'stats'],
    queryFn: () => actionLogApi.getStats(),
    enabled: showStats,
  });

  const { data: filterOptionsData } = useQuery({
    queryKey: ['admin', 'action-logs', 'filter-options'],
    queryFn: () => actionLogApi.getFilterOptions(),
  });

  const totalPages = data?.total_pages ?? 1;

  const clearFilters = () => {
    setFilter({ page: 1, limit: 20 });
  };

  const hasActiveFilters = Boolean(
    filter.action || filter.module || filter.status || filter.search || filter.start_date || filter.end_date
  );

  // const handleExport = async (format: 'csv' | 'excel') => {
  //   try {
  //     const blob = await actionLogApi.export(filter, format);
      
  //     // Create download link
  //     const url = window.URL.createObjectURL(blob);
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`);
  //     document.body.appendChild(link);
  //     link.click();
  //     link.remove();
  //     window.URL.revokeObjectURL(url);
  //   } catch (error) {
  //     console.error('Export failed:', error);
  //     // You could show an error toast here
  //   }
  // };

  const handleExport = (format: 'csv' | 'excel') => {
    if (!data?.data || data.data.length === 0) return;

    if (format === 'csv') {
      exportToCSV(data.data);
    } else {
      exportToExcel(data.data);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (error) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-[hsl(var(--destructive)/0.1)] rounded-2xl flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-[hsl(var(--destructive))]" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">Failed to Load Action Logs</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6 text-center max-w-sm">
            There was an error loading the action logs. Please try again.
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
              <Activity className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Action Logs</h1>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">
            Track and monitor all user actions in the system
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<BarChart3 className="w-4 h-4" />}
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? 'Hide Stats' : 'Show Stats'}
          </Button>
          {hasPermission(PERMISSIONS.ACTION_LOGS_EXPORT) && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={() => handleExport('csv')}
            >
              Export CSV
            </Button>
          )}
          {hasPermission(PERMISSIONS.ACTION_LOGS_EXPORT) && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={() => handleExport('excel')}
            >
              Export Excel
            </Button>
          )}
        </div>
      </div>

      {/* Stats Panel */}
      {showStats && statsData?.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
                <Activity className="w-5 h-5 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Total Actions</p>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  {statsData.data.total_actions.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--accent)/0.1)]">
                <Calendar className="w-5 h-5 text-[hsl(var(--accent-foreground))]" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Today's Actions</p>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  {statsData.data.today_actions.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--success)/0.1)]">
                <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Success Rate</p>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  {statsData.data.success_rate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--secondary)/0.1)]">
                <BarChart3 className="w-5 h-5 text-[hsl(var(--secondary-foreground))]" />
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Modules</p>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  {Object.keys(statsData.data.actions_by_module).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
              <input
                type="text"
                placeholder="Search by description or IP address..."
                value={filter.search || ''}
                onChange={(e) => setFilter({ ...filter, search: e.target.value, page: 1 })}
                className="w-full pl-12 pr-4 py-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] focus:bg-[hsl(var(--background))] transition-all text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showFilters ? 'default' : 'outline'}
                size="sm"
                leftIcon={<Filter className="w-4 h-4" />}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
                {hasActiveFilters && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-[hsl(var(--primary-foreground))] text-[hsl(var(--primary))] rounded-full">
                    !
                  </span>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                isLoading={isFetching}
                leftIcon={!isFetching ? <RefreshCw className="w-4 h-4" /> : undefined}
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-[hsl(var(--border))]">
              {/* Module Filter */}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">Module</label>
                <div className="relative">
                  <select
                    value={filter.module || ''}
                    onChange={(e) => setFilter({ ...filter, module: e.target.value, page: 1 })}
                    className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] appearance-none"
                  >
                    <option value="">All Modules</option>
                    {filterOptionsData?.data?.modules?.map((module) => (
                      <option key={module} value={module}>
                        {module}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))] pointer-events-none" />
                </div>
              </div>

              {/* Action Filter */}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">Action</label>
                <div className="relative">
                  <select
                    value={filter.action || ''}
                    onChange={(e) => setFilter({ ...filter, action: e.target.value, page: 1 })}
                    className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] appearance-none"
                  >
                    <option value="">All Actions</option>
                    {filterOptionsData?.data?.actions?.map((action) => (
                      <option key={action} value={action}>
                        {action}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))] pointer-events-none" />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">Status</label>
                <div className="relative">
                  <select
                    value={filter.status || ''}
                    onChange={(e) => setFilter({ ...filter, status: e.target.value, page: 1 })}
                    className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] appearance-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))] pointer-events-none" />
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filter.start_date || ''}
                  onChange={(e) => setFilter({ ...filter, start_date: e.target.value, page: 1 })}
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">End Date</label>
                <input
                  type="date"
                  value={filter.end_date || ''}
                  onChange={(e) => setFilter({ ...filter, end_date: e.target.value, page: 1 })}
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Logs Table */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[hsl(var(--primary)/0.1)] rounded-2xl mb-4">
              <div className="w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-[hsl(var(--muted-foreground))]">Loading action logs...</p>
          </div>
        ) : data?.data?.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[hsl(var(--muted))] rounded-2xl mb-4">
              <Activity className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
            </div>
            <p className="text-[hsl(var(--foreground))] font-medium mb-1">No action logs found</p>
            <p className="text-[hsl(var(--muted-foreground))] text-sm">
              {hasActiveFilters ? 'Try adjusting your filters' : 'User actions will appear here'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        Time
                      </span>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        User
                      </span>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        Action
                      </span>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        Module
                      </span>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        Description
                      </span>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        Status
                      </span>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        Duration
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
                  {data?.data?.map((log: ActionLog) => (
                    <tr key={log.id} className="hover:bg-[hsl(var(--muted)/0.5)] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                          <span className="text-sm text-[hsl(var(--foreground))] whitespace-nowrap">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center">
                            <span className="text-[hsl(var(--primary-foreground))] text-xs font-semibold">
                              {log.user?.first_name?.[0] || log.user?.username?.[0] || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                              {log.user?.first_name} {log.user?.last_name}
                            </p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">@{log.user?.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'px-2.5 py-1 text-xs font-semibold rounded-lg capitalize',
                            actionColors[log.action] || 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                          )}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[hsl(var(--foreground))] capitalize">{log.module}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[hsl(var(--foreground))] max-w-xs truncate">{log.description}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full',
                            statusColors[log.status] || 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                          )}
                        >
                          {log.status === 'success' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[hsl(var(--muted-foreground))]">{formatDuration(log.duration)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[hsl(var(--muted)/0.3)]">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Showing{' '}
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {((filter.page || 1) - 1) * (filter.limit || 20) + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {Math.min((filter.page || 1) * (filter.limit || 20), data?.total_items || 0)}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-[hsl(var(--foreground))]">{data?.total_items || 0}</span> logs
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilter({ ...filter, page: Math.max(1, (filter.page || 1) - 1) })}
                  disabled={(filter.page || 1) === 1}
                  className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    const currentPage = filter.page || 1;
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
                        onClick={() => setFilter({ ...filter, page: pageNum })}
                        className={cn(
                          'w-10 h-10 rounded-lg text-sm font-semibold transition-all',
                          currentPage === pageNum
                            ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/0.3)]'
                            : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] hover:border-[hsl(var(--border))] border border-transparent'
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setFilter({ ...filter, page: Math.min(totalPages, (filter.page || 1) + 1) })}
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

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.25)]">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Action Log Details</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {formatDate(selectedLog.created_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6 space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4 p-4 bg-[hsl(var(--muted)/0.5)] rounded-xl">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-[hsl(var(--foreground))]">
                    {selectedLog.user?.first_name} {selectedLog.user?.last_name}
                  </p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{selectedLog.user?.email}</p>
                </div>
              </div>

              {/* Action Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Action</p>
                  <span
                    className={cn(
                      'px-3 py-1.5 text-sm font-semibold rounded-lg capitalize inline-block',
                      actionColors[selectedLog.action] || 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                    )}
                  >
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Status</p>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full',
                      statusColors[selectedLog.status] || 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                    )}
                  >
                    {selectedLog.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    {selectedLog.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Module</p>
                  <p className="text-sm text-[hsl(var(--foreground))] capitalize">{selectedLog.module}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Duration</p>
                  <p className="text-sm text-[hsl(var(--foreground))]">{formatDuration(selectedLog.duration)}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Description</p>
                <p className="text-sm text-[hsl(var(--foreground))]">{selectedLog.description}</p>
              </div>

              {/* Resource ID */}
              {selectedLog.resource_id && (
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Resource ID</p>
                  <p className="text-sm text-[hsl(var(--foreground))] font-mono bg-[hsl(var(--muted))] px-3 py-2 rounded-lg">
                    {selectedLog.resource_id}
                  </p>
                </div>
              )}

              {/* IP & User Agent */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">IP Address</p>
                  </div>
                  <p className="text-sm text-[hsl(var(--foreground))] font-mono">{selectedLog.ip_address}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">User Agent</p>
                  <p className="text-sm text-[hsl(var(--foreground))] text-wrap break-all bg-[hsl(var(--muted)/0.5)] px-3 py-2 rounded-lg">
                    {selectedLog.user_agent}
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {selectedLog.error_msg && (
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--destructive))] mb-1">Error Message</p>
                  <p className="text-sm text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.1)] px-3 py-2 rounded-lg">
                    {selectedLog.error_msg}
                  </p>
                </div>
              )}

              {/* Old/New Values - Diff View */}
              {(selectedLog.old_value || selectedLog.new_value) && (
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2">Changes</p>
                  <div className="bg-[hsl(var(--muted)/0.5)] rounded-xl border border-[hsl(var(--border))] overflow-hidden">
                    <div className="grid grid-cols-3 gap-0 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-4 py-2">
                      <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">Field</div>
                      <div className="text-xs font-semibold text-[hsl(var(--destructive))]">Old Value</div>
                      <div className="text-xs font-semibold text-[hsl(var(--success))]">New Value</div>
                    </div>
                    <div className="divide-y divide-[hsl(var(--border))]">
                      {(() => {
                        try {
                          const oldData = selectedLog.old_value ? JSON.parse(selectedLog.old_value) : {};
                          const newData = selectedLog.new_value ? JSON.parse(selectedLog.new_value) : {};
                          const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
                          const rows: React.ReactNode[] = [];

                          // Helper to format values nicely
                          const formatValue = (val: any) => {
                            if (val === null || val === undefined) return '-';
                            if (typeof val === 'boolean') return val ? 'Yes' : 'No';
                            if (Array.isArray(val)) {
                              // Handle arrays of objects (classifications, locations, roles, etc.)
                              if (val.length === 0) return '-';
                              const formatted = val.map((item: any) => {
                                if (typeof item === 'string') return item;
                                if (typeof item === 'number') return item.toString();
                                // Extract name from objects
                                return item?.name || item?.code || item?.id || JSON.stringify(item);
                              });
                              return formatted.join(', ');
                            }
                            if (typeof val === 'object') {
                              // Handle single objects
                              return val?.name || val?.code || val?.id || JSON.stringify(val);
                            }
                            return String(val);
                          };

                          allKeys.forEach((key) => {
                            const oldValue = oldData[key];
                            const newValue = newData[key];
                            const hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);
                            
                            if (!hasChanged) return;

                            rows.push(
                              <div key={key} className="grid grid-cols-3 gap-0 px-4 py-2 hover:bg-[hsl(var(--muted)/0.5)] transition-colors">
                                <div className="text-sm font-medium text-[hsl(var(--foreground))] capitalize">
                                  {key.replace(/_/g, ' ')}
                                </div>
                                <div className="text-sm text-[hsl(var(--destructive))] font-mono break-words">
                                  {formatValue(oldValue)}
                                </div>
                                <div className="text-sm text-[hsl(var(--success))] font-mono break-words">
                                  {formatValue(newValue)}
                                </div>
                              </div>
                            );
                          });

                          return rows.length > 0 ? rows : (
                            <div className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))] text-center">
                              No changes detected
                            </div>
                          );
                        } catch (e) {
                          return (
                            <div className="px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]">
                              Unable to parse change data
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <Button variant="ghost" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
