import React, { useState } from "react";
import { X, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { GoalMetric } from "../../types/goal";
import { useUpdateMetricValue } from "../../hooks/useGoals";

interface MetricValueUpdateModalProps {
  metric: GoalMetric;
  isOpen: boolean;
  onClose: () => void;
  goalId: string;
}

export const MetricValueUpdateModal: React.FC<MetricValueUpdateModalProps> = ({
  metric,
  isOpen,
  onClose,
  goalId: _goalId,
}) => {
  const [value, setValue] = useState<string>(String(metric.current_value));
  const [comment, setComment] = useState("");
  const updateMetricValue = useUpdateMetricValue();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numValue = Number(value);
    if (isNaN(numValue)) {
      toast.error("Please enter a valid number");
      return;
    }

    updateMetricValue.mutate(
      {
        id: metric.id,
        data: {
          value: numValue,
          comment: comment.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          onClose();
          setValue(String(metric.current_value));
          setComment("");
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Update Metric Value
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {metric.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current / Target reference */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 text-sm">
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                Current:{" "}
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                {metric.current_value}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-600" />
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                Target:{" "}
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                {metric.target_value}
              </span>
            </div>
          </div>

          {/* New value */}
          <div>
            <label
              htmlFor="metric-new-value"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              New Value
            </label>
            <input
              id="metric-new-value"
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Enter new value"
            />
          </div>

          {/* Comment */}
          <div>
            <label
              htmlFor="metric-update-comment"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Comment{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="metric-update-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder="Reason for update..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={updateMetricValue.isPending}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMetricValue.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMetricValue.isPending ? "Updating..." : "Update Value"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MetricValueUpdateModal;
