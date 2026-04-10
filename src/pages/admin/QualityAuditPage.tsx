import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Bot,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Search,
  RefreshCw,
  ExternalLink,
  RotateCcw,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { aiQualityApi } from "../../api/admin";
import { cn } from "@/lib/utils";
import type { AIQualityFeedback } from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ResolutionStatus = "resolved" | "cannot_verify" | "mismatch" | string;

function getRowStyle(status: ResolutionStatus) {
  const s = status?.toLowerCase() ?? "";
  if (s === "resolved") {
    return {
      row: "bg-emerald-50/60 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
      badge:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    };
  }
  if (s.includes("mismatch") || s.includes("missing")) {
    return {
      row: "bg-red-50/60 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20",
      badge:
        "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-700",
      icon: <XCircle className="w-3.5 h-3.5" />,
    };
  }
  // cannot_verify or anything else
  return {
    row: "bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20",
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  };
}

function formatStatus(status: string) {
  if (!status) return "—";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Reopen button
// ---------------------------------------------------------------------------

function ReopenButton({ incidentId }: { incidentId: string }) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: () => aiQualityApi.reopen(incidentId),
    onSuccess: () => {
      toast.success("Incident reopened successfully");
      queryClient.invalidateQueries({ queryKey: ["ai-quality-list"] });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Failed to reopen incident";
      toast.error(msg);
    },
  });

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending || mutation.isSuccess}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
        mutation.isSuccess
          ? "bg-gray-100 text-gray-400 dark:bg-gray-800 cursor-not-allowed"
          : "bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary)/0.85)] disabled:opacity-60 disabled:cursor-not-allowed",
      )}
    >
      {mutation.isPending ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <RotateCcw className="w-3.5 h-3.5" />
      )}
      {mutation.isSuccess
        ? t("qualityAudit.reopened", "Reopened")
        : t("qualityAudit.reopen", "Reopen")}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const FILTER_OPTIONS = [
  { value: "", label: "All Results" },
  { value: "resolved", label: "Resolved" },
  { value: "cannot_verify", label: "Cannot Verify" },
  { value: "mismatch", label: "Mismatch" },
];

export default function QualityAuditPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["ai-quality-list"],
    queryFn: () => aiQualityApi.list(),
  });

  const records: AIQualityFeedback[] = data?.data ?? [];

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const term = search.toLowerCase();
      const matchesSearch =
        !term ||
        r.incident?.incident_number?.toLowerCase().includes(term) ||
        r.incident?.title?.toLowerCase().includes(term) ||
        r.changed_summary?.toLowerCase().includes(term) ||
        r.resolution_status?.toLowerCase().includes(term);

      const matchesStatus =
        !statusFilter ||
        r.resolution_status?.toLowerCase().includes(statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = records.length;
    const resolved = records.filter(
      (r) => r.resolution_status?.toLowerCase() === "resolved",
    ).length;
    const issues = total - resolved;
    return { total, resolved, issues };
  }, [records]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
            <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">
              {t("qualityAudit.title", "Quality Audit")}
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {t(
                "qualityAudit.subtitle",
                "AI-powered quality validation results",
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
          {t("common.refresh", "Refresh")}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
            Total Audited
          </p>
          <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
            {stats.total}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
            Compliant
          </p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {stats.resolved}
            </p>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
            Needs Review
          </p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {stats.issues}
            </p>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              "qualityAudit.searchPlaceholder",
              "Search by incident, summary...",
            )}
            className="w-full pl-9 pr-3 h-9 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm px-3 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        >
          {FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {(search || statusFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("");
            }}
            className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-[hsl(var(--muted-foreground))]">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading quality audit records...</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-[hsl(var(--muted-foreground))]">
            <XCircle className="w-8 h-8 mb-2 text-[hsl(var(--destructive))]" />
            <p className="text-sm">Failed to load records</p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-xs underline text-[hsl(var(--primary))]"
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[hsl(var(--muted-foreground))]">
            <Bot className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No records found</p>
            {(search || statusFilter) && (
              <p className="text-xs mt-1">Try adjusting your filters</p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)]">
                <th className="text-left px-4 py-3 font-medium text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                  Incident
                </th>
                <th className="text-left px-4 py-3 font-medium text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                  AI Result
                </th>
                <th className="text-left px-4 py-3 font-medium text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                  Change Summary
                </th>
                <th className="text-left px-4 py-3 font-medium text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Drift
                  </span>
                </th>
                <th className="text-left px-4 py-3 font-medium text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                  Processed
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {filtered.map((record) => {
                const style = getRowStyle(record.resolution_status);
                return (
                  <tr
                    key={record.id}
                    className={cn("transition-colors", style.row)}
                  >
                    {/* Incident */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/incidents/${record.incident_id}`}
                          className="font-mono text-xs font-semibold text-[hsl(var(--primary))] hover:underline flex items-center gap-1"
                        >
                          {record.incident?.incident_number ?? "—"}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 max-w-[160px] truncate">
                        {record.incident?.title ?? "—"}
                      </p>
                      {record.incident?.classification?.name && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] rounded bg-[hsl(var(--muted)/0.6)] text-[hsl(var(--muted-foreground))]">
                          {record.incident.classification.name}
                        </span>
                      )}
                    </td>

                    {/* AI Result badge */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                          style.badge,
                        )}
                      >
                        {style.icon}
                        {formatStatus(record.resolution_status)}
                      </span>
                    </td>

                    {/* Change Summary */}
                    <td className="px-4 py-3 max-w-[260px]">
                      <p className="text-xs text-[hsl(var(--foreground))] line-clamp-2 leading-relaxed">
                        {record.changed_summary || "—"}
                      </p>
                    </td>

                    {/* Coordinate Drift */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-medium text-[hsl(var(--foreground))]">
                        {record.distance_meters != null
                          ? `${Number(record.distance_meters).toFixed(1)} m`
                          : "—"}
                      </span>
                    </td>

                    {/* Current State */}
                    <td className="px-4 py-3">
                      {record.incident?.current_state?.name ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-[hsl(var(--muted)/0.6)] text-[hsl(var(--muted-foreground))]">
                          {record.incident.current_state.name}
                        </span>
                      ) : (
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          —
                        </span>
                      )}
                    </td>

                    {/* Processed At */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {new Date(record.created_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <ReopenButton incidentId={record.incident_id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer count */}
      {!isLoading && !isError && filtered.length > 0 && (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Showing {filtered.length} of {records.length} records
        </p>
      )}
    </div>
  );
}
