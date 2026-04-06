import React from "react";
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
  const canClose = selectedGoals.every((g) => {
    const transitions = VALID_GOAL_TRANSITIONS[g.status as GoalStatus] || [];
    return transitions.includes("Closed");
  });

  const handleExportSelected = () => {
    try {
      exportGoalsToXlsx(selectedGoals);
      toast.success(`Exported ${selectedCount} goals`);
    } catch {
      toast.error("Failed to export selected goals");
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-blue-600 text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4 animate-fade-in">
      <span className="text-sm font-medium whitespace-nowrap">
        {selectedCount} goal{selectedCount !== 1 ? "s" : ""} selected
      </span>

      <div className="h-5 w-px bg-blue-400" />

      <div className="flex items-center gap-2">
        <button
          onClick={onTransition}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Transition
        </button>
        <button
          onClick={onReassign}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
        >
          <UserRoundPen className="w-3.5 h-3.5" />
          Reassign
        </button>
        <button
          onClick={onClose}
          disabled={!canClose}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-colors"
          title={
            canClose
              ? "Close selected goals"
              : "Only Achieved or Missed goals can be closed"
          }
        >
          <XCircle className="w-3.5 h-3.5" />
          Close
        </button>
        <button
          onClick={handleExportSelected}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </div>

      <div className="h-5 w-px bg-blue-400" />

      <button
        onClick={onClear}
        className="p-1 hover:bg-white/20 rounded transition-colors"
        title="Clear selection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
