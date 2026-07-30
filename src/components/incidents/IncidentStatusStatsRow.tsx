import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowStats } from "../../types";

interface IncidentStatusStatsRowProps {
  workflowStats: WorkflowStats[] | undefined;
  total: number;
  activeStateId?: string | null;
  onStatusClick?: (stateId: string) => void;
}

interface AggregatedState {
  id: string;
  name: string;
  name_ar?: string;
  count: number;
  state_type?: string;
}

// Sums counts for same-named states across every workflow into one card per
// status, rather than repeating a status once per workflow.
const aggregateByState = (
  workflowStats: WorkflowStats[],
): AggregatedState[] => {
  const byName = new Map<string, AggregatedState>();

  workflowStats.forEach((workflow) => {
    (workflow.by_state_details || []).forEach((state) => {
      const existing = byName.get(state.name);
      if (existing) {
        existing.count += state.count;
      } else {
        byName.set(state.name, {
          id: state.id,
          name: state.name,
          name_ar: state.name_ar,
          count: state.count,
          state_type: state.state_type,
        });
      }
    });
  });

  return Array.from(byName.values());
};

const STATE_TYPE_STYLES: Record<
  string,
  { icon: LucideIcon; iconClass: string; chipClass: string; barClass: string }
> = {
  initial: {
    icon: AlertCircle,
    iconClass: "text-amber-500",
    chipClass: "bg-amber-500/10",
    barClass: "bg-amber-500",
  },
  normal: {
    icon: Clock,
    iconClass: "text-blue-500",
    chipClass: "bg-blue-500/10",
    barClass: "bg-blue-500",
  },
  terminal: {
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
    chipClass: "bg-emerald-500/10",
    barClass: "bg-emerald-500",
  },
};

const DEFAULT_STATE_STYLE = {
  icon: LayoutGrid,
  iconClass: "text-[hsl(var(--muted-foreground))]",
  chipClass: "bg-[hsl(var(--muted))]",
  barClass: "bg-[hsl(var(--muted-foreground))]",
};

export const IncidentStatusStatsRow: React.FC<IncidentStatusStatsRowProps> = ({
  workflowStats,
  total,
  activeStateId,
  onStatusClick,
}) => {
  const { t, i18n } = useTranslation();

  const states = useMemo(
    () => aggregateByState(workflowStats || []),
    [workflowStats],
  );

  if (states.length === 0 && !total) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
        {t("sidebar.byStatus")}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {states.map((state) => {
          const isActive = activeStateId === state.id;
          const style = state.state_type
            ? STATE_TYPE_STYLES[state.state_type] || DEFAULT_STATE_STYLE
            : DEFAULT_STATE_STYLE;
          const Icon = style.icon;
          const percent = total > 0 ? (state.count / total) * 100 : 0;

          return (
            <button
              key={state.id}
              type="button"
              onClick={() => onStatusClick?.(state.id)}
              disabled={!onStatusClick}
              className={cn(
                "group text-start bg-[hsl(var(--card))] rounded-xl border-2 p-3 shadow-sm transition-all",
                isActive
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                  : "border-[hsl(var(--border))]",
                onStatusClick &&
                  "cursor-pointer hover:border-[hsl(var(--primary)/0.5)] hover:shadow-md hover:-translate-y-0.5",
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={cn("p-1.5 rounded-lg", style.chipClass)}>
                  <Icon className={cn("w-3.5 h-3.5", style.iconClass)} />
                </div>
                <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] truncate">
                  {i18n.language === "ar" && state.name_ar
                    ? state.name_ar
                    : state.name}
                </p>
              </div>
              <p className="text-xl font-bold text-[hsl(var(--foreground))]">
                {state.count}
              </p>
              <div className="mt-2 h-1 w-full rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    style.barClass,
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default IncidentStatusStatsRow;
