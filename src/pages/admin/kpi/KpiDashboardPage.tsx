import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  LayoutDashboard,
  Loader2,
  Target,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { useKpiDashboard } from "../../../hooks/useKpi";
import { Link } from "react-router-dom";

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  draft: "#f59e0b",
  inactive: "#94a3b8",
};

export const KpiDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [kpiTypeFilter, setKpiTypeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [quarterFilter, setQuarterFilter] = useState("");
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const dashboardParams = useMemo(
    () => ({
      kpi_type: kpiTypeFilter || undefined,
      year: yearFilter ? Number(yearFilter) : undefined,
      quarter: quarterFilter ? Number(quarterFilter) : undefined,
    }),
    [kpiTypeFilter, yearFilter, quarterFilter],
  );

  const { data: dashboard, isLoading } = useKpiDashboard(dashboardParams);

  const cards = [
    {
      key: "strategic",
      icon: BarChart3,
      bg: "bg-blue-500/10",
      color: "text-blue-600 dark:text-blue-400",
      label: t("kpi.dashboard.totalStrategic"),
      value: dashboard?.total_strategic ?? "-",
    },
    {
      key: "operational",
      icon: TrendingUp,
      bg: "bg-green-500/10",
      color: "text-green-600 dark:text-green-400",
      label: t("kpi.dashboard.totalOperational"),
      value: dashboard?.total_operational ?? "-",
    },
    {
      key: "award",
      icon: AlertCircle,
      bg: "bg-purple-500/10",
      color: "text-purple-600 dark:text-purple-400",
      label: t("kpi.dashboard.totalAward"),
      value: dashboard?.total_award ?? "-",
    },
    {
      key: "pending",
      icon: LayoutDashboard,
      bg: "bg-amber-500/10",
      color: "text-amber-600 dark:text-amber-400",
      label: t("kpi.dashboard.pendingReviews"),
      value: dashboard?.pending_reviews ?? "-",
    },
  ];

  const statusData = (dashboard?.kpis_by_status ?? []).map((s) => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count,
    fill: STATUS_COLORS[s.status] ?? "#94a3b8",
  }));

  const trendData = (dashboard?.performance_trends ?? [])
    .map((t) => ({
      period: `Q${t.quarter} ${t.year}`,
      achievement: Math.round(t.avg_achievement * 10) / 10,
      count: t.kpi_count,
    }))
    .reverse();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <LayoutDashboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("kpi.dashboard.title")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("kpi.dashboard.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/goals/kpi/benchmarks"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Benchmarks
          </Link>
          <Link
            to="/goals/kpi/report"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            KPI Report
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={kpiTypeFilter}
          onChange={(e) => setKpiTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t("kpi.dashboard.allTypes")}</option>
          <option value="strategic">{t("kpi.dictionary.strategic")}</option>
          <option value="operational">{t("kpi.dictionary.operational")}</option>
          <option value="award">{t("kpi.dictionary.award")}</option>
        </select>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t("kpi.dashboard.allYears")}</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={quarterFilter}
          onChange={(e) => setQuarterFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t("kpi.dashboard.allQuarters")}</option>
          {[1, 2, 3, 4].map((q) => (
            <option key={q} value={q}>
              Q{q}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => (
              <div
                key={card.key}
                className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {card.label}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {card.value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Trend Chart */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <TrendingUp size={20} className="text-blue-500" />
                Performance Trend (Published)
              </h3>
              {trendData.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No trend data
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={trendData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-slate-200 dark:stroke-slate-700"
                    />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 11 }}
                      className="text-slate-500"
                    />
                    <YAxis
                      domain={[0, 100]}
                      className="text-slate-500"
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any) => [`${value}%`, "Achievement"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="achievement"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", r: 4 }}
                      name="Achievement"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* KPIs by Activation Status */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <BarChart3 size={20} className="text-blue-500" />
                KPIs by Activation Status
              </h3>
              {statusData.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No data
                </p>
              ) : (
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Benchmark & Segmentation Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Benchmark Summary */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 size={20} className="text-blue-500" />
                  Benchmark Summary
                </h3>
                <Link
                  to="/goals/kpi/benchmarks"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View all
                </Link>
              </div>
              {!dashboard?.benchmark_summaries?.length ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No benchmark data
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 px-2 font-medium text-slate-500">
                          KPI
                        </th>
                        <th className="text-left py-2 px-2 font-medium text-slate-500">
                          Entity
                        </th>
                        <th className="text-right py-2 px-2 font-medium text-slate-500">
                          Internal
                        </th>
                        <th className="text-right py-2 px-2 font-medium text-slate-500">
                          Benchmark
                        </th>
                        <th className="text-right py-2 px-2 font-medium text-slate-500">
                          Variance
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.benchmark_summaries.map((b, i) => (
                        <tr
                          key={i}
                          className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                        >
                          <td className="py-2 px-2 font-mono text-xs text-slate-600">
                            {b.kpi_code}
                          </td>
                          <td className="py-2 px-2 text-slate-700">
                            {b.benchmark_entity}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums text-slate-700">
                            {b.avg_internal.toFixed(1)}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums text-slate-700">
                            {b.avg_benchmark.toFixed(1)}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <span
                              className={`inline-flex items-center gap-1 tabular-nums font-medium ${b.avg_variance >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {b.avg_variance >= 0 ? (
                                <ArrowUpRight size={14} />
                              ) : (
                                <ArrowDownRight size={14} />
                              )}
                              {b.avg_variance.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Segmentation Summary */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Target size={20} className="text-blue-500" />
                  Segmentation Summary
                </h3>
                <Link
                  to="/goals/kpi/segmentation"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View all
                </Link>
              </div>
              {!dashboard?.segmentation_summaries?.length ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No segmentation data
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 px-2 font-medium text-slate-500">
                          Dimension
                        </th>
                        <th className="text-left py-2 px-2 font-medium text-slate-500">
                          Segment
                        </th>
                        <th className="text-right py-2 px-2 font-medium text-slate-500">
                          Avg
                        </th>
                        <th className="text-right py-2 px-2 font-medium text-slate-500">
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.segmentation_summaries.map((s, i) => (
                        <tr
                          key={i}
                          className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                        >
                          <td className="py-2 px-2 text-slate-700">
                            {s.dimension_name}
                          </td>
                          <td className="py-2 px-2 text-slate-700">
                            {s.segment_name}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums text-slate-700">
                            {s.avg_achievement.toFixed(1)}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <span
                              className={`tabular-nums font-medium ${s.avg_pct >= 80 ? "text-green-600" : s.avg_pct >= 60 ? "text-amber-600" : "text-red-600"}`}
                            >
                              {s.avg_pct.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Top & Low Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <CheckCircle size={20} className="text-green-500" />
                Top Performers
              </h3>
              {!dashboard?.top_performers?.length ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No data
                </p>
              ) : (
                <div className="space-y-3">
                  {dashboard.top_performers.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/10"
                    >
                      <div>
                        <p className="text-sm font-mono font-medium text-slate-900 dark:text-white">
                          {p.kpi_code}
                        </p>
                        <p className="text-xs text-slate-500">
                          Avg: {p.avg_achievement.toFixed(1)}%
                        </p>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        {p.avg_achievement.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <AlertCircle size={20} className="text-red-500" />
                Needs Improvement
              </h3>
              {!dashboard?.low_performers?.length ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No data
                </p>
              ) : (
                <div className="space-y-3">
                  {dashboard.low_performers.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10"
                    >
                      <div>
                        <p className="text-sm font-mono font-medium text-slate-900 dark:text-white">
                          {p.kpi_code}
                        </p>
                        <p className="text-xs text-slate-500">
                          Avg: {p.avg_achievement.toFixed(1)}%
                        </p>
                      </div>
                      <span className="text-lg font-bold text-red-600">
                        {p.avg_achievement.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent KPI Card Definitions */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText size={20} className="text-blue-500" />
                Recent KPI Card Definitions
              </h3>
              <Link
                to="/goals/kpi/report"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View full report
              </Link>
            </div>
            {!dashboard?.recent_kpi_cards?.length ? (
              <p className="text-sm text-slate-500 text-center py-8">
                No KPI cards defined
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 px-2 font-medium text-slate-500">
                        Code
                      </th>
                      <th className="text-left py-2 px-2 font-medium text-slate-500">
                        Name
                      </th>
                      <th className="text-left py-2 px-2 font-medium text-slate-500">
                        Type
                      </th>
                      <th className="text-left py-2 px-2 font-medium text-slate-500">
                        Formula
                      </th>
                      <th className="text-right py-2 px-2 font-medium text-slate-500">
                        Baseline
                      </th>
                      <th className="text-left py-2 px-2 font-medium text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recent_kpi_cards.map((card, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                      >
                        <td className="py-2 px-2 font-mono text-xs text-slate-600">
                          {card.code}
                        </td>
                        <td className="py-2 px-2 text-slate-700">
                          {card.name_en}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              card.type === "strategic"
                                ? "bg-blue-100 text-blue-700"
                                : card.type === "operational"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {card.type}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-xs text-slate-500 font-mono max-w-[200px] truncate">
                          {card.formula || "-"}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-700">
                          {card.baseline ?? "-"}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              card.activation_status === "active"
                                ? "bg-green-100 text-green-700"
                                : card.activation_status === "draft"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {card.activation_status === "active" ? (
                              <CheckCircle size={12} />
                            ) : (
                              <Clock size={12} />
                            )}
                            {card.activation_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
