import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format, parseISO, subDays, isValid } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Search,
  Play,
  Download,
  Lock,
  X,
  ShieldAlert,
  History,
  AlertCircle,
  RefreshCw,
  Filter,
} from "lucide-react";
import {
  callRecordingApi,
  userApi,
  type CallRecordingHistoryEntry,
  type RecordingActivity,
} from "../../api/admin";
import Select from "@/components/ui/SelectInput";
import { AppPagination } from "@/components/ui/AppPagination";
import { DatePickerWithRange } from "@/ui/date-range-picker";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const DATE_PARAM_FORMAT = "yyyy-MM-dd";
const ALL_TIME = "all";

type ActivityFilter = "all" | RecordingActivity;

const isActivity = (v: string | null): v is RecordingActivity =>
  v === "listened" || v === "downloaded";

const parseDateParam = (v: string | null) => {
  if (!v) return undefined;
  const d = parseISO(v);
  return isValid(d) ? d : undefined;
};

const defaultRange = (): DateRange => {
  const today = new Date();
  return { from: subDays(today, 6), to: today };
};

export const CallRecordingHistoryPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // ---- URL-backed filter state (deep-linkable, survives refresh/back) ----
  const activityParam = searchParams.get("activity");
  const activity: ActivityFilter = isActivity(activityParam)
    ? activityParam
    : "all";
  const userId = searchParams.get("user_id") || "all";
  const callLogId = searchParams.get("call_log_id") || "";
  const callUuidLabel = searchParams.get("call_uuid") || "";
  const searchParam = searchParams.get("q") || "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const rangeParam = searchParams.get("range");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  // Date range: explicit from/to wins; "range=all" means no date filter.
  // Default is the last 7 days, except when deep-linked to a single call,
  // where the whole history of that call is the useful view.
  const dateRange: DateRange | undefined = useMemo(() => {
    if (rangeParam === ALL_TIME) return undefined;
    const from = parseDateParam(fromParam);
    const to = parseDateParam(toParam);
    if (from && to) return { from, to };
    if (callLogId) return undefined;
    return defaultRange();
  }, [rangeParam, fromParam, toParam, callLogId]);

  const updateParams = (
    changes: Record<string, string | null | undefined>,
    { resetPage = true }: { resetPage?: boolean } = {},
  ) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(changes).forEach(([k, v]) => {
          if (v === null || v === undefined || v === "") next.delete(k);
          else next.set(k, v);
        });
        if (resetPage) next.delete("page");
        return next;
      },
      { replace: true },
    );
  };

  // ---- Debounced search ----
  const [searchInput, setSearchInput] = useState(searchParam);
  const debouncedSearch = useDebounce(searchInput.trim(), 400);
  useEffect(() => {
    if (debouncedSearch !== searchParam) {
      updateParams({ q: debouncedSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);
  // Keep the input in sync if the URL changes (e.g. back/forward).
  useEffect(() => {
    setSearchInput((cur) => (cur.trim() === searchParam ? cur : searchParam));
  }, [searchParam]);

  // ---- Data ----
  const queryParams = {
    page,
    limit: PAGE_SIZE,
    activity: activity === "all" ? undefined : activity,
    user_id: userId === "all" ? undefined : userId,
    call_log_id: callLogId || undefined,
    search: searchParam || undefined,
    start_date: dateRange?.from
      ? format(dateRange.from, DATE_PARAM_FORMAT)
      : undefined,
    end_date: dateRange?.to
      ? format(dateRange.to, DATE_PARAM_FORMAT)
      : undefined,
  };

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["call-recording-history", queryParams],
    queryFn: () => callRecordingApi.getHistory(queryParams),
    placeholderData: keepPreviousData,
    retry: (count, err: any) =>
      err?.response?.status !== 403 &&
      err?.response?.status !== 401 &&
      count < 1,
  });

  const { data: userData } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => userApi.list(1, 1000),
    retry: false,
  });

  const userOptions = useMemo(
    () => [
      {
        label: t("callCentre.recordingHistory.filters.allUsers"),
        value: "all",
      },
      ...(userData?.data?.map((user: any) => ({
        label:
          [user.first_name, user.last_name].filter(Boolean).join(" ") ||
          user.username,
        value: user.id,
      })) ?? []),
    ],
    [userData, t],
  );

  const activityOptions = [
    {
      label: t("callCentre.recordingHistory.filters.allActivity"),
      value: "all",
    },
    {
      label: t("callCentre.recordingHistory.activity.listened"),
      value: "listened",
    },
    {
      label: t("callCentre.recordingHistory.activity.downloaded"),
      value: "downloaded",
    },
  ];

  const entries = data?.data ?? [];
  const totalItems = data?.total_items ?? 0;
  const totalPages = data?.total_pages ?? 0;
  const counts = data?.counts;
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalItems);
  const status = (error as any)?.response?.status;
  const isForbidden = status === 403;

  // If filters shrink the result set below the current page, step back.
  useEffect(() => {
    if (data && totalPages > 0 && page > totalPages) {
      updateParams({ page: String(totalPages) }, { resetPage: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, totalPages, page]);

  const locale = i18n.language;
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

  const tabs: { key: ActivityFilter; label: string; count?: number }[] = [
    {
      key: "all",
      label: t("callCentre.recordingHistory.tabs.all"),
      count: counts?.all,
    },
    {
      key: "listened",
      label: t("callCentre.recordingHistory.tabs.listened"),
      count: counts?.listened,
    },
    {
      key: "downloaded",
      label: t("callCentre.recordingHistory.tabs.downloaded"),
      count: counts?.downloaded,
    },
  ];

  const setActivity = (value: string) =>
    updateParams({ activity: value === "all" || !value ? null : value });

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      updateParams({
        range: null,
        from: format(range.from, DATE_PARAM_FORMAT),
        to: format(range.to, DATE_PARAM_FORMAT),
      });
    } else {
      updateParams({ range: ALL_TIME, from: null, to: null });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {t("callCentre.recordingHistory.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("callCentre.recordingHistory.subtitle")}
        </p>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label={t("callCentre.recordingHistory.title")}
        className="flex items-end gap-2 border-b border-border overflow-x-auto"
      >
        {tabs.map((tab) => {
          const active = activity === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active}
              onClick={() => setActivity(tab.key)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "min-w-[2rem] px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums",
                  active
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {tab.count ?? "–"}
              </span>
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("callCentre.recordingHistory.filters.search")}
            aria-label={t("callCentre.recordingHistory.filters.search")}
            className="w-full h-[42px] ps-10 pe-3 rounded-lg border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div className="w-full lg:w-48">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            {t("callCentre.recordingHistory.filters.activity")}
          </span>
          <Select
            options={activityOptions}
            value={activity}
            onChange={setActivity}
          />
        </div>
        <div className="w-full lg:w-56">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            {t("callCentre.recordingHistory.filters.user")}
          </span>
          <Select
            searchable
            clearable
            options={userOptions}
            value={userId}
            onChange={(v) =>
              updateParams({ user_id: v && v !== "all" ? v : null })
            }
          />
        </div>
        <div className="w-full lg:w-auto">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            {t("callCentre.recordingHistory.filters.dateRange")}
          </span>
          <DatePickerWithRange
            value={dateRange}
            onChange={handleDateRangeChange}
          />
        </div>
      </div>

      {/* Active call filter chip */}
      {callLogId && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 ps-3 pe-1 py-1 rounded-full bg-primary/10 text-primary text-sm">
            <Filter className="w-3.5 h-3.5" />
            <span>
              {t("callCentre.recordingHistory.filteredByCall")}{" "}
              <span className="font-mono" dir="ltr">
                {callUuidLabel || entries[0]?.call_uuid || callLogId}
              </span>
            </span>
            <button
              onClick={() =>
                updateParams({ call_log_id: null, call_uuid: null })
              }
              className="p-1 rounded-full hover:bg-primary/20"
              title={t("callCentre.recordingHistory.clearFilter")}
              aria-label={t("callCentre.recordingHistory.clearFilter")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      )}

      {/* Table card */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{t("common.loading")}</p>
          </div>
        ) : isForbidden ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {t("users.accessDenied")}
            </h3>
            <p className="text-muted-foreground">
              {t("users.contactYourAdministratorForAccess")}
            </p>
          </div>
        ) : error && !data ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              {(error as any)?.response?.data?.error ||
                t("callCentre.recordingHistory.loadError")}
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
            >
              <RefreshCw
                className={cn("w-4 h-4", isFetching && "animate-spin")}
              />
              {t("callCentre.recordingHistory.retry")}
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t("callCentre.recordingHistory.empty")}
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "overflow-x-auto transition-opacity",
              isFetching && "opacity-60",
            )}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 text-start">
                    {t("callCentre.recordingHistory.columns.dateTime")}
                  </th>
                  <th className="px-5 py-3 text-start">
                    {t("callCentre.recordingHistory.columns.callId")}
                  </th>
                  <th className="px-5 py-3 text-start">
                    {t("callCentre.recordingHistory.columns.incident")}
                  </th>
                  <th className="px-5 py-3 text-start">
                    {t("callCentre.recordingHistory.columns.activity")}
                  </th>
                  <th className="px-5 py-3 text-start">
                    {t("callCentre.recordingHistory.columns.user")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <HistoryRow
                    key={entry.id}
                    entry={entry}
                    formatDate={formatDate}
                    formatTime={formatTime}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!isLoading && !isForbidden && entries.length > 0 && (
          <div className="px-5 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {t("callCentre.recordingHistory.showing", {
                from: rangeStart,
                to: rangeEnd,
                total: totalItems,
              })}
            </p>
            <div>
              <AppPagination
                page={page}
                totalPages={totalPages}
                onPageChange={(p) =>
                  updateParams(
                    { page: p > 1 ? String(p) : null },
                    { resetPage: false },
                  )
                }
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("callCentre.recordingHistory.newestFirst")}
            </p>
          </div>
        )}
      </div>

      {/* Lock note */}
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="w-4 h-4 shrink-0" />
        {t("callCentre.recordingHistory.lockNote")}
      </p>
    </div>
  );
};

