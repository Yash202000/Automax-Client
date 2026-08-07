import React, { useState } from "react";
import {
  X,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  FileText,
  Pencil,
  Trash2,
  RotateCcw,
  Eye,
  Loader2,
} from "lucide-react";
import {
  useKpiEntries,
  useKpiMetrics,
  useDeleteKpiEntry,
  useKpiAvailableEntryTransitions,
  useTransitionKpiEntry,
} from "../../hooks/useKpi";
import { usePermissions } from "../../hooks/usePermissions";
import { kpiTransitionPermissionCode } from "../../utils/kpiTransitionPermission";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { AddEntryModal } from "./AddEntryModal";
import type {
  KpiEntryStatus,
  KpiEntry,
  WorkflowTransitionBrief,
} from "../../types/kpi";

interface ViewEntriesModalProps {
  kpiType: string;
  kpiId: string;
  metricId: string;
  metricName: string;
  isOpen: boolean;
  onClose: () => void;
}

const entryStatusColor: Record<KpiEntryStatus, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300",
  submitted: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  approved:
    "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
  rejected: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
};

const entryStatusIcon: Record<KpiEntryStatus, React.ReactNode> = {
  draft: <FileText className="w-3 h-3" />,
  submitted: <Send className="w-3 h-3" />,
  approved: <CheckCircle className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
};

const transitionIconMap: Record<string, React.ReactNode> = {
  submit: <Send className="w-3.5 h-3.5" />,
  review: <Eye className="w-3.5 h-3.5" />,
  approve: <CheckCircle className="w-3.5 h-3.5" />,
  reject: <XCircle className="w-3.5 h-3.5" />,
  request_changes: <RotateCcw className="w-3.5 h-3.5" />,
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

interface EntryRowProps {
  entry: KpiEntry;
  canEdit: boolean;
  onEdit: (entry: KpiEntry) => void;
  onDelete: (entry: KpiEntry) => void;
  onTransition: (entry: KpiEntry, transition: WorkflowTransitionBrief) => void;
}

const EntryRow: React.FC<EntryRowProps> = ({
  entry,
  canEdit,
  onEdit,
  onDelete,
  onTransition,
}) => {
  const { hasPermission } = usePermissions();
  const { data: transResp } = useKpiAvailableEntryTransitions(entry.id);
  const transitions = (transResp?.data ?? []).filter((tr) =>
    hasPermission(kpiTransitionPermissionCode(tr.code)),
  );
  const showActionsRow =
    (entry.status === "draft" && canEdit) || transitions.length > 0;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium capitalize ${entryStatusColor[entry.status]}`}
          >
            {entryStatusIcon[entry.status]}
            {entry.status}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {entry.period_code}
          </span>
        </div>
        <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
          {entry.actual_value}
        </span>
      </div>
      {entry.performance_commentary && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {entry.performance_commentary}
        </p>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        {entry.submitted_by && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {entry.submitted_by.first_name} {entry.submitted_by.last_name}
          </span>
        )}
        <span>{formatDate(entry.created_at)}</span>
      </div>

      {showActionsRow && (
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
          {entry.status === "draft" && canEdit && (
            <>
              <button
                onClick={() => onEdit(entry)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={() => onDelete(entry)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </>
          )}
          {transitions.map((tr) => (
            <button
              key={tr.id}
              onClick={() => onTransition(entry, tr)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
            >
              {transitionIconMap[tr.code] ?? <Send className="w-3.5 h-3.5" />}
              {tr.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const ViewEntriesModal: React.FC<ViewEntriesModalProps> = ({
  kpiType,
  kpiId,
  metricId,
  metricName,
  isOpen,
  onClose,
}) => {
  const { data: entries, isLoading } = useKpiEntries(kpiType, kpiId, metricId);
  const { data: metrics } = useKpiMetrics(kpiType, kpiId);
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

  if (!isOpen) return null;

  const editMetric = editTarget
    ? ((metrics ?? []).find((m) => m.id === editTarget.metric_id) ?? null)
    : null;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteEntry.mutateAsync({
      type: kpiType,
      id: kpiId,
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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Entries — {metricName}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {metricId
                    ? `Entry history for "${metricName}"`
                    : "All entries for this KPI"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : entries && entries.length > 0 ? (
              <div className="space-y-3">
                {entries.map((entry: KpiEntry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    canEdit={canEdit}
                    onEdit={setEditTarget}
                    onDelete={setDeleteTarget}
                    onTransition={(e, tr) =>
                      setTransitionPick({ entry: e, transition: tr })
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {metricId
                    ? "No entries yet for this metric."
                    : "No entries yet for this KPI."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit entry modal — reuses AddEntryModal in edit mode */}
      <AddEntryModal
        kpiType={kpiType}
        kpiId={kpiId}
        metric={editMetric}
        reportingFrequency={editMetric?.reporting_frequency}
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
    </>
  );
};

export default ViewEntriesModal;
