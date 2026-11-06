import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertOctagon,
  ChevronDown,
  Download,
  Filter,
  Inbox,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "../../components/ui";
import { AppPagination } from "../../components/ui/AppPagination";
import { errorLogApi } from "../../api/errorLogs";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";
import {
  FormatDateTime,
  MODULES,
  SEVERITIES,
  SeverityColors,
  STATUSES,
  StatusColors,
} from "../../constants/errorLog";
import type { ErrorLog, ErrorLogFilter } from "../../types";

const PAGE_LIMIT = 20;

const inputClass =
  "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]";

export const ErrorLogsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  // Allows deep links such as /admin/error-logs?search=ERR-000123 (from a critical alert)
  const [filter, setFilter] = useState<ErrorLogFilter>({
    page: 1,
    limit: PAGE_LIMIT,
    search: new URLSearchParams(window.location.search).get("search") || "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["error-logs", filter],
    queryFn: () => errorLogApi.List(filter),
  });

  const { data: usersData } = useQuery({
    queryKey: ["error-log-users"],
    queryFn: () => errorLogApi.Users(),
  });

  const hasActiveFilters = Boolean(
    filter.search ||
    filter.module ||
    filter.severity ||
    filter.status ||
    filter.user_id ||
    filter.start_date ||
    filter.end_date,
  );

  const ClearFilters = () => setFilter({ page: 1, limit: PAGE_LIMIT });

  const HandleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await errorLogApi.Export(filter);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `error_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("errorLogs.exportFailed", "Failed to export error logs"));
    } finally {
      setIsExporting(false);
    }
  };

  const SelectFilter = (
    label: string,
    key: "module" | "severity" | "status",
    options: string[],
    labelPrefix: string,
  ) => (
    <div>
      <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
        {label}
      </label>
      <div className="relative">
        <select
          value={filter[key] || ""}
          onChange={(e) =>
            setFilter({ ...filter, [key]: e.target.value, page: 1 })
          }
          className={`${inputClass} appearance-none`}
        >
          <option value="">{t("errorLogs.all", "All")}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {t(`errorLogs.${labelPrefix}.${o}`, o)}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))] pointer-events-none" />
      </div>
    </div>
  );

  const Th = ({ children }: { children: React.ReactNode }) => (
    <th className="px-4 py-4 text-start">
      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
        {children}
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <AlertOctagon className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {t("errorLogs.title", "Error Log")}
            </h1>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ms-12">
            {t(
              "errorLogs.subtitle",
              "System errors recorded automatically. Review, resolve and export them.",
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Inbox className="w-4 h-4" />}
            onClick={() =>
              navigate("/call-centre/communications?status=failed")
            }
          >
            {t("errorLogs.deliveryFailures", "SMS / Email Delivery Failures")}
          </Button>
          {hasPermission(PERMISSIONS.ERROR_LOGS_EXPORT) && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={HandleExport}
              disabled={isExporting}
            >
              {isExporting
                ? t("common.exporting", "Exporting...")
                : t("errorLogs.export", "Export CSV")}
            </Button>
          )}
        </div>
      </div>

      {/* Search + filters */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
              <input
                type="text"
                placeholder={t(
                  "errorLogs.searchPlaceholder",
                  "Search by Error ID, message, user or related record",
                )}
                value={filter.search || ""}
                onChange={(e) =>
                  setFilter({ ...filter, search: e.target.value, page: 1 })
                }
                className="w-full ps-12 pe-4 py-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                leftIcon={<Filter className="w-4 h-4" />}
                onClick={() => setShowFilters(!showFilters)}
              >
                {t("common.filters", "Filters")}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={ClearFilters}>
                  {t("errorLogs.clearFilters", "Clear all filters")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                isLoading={isFetching}
                leftIcon={
                  !isFetching ? <RefreshCw className="w-4 h-4" /> : undefined
                }
              >
                {t("common.refresh", "Refresh")}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 pt-4 border-t border-[hsl(var(--border))]">
              {SelectFilter(
                t("errorLogs.module", "Module"),
                "module",
                MODULES,
                "modules",
              )}
              {SelectFilter(
                t("errorLogs.severity", "Severity"),
                "severity",
                SEVERITIES,
                "severities",
              )}
              {SelectFilter(
                t("errorLogs.status", "Status"),
                "status",
                STATUSES,
                "statuses",
              )}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                  {t("errorLogs.user", "User")}
                </label>
                <div className="relative">
                  <select
                    value={filter.user_id || ""}
                    onChange={(e) =>
                      setFilter({ ...filter, user_id: e.target.value, page: 1 })
                    }
                    className={`${inputClass} appearance-none`}
                  >
                    <option value="">{t("errorLogs.all", "All")}</option>
                    {usersData?.data?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                  {t("errorLogs.fromDate", "From date")}
                </label>
                <input
                  type="date"
                  value={filter.start_date || ""}
                  onChange={(e) =>
                    setFilter({
                      ...filter,
                      start_date: e.target.value,
                      page: 1,
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                  {t("errorLogs.toDate", "To date")}
                </label>
                <input
                  type="date"
                  value={filter.end_date || ""}
                  onChange={(e) =>
                    setFilter({ ...filter, end_date: e.target.value, page: 1 })
                  }
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-[hsl(var(--muted-foreground))]">
            {t("errorLogs.loading", "Loading error logs...")}
          </div>
        ) : data?.data?.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[hsl(var(--foreground))] font-medium mb-1">
              {t("errorLogs.noneFound", "No errors found")}
            </p>
            <p className="text-[hsl(var(--muted-foreground))] text-sm">
              {hasActiveFilters
                ? t("errorLogs.tryAdjusting", "Try adjusting your filters")
                : t(
                    "errorLogs.willAppearHere",
                    "System errors will appear here",
                  )}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <Th>{t("errorLogs.errorId", "Error ID")}</Th>
                    <Th>{t("errorLogs.dateTime", "Date/Time")}</Th>
                    <Th>{t("errorLogs.module", "Module")}</Th>
                    <Th>{t("errorLogs.action", "Action")}</Th>
                    <Th>{t("errorLogs.message", "Error Message")}</Th>
                    <Th>{t("errorLogs.severity", "Severity")}</Th>
                    <Th>{t("errorLogs.user", "User")}</Th>
                    <Th>{t("errorLogs.relatedRecord", "Related Record")}</Th>
                    <Th>{t("errorLogs.status", "Status")}</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {data?.data?.map((e: ErrorLog) => (
                    <tr
                      key={e.id}
                      onClick={() => navigate(`/admin/error-logs/${e.id}`)}
                      className="cursor-pointer hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
                    >
                      <td className="px-4 py-4 text-sm font-medium text-[hsl(var(--primary))] whitespace-nowrap">
                        {e.error_code}
                      </td>
                      <td
                        dir="ltr"
                        className="px-4 py-4 text-sm text-[hsl(var(--foreground))] whitespace-nowrap"
                      >
                        {FormatDateTime(e.occurred_at)}
                      </td>
                      <td className="px-4 py-4 text-sm text-[hsl(var(--foreground))]">
                        {t(`errorLogs.modules.${e.module}`, e.module)}
                      </td>
                      <td className="px-4 py-4 text-sm text-[hsl(var(--foreground))]">
                        {e.action}
                      </td>
                      <td className="px-4 py-4 text-sm text-[hsl(var(--foreground))] max-w-xs truncate">
                        {e.message}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${SeverityColors[e.severity] || ""}`}
                        >
                          {t(`errorLogs.severities.${e.severity}`, e.severity)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[hsl(var(--foreground))]">
                        {e.user}
                      </td>
                      <td className="px-4 py-4 text-sm text-[hsl(var(--foreground))]">
                        {e.related_label || e.related_id || "-"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${StatusColors[e.status] || ""}`}
                        >
                          {t(`errorLogs.statuses.${e.status}`, e.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(var(--border))]">
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                {t("errorLogs.totalItems", "Total")}: {data?.total_items ?? 0}
              </span>
              <AppPagination
                page={filter.page || 1}
                totalPages={data?.total_pages || 1}
                onPageChange={(p) => setFilter({ ...filter, page: p })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ErrorLogsPage;
