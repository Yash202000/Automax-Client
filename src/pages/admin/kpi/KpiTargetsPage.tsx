import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Crosshair, Plus, AlertCircle, X, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import {
  useKpiTargets,
  useSetKpiTarget,
  useUpdateKpiTarget,
  useDeleteKpiTarget,
  useTransitionKpiTarget,
  useKpiCardDefinitions,
  useKpiMetricsByCode,
} from "../../../hooks/useKpi";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
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
  REPORTING_MONTHS,
  REPORTING_QUARTERS,
  REPORTING_SEMI_ANNUALS,
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

// Presentational-only IDs (backend targets don't ship a human code today) —
// derived from the real record id so it stays stable per target.
function formatTargetId(id: string): string {
  return `TGT-${id
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase()}`;
}

function formatPeriodLabel(year: number, periodCode: string): string {
  const code = periodCode.toLowerCase();
  const monthIdx = REPORTING_MONTHS.findIndex((m) => m.toLowerCase() === code);
  if (monthIdx >= 0) return `${REPORTING_MONTHS[monthIdx]} ${year}`;
  const quarterIdx = REPORTING_QUARTERS.findIndex(
    (q) => q.toLowerCase() === code,
  );
  if (quarterIdx >= 0) return `${REPORTING_QUARTERS[quarterIdx]} ${year}`;
  const halfIdx = REPORTING_SEMI_ANNUALS.findIndex(
    (h) => h.toLowerCase() === code,
  );
  if (halfIdx >= 0) return `${REPORTING_SEMI_ANNUALS[halfIdx]} ${year}`;
  if (code === "annual") return `Annual ${year}`;
  return periodCode ? `${periodCode} ${year}` : "—";
}

// Target values are only percentage-formatted when the metric's calculation
// method actually produces a ratio/percentage; everything else is a plain number.
function formatTargetValue(
  value: number | undefined | null,
  calculationType: string | undefined,
): string {
  if (value == null) return "—";
  return calculationType === "Percentage - Ratio"
    ? `${value.toFixed(2)}%`
    : value.toLocaleString();
}

function getPeriodStartEnd(
  year: number,
  periodCode: string,
): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const code = periodCode.toLowerCase();

  const monthIdx = REPORTING_MONTHS.findIndex((m) => m.toLowerCase() === code);
  if (monthIdx >= 0) {
    const start = `${year}-${pad(monthIdx + 1)}-01`;
    const lastDay = new Date(year, monthIdx + 1, 0).getDate();
    const end = `${year}-${pad(monthIdx + 1)}-${pad(lastDay)}`;
    return { start, end };
  }

  const quarterRanges: Record<string, [number, number]> = {
    q1: [0, 2],
    q2: [3, 5],
    q3: [6, 8],
    q4: [9, 11],
  };
  if (quarterRanges[code]) {
    const [startMonth, endMonth] = quarterRanges[code];
    const start = `${year}-${pad(startMonth + 1)}-01`;
    const lastDay = new Date(year, endMonth + 1, 0).getDate();
    const end = `${year}-${pad(endMonth + 1)}-${pad(lastDay)}`;
    return { start, end };
  }

  const halfRanges: Record<string, [number, number]> = {
    h1: [0, 5],
    h2: [6, 11],
  };
  if (halfRanges[code]) {
    const [startMonth, endMonth] = halfRanges[code];
    const start = `${year}-${pad(startMonth + 1)}-01`;
    const lastDay = new Date(year, endMonth + 1, 0).getDate();
    const end = `${year}-${pad(endMonth + 1)}-${pad(lastDay)}`;
    return { start, end };
  }

  if (code === "annual") {
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }

  return { start: "", end: "" };
}

function formatDateDisplay(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-").map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}-${REPORTING_MONTHS[m - 1] ?? m}-${y}`;
}

type FormMode = "create" | "edit" | "view";

