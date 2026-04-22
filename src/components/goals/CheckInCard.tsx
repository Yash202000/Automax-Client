import React from "react";
import { useTranslation } from "react-i18next";
import { Trash2, TrendingUp, User, Clock } from "lucide-react";
import { CheckInStatusBadge } from "./CheckInStatusBadge";
import type { GoalCheckIn } from "../../types/goal";

interface CheckInCardProps {
  checkIn: GoalCheckIn;
  onDelete?: (id: string) => void;
  canEdit: boolean;
}

export const CheckInCard: React.FC<CheckInCardProps> = ({
  checkIn,
  onDelete,
  canEdit,
}) => {
  const { t } = useTranslation();
  const authorName = checkIn.author
    ? `${checkIn.author.first_name} ${checkIn.author.last_name}`.trim()
    : t("goals.components.checkIn.unknownAuthor");

  const formattedDate = new Date(checkIn.created_at).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  let metricChanges: { metric_id: string; value: number; comment?: string }[] =
    [];
  try {
    if (checkIn.metric_updates) {
      const parsed = JSON.parse(checkIn.metric_updates);
      if (Array.isArray(parsed)) metricChanges = parsed;
    }
  } catch {
    // Ignore parse errors
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <CheckInStatusBadge status={checkIn.status} />
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <User className="w-3.5 h-3.5" />
            <span>{authorName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {canEdit && onDelete && (
          <button
            onClick={() => onDelete(checkIn.id)}
            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title={t("goals.components.checkIn.deleteTitle")}
            aria-label={t("goals.components.checkIn.deleteTitle")}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap mb-3">
        {checkIn.content}
      </p>

      {/* Footer: Progress snapshot + metric changes */}
      <div className="flex items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-700/40">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>
            {t("goals.components.checkIn.progressAtCheckIn")}{" "}
            <span className="font-medium tabular-nums">
              {Math.round(checkIn.progress_snapshot)}%
            </span>
          </span>
        </div>

        {metricChanges.length > 0 && (
          <span className="text-xs text-blue-600 dark:text-blue-400">
            {metricChanges.length === 1
              ? t("goals.components.checkIn.metricUpdateOne", {
                  count: metricChanges.length,
                })
              : t("goals.components.checkIn.metricUpdateMany", {
                  count: metricChanges.length,
                })}
          </span>
        )}
      </div>
    </div>
  );
};

export default CheckInCard;
