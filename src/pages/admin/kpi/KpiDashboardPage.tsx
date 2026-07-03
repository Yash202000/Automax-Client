import React from "react";
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
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useKpiDashboard, useStrategicKPIs } from "../../../hooks/useKpi";
import { Link } from "react-router-dom";

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  draft: "#f59e0b",
  inactive: "#94a3b8",
};

export const KpiDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: dashboard, isLoading } = useKpiDashboard();
  const { data: kpisRes } = useStrategicKPIs({ limit: 5 });
  const kpis = kpisRes?.data ?? [];

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

  const goalData = (dashboard?.kpis_by_goal ?? []).map((g) => ({
    name: g.goal,
    count: g.count,
  }));

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

            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <Target size={20} className="text-blue-500" />
                KPIs by Strategic Goal
              </h3>
              {goalData.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No data
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={goalData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-slate-200 dark:stroke-slate-700"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      className="text-slate-500"
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis allowDecimals={false} className="text-slate-500" />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      name="KPIs"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Target size={20} className="text-blue-500" />
                  Strategic KPIs
                </h3>
                <Link
                  to="/goals/kpi/dictionary"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View all
                </Link>
              </div>
              {kpis.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                  No KPIs found
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 px-2 font-medium text-slate-500 dark:text-slate-400">
                          Code
                        </th>
                        <th className="text-left py-2 px-2 font-medium text-slate-500 dark:text-slate-400">
                          Name
                        </th>
                        <th className="text-left py-2 px-2 font-medium text-slate-500 dark:text-slate-400">
                          Goal
                        </th>
                        <th className="text-left py-2 px-2 font-medium text-slate-500 dark:text-slate-400">
                          OKR Goal
                        </th>
                        <th className="text-left py-2 px-2 font-medium text-slate-500 dark:text-slate-400">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpis.map((kpi) => (
                        <tr
                          key={kpi.id}
                          className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                        >
                          <td className="py-2 px-2 font-mono text-xs text-slate-600 dark:text-slate-300">
                            {kpi.code}
                          </td>
                          <td className="py-2 px-2 text-slate-700 dark:text-slate-200">
                            {kpi.name_en}
                          </td>
                          <td className="py-2 px-2 text-slate-500 dark:text-slate-400">
                            {kpi.strategic_goal?.name_en ?? "-"}
                          </td>
                          <td className="py-2 px-2 text-slate-500 dark:text-slate-400">
                            {kpi.goal?.title ?? "-"}
                          </td>
                          <td className="py-2 px-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                kpi.activation_status === "active"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : kpi.activation_status === "draft"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {kpi.activation_status === "active" ? (
                                <CheckCircle size={12} />
                              ) : (
                                <Clock size={12} />
                              )}
                              {kpi.activation_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <BarChart3 size={20} className="text-blue-500" />
                Overview
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-blue-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Strategic
                    </span>
                  </div>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {dashboard?.total_strategic ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-green-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Operational
                    </span>
                  </div>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {dashboard?.total_operational ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-purple-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Award
                    </span>
                  </div>
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {dashboard?.total_award ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-amber-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Pending Reviews
                    </span>
                  </div>
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {dashboard?.pending_reviews ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
