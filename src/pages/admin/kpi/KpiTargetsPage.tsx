import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Crosshair,
  Plus,
  AlertCircle,
  Trash2,
  X,
  HelpCircle,
  Eye,
  Copy,
  ArrowUpRight,
  Edit,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  useKpiTargets,
  useSetKpiTarget,
  useDeleteKpiTarget,
  useKpiCardDefinitions,
  useKpiMetricsByCode,
} from "../../../hooks/useKpi";
import { Button } from "../../../components/ui/Button";
import type {
  KpiTarget,
  KpiTargetType,
  KpiTargetBasis,
  KpiThresholdMode,
  KpiTargetStatus,
} from "../../../types/kpi";
import {
  getYearOptions,
  getPeriodOptionsByFrequency,
  TARGET_TYPE_OPTIONS,
  TARGET_BASIS_OPTIONS,
  THRESHOLD_MODE_OPTIONS,
  TARGET_STATUS_OPTIONS,
} from "../../../types/kpi";

const statusColorMap: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300",
  submitted: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  approved:
    "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
  returned:
    "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  rejected: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
  locked:
    "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
  superseded:
    "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

const MONTH_NAMES_SHORT = [
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

function formatPeriodLabel(year: number, periodCode: string): string {
  const monthIndex = parseInt(periodCode.replace(/[^0-9]/g, ""), 10) - 1;
  if (monthIndex >= 0 && monthIndex < 12) {
    return `${MONTH_NAMES_SHORT[monthIndex]} ${year}`;
  }
  return `${periodCode} ${year}`;
}

function formatTargetValue(
  value: number | undefined | null,
  direction: string,
): string {
  if (value == null) return "—";
  return direction === "Percentage" || direction === "Percentage of Target"
    ? `${value.toFixed(2)}%`
    : value.toLocaleString();
}

function getPeriodStartEnd(
  year: number,
  periodCode: string,
): { start: string; end: string } {
  const monthIndex = parseInt(periodCode.replace(/[^0-9]/g, ""), 10) - 1;
  if (monthIndex >= 0 && monthIndex < 12) {
    const start = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const end = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { start, end };
  }
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export const KpiTargetsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState<number>(currentYear);
  const [kpiCodeFilter, setKpiCodeFilter] = useState(
    () => searchParams.get("kpi_code") ?? "",
  );
  const [metricFilter, setMetricFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [pendingKpiCode, setPendingKpiCode] = useState(kpiCodeFilter);
  const [pendingMetricFilter, setPendingMetricFilter] = useState("");
  const [pendingPeriodFilter, setPendingPeriodFilter] = useState("");
  const [pendingStatusFilter, setPendingStatusFilter] = useState("");

  useEffect(() => {
    const fromUrl = searchParams.get("kpi_code");
    if (fromUrl) {
      setKpiCodeFilter(fromUrl);
      setPendingKpiCode(fromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    setPendingKpiCode(kpiCodeFilter);
  }, [kpiCodeFilter]);

  const handleApplyFilters = () => {
    setKpiCodeFilter(pendingKpiCode);
    setMetricFilter(pendingMetricFilter);
    setPeriodFilter(pendingPeriodFilter);
    setStatusFilter(pendingStatusFilter);
  };

  const handleClearFilters = () => {
    setPendingKpiCode("");
    setPendingMetricFilter("");
    setPendingPeriodFilter("");
    setPendingStatusFilter("");
    setKpiCodeFilter("");
    setMetricFilter("");
    setPeriodFilter("");
    setStatusFilter("");
    if (searchParams.get("kpi_code")) {
      searchParams.delete("kpi_code");
      setSearchParams(searchParams);
    }
  };

  const { data: allCards } = useKpiCardDefinitions();
  const cardOptions = useMemo(
    () =>
      (allCards ?? []).map((c) => ({
        code: c.code,
        label: `${c.code} — ${c.name_en}`,
        type: c.type,
        reporting_frequency: c.reporting_frequency,
      })),
    [allCards],
  );

  const selectedCard = cardOptions.find((c) => c.code === kpiCodeFilter);
  const { data: kpiMetrics } = useKpiMetricsByCode(selectedCard?.code);

  const {
    data: targets,
    isLoading,
    error,
  } = useKpiTargets({
    year,
    kpi_code: kpiCodeFilter || undefined,
    metric_id: metricFilter || undefined,
    period_code: periodFilter || undefined,
    target_status: statusFilter || undefined,
  });

  const setTarget = useSetKpiTarget();
  const deleteTarget = useDeleteKpiTarget();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<KpiTarget | null>(null);
  const [formKpiCode, setFormKpiCode] = useState("");
  const [formKpiType, setFormKpiType] = useState<string>("strategic");
  const [formMetricId, setFormMetricId] = useState("");
  const [formYear, setFormYear] = useState(currentYear);
  const [formPeriodCode, setFormPeriodCode] = useState("");
  const [formTargetValue, setFormTargetValue] = useState("");
  const [formTargetType, setFormTargetType] =
    useState<KpiTargetType>("Period Target");
  const [formTargetBasis, setFormTargetBasis] =
    useState<KpiTargetBasis>("Strategic Plan");
  const [formTargetRationale, setFormTargetRationale] = useState("");
  const [formThresholdMode, setFormThresholdMode] = useState<KpiThresholdMode>(
    "Use Global KPI Rules",
  );
  const [formExcellentThreshold, setFormExcellentThreshold] = useState("");
  const [formAchievedThreshold, setFormAchievedThreshold] = useState("");
  const [formWarningThreshold, setFormWarningThreshold] = useState("");
  const [formRangeMin, setFormRangeMin] = useState("");
  const [formRangeMax, setFormRangeMax] = useState("");
  const [formStatus, setFormStatus] = useState<KpiTargetStatus>("draft");

  const { data: modalMetrics } = useKpiMetricsByCode(
    modalOpen ? formKpiCode : undefined,
  );

  const yearOptions = useMemo(() => getYearOptions(), []);
  const freq = selectedCard?.reporting_frequency;
  const periodOptions = useMemo(
    () => getPeriodOptionsByFrequency(freq),
    [freq],
  );

  const selectedMetric = (modalMetrics ?? kpiMetrics ?? []).find(
    (m: any) => m.id === formMetricId,
  );
  const calcType: string = selectedMetric?.calculation_type ?? "Direct Value";
  const direction: string = selectedMetric?.direction ?? "Higher is Better";
  const isFormulaMetric = calcType === "Formula";

  const periodDates = getPeriodStartEnd(formYear, formPeriodCode);

  const resetForm = () => {
    setFormKpiCode(kpiCodeFilter || "");
    setFormKpiType(selectedCard?.type ?? "strategic");
    setFormMetricId("");
    setFormYear(year);
    setFormPeriodCode("");
    setFormTargetValue("");
    setFormTargetType("Period Target");
    setFormTargetBasis("Strategic Plan");
    setFormTargetRationale("");
    setFormThresholdMode("Use Global KPI Rules");
    setFormExcellentThreshold("");
    setFormAchievedThreshold("");
    setFormWarningThreshold("");
    setFormRangeMin("");
    setFormRangeMax("");
    setFormStatus("draft");
    setEditingTarget(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleEditTarget = (target: KpiTarget) => {
    setEditingTarget(target);
    setFormKpiCode(target.kpi_code);
    setFormKpiType(target.kpi_type);
    setFormMetricId(target.metric_id);
    setFormYear(target.target_year);
    setFormPeriodCode(target.period_code);
    setFormTargetValue(
      target.target_value != null ? String(target.target_value) : "",
    );
    setFormTargetType(target.target_type);
    setFormTargetBasis(target.target_basis);
    setFormTargetRationale(target.target_rationale);
    setFormThresholdMode(target.threshold_mode);
    setFormExcellentThreshold(
      target.excellent_threshold != null
        ? String(target.excellent_threshold)
        : "",
    );
    setFormAchievedThreshold(
      target.achieved_threshold != null
        ? String(target.achieved_threshold)
        : "",
    );
    setFormWarningThreshold(
      target.warning_threshold != null ? String(target.warning_threshold) : "",
    );
    setFormRangeMin(
      target.target_range_min != null ? String(target.target_range_min) : "",
    );
    setFormRangeMax(
      target.target_range_max != null ? String(target.target_range_max) : "",
    );
    setFormStatus(target.target_status);
    setModalOpen(true);
  };

  const handleSaveDraft = async () => {
    setFormStatus("draft");
    await handleSubmit("draft");
  };

  const handleSubmitTarget = async () => {
    setFormStatus("submitted");
    await handleSubmit("submitted");
  };

  const handleSubmit = async (status?: KpiTargetStatus) => {
    if (!formKpiCode || !formMetricId) {
      toast.error("KPI and Metric are required");
      return;
    }
    if (!formPeriodCode) {
      toast.error("Period is required");
      return;
    }
    if (!formTargetValue && direction !== "Informational") {
      toast.error("Target value is required");
      return;
    }
    if (!formTargetRationale.trim()) {
      toast.error("Target rationale is required");
      return;
    }

    const payload: any = {
      kpi_code: formKpiCode,
      kpi_type: formKpiType as any,
      metric_id: formMetricId,
      target_year: formYear,
      period_code: formPeriodCode,
      target_value:
        direction !== "Informational" ? Number(formTargetValue) : undefined,
      target_type: formTargetType,
      target_basis: formTargetBasis,
      target_rationale: formTargetRationale.trim(),
      threshold_mode: formThresholdMode,
      excellent_threshold: formExcellentThreshold
        ? Number(formExcellentThreshold)
        : undefined,
      achieved_threshold: formAchievedThreshold
        ? Number(formAchievedThreshold)
        : undefined,
      warning_threshold: formWarningThreshold
        ? Number(formWarningThreshold)
        : undefined,
      target_range_min: formRangeMin ? Number(formRangeMin) : undefined,
      target_range_max: formRangeMax ? Number(formRangeMax) : undefined,
      period_start: periodDates.start,
      period_end: periodDates.end,
    };

    if (status) {
      payload.target_status = status;
    }

    if (editingTarget) {
      payload.id = editingTarget.id;
    }

    await setTarget.mutateAsync(payload);
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t("common.confirmDelete"))) {
      deleteTarget.mutate(id);
    }
  };

  const handleViewTarget = (target: KpiTarget) => {
    toast.info(`Target: ${target.id}`);
  };

  const handleCopyTarget = (target: KpiTarget) => {
    resetForm();
    setFormKpiCode(target.kpi_code);
    setFormKpiType(target.kpi_type);
    setFormMetricId(target.metric_id);
    setFormYear(target.target_year);
    setFormPeriodCode(target.period_code);
    setFormTargetValue(
      target.target_value != null ? String(target.target_value) : "",
    );
    setFormTargetType(target.target_type);
    setFormTargetBasis(target.target_basis);
    setFormTargetRationale(target.target_rationale);
    setFormThresholdMode(target.threshold_mode);
    setFormExcellentThreshold(
      target.excellent_threshold != null
        ? String(target.excellent_threshold)
        : "",
    );
    setFormAchievedThreshold(
      target.achieved_threshold != null
        ? String(target.achieved_threshold)
        : "",
    );
    setFormWarningThreshold(
      target.warning_threshold != null ? String(target.warning_threshold) : "",
    );
    setFormRangeMin(
      target.target_range_min != null ? String(target.target_range_min) : "",
    );
    setFormRangeMax(
      target.target_range_max != null ? String(target.target_range_max) : "",
    );
    setModalOpen(true);
  };

  const items: KpiTarget[] = targets ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Crosshair className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("kpi.targets.title")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("kpi.targets.subtitle")}
            </p>
          </div>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenModal}
        >
          {t("kpi.targets.setTarget")}
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {yearOptions.map((y) => (
            <option key={y.value} value={y.value}>
              {y.label}
            </option>
          ))}
        </select>
        <div className="relative">
          <input
            type="text"
            value={pendingKpiCode}
            onChange={(e) => setPendingKpiCode(e.target.value)}
            placeholder={t("kpi.targets.searchPlaceholder")}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 pe-8"
          />
          {pendingKpiCode && (
            <button
              onClick={() => setPendingKpiCode("")}
              className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              title={t("common.clear")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={pendingMetricFilter}
          onChange={(e) => setPendingMetricFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Metrics</option>
          {(kpiMetrics ?? []).map((m: any) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          value={pendingPeriodFilter}
          onChange={(e) => setPendingPeriodFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Periods</option>
          {periodOptions.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          value={pendingStatusFilter}
          onChange={(e) => setPendingStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {TARGET_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <Button onClick={handleApplyFilters}>Apply</Button>
        {(kpiCodeFilter || metricFilter || periodFilter || statusFilter) && (
          <button
            onClick={handleClearFilters}
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

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
                {t("kpi.targets.failedToLoad")}
              </p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Crosshair className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t("kpi.targets.empty")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Target ID
                  </th>
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-4 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Direction
                  </th>
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Threshold
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((target: KpiTarget) => (
                  <tr
                    key={target.id}
                    className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-4 text-sm font-mono text-slate-900 dark:text-white">
                      {target.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {target.metric?.name ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-sm font-mono text-slate-700 dark:text-slate-300">
                      {formatPeriodLabel(
                        target.target_year,
                        target.period_code,
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm tabular-nums font-medium text-slate-900 dark:text-white ltr:text-right rtl:text-left">
                      {formatTargetValue(
                        target.target_value,
                        target.direction_snapshot,
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {target.direction_snapshot ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {target.threshold_mode ?? "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${statusColorMap[target.target_status] ?? ""}`}
                      >
                        {target.target_status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewTarget(target)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCopyTarget(target)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-700/50 transition-colors"
                          title="Copy"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditTarget(target)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-900/20 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {(target.target_status === "draft" ||
                          target.target_status === "returned") && (
                          <button
                            onClick={() => {
                              toast.info("Submit workflow coming soon");
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:text-green-400 dark:hover:bg-green-900/20 transition-colors"
                            title="Submit"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {target.target_status === "superseded" && (
                          <button
                            onClick={() => handleCopyTarget(target)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:text-purple-400 dark:hover:bg-purple-900/20 transition-colors"
                            title="Supersede"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(target.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                          title={t("common.delete")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  <Crosshair className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {editingTarget ? "Edit Target" : "Set Target"}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {editingTarget
                      ? "Modify target details"
                      : "Define a target for a KPI metric"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isFormulaMetric && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 p-4 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>
                    Formula metrics are configuration-only in Phase 1. Targets
                    cannot receive operational Entries until Phase 2.
                  </span>
                </div>
              )}

              <fieldset className="border border-slate-200 dark:border-slate-700/60 rounded-lg p-4 space-y-4">
                <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-1">
                  Basic Details & Period
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      KPI <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formKpiCode}
                      onChange={(e) => {
                        const c = cardOptions.find(
                          (o) => o.code === e.target.value,
                        );
                        setFormKpiCode(e.target.value);
                        if (c) setFormKpiType(c.type);
                        setFormMetricId("");
                      }}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">-- Select KPI --</option>
                      {cardOptions.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Metric <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formMetricId}
                      onChange={(e) => setFormMetricId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">-- Select Metric --</option>
                      {(modalMetrics ?? kpiMetrics ?? []).map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {selectedMetric && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Calculation Type
                      </label>
                      <input
                        type="text"
                        value={calcType}
                        readOnly
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 outline-none cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Direction
                      </label>
                      <input
                        type="text"
                        value={direction}
                        readOnly
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Target Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formYear}
                      onChange={(e) => setFormYear(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {yearOptions.map((y) => (
                        <option key={y.value} value={y.value}>
                          {y.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Period <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formPeriodCode}
                      onChange={(e) => setFormPeriodCode(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select</option>
                      {periodOptions.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {formPeriodCode && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Period Start
                      </label>
                      <input
                        type="text"
                        value={periodDates.start}
                        readOnly
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 outline-none cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Period End
                      </label>
                      <input
                        type="text"
                        value={periodDates.end}
                        readOnly
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>
                )}
              </fieldset>

              <fieldset className="border border-slate-200 dark:border-slate-700/60 rounded-lg p-4 space-y-4">
                <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-1">
                  Target Values & Basis
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Target Value{" "}
                      {direction !== "Informational" && (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formTargetValue}
                      onChange={(e) => setFormTargetValue(e.target.value)}
                      placeholder={
                        direction === "Informational"
                          ? "N/A (Informational)"
                          : "0"
                      }
                      disabled={direction === "Informational"}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Target Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formTargetType}
                      onChange={(e) =>
                        setFormTargetType(e.target.value as KpiTargetType)
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {TARGET_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Target Basis <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formTargetBasis}
                    onChange={(e) =>
                      setFormTargetBasis(e.target.value as KpiTargetBasis)
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {TARGET_BASIS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Target Rationale <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formTargetRationale}
                    onChange={(e) => setFormTargetRationale(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Assumptions, basis, and justification for this target..."
                  />
                </div>
              </fieldset>

              <fieldset className="border border-slate-200 dark:border-slate-700/60 rounded-lg p-4 space-y-4">
                <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-1">
                  Thresholds & Status
                </legend>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Threshold Mode <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formThresholdMode}
                    onChange={(e) =>
                      setFormThresholdMode(e.target.value as KpiThresholdMode)
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {THRESHOLD_MODE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {formThresholdMode !== "No Thresholds" &&
                  formThresholdMode !== "Use Global KPI Rules" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {formThresholdMode !== "Target Range" && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Excellent ≥
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={formExcellentThreshold}
                              onChange={(e) =>
                                setFormExcellentThreshold(e.target.value)
                              }
                              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Achieved ≥
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={formAchievedThreshold}
                              onChange={(e) =>
                                setFormAchievedThreshold(e.target.value)
                              }
                              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Warning ≥
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={formWarningThreshold}
                              onChange={(e) =>
                                setFormWarningThreshold(e.target.value)
                              }
                              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </>
                      )}
                      {formThresholdMode === "Target Range" && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Range Min
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={formRangeMin}
                              onChange={(e) => setFormRangeMin(e.target.value)}
                              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Range Max
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={formRangeMax}
                              onChange={(e) => setFormRangeMax(e.target.value)}
                              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <input
                    type="text"
                    value={editingTarget ? formStatus : "Draft (auto-set)"}
                    readOnly
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 outline-none cursor-not-allowed capitalize"
                  />
                </div>
              </fieldset>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700/60 shrink-0">
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={setTarget.isPending}
              >
                Cancel
              </Button>
              {!editingTarget && (
                <Button
                  onClick={handleSaveDraft}
                  disabled={setTarget.isPending || isFormulaMetric}
                  variant="outline"
                >
                  {setTarget.isPending
                    ? "Saving..."
                    : isFormulaMetric
                      ? "Phase 2 Only"
                      : "Save Draft"}
                </Button>
              )}
              <Button
                onClick={handleSubmitTarget}
                disabled={setTarget.isPending || isFormulaMetric}
              >
                {setTarget.isPending
                  ? "Saving..."
                  : isFormulaMetric
                    ? "Phase 2 Only"
                    : editingTarget
                      ? "Update Target"
                      : "Submit Target"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
