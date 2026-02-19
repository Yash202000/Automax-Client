import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileBarChart,
  ChevronDown,
  ChevronRight,
  Play,
  Download,
  Save,
  RotateCcw,
  FolderOpen,
} from 'lucide-react';
import { Button } from '../../components/ui';
import {
  DataSourceSelector,
  ColumnSelector,
  FilterBuilder,
  SortingConfig,
  ReportPreview,
  ExportDialog,
  SaveTemplateDialog,
} from '../../components/reports';
import { reportApi, departmentApi, locationApi, classificationApi } from '../../api/admin';
import {
  DATA_SOURCES,
  getFieldsForDataSource,
  getDefaultFieldsForDataSource,
} from '../../constants/reportFields';
import type {
  ReportDataSource,
  ReportFilter,
  ReportSort,
  ReportTemplate,
  ReportQueryRequest,
  // ReportFieldDefinition,
  Department,
  Location,
  Classification,
} from '../../types';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Helper to build hierarchical label with path
// const buildHierarchicalLabel = (item: { name: string; path?: string; level?: number }, allItems: { id: string; name: string; parent_id?: string | null }[]): string => {
//   if (item.path) {
//     // If path is available, use it to build the hierarchy
//     const pathParts = item.path.split('/').filter(Boolean);
//     if (pathParts.length > 1) {
//       return pathParts.join(' > ');
//     }
//   }
//   // Fallback to just the name with indentation based on level
//   const indent = item.level ? '—'.repeat(item.level) + ' ' : '';
//   return indent + item.name;
// };

// Helper to flatten tree structure with hierarchical labels
const flattenTreeWithLabels = <T extends { id: string; name: string; path?: string; level?: number; children?: T[] }>(
  items: T[],
  level: number = 0
): { value: string; label: string }[] => {
  const result: { value: string; label: string }[] = [];

  for (const item of items) {
    const indent = level > 0 ? '│  '.repeat(level - 1) + '├─ ' : '';
    result.push({
      value: item.id,
      label: indent + item.name,
    });

    if (item.children && item.children.length > 0) {
      result.push(...flattenTreeWithLabels(item.children, level + 1));
    }
  }

  return result;
};

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badge?: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  children,
  defaultExpanded = true,
  badge,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[hsl(var(--muted)/0.3)] hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          )}
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium text-[hsl(var(--foreground))]">{title}</span>
          </div>
        </div>
        {badge}
      </button>
      {isExpanded && (
        <div className="p-4 bg-[hsl(var(--card))]">{children}</div>
      )}
    </div>
  );
};

