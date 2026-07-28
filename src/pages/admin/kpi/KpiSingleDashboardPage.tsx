import React from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
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
  ShieldAlert,
} from "lucide-react";
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
import { useKpiSingleDashboard } from "../../../hooks/useKpi";
import {
  getBandColor,
  BAND_BAR_CLASS,
  BAND_TEXT_CLASS,
} from "../../../utils/kpiBand";
import type { KpiAnnualRollupRow } from "../../../types/kpi";

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
  const { type, id } = useParams<{ type: string; id: string }>();

  const {
    data: dashboard,
    isLoading,
    error,
  } = useKpiSingleDashboard(type ?? "", id ?? "");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
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

  const {
    card,
    annual_rollup,
    trend_description,
    justification,
    corrective_action,
    benchmarks,
  } = dashboard;
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
                        className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50"
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

      {/* Trend / Justification / Corrective Action narrative */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700/60">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-400" />
            {t("kpi.dashboard.narrative", "Narrative")}
          </h2>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {t("kpi.performance.detail.trend", "Trend Description")}
            </label>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {trend_description || "-"}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {t("kpi.performance.detail.justification", "Justification")}
            </label>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {justification || "-"}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              {t(
                "kpi.performance.detail.correctiveAction",
                "Corrective Action Proposal",
              )}
            </label>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {corrective_action || "-"}
            </p>
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