// Row-level Actions column links vary by target_status, mirroring the
// approved reference UI (Approved -> View/Copy/Supersede, Draft -> Edit/Submit).
// Delete isn't in the mockup's Actions column, but there's otherwise no way
// to remove a target at all from the UI despite the backend fully
// supporting it — added for draft/returned/rejected targets only, same
// statuses the backend's DeleteTarget/UpdateTarget endpoints allow editing.
function getActionLinks(
  target: KpiTarget,
  handlers: {
    onView: (t: KpiTarget) => void;
    onEdit: (t: KpiTarget) => void;
    onCopy: (t: KpiTarget) => void;
    onSupersede: (t: KpiTarget) => void;
    onQuickSubmit: (t: KpiTarget) => void;
    onDelete: (t: KpiTarget) => void;
    onApprove: (t: KpiTarget) => void;
    onReject: (t: KpiTarget) => void;
  },
): { label: string; onClick: () => void }[] {
  switch (target.target_status) {
    case "draft":
    case "returned":
    case "rejected":
      return [
        { label: "Edit", onClick: () => handlers.onEdit(target) },
        { label: "Submit", onClick: () => handlers.onQuickSubmit(target) },
        { label: "Delete", onClick: () => handlers.onDelete(target) },
      ];
    case "submitted":
      return [
        { label: "View", onClick: () => handlers.onView(target) },
        { label: "Approve", onClick: () => handlers.onApprove(target) },
        { label: "Reject", onClick: () => handlers.onReject(target) },
      ];
    case "approved":
      return [
        { label: "View", onClick: () => handlers.onView(target) },
        { label: "Copy", onClick: () => handlers.onCopy(target) },
        { label: "Supersede", onClick: () => handlers.onSupersede(target) },
      ];
    case "superseded":
      return [
        { label: "View", onClick: () => handlers.onView(target) },
        { label: "Copy", onClick: () => handlers.onCopy(target) },
      ];
    default:
      // locked — awaiting workflow, read-only for now.
      return [{ label: "View", onClick: () => handlers.onView(target) }];
  }
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

  // Drop a stale metric selection from a previous search — the Metric
  // dropdown's options are about to change with the new KPI code.
  useEffect(() => {
    setPendingMetricFilter("");
  }, [pendingKpiCode]);

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

  // Keyed off pendingKpiCode (what's typed right now), not the applied
  // kpiCodeFilter (only updated by the Apply button) — the Metric/Period
  // dropdowns are search assistance and should react as you type; only the
  // actual results table (useKpiTargets below) waits for Apply.
  const selectedCard = cardOptions.find((c) => c.code === pendingKpiCode);
  // Fetch metrics directly off the typed KPI code, not gated behind finding a
  // match in cardOptions first — the API only ever needed the code string,
  // and requiring a cardOptions match caused the Metric dropdown to stay
  // empty for any KPI not present in that separately-loaded list, even
  // though /kpi/metrics-by-code/:code itself returns data just fine.
  const { data: kpiMetrics } = useKpiMetricsByCode(pendingKpiCode || undefined);

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
  const updateTarget = useUpdateKpiTarget();
  const isSavingTarget = setTarget.isPending || updateTarget.isPending;
  const deleteTarget = useDeleteKpiTarget();
  const [deleteConfirmTarget, setDeleteConfirmTarget] =
    useState<KpiTarget | null>(null);
  const handleConfirmDeleteTarget = async () => {
    if (!deleteConfirmTarget) return;
    await deleteTarget.mutateAsync(deleteConfirmTarget.id);
    setDeleteConfirmTarget(null);
  };

  const transitionTarget = useTransitionKpiTarget();
  const handleApproveTarget = async (target: KpiTarget) => {
    await transitionTarget.mutateAsync({ id: target.id, action: "approve" });
  };
  const handleRejectTarget = async (target: KpiTarget) => {
    await transitionTarget.mutateAsync({ id: target.id, action: "reject" });
  };

  // ─── Create / Edit Target — inline section (approved reference UI keeps
  // this below the table rather than in a modal; see report for rationale) ──
  const formSectionRef = useRef<HTMLDivElement>(null);
  const [formMode, setFormMode] = useState<FormMode>("create");
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

  const formReadOnly = formMode === "view";

  const { data: formMetrics } = useKpiMetricsByCode(formKpiCode || undefined);

  const yearOptions = useMemo(() => getYearOptions(), []);
  // Fall back to the fetched metrics' own reporting_frequency when the KPI
  // isn't present in cardOptions — same class of bug as the Metric dropdown
  // above: don't let a secondary, separately-loaded list gate data we
  // already fetched directly off the typed KPI code.
  const freq =
    selectedCard?.reporting_frequency || kpiMetrics?.[0]?.reporting_frequency;
  const periodOptions = useMemo(
    () => getPeriodOptionsByFrequency(freq),
    [freq],
  );
  const formCard = cardOptions.find((c) => c.code === formKpiCode);
  const formFreq =
    formCard?.reporting_frequency || formMetrics?.[0]?.reporting_frequency;
  const formPeriodOptions = useMemo(
    () => getPeriodOptionsByFrequency(formFreq),
    [formFreq],
  );

  const selectedMetric = (formMetrics ?? kpiMetrics ?? []).find(
    (m: any) => m.id === formMetricId,
  );
  const calcType: string = selectedMetric?.calculation_type ?? "";
  const direction: string = selectedMetric?.direction ?? "";
  const isFormulaMetric = calcType === "Formula";

  const periodDates = getPeriodStartEnd(formYear, formPeriodCode);

  // Ref reads only ever happen inside this effect (never during render or in
  // a plain function called from render) — scrollToForm just requests a
  // scroll by bumping a token, satisfying the react-hooks/refs rule.
  const [scrollToken, setScrollToken] = useState(0);
  useEffect(() => {
    if (scrollToken === 0) return;
    formSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [scrollToken]);

  const scrollToForm = () => {
    setScrollToken((t) => t + 1);
  };

  const resetForm = () => {
    setFormMode("create");
    setFormKpiCode(kpiCodeFilter || "");
    setFormKpiType(
      selectedCard?.type ?? kpiMetrics?.[0]?.kpi_type ?? "strategic",
    );
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

  const handleOpenCreate = () => {
    resetForm();
    scrollToForm();
  };

  const populateFormFromTarget = (target: KpiTarget) => {
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
  };

  const handleEditTarget = (target: KpiTarget) => {
    setEditingTarget(target);
    setFormMode("edit");
    populateFormFromTarget(target);
    scrollToForm();
  };

  const handleViewTarget = (target: KpiTarget) => {
    setEditingTarget(target);
    setFormMode("view");
    populateFormFromTarget(target);
    scrollToForm();
  };

  // Copy and Supersede both open a prefilled *new* draft target. The
  // KpiAnnualTargetRequest payload has no supersedes_entry_id field to send,
  // so a true supersession link can't be created from this form today —
  // Supersede intentionally behaves like Copy until the backend exposes one.
  const handleCopyTarget = (target: KpiTarget) => {
    resetForm();
    populateFormFromTarget(target);
    setEditingTarget(null);
    setFormMode("create");
    scrollToForm();
  };

  const handleSupersedeTarget = (target: KpiTarget) => {
    handleCopyTarget(target);
  };

  const handleCancelForm = () => {
    resetForm();
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

    // Editing an existing target must PUT to it, not POST a new one —
    // previously this just tacked payload.id onto a create call, which the
    // backend had no update endpoint to act on and silently created a
    // duplicate row instead of changing the one being edited.
    if (editingTarget) {
      await updateTarget.mutateAsync({ id: editingTarget.id, data: payload });
    } else {
      await setTarget.mutateAsync(payload);
    }
    resetForm();
  };

  // Row-level "Submit" quick action — submits the target as-is without
  // opening the editor first. Updates the existing row's status in place
  // (same fix as handleSubmit above — this used to call the create endpoint
  // with the target's own id tacked on, creating a duplicate row).
  const handleQuickSubmit = async (target: KpiTarget) => {
    await updateTarget.mutateAsync({
      id: target.id,
      data: {
        kpi_code: target.kpi_code,
        kpi_type: target.kpi_type,
        metric_id: target.metric_id,
        target_year: target.target_year,
        period_code: target.period_code,
        target_value: target.target_value,
        target_type: target.target_type,
        target_basis: target.target_basis,
        target_rationale: target.target_rationale,
        threshold_mode: target.threshold_mode,
        excellent_threshold: target.excellent_threshold,
        achieved_threshold: target.achieved_threshold,
        warning_threshold: target.warning_threshold,
        target_range_min: target.target_range_min,
        target_range_max: target.target_range_max,
        period_start: target.period_start,
        period_end: target.period_end,
        target_status: "submitted",
      },
    });
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
          onClick={handleOpenCreate}
        >
          {t("kpi.targets.setTarget")}
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Year
            </label>
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
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
              KPI Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={pendingKpiCode}
                onChange={(e) => setPendingKpiCode(e.target.value)}
                placeholder={t("kpi.targets.searchPlaceholder")}
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 pe-8"
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
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Metric
            </label>
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
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Period
            </label>
            <select
              value={pendingPeriodFilter}
              onChange={(e) => setPendingPeriodFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All periods</option>
              {periodOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Status
            </label>
            <select
              value={pendingStatusFilter}
              onChange={(e) => setPendingStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {TARGET_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
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
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Target ID
                  </th>
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Metric
                  </th>
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Period
                  </th>
                  <th className="px-4 py-3 ltr:text-right rtl:text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Target
                  </th>
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Direction
                  </th>
                  <th className="px-4 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Threshold Mode
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((target: KpiTarget) => {
                  const actions = getActionLinks(target, {
                    onView: handleViewTarget,
                    onEdit: handleEditTarget,
                    onCopy: handleCopyTarget,
                    onSupersede: handleSupersedeTarget,
                    onQuickSubmit: handleQuickSubmit,
                    onDelete: setDeleteConfirmTarget,
                    onApprove: handleApproveTarget,
                    onReject: handleRejectTarget,
                  });
                  return (
                    <tr
                      key={target.id}
                      className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-4 text-sm font-mono text-slate-900 dark:text-white">
                        {formatTargetId(target.id)}
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
                      <td className="px-4 py-4 text-sm tabular-nums font-semibold text-slate-900 dark:text-white ltr:text-right rtl:text-left">
                        {formatTargetValue(
                          target.target_value,
                          target.calculation_type_snapshot,
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
                        <div className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                          {actions.map((action, idx) => (
                            <React.Fragment key={action.label}>
                              {idx > 0 && (
                                <span className="text-slate-300 dark:text-slate-600">
                                  ·
                                </span>
                              )}
                              <button
                                onClick={action.onClick}
                                className="text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {action.label}
                              </button>
                            </React.Fragment>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div
        ref={formSectionRef}
        className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/60">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Create / Edit Target
          </h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
            Draft only
          </span>
        </div>

        <div className="p-6 space-y-5">
          {isFormulaMetric && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 p-4 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>
                Formula metrics are configuration-only in Phase 1. Targets
                cannot receive operational Entries until Phase 2.
              </span>
            </div>
          )}

          {/*
            The reference mockup's Metric select has no separate KPI picker —
            it appears to assume a page already scoped to one KPI. This route
            is reachable across every KPI and metric_id lookups require a
            kpi_code first, so a compact KPI selector is kept as the entry
            point into the rest of the form (which otherwise mirrors the
            mockup 1:1).
          */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              KPI <span className="text-red-500">*</span>
            </label>
            <select
              value={formKpiCode}
              disabled={formReadOnly}
              onChange={(e) => {
                const c = cardOptions.find((o) => o.code === e.target.value);
                setFormKpiCode(e.target.value);
                if (c) setFormKpiType(c.type);
                setFormMetricId("");
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-60"
            >
              <option value="">-- Select KPI --</option>
              {cardOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Metric <span className="text-red-500">*</span>
              </label>
              <select
                value={formMetricId}
                disabled={formReadOnly}
                onChange={(e) => setFormMetricId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-60"
              >
                <option value="">-- Select Metric --</option>
                {(formMetrics ?? kpiMetrics ?? []).map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Calculation Type
              </label>
              <input
                type="text"
                value={calcType || "—"}
                readOnly
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Direction
              </label>
              <input
                type="text"
                value={direction || "—"}
                readOnly
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target Year <span className="text-red-500">*</span>
              </label>
              <select
                value={formYear}
                disabled={formReadOnly}
                onChange={(e) => setFormYear(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
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
                disabled={formReadOnly}
                onChange={(e) => setFormPeriodCode(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
              >
                <option value="">Select</option>
                {formPeriodOptions.map((p) => (
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
              <input
                type="text"
                value={formatDateDisplay(periodDates.start) || "—"}
                readOnly
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Period End
              </label>
              <input
                type="text"
                value={formatDateDisplay(periodDates.end) || "—"}
                readOnly
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                disabled={formReadOnly || direction === "Informational"}
                onChange={(e) => setFormTargetValue(e.target.value)}
                placeholder={
                  direction === "Informational" ? "N/A (Informational)" : "0"
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formTargetType}
                disabled={formReadOnly}
                onChange={(e) =>
                  setFormTargetType(e.target.value as KpiTargetType)
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
              >
                {TARGET_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target Basis <span className="text-red-500">*</span>
              </label>
              <select
                value={formTargetBasis}
                disabled={formReadOnly}
                onChange={(e) =>
                  setFormTargetBasis(e.target.value as KpiTargetBasis)
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
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
              disabled={formReadOnly}
              onChange={(e) => setFormTargetRationale(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:opacity-60"
              placeholder="Assumptions, basis, and justification for this target..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Threshold Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={formThresholdMode}
                disabled={formReadOnly}
                onChange={(e) =>
                  setFormThresholdMode(e.target.value as KpiThresholdMode)
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
              >
                {THRESHOLD_MODE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {formThresholdMode !== "No Thresholds" &&
              formThresholdMode !== "Use Global KPI Rules" &&
              formThresholdMode !== "Target Range" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Excellent Threshold
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formExcellentThreshold}
                      disabled={formReadOnly}
                      onChange={(e) =>
                        setFormExcellentThreshold(e.target.value)
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Achieved Threshold
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formAchievedThreshold}
                      disabled={formReadOnly}
                      onChange={(e) => setFormAchievedThreshold(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
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
                    disabled={formReadOnly}
                    onChange={(e) => setFormRangeMin(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
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
                    disabled={formReadOnly}
                    onChange={(e) => setFormRangeMax(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {formThresholdMode !== "No Thresholds" &&
              formThresholdMode !== "Use Global KPI Rules" &&
              formThresholdMode !== "Target Range" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Warning Threshold
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formWarningThreshold}
                    disabled={formReadOnly}
                    onChange={(e) => setFormWarningThreshold(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
                  />
                </div>
              )}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <input
                type="text"
                value={editingTarget ? formStatus : "Draft"}
                readOnly
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed capitalize"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700/60">
          <Button
            variant="outline"
            onClick={handleCancelForm}
            disabled={isSavingTarget}
          >
            {formReadOnly ? "Close" : "Cancel"}
          </Button>
          {!formReadOnly && (
            <>
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSavingTarget || isFormulaMetric}
              >
                {isSavingTarget
                  ? "Saving..."
                  : isFormulaMetric
                    ? "Phase 2 Only"
                    : "Save Draft"}
              </Button>
              <Button
                onClick={handleSubmitTarget}
                disabled={isSavingTarget || isFormulaMetric}
              >
                {isSavingTarget
                  ? "Saving..."
                  : isFormulaMetric
                    ? "Phase 2 Only"
                    : "Submit Target"}
              </Button>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={!!deleteConfirmTarget}
        onClose={() => setDeleteConfirmTarget(null)}
        size="sm"
      >
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Delete Target
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Are you sure you want to delete the target for{" "}
            <strong>
              {deleteConfirmTarget &&
                formatPeriodLabel(
                  deleteConfirmTarget.target_year,
                  deleteConfirmTarget.period_code,
                )}
            </strong>
            ? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteTarget}
              disabled={deleteTarget.isPending}
            >
              {deleteTarget.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
