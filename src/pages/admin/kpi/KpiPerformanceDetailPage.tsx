import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import {
  TrendingUp,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  XCircle,
  Send,
  Eye,
  Loader2,
  Clock,
  Plus,
  ShieldAlert,
  RotateCcw,
  Pencil,
  Trash2,
  Paperclip,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  useKpiPerformance,
  useKpiAvailableTransitions,
  useKpiPerformanceHistory,
  useTransitionPerformance,
  useEffectivePerformanceBand,
  useCorrectiveActions,
  useCreateCorrectiveAction,
  useUpdateCorrectiveActionStatus,
  useUpdatePerformance,
  useDeletePerformance,
  usePerformanceEvidence,
  useCreatePerformanceEvidence,
  useDeletePerformanceEvidence,
} from "../../../hooks/useKpi";
import { userApi } from "../../../api/admin";
import { getBandColor, BAND_BAR_CLASS } from "../../../utils/kpiBand";
import { kpiTransitionPermissionCode } from "../../../utils/kpiTransitionPermission";
import { usePermissions } from "../../../hooks/usePermissions";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/SelectInput";
import type {
  KPIPerfStatus,
  WorkflowTransitionBrief,
  KpiWorkflowAction,
  KpiCorrectiveAction,
  CorrectiveActionStatus,
} from "../../../types/kpi";

const statusColorMap: Record<KPIPerfStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  under_review:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  published:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const transitionIconMap: Record<string, React.ReactNode> = {
  submit: <Send className="w-4 h-4" />,
  review: <Eye className="w-4 h-4" />,
  approve: <CheckCircle className="w-4 h-4" />,
  reject: <XCircle className="w-4 h-4" />,
  publish: <TrendingUp className="w-4 h-4" />,
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
  publish:
    "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50",
  request_changes:
    "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50",
};

