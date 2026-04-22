import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FileSpreadsheet,
  Plus,
  Loader2,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useMetricImportBatches } from "../../hooks/useGoals";
import { MetricImportModal } from "../../components/goals/MetricImportModal";
import type { MetricImportBatchFilter } from "../../types/goal";
import { useGoalListWebSocket } from "../../lib/services/goalListWebSocket";

// ── Status badge color map ────────────────────────────
const statusBadgeClasses: Record<string, string> = {
  Draft:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600",
  Submitted:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  In_Review:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  Approved:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
  Rejected:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
  Changes_Requested:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
};

const getStatusBadgeClass = (status: string): string =>
  statusBadgeClasses[status] ??
  "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600";

// ── Helpers ───────────────────────────────────────────
const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// ── Main Component ────────────────────────────────────
export const MetricImportBatchesPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  useGoalListWebSocket();

  // ── Status filter options (localized) ─────────────
  const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: "", label: t("goals.metricImport.statusAll") },
    { value: "Draft", label: t("goals.metricImport.statusDraft") },
    { value: "Submitted", label: t("goals.metricImport.statusSubmitted") },
    { value: "In_Review", label: t("goals.metricImport.statusInReview") },
    { value: "Approved", label: t("goals.metricImport.statusApproved") },
    { value: "Rejected", label: t("goals.metricImport.statusRejected") },
    {
      value: "Changes_Requested",
      label: t("goals.metricImport.statusChangesRequested"),
    },
  ];

  const formatStatusLabel = (status: string): string => {
    const opt = STATUS_OPTIONS.find((o) => o.value === status);
    return opt ? opt.label : status.replace(/_/g, " ");
  };

  const getUserName = (user?: {
    first_name: string;
    last_name: string;
  }): string =>
    user
      ? `${user.first_name} ${user.last_name}`.trim() ||
        t("goals.metricImport.unknown")
      : "—";

  // ── State ─────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);

  const limit = 10;

  // ── Query ─────────────────────────────────────────
  const filter: MetricImportBatchFilter = {
    page,
    limit,
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const { data, isLoading } = useMetricImportBatches(filter);

  // ── Derived ───────────────────────────────────────
  const batches = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // ── Render ────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            {t("goals.metricImport.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("goals.metricImport.subtitle")}
          </p>
        </div>
        <button
          onClick={() => setImportModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("goals.metricImport.newImport")}
        </button>
      </div>

      {/* ── Status Filter Tabs ──────────────────── */}
      <div className="border-b border-slate-200 dark:border-slate-700/60">
        <nav
          className="flex gap-1 -mb-px"
          aria-label={t("goals.metricImport.statusFilter")}
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setStatusFilter(opt.value);
                setPage(1);
              }}
              className={`inline-flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                statusFilter === opt.value
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Content ─────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : batches.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-12 text-center">
          <Inbox className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {statusFilter
              ? t("goals.metricImport.emptyWithFilter", {
                  status: formatStatusLabel(statusFilter),
                })
              : t("goals.metricImport.empty")}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-700/50">
                  <th className="ltr:text-left rtl:text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("goals.metricImport.table.title")}
                  </th>
                  <th className="ltr:text-left rtl:text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("goals.metricImport.table.status")}
                  </th>
                  <th className="ltr:text-left rtl:text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("goals.metricImport.table.items")}
                  </th>
                  <th className="ltr:text-left rtl:text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("goals.metricImport.table.goals")}
                  </th>
                  <th className="ltr:text-left rtl:text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("goals.metricImport.table.importedBy")}
                  </th>
                  <th className="ltr:text-left rtl:text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("goals.metricImport.table.assignedTo")}
                  </th>
                  <th className="ltr:text-left rtl:text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("goals.metricImport.table.created")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr
                    key={batch.id}
                    onClick={() =>
                      navigate(`/goals/metric-batches/${batch.id}`)
                    }
                    className="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {batch.title}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(batch.status)}`}
                      >
                        {formatStatusLabel(batch.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                        {batch.item_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                        {batch.goal_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {getUserName(batch.imported_by)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {getUserName(batch.assigned_to)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatDate(batch.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ──────────────────────── */}
          {totalPages > 1 && (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700/60">
                <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                  {t("goals.metricImport.showing", {
                    from: (page - 1) * limit + 1,
                    to: Math.min(page * limit, total),
                    total,
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 rtl:-rotate-180" />
                    {t("goals.metricImport.previous")}
                  </button>
                  <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums px-2">
                    {t("goals.metricImport.pageOf", {
                      current: page,
                      total: totalPages,
                    })}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("goals.metricImport.next")}
                    <ChevronRight className="w-4 h-4 rtl:-rotate-180" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Import Modal ────────────────────────── */}
      {importModalOpen && (
        <MetricImportModal
          onClose={() => setImportModalOpen(false)}
        />
      )}
    </div>
  );
};

export default MetricImportBatchesPage;
