import React, { useState, useRef, useCallback, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Target,
  Download,
  FileSpreadsheet,
  FileText,
  LayoutTemplate,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { useGoals, useBulkAction } from "../../hooks/useGoals";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";
import { GoalStatusBadge } from "../../components/goals/GoalStatusBadge";
import { GoalPriorityBadge } from "../../components/goals/GoalPriorityBadge";
import { GoalProgressBar } from "../../components/goals/GoalProgressBar";
import { GoalFilters } from "../../components/goals/GoalFilters";
import { GoalImportModal } from "../../components/goals/GoalImportModal";
import { MetricImportModal } from "../../components/goals/MetricImportModal";
import { BulkActionsBar } from "../../components/goals/BulkActionsBar";
import { BulkTransitionModal } from "../../components/goals/BulkTransitionModal";
import { BulkReassignModal } from "../../components/goals/BulkReassignModal";
import { goalApi } from "../../api/goals";
import { exportGoalsToXlsx } from "../../utils/goalExport";
import type { GoalFilter, Goal } from "../../types/goal";
import { useGoalListWebSocket } from "../../lib/services/goalListWebSocket";

function ExportDropdown({ filters }: { filters: GoalFilter }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleCSV = async () => {
    setOpen(false);
    try {
      const blob = await goalApi.exportCSV(filters);
      saveAs(blob, `goals_export_${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(t("goals.csvExported"));
    } catch {
      toast.error(t("goals.csvExportFailed"));
    }
  };

  const handleXLSX = async () => {
    setOpen(false);
    try {
      const res = await goalApi.exportJSON(filters);
      exportGoalsToXlsx(res.data);
      toast.success(t("goals.excelExported"));
    } catch {
      toast.error(t("goals.excelExportFailed"));
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
      >
        <Download className="w-4 h-4" />
        {t("goals.export")}
      </button>
      {open && (
        <div className="absolute end-0 mt-1 w-44 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 z-50">
          <button
            onClick={handleCSV}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700 rounded-t-lg"
          >
            <FileText className="w-4 h-4" />
            CSV (.csv)
          </button>
          <button
            onClick={handleXLSX}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700 rounded-b-lg"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel (.xlsx)
          </button>
        </div>
      )}
    </div>
  );
}

export const GoalsPage: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const location = useLocation();
  // "My Goals" route reuses this page with a scope=mine filter; the backend
  // intersects to goals the caller owns or collaborates on. Treat `scope` as
  // derived from the URL — NOT owned by filter state — so that
  // GoalFilters.clearFilters() (which emits a fresh object without scope) or
  // any other wholesale filter replacement can't accidentally strip it.
  const isMyGoals = location.pathname.startsWith("/goals/mine");
  useGoalListWebSocket();
  const [filters, setFilters] = useState<GoalFilter>({
    page: 1,
    limit: 10,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMetricImportModal, setShowMetricImportModal] = useState(false);
  const [showBulkTransition, setShowBulkTransition] = useState(false);
  const [showBulkReassign, setShowBulkReassign] = useState(false);

  // Merge route-derived scope onto the user-controlled filter state before
  // issuing the query or export. filters (state) + scope (URL) = effective
  // request.
  const effectiveFilters = useMemo<GoalFilter>(
    () => (isMyGoals ? { ...filters, scope: "mine" } : filters),
    [filters, isMyGoals],
  );

  const { data, isLoading, error } = useGoals(effectiveFilters);
  const bulkAction = useBulkAction();

  const goals = data?.data ?? [];
  const total = data?.total ?? 0;
  const currentPage = filters.page ?? 1;
  const limit = filters.limit ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const canCreate = hasPermission(PERMISSIONS.GOALS_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.GOALS_UPDATE);

  const selectedGoals = goals.filter((g: Goal) => selectedIds.has(g.id));

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === goals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(goals.map((g: Goal) => g.id)));
    }
  }, [goals, selectedIds.size]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkClose = () => {
    bulkAction.mutate(
      {
        goal_ids: [...selectedIds],
        action: "close",
      },
      {
        onSuccess: () => clearSelection(),
      },
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getOwnerName = (goal: Goal): string => {
    if (goal.owner) {
      return `${goal.owner.first_name} ${goal.owner.last_name}`.trim();
    }
    return goal.owner_id ? goal.owner_id.slice(0, 8) + "..." : "-";
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="rounded-xl border border-red-300 dark:border-red-700/60 bg-red-50 dark:bg-red-900/20 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                {t("goals.failedToLoad")}
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                {error instanceof Error
                  ? error.message
                  : t("goals.unexpectedError")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {isMyGoals ? t("goals.myGoalsTitle") : t("goals.title")}
              </h1>
              {!isLoading && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums bg-blue-500/10 text-blue-700 dark:text-blue-300">
                  {total}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isMyGoals ? t("goals.myGoalsSubtitle") : t("goals.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/goals/templates"
            className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <LayoutTemplate className="w-4 h-4" />
            {t("goals.templates.title")}
          </Link>
          {canCreate && (
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              {t("goals.import")}
            </button>
          )}
          <button
            onClick={() => setShowMetricImportModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t("goals.metricImport.title")}
          </button>
          <ExportDropdown filters={effectiveFilters} />
          {canCreate && (
            <Link
              to="/goals/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t("goals.newGoal")}
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <GoalFilters filters={filters} onChange={setFilters} />

      {/* Table Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Target className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t("goals.empty")}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
              {t("goals.emptyHint")}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    {canUpdate && (
                      <th className="px-3 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={
                            goals.length > 0 &&
                            selectedIds.size === goals.length
                          }
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                    )}
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("goals.table.title")}
                    </th>
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("goals.table.priority")}
                    </th>
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("goals.table.status")}
                    </th>
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("goals.table.progress")}
                    </th>
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("goals.table.owner")}
                    </th>
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("goals.table.targetDate")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {goals.map((goal: Goal) => (
                    <tr
                      key={goal.id}
                      className={`border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        selectedIds.has(goal.id)
                          ? "bg-blue-50/50 dark:bg-blue-900/10"
                          : ""
                      }`}
                    >
                      {canUpdate && (
                        <td className="px-3 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(goal.id)}
                            onChange={() => toggleSelect(goal.id)}
                            className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <Link
                          to={`/goals/${goal.id}`}
                          className="text-sm font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {goal.title}
                        </Link>
                        {goal.category && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {goal.category}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <GoalPriorityBadge priority={goal.priority} />
                      </td>
                      <td className="px-6 py-4">
                        <GoalStatusBadge status={goal.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-32">
                          <GoalProgressBar progress={goal.progress} size="sm" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {getOwnerName(goal)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {formatDate(goal.target_date)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("goals.pageOf", { current: currentPage, total: totalPages })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: Math.max(1, (prev.page ?? 1) - 1),
                    }))
                  }
                  disabled={currentPage <= 1}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 rtl:-rotate-180" />
                  {t("common.previous")}
                </button>
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: Math.min(totalPages, (prev.page ?? 1) + 1),
                    }))
                  }
                  disabled={currentPage >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t("common.next")}
                  <ChevronRight className="w-4 h-4 rtl:-rotate-180" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && canUpdate && (
        <BulkActionsBar
          selectedCount={selectedIds.size}
          selectedGoals={selectedGoals}
          onClear={clearSelection}
          onTransition={() => setShowBulkTransition(true)}
          onReassign={() => setShowBulkReassign(true)}
          onClose={handleBulkClose}
        />
      )}

      {/* Modals */}
      {showImportModal && (
        <GoalImportModal onClose={() => setShowImportModal(false)} />
      )}
      {showMetricImportModal && (
        <MetricImportModal onClose={() => setShowMetricImportModal(false)} />
      )}
      {showBulkTransition && (
        <BulkTransitionModal
          selectedGoals={selectedGoals}
          onClose={() => {
            setShowBulkTransition(false);
            clearSelection();
          }}
          onComplete={clearSelection}
        />
      )}
      {showBulkReassign && (
        <BulkReassignModal
          selectedGoals={selectedGoals}
          onClose={() => {
            setShowBulkReassign(false);
            clearSelection();
          }}
          onComplete={clearSelection}
        />
      )}
    </div>
  );
};
