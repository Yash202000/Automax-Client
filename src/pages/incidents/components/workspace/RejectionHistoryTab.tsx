import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  Clock,
  RefreshCw,
  TriangleAlert,
  User,
  XCircle,
} from "lucide-react";
import { cn, getLocalizedName } from "@/lib/utils";
import { rejectionLogApi } from "../../../../api/admin";
import type {
  IncidentRejectionLog,
  TransitionHistory,
} from "../../../../types";

function rejectionDateTime(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
  // Timestamp style: "Sep 02, 2026, 04:15 PM".
  return `${date}, ${time.replace(/^0/, "")}`;
}

/* Rejection History tab — same /incidents/{id}/rejection-logs data as
   IncidentDetailPage: log header with stage filter, one card per
   rejection with actor/reason/remarks, newest first. */
export function RejectionHistoryTab({
  incidentId,
  transitionHistory,
}: {
  incidentId: string;
  transitionHistory: TransitionHistory[];
}) {
  const { t } = useTranslation();
  const [stageFilter, setStageFilter] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["incidents", "v2-list", "rejection-logs", incidentId],
    queryFn: () => rejectionLogApi.getByIncident(incidentId),
    enabled: !!incidentId,
    staleTime: 60_000,
    retry: false,
  });

  const logs = useMemo(() => {
    const rows = [...(data?.data ?? [])];
    rows.sort(
      (a, b) =>
        new Date(b.rejected_at).getTime() - new Date(a.rejected_at).getTime(),
    );
    return rows;
  }, [data]);

  const stages = useMemo(() => {
    const seen = new Map<string, string>();
    for (const log of logs) {
      const id = log.from_state?.id ?? log.from_state?.name ?? "";
      if (id && !seen.has(id)) {
        seen.set(id, getLocalizedName(log.from_state) || id);
      }
    }
    return [...seen.entries()];
  }, [logs]);

  const visible =
    stageFilter == null
      ? logs
      : logs.filter(
          (log) =>
            (log.from_state?.id ?? log.from_state?.name ?? "") === stageFilter,
        );

  const entryFor = (log: IncidentRejectionLog) =>
    transitionHistory.find((h) => h.id === log.transition_history_id);

  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[hsl(var(--foreground))]">
              {t("incidents.rejectionLog")}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] font-mono font-medium">
              {t("incidents.rejectionsCount", { count: logs.length })}
            </span>
          </div>
          <div className="h-4 w-px bg-[hsl(var(--muted))]" />
          <div className="relative">
            <select
              value={stageFilter ?? ""}
              onChange={(e) => setStageFilter(e.target.value || null)}
              className="appearance-none bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] hover:border-[hsl(var(--border))] rounded-lg ps-3 pe-7 py-1 text-xs text-[hsl(var(--foreground))] shadow-sm transition-all focus:outline-none cursor-pointer"
              aria-label={t("incidents.allStages")}
            >
              <option value="">{t("incidents.allStages")}</option>
              {stages.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute end-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.6)] transition-colors text-xs disabled:opacity-60"
          >
            <RefreshCw
              className={cn("h-3 w-3", isFetching && "animate-spin")}
            />
            {t("incidents.refresh")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 flex items-center justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[hsl(var(--border))] border-t-transparent" />
          {t("incidents.updating")}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-[hsl(var(--muted-foreground))]">
          <XCircle className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-xs">{t("incidents.noRejectionRecords")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((log, index) => {
            const latest = index === 0;
            const entry = entryFor(log);
            const stageName = entry?.transition
              ? getLocalizedName(entry.transition)
              : "";
            const rejectedByName =
              [log.rejected_by?.first_name, log.rejected_by?.last_name]
                .filter(Boolean)
                .join(" ") ||
              log.rejected_by_username ||
              "—";
            const roles = (log.rejected_by_roles_snapshot ?? []).join(", ");
            const deptName =
              getLocalizedName(log.rejected_by?.department) ||
              getLocalizedName(log.rejected_by?.departments?.[0]) ||
              "";
            return (
              <div
                key={log.id}
                className={cn(
                  "p-4 rounded-xl bg-[hsl(var(--card)/0.9)] border transition-colors group space-y-3",
                  latest
                    ? "border-rose-500/30 hover:border-rose-500/50"
                    : "border-[hsl(var(--border))] hover:border-[hsl(var(--border))]",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold shrink-0",
                        latest
                          ? "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300"
                          : "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400",
                      )}
                    >
                      <XCircle className="h-3 w-3" />
                      {t("incidents.rejections")}
                    </span>
                    <span className="text-xs font-semibold text-[hsl(var(--foreground))]">
                      {getLocalizedName(log.from_state) || "—"} →{" "}
                      {getLocalizedName(log.to_state) || "—"}
                    </span>
                    {stageName ? (
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono">
                        • {stageName}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] font-mono shrink-0">
                    <Clock className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                    <span>{rejectionDateTime(log.rejected_at)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 p-2.5 bg-[hsl(var(--muted)/0.6)] rounded-lg border border-[hsl(var(--border))] text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-cyan-700 dark:text-cyan-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t("incidents.rejectedBy")}
                      </div>
                      <div
                        className="font-medium text-[hsl(var(--foreground))] truncate"
                        title={rejectedByName}
                      >
                        {rejectedByName}{" "}
                        {roles || deptName ? (
                          <span className="text-[hsl(var(--muted-foreground))] text-[11px]">
                            ({[roles, deptName].filter(Boolean).join(", ")})
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center shrink-0">
                      <TriangleAlert
                        className={cn(
                          "h-3.5 w-3.5",
                          latest
                            ? "text-rose-700 dark:text-rose-400"
                            : "text-amber-700 dark:text-amber-400",
                        )}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t("incidents.reasonCategory")}
                      </div>
                      <div
                        className={cn(
                          "font-medium truncate",
                          latest
                            ? "text-rose-700 dark:text-rose-300"
                            : "text-amber-700 dark:text-amber-300",
                        )}
                        title={log.rejection_reason || undefined}
                      >
                        {log.rejection_reason || "—"}
                      </div>
                    </div>
                  </div>
                </div>
                {entry?.comment || log.rejection_reason ? (
                  <div className="text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-lg p-3 leading-relaxed">
                    <span className="font-semibold block mb-1 text-[11px] uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      {t("incidents.remarksFeedback")}
                    </span>
                    {entry?.comment || log.rejection_reason}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
