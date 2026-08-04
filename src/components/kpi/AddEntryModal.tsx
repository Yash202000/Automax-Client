import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, FileUp, Plus, Trash2, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/Button";
import { useAuthStore } from "../../stores/authStore";
import {
  useCreateKpiEntry,
  useUpdateKpiEntry,
  useKpiCollaboratorAssignments,
} from "../../hooks/useKpi";
import { kpiEngagementApi, kpiPerformanceApi } from "../../api/kpi";
import { KpiEvidenceUploadModal } from "./KpiEvidenceUploadModal";
import type {
  KpiMetric,
  KpiCalculationType,
  KpiDirection,
  KpiAggregationMethod,
  KpiThresholdMode,
  KpiDataSourceType,
  KpiDataQualityStatus,
  KpiEntryComponentValue,
  KpiPerformanceStatus,
  KpiEntry,
  KpiTarget,
} from "../../types/kpi";
import {
  getPeriodOptionsByFrequency,
  getYearOptions,
  getCurrentPeriodCode,
  DATA_SOURCE_TYPE_OPTIONS,
  DATA_QUALITY_STATUS_OPTIONS,
  REPORTING_MONTHS,
  REPORTING_QUARTERS,
  REPORTING_SEMI_ANNUALS,
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
  // When provided, the modal opens in edit mode: fields are prefilled from
  // this entry and submitting calls updateEntry (PUT) instead of
  // createEntry (POST). Only draft entries should ever be passed here — the
  // backend enforces that anyway and returns a 403 otherwise.
  entry?: KpiEntry | null;
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDMY(year: number, month: number, day: number): string {
  const mon = REPORTING_MONTHS[month - 1] ?? "";
  return `${String(day).padStart(2, "0")}-${mon}-${year}`;
}

function formatDateDMY(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDMY(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Best-effort client-side preview of the period's start/end dates — the
// backend is the source of truth and computes these itself on save
// (KpiEntryRequest carries no period_start_date/period_end_date field), so
// this exists purely to render the "derived" read-only preview the mockup
// shows before the entry is ever created.
function derivePeriodRange(
  year: number,
  periodCode: string,
  frequency?: string,
): { start: string; end: string } | null {
  if (!periodCode || !year) return null;
  const freq = frequency ?? "monthly";
  const code = periodCode.toLowerCase();
  if (freq === "monthly") {
    const idx = REPORTING_MONTHS.findIndex((m) => m.toLowerCase() === code);
    if (idx === -1) return null;
    const month = idx + 1;
    return {
      start: formatDMY(year, month, 1),
      end: formatDMY(year, month, lastDayOfMonth(year, month)),
    };
  }
  if (freq === "quarterly") {
    const idx = REPORTING_QUARTERS.findIndex((q) => q.toLowerCase() === code);
    if (idx === -1) return null;
    const startMonth = idx * 3 + 1;
    const endMonth = startMonth + 2;
    return {
      start: formatDMY(year, startMonth, 1),
      end: formatDMY(year, endMonth, lastDayOfMonth(year, endMonth)),
    };
  }
  if (freq === "semi_annual" || freq === "semiannual") {
    const idx = REPORTING_SEMI_ANNUALS.findIndex(
      (h) => h.toLowerCase() === code,
    );
    if (idx === -1) return null;
    const startMonth = idx === 0 ? 1 : 7;
    const endMonth = idx === 0 ? 6 : 12;
    return {
      start: formatDMY(year, startMonth, 1),
      end: formatDMY(year, endMonth, lastDayOfMonth(year, endMonth)),
    };
  }
  if (freq === "annually" || freq === "annual") {
    return { start: formatDMY(year, 1, 1), end: formatDMY(year, 12, 31) };
  }
  return null;
}

function formatMetricValue(
  value: number | undefined,
  unit: string | undefined,
  precision: number,
): string {
  if (value === undefined || value === null) return "—";
  const v = value.toFixed(precision);
  if (!unit) return v;
  return unit === "%" ? `${v}%` : `${v} ${unit}`;
}

// ─── Calculation engine ─────────────────────────────────────────────────────

function calculateActual(
  calcType: KpiCalculationType,
  directVal: number | undefined,
  numVal: number | undefined,
  denomVal: number | undefined,
  components: KpiEntryComponentValue[],
  precision: number,
): { value: number; trace: string } {
  switch (calcType) {
    case "Direct Value":
      return { value: directVal ?? 0, trace: `${fmtNum(directVal ?? 0)}` };
    case "Percentage - Ratio": {
      const n = numVal ?? 0;
      const d = denomVal ?? 1;
      const v = d !== 0 ? (n / d) * 100 : 0;
      return {
        value: v,
        trace: `${fmtNum(n)} / ${fmtNum(d)} × 100 = ${v.toFixed(precision)}%`,
      };
    }
    case "Ratio": {
      const n = numVal ?? 0;
      const d = denomVal ?? 1;
      const v = d !== 0 ? n / d : 0;
      return {
        value: v,
        trace: `${fmtNum(n)} / ${fmtNum(d)} = ${v.toFixed(precision)}`,
      };
    }
    case "Average": {
      if (components.length === 0) return { value: 0, trace: "No components" };
      const sum = components.reduce((a, c) => a + c.value, 0);
      const v = sum / components.length;
      return {
        value: v,
        trace: `Avg of ${components.length} values = ${v.toFixed(precision)}`,
      };
    }
    case "Sum": {
      const v = components.reduce((a, c) => a + c.value, 0);
      return { value: v, trace: `Sum = ${v.toFixed(precision)}` };
    }
    case "Difference": {
      if (components.length < 2)
        return { value: 0, trace: "Need at least 2 components" };
      const v =
        components[0].value -
        components.slice(1).reduce((a, c) => a + c.value, 0);
      return {
        value: v,
        trace: `${fmtNum(components[0].value)} - rest = ${v.toFixed(precision)}`,
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
      return { value: v, trace: `Weighted avg = ${v.toFixed(precision)}` };
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

const PERFORMANCE_STATUS_COLORS: Record<string, string> = {
  Exceeded:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Achieved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Warning:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Below Target":
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "In Range":
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "Out of Range":
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Informational:
    "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  "Not Calculable":
    "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

// ─── Small presentational helpers ───────────────────────────────────────────

function SectionCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 p-5">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-700/60">
        <h4 className="text-base font-semibold text-slate-900 dark:text-white">
          {title}
        </h4>
        {badge}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  hint,
  title,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  title?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <div
        title={title}
        className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700/60 truncate"
      >
        {value ?? "—"}
      </div>
      {hint && (
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

function ResultTile({
  label,
  value,
  pill,
}: {
  label: string;
  value?: React.ReactNode;
  pill?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/40 p-3">
      <div className="text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
        {label}
      </div>
      {pill ?? (
        <div className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-white">
          {value}
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-60 disabled:cursor-not-allowed";
const labelClass =
  "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

export const AddEntryModal: React.FC<AddEntryModalProps> = ({
  kpiType,
  kpiId,
  metric,
  reportingFrequency,
  kpiCode,
  isOpen,
  onClose,
  onSuccess,
  entry,
}) => {
  const isEditMode = !!entry;
  const createEntry = useCreateKpiEntry(kpiType, kpiId);
  const updateEntry = useUpdateKpiEntry();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [reportingYear, setReportingYear] = useState(new Date().getFullYear());
  // Defaults to the ACTUAL current period (not blank) — a blank value has no
  // matching <option>, so the <select> visually shows its first option
  // ("Jan") without that ever being the real selected value, making it easy
  // to submit an entry for the wrong period without noticing.
  const [periodCode, setPeriodCode] = useState(() =>
    getCurrentPeriodCode(reportingFrequency),
  );
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
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<"draft" | "submit" | null>(
    null,
  );

  // ── Snapshot fields — in edit mode always prefer the entry's own
  // *_snapshot columns (the truly immutable values captured at creation
  // time) over the live metric, since the metric's configuration may have
  // drifted since. In create mode there is no snapshot yet, so the live
  // metric is the best preview of what will be snapshotted on save.
  const calcType: KpiCalculationType =
    isEditMode && entry
      ? entry.calculation_type_snapshot
      : (metric?.calculation_type ?? "Direct Value");
  const direction: KpiDirection =
    isEditMode && entry
      ? entry.direction_snapshot
      : (metric?.direction ?? "Higher is Better");
  const unit: string | undefined =
    isEditMode && entry ? entry.unit_snapshot : metric?.unit;
  const precision: number =
    (isEditMode && entry
      ? entry.decimal_precision_snapshot
      : metric?.decimal_precision) ?? 2;
  const aggregation: KpiAggregationMethod | undefined =
    isEditMode && entry
      ? entry.aggregation_method_snapshot
      : metric?.aggregation_method;
  const numeratorLabel =
    (isEditMode && entry
      ? entry.numerator_label_snapshot
      : metric?.numerator_label) || "Numerator";
  const denominatorLabel =
    (isEditMode && entry
      ? entry.denominator_label_snapshot
      : metric?.denominator_label) || "Denominator";

  const isRatioType = calcType === "Percentage - Ratio" || calcType === "Ratio";
  const isComponentType = [
    "Average",
    "Sum",
    "Difference",
    "Weighted Average",
  ].includes(calcType);
  const isFormulaType = calcType === "Formula";

  const periodOptions = useMemo(
    () => getPeriodOptionsByFrequency(reportingFrequency),
    [reportingFrequency],
  );
  const yearOptions = useMemo(() => getYearOptions(), []);

  // ── Approved-target lookup for create mode. Scoped tightly (kpi_code +
  // metric + year + period) and only enabled while the modal is open and
  // in create mode, so it never fires an unfiltered "all targets" query on
  // mount — this is a local query rather than the shared useKpiTargets hook
  // because that hook has no `enabled` gate and would otherwise refetch on
  // every render of every page that mounts this modal.
  const targetLookupEnabled =
    isOpen &&
    !isEditMode &&
    !!kpiCode &&
    !!metric?.id &&
    !!reportingYear &&
    !!periodCode;
  const { data: liveTargetsRes } = useQuery({
    queryKey: [
      "kpi",
      "targets",
      "lookup",
      kpiCode,
      metric?.id,
      reportingYear,
      periodCode,
    ],
    queryFn: () =>
      kpiPerformanceApi.listTargets({
        kpi_code: kpiCode,
        metric_id: metric?.id,
        year: reportingYear,
        period_code: periodCode,
      }),
    enabled: targetLookupEnabled,
  });
  const liveTargets: KpiTarget[] = liveTargetsRes?.data ?? [];
  const approvedTarget: KpiTarget | undefined = liveTargets.find(
    (t) => t.target_status === "approved",
  );
  // REL-09: entry creation is hard-blocked server-side without a genuinely
  // approved target for this exact metric+period, so the UI must not treat a
  // draft/submitted target as usable here — surface the block before the user
  // hits submit rather than only after a server error.
  const targetLookupResolved =
    targetLookupEnabled && liveTargetsRes !== undefined;
  const noApprovedTargetForPeriod = targetLookupResolved && !approvedTarget;

  const targetVal: number | undefined =
    isEditMode && entry
      ? entry.target_value_snapshot
      : approvedTarget?.target_value;
  const targetId: string | undefined =
    isEditMode && entry ? entry.target_id : approvedTarget?.id;
  const thresholdMode: KpiThresholdMode | undefined =
    isEditMode && entry
      ? entry.threshold_mode_snapshot
      : approvedTarget?.threshold_mode;
  const targetStatus: string | undefined = approvedTarget?.target_status;

  // ── Collaborator access banner ──────────────────────────────────────────
  const { data: collaboratorAssignments } = useKpiCollaboratorAssignments(
    kpiType,
    kpiId,
  );
  const myAssignment = useMemo(() => {
    if (!currentUser || !collaboratorAssignments) return undefined;
    const now = new Date();
    const mine = collaboratorAssignments.filter(
      (a) => a.user_id === currentUser.id,
    );
    const active = mine.filter((a) => {
      if (!a.is_active) return false;
      if (new Date(a.effective_from) > now) return false;
      if (a.effective_to && new Date(a.effective_to) < now) return false;
      return true;
    });
    if (active.length === 0) return mine[0];
    const metricMatch = active.filter(
      (a) =>
        a.metric_scope === "All Metrics" ||
        (a.metric_scope === "Selected Metrics" &&
          metric &&
          a.metric_scope_ids?.includes(metric.id)),
    );
    const pool = metricMatch.length > 0 ? metricMatch : active;
    const periodMatch = pool.filter((a) => {
      if (
        a.period_scope === "All Periods" ||
        a.period_scope === "Current Period"
      )
        return true;
      if (a.period_scope === "Specific Year")
        return a.period_scope_year === reportingYear;
      if (a.period_scope === "Specific Periods")
        return a.period_scope_periods?.includes(periodCode);
      return true;
    });
    return periodMatch[0] ?? pool[0] ?? active[0];
  }, [currentUser, collaboratorAssignments, metric, reportingYear, periodCode]);

  const assignmentIsActive =
    !!myAssignment &&
    myAssignment.is_active &&
    new Date(myAssignment.effective_from) <= new Date() &&
    (!myAssignment.effective_to ||
      new Date(myAssignment.effective_to) >= new Date());

  const inScope =
    !!myAssignment &&
    (myAssignment.metric_scope === "All Metrics" ||
      (!!metric && !!myAssignment.metric_scope_ids?.includes(metric.id))) &&
    (myAssignment.period_scope === "All Periods" ||
      myAssignment.period_scope === "Current Period" ||
      (myAssignment.period_scope === "Specific Year" &&
        myAssignment.period_scope_year === reportingYear) ||
      (myAssignment.period_scope === "Specific Periods" &&
        !!myAssignment.period_scope_periods?.includes(periodCode)));

  // Fallback when no collaborator-assignment record exists for this user on
  // this KPI — use their system role as the closest available label rather
  // than fabricating a collaborator type.
  const collaboratorTypeLabel =
    myAssignment?.collaborator_type ??
    currentUser?.roles?.[0]?.name ??
    "Collaborator";

  const actualCalc = useMemo(() => {
    if (isFormulaType)
      return { value: 0, trace: "Formula execution requires Phase 2" };
    return calculateActual(
      calcType,
      Number(directActualValue) || undefined,
      Number(numeratorValue) || undefined,
      Number(denominatorValue) || undefined,
      components.filter((c) => c.component.trim()),
      precision,
    );
  }, [
    calcType,
    directActualValue,
    numeratorValue,
    denominatorValue,
    components,
    isFormulaType,
    precision,
  ]);

  const achievementInfo = useMemo(
    () => calculateAchievement(actualCalc.value, targetVal, direction),
    [actualCalc.value, targetVal, direction],
  );

  const periodPreview =
    isEditMode && entry
      ? {
          start: formatDateDMY(entry.period_start),
          end: formatDateDMY(entry.period_end),
        }
      : derivePeriodRange(reportingYear, periodCode, reportingFrequency);

  const resetForm = () => {
    setReportingYear(new Date().getFullYear());
    setPeriodCode(getCurrentPeriodCode(reportingFrequency));
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

  // Prefill from the existing entry when opening in edit mode; reset to a
  // blank form when opening in create mode. Runs on isOpen/entry change
  // rather than mount, since this component instance stays mounted across
  // opens/closes in its parent.
  useEffect(() => {
    if (!isOpen) return;
    if (entry) {
      setReportingYear(entry.reporting_year);
      setPeriodCode(entry.period_code);
      setDirectActualValue(
        entry.direct_actual_value != null
          ? String(entry.direct_actual_value)
          : "",
      );
      setNumeratorValue(
        entry.numerator_value != null ? String(entry.numerator_value) : "",
      );
      setDenominatorValue(
        entry.denominator_value != null ? String(entry.denominator_value) : "",
      );
      setComponents(
        entry.component_values && entry.component_values.length > 0
          ? entry.component_values
          : [{ component: "", value: 0, weight: 1, sequence: 1 }],
      );
      setDataSourceType(entry.data_source_type);
      setSourceReference(entry.source_reference ?? "");
      setDataCutoffDate(
        entry.data_cutoff_date ? entry.data_cutoff_date.slice(0, 10) : "",
      );
      setDataQualityStatus(entry.data_quality_status);
      setDataQualityNotes(entry.data_quality_notes ?? "");
      setPerformanceCommentary(entry.performance_commentary ?? "");
      setImprovementAction(entry.improvement_action ?? "");
    } else {
      resetForm();
    }
  }, [isOpen, entry]);

  if (!isOpen) return null;

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Attempts to move a freshly created/updated draft entry straight to
  // "submitted" using whatever transition the backend's workflow currently
  // offers for it. This only orchestrates existing endpoints
  // (getAvailableEntryTransitions / transitionEntry) — if no "submit"
  // transition is available (e.g. missing permission, or the workflow
  // requires something else first) the entry is left as the draft that was
  // just saved and the user is told why.
  const attemptSubmitTransition = async (entryId: string) => {
    try {
      const transRes =
        await kpiEngagementApi.getAvailableEntryTransitions(entryId);
      const submitTransition = (transRes.data ?? []).find(
        (t) => t.code === "submit",
      );
      if (!submitTransition) {
        toast.info(
          "Entry saved as draft — a submit transition isn't available for it right now.",
        );
        return;
      }
      await kpiEngagementApi.transitionEntry(entryId, submitTransition.id);
      queryClient.invalidateQueries({ queryKey: ["kpi", "entries", "all"] });
      queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey as unknown[];
          return (
            key[0] === "kpi" && key[1] === "engagement" && key[4] === "entries"
          );
        },
      });
      queryClient.invalidateQueries({ queryKey: ["kpi", "entries", entryId] });
      toast.success("Entry submitted for review");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error || err?.message || "Could not submit entry";
      toast.error(`Entry saved as draft — ${msg}`);
    }
  };

  const handleSave = async (action: "draft" | "submit") => {
    if (!periodCode) {
      toast.error("Reporting period is required");
      return;
    }
    if (!sourceReference.trim()) {
      toast.error("Source system / reference is required");
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
      toast.error(
        `${numeratorLabel} and ${denominatorLabel} values are required`,
      );
      return;
    }
    if (
      (achievementInfo.status === "Warning" ||
        achievementInfo.status === "Below Target") &&
      !performanceCommentary.trim()
    ) {
      toast.error("Performance commentary is required for this result");
      return;
    }
    if (
      (achievementInfo.status === "Warning" ||
        achievementInfo.status === "Below Target") &&
      !improvementAction.trim()
    ) {
      toast.error(
        "Improvement action is required for warning or below-target results",
      );
      return;
    }
    if (isFormulaType) {
      toast.error("Formula-based entries are not available in Phase 1");
      return;
    }
    if (!isEditMode && noApprovedTargetForPeriod) {
      toast.error(
        "No approved target exists for this period — create and approve a target first",
      );
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

    setPendingAction(action);
    try {
      if (isEditMode && entry) {
        // metric_id/reporting_year/period_code can't change after creation —
        // KpiEntryUpdateRequest omits them, so strip before sending.
        const { metric_id, reporting_year, period_code, ...updatePayload } =
          payload;
        await updateEntry.mutateAsync({
          type: kpiType,
          id: kpiId,
          entryId: entry.id,
          data: updatePayload,
        });
        if (action === "submit") await attemptSubmitTransition(entry.id);
      } else {
        const created = await createEntry.mutateAsync(payload as any);
        if (action === "submit" && created?.data?.id) {
          await attemptSubmitTransition(created.data.id);
        }
      }
      resetForm();
      onSuccess?.();
      onClose();
    } finally {
      setPendingAction(null);
    }
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

  const isSaving =
    createEntry.isPending || updateEntry.isPending || pendingAction !== null;
  const draftBadgeLabel =
    isEditMode && entry
      ? `${entry.status.charAt(0).toUpperCase()}${entry.status.slice(1)} · Version ${entry.entry_version}`
      : "Draft · Version 1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {isEditMode ? "Edit KPI Entry" : "Add KPI Entry"} —{" "}
                {metric.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Capture actual performance for a valid period. Configuration and
                target fields are inherited and read-only.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-full whitespace-nowrap">
              {draftBadgeLabel}
            </span>
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {/* Access-validated banner */}
          <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
            Access validated: <strong>{collaboratorTypeLabel}</strong> ·{" "}
            {myAssignment
              ? assignmentIsActive
                ? "Active assignment"
                : "Assignment not currently active"
              : "No assignment record found"}{" "}
            ·{" "}
            {inScope
              ? "In scope for this KPI and period"
              : "Scope not confirmed for this KPI/period"}
          </div>

          {isFormulaType && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 p-4 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>
                Formula-based entries are not available in Phase 1. This metric
                will be supported in a future release.
              </span>
            </div>
          )}
          {!isEditMode && noApprovedTargetForPeriod && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 p-4 text-sm text-red-700 dark:text-red-400 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>
                No approved target exists for this metric in {periodCode}/
                {reportingYear}. Create and approve a target on the Targets page
                before recording an entry for this period.
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

          {/* Identity & Period */}
          <SectionCard title="Identity & Period">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ReadOnlyField
                label="KPI Code"
                value={kpiCode ?? metric?.kpi_id ?? "—"}
              />
              <div>
                <label className={labelClass}>
                  Metric <span className="text-red-500">*</span>
                </label>
                <select
                  disabled
                  value={metric.id}
                  className={inputClass + " bg-slate-100 dark:bg-slate-900/60"}
                >
                  <option value={metric.id}>{metric.name}</option>
                </select>
              </div>
              <ReadOnlyField
                label="Collaborator Type"
                value={collaboratorTypeLabel}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>
                  Reporting Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={reportingYear}
                  onChange={(e) => setReportingYear(Number(e.target.value))}
                  disabled={isEditMode}
                  title={
                    isEditMode
                      ? "Year can't be changed after creation — delete and recreate instead"
                      : undefined
                  }
                  className={inputClass}
                >
                  {yearOptions.map((y) => (
                    <option key={y.value} value={y.value}>
                      {y.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  Reporting Period <span className="text-red-500">*</span>
                </label>
                <select
                  value={periodCode}
                  onChange={(e) => setPeriodCode(e.target.value)}
                  disabled={isEditMode}
                  title={
                    isEditMode
                      ? "Period can't be changed after creation — delete and recreate instead"
                      : undefined
                  }
                  className={inputClass}
                >
                  <option value="">Select period</option>
                  {periodOptions.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <ReadOnlyField
                label="Period Start"
                value={periodPreview?.start ?? "—"}
              />
              <ReadOnlyField
                label="Period End"
                value={periodPreview?.end ?? "—"}
              />
            </div>
          </SectionCard>

          {/* Metric & Target Snapshot */}
          <SectionCard
            title="Metric & Target Snapshot"
            badge={
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-full">
                Immutable snapshot
              </span>
            }
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ReadOnlyField label="Calculation Type" value={calcType} />
              <ReadOnlyField label="Direction" value={direction} />
              <ReadOnlyField
                label="Unit / Precision"
                value={`${unit || "Number"} · ${precision} decimal${precision === 1 ? "" : "s"}`}
              />
              <ReadOnlyField label="Aggregation" value={aggregation ?? "—"} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <ReadOnlyField
                label="Approved Target"
                title={targetId}
                value={
                  targetVal !== undefined
                    ? formatMetricValue(targetVal, unit, precision)
                    : "—"
                }
              />
              <ReadOnlyField
                label="Threshold Mode"
                value={thresholdMode ?? "—"}
              />
              <ReadOnlyField
                label="Target Status"
                value={targetStatus ?? "—"}
              />
            </div>
          </SectionCard>

          {/* Actual Inputs */}
          <SectionCard title="Actual Inputs">
            {calcType === "Direct Value" && (
              <div>
                <label className={labelClass}>
                  {metric.direct_actual_label || "Actual Value"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={directActualValue}
                  onChange={(e) => setDirectActualValue(e.target.value)}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
            )}

            {isRatioType && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>
                    {numeratorLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={numeratorValue}
                    onChange={(e) => setNumeratorValue(e.target.value)}
                    className={inputClass}
                    placeholder="0"
                  />
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Numerator label inherited from Metric.
                  </p>
                </div>
                <div>
                  <label className={labelClass}>
                    {denominatorLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={denominatorValue}
                    onChange={(e) => setDenominatorValue(e.target.value)}
                    className={inputClass}
                    placeholder="0"
                  />
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Denominator cannot be zero.
                  </p>
                </div>
                <div>
                  <ReadOnlyField
                    label="Calculated Actual"
                    value={
                      calcType === "Percentage - Ratio"
                        ? `${actualCalc.value.toFixed(precision)}%`
                        : actualCalc.value.toFixed(precision)
                    }
                  />
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Cannot be manually overwritten.
                  </p>
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
                        className={inputClass}
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
                        className={inputClass}
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
                          className={inputClass}
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
                <ReadOnlyField
                  label="Calculated Actual"
                  value={formatMetricValue(actualCalc.value, unit, precision)}
                  hint="Cannot be manually overwritten."
                />
              </div>
            )}

            {!isFormulaType && (
              <div>
                <label className={labelClass}>Calculation Trace</label>
                <div className="px-3 py-2.5 text-sm font-mono text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  {actualCalc.trace}
                </div>
              </div>
            )}

            {!isFormulaType && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ResultTile
                  label="Actual"
                  value={formatMetricValue(actualCalc.value, unit, precision)}
                />
                <ResultTile
                  label="Target"
                  value={
                    targetVal !== undefined
                      ? formatMetricValue(targetVal, unit, precision)
                      : "—"
                  }
                />
                <ResultTile
                  label="Achievement"
                  value={
                    achievementInfo.status === "Informational"
                      ? "—"
                      : `${achievementInfo.pct}%`
                  }
                />
                <ResultTile
                  label="Performance Status"
                  pill={
                    <span
                      className={`inline-flex mt-1 items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        PERFORMANCE_STATUS_COLORS[achievementInfo.status] ??
                        PERFORMANCE_STATUS_COLORS.Informational
                      }`}
                    >
                      {achievementInfo.status}
                    </span>
                  }
                />
              </div>
            )}
          </SectionCard>

          {/* Data Quality & Evidence */}
          <SectionCard title="Data Quality & Evidence">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>
                  Data Source Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={dataSourceType}
                  onChange={(e) =>
                    setDataSourceType(e.target.value as KpiDataSourceType)
                  }
                  className={inputClass}
                >
                  {DATA_SOURCE_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  Source System / Reference{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={sourceReference}
                  onChange={(e) => setSourceReference(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. EcoCycle / JAN-2026-CLEAN-01"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Data Cut-off Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dataCutoffDate}
                  onChange={(e) => setDataCutoffDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Data Quality Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={dataQualityStatus}
                  onChange={(e) =>
                    setDataQualityStatus(e.target.value as KpiDataQualityStatus)
                  }
                  className={inputClass}
                >
                  {DATA_QUALITY_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>
                  Data Quality Notes
                  {dataQualityStatus !== "Complete" && (
                    <span className="text-red-500"> *</span>
                  )}
                </label>
                <input
                  type="text"
                  value={dataQualityNotes}
                  onChange={(e) => setDataQualityNotes(e.target.value)}
                  className={inputClass}
                  placeholder="Required when status is not Complete"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                Evidence Items
                {metric.evidence_required && (
                  <span className="text-red-500"> *</span>
                )}
              </label>
              <div className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Drop files here or add a certified report link
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setShowEvidenceModal(true)}
                >
                  Add Evidence
                </Button>
              </div>
              {isEditMode && entry && entry.evidence_count > 0 && (
                <ul className="mt-2 space-y-1">
                  {(entry.evidence ?? []).map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 rounded-lg px-3 py-1.5"
                    >
                      <span className="truncate">{ev.title}</span>
                      <span className="text-slate-400">{ev.evidence_type}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SectionCard>

          {/* Narrative */}
          {!isFormulaType && (
            <SectionCard title="Narrative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Performance Commentary
                    {(achievementInfo.status === "Warning" ||
                      achievementInfo.status === "Below Target") && (
                      <span className="text-red-500"> *</span>
                    )}
                  </label>
                  <textarea
                    value={performanceCommentary}
                    onChange={(e) => setPerformanceCommentary(e.target.value)}
                    rows={3}
                    className={inputClass + " resize-none"}
                    placeholder="Explain the result and context..."
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Improvement Action
                    {(achievementInfo.status === "Warning" ||
                      achievementInfo.status === "Below Target") && (
                      <span className="text-red-500"> *</span>
                    )}
                  </label>
                  <textarea
                    value={improvementAction}
                    onChange={(e) => setImprovementAction(e.target.value)}
                    rows={3}
                    className={inputClass + " resize-none"}
                    placeholder="Required for warning or below-target results"
                  />
                </div>
              </div>
            </SectionCard>
          )}
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700/60 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSave("draft")}
            disabled={isSaving || isFormulaType || noApprovedTargetForPeriod}
            title={
              noApprovedTargetForPeriod
                ? "No approved target exists for this period"
                : undefined
            }
          >
            {pendingAction === "draft" ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            type="button"
            onClick={() => handleSave("submit")}
            disabled={isSaving || isFormulaType || noApprovedTargetForPeriod}
            title={
              noApprovedTargetForPeriod
                ? "No approved target exists for this period"
                : undefined
            }
          >
            {pendingAction === "submit"
              ? "Submitting..."
              : isFormulaType
                ? "Phase 2 Only"
                : noApprovedTargetForPeriod
                  ? "No Target Approved"
                  : "Submit Entry"}
          </Button>
        </div>
      </div>

      <KpiEvidenceUploadModal
        kpiType={kpiType}
        kpiId={kpiId}
        metrics={metric ? [metric] : undefined}
        isOpen={showEvidenceModal}
        onClose={() => setShowEvidenceModal(false)}
      />
    </div>
  );
};

export default AddEntryModal;