export const ReportBuilderPage: React.FC = () => {
  const { t } = useTranslation();
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [dataSource, setDataSource] = useState<ReportDataSource | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [sorting, setSorting] = useState<ReportSort[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [loadedTemplate, setLoadedTemplate] = useState<ReportTemplate | null>(null);

  // Fetch hierarchical data for dynamic dropdowns
  const { data: departmentsTree } = useQuery({
    queryKey: ['admin', 'departments', 'tree'],
    queryFn: () => departmentApi.getTree(),
  });

  const { data: locationsTree } = useQuery({
    queryKey: ['admin', 'locations', 'tree'],
    queryFn: () => locationApi.getTree(),
  });

  const { data: classificationsTree } = useQuery({
    queryKey: ['admin', 'classifications', 'tree'],
    queryFn: () => classificationApi.getTree(),
  });

  // Build hierarchical options from tree data
  const dynamicOptionsMap = useMemo(() => {
    const map: Record<string, { value: string; label: string }[]> = {};

    if (departmentsTree?.data) {
      map.departments = flattenTreeWithLabels(departmentsTree.data as (Department & { children?: Department[] })[]);
    }

    if (locationsTree?.data) {
      map.locations = flattenTreeWithLabels(locationsTree.data as (Location & { children?: Location[] })[]);
    }

    if (classificationsTree?.data) {
      map.classifications = flattenTreeWithLabels(classificationsTree.data as (Classification & { children?: Classification[] })[]);
    }

    return map;
  }, [departmentsTree, locationsTree, classificationsTree]);

  // Get fields for current data source with dynamic options enhanced
  const fields = useMemo(() => {
    const baseFields = dataSource ? getFieldsForDataSource(dataSource) : [];

    // Enhance fields with dynamic options
    return baseFields.map((field) => {
      if (field.dynamicOptions && dynamicOptionsMap[field.dynamicOptions]) {
        return {
          ...field,
          options: dynamicOptionsMap[field.dynamicOptions],
        };
      }
      return field;
    });
  }, [dataSource, dynamicOptionsMap]);

  // Get data source definition
  const dataSourceDef = useMemo(() => {
    return DATA_SOURCES.find((ds) => ds.key === dataSource);
  }, [dataSource]);

  // Fetch template if templateId is provided
  const { data: templateData } = useQuery({
    queryKey: ['admin', 'reports', 'template', templateId],
    queryFn: () => reportApi.getTemplate(templateId!),
    enabled: !!templateId,
  });

  // Load template data when fetched
  React.useEffect(() => {
    if (templateData?.data) {
      const template = templateData.data;
      setDataSource(template.data_source);
      setSelectedColumns(template.config.columns.map((c) => c.field));
      setFilters(template.config.filters.map((f, i) => ({ ...f, id: `filter_${i}` })));
      setSorting(template.config.sorting);
      setLoadedTemplate(template);
    }
  }, [templateData]);

  // Fetch templates list for dropdown
  const { data: templatesData } = useQuery({
    queryKey: ['admin', 'reports', 'templates'],
    queryFn: () => reportApi.listTemplates(),
  });

  const templates = templatesData?.data || [];

  // Handle data source change
  const handleDataSourceChange = useCallback((source: ReportDataSource) => {
    setDataSource(source);
    setSelectedColumns(getDefaultFieldsForDataSource(source));
    setFilters([]);
    setSorting([]);
    setPreviewData([]);
    setTotalItems(0);
    setTotalPages(0);
    setPage(1);
    setLoadedTemplate(null);
  }, []);

  // Generate report preview
  const generateReport = useCallback(async () => {
    if (!dataSource || selectedColumns.length === 0) return;

    setIsPreviewLoading(true);
    try {
      const request: ReportQueryRequest = {
        data_source: dataSource,
        columns: selectedColumns,
        filters: filters.map(({ field, operator, value }) => ({ field, operator, value })),
        sorting,
        page,
        limit,
      };

      const response = await reportApi.query(request);
      setPreviewData(response.data);
      setTotalItems(response.total_items);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [dataSource, selectedColumns, filters, sorting, page, limit]);

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // Regenerate when page changes
  React.useEffect(() => {
    if (previewData.length > 0 || totalItems > 0) {
      generateReport();
    }
  }, [page]);

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async ({ format, options }: { format: 'xlsx' | 'pdf'; options: { title: string; includeFilters: boolean; includeTimestamp: boolean } }) => {
      if (!dataSource) throw new Error('No data source selected');

      // For Excel, we can do client-side export
      if (format === 'xlsx') {
        // Fetch all data (no pagination)
        const response = await reportApi.query({
          data_source: dataSource,
          columns: selectedColumns,
          filters: filters.map(({ field, operator, value }) => ({ field, operator, value })),
          sorting,
          page: 1,
          limit: 10000, // Large limit to get all data
        });

        // Build headers from field labels
        const headers = selectedColumns.map((col) => {
          const field = fields.find((f) => f.field === col);
          return field?.label || col;
        });

        // Helper to format value for export
        const formatExportValue = (value: unknown, fieldDef: typeof fields[0] | undefined): string => {
          if (value === null || value === undefined || value === '') return '';

          // Handle enum types (like priority, severity)
          if (fieldDef?.type === 'enum' && fieldDef.options) {
            const option = fieldDef.options.find((o) =>
              o.value === value ||
              String(o.value) === String(value) ||
              Number(o.value) === Number(value)
            );
            return option?.label || String(value);
          }

          // Handle boolean
          if (fieldDef?.type === 'boolean') {
            return value ? 'Yes' : 'No';
          }

          // Handle dates
          if (fieldDef?.type === 'date' || fieldDef?.type === 'datetime') {
            try {
              const date = new Date(value as string);
              return fieldDef.type === 'date'
                ? date.toLocaleDateString()
                : date.toLocaleString();
            } catch {
              return String(value);
            }
          }

          return String(value);
        };

        // Build rows
        const rows = response.data.map((row) => {
          return selectedColumns.map((col) => {
            const fieldDef = fields.find((f) => f.field === col);
            let value: unknown;

            // First check if the full path exists as a flat key
            if (col in row) {
              value = row[col];
            } else {
              // Fall back to nested object traversal
              const parts = col.split('.');
              value = row;
              for (const part of parts) {
                if (value === null || value === undefined) {
                  value = null;
                  break;
                }
                value = (value as Record<string, unknown>)[part];
              }
            }

            return formatExportValue(value, fieldDef);
          });
        });

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Report');

        // Generate buffer
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        // Download
        const filename = `${options.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        saveAs(blob, filename);
      } else {
        // PDF - use server-side export
        const blob = await reportApi.export({
          data_source: dataSource,
          columns: selectedColumns,
          filters: filters.map(({ field, operator, value }) => ({ field, operator, value })),
          sorting,
          format: 'pdf',
          options,
        });
        const filename = `${options.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        saveAs(blob, filename);
      }
    },
    onSuccess: () => {
      setShowExportDialog(false);
    },
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async ({ name, description, isPublic }: { name: string; description: string; isPublic: boolean }) => {
      if (!dataSource) throw new Error('No data source selected');

      const config = {
        columns: selectedColumns.map((col) => {
          const field = fields.find((f) => f.field === col);
          return { field: col, label: field?.label || col };
        }),
        filters: filters.map(({ field, operator, value }) => ({ field, operator, value })),
        sorting,
      };

      if (loadedTemplate) {
        // Update existing
        return reportApi.updateTemplate(loadedTemplate.id, {
          name,
          description,
          config,
          is_public: isPublic,
        });
      } else {
        // Create new
        return reportApi.createTemplate({
          name,
          description,
          data_source: dataSource,
          config,
          is_public: isPublic,
        });
      }
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports', 'templates'] });
      setShowSaveDialog(false);
      if (response.data) {
        setLoadedTemplate(response.data);
      }
    },
  });

  // Reset form
  const resetForm = () => {
    setDataSource(null);
    setSelectedColumns([]);
    setFilters([]);
    setSorting([]);
    setPreviewData([]);
    setTotalItems(0);
    setTotalPages(0);
    setPage(1);
    setLoadedTemplate(null);
    navigate('/reports/builder');
  };

  // Load a template
  const loadTemplate = (template: ReportTemplate) => {
    setDataSource(template.data_source);
    setSelectedColumns(template.config.columns.map((c) => c.field));
    setFilters(template.config.filters.map((f, i) => ({ ...f, id: `filter_${i}` })));
    setSorting(template.config.sorting);
    setLoadedTemplate(template);
    setPreviewData([]);
    setTotalItems(0);
    setPage(1);
  };

  const canGenerate = dataSource && selectedColumns.length > 0;
  const canExport = previewData.length > 0 || totalItems > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500">
              <FileBarChart className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">{t('reports.reportBuilder')}</h1>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ltr:ml-12 rtl:mr-12">
            {loadedTemplate ? `${t('reports.editing')}: ${loadedTemplate.name}` : t('reports.reportBuilderSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Load template dropdown */}
          {templates.length > 0 && (
            <div className="relative group">
              <Button variant="outline" leftIcon={<FolderOpen className="w-4 h-4" />}>
                {t('reports.loadTemplate')}
                <ChevronDown className="w-4 h-4 ltr:ml-1 rtl:mr-1" />
              </Button>
              <div className="absolute right-0 mt-1 w-64 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <div className="py-1 max-h-64 overflow-y-auto">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => loadTemplate(template)}
                      className="w-full px-4 py-2 text-left hover:bg-[hsl(var(--muted))] transition-colors"
                    >
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {template.name}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {DATA_SOURCES.find((ds) => ds.key === template.data_source)?.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Button variant="outline" onClick={resetForm} leftIcon={<RotateCcw className="w-4 h-4" />}>
            {t('reports.reset')}
          </Button>
        </div>
      </div>

      {/* Builder sections */}
      <div className="space-y-4">
        {/* Data Source */}
        <CollapsibleSection
          title={t('reports.dataSource')}
          icon={<div className="w-2 h-2 rounded-full bg-blue-500" />}
          badge={
            dataSourceDef ? (
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                {t(`reports.dataSources.${dataSource}`)}
              </span>
            ) : null
          }
        >
          <DataSourceSelector value={dataSource} onChange={handleDataSourceChange} />
        </CollapsibleSection>

        {/* Columns */}
        {dataSource && (
          <CollapsibleSection
            title={t('reports.columns')}
            icon={<div className="w-2 h-2 rounded-full bg-green-500" />}
            badge={
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {selectedColumns.length} {t('reports.selected')}
              </span>
            }
          >
            <ColumnSelector
              fields={fields}
              selectedColumns={selectedColumns}
              onChange={setSelectedColumns}
            />
          </CollapsibleSection>
        )}

        {/* Filters */}
        {dataSource && (
          <CollapsibleSection
            title={t('reports.filters')}
            icon={<div className="w-2 h-2 rounded-full bg-amber-500" />}
            defaultExpanded={filters.length > 0}
            badge={
              filters.length > 0 ? (
                <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded-full">
                  {filters.length} {t('reports.active')}
                </span>
              ) : null
            }
          >
            <FilterBuilder fields={fields} filters={filters} onChange={setFilters} />
          </CollapsibleSection>
        )}

        {/* Sorting */}
        {dataSource && (
          <CollapsibleSection
            title={t('reports.sorting')}
            icon={<div className="w-2 h-2 rounded-full bg-purple-500" />}
            defaultExpanded={sorting.length > 0}
            badge={
              sorting.length > 0 ? (
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {sorting.length} {t('reports.levels')}
                </span>
              ) : null
            }
          >
            <SortingConfig fields={fields} sorting={sorting} onChange={setSorting} />
          </CollapsibleSection>
        )}
      </div>

      {/* Action buttons */}
      {dataSource && (
        <div className="flex items-center gap-3 p-4 bg-[hsl(var(--muted)/0.3)] rounded-xl border border-[hsl(var(--border))]">
          <Button
            onClick={generateReport}
            disabled={!canGenerate}
            isLoading={isPreviewLoading}
            leftIcon={!isPreviewLoading ? <Play className="w-4 h-4" /> : undefined}
          >
            {t('reports.generateReport')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSaveDialog(true)}
            disabled={!canGenerate}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {loadedTemplate ? t('reports.updateTemplate') : t('reports.saveTemplate')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowExportDialog(true)}
            disabled={!canExport}
            leftIcon={<Download className="w-4 h-4" />}
          >
            {t('reports.export')}
          </Button>
        </div>
      )}

      {/* Preview */}
      {dataSource && (previewData.length > 0 || isPreviewLoading) && (
        <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-[hsl(var(--muted)/0.3)] border-b border-[hsl(var(--border))]">
            <h2 className="font-semibold text-[hsl(var(--foreground))]">{t('reports.previewResults')}</h2>
          </div>
          <div className="p-4">
            <ReportPreview
              data={previewData}
              columns={selectedColumns}
              fields={fields}
              isLoading={isPreviewLoading}
              page={page}
              limit={limit}
              totalItems={totalItems}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={(format, options) => exportMutation.mutateAsync({ format, options })}
        isExporting={exportMutation.isPending}
        dataSourceLabel={dataSourceDef?.label || ''}
        recordCount={totalItems}
      />

      {/* Save Template Dialog */}
      <SaveTemplateDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={async (name, description, isPublic) => {
          await saveTemplateMutation.mutateAsync({ name, description, isPublic });
        }}
        isSaving={saveTemplateMutation.isPending}
        existingTemplate={loadedTemplate}
        dataSourceLabel={dataSourceDef?.label || ''}
      />
    </div>
  );
};

export default ReportBuilderPage;
