import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, User, BarChart3 } from "lucide-react";
import type { Goal } from "../../types/goal";
import { GoalStatusBadge } from "./GoalStatusBadge";
import { GoalPriorityBadge } from "./GoalPriorityBadge";
import { GoalProgressBar } from "./GoalProgressBar";

interface GoalCardProps {
  goal: Goal;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
  const { t } = useTranslation();
  const ownerName = goal.owner
    ? `${goal.owner.first_name} ${goal.owner.last_name}`.trim()
    : t("goals.components.goalCard.unassigned");

  const formattedTargetDate = goal.target_date
    ? new Date(goal.target_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const metricCount = goal.metrics?.length ?? 0;

  return (
    <Link
      to={`/goals/${goal.id}`}
      className="block rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600/50 transition-all duration-200 group"
    >
      {/* Header: Title + Badges */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 flex-1">
          {goal.title}
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          <GoalPriorityBadge priority={goal.priority} />
          <GoalStatusBadge status={goal.status} />
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <GoalProgressBar progress={goal.progress} size="sm" />
      </div>

      {/* Footer: Meta info */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            {ownerName}
          </span>
          {formattedTargetDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formattedTargetDate}
            </span>
          )}
        </div>
        {metricCount > 0 && (
          <span className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            {metricCount === 1
              ? t("goals.components.goalCard.metricOne", { count: metricCount })
              : t("goals.components.goalCard.metricMany", {
                  count: metricCount,
                })}
          </span>
        )}
      </div>
    </Link>
  );
};

export default GoalCard;
