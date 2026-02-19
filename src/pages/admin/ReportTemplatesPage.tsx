import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileBarChart,
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  Globe,
  Lock,
  User,
  Calendar,
  AlertCircle,
  FileText,
  Users,
  Building2,
  MapPin,
  GitBranch,
  Loader2,
  Download,
  X,
  Layout,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../../components/ui';
import { reportApi } from '../../api/admin';
import { listTemplates, downloadReport } from '../../services/reportTemplateApi';
import type { ReportTemplate, ReportDataSource } from '../../types';
import type { GenerateReportRequest, ColumnOverride } from '../../types/reportTemplate';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../constants/permissions';

const iconMap: Record<string, React.ElementType> = {
  AlertCircle,
  FileText,
  Users,
  Building2,
  MapPin,
  GitBranch,
};

const dataSourceInfo: Record<ReportDataSource, { labelKey: string; icon: string; color: string }> = {
  incidents: { labelKey: 'reports.dataSources.incidents', icon: 'AlertCircle', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
  action_logs: { labelKey: 'reports.dataSources.actionLogs', icon: 'FileText', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
  users: { labelKey: 'reports.dataSources.users', icon: 'Users', color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
  departments: { labelKey: 'reports.dataSources.departments', icon: 'Building2', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400' },
  locations: { labelKey: 'reports.dataSources.locations', icon: 'MapPin', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' },
  workflows: { labelKey: 'reports.dataSources.workflows', icon: 'GitBranch', color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400' },
};

export const ReportTemplatesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [filterSource, setFilterSource] = useState<ReportDataSource | ''>('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Custom template export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedReportTemplate, setSelectedReportTemplate] = useState<ReportTemplate | null>(null);
  const [selectedCustomTemplate, setSelectedCustomTemplate] = useState<string>('');
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const canCreateReport = isSuperAdmin || hasPermission(PERMISSIONS.REPORTS_CREATE);

  // Fetch custom templates for the export modal
  const { data: customTemplatesData } = useQuery({
    queryKey: ['custom-report-templates'],
    queryFn: () => listTemplates({ limit: 100 }),
  });

  const customTemplates = customTemplatesData?.data || [];

  // Fetch templates
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['admin', 'reports', 'templates', filterSource],
    queryFn: () => reportApi.listTemplates(filterSource || undefined),
  });

  const templates = templatesData?.data || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports', 'templates'] });
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => reportApi.duplicateTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports', 'templates'] });
    },
  });

  const handleDelete = (template: ReportTemplate) => {
    if (confirm(`${t('reports.deleteConfirm')} "${template.name}"?`)) {
      deleteMutation.mutate(template.id);
    }
    setActiveMenu(null);
  };

  const handleDuplicate = (template: ReportTemplate) => {
    duplicateMutation.mutate(template.id);
    setActiveMenu(null);
  };

  const handleEdit = (template: ReportTemplate) => {
    navigate(`/reports/builder/${template.id}`);
  };

  const openExportWithTemplate = (template: ReportTemplate) => {
    setSelectedReportTemplate(template);
    setSelectedCustomTemplate('');
    setExportDateFrom('');
    setExportDateTo('');
    setShowExportModal(true);
    setActiveMenu(null);
  };

  const handleExportWithCustomTemplate = async () => {
    if (!selectedReportTemplate) return;

    setExporting(true);
    setExportError(null);

    try {
      // Build filters array from date range + old report filters
      const filters: Array<{ field: string; operator: string; value: unknown }> = [];

      if (exportDateFrom) {
        filters.push({ field: 'created_at', operator: '>=', value: exportDateFrom });
      }
      if (exportDateTo) {
        filters.push({ field: 'created_at', operator: '<=', value: exportDateTo });
      }

      // Add filters from old report config
      if (selectedReportTemplate.config.filters) {
        selectedReportTemplate.config.filters.forEach(f => {
          filters.push({ field: f.field, operator: f.operator, value: f.value });
        });
      }

      // Build sorting array from old report config
      const sorting = selectedReportTemplate.config.sorting?.map(s => ({
        field: s.field,
        direction: s.direction as 'asc' | 'desc',
      })) || [];

      // Build columns override from old report config
      const columns: ColumnOverride[] = selectedReportTemplate.config.columns.map(col => ({
        field: col.field,
        label: col.label || col.field,
        width: col.width || 0,
        alignment: 'left',
      }));

      // Validate columns
      if (!columns || columns.length === 0) {
        setExportError('Report template has no columns defined. Please edit the template first.');
        setExporting(false);
        return;
      }

      // Use default template ID if no custom template selected
      const templateId = selectedCustomTemplate || 'default';

      console.log('Export request:', {
        template_id: templateId,
        data_source: selectedReportTemplate.data_source,
        filters,
        sorting,
        columns,
      });

      const request: GenerateReportRequest = {
        template_id: templateId,
        data_source: selectedReportTemplate.data_source,
        format: 'pdf',
        file_name: selectedReportTemplate.name,
        filters: filters.length > 0 ? filters : undefined,
        sorting: sorting.length > 0 ? sorting : undefined,
        overrides: {
          title: selectedReportTemplate.name,
          columns: columns,
        },
      };

      await downloadReport(request);
      setExportSuccess('Report downloaded successfully');
      setTimeout(() => setExportSuccess(null), 3000);
      setShowExportModal(false);
    } catch (err) {
      console.error('Export error:', err);
      setExportError('Failed to export report');
      setTimeout(() => setExportError(null), 3000);
    } finally {
      setExporting(false);
    }
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    if (activeMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeMenu]);

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {exportError && (
        <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {exportError}
        </div>
      )}
      {exportSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {exportSuccess}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-linear-to-br from-primary to-accent">
              <FileBarChart className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">{t('reports.templates')}</h1>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ltr:ml-12 rtl:mr-12">
            {t('reports.templatesSubtitle')}
          </p>
        </div>

        {canCreateReport && (
          <Button
            onClick={() => navigate('/reports/builder')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            {t('reports.newReport')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value as ReportDataSource | '')}
          className="px-4 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
        >
          <option value="">{t('reports.allDataSources')}</option>
          {Object.entries(dataSourceInfo).map(([key, info]) => (
            <option key={key} value={key}>
              {t(info.labelKey)}
            </option>
          ))}
        </select>

        <span className="text-sm text-[hsl(var(--muted-foreground))]">
          {templates.length} {templates.length !== 1 ? t('reports.templates_count') : t('reports.template')}
        </span>
      </div>

      {/* Templates grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))]">
          <FileBarChart className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-2">
            {t('reports.noTemplatesYet')}
          </h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-4">
            {t('reports.createFirstTemplate')}
          </p>
          <Button onClick={() => navigate('/reports/builder')}>
            {t('reports.createReport')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const sourceInfo = dataSourceInfo[template.data_source];
            const Icon = iconMap[sourceInfo.icon] || FileBarChart;

            return (
              <div
                key={template.id}
                className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Card header */}
                <div className="p-4 border-b border-[hsl(var(--border))]">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", sourceInfo.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[hsl(var(--foreground))] line-clamp-1">
                          {template.name}
                        </h3>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {t(sourceInfo.labelKey)}
                        </p>
                      </div>
                    </div>

                    {/* Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu === template.id ? null : template.id);
                        }}
                        className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {activeMenu === template.id && (
                        <div className="absolute ltr:right-0 rtl:left-0 mt-1 w-40 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg z-10">
                          <button
                            onClick={() => handleEdit(template)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                            {t('reports.edit')}
                          </button>
                          <button
                            onClick={() => handleDuplicate(template)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                            {t('reports.duplicate')}
                          </button>
                          <button
                            onClick={() => openExportWithTemplate(template)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Export with Template
                          </button>
                          <hr className="my-1 border-[hsl(var(--border))]" />
                          <button
                            onClick={() => handleDelete(template)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            {t('reports.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {template.description && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                </div>

                {/* Card body */}
                <div className="p-4 space-y-3">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
                    <span>{template.config.columns.length} columns</span>
                    <span>{template.config.filters.length} filters</span>
                    <span>{template.config.sorting.length} sorts</span>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                      {template.is_public ? (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {t('reports.public')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          {t('reports.private')}
                        </span>
                      )}
                      {template.created_by && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {template.created_by.username}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(template.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Card footer */}
                <div className="px-4 py-3 bg-[hsl(var(--muted)/0.3)] border-t border-[hsl(var(--border))]">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleEdit(template)}
                  >
                    {t('reports.openReportBuilder')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Export Modal with Custom Template Selection */}
      {showExportModal && selectedReportTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowExportModal(false)}
          />
          <div className="relative bg-[hsl(var(--card))] rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                Export Report
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 hover:bg-[hsl(var(--muted))] rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Report Info */}
              <div className="bg-[hsl(var(--muted))] p-3 rounded-lg">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Data Source</p>
                <p className="font-medium text-[hsl(var(--foreground))]">{selectedReportTemplate.name}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  {t(dataSourceInfo[selectedReportTemplate.data_source].labelKey)}
                </p>
              </div>

              {/* Custom Template Selector */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  <Layout className="h-4 w-4 inline mr-1" />
                  Use Custom Template (optional)
                </label>
                <select
                  value={selectedCustomTemplate}
                  onChange={(e) => setSelectedCustomTemplate(e.target.value)}
                  className="w-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
                >
                  <option value="">Default Template</option>
                  {customTemplates.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.name} {ct.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  Select a custom template for header, footer, and styling
                </p>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    From Date
                  </label>
                  <input
                    type="date"
                    value={exportDateFrom}
                    onChange={(e) => setExportDateFrom(e.target.value)}
                    className="w-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    To Date
                  </label>
                  <input
                    type="date"
                    value={exportDateTo}
                    onChange={(e) => setExportDateTo(e.target.value)}
                    className="w-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
                  />
                </div>
              </div>

              {customTemplates.length === 0 && (
                <div className="text-center py-3 bg-[hsl(var(--muted))] rounded-lg">
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    No custom templates found.
                  </p>
                  <button
                    onClick={() => {
                      setShowExportModal(false);
                      navigate('/reports/templates/new/edit');
                    }}
                    className="text-sm text-[hsl(var(--primary))] hover:underline mt-1"
                  >
                    Create a custom template
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-lg"
              >
                Cancel
              </button>
              <Button
                onClick={handleExportWithCustomTemplate}
                disabled={exporting}
                leftIcon={exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              >
                {exporting ? 'Exporting...' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportTemplatesPage;
