import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  FileSpreadsheet,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye,
  X,
  Hash,
  Target,
  BarChart3,
  Clock,
  FileText,
  Pencil,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  RotateCcw,
  Loader2,
} from "lucide-react";
import {
  useKpiAllEntries,
  useDeleteKpiEntry,
  useKpiAvailableEntryTransitions,
  useKpiEntryHistory,
  useTransitionKpiEntry,
} from "../../../hooks/useKpi";
import { usePermissions } from "../../../hooks/usePermissions";
import { kpiTransitionPermissionCode } from "../../../utils/kpiTransitionPermission";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { AddEntryModal } from "../../../components/kpi/AddEntryModal";
import type {
  KpiEntry,
  KpiMetric,
  KpiWorkflowAction,
  WorkflowTransitionBrief,
} from "../../../types/kpi";

const entryStatusColor: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  approved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "Not Calculable":
    "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

const transitionIconMap: Record<string, React.ReactNode> = {
  submit: <Send className="w-4 h-4" />,
  review: <Eye className="w-4 h-4" />,
  approve: <CheckCircle className="w-4 h-4" />,
  reject: <XCircle className="w-4 h-4" />,
  request_changes: <RotateCcw className="w-4 h-4" />,
};

const transitionColorMap: Record<string, string> = {
  submit:
    "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50",
  review:
    "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50",
  approve:
    "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50",
  reject:
    "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50",
  request_changes:
    "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50",
};

// The global entries list only knows an entry's metric as { id, name } — not
// the full KpiMetric record. Reusing AddEntryModal here (edit mode) would
// otherwise require an extra per-KPI metrics fetch; instead we reconstruct a
// metric-shaped object straight from the entry's own configuration snapshot
// (calculation_type_snapshot, direction_snapshot, etc.), which is exactly
// what was captured at entry-creation time and is all AddEntryModal needs to
// render its fields. Fields AddEntryModal never reads (weight, baseline,
// audit) are filled with harmless placeholders.
function entryToPseudoMetric(entry: KpiEntry): KpiMetric {
  return {
    id: entry.metric_id,
    kpi_id: entry.kpi_id,
    kpi_type: entry.kpi_type,
    name: entry.metric?.name ?? entry.metric_id,
    metric_type: "",
    unit: entry.unit_snapshot,
    baseline_value: 0,
    current_value: entry.actual_value,
    weight: 0,
    calculation_type: entry.calculation_type_snapshot,
    direction: entry.direction_snapshot,
    decimal_precision: entry.decimal_precision_snapshot,
    numerator_label: entry.numerator_label_snapshot,
    denominator_label: entry.denominator_label_snapshot,
    aggregation_method: entry.aggregation_method_snapshot,
    created_by_id: "",
    created_at: "",
    updated_at: "",
  };
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-44 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-slate-900 dark:text-white">
        {value ?? "-"}
      </span>
    </div>
  );
}

