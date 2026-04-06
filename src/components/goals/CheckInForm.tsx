import React, { useState } from "react";
import { Send, ChevronDown, ChevronUp } from "lucide-react";
import { CHECK_IN_STATUS_OPTIONS } from "../../types/goal";
import type {
  CheckInStatus,
  CheckInCreateRequest,
  GoalMetric,
} from "../../types/goal";

interface CheckInFormProps {
  metrics?: GoalMetric[];
  isPending: boolean;
  onSubmit: (data: CheckInCreateRequest) => void;
}

const STATUS_BUTTON_STYLES: Record<CheckInStatus, string> = {
  on_track:
    "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300",
  at_risk:
    "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  behind:
    "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300",
  blocked:
    "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-700/30 dark:text-slate-300",
};

const STATUS_SELECTED_STYLES: Record<CheckInStatus, string> = {
  on_track:
    "ring-2 ring-green-500 border-green-500 bg-green-100 dark:ring-green-400 dark:border-green-400 dark:bg-green-900/50",
  at_risk:
    "ring-2 ring-amber-500 border-amber-500 bg-amber-100 dark:ring-amber-400 dark:border-amber-400 dark:bg-amber-900/50",
  behind:
    "ring-2 ring-red-500 border-red-500 bg-red-100 dark:ring-red-400 dark:border-red-400 dark:bg-red-900/50",
  blocked:
    "ring-2 ring-slate-500 border-slate-500 bg-slate-200 dark:ring-slate-400 dark:border-slate-400 dark:bg-slate-600/50",
};

export const CheckInForm: React.FC<CheckInFormProps> = ({
  metrics,
  isPending,
  onSubmit,
}) => {
  const [status, setStatus] = useState<CheckInStatus>("on_track");
  const [content, setContent] = useState("");
  const [showMetrics, setShowMetrics] = useState(false);
  const [metricValues, setMetricValues] = useState<
    Record<string, { value: string; comment: string }>
  >({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const data: CheckInCreateRequest = {
      status,
      content: content.trim(),
    };

    const updates = Object.entries(metricValues)
      .filter(([, v]) => v.value.trim() !== "")
      .map(([metricId, v]) => ({
        metric_id: metricId,
        value: parseFloat(v.value) || 0,
        comment: v.comment.trim() || undefined,
      }));

    if (updates.length > 0) {
      data.metric_updates = updates;
    }

    onSubmit(data);
    setContent("");
    setMetricValues({});
  };

  const updateMetricField = (
    metricId: string,
    field: "value" | "comment",
    val: string,
  ) => {
    setMetricValues((prev) => ({
      ...prev,
      [metricId]: {
        value: prev[metricId]?.value ?? "",
        comment: prev[metricId]?.comment ?? "",
        [field]: val,
      },
    }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5"
    >
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
        New Check-in
      </h3>

      {/* Status selector */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
          How is this goal progressing?
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CHECK_IN_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                status === opt.value
                  ? STATUS_SELECTED_STYLES[opt.value]
                  : STATUS_BUTTON_STYLES[opt.value]
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
          Update <span className="text-red-500">*</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Describe progress, blockers, next steps..."
          rows={3}
          required
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Optional metric updates */}
      {metrics && metrics.length > 0 && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowMetrics(!showMetrics)}
            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {showMetrics ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Update Metrics ({metrics.length})
          </button>

          {showMetrics && (
            <div className="mt-3 space-y-3">
              {metrics.map((metric) => (
                <div
                  key={metric.id}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50"
                >
                  <div className="sm:col-span-3">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {metric.name}
                      <span className="ml-2 text-slate-400 tabular-nums">
                        (current: {metric.current_value} / target:{" "}
                        {metric.target_value})
                      </span>
                    </p>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="any"
                      value={metricValues[metric.id]?.value ?? ""}
                      onChange={(e) =>
                        updateMetricField(metric.id, "value", e.target.value)
                      }
                      placeholder="New value"
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={metricValues[metric.id]?.comment ?? ""}
                      onChange={(e) =>
                        updateMetricField(metric.id, "comment", e.target.value)
                      }
                      placeholder="Comment (optional)"
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || !content.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          {isPending ? "Submitting..." : "Submit Check-in"}
        </button>
      </div>
    </form>
  );
};

export default CheckInForm;
