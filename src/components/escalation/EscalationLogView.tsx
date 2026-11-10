import React, { useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Download,
  FileText,
  Filter,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { classificationApi } from "@/api/admin";
import { escalationLogApi } from "@/api/escalationLogs";
import { AppPagination } from "@/components/ui/AppPagination";
import { Button } from "@/components/ui";
import { PERMISSIONS } from "@/constants/permissions";
import { useDebounce } from "@/hooks/useDebounce";
import usePermissions from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import type { EscalationLogFilter } from "@/types";

const PAGE_LIMIT = 10;

type BreachLogFilters = Pick<
  EscalationLogFilter,
  | "person"
  | "level"
  | "classification_id"
  | "date_from"
  | "date_to"
  | "escalation_type"
>;

export interface EscalationLogViewProps {
  /** When set, shows escalation log entries for this incident only (incident-details tab layout). */
  incidentId?: string;
  /** Hide the incident/report column and incident-number search (useful in incident detail). */
  hideIncidentColumn?: boolean;
  className?: string;
  /** Use compact typography for workspace/new designs. */
  compact?: boolean;
}

export const EscalationLogView: React.FC<EscalationLogViewProps> = ({
  incidentId,
  hideIncidentColumn,
  className,
  compact = false,
}) => {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  const [isExporting, setIsExporting] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearch = useDebounce(searchValue, 400);
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilters, setDraftFilters] = useState<BreachLogFilters>({});
  const [filter, setFilter] = useState<EscalationLogFilter>({
    page: 1,
    limit: PAGE_LIMIT,
    incident_id: incidentId,
  });

  const isIncidentView = Boolean(incidentId);
  const showIncidentColumn = !hideIncidentColumn && !isIncidentView;

  useEffect(() => {
    setFilter((prev) => ({
      ...prev,
      incident_id: incidentId,
      page: 1,
    }));
  }, [incidentId]);

  useEffect(() => {
    if (isIncidentView) return;
    setFilter((prev) => {
      const incidentNumber = debouncedSearch.trim() || undefined;
      if (prev.incident_number === incidentNumber && prev.page === 1) {
        return prev;
      }
      return { ...prev, incident_number: incidentNumber, page: 1 };
    });
  }, [debouncedSearch, isIncidentView]);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["escalation-log", { ...filter, incident_id: incidentId }],
    queryFn: () =>
      escalationLogApi.List({ ...filter, incident_id: incidentId }),
    retry: false,
  });

  const { data: classificationsData } = useQuery({
    queryKey: ["admin", "classifications", "escalation-log-filter"],
    queryFn: () => classificationApi.list(),
    enabled: !isIncidentView && showFilters,
  });
  const classifications = classificationsData?.data ?? [];

  const entries = data?.data?.entries ?? [];
  const total = data?.data?.total ?? 0;
  const safeLimit = filter.limit || PAGE_LIMIT;
  const currentPage = filter.page || 1;
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * safeLimit + 1;
  const rangeEnd = Math.min(currentPage * safeLimit, total);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  const hasActiveFilters =
    Object.values(draftFilters).some(Boolean) ||
    Boolean(
      filter.person ||
      filter.level ||
      filter.classification_id ||
      filter.date_from ||
      filter.date_to ||
      filter.escalation_type,
    );

  const setField = (key: keyof BreachLogFilters, value: string) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setFilter((prev) => ({
      ...prev,
      ...draftFilters,
      incident_id: incidentId,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setDraftFilters({});
    setFilter((prev) => ({
      page: 1,
      limit: PAGE_LIMIT,
      incident_id: incidentId,
      incident_number: isIncidentView ? undefined : prev.incident_number,
    }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await escalationLogApi.Export({
        ...filter,
        incident_id: incidentId,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `escalation-log-${incidentId ? `${incidentId}-` : ""}${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("escalation.breachLog.exportFailed"));
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return "-";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString(i18n.language === "ar" ? "ar-SA" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (d?: string) => {
    if (!d) return "-";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString(i18n.language === "ar" ? "ar-SA" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "sent":
        return t("escalation.breachLog.statusSent");
      case "failed":
        return t("escalation.breachLog.statusFailed");
      case "partial":
        return t("escalation.breachLog.statusPartial");
      case "skipped":
        return t("escalation.breachLog.statusSkipped");
      default:
        return t("escalation.breachLog.statusUnknown");
    }
  };

  const statusClass = (status: string) =>
    cn(
      "inline-flex items-center rounded font-medium border whitespace-nowrap",
      compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
      status === "sent" &&
        "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
      status === "failed" &&
        "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      status === "partial" &&
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      status === "skipped" &&
        "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20",
      !["sent", "failed", "partial", "skipped"].includes(status) &&
        "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]",
    );

  const channelLabel = (channel: string) => {
    switch (channel?.toUpperCase()) {
      case "EMAIL":
        return t("escalation.channelEmail");
      case "SMS":
        return t("escalation.channelSms");
      default:
        return channel;
    }
  };

  const formatLevel = (from?: number, to?: number) =>
    `${from ?? "—"} → ${to ?? "—"}`;

  const inputClass =
    "w-full px-3 h-9 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]";

  const columns = useMemo(() => {
    const cols: string[] = [];
    if (showIncidentColumn) cols.push("escalation.breachLog.incident");
    cols.push("escalation.breachLog.escalatedAt");
    if (!isIncidentView) cols.push("escalation.breachLog.reason");
    cols.push(
      "escalation.breachLog.type",
      "escalation.breachLog.level",
      "escalation.breachLog.personTold",
      "escalation.breachLog.channelResults",
      "escalation.breachLog.status",
    );
    return cols;
  }, [showIncidentColumn, isIncidentView]);

  const refreshButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => refetch()}
      isLoading={isRefetching}
      leftIcon={<RefreshCw className={compact ? "w-3 h-3" : "w-4 h-4"} />}
      className={compact ? "h-7 px-2.5 text-xs gap-1.5" : undefined}
    >
      {t("common.refresh")}
    </Button>
  );

  const exportButton = hasPermission(PERMISSIONS.ESCALATION_LOGS_EXPORT) ? (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      leftIcon={<Download className={compact ? "w-3 h-3" : "w-4 h-4"} />}
      className={compact ? "h-7 px-2.5 text-xs gap-1.5" : undefined}
    >
      {isExporting ? t("common.exporting") : t("escalation.breachLog.export")}
    </Button>
  ) : null;

  return (
    <div className={cn("space-y-4", className)}>
      {isIncidentView ? (
        <div className="flex items-center justify-end gap-2">
          {refreshButton}
          {exportButton}
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={t("escalation.breachLog.searchPlaceholder")}
                className={`${inputClass} ps-9`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters((prev) => !prev)}
                leftIcon={<Filter className="w-4 h-4" />}
              >
                {t("escalation.breachLog.filters")}
              </Button>
              {refreshButton}
              {exportButton}
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-4 border-t border-[hsl(var(--border))]">
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                  {t("escalation.breachLog.person")}
                </label>
                <input
                  value={draftFilters.person || ""}
                  onChange={(e) => setField("person", e.target.value)}
                  placeholder={t("escalation.breachLog.personPlaceholder")}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                  {t("escalation.breachLog.level")}
                </label>
                <input
                  type="number"
                  min={1}
                  value={draftFilters.level ?? ""}
                  onChange={(e) => setField("level", e.target.value)}
                  placeholder={t("escalation.breachLog.levelPlaceholder")}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                  {t("escalation.breachLog.classification")}
                </label>
                <select
                  value={draftFilters.classification_id || ""}
                  onChange={(e) =>
                    setField("classification_id", e.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">
                    {t("escalation.breachLog.allClassifications")}
                  </option>
                  {classifications.map((classification) => (
                    <option key={classification.id} value={classification.id}>
                      {classification.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                  {t("escalation.breachLog.type")}
                </label>
                <select
                  value={draftFilters.escalation_type || ""}
                  onChange={(e) => setField("escalation_type", e.target.value)}
                  className={inputClass}
                >
                  <option value="">{t("escalation.breachLog.allTypes")}</option>
                  <option value="state_sla">
                    {t("escalation.breachLog.stateSla")}
                  </option>
                  <option value="global_sla">
                    {t("escalation.breachLog.globalSla")}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                  {t("escalation.breachLog.dateFrom")}
                </label>
                <input
                  type="date"
                  value={draftFilters.date_from || ""}
                  onChange={(e) => setField("date_from", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                  {t("escalation.breachLog.dateTo")}
                </label>
                <input
                  type="date"
                  value={draftFilters.date_to || ""}
                  onChange={(e) => setField("date_to", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  leftIcon={<X className="w-4 h-4" />}
                >
                  {t("common.clear")}
                </Button>
                <Button size="sm" onClick={applyFilters}>
                  {t("common.apply")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[hsl(var(--muted-foreground))]">
              {t("common.loading")}
            </p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <XCircle className="w-10 h-10 text-[hsl(var(--destructive))] mx-auto mb-3" />
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
              {(error as Error)?.message || t("escalation.breachLog.loadError")}
            </p>
            <Button
              onClick={() => refetch()}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              {t("common.retry")}
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
            <h3 className="font-semibold text-[hsl(var(--foreground))] mb-1">
              {t("escalation.breachLog.noRecords")}
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {t("escalation.breachLog.noRecordsHint")}
            </p>
          </div>
        ) : (
          <>
            <div>
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                    {columns.map((key) => {
                      const isReasonColumn =
                        key === "escalation.breachLog.reason";
                      return (
                        <th
                          key={key}
                          className={cn(
                            "text-start",
                            compact
                              ? "px-2 py-2.5 sm:px-2.5"
                              : "px-2 py-3.5 sm:px-3",
                            isReasonColumn && "w-[28%] min-w-[280px]",
                          )}
                        >
                          <span
                            className={cn(
                              "font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider",
                              compact ? "text-[10px]" : "text-xs",
                            )}
                          >
                            {t(key)}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const recipientName =
                      entry.recipient.name ||
                      entry.recipient.email ||
                      entry.recipient.phone ||
                      "—";
                    const recipientInitial =
                      recipientName !== "—"
                        ? recipientName[0].toUpperCase()
                        : "?";
                    const cellPad = compact
                      ? "px-2 py-2 sm:px-2.5"
                      : "px-2 py-3.5 sm:px-3";
                    const textSm = compact ? "text-xs" : "text-sm";
                    const textXs = compact ? "text-[11px]" : "text-xs";
                    return (
                      <React.Fragment key={entry.id}>
                        <tr
                          className={cn(
                            "hover:bg-[hsl(var(--muted)/0.4)] transition-colors align-top border-t border-[hsl(var(--border))]",
                            !isIncidentView &&
                              "border-b border-[hsl(var(--border))]",
                          )}
                        >
                          {showIncidentColumn && (
                            <td className={cn("break-words", cellPad)}>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 break-all font-medium text-[hsl(var(--primary))]",
                                  textSm,
                                )}
                              >
                                <FileText
                                  className={cn(
                                    "shrink-0",
                                    compact ? "w-3 h-3" : "w-3.5 h-3.5",
                                  )}
                                />
                                {entry.incident_number ||
                                  entry.incident_id?.slice(0, 8) ||
                                  "—"}
                              </span>
                              {entry.classification_name && (
                                <p
                                  className={cn(
                                    "mt-0.5 break-words text-[hsl(var(--muted-foreground))]",
                                    textXs,
                                  )}
                                >
                                  {entry.classification_name}
                                </p>
                              )}
                            </td>
                          )}
                          <td
                            className={cn(
                              "text-[hsl(var(--muted-foreground))]",
                              cellPad,
                              textSm,
                            )}
                          >
                            <span className="block">
                              {formatDate(entry.escalated_at)}
                            </span>
                            <span
                              className={cn("block", compact && "text-[11px]")}
                            >
                              {formatTime(entry.escalated_at)}
                            </span>
                          </td>
                          {!isIncidentView && (
                            <td
                              className={cn(
                                "break-words text-[hsl(var(--foreground))] w-[28%] min-w-[280px]",
                                cellPad,
                                textSm,
                              )}
                            >
                              {entry.reason || "—"}
                            </td>
                          )}
                          <td className={cn("break-words", cellPad)}>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-md border border-orange-500/20 bg-orange-500/10 font-medium text-orange-600 dark:text-orange-400",
                                compact
                                  ? "px-1.5 py-0.5 text-[10px]"
                                  : "px-2 py-1 text-xs",
                              )}
                            >
                              {entry.escalation_type === "global_sla"
                                ? t("escalation.breachLog.globalSla")
                                : t("escalation.breachLog.stateSla")}
                            </span>
                            <p
                              className={cn(
                                "mt-1 break-words text-[hsl(var(--muted-foreground))]",
                                textXs,
                              )}
                            >
                              {entry.state_name || "—"}
                            </p>
                          </td>
                          <td
                            className={cn(
                              "text-[hsl(var(--foreground))]",
                              cellPad,
                              textSm,
                            )}
                          >
                            {formatLevel(entry.from_level, entry.to_level)}
                          </td>
                          <td className={cn("break-all", cellPad)}>
                            <div className="flex min-w-0 items-center gap-2">
                              <div
                                className={cn(
                                  "shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))]",
                                  compact ? "h-5 w-5" : "h-6 w-6",
                                )}
                              >
                                <span
                                  className={cn(
                                    "font-semibold text-white",
                                    compact ? "text-[10px]" : "text-xs",
                                  )}
                                >
                                  {recipientInitial}
                                </span>
                              </div>
                              <span
                                className={cn(
                                  "min-w-0 font-medium text-[hsl(var(--foreground))]",
                                  textSm,
                                )}
                              >
                                {recipientName}
                              </span>
                            </div>
                          </td>
                          <td className={cn(cellPad)}>
                            <div className="flex flex-wrap gap-1">
                              {entry.recipient.notices.length === 0 && (
                                <span
                                  className={cn(
                                    "text-[hsl(var(--muted-foreground))]",
                                    textXs,
                                  )}
                                >
                                  —
                                </span>
                              )}
                              {entry.recipient.notices.map((notice, index) => {
                                const detail = [
                                  notice.failure_code,
                                  notice.error,
                                ]
                                  .filter(Boolean)
                                  .join(" — ");
                                return (
                                  <span
                                    key={`${entry.id}-${notice.channel}-${index}`}
                                    title={detail || undefined}
                                    className={cn(
                                      statusClass(notice.status),
                                      "whitespace-normal break-words",
                                    )}
                                  >
                                    {channelLabel(notice.channel)}:{" "}
                                    {statusLabel(notice.status)}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className={cn(cellPad)}>
                            <span
                              className={cn(
                                statusClass(entry.status),
                                "whitespace-normal",
                              )}
                            >
                              {statusLabel(entry.status)}
                            </span>
                          </td>
                        </tr>
                        {isIncidentView && (
                          <tr className="bg-[hsl(var(--muted)/0.15)] hover:bg-[hsl(var(--muted)/0.3)] transition-colors border-b border-[hsl(var(--border))]">
                            <td
                              colSpan={columns.length}
                              className={cn(
                                compact
                                  ? "px-2 pt-0.5 pb-2 sm:px-2.5"
                                  : "px-2 pt-1 pb-3.5 sm:px-3",
                              )}
                            >
                              <div
                                className={cn(
                                  "text-[hsl(var(--foreground))] break-words",
                                  compact ? "text-xs" : "text-sm",
                                )}
                              >
                                <span
                                  className={cn(
                                    "font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))] me-2",
                                    compact ? "text-[10px]" : "text-xs",
                                  )}
                                >
                                  {t("escalation.breachLog.reason")}:
                                </span>
                                <span>{entry.reason || "—"}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col items-start justify-between gap-3 border-t border-[hsl(var(--border))] px-5 py-3 sm:flex-row sm:items-center">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                <Trans
                  i18nKey="escalation.breachLog.showingRange"
                  values={{
                    start: rangeStart,
                    end: rangeEnd,
                    total,
                    incidents: t("escalation.breachLog.incidents"),
                  }}
                  components={{
                    start: (
                      <strong className="font-bold text-[hsl(var(--foreground))]" />
                    ),
                    end: (
                      <strong className="font-bold text-[hsl(var(--foreground))]" />
                    ),
                    total: (
                      <strong className="font-bold text-[hsl(var(--foreground))]" />
                    ),
                  }}
                />
              </span>
              <AppPagination
                page={filter.page || 1}
                totalPages={totalPages}
                onPageChange={(page) =>
                  setFilter((prev) => ({ ...prev, page }))
                }
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EscalationLogView;
