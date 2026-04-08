import React from "react";
import type { CheckInStatus } from "../../types/goal";

interface CheckInStatusBadgeProps {
  status: CheckInStatus;
}

const STATUS_STYLES: Record<CheckInStatus, string> = {
  on_track:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  at_risk:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  behind: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  blocked:
    "bg-slate-200 text-slate-600 dark:bg-slate-600/50 dark:text-slate-400",
};

const STATUS_LABELS: Record<CheckInStatus, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  behind: "Behind",
  blocked: "Blocked",
};

export const CheckInStatusBadge: React.FC<CheckInStatusBadgeProps> = ({
  status,
}) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.blocked}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
};

export default CheckInStatusBadge;
