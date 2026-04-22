import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { X, ArrowRightLeft, Loader2 } from "lucide-react";
import type { Goal, GoalStatus, BulkActionResponse } from "../../types/goal";
import { VALID_GOAL_TRANSITIONS } from "../../types/goal";
import { useBulkAction } from "../../hooks/useGoals";

interface BulkTransitionModalProps {
  selectedGoals: Goal[];
  onClose: () => void;
  onComplete: () => void;
}

export const BulkTransitionModal: React.FC<BulkTransitionModalProps> = ({
  selectedGoals,
  onClose,
  onComplete,
}) => {
  const { t } = useTranslation();
  const [targetStatus, setTargetStatus] = useState<GoalStatus | "">("");
  const [result, setResult] = useState<BulkActionResponse | null>(null);
  const bulkAction = useBulkAction();

  // Compute the intersection of valid transitions across all selected goals
  const commonTransitions = useMemo(() => {
    if (selectedGoals.length === 0) return [];
    const sets = selectedGoals.map(
      (g) => new Set(VALID_GOAL_TRANSITIONS[g.status as GoalStatus] || []),
    );
    const first = sets[0];
    return [...first].filter((t) => sets.every((s) => s.has(t))) as GoalStatus[];
  }, [selectedGoals]);

  const handleConfirm = () => {
    if (!targetStatus) return;
    bulkAction.mutate(
      {
        goal_ids: selectedGoals.map((g) => g.id),
        action: "transition",
        new_status: targetStatus,
      },
      {
        onSuccess: (data) => {
          setResult(data.data!);
          onComplete();
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("goals.components.bulk.transitionModal.title")}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {!result ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {selectedGoals.length === 1
                  ? t("goals.components.bulk.transitionModal.introOne", {
                      count: selectedGoals.length,
                    })
                  : t("goals.components.bulk.transitionModal.introMany", {
                      count: selectedGoals.length,
                    })}
              </p>

              {commonTransitions.length === 0 ? (
                <p className="text-sm text-amber-600">
                  {t("goals.components.bulk.transitionModal.noCommonTransitions")}
                </p>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t("goals.components.bulk.transitionModal.targetStatusLabel")}
                  </label>
                  <select
                    value={targetStatus}
                    onChange={(e) =>
                      setTargetStatus(e.target.value as GoalStatus)
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="">
                      {t(
                        "goals.components.bulk.transitionModal.selectStatusPlaceholder",
                      )}
                    </option>
                    {commonTransitions.map((s) => (
                      <option key={s} value={s}>
                        {t(`goals.components.badges.status.${s}`)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {t("goals.components.bulk.transitionModal.resultSummary", {
                  success: result.success_count,
                  failed: result.failure_count,
                })}
              </p>
              {result.results
                .filter((r) => !r.success)
                .map((r) => (
                  <p
                    key={r.goal_id}
                    className="text-xs text-red-600 dark:text-red-400"
                  >
                    {r.goal_id.slice(0, 8)}...: {r.error}
                  </p>
                ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          {!result ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleConfirm}
                disabled={
                  !targetStatus ||
                  commonTransitions.length === 0 ||
                  bulkAction.isPending
                }
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {bulkAction.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-4 h-4" />
                )}
                {t("goals.components.bulk.transition")}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {t("common.close")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
