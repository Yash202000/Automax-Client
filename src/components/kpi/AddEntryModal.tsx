import React, { useState, useMemo } from "react";
import { X, FileUp, Plus, Trash2, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/Button";
import { useCreateKpiEntry } from "../../hooks/useKpi";
import type {
  KpiMetric,
  KpiCalculationType,
  KpiDataSourceType,
  KpiDataQualityStatus,
  KpiEntryComponentValue,
  KpiPerformanceStatus,
} from "../../types/kpi";
import {
  getPeriodOptionsByFrequency,
  getYearOptions,
  DATA_SOURCE_TYPE_OPTIONS,
  DATA_QUALITY_STATUS_OPTIONS,
} from "../../types/kpi";

interface AddEntryModalProps {
  kpiType: string;
  kpiId: string;
  metric: KpiMetric | null;
  reportingFrequency?: string;
  kpiCode?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function calculateActual(
  calcType: KpiCalculationType,
  directVal: number | undefined,
  numVal: number | undefined,
  denomVal: number | undefined,
  components: KpiEntryComponentValue[],
): { value: number; trace: string } {
  switch (calcType) {
    case "Direct Value":
      return { value: directVal ?? 0, trace: `${directVal ?? 0}` };
    case "Percentage - Ratio": {
      const n = numVal ?? 0;
      const d = denomVal ?? 1;
      const v = d !== 0 ? (n / d) * 100 : 0;
      return { value: v, trace: `${n} / ${d} \u00D7 100 = ${v.toFixed(2)}%` };
    }
    case "Ratio": {
      const n = numVal ?? 0;
      const d = denomVal ?? 1;
      const v = d !== 0 ? n / d : 0;
      return { value: v, trace: `${n} / ${d} = ${v.toFixed(4)}` };
    }
    case "Average": {
      if (components.length === 0) return { value: 0, trace: "No components" };
      const sum = components.reduce((a, c) => a + c.value, 0);
      const v = sum / components.length;
      return {
        value: v,
        trace: `Avg of ${components.length} values = ${v.toFixed(2)}`,
      };
    }
    case "Sum": {
      const v = components.reduce((a, c) => a + c.value, 0);
      return { value: v, trace: `Sum = ${v.toFixed(2)}` };
    }
    case "Difference": {
      if (components.length < 2)
        return { value: 0, trace: "Need at least 2 components" };
      const v =
        components[0].value -
        components.slice(1).reduce((a, c) => a + c.value, 0);
      return {
        value: v,
        trace: `${components[0].value} - rest = ${v.toFixed(2)}`,
      };
    }
    case "Weighted Average": {
      if (components.length === 0) return { value: 0, trace: "No components" };
      const totalWeight = components.reduce((a, c) => a + (c.weight ?? 1), 0);
      if (totalWeight === 0) return { value: 0, trace: "Total weight is 0" };
      const weightedSum = components.reduce(
        (a, c) => a + c.value * (c.weight ?? 1),
        0,
      );
      const v = weightedSum / totalWeight;
      return { value: v, trace: `Weighted avg = ${v.toFixed(2)}` };
    }
    default:
      return { value: 0, trace: "Formula (Phase 2) - not calculated" };
  }
}

function calculateAchievement(
  actual: number,
  target: number | undefined,
  direction: string,
): { pct: number; status: KpiPerformanceStatus } {
  if (direction === "Informational" || target === undefined || target === 0) {
    return { pct: 0, status: "Informational" };
  }
  let pct: number;
  let status: KpiPerformanceStatus;
  if (direction === "Lower is Better") {
    pct = target !== 0 ? Math.max(0, ((target - actual) / target) * 100) : 0;
    pct = Math.min(100, pct);
  } else {
    pct = (actual / target) * 100;
    pct = Math.min(100, Math.max(0, pct));
  }
  if (pct >= 100) status = "Exceeded";
  else if (pct >= 80) status = "Achieved";
  else if (pct >= 50) status = "Warning";
  else status = "Below Target";
  return { pct: Math.round(pct * 100) / 100, status };
}

export const AddEntryModal: React.FC<AddEntryModalProps> = ({
  kpiType,
  kpiId,
  metric,
  reportingFrequency,
  kpiCode,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const createEntry = useCreateKpiEntry(kpiType, kpiId);

  const calcType = metric?.calculation_type ?? "Direct Value";
  const isRatioType = calcType === "Percentage - Ratio" || calcType === "Ratio";
  const isComponentType = [
    "Average",
    "Sum",
    "Difference",
    "Weighted Average",
  ].includes(calcType);
  const isFormulaType = calcType === "Formula";

  const [reportingYear, setReportingYear] = useState(new Date().getFullYear());
  const [periodCode, setPeriodCode] = useState("");
  const [directActualValue, setDirectActualValue] = useState("");
  const [numeratorValue, setNumeratorValue] = useState("");
  const [denominatorValue, setDenominatorValue] = useState("");
  const [components, setComponents] = useState<KpiEntryComponentValue[]>([
    { component: "", value: 0, weight: 1, sequence: 1 },
  ]);
  const [dataSourceType, setDataSourceType] =
    useState<KpiDataSourceType>("Manual");
  const [sourceReference, setSourceReference] = useState("");
  const [dataCutoffDate, setDataCutoffDate] = useState("");
  const [dataQualityStatus, setDataQualityStatus] =
    useState<KpiDataQualityStatus>("Complete");
  const [dataQualityNotes, setDataQualityNotes] = useState("");
  const [performanceCommentary, setPerformanceCommentary] = useState("");
  const [improvementAction, setImprovementAction] = useState("");

  const periodOptions = useMemo(
    () => getPeriodOptionsByFrequency(reportingFrequency),
    [reportingFrequency],
  );
  const yearOptions = useMemo(() => getYearOptions(), []);

  const actualCalc = useMemo(() => {
    if (isFormulaType)
      return { value: 0, trace: "Formula execution requires Phase 2" };
    return calculateActual(
      calcType,
      Number(directActualValue) || undefined,
      Number(numeratorValue) || undefined,
      Number(denominatorValue) || undefined,
      components.filter((c) => c.component.trim()),
    );
  }, [
    calcType,
    directActualValue,
    numeratorValue,
    denominatorValue,
    components,
    isFormulaType,
  ]);

  const targetVal = metric?.target_value;
  const dir = metric?.direction ?? "Higher is Better";
  const achievementInfo = useMemo(
    () => calculateAchievement(actualCalc.value, targetVal, dir),
    [actualCalc.value, targetVal, dir],
  );

  if (!isOpen) return null;

  const resetForm = () => {
    setReportingYear(new Date().getFullYear());
    setPeriodCode("");
    setDirectActualValue("");
    setNumeratorValue("");
    setDenominatorValue("");
    setComponents([{ component: "", value: 0, weight: 1, sequence: 1 }]);
    setDataSourceType("Manual");
    setSourceReference("");
    setDataCutoffDate("");
    setDataQualityStatus("Complete");
    setDataQualityNotes("");
    setPerformanceCommentary("");
    setImprovementAction("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodCode) {
      toast.error("Period is required");
      return;
    }
    if (!sourceReference.trim()) {
      toast.error("Source reference is required");
      return;
    }
    if (!dataCutoffDate) {
      toast.error("Data cut-off date is required");
      return;
    }
    if (dataQualityStatus !== "Complete" && !dataQualityNotes.trim()) {
      toast.error(
        "Data quality notes are required when status is not Complete",
      );
      return;
    }
    if (isRatioType && (!numeratorValue || !denominatorValue)) {
      toast.error("Numerator and denominator values are required");
      return;
    }
    if (isFormulaType) {
      toast.error("Formula-based entries are not available in Phase 1");
      return;
    }

    const payload: any = {
      metric_id: metric?.id ?? "",
      reporting_year: reportingYear,
      period_code: periodCode,
      data_source_type: dataSourceType,
      source_reference: sourceReference.trim(),
      data_cutoff_date: dataCutoffDate,
      data_quality_status: dataQualityStatus,
    };
    if (dataQualityNotes.trim())
      payload.data_quality_notes = dataQualityNotes.trim();
    if (performanceCommentary.trim())
      payload.performance_commentary = performanceCommentary.trim();
    if (improvementAction.trim())
      payload.improvement_action = improvementAction.trim();

    if (calcType === "Direct Value") {
      payload.direct_actual_value = Number(directActualValue);
    } else if (isRatioType) {
      payload.numerator_value = Number(numeratorValue);
      payload.denominator_value = Number(denominatorValue);
    } else if (isComponentType) {
      payload.component_values = components
        .filter((c) => c.component.trim())
        .map((c) => ({
          ...c,
          weight: c.weight ?? 1,
        }));
    }

    await createEntry.mutateAsync(payload as any);
    resetForm();
    onSuccess?.();
    onClose();
  };

  const addComponent = () => {
    setComponents((prev) => [
      ...prev,
      {
        component: "",
        value: 0,
        weight: calcType === "Weighted Average" ? 1 : undefined,
        sequence: prev.length + 1,
      },
    ]);
  };

  const removeComponent = (idx: number) => {
    setComponents((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((c, i) => ({ ...c, sequence: i + 1 })),
    );
  };

  const updateComponent = (
    idx: number,
    field: keyof KpiEntryComponentValue,
    val: any,
  ) => {
    setComponents((prev) =>
      prev.map((c, i) =>
        i === idx
          ? {
              ...c,
              [field]:
                field === "value" || field === "weight" ? Number(val) : val,
            }
          : c,
      ),
    );
  };

  if (!metric) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Add Entry — {metric.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Record a performance value for this metric
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {isFormulaType && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 p-4 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>
                Formula-based entries are not available in Phase 1. This metric
                will be supported in a future release.
              </span>
            </div>
          )}
          {metric.evidence_required && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 p-3 text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                This metric requires evidence — attach supporting documents
                before submission.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                KPI Code
              </label>
              <p className="px-3 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
                {kpiCode ?? metric?.kpi_id ?? "—"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Metric
              </label>
              <p className="px-3 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
                {metric.name}
              </p>
            </div>
          </div>

          <fieldset className="border border-slate-200 dark:border-slate-700/60 rounded-lg p-4 space-y-4">
            <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-1">
              Period
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reporting Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={reportingYear}
                  onChange={(e) => setReportingYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                  value={periodCode}
                  onChange={(e) => setPeriodCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Select period</option>
                  {periodOptions.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Period Start
                </label>
                <p className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  {periodCode
                    ? `${reportingYear}-${periodCode.toUpperCase()}-01`
                    : "—"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Period End
                </label>
                <p className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  {periodCode
                    ? `${reportingYear}-${periodCode.toUpperCase()}-28`
                    : "—"}
                </p>
              </div>
            </div>
          </fieldset>

          <fieldset className="border border-slate-200 dark:border-slate-700/60 rounded-lg p-4 space-y-3">
            <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-1">
              Metric Configuration (Snapshot)
            </legend>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500">Calc Type:</span>{" "}
                <span className="text-slate-900 dark:text-white font-medium">
                  {metric.calculation_type}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Direction:</span>{" "}
                <span className="text-slate-900 dark:text-white font-medium">
                  {metric.direction}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Unit:</span>{" "}
                <span className="text-slate-900 dark:text-white font-medium">
                  {metric.unit || "Number"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Precision:</span>{" "}
                <span className="text-slate-900 dark:text-white font-medium">
                  {metric.decimal_precision ?? 2} decimals
                </span>
              </div>
              <div>
                <span className="text-slate-500">Aggregation:</span>{" "}
                <span className="text-slate-900 dark:text-white font-medium">
                  {metric.aggregation_method}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Target:</span>{" "}
                <span className="text-slate-900 dark:text-white font-medium">
                  {metric.target_value ?? "—"}
                </span>
              </div>
            </div>
          </fieldset>

          <fieldset className="border border-slate-200 dark:border-slate-700/60 rounded-lg p-4 space-y-4">
            <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-1">
              Input Values ({calcType})
            </legend>

            {calcType === "Direct Value" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {metric.direct_actual_label || "Actual Value"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={directActualValue}
                  onChange={(e) => setDirectActualValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="0"
                />
              </div>
            )}

            {isRatioType && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {metric.numerator_label || "Numerator"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={numeratorValue}
                    onChange={(e) => setNumeratorValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {metric.denominator_label || "Denominator"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={denominatorValue}
                    onChange={(e) => setDenominatorValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
            )}

            {isComponentType && (
              <div className="space-y-3">
                {components.map((comp, idx) => (
                  <div key={idx} className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Component
                      </label>
                      <input
                        type="text"
                        value={comp.component}
                        onChange={(e) =>
                          updateComponent(idx, "component", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Label"
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Value
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={comp.value}
                        onChange={(e) =>
                          updateComponent(idx, "value", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    {calcType === "Weighted Average" && (
                      <div className="w-24">
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Weight
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={comp.weight ?? 1}
                          onChange={(e) =>
                            updateComponent(idx, "weight", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeComponent(idx)}
                      className="p-2 text-slate-400 hover:text-red-500 mb-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={addComponent}
                >
                  Add component
                </Button>
              </div>
            )}
          </fieldset>

          <fieldset className="border border-slate-200 dark:border-slate-700/60 rounded-lg p-4 space-y-4">
            <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-1">
              Data Quality
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data Source Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={dataSourceType}
                  onChange={(e) =>
                    setDataSourceType(e.target.value as KpiDataSourceType)
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {DATA_SOURCE_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Source Reference <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={sourceReference}
                  onChange={(e) => setSourceReference(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Report name, query ID, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data Cut-off Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dataCutoffDate}
                  onChange={(e) => setDataCutoffDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Quality Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={dataQualityStatus}
                  onChange={(e) =>
                    setDataQualityStatus(e.target.value as KpiDataQualityStatus)
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {DATA_QUALITY_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {dataQualityStatus !== "Complete" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data Quality Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={dataQualityNotes}
                  onChange={(e) => setDataQualityNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="Explain limitations or estimation method..."
                />
              </div>
            )}
          </fieldset>

          {!isFormulaType && (
            <fieldset className="border border-slate-200 dark:border-slate-700/60 rounded-lg p-4 space-y-4">
              <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-1">
                Narrative
              </legend>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Performance Commentary
                  {(achievementInfo.status === "Warning" ||
                    achievementInfo.status === "Below Target") && (
                    <span className="text-red-500"> *</span>
                  )}
                </label>
                <textarea
                  value={performanceCommentary}
                  onChange={(e) => setPerformanceCommentary(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="Explain the result and context..."
                />
              </div>
              {achievementInfo.status === "Below Target" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Improvement Action <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={improvementAction}
                    onChange={(e) => setImprovementAction(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    placeholder="Describe corrective or improvement actions..."
                  />
                </div>
              )}
            </fieldset>
          )}

          {!isFormulaType && actualCalc.value !== 0 && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-700/50 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-2">
              <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                Calculated Results (Preview)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-blue-600 dark:text-blue-400 text-xs">
                    Actual Value
                  </span>
                  <p className="font-semibold text-blue-900 dark:text-white tabular-nums">
                    {actualCalc.value.toFixed(metric.decimal_precision ?? 2)}
                  </p>
                </div>
                {targetVal !== undefined && (
                  <>
                    <div>
                      <span className="text-blue-600 dark:text-blue-400 text-xs">
                        Achievement
                      </span>
                      <p className="font-semibold text-blue-900 dark:text-white tabular-nums">
                        {achievementInfo.pct}%
                      </p>
                    </div>
                    <div>
                      <span className="text-blue-600 dark:text-blue-400 text-xs">
                        Variance
                      </span>
                      <p className="font-semibold text-blue-900 dark:text-white tabular-nums">
                        {(actualCalc.value - targetVal).toFixed(
                          metric.decimal_precision ?? 2,
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-blue-600 dark:text-blue-400 text-xs">
                        Status
                      </span>
                      <p className="font-semibold text-blue-900 dark:text-white">
                        {achievementInfo.status}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-blue-500 dark:text-blue-400 italic">
                {actualCalc.trace}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/60">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createEntry.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createEntry.isPending || isFormulaType}
            >
              {createEntry.isPending
                ? "Saving..."
                : isFormulaType
                  ? "Phase 2 Only"
                  : "Save Entry"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEntryModal;
