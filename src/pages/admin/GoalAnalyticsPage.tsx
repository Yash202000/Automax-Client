import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Loader2,
  Maximize2,
  Minimize2,
  Building2,
  Calendar,
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
import { goalAnalyticsApi } from "../../api/goalAnalytics";
import type { AnalyticsFilter } from "../../api/goalAnalytics";
import type { AtRiskGoal } from "../../types/goalAnalytics";
import { departmentApi } from "../../api/admin";
import { useAuthStore } from "../../stores/authStore";
import { GoalPriorityBadge } from "../../components/goals/GoalPriorityBadge";
import { GoalProgressBar } from "../../components/goals/GoalProgressBar";

// ──────────────────────────────────────────────────
// Print styles (retained as fallback for ctrl+P)
// ──────────────────────────────────────────────────

const PRINT_STYLE_ID = "goal-analytics-print-styles";

function ensurePrintStyles() {
  if (document.getElementById(PRINT_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    @media print {
      /* Hide sidebar, navbar, toolbar controls */
      nav, aside, header,
      [data-print-hide],
      .no-print { display: none !important; }

      /* Full-width content */
      main, [role="main"] {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      /* White background for print */
      body, html {
        background: white !important;
        color: black !important;
      }

      /* Avoid page breaks inside charts/cards */
      .rounded-xl { break-inside: avoid; }

      /* Hide the hidden pdf export container during native print */
      #goal-analytics-pdf-export { display: none !important; }
    }
  `;
  document.head.appendChild(style);
}

// ──────────────────────────────────────────────────
// Stat card config
// ──────────────────────────────────────────────────

const statCards = [
  {
    key: "total" as const,
    labelKey: "goals.analytics.stats.total",
    icon: Target,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    key: "active" as const,
    labelKey: "goals.analytics.stats.active",
    icon: TrendingUp,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  {
    key: "overdue" as const,
    labelKey: "goals.analytics.stats.overdue",
    icon: Clock,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
  },
  {
    key: "at_risk" as const,
    labelKey: "goals.analytics.stats.atRisk",
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
  },
  {
    key: "achieved" as const,
    labelKey: "goals.analytics.stats.achieved",
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
  },
  {
    key: "missed" as const,
    labelKey: "goals.analytics.stats.missed",
    icon: XCircle,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/20",
  },
];

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────

function formatMonthLabel(v: string): string {
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
  const idx = parseInt(m, 10) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx > 11) return v;
  return `${months[idx]} ${y}`;
}

// ──────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────

export function GoalAnalyticsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = user?.is_super_admin || user?.permissions?.includes("*");

  // ── Filter state ─────────────────────────────────
  const [departmentId, setDepartmentId] = useState<string>(() => {
    // Non-admin users default to their own department
    if (!isAdmin && user?.department_id) return user.department_id;
    return "";
  });
  const [periodStart, setPeriodStart] = useState<string>("");
  const [periodEnd, setPeriodEnd] = useState<string>("");

  const analyticsFilter = useMemo<AnalyticsFilter | undefined>(() => {
    const f: AnalyticsFilter = {};
    if (departmentId) f.department_id = departmentId;
    if (periodStart) f.period_start = periodStart;
    if (periodEnd) f.period_end = periodEnd;
    if (!f.department_id && !f.period_start && !f.period_end) return undefined;
    return f;
  }, [departmentId, periodStart, periodEnd]);

  // ── Fullscreen state ─────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // ── Department list ──────────────────────────────
  const { data: deptResp } = useQuery({
    queryKey: ["departments", "list"],
    queryFn: () => departmentApi.list(),
    staleTime: 5 * 60 * 1000,
  });
  const departments = deptResp?.data ?? [];

  const selectedDepartmentName = useMemo(() => {
    if (!departmentId) return t("goals.analytics.filters.allDepartments");
    const d = departments.find((x) => x.id === departmentId);
    return d?.name ?? "—";
  }, [departmentId, departments, t]);

  // ── Analytics queries ────────────────────────────
  const [atRiskPage, setAtRiskPage] = useState(1);

  const { data: statsResp, isLoading: statsLoading } = useGoalStats(analyticsFilter);
  const { data: distResp, isLoading: distLoading } = useGoalDistributions(
    departmentId || undefined,
    analyticsFilter,
  );
  const { data: progressResp } = useProgressSummary(analyticsFilter);
  const { data: trendResp } = useGoalTrends(12, analyticsFilter);
  const { data: atRiskResp, isLoading: atRiskLoading } = useAtRiskGoals(
    atRiskPage,
    10,
    analyticsFilter,
  );

  const stats = statsResp?.data;
  const distributions = distResp?.data;
  const progress = progressResp?.data;
  const trend = trendResp?.data;

  // Reset at-risk page when filters change
  useEffect(() => {
    setAtRiskPage(1);
  }, [departmentId, periodStart, periodEnd]);

  // ── PDF generation ───────────────────────────────
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfAtRiskAll, setPdfAtRiskAll] = useState<AtRiskGoal[] | null>(null);
  const [pdfAtRiskTotal, setPdfAtRiskTotal] = useState<number>(0);

  const handleDownloadPDF = useCallback(async () => {
    if (isGenerating) return;

    if (statsLoading || distLoading || atRiskLoading) {
      toast.error(t("goals.analytics.pdfWaitingData"));
      return;
    }

    setIsGenerating(true);
    const loadingToast = toast.loading(t("goals.analytics.pdfGenerating"));

    try {
      // Fetch ALL at-risk goals (up to 1000) so the report is complete
      const allAtRisk = await goalAnalyticsApi.getAtRiskGoals(
        1,
        1000,
        analyticsFilter,
      );
      setPdfAtRiskAll(allAtRisk.data ?? []);
      setPdfAtRiskTotal(allAtRisk.total ?? (allAtRisk.data?.length ?? 0));

      // Wait a tick for React to render the hidden PDF container with data
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      await new Promise((resolve) => setTimeout(resolve, 50));

      if (!reportRef.current) {
        throw new Error("PDF container not ready");
      }

      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default;

      const date = new Date().toISOString().split("T")[0];
      const filename = `Goal_Analytics_${date}.pdf`;

      await html2pdf()
        .from(reportRef.current)
        .set({
          margin: [10, 10, 10, 10],
          filename,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"], after: ".pdf-page-break" },
        } as any)
        .save();

      toast.dismiss(loadingToast);
      toast.success(t("goals.analytics.pdfDownloaded"));
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error("PDF generation failed:", err);
      toast.error(t("goals.analytics.pdfFailed"));
    } finally {
      setPdfAtRiskAll(null);
      setPdfAtRiskTotal(0);
      setIsGenerating(false);
    }
  }, [
    analyticsFilter,
    atRiskLoading,
    distLoading,
    isGenerating,
    statsLoading,
    t,
  ]);

  // Ensure native print fallback CSS is injected (for Ctrl+P)
  useEffect(() => {
    ensurePrintStyles();
  }, []);

  // ── Derived values for PDF ───────────────────────
  const generatedDate = new Date();
  const filtersText = useMemo(() => {
    const parts: string[] = [];
    parts.push(
      t("goals.analytics.pdf.departmentLine", { name: selectedDepartmentName }),
    );
    if (periodStart || periodEnd) {
      parts.push(
        t("goals.analytics.pdf.periodLine", {
          start: periodStart || "—",
          end: periodEnd || "—",
        }),
      );
    } else {
      parts.push(t("goals.analytics.pdf.periodAllTime"));
    }
    return parts;
  }, [selectedDepartmentName, periodStart, periodEnd, t]);

  const generatedByText = user
    ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email
    : "—";

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("goals.analytics.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("goals.analytics.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2" data-print-hide>
          <button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            title={t("goals.analytics.downloadPdfTitle")}
            aria-label={t("goals.analytics.downloadPdfTitle")}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {isGenerating
                ? t("goals.analytics.generating")
                : t("goals.analytics.downloadPdf")}
            </span>
          </button>
          <button
            onClick={toggleFullscreen}
            title={
              isFullscreen
                ? t("goals.analytics.exitFullscreen")
                : t("goals.analytics.enterFullscreen")
            }
            aria-label={
              isFullscreen
                ? t("goals.analytics.exitFullscreen")
                : t("goals.analytics.enterFullscreen")
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div
        className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4"
        data-print-hide
      >
        <div className="flex flex-wrap items-end gap-4">
          {/* Department filter */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Building2 className="w-3.5 h-3.5" />
              {t("goals.analytics.filters.department")}
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {isAdmin && (
                <option value="">
                  {t("goals.analytics.filters.allDepartments")}
                </option>
              )}
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Period start */}
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              {t("goals.analytics.filters.from")}
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              max={periodEnd || undefined}
              className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          {/* Period end */}
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              {t("goals.analytics.filters.to")}
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              min={periodStart || undefined}
              className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          {/* Clear filters */}
          {(departmentId || periodStart || periodEnd) && (
            <button
              onClick={() => {
                setDepartmentId(isAdmin ? "" : user?.department_id || "");
                setPeriodStart("");
                setPeriodEnd("");
              }}
              className="h-9 px-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              {t("goals.analytics.filters.clear")}
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = statsLoading ? "\u2014" : (stats?.[card.key] ?? 0);
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
                    {t(card.labelKey)}
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
            {t("goals.analytics.charts.statusDistribution")}
          </h3>
          {distLoading ? (
            <div className="h-64 flex items-center justify-center text-slate-400">
              {t("goals.analytics.charts.loading")}
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
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {distributions.by_status.map((entry, index) => (
                    <Cell key={index} fill={entry.color || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              {t("goals.analytics.charts.noData")}
            </div>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            {t("goals.analytics.charts.priorityDistribution")}
          </h3>
          {distLoading ? (
            <div className="h-64 flex items-center justify-center text-slate-400">
              {t("goals.analytics.charts.loading")}
            </div>
          ) : distributions?.by_priority?.length ? (
            <ResponsiveContainer width="100%" height={264}>
              <BarChart data={distributions.by_priority}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar
                  dataKey="value"
                  name={t("goals.analytics.charts.goals")}
                  radius={[4, 4, 0, 0]}
                >
                  {distributions.by_priority.map((entry, index) => (
                    <Cell key={index} fill={entry.color || "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              {t("goals.analytics.charts.noData")}
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2: Department + Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Breakdown */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            {t("goals.analytics.charts.byDepartment")}
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
                  name={t("goals.analytics.charts.goals")}
                  fill="#6366f1"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              {t("goals.analytics.charts.noData")}
            </div>
          )}
        </div>

        {/* Progress Distribution */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            {t("goals.analytics.charts.progressDistribution")}
            {progress && (
              <span className="ms-2 text-xs font-normal text-slate-500">
                {t("goals.analytics.charts.progressAverage", {
                  value: progress.average,
                })}
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
                <Bar
                  dataKey="value"
                  name={t("goals.analytics.charts.goals")}
                  radius={[4, 4, 0, 0]}
                >
                  {progress.ranges.map((entry, index) => (
                    <Cell key={index} fill={entry.color || "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              {t("goals.analytics.charts.noData")}
            </div>
          )}
        </div>
      </div>

      {/* Trend Chart */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          {t("goals.analytics.charts.monthlyTrend")}
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
              <Tooltip labelFormatter={(v) => formatMonthLabel(String(v))} />
              <Legend />
              <Area
                type="monotone"
                dataKey="created"
                name={t("goals.analytics.charts.created")}
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="completed"
                name={t("goals.analytics.charts.completed")}
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-400">
            {t("goals.analytics.charts.noData")}
          </div>
        )}
      </div>

      {/* At-Risk Goals Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t("goals.analytics.atRisk.heading")}
            </h3>
            {atRiskResp?.total != null && (
              <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full tabular-nums">
                {atRiskResp.total}
              </span>
            )}
          </div>
        </div>

        {atRiskLoading ? (
          <div className="p-8 text-center text-slate-400">
            {t("goals.analytics.atRisk.loading")}
          </div>
        ) : atRiskResp?.data?.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700/60">
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("goals.analytics.atRisk.goal")}
                    </th>
                    <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("goals.analytics.atRisk.owner")}
                    </th>
                    <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("goals.analytics.atRisk.priority")}
                    </th>
                    <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("goals.analytics.atRisk.progress")}
                    </th>
                    <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("goals.analytics.atRisk.targetDate")}
                    </th>
                    <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("goals.analytics.atRisk.risk")}
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
                          : "\u2014"}
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
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-3">
                        {goal.days_overdue > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                            <Clock className="w-3 h-3" />
                            {t("goals.analytics.atRisk.daysOverdue", {
                              count: goal.days_overdue,
                            })}
                          </span>
                        ) : goal.last_check_in_status ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3" />
                            {goal.last_check_in_status.replace("_", " ")}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">{"\u2014"}</span>
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
                  {t("goals.analytics.atRisk.pageOf", {
                    current: atRiskResp.page,
                    total: atRiskResp.total_pages,
                  })}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAtRiskPage((p) => Math.max(1, p - 1))}
                    disabled={atRiskPage <= 1}
                    aria-label={t("common.previous")}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <ChevronLeft className="w-4 h-4 rtl:-rotate-180" />
                  </button>
                  <button
                    onClick={() =>
                      setAtRiskPage((p) =>
                        Math.min(atRiskResp.total_pages, p + 1),
                      )
                    }
                    disabled={atRiskPage >= atRiskResp.total_pages}
                    aria-label={t("common.next")}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <ChevronRight className="w-4 h-4 rtl:-rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("goals.analytics.atRisk.empty")}
            </p>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────
          Hidden PDF Export Container
          Rendered off-screen during generation only.
          A4 width = 210mm. Self-contained light styling.
         ──────────────────────────────────────────── */}
      {isGenerating && (
        <div
          id="goal-analytics-pdf-export"
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "-9999px",
            top: 0,
            width: "210mm",
            backgroundColor: "#ffffff",
          }}
          data-print-hide
        >
          <div
            ref={reportRef}
            style={{
              width: "210mm",
              backgroundColor: "#ffffff",
              color: "#0f172a",
              fontFamily:
                "'Inter', 'Helvetica Neue', Arial, sans-serif",
              fontSize: "11px",
              lineHeight: 1.45,
            }}
          >
            {/* ───────── Cover Page ───────── */}
            <section
              style={{
                minHeight: "277mm",
                padding: "28mm 18mm 18mm 18mm",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                background:
                  "linear-gradient(160deg, #eff6ff 0%, #ffffff 45%, #f1f5f9 100%)",
                boxSizing: "border-box",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "36px",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      background:
                        "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontWeight: 800,
                      fontSize: "20px",
                      letterSpacing: "-0.5px",
                    }}
                  >
                    A
                  </div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 800,
                      letterSpacing: "1px",
                      color: "#1e293b",
                    }}
                  >
                    AUTOMAX
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "3px",
                    color: "#2563eb",
                    marginBottom: "10px",
                  }}
                >
                  {t("goals.analytics.pdf.reportLabel")}
                </div>

                <h1
                  style={{
                    fontSize: "40px",
                    fontWeight: 800,
                    lineHeight: 1.1,
                    margin: "0 0 16px 0",
                    color: "#0f172a",
                  }}
                >
                  {t("goals.analytics.pdf.reportTitle")}
                </h1>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#475569",
                    margin: "0 0 32px 0",
                    maxWidth: "150mm",
                  }}
                >
                  {t("goals.analytics.pdf.reportIntro")}
                </p>

                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    backgroundColor: "#ffffff",
                    padding: "16px 20px",
                    marginTop: "24px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      color: "#64748b",
                      marginBottom: "10px",
                    }}
                  >
                    {t("goals.analytics.pdf.reportParameters")}
                  </div>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "12px",
                    }}
                  >
                    <tbody>
                      {filtersText.map((line, i) => (
                        <tr key={i}>
                          <td
                            style={{
                              padding: "4px 0",
                              color: "#0f172a",
                              fontWeight: 500,
                            }}
                          >
                            {line}
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td
                          style={{
                            padding: "4px 0",
                            color: "#0f172a",
                            fontWeight: 500,
                          }}
                        >
                          {t("goals.analytics.pdf.generatedBy", {
                            name: generatedByText,
                          })}
                        </td>
                      </tr>
                      <tr>
                        <td
                          style={{
                            padding: "4px 0",
                            color: "#0f172a",
                            fontWeight: 500,
                          }}
                        >
                          {t("goals.analytics.pdf.generatedOn", {
                            date: generatedDate.toLocaleString(),
                          })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div
                style={{
                  fontSize: "10px",
                  color: "#94a3b8",
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "12px",
                }}
              >
                {t("goals.analytics.pdf.confidential")}
              </div>
            </section>

            <div className="pdf-page-break" style={{ pageBreakAfter: "always" }} />

            {/* ───────── Executive Summary ───────── */}
            <section style={{ padding: "14mm 14mm 8mm 14mm" }}>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  margin: "0 0 4px 0",
                  color: "#0f172a",
                }}
              >
                {t("goals.analytics.pdf.executiveSummary")}
              </h2>
              <p
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  margin: "0 0 14px 0",
                }}
              >
                {t("goals.analytics.pdf.executiveSummaryDesc")}
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px",
                }}
              >
                {statCards.map((card) => {
                  const value = stats?.[card.key] ?? 0;
                  return (
                    <div
                      key={card.key}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          color: "#64748b",
                          marginBottom: "4px",
                        }}
                      >
                        {t(card.labelKey)}
                      </div>
                      <div
                        style={{
                          fontSize: "24px",
                          fontWeight: 800,
                          color: "#0f172a",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ───────── Status Distribution ───────── */}
            <section style={{ padding: "4mm 14mm" }}>
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  margin: "0 0 8px 0",
                  color: "#0f172a",
                }}
              >
                {t("goals.analytics.charts.statusDistribution")}
              </h2>
              {distributions?.by_status?.length ? (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "11px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc" }}>
                      <th style={thStyle}>
                        {t("goals.analytics.pdf.statusTableStatus")}
                      </th>
                      <th style={{ ...thStyle, textAlign: "right" }}>
                        {t("goals.analytics.pdf.statusTableCount")}
                      </th>
                      <th style={{ ...thStyle, textAlign: "right" }}>
                        {t("goals.analytics.pdf.statusTableShare")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const total = distributions.by_status.reduce(
                        (s, x) => s + (x.value || 0),
                        0,
                      );
                      return distributions.by_status.map((row, i) => (
                        <tr key={i}>
                          <td style={tdStyle}>
                            <span
                              style={{
                                display: "inline-block",
                                width: "10px",
                                height: "10px",
                                borderRadius: "2px",
                                backgroundColor: row.color || "#94a3b8",
                                marginRight: "8px",
                                verticalAlign: "middle",
                              }}
                            />
                            {row.label}
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {row.value}
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              textAlign: "right",
                              color: "#64748b",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {total > 0
                              ? `${Math.round((row.value / total) * 100)}%`
                              : "—"}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              ) : (
                <p style={emptyStyle}>
                  {t("goals.analytics.charts.noData")}
                </p>
              )}
            </section>

            {/* ───────── Priority Distribution ───────── */}
            <section style={{ padding: "4mm 14mm" }}>
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  margin: "0 0 8px 0",
                  color: "#0f172a",
                }}
              >
                {t("goals.analytics.charts.priorityDistribution")}
              </h2>
              {distributions?.by_priority?.length ? (
                <div>
                  {(() => {
                    const max = Math.max(
                      1,
                      ...distributions.by_priority.map((r) => r.value || 0),
                    );
                    return distributions.by_priority.map((row, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "6px",
                        }}
                      >
                        <div
                          style={{
                            width: "80px",
                            fontSize: "11px",
                            color: "#334155",
                            fontWeight: 500,
                          }}
                        >
                          {row.label}
                        </div>
                        <div
                          style={{
                            flex: 1,
                            height: "14px",
                            backgroundColor: "#f1f5f9",
                            borderRadius: "4px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${((row.value || 0) / max) * 100}%`,
                              height: "100%",
                              backgroundColor: row.color || "#3b82f6",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            width: "44px",
                            textAlign: "right",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#0f172a",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {row.value}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <p style={emptyStyle}>
                  {t("goals.analytics.charts.noData")}
                </p>
              )}
            </section>

            {/* ───────── Goals by Department ───────── */}
            <section style={{ padding: "4mm 14mm" }}>
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  margin: "0 0 8px 0",
                  color: "#0f172a",
                }}
              >
                {t("goals.analytics.charts.byDepartment")}
              </h2>
              {distributions?.by_department?.length ? (
                <div>
                  {(() => {
                    const max = Math.max(
                      1,
                      ...distributions.by_department.map((r) => r.value || 0),
                    );
                    return distributions.by_department.map((row, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "6px",
                        }}
                      >
                        <div
                          style={{
                            width: "120px",
                            fontSize: "11px",
                            color: "#334155",
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.label}
                        </div>
                        <div
                          style={{
                            flex: 1,
                            height: "12px",
                            backgroundColor: "#f1f5f9",
                            borderRadius: "4px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${((row.value || 0) / max) * 100}%`,
                              height: "100%",
                              backgroundColor: row.color || "#6366f1",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            width: "44px",
                            textAlign: "right",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#0f172a",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {row.value}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <p style={emptyStyle}>
                  {t("goals.analytics.charts.noData")}
                </p>
              )}
            </section>

            <div className="pdf-page-break" style={{ pageBreakAfter: "always" }} />

            {/* ───────── Progress Summary ───────── */}
            <section style={{ padding: "14mm 14mm 4mm 14mm" }}>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  margin: "0 0 4px 0",
                  color: "#0f172a",
                }}
              >
                {t("goals.analytics.pdf.progressSummary")}
              </h2>
              <p
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  margin: "0 0 14px 0",
                }}
              >
                {t("goals.analytics.pdf.progressAverageLabel")}
                <strong style={{ color: "#0f172a" }}>
                  {progress?.average ?? 0}%
                </strong>
              </p>

              {progress?.ranges?.length ? (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "11px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc" }}>
                      <th style={thStyle}>
                        {t("goals.analytics.pdf.progressRange")}
                      </th>
                      <th style={{ ...thStyle, textAlign: "right" }}>
                        {t("goals.analytics.pdf.progressGoals")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {progress.ranges.map((row, i) => (
                      <tr key={i}>
                        <td style={tdStyle}>
                          <span
                            style={{
                              display: "inline-block",
                              width: "10px",
                              height: "10px",
                              borderRadius: "2px",
                              backgroundColor: row.color || "#3b82f6",
                              marginRight: "8px",
                              verticalAlign: "middle",
                            }}
                          />
                          {row.label}
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={emptyStyle}>
                  {t("goals.analytics.charts.noData")}
                </p>
              )}
            </section>

            {/* ───────── Monthly Trend ───────── */}
            <section style={{ padding: "4mm 14mm" }}>
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  margin: "0 0 8px 0",
                  color: "#0f172a",
                }}
              >
                {t("goals.analytics.charts.monthlyTrend")}
              </h2>
              {trend?.points?.length ? (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "11px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc" }}>
                      <th style={thStyle}>
                        {t("goals.analytics.pdf.trendMonth")}
                      </th>
                      <th style={{ ...thStyle, textAlign: "right" }}>
                        {t("goals.analytics.charts.created")}
                      </th>
                      <th style={{ ...thStyle, textAlign: "right" }}>
                        {t("goals.analytics.charts.completed")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trend.points.map((p, i) => (
                      <tr key={i}>
                        <td style={tdStyle}>{formatMonthLabel(p.month)}</td>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            color: "#2563eb",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {p.created}
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            color: "#16a34a",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {p.completed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={emptyStyle}>
                  {t("goals.analytics.charts.noData")}
                </p>
              )}
            </section>

            <div className="pdf-page-break" style={{ pageBreakAfter: "always" }} />

            {/* ───────── At-Risk Goals (full list) ───────── */}
            <section style={{ padding: "14mm 14mm 14mm 14mm" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    margin: 0,
                    color: "#0f172a",
                  }}
                >
                  {t("goals.analytics.pdf.atRiskHeading")}
                </h2>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#92400e",
                    backgroundColor: "#fef3c7",
                    padding: "2px 10px",
                    borderRadius: "999px",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {t("goals.analytics.pdf.atRiskTotal", {
                    count: pdfAtRiskTotal,
                  })}
                </span>
              </div>
              <p
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  margin: "0 0 10px 0",
                }}
              >
                {t("goals.analytics.pdf.atRiskIntro")}
              </p>

              {pdfAtRiskAll && pdfAtRiskAll.length > 0 ? (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "10px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc" }}>
                      <th style={thStyle}>
                        {t("goals.analytics.pdf.atRiskTitle")}
                      </th>
                      <th style={thStyle}>
                        {t("goals.analytics.atRisk.owner")}
                      </th>
                      <th style={thStyle}>
                        {t("goals.analytics.atRisk.priority")}
                      </th>
                      <th style={{ ...thStyle, textAlign: "right" }}>
                        {t("goals.analytics.atRisk.progress")}
                      </th>
                      <th style={thStyle}>
                        {t("goals.analytics.atRisk.targetDate")}
                      </th>
                      <th style={thStyle}>
                        {t("goals.analytics.pdf.atRiskStatus")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pdfAtRiskAll.map((goal) => (
                      <tr key={goal.id}>
                        <td style={tdStyle}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: "#0f172a",
                            }}
                          >
                            {goal.title}
                          </div>
                          {goal.department && (
                            <div
                              style={{
                                fontSize: "9px",
                                color: "#94a3b8",
                                marginTop: "2px",
                              }}
                            >
                              {goal.department.name}
                            </div>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {goal.owner
                            ? `${goal.owner.first_name} ${goal.owner.last_name}`
                            : "—"}
                        </td>
                        <td style={tdStyle}>{goal.priority}</td>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {Math.round(goal.progress)}%
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {goal.target_date
                            ? new Date(goal.target_date).toLocaleDateString()
                            : "—"}
                        </td>
                        <td style={tdStyle}>
                          {goal.days_overdue > 0 ? (
                            <span
                              style={{
                                color: "#dc2626",
                                fontWeight: 600,
                              }}
                            >
                              {t("goals.analytics.atRisk.daysOverdue", {
                                count: goal.days_overdue,
                              })}
                            </span>
                          ) : goal.last_check_in_status ? (
                            <span
                              style={{
                                color: "#d97706",
                                fontWeight: 600,
                              }}
                            >
                              {goal.last_check_in_status.replace("_", " ")}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={emptyStyle}>
                  {t("goals.analytics.pdf.atRiskEmpty")}
                </p>
              )}
            </section>

            {/* Footer */}
            <div
              style={{
                padding: "8mm 14mm 14mm 14mm",
                fontSize: "9px",
                color: "#94a3b8",
                borderTop: "1px solid #e2e8f0",
                textAlign: "center",
              }}
            >
              {t("goals.analytics.pdf.footer", {
                date: generatedDate.toLocaleString(),
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────
// Shared inline styles for PDF tables
// ──────────────────────────────────────────────────

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: "#64748b",
  borderBottom: "1px solid #e2e8f0",
};

const tdStyle: CSSProperties = {
  padding: "8px 10px",
  color: "#0f172a",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
};

const emptyStyle: CSSProperties = {
  fontSize: "11px",
  color: "#94a3b8",
  fontStyle: "italic",
  padding: "12px 0",
};

export default GoalAnalyticsPage;
