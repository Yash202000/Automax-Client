import { useMemo, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronRight,
  Clock,
  MessageSquare,
  Star,
  X,
} from "lucide-react";
import { cn, getLocalizedName } from "@/lib/utils";
import RenderWithIncidentMentions from "@/components/common/RenderWithIncidentMentions";
import type { TransitionHistory } from "../../../../types";
import { actorName, actorRole, formatActivityDateTime } from "./workspaceUtils";

function stateChipStyle(color?: string): CSSProperties | undefined {
  if (!color) return undefined;
  return {
    backgroundColor: `${color}20`,
    color,
    borderColor: `${color}50`,
  };
}

/* Activity tab — same transition-history data as IncidentDetailPage:
   vertical rail timeline, node icons, state chips, comment box with
   feedback stars on final close. Newest first. */
export function ActivityTab({
  transitionHistory,
}: {
  transitionHistory: TransitionHistory[];
}) {
  const { t } = useTranslation();
  const ordered = useMemo(
    () => [...transitionHistory].reverse(),
    [transitionHistory],
  );

  if (ordered.length === 0) {
    return (
      <p className="text-center text-[hsl(var(--muted-foreground))] text-xs py-8">
        {t("incidents.noActivity")}
      </p>
    );
  }

  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-sm">
      <div className="relative ps-8 space-y-6">
        <div
          aria-hidden
          className="absolute start-3 top-3 bottom-3 w-0.5 bg-[hsl(var(--muted))]"
        />
        {ordered.map((h) => {
          const transitionName =
            getLocalizedName(h.transition) || t("incidents.stateChanged");
          const dept =
            getLocalizedName(h.performed_by?.department) ||
            getLocalizedName(h.performed_by?.departments?.[0]) ||
            actorRole(h);
          const isFinal = !!h.transition?.is_final_close;
          const isRejection = !!h.transition?.is_rejection;
          const node = isFinal
            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
            : isRejection
              ? "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-400"
              : "bg-cyan-500/20 border-cyan-400 text-cyan-700 dark:text-cyan-400";
          const rating = h.feedbacks?.rating ?? 0;
          return (
            <div key={h.id} className="relative">
              <div
                className={cn(
                  "absolute -start-8 top-0.5 w-8 h-8 rounded-full border flex items-center justify-center",
                  node,
                )}
              >
                {isFinal ? (
                  <Check className="h-3 w-3" />
                ) : isRejection ? (
                  <X className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3 rtl:rotate-180" />
                )}
              </div>
              <div className="bg-[hsl(var(--muted)/0.6)] border border-[hsl(var(--border))] rounded-xl p-4 transition-all hover:border-[hsl(var(--border))]">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2.5">
                  <div>
                    <span className="text-sm font-bold text-[hsl(var(--foreground))]">
                      {transitionName}
                    </span>{" "}
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {t("incidents.by")}{" "}
                      <strong className="text-[hsl(var(--foreground))] font-semibold">
                        {actorName(h)}
                      </strong>
                      {dept ? (
                        <span className="text-[hsl(var(--muted-foreground))] font-normal">
                          {" "}
                          ({dept})
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] font-mono">
                    <Clock className="h-2.5 w-2.5 text-[hsl(var(--muted-foreground))]" />
                    <span>{formatActivityDateTime(h.transitioned_at)}</span>
                  </div>
                </div>
                {h.from_state && h.to_state ? (
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span
                      className="px-2.5 py-1 rounded-md text-xs font-medium border border-transparent"
                      style={stateChipStyle(h.from_state.color)}
                    >
                      {getLocalizedName(h.from_state)}
                    </span>
                    <ChevronRight className="h-3 w-3 text-[hsl(var(--muted-foreground))] rtl:rotate-180" />
                    <span
                      className="px-2.5 py-1 rounded-md text-xs font-medium border border-transparent"
                      style={stateChipStyle(h.to_state.color)}
                    >
                      {getLocalizedName(h.to_state)}
                    </span>
                  </div>
                ) : null}
                {h.comment || h.feedbacks?.comment ? (
                  <div className="bg-[hsl(var(--muted)/0.8)] border border-[hsl(var(--border))] rounded-lg p-3 space-y-2">
                    {h.feedbacks?.comment ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                            <MessageSquare className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                            {t("incidents.feedback")}
                          </span>
                          {rating > 0 && isFinal ? (
                            <div className="flex items-center gap-1">
                              {[0, 1, 2, 3, 4].map((i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    "h-3 w-3",
                                    i < rating
                                      ? "text-amber-700 dark:text-amber-400"
                                      : "text-[hsl(var(--muted-foreground))]",
                                  )}
                                  fill="currentColor"
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <p className="text-xs italic text-[hsl(var(--muted-foreground))]">
                          &quot;
                          <RenderWithIncidentMentions
                            text={h.feedbacks.comment}
                          />
                          &quot;
                        </p>
                      </>
                    ) : null}
                    {h.comment ? (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed font-mono">
                        <RenderWithIncidentMentions text={h.comment} />
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
