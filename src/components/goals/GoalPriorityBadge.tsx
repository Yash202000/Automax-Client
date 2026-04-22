import React from "react";
import { useTranslation } from "react-i18next";
import type { GoalPriority } from "../../types/goal";

interface GoalPriorityBadgeProps {
  priority: GoalPriority;
}

const PRIORITY_STYLES: Record<GoalPriority, string> = {
  Critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  High: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Medium:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  Low: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

export const GoalPriorityBadge: React.FC<GoalPriorityBadgeProps> = ({
  priority,
}) => {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLES[priority]}`}
    >
      {t(`goals.components.badges.priority.${priority}`)}
    </span>
  );
};

export default GoalPriorityBadge;