export const KpiPerformanceDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: perfResp, isLoading, error } = useKpiPerformance(id!);
  const { data: transResp } = useKpiAvailableTransitions(id!);
  const transitionPerf = useTransitionPerformance();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const perf = perfResp?.data;
  const transitions = (transResp?.data ?? []).filter((tr) =>
    hasPermission(kpiTransitionPermissionCode(tr.code)),
  );
  const { data: band } = useEffectivePerformanceBand(perf?.kpi_code);

  const canOverrideLock = isSuperAdmin || hasPermission("perf:override_lock");
  const isApproved = perf?.status === "approved";
  const isLocked = isApproved && !canOverrideLock;

  const [transitionTarget, setTransitionTarget] =
    useState<WorkflowTransitionBrief | null>(null);
  const [comment, setComment] = useState("");

  const handleTransition = async () => {
    if (!transitionTarget) return;
    await transitionPerf.mutateAsync({
      id: id!,
      transitionId: transitionTarget.id,
      comment: comment || undefined,
    });
    setTransitionTarget(null);
    setComment("");
  };

  const updatePerf = useUpdatePerformance();
  const deletePerf = useDeletePerformance();
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState("");
  const [editActual, setEditActual] = useState("");
  const [editTrend, setEditTrend] = useState("");
  const [editJustification, setEditJustification] = useState("");
  const [editCorrectiveAction, setEditCorrectiveAction] = useState("");

  const openEdit = () => {
    if (!perf) return;
    setEditTarget(String(perf.target ?? 0));
    setEditActual(String(perf.actual ?? 0));
    setEditTrend(perf.trend_description ?? "");
    setEditJustification(perf.justification ?? "");
    setEditCorrectiveAction(perf.corrective_action ?? "");
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    await updatePerf.mutateAsync({
      id: id!,
      data: {
        target: Number(editTarget),
        actual: Number(editActual),
        trend_description: editTrend,
        justification: editJustification,
        corrective_action: editCorrectiveAction,
      },
    });
    setShowEdit(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(t("common.confirmDelete"))) return;
    await deletePerf.mutateAsync(id!);
    navigate("/goals/kpi/performance");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !perf) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">
            {t("kpi.performance.failedToLoad")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/goals/kpi/performance")}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {perf.kpi_code}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Q{perf.quarter} / {perf.year}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {hasPermission("perf:submit") && (
            <>
              <button
                onClick={openEdit}
                title={
                  isLocked
                    ? t("kpi.performance.detail.lockedTooltip")
                    : undefined
                }
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                title={
                  isLocked
                    ? t("kpi.performance.detail.lockedTooltip")
                    : undefined
                }
                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              statusColorMap[perf.status as KPIPerfStatus] ??
              statusColorMap.draft
            }`}
          >
            {t(
              `kpi.performance.status${perf.status.replace(/_([a-z])/g, (_, l) => l.toUpperCase()).replace(/^[a-z]/, (l) => l.toUpperCase())}`,
            )}
          </span>
        </div>
      </div>
      {isLocked && (
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 -mt-2">
          <ShieldAlert className="w-3.5 h-3.5" />
          {t("kpi.performance.detail.lockedNotice")}
        </p>
      )}

      {/* Performance Details */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700/60">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("kpi.performance.detail.details")}
          </h2>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {t("kpi.performance.table.kpiCode")}
            </label>
            <p className="text-sm font-mono text-slate-900 dark:text-white">
              {perf.kpi_code}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {t("kpi.performance.table.period")}
            </label>
            <p className="text-sm text-slate-900 dark:text-white">
              Q{perf.quarter} / {perf.year}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {t("kpi.performance.table.target")}
            </label>
            <p className="text-sm tabular-nums text-slate-900 dark:text-white">
              {perf.target}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {t("kpi.performance.table.actual")}
            </label>
            <p className="text-sm tabular-nums text-slate-900 dark:text-white">
              {perf.actual ?? "-"}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {t("kpi.performance.table.achievement")}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 max-w-[120px] h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={`h-2 rounded-full ${BAND_BAR_CLASS[getBandColor(perf.achievement_pct, band)]}`}
                  style={{
                    width: `${Math.min(Math.max(perf.achievement_pct, 0), 100)}%`,
                  }}
                />
              </div>
              <span className="text-sm tabular-nums font-medium text-slate-700 dark:text-slate-300">
                {perf.achievement_pct.toFixed(1)}%
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {t("kpi.performance.detail.type")}
            </label>
            <p className="text-sm text-slate-900 dark:text-white capitalize">
              {perf.kpi_type}
            </p>
          </div>
        </div>

        {perf.trend_description && (
          <div className="px-6 pb-4">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {t("kpi.performance.detail.trend")}
            </label>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {perf.trend_description}
            </p>
          </div>
        )}
        {perf.justification && (
          <div className="px-6 pb-4">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {t("kpi.performance.detail.justification")}
            </label>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {perf.justification}
            </p>
          </div>
        )}
        {perf.corrective_action && (
          <div className="px-6 pb-4">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {t("kpi.performance.detail.correctiveAction")}
            </label>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {perf.corrective_action}
            </p>
          </div>
        )}
      </div>

      {/* Evidence */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        <EvidencePanel performanceId={id!} isLocked={isLocked} />
      </div>

      {/* Corrective Actions */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        <CorrectiveActionsPanel performanceId={id!} />
      </div>

      {/* Available Transitions */}
      {transitions.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700/60">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t("kpi.performance.detail.availableActions")}
            </h2>
          </div>
          <div className="px-6 py-5 flex flex-wrap gap-3">
            {transitions.map((tr: WorkflowTransitionBrief) => (
              <button
                key={tr.id}
                onClick={() => setTransitionTarget(tr)}
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

      {/* Submitted / Approved By */}
      {(perf.submitted_by || perf.approved_by) && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
          <div className="px-6 py-5 flex flex-wrap gap-6 text-sm">
            {perf.submitted_by && (
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("kpi.performance.detail.submittedBy")}:
                </span>{" "}
                <span className="text-slate-900 dark:text-white">
                  {perf.submitted_by.name}
                </span>
              </div>
            )}
            {perf.approved_by && (
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("kpi.performance.detail.approvedBy")}:
                </span>{" "}
                <span className="text-slate-900 dark:text-white">
                  {perf.approved_by.name}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transition History */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700/60">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            {t("kpi.performance.detail.history")}
          </h2>
        </div>
        {id && <TransitionHistoryViewer id={id} />}
      </div>

      {/* Transition Confirm Modal */}
      <Modal
        isOpen={!!transitionTarget}
        onClose={() => {
          setTransitionTarget(null);
          setComment("");
        }}
        size="sm"
      >
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("kpi.performance.transitionTitle", {
              action: transitionTarget?.name ?? "",
            })}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("kpi.performance.transitionConfirm", {
              action: transitionTarget?.name ?? "",
              code: perf.kpi_code,
            })}
          </p>
          <Input
            label={t("kpi.performance.comment")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setTransitionTarget(null);
                setComment("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleTransition}
              disabled={transitionPerf.isPending}
            >
              {transitionPerf.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {t("common.confirm")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} size="lg">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("kpi.performance.detail.editTitle")}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("kpi.performance.table.target")}
              type="number"
              value={editTarget}
              onChange={(e) => setEditTarget(e.target.value)}
            />
            <Input
              label={t("kpi.performance.table.actual")}
              type="number"
              value={editActual}
              onChange={(e) => setEditActual(e.target.value)}
            />
          </div>
          <Input
            label={t("kpi.performance.detail.trend")}
            value={editTrend}
            onChange={(e) => setEditTrend(e.target.value)}
          />
          <Input
            label={t("kpi.performance.detail.justification")}
            value={editJustification}
            onChange={(e) => setEditJustification(e.target.value)}
          />
          <Input
            label={t("kpi.performance.detail.correctiveAction")}
            value={editCorrectiveAction}
            onChange={(e) => setEditCorrectiveAction(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveEdit} disabled={updatePerf.isPending}>
              {updatePerf.isPending ? "..." : t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

function TransitionHistoryViewer({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data: res, isLoading } = useKpiPerformanceHistory(id);
  const actions: KpiWorkflowAction[] = res?.data ?? [];

  if (isLoading) {
    return (
      <div className="px-6 py-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
        {t("kpi.performance.detail.noHistory")}
      </div>
    );
  }

  return (
    <div className="px-6 py-5">
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
                <p className="text-xs text-slate-500 mt-0.5">
                  {action.comment}
                </p>
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
    </div>
  );
}

const correctiveActionStatusColorMap: Record<CorrectiveActionStatus, string> = {
  open: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  in_progress:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  closed:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  escalated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function CorrectiveActionsPanel({ performanceId }: { performanceId: string }) {
  const { t } = useTranslation();
  const { canManageCorrectiveActions } = usePermissions();
  const canManage = canManageCorrectiveActions();

  const { data: actions, isLoading } = useCorrectiveActions(performanceId);
  const { data: usersResp } = useQuery({
    queryKey: ["admin", "users", "all"],
    queryFn: () => userApi.list(1, 1000),
    enabled: canManage,
  });
  const users = (usersResp as any)?.data ?? [];
  const createAction = useCreateCorrectiveAction();
  const updateStatus = useUpdateCorrectiveActionStatus();

  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [closeTarget, setCloseTarget] = useState<KpiCorrectiveAction | null>(
    null,
  );
  const [closureNote, setClosureNote] = useState("");
  const [closureEvidenceUrl, setClosureEvidenceUrl] = useState("");

  const handleCreate = async () => {
    if (!description || !ownerId) return;
    await createAction.mutateAsync({
      kpi_performance_id: performanceId,
      description,
      owner_id: ownerId,
      due_date: dueDate || undefined,
    });
    setShowForm(false);
    setDescription("");
    setOwnerId("");
    setDueDate("");
  };

  const handleEscalate = (action: KpiCorrectiveAction) => {
    updateStatus.mutate({ id: action.id, data: { status: "escalated" } });
  };

  const handleClose = async () => {
    if (!closeTarget || !closureNote) return;
    await updateStatus.mutateAsync({
      id: closeTarget.id,
      data: {
        status: "closed",
        closure_note: closureNote,
        closure_evidence_url: closureEvidenceUrl || undefined,
      },
    });
    setCloseTarget(null);
    setClosureNote("");
    setClosureEvidenceUrl("");
  };

  return (
    <>
      <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-slate-400" />
          {t("kpi.correctiveActions.title")}
        </h2>
        {canManage && (
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowForm(true)}
          >
            {t("kpi.correctiveActions.add")}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="px-6 py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : (actions ?? []).length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          {t("kpi.correctiveActions.empty")}
        </div>
      ) : (
        <div className="px-6 py-5 space-y-4">
          {(actions ?? []).map((action) => (
            <div
              key={action.id}
              className="border border-slate-200 dark:border-slate-700/60 rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-900 dark:text-white flex-1">
                  {action.description}
                </p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${correctiveActionStatusColorMap[action.status]}`}
                >
                  {t(`kpi.correctiveActions.status.${action.status}`)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {t("kpi.correctiveActions.owner")}:{" "}
                  {action.owner?.name ?? action.owner_id.slice(0, 8)}
                </span>
                {action.due_date && (
                  <span>
                    {t("kpi.correctiveActions.dueDate")}:{" "}
                    {new Date(action.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              {action.status === "closed" && action.closure_note && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">
                  {t("kpi.correctiveActions.closureNote")}:{" "}
                  {action.closure_note}
                </p>
              )}
              {canManage &&
                (action.status === "open" ||
                  action.status === "in_progress" ||
                  action.status === "escalated") && (
                  <div className="flex gap-2 mt-3">
                    {action.status !== "escalated" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEscalate(action)}
                      >
                        {t("kpi.correctiveActions.escalate")}
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setCloseTarget(action)}>
                      {t("kpi.correctiveActions.close")}
                    </Button>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}

      {/* Add corrective action modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} size="md">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("kpi.correctiveActions.add")}
          </h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("kpi.correctiveActions.description")} *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <Select
            label={t("kpi.correctiveActions.owner") + " *"}
            value={ownerId}
            onChange={(v) => setOwnerId(v as string)}
            searchable
            options={users.map((u: any) => ({
              value: u.id,
              label: `${u.first_name} ${u.last_name}`,
            }))}
          />
          <Input
            label={t("kpi.correctiveActions.dueDate")}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={createAction.isPending}>
              {createAction.isPending ? "..." : t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Close corrective action modal */}
      <Modal
        isOpen={!!closeTarget}
        onClose={() => setCloseTarget(null)}
        size="md"
      >
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("kpi.correctiveActions.close")}
          </h2>
          <Input
            label={t("kpi.correctiveActions.closureNote") + " *"}
            value={closureNote}
            onChange={(e) => setClosureNote(e.target.value)}
          />
          <Input
            label={t("kpi.correctiveActions.closureEvidenceUrl")}
            value={closureEvidenceUrl}
            onChange={(e) => setClosureEvidenceUrl(e.target.value)}
            placeholder="https://..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setCloseTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleClose}
              disabled={updateStatus.isPending || !closureNote}
            >
              {updateStatus.isPending ? "..." : t("common.confirm")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function EvidencePanel({
  performanceId,
  isLocked,
}: {
  performanceId: string;
  isLocked: boolean;
}) {
  const { t } = useTranslation();
  const { data: evidence, isLoading } = usePerformanceEvidence(performanceId);
  const createEvidence = useCreatePerformanceEvidence();
  const deleteEvidence = useDeletePerformanceEvidence();

  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  const handleAdd = async () => {
    if (!description) return;
    await createEvidence.mutateAsync({
      id: performanceId,
      data: { description, file_url: fileUrl || undefined },
    });
    setShowForm(false);
    setDescription("");
    setFileUrl("");
  };

  const handleRemove = async (evidenceId: string) => {
    if (!window.confirm(t("common.confirmDelete"))) return;
    await deleteEvidence.mutateAsync({ id: performanceId, evidenceId });
  };

  return (
    <>
      <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Paperclip className="w-5 h-5 text-slate-400" />
          {t("kpi.performance.detail.evidence")}
        </h2>
        <Button
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowForm(true)}
        >
          {t("kpi.performance.detail.addEvidence")}
        </Button>
      </div>

      {isLoading ? (
        <div className="px-6 py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : (evidence ?? []).length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          {t("kpi.performance.detail.noEvidence")}
        </div>
      ) : (
        <div className="px-6 py-5 space-y-3">
          {(evidence ?? []).map((ev) => (
            <div
              key={ev.id}
              className="flex items-start justify-between gap-3 border border-slate-200 dark:border-slate-700/60 rounded-lg p-3"
            >
              <div className="min-w-0">
                <p className="text-sm text-slate-900 dark:text-white">
                  {ev.description}
                </p>
                {ev.file_url && (
                  <a
                    href={ev.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {ev.file_url}
                  </a>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {ev.uploaded_by?.name ?? ev.uploaded_by_id.slice(0, 8)} ·{" "}
                  {new Date(ev.created_at).toLocaleString()}
                </p>
              </div>
              {!isLocked && (
                <button
                  onClick={() => handleRemove(ev.id)}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                  title={t("common.delete")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} size="md">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("kpi.performance.detail.addEvidence")}
          </h2>
          <Input
            label={t("kpi.performance.detail.evidenceDescription") + " *"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            label={t("kpi.performance.detail.evidenceLink")}
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="https://..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAdd} disabled={createEvidence.isPending}>
              {createEvidence.isPending ? "..." : t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
