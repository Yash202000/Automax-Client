import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  FileBarChart,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  Globe,
  Lock,
  User,
  Calendar,
  Download,
  Play,
  ChevronDown,
  AlertCircle,
  FileText,
  Users,
  Building2,
  MapPin,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Modal, ModalBody, ModalHeader } from "@/components/ui";
import type {
  ReportTemplate,
  ReportDataSource,
  ReportFilter,
  ReportFieldDefinition,
  ReportQueryRequest,
} from "@/types";
import { saveAs } from "file-saver";
import FilterBuilder from "@/components/reports/FilterBuilder";
import { DATA_SOURCES } from "@/constants/reportFields";
import { reportApi } from "@/api/admin";
import ReportPreview from "./ReportPreview";
import ExportDialog from "./ExportDialog";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "@/i18n";

interface ReportTemplateCardProps {
  template: ReportTemplate;
  // eslint-disable-next-line no-unused-vars
  onEdit: (_template: ReportTemplate) => void;
  // eslint-disable-next-line no-unused-vars
  onDelete: (_template: ReportTemplate) => void;
  // eslint-disable-next-line no-unused-vars
  onDuplicate: (_template: ReportTemplate) => void;
  // eslint-disable-next-line no-unused-vars
  onExport?: (_template: ReportTemplate) => void;
  dynamicOptionsMap: Record<string, { value: string; label: string }[]>;
}

const iconMap: Record<string, React.ElementType> = {
  AlertCircle,
  FileText,
  Users,
  Building2,
  MapPin,
  GitBranch,
};

const dataSourceInfo: Record<
  ReportDataSource,
  { labelKey: string; icon: string; color: string }
