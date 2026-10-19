import { useTranslation } from "react-i18next";
import { Bot, MapPin, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIQualityFeedback } from "../../../../types";

function formatQualityDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
  return `${date}, ${time}`;
}

/* Quality tab — same AI quality feedback as IncidentDetailPage:
   assessment banner (emerald when resolved, amber otherwise) plus
   resolution-status and drift tiles. */
export function QualityTab({
  feedback,
  loading,
}: {
  feedback: AIQualityFeedback | null;
  loading: boolean;
}) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-sm">
        <div className="py-6 flex items-center justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[hsl(var(--border))] border-t-transparent" />
          {t("incidents.updating")}
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-sm">
        <p className="py-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
          {t("incidents.noQualityAssessment")}
        </p>
      </div>
    );
  }

  const isResolved = feedback.resolution_status?.toLowerCase() === "resolved";
  const banner = isResolved
    ? "bg-emerald-500/15 border-emerald-500/30"
    : "bg-amber-500/15 border-amber-500/30";
  const iconBox = isResolved
    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
    : "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400";
  const title = isResolved
    ? "text-emerald-700 dark:text-emerald-300"
    : "text-amber-700 dark:text-amber-300";
  const sub = isResolved
    ? "text-emerald-700 dark:text-emerald-400/80"
    : "text-amber-700 dark:text-amber-400/80";
  const statusColor = isResolved
    ? "text-emerald-700 dark:text-emerald-400"
    : "text-amber-700 dark:text-amber-400";
  const resolutionText = (feedback.resolution_status || "—")
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  const drift = `${Number(feedback.distance_meters ?? 0).toFixed(1)} m`;

  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-sm space-y-4">
      <div
        className={cn(
          "p-4 rounded-xl border flex items-center gap-3.5 shadow-sm",
          banner,
        )}
      >
        <div
          className={cn(
            "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0",
            iconBox,
          )}
        >
          <Bot className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn("text-sm font-bold leading-tight", title)}>
            {t("incidents.aiQualityAssessment")}
          </h3>
          <p className={cn("text-xs mt-0.5", sub)}>
            {t("incidents.processedOn")}{" "}
            {formatQualityDate(feedback.created_at)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="bg-[hsl(var(--muted)/0.6)] border border-[hsl(var(--border))] rounded-xl p-4 space-y-1.5 shadow-sm">
          <div className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] tracking-wide">
            {t("incidents.resolutionStatus")}
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <ShieldCheck className={cn("h-4 w-4 shrink-0", statusColor)} />
            <span className={cn("text-sm font-bold", statusColor)}>
              {resolutionText}
            </span>
          </div>
        </div>
        <div className="bg-[hsl(var(--muted)/0.6)] border border-[hsl(var(--border))] rounded-xl p-4 space-y-1.5 shadow-sm">
          <div className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] tracking-wide">
            {t("incidents.coordinateDrift")}
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <MapPin className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0" />
            <span className="text-sm font-bold text-[hsl(var(--foreground))] font-mono">
              {drift}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
