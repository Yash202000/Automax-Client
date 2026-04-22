import React from "react";
import { useTranslation } from "react-i18next";
import {
  Hash,
  Percent,
  DollarSign,
  ToggleLeft,
  Weight,
  TrendingUp,
  Trash2,
} from "lucide-react";
import type { GoalMetric, MetricType } from "../../types/goal";
import { GoalProgressBar } from "./GoalProgressBar";

interface MetricCardProps {
  metric: GoalMetric;
  onUpdateValue: (id: string) => void;
  onDelete?: (id: string) => void;
  canEdit: boolean;
}

const METRIC_TYPE_ICONS: Record<MetricType, React.ReactNode> = {
  Numeric: <Hash className="w-4 h-4" />,
  Percentage: <Percent className="w-4 h-4" />,
  Currency: <DollarSign className="w-4 h-4" />,
  Boolean: <ToggleLeft className="w-4 h-4" />,
};

export const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  onUpdateValue,
  onDelete,
  canEdit,
}) => {
  const { t } = useTranslation();

  const formatMetricValue = (value: number, type: MetricType, unit: string) => {
    if (type === "Boolean") {
      return value >= 1
        ? t("goals.components.metric.yes")
        : t("goals.components.metric.no");
    }
    if (type === "Percentage") {
      return `${value}%`;
    }
    if (type === "Currency") {
      return `${unit || "$"}${value.toLocaleString()}`;
    }
    return unit ? `${value.toLocaleString()} ${unit}` : value.toLocaleString();
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
            {METRIC_TYPE_ICONS[metric.metric_type]}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              {metric.name}
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t(`goals.components.metricType.${metric.metric_type}`, {
                defaultValue: metric.metric_type,
              })}
              {metric.unit ? ` (${metric.unit})` : ""}
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
          <Weight className="w-3 h-3" />
          {metric.weight}%
        </span>
      </div>

      {/* Values */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
            {t("goals.components.metric.baseline")}
          </p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
            {formatMetricValue(
              metric.baseline_value,
              metric.metric_type,
              metric.unit,
            )}
          </p>
        </div>
        <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
            {t("goals.components.metric.current")}
          </p>
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 tabular-nums">
            {formatMetricValue(
              metric.current_value,
              metric.metric_type,
              metric.unit,
            )}
          </p>
        </div>
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
            {t("goals.components.metric.target")}
          </p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
            {formatMetricValue(
              metric.target_value,
              metric.metric_type,
              metric.unit,
            )}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <GoalProgressBar progress={metric.progress} size="sm" />
      </div>

      {/* Action Buttons */}
      {canEdit && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateValue(metric.id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            {t("goals.components.metric.updateValue")}
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(metric.id)}
              className="flex items-center justify-center p-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title={t("goals.components.metric.deleteTitle")}
              aria-label={t("goals.components.metric.deleteTitle")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
