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
} from "lucide-react";
import {
  useKpiPerformance,
  useKpiAvailableTransitions,
  useKpiPerformanceHistory,
  useTransitionPerformance,
} from "../../../hooks/useKpi";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import type {
  KPIPerfStatus,
  WorkflowTransitionBrief,
  KpiWorkflowAction,
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
};

export const KpiPerformanceDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: perfResp, isLoading, error } = useKpiPerformance(id!);
  const { data: transResp } = useKpiAvailableTransitions(id!);
  const transitionPerf = useTransitionPerformance();

  const perf = perfResp?.data;
  const transitions = transResp?.data ?? [];

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
        <span
          className={`ml-auto inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            statusColorMap[perf.status as KPIPerfStatus] ?? statusColorMap.draft
          }`}
        >
          {t(
            `kpi.performance.status${perf.status.replace(/_([a-z])/g, (_, l) => l.toUpperCase()).replace(/^[a-z]/, (l) => l.toUpperCase())}`,
          )}
        </span>
      </div>

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
                  className={`h-2 rounded-full ${
                    perf.achievement_pct >= 100
                      ? "bg-green-500"
                      : perf.achievement_pct >= 80
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{
                    width: `${Math.min(perf.achievement_pct, 100)}%`,
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