> = {
  incidents: {
    labelKey: "reports.dataSources.incidents",
    icon: "AlertCircle",
    color: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  },
  requests: {
    labelKey: "reports.dataSources.requests",
    icon: "FileText",
    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  },
  action_logs: {
    labelKey: "reports.dataSources.actionLogs",
    icon: "FileText",
    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  },
  users: {
    labelKey: "reports.dataSources.users",
    icon: "Users",
    color:
      "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  },
  departments: {
    labelKey: "reports.dataSources.departments",
    icon: "Building2",
    color:
      "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400",
  },
  locations: {
    labelKey: "reports.dataSources.locations",
    icon: "MapPin",
    color:
      "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
  },
  workflows: {
    labelKey: "reports.dataSources.workflows",
    icon: "GitBranch",
    color:
      "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
};

export const ReportTemplateCard: React.FC<ReportTemplateCardProps> = ({
  template,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  dynamicOptionsMap,
}) => {
  const { t } = useTranslation();
  const [activeMenu, setActiveMenu] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [displayPage, setDisplayPage] = useState(1);
  const [dbTotalCount, setDbTotalCount] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const DISPLAY_SIZE = 50;

  const displayTotalPages = Math.ceil(previewData.length / DISPLAY_SIZE);
  const displayData = previewData.slice(
    (displayPage - 1) * DISPLAY_SIZE,
    displayPage * DISPLAY_SIZE,
  );

  const canGenerate =
    template.data_source && template.config.columns.length > 0;

  // Initialize filters from template config
  useEffect(() => {
    if (template.config.filters) {
      setFilters(
        template.config.filters.map((f, i) => ({ ...f, id: i.toString() })),
      );
    }
  }, [template]);

  const sourceInfo = dataSourceInfo[template.data_source];
  const Icon = iconMap[sourceInfo.icon] || FileBarChart;

  const getFieldsForDataSource = (
    dataSource: string,
  ): ReportFieldDefinition[] => {
    const source = DATA_SOURCES.find((ds) => ds.key === dataSource);
    return source?.fields || [];
  };

  const getFields = (dataSource: ReportDataSource) => {
    const baseFields = dataSource ? getFieldsForDataSource(dataSource) : [];
    return baseFields.map((field) => {
      if (field.dynamicOptions && dynamicOptionsMap[field.dynamicOptions]) {
        return {
          ...field,
          options: dynamicOptionsMap[field.dynamicOptions],
        };
      }
      return field;
    });
  };

  // Generate report — fetches recordLimit rows in a single request, no server pagination
  const generateReport = useCallback(async () => {
    if (!template.data_source || template.config.columns.length === 0) return;

    setIsGenerating(true);
    setDisplayPage(1);
    try {
      const response = await fetchReportData();
      if (response && response.data) {
        setShowPreview(true);
        setPreviewData(response.data || []);
        setDbTotalCount(response.total_items || 0);
      } else {
        toast.error("No data found for the selected filters");
        setShowPreview(false);
        setPreviewData([]);
        setDbTotalCount(0);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to generate report:", error);
    } finally {
      setIsGenerating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    template.data_source,
    template.config.columns,
    filters,
    fromDate,
    toDate,
  ]);

  const fetchReportData = async () => {
    const dateFilter: ReportFilter[] = [];
    if (fromDate && toDate) {
      dateFilter.push({
        id: "created_at",
        field: "created_at",
        operator: "between",
        value: {
          from: new Date(fromDate).toISOString(),
          to: new Date(toDate).toISOString(),
        },
      });
    }
    const request: ReportQueryRequest = {
      data_source: template.data_source,
      columns: template.config.columns,
      filters: [...filters, ...dateFilter].map(
        ({ field, operator, value }) => ({
          field,
          operator,
          value,
        }),
      ),
      sorting: [],
      page: 1,
      limit: 100,
    };

    const response = await reportApi.query(request);
    return response;
  };

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
      if (!template.data_source) throw new Error("No data source selected");
      const language = i18n.language;
      const response = await reportApi.export(
        {
          data_source: template.data_source,
          columns: template.config.columns,
          filters: filters.map(({ field, operator, value }) => ({
            field,
            operator,
            value,
          })),
          sorting: [],
          format,
          options,
          title: template.name,
        },
        language,
      );

      const blob = response;

      const filename = `${options.title.replace(/[^a-z0-9]/gi, "_")}_${
        new Date().toISOString().split("T")[0]
      }.${format}`;

      saveAs(blob, filename);
    },

    onSuccess: () => {
      setShowExportDialog(false);
    },
  });

  return (
    <div className="group bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full hover:border-[hsl(var(--primary)/0.3)]">
      {/* Card header */}
      <div className="p-5 border-b border-[hsl(var(--border))] bg-gradient-to-br from-transparent to-[hsl(var(--muted)/0.2)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "p-2.5 rounded-xl shadow-sm transition-transform group-hover:scale-110 duration-300",
                sourceInfo.color,
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-[hsl(var(--foreground))] line-clamp-1 group-hover:text-[hsl(var(--primary))] transition-colors">
                {template.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-semibold">
                  {t(sourceInfo.labelKey)}
                </span>
              </div>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setActiveMenu(!activeMenu)}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {activeMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setActiveMenu(false)}
                />
                <div className="absolute ltr:right-0 rtl:left-0 mt-2 w-48 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-xl z-20 py-1.5 animate-in fade-in zoom-in-95 duration-200">
                  <button
                    onClick={() => {
                      onEdit(template);
                      setActiveMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-blue-500" />
                    {t("reports.edit")}
                  </button>
                  <button
                    onClick={() => {
                      onDuplicate(template);
                      setActiveMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <Copy className="w-4 h-4 text-indigo-500" />
                    {t("reports.duplicate")}
                  </button>
                  {onExport && (
                    <button
                      onClick={() => {
                        onExport(template);
                        setActiveMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                    >
                      <Download className="w-4 h-4 text-green-500" />
                      {t("reports.exportWithTemplate")}
                    </button>
                  )}
                  <hr className="my-1.5 border-[hsl(var(--border))]" />
                  <button
                    onClick={() => {
                      onDelete(template);
                      setActiveMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t("reports.delete")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {template.description && (
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-3 line-clamp-2 leading-relaxed">
            {template.description}
          </p>
        )}
      </div>

      {/* Generation Form */}
      <div className="p-5 space-y-5 flex-1 bg-gradient-to-b from-transparent to-[hsl(var(--muted)/0.1)]">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor={`from-${template.id}`}
              className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider ml-1"
            >
              {t("reports.filterBuilder.from")}
            </label>
            <div className="relative group/input">
              <input
                id={`from-${template.id}`}
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full border border-[hsl(var(--border))] rounded-xl px-4 py-2.5 text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.15)] focus:border-[hsl(var(--primary))] outline-none transition-all shadow-sm group-hover/input:border-[hsl(var(--muted-foreground)/0.5)]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor={`to-${template.id}`}
              className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider ml-1"
            >
              {t("reports.filterBuilder.to")}
            </label>
            <div className="relative group/input">
              <input
                id={`to-${template.id}`}
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full border border-[hsl(var(--border))] rounded-xl px-4 py-2.5 text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.15)] focus:border-[hsl(var(--primary))] outline-none transition-all shadow-sm group-hover/input:border-[hsl(var(--muted-foreground)/0.5)]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-[hsl(var(--muted)/0.5)] hover:bg-[hsl(var(--muted))] transition-colors border border-[hsl(var(--border))] group/trigger"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform duration-300 text-[hsl(var(--primary))]",
                  showFilters && "rotate-180",
                )}
              />
              {t("reports.filters")}
              {filters.length > 0 && (
                <span className="bg-[hsl(var(--primary))] text-white px-2 py-0.5 rounded-full text-[10px] ml-1">
                  {filters.length}
                </span>
              )}
            </div>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-medium italic group-hover/trigger:text-[hsl(var(--primary))] transition-colors">
              {showFilters ? t("common.hide") : t("common.view")}
            </span>
          </button>

          {showFilters && (
            <div className="p-4 rounded-xl border border-[hsl(var(--border))] border-dashed bg-[hsl(var(--card))] animate-in slide-in-from-top-2 duration-300">
              <FilterBuilder
                fields={getFields(template.data_source)}
                filters={filters}
                onChange={setFilters}
                enableAddFilter={false}
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 w-full pt-2">
          <Button
            onClick={generateReport}
            disabled={!canGenerate || isGenerating}
            isLoading={isGenerating}
            className="flex-1 h-11 rounded-xl font-bold shadow-lg shadow-[hsl(var(--primary)/0.2)] hover:shadow-[hsl(var(--primary)/0.3)] transition-all active:scale-[0.98]"
            size="sm"
            leftIcon={
              !isGenerating && <Play className="w-4 h-4 fill-current" />
            }
          >
            {t("reports.generateReport")}
          </Button>

          <Button
            onClick={() => setShowExportDialog(true)}
            disabled={isGenerating}
            variant="outline"
            isLoading={isGenerating}
            className="flex-1 h-11 rounded-xl font-bold hover:bg-[hsl(var(--muted))] transition-all active:scale-[0.98]"
            size="sm"
            leftIcon={!isGenerating && <Download className="w-4 h-4" />}
          >
            {t("reports.export")}
          </Button>
        </div>
      </div>

      {/* Card footer - Meta info */}
      <div className="px-5 py-4 bg-[hsl(var(--muted)/0.1)] border-t border-[hsl(var(--border))] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
            {template.is_public ? (
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Globe className="w-3.5 h-3.5" />
                {t("reports.public")}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Lock className="w-3.5 h-3.5" />
                {t("reports.private")}
              </span>
            )}
            {template.created_by && (
              <span className="flex items-center gap-1.5 border-l border-[hsl(var(--border))] ltr:pl-4 rtl:pr-4">
                <User className="w-3.5 h-3.5" />
                {template.created_by.username}
              </span>
            )}
          </div>
          <span className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 font-mono">
            <Calendar className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
            {new Date(template.created_at).toLocaleDateString()}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs font-bold uppercase tracking-widest h-10 hover:bg-[hsl(var(--primary)/0.1)] hover:text-[hsl(var(--primary))] transition-all rounded-lg"
          onClick={() => onEdit(template)}
          rightIcon={<Edit2 className="w-3 h-3 ml-2" />}
        >
          {t("reports.openReportBuilder")}
        </Button>
      </div>
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onOpenChange={setShowPreview}
        className="max-h-[95vh] w-[95vw]"
        size="full"
      >
        <ModalHeader className="px-8 py-5 flex items-center justify-between bg-gradient-to-r from-[hsl(var(--primary)/0.05)] to-transparent">
          <div className="flex items-center gap-4">
            <div className={cn("p-2.5 rounded-xl shadow-sm", sourceInfo.color)}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">
                {template.name}
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5 font-medium">
                {t("reports.previewResults")}
              </p>
            </div>
          </div>
        </ModalHeader>
        <ModalBody className="p-8">
          {template.data_source && previewData.length > 0 && (
            <div
              ref={previewRef}
              className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-sm overflow-hidden flex flex-col h-full"
            >
              <div className="px-6 py-4 bg-[hsl(var(--muted)/0.3)] border-b border-[hsl(var(--border))] flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-widest">
                    Live Preview
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-xs font-bold">
                    {previewData.length.toLocaleString()}{" "}
                    <span className="text-[hsl(var(--muted-foreground))] font-medium">
                      RECORDS FOUND
                    </span>
                  </div>
                  {previewData.length < dbTotalCount && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full uppercase tracking-wider">
                      <AlertCircle className="w-3 h-3" />
                      Partial Results
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 flex-1 overflow-auto">
                <ReportPreview
                  data={displayData}
                  columns={template.config.columns}
                  fields={getFields(template.data_source)}
                  isLoading={false}
                  page={displayPage}
                  limit={DISPLAY_SIZE}
                  totalItems={previewData.length}
                  totalPages={displayTotalPages}
                  onPageChange={setDisplayPage}
                />
              </div>
            </div>
          )}
        </ModalBody>
      </Modal>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={(format, options) =>
          exportMutation.mutateAsync({ format, options })
        }
        isExporting={exportMutation.isPending}
        dataSourceLabel={template.data_source}
        recordCount={previewData.length}
        previewData={previewData}
        columns={template.config.columns}
        fields={getFields(template.data_source)}
      />
    </div>
  );
};
