import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye,
  Plus,
} from "lucide-react";
import {
  useKpiPerformances,
  useEffectivePerformanceBand,
} from "../../../hooks/useKpi";
import { getBandColor, BAND_BAR_CLASS } from "../../../utils/kpiBand";
import { usePermissions } from "../../../hooks/usePermissions";
import { Button } from "../../../components/ui/Button";
import { AddPerformanceActualModal } from "../../../components/kpi/AddPerformanceActualModal";
import type { KpiPerformance, KPIPerfStatus } from "../../../types/kpi";

const AchievementBar: React.FC<{ kpiCode: string; achievementPct: number }> = ({
  kpiCode,
  achievementPct,
}) => {
  const { data: band } = useEffectivePerformanceBand(kpiCode);
  const color = getBandColor(achievementPct, band);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-2 rounded-full ${BAND_BAR_CLASS[color]}`}
          style={{ width: `${Math.min(Math.max(achievementPct, 0), 100)}%` }}
        />
      </div>
      <span className="text-sm tabular-nums font-medium text-slate-700 dark:text-slate-300">
        {achievementPct.toFixed(1)}%
      </span>
    </div>
  );
};

const statusColorMap: Record<KPIPerfStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  under_review:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  published:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export const KpiPerformancePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [showAddActual, setShowAddActual] = useState(false);
  const limit = 10;
  const { canSubmitKpiPerformance } = usePermissions();

  const params = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      status: statusFilter || undefined,
    }),
    [page, search, statusFilter],
  );

  const { data, isLoading, error } = useKpiPerformances(params);

  const perfData = data ?? { data: [], total_items: 0, page: 1, limit: 10 };
  const items = perfData.data ?? [];
  const total = perfData.total_items ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const statusFilters = [
    { value: "", label: t("common.all") },
    { value: "draft", label: t("kpi.performance.statusDraft") },
    { value: "submitted", label: t("kpi.performance.statusSubmitted") },
    { value: "under_review", label: t("kpi.performance.statusUnderReview") },
    { value: "approved", label: t("kpi.performance.statusApproved") },
    { value: "rejected", label: t("kpi.performance.statusRejected") },
    { value: "published", label: t("kpi.performance.statusPublished") },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("kpi.performance.title")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("kpi.performance.subtitle")}
            </p>
          </div>
        </div>
        {canSubmitKpiPerformance() && (
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowAddActual(true)}
          >
            {t("kpi.performance.addActual.title")}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("kpi.performance.searchPlaceholder")}
            className="ps-9 pe-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {statusFilters.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">
                {t("kpi.performance.failedToLoad")}
              </p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <TrendingUp className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t("kpi.performance.empty")}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("kpi.performance.table.kpiCode")}
                    </th>
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("kpi.performance.table.period")}
                    </th>
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("kpi.performance.table.target")}
                    </th>
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("kpi.performance.table.actual")}
                    </th>
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("kpi.performance.table.achievement")}
                    </th>
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("kpi.performance.table.status")}
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((perf: KpiPerformance) => (
                    <tr
                      key={perf.id}
                      className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-mono text-slate-900 dark:text-white">
                        {perf.kpi_code}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                        Q{perf.quarter} / {perf.year}
                      </td>
                      <td className="px-6 py-4 text-sm tabular-nums text-slate-700 dark:text-slate-300">
                        {perf.target}
                      </td>
                      <td className="px-6 py-4 text-sm tabular-nums text-slate-700 dark:text-slate-300">
                        {perf.actual ?? "-"}
                      </td>
                      <td className="px-6 py-4">
                        <AchievementBar
                          kpiCode={perf.kpi_code}
                          achievementPct={perf.achievement_pct}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            statusColorMap[perf.status as KPIPerfStatus] ??
                            statusColorMap.draft
                          }`}
                        >
                          {perf.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            navigate(`/goals/kpi/performance/${perf.id}`)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          {t("common.view")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("kpi.performance.pageOf", {
                  current: page,
                  total: totalPages,
                })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 rtl:-rotate-180" />
                  {t("common.previous")}
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
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

      <AddPerformanceActualModal
        isOpen={showAddActual}
        onClose={() => setShowAddActual(false)}
      />
    </div>
  );
};
