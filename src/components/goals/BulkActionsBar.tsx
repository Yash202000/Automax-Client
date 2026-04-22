import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRightLeft,
  UserRoundPen,
  XCircle,
  Download,
  X,
} from "lucide-react";
import type { Goal, GoalStatus } from "../../types/goal";
import { VALID_GOAL_TRANSITIONS } from "../../types/goal";
import { exportGoalsToXlsx } from "../../utils/goalExport";
import { toast } from "sonner";

interface BulkActionsBarProps {
  selectedCount: number;
  selectedGoals: Goal[];
  onClear: () => void;
  onTransition: () => void;
  onReassign: () => void;
  onClose: () => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  selectedGoals,
  onClear,
  onTransition,
  onReassign,
  onClose,
}) => {
  const { t } = useTranslation();
  const canClose = selectedGoals.every((g) => {
    const transitions = VALID_GOAL_TRANSITIONS[g.status as GoalStatus] || [];
    return transitions.includes("Closed");
  });

  const handleExportSelected = () => {
    try {
      exportGoalsToXlsx(selectedGoals);
      toast.success(
        selectedCount === 1
          ? t("goals.components.bulk.exportedOne", { count: selectedCount })
          : t("goals.components.bulk.exportedMany", { count: selectedCount }),
      );
    } catch {
      toast.error(t("goals.components.bulk.exportFailed"));
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-blue-600 text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4 animate-fade-in">
      <span className="text-sm font-medium whitespace-nowrap">
        {selectedCount === 1
          ? t("goals.components.bulk.selectedOne", { count: selectedCount })
          : t("goals.components.bulk.selectedMany", { count: selectedCount })}
      </span>

      <div className="h-5 w-px bg-blue-400" />

      <div className="flex items-center gap-2">
        <button
          onClick={onTransition}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          {t("goals.components.bulk.transition")}
        </button>
        <button
          onClick={onReassign}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
        >
          <UserRoundPen className="w-3.5 h-3.5" />
          {t("goals.components.bulk.reassign")}
        </button>
        <button
          onClick={onClose}
          disabled={!canClose}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-colors"
          title={
            canClose
              ? t("goals.components.bulk.closeTitle")
              : t("goals.components.bulk.closeDisabledTitle")
          }
        >
          <XCircle className="w-3.5 h-3.5" />
          {t("goals.components.bulk.close")}
        </button>
        <button
          onClick={handleExportSelected}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          {t("goals.components.bulk.export")}
        </button>
      </div>

      <div className="h-5 w-px bg-blue-400" />

      <button
        onClick={onClear}
        className="p-1 hover:bg-white/20 rounded transition-colors"
        title={t("goals.components.bulk.clearTitle")}
        aria-label={t("goals.components.bulk.clearTitle")}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
