import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileEdit,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  useGoalStats,
  useGoalDistributions,
  useProgressSummary,
  useAtRiskGoals,
  useGoalTrends,
} from "../../hooks/useGoalAnalytics";
import { GoalStatusBadge } from "../../components/goals/GoalStatusBadge";
import { GoalPriorityBadge } from "../../components/goals/GoalPriorityBadge";
import { GoalProgressBar } from "../../components/goals/GoalProgressBar";

const statCards = [
  {
    key: "total" as const,
    label: "Total Goals",
    icon: Target,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    key: "active" as const,
    label: "Active",
    icon: TrendingUp,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  {
    key: "overdue" as const,
    label: "Overdue",
    icon: Clock,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
  },
  {
    key: "at_risk" as const,
    label: "At Risk",
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
  },
  {
    key: "achieved" as const,
    label: "Achieved",
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
  },
  {
    key: "missed" as const,
    label: "Missed",
    icon: XCircle,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/20",
  },
];

export function GoalAnalyticsPage() {
  const [atRiskPage, setAtRiskPage] = useState(1);

  const { data: statsResp, isLoading: statsLoading } = useGoalStats();
  const { data: distResp, isLoading: distLoading } = useGoalDistributions();
  const { data: progressResp } = useProgressSummary();
  const { data: trendResp } = useGoalTrends(12);
  const { data: atRiskResp, isLoading: atRiskLoading } = useAtRiskGoals(
    atRiskPage,
    10,
  );

  const stats = statsResp?.data;
  const distributions = distResp?.data;
  const progress = progressResp?.data;
  const trend = trendResp?.data;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Goal Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Overview of goal performance and health metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Live data
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = statsLoading ? "—" : (stats?.[card.key] ?? 0);
          return (
            <div
              key={card.key}
              className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {value}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {card.label}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1: Status Donut + Priority Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Status Distribution
          </h3>
          {distLoading ? (
            <div className="h-64 flex items-center justify-center text-slate-400">
              Loading...
            </div>
          ) : distributions?.by_status?.length ? (
            <ResponsiveContainer width="100%" height={264}>
              <PieChart>
                <Pie
                  data={distributions.by_status}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  nameKey="label"
                  label={({ label, value }) => `${label}: ${value}`}
                >
                  {distributions.by_status.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.color || "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No data available
            </div>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Priority Distribution
          </h3>
          {distLoading ? (
            <div className="h-64 flex items-center justify-center text-slate-400">
              Loading...
            </div>
          ) : distributions?.by_priority?.length ? (
            <ResponsiveContainer width="100%" height={264}>
              <BarChart data={distributions.by_priority}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name="Goals" radius={[4, 4, 0, 0]}>
                  {distributions.by_priority.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.color || "#3b82f6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2: Department + Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Breakdown */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Goals by Department
          </h3>
          {distributions?.by_department?.length ? (
            <ResponsiveContainer width="100%" height={264}>
              <BarChart
                data={distributions.by_department}
                layout="vertical"
                margin={{ left: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  width={80}
                />
                <Tooltip />
                <Bar
                  dataKey="value"
                  name="Goals"
                  fill="#6366f1"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No data available
            </div>
          )}
        </div>

        {/* Progress Distribution */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Progress Distribution
            {progress && (
              <span className="ml-2 text-xs font-normal text-slate-500">
                (avg: {progress.average}%)
              </span>
            )}
          </h3>
          {progress?.ranges?.length ? (
            <ResponsiveContainer width="100%" height={264}>
              <BarChart data={progress.ranges}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name="Goals" radius={[4, 4, 0, 0]}>
                  {progress.ranges.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.color || "#3b82f6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Trend Chart */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          Monthly Trend (Last 12 Months)
        </h3>
        {trend?.points?.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trend.points}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => {
                  const [y, m] = v.split("-");
                  return `${m}/${y.slice(2)}`;
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                labelFormatter={(v: string) => {
                  const [y, m] = v.split("-");
                  const months = [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ];
                  return `${months[parseInt(m) - 1]} ${y}`;
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="created"
                name="Created"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="completed"
                name="Completed"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-400">
            No data available
          </div>
        )}
      </div>

      {/* At-Risk Goals Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              At-Risk & Overdue Goals
            </h3>
            {atRiskResp?.total != null && (
              <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full tabular-nums">
                {atRiskResp.total}
              </span>
            )}
          </div>
        </div>

        {atRiskLoading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : atRiskResp?.data?.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700/60">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Goal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Target Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Risk
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                  {atRiskResp.data.map((goal) => (
                    <tr
                      key={goal.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    >
                      <td className="px-6 py-3">
                        <Link
                          to={`/goals/${goal.id}`}
                          className="text-sm font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {goal.title}
                        </Link>
                        {goal.department && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {goal.department.name}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {goal.owner
                          ? `${goal.owner.first_name} ${goal.owner.last_name}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <GoalPriorityBadge priority={goal.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20">
                            <GoalProgressBar
                              progress={goal.progress}
                              size="sm"
                            />
                          </div>
                          <span className="text-xs text-slate-500 tabular-nums">
                            {Math.round(goal.progress)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                        {goal.target_date
                          ? new Date(goal.target_date).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {goal.days_overdue > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                            <Clock className="w-3 h-3" />
                            {goal.days_overdue}d overdue
                          </span>
                        ) : goal.last_check_in_status ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3" />
                            {goal.last_check_in_status.replace("_", " ")}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {atRiskResp.total_pages > 1 && (
              <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                  Page {atRiskResp.page} of {atRiskResp.total_pages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setAtRiskPage((p) => Math.max(1, p - 1))
                    }
                    disabled={atRiskPage <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setAtRiskPage((p) =>
                        Math.min(atRiskResp.total_pages, p + 1),
                      )
                    }
                    disabled={atRiskPage >= atRiskResp.total_pages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No at-risk or overdue goals
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GoalAnalyticsPage;