function EntryTransitionHistory({ entryId }: { entryId: string }) {
  const { data: res, isLoading } = useKpiEntryHistory(entryId);
  const actions: KpiWorkflowAction[] = res?.data ?? [];

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
        No transition history yet.
      </div>
    );
  }

  return (
    <div className="relative space-y-4">
      {actions.map((action, idx) => (
        <div key={action.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`w-3 h-3 rounded-full border-2 ${
                idx === actions.length - 1
                  ? "bg-blue-600 border-blue-600"
                  : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
              }`}
            />
            {idx < actions.length - 1 && (
              <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />
            )}
          </div>
          <div className="pb-4 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {action.transition_name ?? action.id.slice(0, 8)}
              </span>
              {action.from_state_name && action.to_state_name && (
                <span className="text-xs text-slate-400">
                  {action.from_state_name} → {action.to_state_name}
                </span>
              )}
            </div>
            {action.comment && (
              <p className="text-xs text-slate-500 mt-0.5">{action.comment}</p>
            )}
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span>
                {action.performed_by?.name ??
                  action.performed_by_id.slice(0, 8)}
              </span>
              <span>·</span>
              <span>{new Date(action.performed_at).toLocaleString()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EntryDetailModal({
  entry,
  canEdit,
  onClose,
  onEdit,
  onDelete,
  onTransition,
}: {
  entry: KpiEntry | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (entry: KpiEntry) => void;
  onDelete: (entry: KpiEntry) => void;
  onTransition: (entry: KpiEntry, transition: WorkflowTransitionBrief) => void;
}) {
  const { hasPermission } = usePermissions();
  const { data: transResp } = useKpiAvailableEntryTransitions(entry?.id ?? "");
  const transitions = entry
    ? (transResp?.data ?? []).filter((tr) =>
        hasPermission(kpiTransitionPermissionCode(tr.code)),
      )
    : [];

  if (!entry) return null;
  return (
    <Modal isOpen={!!entry} onClose={onClose} size="5xl">
      <div className="flex flex-col h-full max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/60 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {entry.metric?.name ?? "Entry Details"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {entry.reporting_year} / {entry.period_code}
            </p>
          </div>
          <div className="flex items-center gap-1 mr-8">
            {entry.status === "draft" && canEdit && (
              <>
                <button
                  onClick={() => onEdit(entry)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(entry)}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          <div className="space-y-3">
            <DetailRow
              label="Metric"
              value={entry.metric?.name ?? entry.metric_id}
            />
            <DetailRow label="KPI Type" value={entry.kpi_type} />
            <DetailRow label="Year" value={entry.reporting_year} />
            <DetailRow label="Period" value={entry.period_code} />
            <DetailRow
              label="Period Start"
              value={
                entry.period_start
                  ? new Date(entry.period_start).toLocaleDateString()
                  : "-"
              }
            />
            <DetailRow
              label="Period End"
              value={
                entry.period_end
                  ? new Date(entry.period_end).toLocaleDateString()
                  : "-"
              }
            />
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700/60 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Configuration Snapshots
            </h3>
            <div className="space-y-3">
              <DetailRow
                label="Calculation Type"
                value={entry.calculation_type_snapshot}
              />
              <DetailRow label="Direction" value={entry.direction_snapshot} />
              <DetailRow label="Unit" value={entry.unit_snapshot} />
              <DetailRow
                label="Decimal Precision"
                value={entry.decimal_precision_snapshot}
              />
              <DetailRow
                label="Aggregation Method"
                value={entry.aggregation_method_snapshot}
              />
              <DetailRow
                label="Threshold Mode"
                value={entry.threshold_mode_snapshot}
              />
              {entry.numerator_label_snapshot && (
                <DetailRow
                  label="Numerator Label"
                  value={entry.numerator_label_snapshot}
                />
              )}
              {entry.denominator_label_snapshot && (
                <DetailRow
                  label="Denominator Label"
                  value={entry.denominator_label_snapshot}
                />
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700/60 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Target
            </h3>
            <div className="space-y-3">
              <DetailRow
                label="Target Value"
                value={entry.target_value_snapshot}
              />
              <DetailRow label="Actual Value" value={entry.actual_value} />
              <DetailRow
                label="Achievement %"
                value={
                  entry.achievement_percentage != null
                    ? `${entry.achievement_percentage.toFixed(2)}%`
                    : "-"
                }
              />
              <DetailRow label="Variance" value={entry.variance_value} />
              <DetailRow
                label="Performance Status"
                value={entry.performance_status}
              />
            </div>
          </div>

          {(entry.numerator_value != null ||
            entry.denominator_value != null ||
            entry.direct_actual_value != null) && (
            <div className="border-t border-slate-200 dark:border-slate-700/60 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Values
              </h3>
              <div className="space-y-3">
                {entry.direct_actual_value != null && (
                  <DetailRow
                    label="Direct Actual"
                    value={entry.direct_actual_value}
                  />
                )}
                {entry.numerator_value != null && (
                  <DetailRow label="Numerator" value={entry.numerator_value} />
                )}
                {entry.denominator_value != null && (
                  <DetailRow
                    label="Denominator"
                    value={entry.denominator_value}
                  />
                )}
                {entry.aggregated_value != null && (
                  <DetailRow
                    label="Aggregated Value"
                    value={entry.aggregated_value}
                  />
                )}
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 dark:border-slate-700/60 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Data Quality
            </h3>
            <div className="space-y-3">
              <DetailRow label="Data Source" value={entry.data_source_type} />
              <DetailRow
                label="Source Reference"
                value={entry.source_reference}
              />
              <DetailRow
                label="Data Quality Status"
                value={entry.data_quality_status}
              />
              <DetailRow
                label="Data Cutoff"
                value={
                  entry.data_cutoff_date
                    ? new Date(entry.data_cutoff_date).toLocaleDateString()
                    : "-"
                }
              />
              {entry.data_quality_notes && (
                <DetailRow
                  label="Quality Notes"
                  value={entry.data_quality_notes}
                />
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700/60 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Audit
            </h3>
            <div className="space-y-3">
              <DetailRow label="Status" value={entry.status} />
              <DetailRow label="Version" value={entry.entry_version} />
              <DetailRow
                label="Created"
                value={
                  entry.created_at
                    ? new Date(entry.created_at).toLocaleString()
                    : "-"
                }
              />
              <DetailRow
                label="Updated"
                value={
                  entry.updated_at
                    ? new Date(entry.updated_at).toLocaleString()
                    : "-"
                }
              />
              {entry.submitted_by && (
                <DetailRow
                  label="Submitted By"
                  value={
                    `${entry.submitted_by.first_name ?? ""} ${entry.submitted_by.last_name ?? ""}`.trim() ||
                    entry.submitted_by_id
                  }
                />
              )}
              {entry.approved_by && (
                <DetailRow
                  label="Approved By"
                  value={
                    `${entry.approved_by.first_name ?? ""} ${entry.approved_by.last_name ?? ""}`.trim() ||
                    entry.approved_by_id
                  }
                />
              )}
              {entry.performance_commentary && (
                <DetailRow
                  label="Commentary"
                  value={entry.performance_commentary}
                />
              )}
              {entry.improvement_action && (
                <DetailRow
                  label="Improvement Action"
                  value={entry.improvement_action}
                />
              )}
              {entry.evidence && entry.evidence.length > 0 && (
                <DetailRow
                  label="Evidence"
                  value={`${entry.evidence.length} file(s)`}
                />
              )}
            </div>
          </div>

          {transitions.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-700/60 pt-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Send className="w-4 h-4" />
                Available Actions
              </h3>
              <div className="flex flex-wrap gap-3">
                {transitions.map((tr) => (
                  <button
                    key={tr.id}
                    onClick={() => onTransition(entry, tr)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      transitionColorMap[tr.code] ??
                      "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    }`}
                  >
                    {transitionIconMap[tr.code] ?? <Send className="w-4 h-4" />}
                    {tr.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 dark:border-slate-700/60 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Transition History
            </h3>
            <EntryTransitionHistory entryId={entry.id} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

export const KpiEntriesPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [kpiCodeFilter, setKpiCodeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<KpiEntry | null>(null);
  const limit = 20;

  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("perf:submit");

  const deleteEntry = useDeleteKpiEntry();
  const transitionEntry = useTransitionKpiEntry();

  const [editTarget, setEditTarget] = useState<KpiEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KpiEntry | null>(null);
  const [transitionPick, setTransitionPick] = useState<{
    entry: KpiEntry;
    transition: WorkflowTransitionBrief;
  } | null>(null);
  const [comment, setComment] = useState("");

  const params = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      kpi_code: kpiCodeFilter || undefined,
      reporting_year: yearFilter ? Number(yearFilter) : undefined,
      status: statusFilter || undefined,
    }),
    [page, search, kpiCodeFilter, yearFilter, statusFilter],
  );

  const { data, isLoading, error } = useKpiAllEntries(params);
  const items = data?.data ?? [];
  const total = data?.total_items ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const statusFilters = [
    { value: "", label: t("common.all") },
    { value: "draft", label: "Draft" },
    { value: "submitted", label: "Submitted" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "Not Calculable", label: "Not Calculable" },
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years: { value: string; label: string }[] = [
      { value: "", label: t("common.all") },
    ];
    for (let y = currentYear + 1; y >= currentYear - 5; y--) {
      years.push({ value: String(y), label: String(y) });
    }
    return years;
  }, [currentYear, t]);

  const editMetric = editTarget ? entryToPseudoMetric(editTarget) : null;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteEntry.mutateAsync({
      type: deleteTarget.kpi_type,
      id: deleteTarget.kpi_id,
      entryId: deleteTarget.id,
    });
    setDeleteTarget(null);
  };

  const handleTransition = async () => {
    if (!transitionPick) return;
    await transitionEntry.mutateAsync({
      entryId: transitionPick.entry.id,
      transitionId: transitionPick.transition.id,
      comment: comment || undefined,
    });
    setTransitionPick(null);
    setComment("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              All Entries
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Entries — All Metrics
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search entries..."
            className="ps-9 pe-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
        <input
          type="text"
          value={kpiCodeFilter}
          onChange={(e) => {
            setKpiCodeFilter(e.target.value);
            setPage(1);
          }}
          placeholder="KPI Code..."
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
        />
        <select
          value={yearFilter}
          onChange={(e) => {
            setYearFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {yearOptions.map((y) => (
            <option key={y.value} value={y.value}>
              {y.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {statusFilters.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">Failed to load entries</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <FileSpreadsheet className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              No entries found
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Metric
                    </th>
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Year / Period
                    </th>
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Actual
                    </th>
                    <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((entry: KpiEntry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {entry.metric?.name ?? entry.metric_id}
                        </div>
                        {entry.metric && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {entry.unit_snapshot} ·{" "}
                            {entry.calculation_type_snapshot}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm tabular-nums text-slate-700 dark:text-slate-300">
                        {entry.reporting_year} / {entry.period_code}
                      </td>
                      <td className="px-6 py-4 text-sm tabular-nums text-slate-700 dark:text-slate-300">
                        {entry.actual_value}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            entryStatusColor[entry.performance_status] ??
                            entryStatusColor.draft
                          }`}
                        >
                          {entry.performance_status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedEntry(entry)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          {entry.status === "draft" && canEdit && (
                            <>
                              <button
                                onClick={() => setEditTarget(entry)}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(entry)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 rtl:-rotate-180" />
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4 rtl:-rotate-180" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Entry Detail Modal */}
      <EntryDetailModal
        entry={selectedEntry}
        canEdit={canEdit}
        onClose={() => setSelectedEntry(null)}
        onEdit={(entry) => {
          setSelectedEntry(null);
          setEditTarget(entry);
        }}
        onDelete={(entry) => {
          setSelectedEntry(null);
          setDeleteTarget(entry);
        }}
        onTransition={(entry, transition) => {
          setSelectedEntry(null);
          setTransitionPick({ entry, transition });
        }}
      />

      {/* Edit entry modal — reuses AddEntryModal in edit mode */}
      <AddEntryModal
        kpiType={editTarget?.kpi_type ?? ""}
        kpiId={editTarget?.kpi_id ?? ""}
        metric={editMetric}
        entry={editTarget}
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => setEditTarget(null)}
      />

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        size="sm"
      >
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Delete Entry
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Are you sure you want to delete the entry for{" "}
            <strong>
              {deleteTarget?.period_code} {deleteTarget?.reporting_year}
            </strong>
            ? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteEntry.isPending}
            >
              {deleteEntry.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Transition confirm */}
      <Modal
        isOpen={!!transitionPick}
        onClose={() => {
          setTransitionPick(null);
          setComment("");
        }}
        size="sm"
      >
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {transitionPick?.transition.name}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Confirm this action for the entry (
            {transitionPick?.entry.period_code}{" "}
            {transitionPick?.entry.reporting_year}).
          </p>
          <Input
            label="Comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setTransitionPick(null);
                setComment("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransition}
              disabled={transitionEntry.isPending}
            >
              {transitionEntry.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
