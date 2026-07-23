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
  KpiCalculationType,
  KpiDirection,
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

  useEffect(() => {
    const fromUrl = searchParams.get("kpi_code");
    if (fromUrl) setKpiCodeFilter(fromUrl);
  }, [searchParams]);

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
  const [formEffectiveFrom, setFormEffectiveFrom] = useState("");
  const [formEffectiveTo, setFormEffectiveTo] = useState("");

  const yearOptions = useMemo(() => getYearOptions(), []);
  const freq = selectedCard?.reporting_frequency;
  const periodOptions = useMemo(
    () => getPeriodOptionsByFrequency(freq),
    [freq],
  );

  const selectedMetric = (kpiMetrics ?? []).find(
    (m: any) => m.id === formMetricId,
  );
  const calcType: KpiCalculationType =
    selectedMetric?.calculation_type ?? "Direct Value";
  const direction: KpiDirection =
    selectedMetric?.direction ?? "Higher is Better";
  const isFormulaMetric = calcType === "Formula";

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
    setFormEffectiveFrom("");
    setFormEffectiveTo("");
  };

  const handleOpenModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleSubmit = async () => {
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

    await setTarget.mutateAsync({
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
      effective_from: formEffectiveFrom || undefined,
      effective_to: formEffectiveTo || undefined,
    });
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t("common.confirmDelete"))) {
      deleteTarget.mutate(id);
    }
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
            value={kpiCodeFilter}
            onChange={(e) => setKpiCodeFilter(e.target.value)}
            placeholder={t("kpi.targets.searchPlaceholder")}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 pe-8"
          />
          {kpiCodeFilter && (
            <button
              onClick={() => {
                setKpiCodeFilter("");
                setMetricFilter("");
                if (searchParams.get("kpi_code")) {
                  searchParams.delete("kpi_code");
                  setSearchParams(searchParams);
                }
              }}
              className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              title={t("common.clear")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={metricFilter}
          onChange={(e) => setMetricFilter(e.target.value)}
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
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {TARGET_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
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
                    KPI
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
                      {target.kpi_code}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {target.metric?.name ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-sm font-mono text-slate-700 dark:text-slate-300">
                      {target.target_year} / {target.period_code}
                    </td>
                    <td className="px-4 py-4 text-sm tabular-nums font-medium text-slate-900 dark:text-white ltr:text-right rtl:text-left">
                      {target.target_value ?? "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${statusColorMap[target.target_status] ?? ""}`}
                      >
                        {target.target_status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleDelete(target.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                        title={t("common.delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                    Set Target
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Define a target for a KPI metric
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
                  Identity
                </legend>
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
                    {(kpiMetrics ?? []).map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </fieldset>

              {selectedMetric && (
                <fieldset className="border border-slate-200 dark:border-slate-700/60 rounded-lg p-4 space-y-3">
                  <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-1">
                    Metric Snapshot (Immutable)
                  </legend>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">Calc Type:</span>{" "}
                      <span className="text-slate-900 dark:text-white font-medium">
                        {calcType}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Direction:</span>{" "}
                      <span className="text-slate-900 dark:text-white font-medium">
                        {direction}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Unit:</span>{" "}
                      <span className="text-slate-900 dark:text-white font-medium">
                        {selectedMetric.unit || "Number"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Precision:</span>{" "}
                      <span className="text-slate-900 dark:text-white font-medium">
                        {selectedMetric.decimal_precision ?? 2}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Frequency:</span>{" "}
                      <span className="text-slate-900 dark:text-white font-medium">
                        {freq ?? "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Aggregation:</span>{" "}
                      <span className="text-slate-900 dark:text-white font-medium">
                        {selectedMetric.aggregation_method ?? "—"}
                      </span>
                    </div>
                  </div>
                </fieldset>
              )}

              <fieldset className="border border-slate-200 dark:border-slate-700/60 rounded-lg p-4 space-y-4">
                <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-1">
                  Planning
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Target Type
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
                  Thresholds
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
              </fieldset>

              <fieldset className="border border-slate-200 dark:border-slate-700/60 rounded-lg p-4 space-y-4">
                <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-1">
                  Governance
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Effective From
                    </label>
                    <input
                      type="date"
                      value={formEffectiveFrom}
                      onChange={(e) => setFormEffectiveFrom(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Effective To
                    </label>
                    <input
                      type="date"
                      value={formEffectiveTo}
                      onChange={(e) => setFormEffectiveTo(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
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
              <Button
                onClick={handleSubmit}
                disabled={setTarget.isPending || isFormulaMetric}
              >
                {setTarget.isPending
                  ? "Saving..."
                  : isFormulaMetric
                    ? "Phase 2 Only"
                    : "Save Target"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