const HistoryRow: React.FC<{
  entry: CallRecordingHistoryEntry;
  formatDate: (iso: string) => string;
  formatTime: (iso: string) => string;
}> = ({ entry, formatDate, formatTime }) => {
  const { t } = useTranslation();
  const isListened = entry.activity === "listened";
  const displayName = entry.user_name || entry.username || "—";

  return (
    <tr className="hover:bg-muted/40 transition-colors">
      <td className="px-5 py-4 whitespace-nowrap">
        <div className="font-medium">{formatDate(entry.created_at)}</div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {formatTime(entry.created_at)}
        </div>
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        <span className="font-mono" dir="ltr">
          {entry.call_uuid || "-"}
        </span>
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        {entry.incident_id && entry.incident_number ? (
          <Link
            to={`/incidents/${entry.incident_id}`}
            className="text-blue-600 dark:text-blue-400 hover:underline"
            dir="ltr"
          >
            {entry.incident_number}
          </Link>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
            isListened
              ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
          )}
        >
          {isListened ? (
            <Play className="w-3.5 h-3.5" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {isListened
            ? t("callCentre.recordingHistory.activity.listened")
            : t("callCentre.recordingHistory.activity.downloaded")}
        </span>
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3" title={entry.username}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center text-sm font-semibold shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium">{displayName}</span>
          {entry.user_role && (
            <span className="text-muted-foreground">{entry.user_role}</span>
          )}
        </div>
      </td>
    </tr>
  );
};

export default CallRecordingHistoryPage;
