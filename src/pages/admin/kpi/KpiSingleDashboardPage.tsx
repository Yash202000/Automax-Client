import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  LayoutDashboard,
  Target,
  Building2,
  Layers,
  ClipboardCheck,
  TrendingUp,
  HelpCircle,
  BarChart3,
  FileText,
  Save,
} from "lucide-react";
import { kpiComposedApi } from "../../../api/kpi";
import { usePermissions } from "../../../hooks/usePermissions";
import type { KPIType } from "../../../types/kpi";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  useKpiSingleDashboard,
  useKpiMetrics,
  useKpiMetricPeriodSeries,
  useKpiEntries,
  useKpiCardDefinitions,
  useKpiAccess,
} from "../../../hooks/useKpi";
import {
  getBandColor,
  BAND_BAR_CLASS,
  BAND_TEXT_CLASS,
} from "../../../utils/kpiBand";
import {
  DASHBOARD_PERIOD_OPTIONS,
  getYearOptions,
  periodMatchesFilter,
} from "../../../types/kpi";
import type { KpiAnnualRollupRow } from "../../../types/kpi";
import { KpiNoAccess } from "../../../components/kpi/KpiNoAccess";
import { isKpiAccessDenied } from "../../../utils/kpiAccess";

const typeColorMap: Record<string, string> = {
  strategic: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  operational:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  award:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

function formatValue(v: number | null): string {
  if (v === null || v === undefined) return "-";
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export const KpiSingleDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { type, id } = useParams<{ type: string; id: string }>();
  const { data: kpiOptions } = useKpiCardDefinitions();

  const {
    data: dashboard,
    isLoading,
    error,
  } = useKpiSingleDashboard(type ?? "", id ?? "");

  const { data: metrics } = useKpiMetrics(type ?? "", id ?? "");
  const [selectedMetricId, setSelectedMetricId] = useState<string>("");
  const [seriesYear, setSeriesYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [drillDownPeriod, setDrillDownPeriod] = useState<string | null>(null);
  // Period filter: "q1".."q4" or "m1".."m12" (see DASHBOARD_PERIOD_OPTIONS);
  // narrows the period trend to the periods overlapping it.
  const [periodFilter, setPeriodFilter] = useState("");

  // A metric picked on another KPI isn't in this KPI's list; fall back to
  // the first metric then.
  const activeMetricId =
    (metrics ?? []).find((m) => m.id === selectedMetricId)?.id ||
    metrics?.[0]?.id ||
    "";
  const { data: periodSeries } = useKpiMetricPeriodSeries(
    type ?? "",
    id ?? "",
    activeMetricId,
    seriesYear,
  );

  const { data: allEntriesForMetric } = useKpiEntries(
    type ?? "",
    id ?? "",
    activeMetricId,
  );
  const seriesPoints = useMemo(
    () =>
      (periodSeries?.points ?? []).filter((p) =>
        periodMatchesFilter(p.period_code, periodFilter),
      ),
    [periodSeries, periodFilter],
  );

  const drillDownEntries = useMemo(() => {
    if (!drillDownPeriod) return [];
    return (allEntriesForMetric ?? []).filter(
      (e) =>
        e.period_code === drillDownPeriod &&
        e.reporting_year === seriesYear &&
        e.status === "approved",
    );
  }, [allEntriesForMetric, drillDownPeriod, seriesYear]);

  // Narrative fields — hooks must be before early returns
  const { hasPermission } = usePermissions();
  const kpiAccess = useKpiAccess();
  const canEditNarrative =
    hasPermission("perf:submit") &&
    kpiAccess.can(type ?? "", id ?? "", "create_entry");
  const queryClient = useQueryClient();

  const [curveDescription, setCurveDescription] = useState(
    dashboard?.curve_description ?? "",
  );
  const [shortcomingsDescription, setShortcomingsDescription] = useState(
    dashboard?.shortcomings_description ?? "",
  );
  const [proposedImprovement, setProposedImprovement] = useState(
    dashboard?.proposed_improvement ?? "",
  );

  useEffect(() => {
    if (dashboard) {
      setCurveDescription(dashboard.curve_description ?? "");
      setShortcomingsDescription(dashboard.shortcomings_description ?? "");
      setProposedImprovement(dashboard.proposed_improvement ?? "");
    }
  }, [dashboard]);

  const narrativeDirty =
    !!dashboard &&
    (curveDescription !== (dashboard.curve_description ?? "") ||
      shortcomingsDescription !== (dashboard.shortcomings_description ?? "") ||
      proposedImprovement !== (dashboard.proposed_improvement ?? ""));

  const saveNarrative = useMutation({
    mutationFn: () =>
      kpiComposedApi.updateNarrative(type as KPIType, id!, {
        curve_description: curveDescription,
        shortcomings_description: shortcomingsDescription,
        proposed_improvement: proposedImprovement,
      }),
    onSuccess: () => {
      toast.success(t("common.success", "Saved"));
      queryClient.invalidateQueries({
        queryKey: ["kpi", "single-dashboard", type, id],
      });
    },
    onError: () => {
      toast.error(t("common.failed", "Failed to save"));
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isKpiAccessDenied(error)) {
    return <KpiNoAccess />;
  }

  if (error || !dashboard) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
          <AlertCircle className="w-12 h-12 mb-4 text-red-400" />
          <p className="text-lg font-medium">
            {t("kpi.dictionary.notFound", "KPI not found")}
          </p>
          <Link
            to="/goals/kpi/dictionary"
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {t("kpi.dictionary.backToDictionary", "Back to Dictionary")}
          </Link>
        </div>
      </div>
    );
  }

  const { card, annual_rollup, benchmarks } = dashboard;
  const bands = card.bands;

  const chartData = (annual_rollup ?? []).map((row: KpiAnnualRollupRow) => ({
    year: String(row.year),
    target: row.target ?? undefined,
    actual: row.actual ?? undefined,
    achievement: row.achievement_pct ?? undefined,
  }));

  const infoTiles: {
    icon: React.ReactNode;
    bg: string;
    label: string;
    value: string;
  }[] = [
    {
      icon: (
        <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
      ),
      bg: "bg-purple-50 dark:bg-purple-900/20",
      label: t("kpi.dictionary.fieldOwner", "Owner"),
      value: card.owner_label || "-",
    },
    {
      icon: <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      bg: "bg-blue-50 dark:bg-blue-900/20",
      label: t("kpi.masterData.strategicGoal", "Strategic Goal"),
      value: card.strategic_goal_label || "-",
    },
    {
      icon: (
        <ClipboardCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
      ),
      bg: "bg-amber-50 dark:bg-amber-900/20",
      label: t("kpi.dictionary.fieldCriterion", "Related Criterion"),
      value: card.criterion_label || "-",
    },
    {
      icon: <Layers className="w-5 h-5 text-green-600 dark:text-green-400" />,
      bg: "bg-green-50 dark:bg-green-900/20",
      label: t("kpi.masterData.pillar", "Pillar / Enabler"),
      value: card.pillar_enabler_label || "-",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Link */}
      <Link
        to={`/goals/kpi/dictionary/${type}/${id}`}
        className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 rtl:-rotate-180" />
        {t("kpi.dictionary.backToKpi", "Back to KPI")}
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
              <LayoutDashboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {card.code} - {card.name_en}
                </h1>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeColorMap[card.type] ?? ""}`}
                >
                  {t(`kpi.dictionary.${card.type}`, card.type)}
                </span>
              </div>
              {card.name_ar && (
                <p
                  dir="rtl"
                  className="text-sm text-slate-600 dark:text-slate-300 mb-1"
                >
                  {card.name_ar}
                </p>
              )}
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("kpi.dashboard.singleSubtitle", "KPI Performance Dashboard")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700/60">
          {infoTiles.map((tile, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${tile.bg}`}
              >
                {tile.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tile.label}
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {tile.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters — KPI, Metric, Year and Period */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label={t("kpi.dashboard.kpi", "KPI")}
          value={`${type}:${id}`}
          onChange={(e) => {
            const [nextType, nextId] = e.target.value.split(":");
            setSelectedMetricId("");
            setDrillDownPeriod(null);
            navigate(`/goals/kpi/dictionary/${nextType}/${nextId}/dashboard`);
          }}
          className="max-w-[20rem] text-sm rounded-lg border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300"
        >
          {!(kpiOptions ?? []).some((k) => k.id === id) && (
            <option value={`${type}:${id}`}>
              {card.code} — {card.name_en}
            </option>
          )}
          {(kpiOptions ?? []).map((k) => (
            <option key={`${k.type}:${k.id}`} value={`${k.type}:${k.id}`}>
              {k.code} — {k.name_en}
            </option>
          ))}
        </select>
        <select
          aria-label={t("kpi.dashboard.metric", "Metric")}
          value={activeMetricId}
          disabled={(metrics ?? []).length === 0}
          onChange={(e) => {
            setSelectedMetricId(e.target.value);
            setDrillDownPeriod(null);
          }}
          className="max-w-[16rem] text-sm rounded-lg border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300 disabled:opacity-60"
        >
          {(metrics ?? []).length === 0 && (
            <option value="">
              {t("kpi.dashboard.noMetrics", "No metrics")}
            </option>
          )}
          {(metrics ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          aria-label={t("kpi.targets.table.year", "Year")}
          value={seriesYear}
          onChange={(e) => {
            setSeriesYear(Number(e.target.value));
            setDrillDownPeriod(null);
          }}
          className="text-sm rounded-lg border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300"
        >
          {getYearOptions().map((y) => (
            <option key={y.value} value={y.value}>
              {y.label}
            </option>
          ))}
        </select>
        <select
          aria-label={t("kpi.dashboard.period", "Period")}
          value={periodFilter}
          onChange={(e) => {
            setPeriodFilter(e.target.value);
            setDrillDownPeriod(null);
          }}
          className="text-sm rounded-lg border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300"
        >
          <option value="">
            {t("kpi.dashboard.allPeriods", "All Periods")}
          </option>
          {DASHBOARD_PERIOD_OPTIONS.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Annual Rollup Table + Legend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700/60">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              {t("kpi.dashboard.annualRollup", "Annual Performance")}
            </h2>
          </div>
          {(annual_rollup ?? []).length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">
              {t("kpi.dashboard.noRollupData", "No annual data available")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                      {t("kpi.targets.table.year", "Year")}
                    </th>
                    <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                      {t("kpi.performance.table.target", "Target")}
                    </th>
                    <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                      {t("kpi.performance.table.actual", "Actual")}
                    </th>
                    <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                      {t("kpi.performance.table.achievement", "Achievement")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {annual_rollup.map((row: KpiAnnualRollupRow) => {
                    const pct = row.achievement_pct;
                    const color =
                      pct !== null && pct !== undefined
                        ? getBandColor(pct, bands)
                        : null;
                    return (
                      <tr
                        key={row.year}
                        className={`border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                          row.year === seriesYear
                            ? "bg-blue-50/60 dark:bg-blue-900/20"
                            : ""
                        }`}
                      >
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                          <span className="inline-flex items-center gap-1.5">
                            {row.year}
                            {row.is_derived && (
                              <span
                                title={t(
                                  "kpi.dashboard.derivedTooltip",
                                  "No explicit annual entry was recorded — this figure is derived by averaging the KPI's sub-annual (monthly/quarterly) entries.",
                                )}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 cursor-help"
                              >
                                <HelpCircle className="w-2.5 h-2.5" />
                                {t("kpi.dashboard.derived", "derived")}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {formatValue(row.target)}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {formatValue(row.actual)}
                        </td>
                        <td className="px-6 py-4">
                          {pct === null || pct === undefined ? (
                            <span className="text-slate-400 text-right block">
                              -
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <div className="flex-1 max-w-[90px] h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                                <div
                                  className={`h-2 rounded-full ${BAND_BAR_CLASS[color!]}`}
                                  style={{
                                    width: `${Math.min(Math.max(pct, 0), 100)}%`,
                                  }}
                                />
                              </div>
                              <span
                                className={`text-sm font-medium tabular-nums ${BAND_TEXT_CLASS[color!]}`}
                              >
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Performance Bands Legend */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            {t("kpi.dashboard.bandsLegend", "Performance Bands")}
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/10">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                {t("kpi.dashboard.bandGreen", "Green")}
              </span>
              <span className="text-sm tabular-nums font-medium text-green-600">
                &ge; {bands.green_min}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                {t("kpi.dashboard.bandAmber", "Yellow")}
              </span>
              <span className="text-sm tabular-nums font-medium text-amber-600">
                {bands.amber_min}% &ndash; {bands.green_min}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                {t("kpi.dashboard.bandRed", "Red")}
              </span>
              <span className="text-sm tabular-nums font-medium text-red-600">
                &lt; {bands.amber_min}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Period Trend — Baseline / Target / Actual, doc Figure 1 */}
      {(metrics ?? []).length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={20} className="text-teal-500" />
              {t(
                "kpi.dashboard.metricPeriodTrend",
                "Monthly Performance — Baseline, Target & Actual",
              )}
            </h3>
          </div>

          {seriesPoints.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              {t("kpi.dashboard.noTrendData", "No trend data")}
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={seriesPoints}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  onClick={(state) => {
                    const idx = Number(state?.activeTooltipIndex);
                    if (!Number.isFinite(idx)) return;
                    const point = seriesPoints[idx];
                    if (point?.has_data) {
                      setDrillDownPeriod(
                        point.period_code === drillDownPeriod
                          ? null
                          : point.period_code,
                      );
                    }
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-slate-200 dark:stroke-slate-700"
                  />
                  <XAxis
                    dataKey="period_label"
                    tick={{ fontSize: 11 }}
                    className="text-slate-500"
                  />
                  <YAxis tick={{ fontSize: 11 }} className="text-slate-500" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0)
                        return null;
                      const p = payload[0]
                        .payload as (typeof seriesPoints)[number];
                      return (
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-xs shadow-lg space-y-1">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {p.period_label}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">
                            Baseline: {p.baseline}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">
                            Target: {p.target ?? "—"}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">
                            Actual: {p.has_data ? p.actual : "No Data"}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">
                            Achievement:{" "}
                            {p.achievement_raw != null
                              ? `${p.achievement_raw.toFixed(2)}%`
                              : "—"}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">
                            Entries: {p.entry_count}
                          </p>
                          {p.has_data && (
                            <p className="text-blue-500 dark:text-blue-400 pt-1">
                              Click to view approved entries
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="baseline"
                    name="Baseline"
                    stroke="#3b82f6"
                    strokeDasharray="2 2"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    name="Target"
                    stroke="#f59e0b"
                    strokeDasharray="6 3"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {drillDownPeriod && (
                <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700/60 p-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Approved entries for{" "}
                    {seriesPoints.find((p) => p.period_code === drillDownPeriod)
                      ?.period_label ?? drillDownPeriod}
                  </p>
                  {drillDownEntries.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      No approved entries found.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {drillDownEntries.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-slate-700/40 pb-2 last:border-0"
                        >
                          <span className="text-slate-500 dark:text-slate-400">
                            {e.source_reference || e.id}
                          </span>
                          <span className="tabular-nums text-slate-700 dark:text-slate-300">
                            {e.actual_value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Trend Chart */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-blue-500" />
          {t("kpi.dashboard.targetVsActual", "Target vs Actual / Achievement")}
        </h3>
        {chartData.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            {t("kpi.dashboard.noTrendData", "No trend data")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-slate-200 dark:stroke-slate-700"
              />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11 }}
                className="text-slate-500"
              />
              <YAxis
                yAxisId="value"
                className="text-slate-500"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                className="text-slate-500"
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name?: string | number) =>
                  name === "Achievement %"
                    ? [`${value}%`, name]
                    : [value, name ?? ""]
                }
              />
              <Legend />
              <Bar
                yAxisId="value"
                dataKey="target"
                name="Target"
                fill="#94a3b8"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="value"
                dataKey="actual"
                name="Actual"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="achievement"
                name="Achievement %"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: "#22c55e", r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Narrative — Curve / Shortcomings / Proposed Improvement */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-400" />
            {t("kpi.dashboard.narrative", "Narrative")}
          </h2>
          {canEditNarrative && narrativeDirty && (
            <button
              type="button"
              disabled={saveNarrative.isPending}
              onClick={() => saveNarrative.mutate()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saveNarrative.isPending
                ? t("common.loading", "Saving…")
                : t("common.save", "Save")}
            </button>
          )}
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Curve Description */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {t("kpi.dashboard.curveDescription", "Curve Description")}
            </label>
            {canEditNarrative ? (
              <textarea
                dir="auto"
                rows={3}
                disabled={saveNarrative.isPending}
                value={curveDescription}
                onChange={(e) => setCurveDescription(e.target.value)}
                placeholder={t(
                  "kpi.dashboard.curveDescriptionPlaceholder",
                  "Describe what the curve shows…",
                )}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p
                dir="auto"
                className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap"
              >
                {curveDescription || "-"}
              </p>
            )}
          </div>
          {/* Shortcomings & Production */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {t(
                "kpi.dashboard.shortcomingsDescription",
                "Explaining Shortcomings and Boosting Production",
              )}
            </label>
            {canEditNarrative ? (
              <textarea
                dir="auto"
                rows={3}
                disabled={saveNarrative.isPending}
                value={shortcomingsDescription}
                onChange={(e) => setShortcomingsDescription(e.target.value)}
                placeholder={t(
                  "kpi.dashboard.shortcomingsPlaceholder",
                  "Explain shortcomings and production factors…",
                )}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p
                dir="auto"
                className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap"
              >
                {shortcomingsDescription || "-"}
              </p>
            )}
          </div>
          {/* Proposed Improvement */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {t(
                "kpi.dashboard.proposedImprovement",
                "The Proposed Improvement Measure",
              )}
            </label>
            {canEditNarrative ? (
              <textarea
                dir="auto"
                rows={3}
                disabled={saveNarrative.isPending}
                value={proposedImprovement}
                onChange={(e) => setProposedImprovement(e.target.value)}
                placeholder={t(
                  "kpi.dashboard.improvementPlaceholder",
                  "Describe the proposed improvement measure…",
                )}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p
                dir="auto"
                className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap"
              >
                {proposedImprovement || "-"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Benchmark Summary */}
      {benchmarks && benchmarks.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700/60">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              {t("kpi.benchmarks.title", "Benchmarks")}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.benchmarks.entity", "Entity")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.targets.table.year", "Year")}
                  </th>
                  <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.benchmarks.internal", "Internal Achievement")}
                  </th>
                  <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.benchmarks.benchmark", "Benchmark Achievement")}
                  </th>
                  <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.benchmarks.municipality1")}
                  </th>
                  <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.benchmarks.municipality2")}
                  </th>
                  <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.benchmarks.municipality3")}
                  </th>
                  <th className="px-6 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.benchmarks.variance", "Variance")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      {b.benchmark_entity}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      {b.year}
                      {b.quarter ? ` Q${b.quarter}` : ""}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {b.internal_achievement}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {b.benchmark_achievement}
                    </td>
                    <td
                      className="px-6 py-4 text-right tabular-nums text-slate-700 dark:text-slate-300"
                      title={
                        b.municipality1_label ||
                        t("kpi.benchmarks.municipality1")
                      }
                    >
                      {b.municipality1 != null ? `${b.municipality1}%` : "-"}
                    </td>
                    <td
                      className="px-6 py-4 text-right tabular-nums text-slate-700 dark:text-slate-300"
                      title={
                        b.municipality2_label ||
                        t("kpi.benchmarks.municipality2")
                      }
                    >
                      {b.municipality2 != null ? `${b.municipality2}%` : "-"}
                    </td>
                    <td
                      className="px-6 py-4 text-right tabular-nums text-slate-700 dark:text-slate-300"
                      title={
                        b.municipality3_label ||
                        t("kpi.benchmarks.municipality3")
                      }
                    >
                      {b.municipality3 != null ? `${b.municipality3}%` : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-sm tabular-nums font-medium ${
                          b.variance >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {b.variance.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
