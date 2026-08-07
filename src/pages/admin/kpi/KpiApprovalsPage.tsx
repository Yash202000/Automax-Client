import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck,
  AlertCircle,
  Loader2,
  Eye,
  Send,
  CheckCircle,
  XCircle,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import {
  useKpiPerformances,
  useKpiAvailableTransitions,
  useTransitionPerformance,
} from "../../../hooks/useKpi";
import { usePermissions } from "../../../hooks/usePermissions";
import { kpiTransitionPermissionCode } from "../../../utils/kpiTransitionPermission";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import type {
  KpiPerformance,
  KPIPerfStatus,
  WorkflowTransitionBrief,
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

const PerformanceRow: React.FC<{
  perf: KpiPerformance;
  onReview: (p: KpiPerformance) => void;
}> = ({ perf, onReview }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canReviewKpiPerformance } = usePermissions();
  return (
    <tr className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <td className="px-6 py-4 text-sm font-mono text-slate-900 dark:text-white">
        {perf.kpi_code}
      </td>
      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
        {perf.period_key || `Q${perf.quarter} / ${perf.year}`}
      </td>
      <td className="px-6 py-4 text-sm tabular-nums text-slate-700 dark:text-slate-300">
        {perf.target}
      </td>
      <td className="px-6 py-4 text-sm tabular-nums text-slate-700 dark:text-slate-300">
        {perf.actual}
      </td>
      <td className="px-6 py-4 text-sm tabular-nums font-medium text-slate-900 dark:text-white">
        {perf.achievement_pct.toFixed(1)}%
      </td>
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColorMap[perf.status]}`}
        >
          {perf.status}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/goals/kpi/performance/${perf.id}`)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={t("common.view")}
          >
            <Eye className="w-4 h-4" />
          </button>
          {["submitted", "under_review"].includes(perf.status) &&
            canReviewKpiPerformance() && (
              <Button size="sm" onClick={() => onReview(perf)}>
                {t("kpi.approvals.review")}
              </Button>
            )}
        </div>
      </td>
    </tr>
  );
};

export const KpiApprovalsPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"pending" | "completed">(
    "pending",
  );

  const {
    data: submitted,
    isLoading: l1,
    error: e1,
  } = useKpiPerformances({
    status: "submitted",
    limit: 100,
  });
  const {
    data: underReview,
    isLoading: l2,
    error: e2,
  } = useKpiPerformances({
    status: "under_review",
    limit: 100,
  });
  const {
    data: approved,
    isLoading: l3,
    error: e3,
  } = useKpiPerformances({
    status: "approved",
    limit: 100,
  });
  const {
    data: rejected,
    isLoading: l4,
    error: e4,
  } = useKpiPerformances({
    status: "rejected",
    limit: 100,
  });
  const {
    data: published,
    isLoading: l5,
    error: e5,
  } = useKpiPerformances({
    status: "published",
    limit: 100,
  });

  const pending = [
    ...(submitted?.data ?? []),
    ...(underReview?.data ?? []),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const completed = [
    ...(approved?.data ?? []),
    ...(rejected?.data ?? []),
    ...(published?.data ?? []),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  const isLoading = activeTab === "pending" ? l1 || l2 : l3 || l4 || l5;
  const error = activeTab === "pending" ? e1 || e2 : e3 || e4 || e5;
  const items = activeTab === "pending" ? pending : completed;

  const [reviewTarget, setReviewTarget] = useState<KpiPerformance | null>(null);
  const [transitionTarget, setTransitionTarget] =
    useState<WorkflowTransitionBrief | null>(null);
  const [comment, setComment] = useState("");

  const { data: transResp } = useKpiAvailableTransitions(
    reviewTarget?.id ?? "",
  );
  const { hasPermission } = usePermissions();
  const transitions = reviewTarget
    ? (transResp?.data ?? []).filter((tr) =>
        hasPermission(kpiTransitionPermissionCode(tr.code)),
      )
    : [];
  const transitionPerf = useTransitionPerformance();

  const handleTransition = async () => {
    if (!reviewTarget || !transitionTarget) return;
    await transitionPerf.mutateAsync({
      id: reviewTarget.id,
      transitionId: transitionTarget.id,
      comment: comment || undefined,
    });
    setTransitionTarget(null);
    setComment("");
    setReviewTarget(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <ClipboardCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("kpi.approvals.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("kpi.approvals.subtitle")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/60">
        {(["pending", "completed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t(`kpi.approvals.${tab}`)}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">
                {t("kpi.approvals.failedToLoad")}
              </p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ClipboardCheck className="w-10 h-10 text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t(
                `kpi.approvals.empty${activeTab === "pending" ? "Pending" : "Completed"}`,
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.performance.table.kpiCode")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.performance.table.period")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.performance.table.target")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.performance.table.actual")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.performance.table.achievement")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 uppercase">
                    {t("kpi.performance.table.status")}
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((perf) => (
                  <PerformanceRow
                    key={perf.id}
                    perf={perf}
                    onReview={setReviewTarget}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transition picker */}
      <Modal
        isOpen={!!reviewTarget && !transitionTarget}
        onClose={() => setReviewTarget(null)}
        size="sm"
      >
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("kpi.approvals.reviewTitle", { code: reviewTarget?.kpi_code })}
          </h2>
          <div className="flex flex-wrap gap-3">
            {transitions.map((tr) => (
              <button
                key={tr.id}
                onClick={() => setTransitionTarget(tr)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                {transitionIconMap[tr.code] ?? <Send className="w-4 h-4" />}
                {tr.name}
              </button>
            ))}
            {transitions.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("kpi.approvals.noActions")}
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* Confirm modal */}
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
              code: reviewTarget?.kpi_code,
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
