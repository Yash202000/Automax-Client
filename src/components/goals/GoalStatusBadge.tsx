import React from "react";
import { useTranslation } from "react-i18next";
import type { GoalStatus } from "../../types/goal";

interface GoalStatusBadgeProps {
  status: GoalStatus;
}

const STATUS_STYLES: Record<GoalStatus, string> = {
  Draft: "bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300",
  Active: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Under_Review:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Achieved:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  Missed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Closed:
    "bg-slate-200 text-slate-600 dark:bg-slate-600/50 dark:text-slate-400",
};

export const GoalStatusBadge: React.FC<GoalStatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {t(`goals.components.badges.status.${status}`)}
    </span>
  );
};

export default GoalStatusBadge;
