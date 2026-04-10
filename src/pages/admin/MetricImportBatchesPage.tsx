import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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

// ── Status filter options ─────────────────────────────
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "Draft", label: "Draft" },
  { value: "Submitted", label: "Submitted" },
  { value: "In_Review", label: "In Review" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "Changes_Requested", label: "Changes Requested" },
] as const;

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

const formatStatusLabel = (status: string): string => status.replace(/_/g, " ");

// ── Helpers ───────────────────────────────────────────
const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const getUserName = (user?: {
  first_name: string;
  last_name: string;
}): string =>
  user ? `${user.first_name} ${user.last_name}`.trim() || "Unknown" : "—";

// ── Main Component ────────────────────────────────────
export const MetricImportBatchesPage: React.FC = () => {
  const navigate = useNavigate();
  useGoalListWebSocket();

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
            Metric Imports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage bulk metric import batches
          </p>
        </div>
        <button
          onClick={() => setImportModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Import
        </button>
      </div>

      {/* ── Status Filter Tabs ──────────────────── */}
      <div className="border-b border-slate-200 dark:border-slate-700/60">
        <nav className="flex gap-1 -mb-px" aria-label="Status filter">
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
              ? `No batches with status "${formatStatusLabel(statusFilter)}".`
              : 'No metric import batches yet. Click "New Import" to get started.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Goals
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Imported By
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Created
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
                  Showing {(page - 1) * limit + 1} -{" "}
                  {Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums px-2">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
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
