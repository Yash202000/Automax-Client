import {
  ChevronRight,
  Clock,
  GitMerge,
  Link2,
  MapPin,
  MessageSquare,
  Paperclip,
  Smartphone,
  Star,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn, getLocalizedName } from "@/lib/utils";
import { generateRecordTitle } from "@/utils/generateLocalizedTitle";
import type { Incident } from "../../../types";
import { priorityTone, stateTone } from "@/utils/incidentTone";
import { useSourceLabel } from "../../../hooks/useIncidentDisplay";

interface IncidentListCardProps {
  incident: Incident;
  selected?: boolean;
  onSelect?: (incident: Incident) => void;
  selectable?: boolean;
  checked?: boolean;
  onToggle?: (incident: Incident) => void;
}

function priorityName(incident: Incident): string | null {
  const pv = incident.lookup_values?.find(
    (lv) => lv.category?.code === "PRIORITY",
  );
  return getLocalizedName(pv) || null;
}

/**
 * Feed card layout:
 *  row 1 : status pill + priority ............ incident number (mono)
 *  row 2 : title (truncate)
 *  row 3 : attach/comment counts ............. location (truncate)
 */

// True when a ready_to_close incident auto-reverts within the window —
// same helper as the old list.
function getRtcHoursRemaining(incident: Incident): number | null {
  if (
    !incident.ready_to_close_expires_at ||
    !incident.current_state?.is_ready_to_close
  )
    return null;
  const hoursLeft =
    (new Date(incident.ready_to_close_expires_at).getTime() - Date.now()) /
    3_600_000;
  return hoursLeft > 0 ? hoursLeft : null;
}
export function IncidentListCard({
  incident,
  selected,
  onSelect,
  selectable,
  checked,
  onToggle,
}: IncidentListCardProps) {
  const { t } = useTranslation();
  // Same title as the old list: always the generated
  // "classification - location - city" title, never the raw title field.
  const title =
    generateRecordTitle({
      classification: incident.classification,
      location: incident.location,
      city: incident.city,
      address: incident.address,
    }) || incident.incident_number;

  const stateName = getLocalizedName(incident.current_state) || "—";
  const tone = stateTone(stateName);
  const prio = priorityTone(priorityName(incident));
  const locationName =
    getLocalizedName(incident.location) ||
    incident.city ||
    incident.address ||
    "—";
  const sourceLabel = useSourceLabel(incident.source);
  const showSourceChip =
    !!incident.source && incident.source.toLowerCase() !== "web";
  // Child incidents (merged into a master) are dimmed and non-interactive
  // in the old list — same rule here.
  const isChildIncident = !!incident.master_incident_id;
  const isMasterIncident = (incident.merged_incidents_count ?? 0) > 0;
  // Ready-to-close auto-reversion within 24h — amber highlight like the old list.
  const rtcHours = getRtcHoursRemaining(incident);
  const isExpiringSoon = rtcHours !== null && rtcHours <= 24;
  const priorityLabel = priorityName(incident);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(incident)}
      disabled={isChildIncident}
      aria-pressed={!!selected}
      aria-disabled={isChildIncident}
      className={cn(
        "w-full rounded-lg p-2.5 text-start transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500",
        isChildIncident
          ? "opacity-50 cursor-not-allowed border border-transparent"
          : selected
            ? "cursor-pointer bg-[hsl(var(--muted)/0.5)] border border-cyan-500/50 shadow-cyan-950/50 ring-1 ring-cyan-500/20"
            : "cursor-pointer border border-transparent hover:bg-[hsl(var(--muted))] hover:border-[hsl(var(--muted-foreground)/0.3)]",
        isExpiringSoon && "border-s-2 border-s-amber-400",
      )}
    >
      <div className="flex justify-between items-center mb-1.5 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {selectable ? (
            <input
              type="checkbox"
              checked={!!checked}
              disabled={isChildIncident}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggle?.(incident)}
              aria-label={t("incidents.selectIncident", "Select incident")}
              className="h-3.5 w-3.5 shrink-0 rounded bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-cyan-600 dark:text-cyan-500 cursor-pointer accent-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed"
            />
          ) : null}
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide leading-none truncate max-w-[130px]",
              tone.pill,
            )}
          >
            {stateName}
          </span>
          {prio ? (
            <span
              className={cn(
                "text-[10px] flex items-center gap-1 font-medium leading-none shrink-0",
                prio.text,
              )}
            >
              {prio.icon === "star" ? (
                <Star className="h-2 w-2 fill-current" />
              ) : (
                <span className={cn("w-1.5 h-1.5 rounded-full", prio.dot)} />
              )}
              {priorityLabel}
            </span>
          ) : null}
        </div>
        <div
          className={cn(
            "font-mono text-[10px] flex items-center gap-1 leading-none shrink-0",
            selected
              ? "text-cyan-700 dark:text-cyan-400 font-semibold"
              : "text-[hsl(var(--muted-foreground))]",
          )}
        >
          {incident.incident_number}
          <ChevronRight
            className={cn(
              "h-2.5 w-2.5 rtl:rotate-180",
              selected ? "" : "text-[hsl(var(--muted-foreground))]",
            )}
          />
        </div>
      </div>

      <div
        className={cn(
          "text-xs truncate mb-2 leading-snug",
          selected
            ? "font-semibold text-[hsl(var(--foreground))]"
            : "font-medium text-[hsl(var(--muted-foreground))]",
        )}
      >
        {title}
      </div>

      <div className="flex justify-between items-center text-[hsl(var(--muted-foreground))] pt-1.5 border-t border-[hsl(var(--border))] text-[10px] leading-none gap-2">
        <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] shrink-0">
          {showSourceChip ? (
            <span className="flex items-center gap-1">
              <Smartphone className="h-2.5 w-2.5" />
              {sourceLabel}
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <Paperclip className="h-2.5 w-2.5" />
            {incident.attachments_count ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-2.5 w-2.5" />
            {incident.comments_count ?? 0}
          </span>
          {isMasterIncident ? (
            <span
              className="flex items-center gap-1 text-blue-700 dark:text-blue-400"
              title="Master incident (has merged child tickets)"
            >
              <GitMerge className="h-2.5 w-2.5" />
              Master
            </span>
          ) : null}
          {isChildIncident ? (
            <span
              className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]"
              title="Child incident (merged)"
            >
              <Link2 className="h-2.5 w-2.5" />
              Child
            </span>
          ) : null}
          {isExpiringSoon && rtcHours !== null ? (
            <span
              className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-mono"
              title={`Ready to Close expires at ${new Date(incident.ready_to_close_expires_at!).toLocaleString()}`}
            >
              <Clock className="h-2.5 w-2.5" />
              RTC: {Math.floor(rtcHours)}h {Math.round((rtcHours % 1) * 60)}m
            </span>
          ) : null}
        </div>
        <div className="text-[hsl(var(--muted-foreground))] text-[10px] truncate max-w-[140px] flex items-center gap-1">
          <MapPin className="h-2.5 w-2.5 text-[hsl(var(--muted-foreground))] shrink-0" />
          <span className="truncate">{locationName}</span>
        </div>
      </div>
    </button>
  );
}

export default IncidentListCard;
