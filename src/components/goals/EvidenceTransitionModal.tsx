import React, { useState, useMemo } from "react";
import { X, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import type {
  AvailableTransition,
  EvidenceTransitionRequest,
} from "../../types/goal";
import { useExecuteEvidenceTransition } from "../../hooks/useGoals";

interface EvidenceTransitionModalProps {
  evidenceId: string;
  evidenceTitle: string;
  evidenceVersion: number;
  transitions: AvailableTransition[];
  isOpen: boolean;
  onClose: () => void;
}

export const EvidenceTransitionModal: React.FC<
  EvidenceTransitionModalProps
> = ({
  evidenceId,
  evidenceTitle,
  evidenceVersion,
  transitions,
  isOpen,
  onClose,
}) => {
  const [selectedTransitionId, setSelectedTransitionId] = useState<
    string | null
  >(null);
  const [comment, setComment] = useState("");
  const executeTransition = useExecuteEvidenceTransition();

  const selectedTransition = useMemo(
    () =>
      transitions.find((t) => t.transition.id === selectedTransitionId) ?? null,
    [transitions, selectedTransitionId],
  );

  const commentRequired = useMemo(() => {
    if (!selectedTransition?.requirements) return false;
    return selectedTransition.requirements.some(
      (r) => r.requirement_type === "comment" && r.is_mandatory,
    );
  }, [selectedTransition]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!selectedTransition) return;

    if (commentRequired && !comment.trim()) {
      return;
    }

    const data: EvidenceTransitionRequest = {
      transition_id: selectedTransition.transition.id,
      comment: comment.trim() || (undefined as unknown as string),
      version: evidenceVersion,
    };

    executeTransition.mutate(
      { evidenceId, data },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  };

  const handleClose = () => {
    setSelectedTransitionId(null);
    setComment("");
    onClose();
  };

  const getTransitionColor = (t: AvailableTransition) => {
    if (t.transition.is_rejection) return "red";
    const code = t.transition.code;
    if (code.startsWith("approve") || code === "approve_l1_final")
      return "green";
    if (code.startsWith("request_changes")) return "amber";
    if (code === "submit" || code === "resubmit") return "blue";
    return "blue";
  };

  const colorClasses: Record<string, { selected: string; default: string }> = {
    green: {
      selected:
        "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300",
      default:
        "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-green-300 dark:hover:border-green-700",
    },
    red: {
      selected:
        "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300",
      default:
        "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-red-300 dark:hover:border-red-700",
    },
    amber: {
      selected:
        "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300",
      default:
        "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-amber-300 dark:hover:border-amber-700",
    },
    blue: {
      selected:
        "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
      default:
        "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-700",
    },
  };

  const executableTransitions = transitions.filter((t) => t.can_execute);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/60">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Transition Evidence
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[300px]">
              {evidenceTitle}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {executableTransitions.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                No transitions available for this evidence in its current state.
              </p>
            </div>
          ) : (
            <>
              {/* Transition Buttons */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Choose Action
                </label>
                <div
                  className={`grid gap-3 ${executableTransitions.length <= 3 ? `grid-cols-${executableTransitions.length}` : "grid-cols-2"}`}
                >
                  {executableTransitions.map((t) => {
                    const color = getTransitionColor(t);
                    const isSelected = selectedTransitionId === t.transition.id;
                    return (
                      <button
                        key={t.transition.id}
                        type="button"
                        onClick={() => setSelectedTransitionId(t.transition.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          isSelected
                            ? colorClasses[color].selected
                            : colorClasses[color].default
                        }`}
                      >
                        <ArrowRight className="w-4 h-4" />
                        {t.transition.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comment */}
              {selectedTransition && (
                <div>
                  <label
                    htmlFor="transition-comment"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Comment{" "}
                    {commentRequired ? (
                      <span className="text-red-500">*</span>
                    ) : (
                      <span className="text-slate-400 font-normal">
                        (optional)
                      </span>
                    )}
                  </label>
                  <textarea
                    id="transition-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required={commentRequired}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    placeholder={
                      commentRequired
                        ? "Please provide a reason..."
                        : "Add a comment..."
                    }
                  />
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={executeTransition.isPending}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            {executableTransitions.length > 0 && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  !selectedTransition ||
                  executeTransition.isPending ||
                  (commentRequired && !comment.trim())
                }
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {executeTransition.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {executeTransition.isPending ? "Processing..." : "Confirm"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvidenceTransitionModal;
