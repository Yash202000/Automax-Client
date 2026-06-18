import React, { useState, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  FileBarChart,
  ChevronDown,
  ChevronRight,
  Play,
  Download,
  Save,
  RotateCcw,
  FolderOpen,
} from "lucide-react";
import { Button } from "../../components/ui";
import {
  DataSourceSelector,
  ColumnSelector,
  FilterBuilder,
  SortingConfig,
  ReportPreview,
  ExportDialog,
  SaveTemplateDialog,
} from "../../components/reports";
import {
  reportApi,
  departmentApi,
  locationApi,
  classificationApi,
  userApi,
  workflowApi,
} from "../../api/admin";
import { getValidFilters } from "@/utils/reportUtils";
import {
  DATA_SOURCES,
  getFieldsForDataSource,
  getDefaultFieldsForDataSource,
} from "../../constants/reportFields";
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
} from "../../types";
import { saveAs } from "file-saver";
import i18n from "@/i18n";
import { useAuthStore } from "@/stores/authStore";

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
const flattenTreeWithLabels = <
  T extends {
    id: string;
    name: string;
    path?: string;
    level?: number;
    children?: T[];
  },
>(
  items: T[],
  level: number = 0,
): { value: string; label: string }[] => {
  const result: { value: string; label: string }[] = [];

  for (const item of items) {
    const indent = level > 0 ? "│  ".repeat(level - 1) + "├─ " : "";
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
    <div className="border border-[hsl(var(--border))] rounded-xl">
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
            <span className="font-medium text-[hsl(var(--foreground))]">
              {title}
            </span>
          </div>
        </div>
        {badge}
      </button>
      {isExpanded && (
        <div className="p-4 bg-[hsl(var(--card))] min-h-0 ">{children}</div>
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
  const [selectedColumns, setSelectedColumns] = useState<
    { field: string; label: string; label_ar: string }[]
  >([]);
  const [stateFields, setStateFields] = useState<Array<any>>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [sorting, setSorting] = useState<ReportSort[]>([]);
  // displayPage — client-side pagination through previewData
  const [displayPage, setDisplayPage] = useState(1);
  const DISPLAY_SIZE = 50;
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [dbTotalCount, setDbTotalCount] = useState(0); // total matching rows in DB
  const [reportTotalPages, setReportTotalPages] = useState(1);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [loadedTemplate, setLoadedTemplate] = useState<ReportTemplate | null>(
    null,
  );
  const [timestampKey, setTimestampKey] = useState<string>("created_at");

  const { user } = useAuthStore();

  // Ref used to scroll to the preview section after generating
  const previewRef = useRef<HTMLDivElement>(null);

  // Fetch hierarchical data for dynamic dropdowns
  const { data: departmentsTree } = useQuery({
    queryKey: ["admin", "departments", "tree"],
    queryFn: () => departmentApi.getTree(),
  });

  const { data: locationsTree } = useQuery({
    queryKey: ["admin", "locations", "tree"],
    queryFn: () => locationApi.getTree(),
  });

  const { data: classificationsTree } = useQuery({
    queryKey: ["admin", "classifications", "tree"],
    queryFn: () => classificationApi.getTree(),
  });

  const { data: userOptions } = useQuery({
    queryKey: ["admin", "users", "options"],
    queryFn: () => userApi.list(),
  });

  const { data: stateOptions } = useQuery({
    queryKey: ["admin", "states", "options", "incident"],
    queryFn: () => workflowApi.list(false, "incident"),
  });

  const { data: reqStateOptions } = useQuery({
    queryKey: ["admin", "states", "options", "request"],
    queryFn: () => workflowApi.list(false, "request"),
  });

  // Build hierarchical options from tree data
  const dynamicOptionsMap = useMemo(() => {
    const map: Record<string, { value: string; label: string }[]> = {};

    if (stateOptions?.data && stateOptions.data.length > 0) {
      map.states = stateOptions.data[0].states?.map((state) => ({
        value: state.name,
        label: state.name,
      })) as { value: string; label: string }[];

      map.transitions = stateOptions.data[0].transitions?.map((transition) => ({
        value: transition.id,
        label: transition.name + " (" + transition.code + ")",
      })) as { value: string; label: string }[];
    }

    if (reqStateOptions?.data && reqStateOptions.data.length > 0) {
      map.requestStates = reqStateOptions.data[0].states?.map((state) => ({
        value: state.id,
        label: state.name,
      })) as { value: string; label: string }[];

      map.requestTransitions = reqStateOptions.data[0].transitions?.map(
        (transition) => ({
          value: transition.id,
          label: transition.name + " (" + transition.code + ")",
        }),
      ) as { value: string; label: string }[];
    }

    if (departmentsTree?.data) {
      map.departments = flattenTreeWithLabels(
        departmentsTree.data as (Department & { children?: Department[] })[],
      );
    }

    if (locationsTree?.data) {
      map.locations = flattenTreeWithLabels(
        locationsTree.data as (Location & { children?: Location[] })[],
      );
    }

    if (classificationsTree?.data) {
      map.classifications = flattenTreeWithLabels(
        classificationsTree.data as (Classification & {
          children?: Classification[];
        })[],
      );
    }

    if (userOptions?.data) {
      map.users = userOptions.data.map((user) => ({
        value: user.id,
        label:
          user.first_name && user.last_name
            ? user.first_name + " " + user.last_name
            : user.username || user.email,
      }));
    }

    return map;
  }, [departmentsTree, locationsTree, classificationsTree, userOptions]);

  // Get fields for current data source with dynamic options enhanced
  const fields = useMemo(() => {
    const baseFields = dataSource ? getFieldsForDataSource(dataSource) : [];

    // Enhance fields with dynamic options
    return [...baseFields, ...stateFields].map((field) => {
      const fieldClone = { ...field };
      if (
        !user?.is_super_admin &&
        fieldClone.field === "workflow_transition_id"
      ) {
        fieldClone.hidden = true;
      } else {
        fieldClone.hidden = false;
      }
      if (
        fieldClone.dynamicOptions &&
        dynamicOptionsMap[fieldClone.dynamicOptions]
      ) {
        return {
          ...fieldClone,
          options: dynamicOptionsMap[fieldClone.dynamicOptions],
        };
      }
      return fieldClone;
    });
  }, [dataSource, dynamicOptionsMap, stateFields, user]);

  // Get data source definition
  const dataSourceDef = useMemo(() => {
    return DATA_SOURCES.find((ds) => ds.key === dataSource);
  }, [dataSource]);

  // Fetch template if templateId is provided
  const { data: templateData } = useQuery({
    queryKey: ["admin", "reports", "template", templateId],
    queryFn: () => reportApi.getTemplate(templateId!),
    enabled: !!templateId,
  });

  // Load template data when fetched
  React.useEffect(() => {
    if (templateData?.data) {
      const template = templateData.data;
      setDataSource(template.data_source);
      setSelectedColumns(
        template.config.columns.map((c) => ({
          field: c.field,
          label: c.label,
          label_ar: c.label_ar,
        })),
      );
      setFilters(
        template.config.filters.map((f, i) => ({ ...f, id: `filter_${i}` })),
      );
      setSorting(template.config.sorting);
      setLoadedTemplate(template);
    }
  }, [templateData]);

  // Fetch templates list for dropdown
  const { data: templatesData } = useQuery({
    queryKey: ["admin", "reports", "templates"],
    queryFn: () => reportApi.listTemplates(),
  });

  const templates = templatesData?.data || [];

  // Handle data source change — reset state only, user clicks Generate Report to fetch
  const handleDataSourceChange = useCallback((source: ReportDataSource) => {
    setDataSource(source);
    setSelectedColumns(getDefaultFieldsForDataSource(source));
    setFilters([]);
    setSorting([]);
    setPreviewData([]);
    setDbTotalCount(0);
    setDisplayPage(1);
    setLoadedTemplate(null);
  }, []);

  React.useEffect(() => {
    const fetchStates = async () => {
      try {
        const workflows: any = await workflowApi.list(true, "incident");
        if (workflows.success && workflows.data?.[0]?.states) {
          const states = workflows.data[0].states;
          const newFields = states.map((x: any) => ({
            field: x.code,
            label: x.name,
            type: "string",
            category: "States",
            sortable: false,
            filterable: false,
            defaultSelected: true,
            canBeColumn: true,
          }));
          setStateFields(newFields);

          // If no template is loaded (e.g. manual datasource switch),
          // add these dynamic fields to selected columns if they are defaultSelected
          if (!loadedTemplate) {
            const defaultDynamicCols = newFields
              .filter((f: any) => f.defaultSelected)
              .map((f: any) => ({ field: f.field, label: f.label }));

            setSelectedColumns((prev) => {
              const existingFields = new Set(prev.map((c) => c.field));
              const toAdd = defaultDynamicCols.filter(
                (c: any) => !existingFields.has(c.field),
              );
              return [...prev, ...toAdd];
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch workflow states:", error);
      }
    };

    if (
      dataSource === "classifications_by_status" ||
      dataSource === "locations_by_status"
    ) {
      fetchStates();
    } else {
      setStateFields([]);
    }
  }, [dataSource, loadedTemplate]);

  // Server-driven paginated preview
  const fetchReportData = async (page = 1) => {
    const request: ReportQueryRequest = {
      data_source: dataSource!,
      columns: selectedColumns,
      filters: getValidFilters(filters).map(({ field, value }) => ({
        field,
        operator: "equals",
        value,
      })),
      sorting,
      page,
      limit: DISPLAY_SIZE,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    const response = await reportApi.query(request);
    return response;
  };

  const generateReport = useCallback(async () => {
    if (!dataSource || selectedColumns.length === 0) return;
    setIsPreviewLoading(true);
    setDisplayPage(1);
    try {
      const response = await fetchReportData(1);
      setPreviewData(response?.data || []);
      setDbTotalCount(response.total_items || 0);
      setReportTotalPages(
        response.total_pages ||
          Math.max(1, Math.ceil((response.total_items || 0) / DISPLAY_SIZE)),
      );
      setTimeout(
        () =>
          previewRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        100,
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to generate report:", error);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [dataSource, selectedColumns, filters, sorting]);

  const handlePageChange = useCallback(
    async (page: number) => {
      if (page < 1 || page === displayPage || page > reportTotalPages) return;
      setIsPreviewLoading(true);
      try {
        const response = await fetchReportData(page);
        setPreviewData(response?.data || []);
        setDisplayPage(page);
        setDbTotalCount(response.total_items || 0);
        setReportTotalPages(
          response.total_pages ||
            Math.max(1, Math.ceil((response.total_items || 0) / DISPLAY_SIZE)),
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to change preview page:", error);
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [
      displayPage,
      reportTotalPages,
      dataSource,
      selectedColumns,
      sorting,
      filters,
    ],
  );

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async ({
      format,
      options,
    }: {
      format: "xlsx" | "pdf";
      options: {
        title: string;
        includeFilters: boolean;
        includeTimestamp: boolean;
      };
    }) => {
      if (!dataSource) throw new Error("No data source selected");
      const language = i18n.language;
      const response = await reportApi.export(
        {
          data_source: dataSource,
          columns: selectedColumns,
          filters: getValidFilters(filters).map(
            ({ field, operator, value }) => ({
              field,
              operator,
              value,
            }),
          ),
          sorting: [],
          format,
          options: {
            ...options,
            title:
              language === "ar" && loadedTemplate?.name_ar
                ? loadedTemplate.name_ar
                : loadedTemplate?.name || "Report",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        },
        language,
      );

      const blob = response;

      const filename = `${(loadedTemplate?.name || "Report").replace(/[^a-z0-9]/gi, "_")}_${
        new Date().toISOString().split("T")[0]
      }.${format}`;

      saveAs(blob, filename);
    },

    onSuccess: () => {
      setShowExportDialog(false);
    },
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async ({
      name,
      name_ar,
      description,
      description_ar,
      isPublic,
    }: {
      name: string;
      name_ar: string;
      description: string;
      description_ar: string;
      isPublic: boolean;
    }) => {
      if (!dataSource) throw new Error("No data source selected");

      const config = {
        columns: selectedColumns.map((col) => {
          return { field: col.field, label: col.label, label_ar: col.label_ar };
        }),
        filters: filters.map(({ field, operator, value }) => ({
          field,
          operator,
          value,
        })),
        sorting,
      };

      // eslint-disable-next-line no-console
      console.log(config);

      if (loadedTemplate) {
        // Update existing
        return reportApi.updateTemplate(loadedTemplate.id, {
          name,
          name_ar,
          description,
          description_ar,
          config,
          is_public: isPublic,
          timestamp_key: timestampKey,
        });
      } else {
        // Create new
        return reportApi.createTemplate({
          name,
          name_ar,
          description,
          description_ar,
          data_source: dataSource,
          config,
          is_public: isPublic,
          timestamp_key: timestampKey,
        });
      }
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "reports", "templates"],
      });
      setShowSaveDialog(false);
      if (response.data) {
        setLoadedTemplate(response.data);
      }
      toast.success(
        loadedTemplate
          ? t("reports.templateUpdated")
          : t("reports.templateSaved"),
      );
    },
  });

  // Reset form
  const resetForm = () => {
    setDataSource(null);
    setSelectedColumns([]);
    setFilters([]);
    setSorting([]);
    setPreviewData([]);
    setDbTotalCount(0);
    setDisplayPage(1);
    setLoadedTemplate(null);
    navigate("/reports/builder");
  };

  // Load a template
  const loadTemplate = (template: ReportTemplate) => {
    setDataSource(template.data_source);
    setSelectedColumns(template.config.columns);
    setFilters(
      template.config.filters.map((f, i) => ({ ...f, id: `filter_${i}` })),
    );
    setSorting(template.config.sorting);
    setLoadedTemplate(template);
    setTimestampKey(template.timestamp_key || "created_at");
    setPreviewData([]);
    setDbTotalCount(0);
    setDisplayPage(1);
  };

  const canGenerate = dataSource && selectedColumns.length > 0;
  const canExport = (previewData?.length || 0) > 0;

  // Server-driven pagination: previewData contains current page
  const displayTotalPages = reportTotalPages;
  const displayData = previewData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-linear-to-br from-primary to-accent">
              <FileBarChart className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {t("reports.reportBuilder")}
            </h1>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ltr:ml-12 rtl:mr-12">
            {loadedTemplate
              ? `${t("reports.editing")}: ${i18n.language === "ar" && loadedTemplate.name_ar ? loadedTemplate.name_ar : loadedTemplate.name}`
              : t("reports.reportBuilderSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Load template dropdown */}
          {templates.length > 0 && (
            <div className="relative group">
              <Button
                variant="outline"
                leftIcon={<FolderOpen className="w-4 h-4" />}
              >
                {t("reports.loadTemplate")}
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
                        {
                          DATA_SOURCES.find(
                            (ds) => ds.key === template.data_source,
                          )?.label
                        }
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            onClick={resetForm}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            {t("reports.reset")}
          </Button>
        </div>
      </div>

      {/* Builder sections */}
      <div className="space-y-4">
        {/* Data Source */}
        <CollapsibleSection
          title={t("reports.dataSource")}
          icon={<div className="w-2 h-2 rounded-full bg-blue-500" />}
          badge={
            dataSourceDef ? (
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                {t(`reports.dataSources.${dataSource}`)}
              </span>
            ) : null
          }
        >
          <DataSourceSelector
            value={dataSource}
            onChange={handleDataSourceChange}
          />
        </CollapsibleSection>

        {/* Columns */}
        {dataSource && (
          <CollapsibleSection
            title={t("reports.columns")}
            icon={<div className="w-2 h-2 rounded-full bg-green-500" />}
            badge={
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {selectedColumns.length} {t("reports.selected")}
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
            title={t("reports.filters")}
            icon={<div className="w-2 h-2 rounded-full bg-amber-500" />}
            defaultExpanded={filters.length > 0}
            badge={
              filters.length > 0 ? (
                <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded-full">
                  {filters.length} {t("reports.active")}
                </span>
              ) : null
            }
          >
            <FilterBuilder
              fields={fields}
              filters={filters}
              onChange={setFilters}
              onTimestampKeyChange={setTimestampKey}
              timestampKey={timestampKey}
              showTimestampKey={user?.is_super_admin}
            />
          </CollapsibleSection>
        )}

        {/* Sorting */}
        {dataSource && (
          <CollapsibleSection
            title={t("reports.sorting")}
            icon={<div className="w-2 h-2 rounded-full bg-purple-500" />}
            defaultExpanded={sorting.length > 0}
            badge={
              sorting.length > 0 ? (
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {sorting.length} {t("reports.levels")}
                </span>
              ) : null
            }
          >
            <SortingConfig
              fields={fields}
              sorting={sorting}
              onChange={setSorting}
            />
          </CollapsibleSection>
        )}
      </div>

      {/* Action buttons */}
      {dataSource && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-[hsl(var(--muted)/0.3)] rounded-xl border border-[hsl(var(--border))]">
          <Button
            onClick={generateReport}
            disabled={!canGenerate}
            isLoading={isPreviewLoading}
            leftIcon={
              !isPreviewLoading ? <Play className="w-4 h-4" /> : undefined
            }
          >
            {t("reports.generateReport")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSaveDialog(true)}
            disabled={!canGenerate}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {loadedTemplate
              ? t("reports.updateTemplate")
              : t("reports.saveTemplate")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowExportDialog(true)}
            disabled={!canExport}
            leftIcon={<Download className="w-4 h-4" />}
          >
            {t("reports.export")}
          </Button>
        </div>
      )}

      {/* Preview */}
      {dataSource && (previewData.length > 0 || isPreviewLoading) && (
        <div
          ref={previewRef}
          className="border border-[hsl(var(--border))] rounded-xl overflow-hidden"
        >
          <div className="px-4 py-3 bg-[hsl(var(--muted)/0.3)] border-b border-[hsl(var(--border))] flex items-center justify-between gap-4">
            <h2 className="font-semibold text-[hsl(var(--foreground))]">
              {t("reports.previewResults")}
            </h2>
          </div>
          <div className="p-4">
            <ReportPreview
              data={displayData}
              columns={selectedColumns}
              fields={fields}
              isLoading={isPreviewLoading}
              page={displayPage}
              limit={DISPLAY_SIZE}
              totalItems={dbTotalCount}
              totalPages={displayTotalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={(format, options) =>
          exportMutation.mutateAsync({ format, options })
        }
        isExporting={exportMutation.isPending}
        dataSourceLabel={dataSourceDef?.label || ""}
        recordCount={previewData.length}
        previewData={previewData}
        columns={selectedColumns}
        fields={fields}
      />

      {/* Save Template Dialog */}
      <SaveTemplateDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={async (
          name,
          name_ar,
          description,
          description_ar,
          isPublic,
        ) => {
          await saveTemplateMutation.mutateAsync({
            name,
            name_ar,
            description,
            description_ar,
            isPublic,
          });
        }}
        isSaving={saveTemplateMutation.isPending}
        existingTemplate={loadedTemplate}
        dataSourceLabel={dataSourceDef?.label || ""}
      />
    </div>
  );
};

export default ReportBuilderPage;
