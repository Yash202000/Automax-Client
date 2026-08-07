import React from "react";
import { Link } from "react-router-dom";
import {
  Target,
  Building2,
  Calendar,
  Crosshair,
  Pencil,
  Database,
} from "lucide-react";
import type {
  StrategicKPI,
  OperationalKPI,
  AwardKPI,
  Process,
  OperationalObjective,
} from "../../types/kpi";

type KpiCardKPI = (StrategicKPI | OperationalKPI | AwardKPI) & {
  goal?: { title: string };
  owner_dept?: { name: string };
  process?: Process;
  operational_objective?: OperationalObjective;
};

interface KpiCardProps {
  kpi: KpiCardKPI;
  type: "strategic" | "operational" | "award";
  canEdit?: boolean;
}

const typeColorMap: Record<string, string> = {
  strategic: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  operational:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  award:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const typeLabelMap: Record<string, string> = {
  strategic: "Strategic",
  operational: "Operational",
  award: "Award",
};

const statusColorMap: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};

export const KpiCard: React.FC<KpiCardProps> = ({ kpi, type, canEdit }) => {
  // "Objective" for a card = the operational objective chain, wherever it's
  // reachable from: OperationalKPI carries it directly; StrategicKPI/
  // OperationalKPI both carry the child Process, which in turn nests its own
  // parent operational objective.
  const objectiveName =
    kpi.operational_objective?.name_en ??
    kpi.process?.operational_objective?.name_en;
  const childObjectiveName = kpi.process?.name_en;

  const editHref =
    type === "strategic"
      ? `/goals/kpi/dictionary/${kpi.id}/edit`
      : `/goals/kpi/dictionary/${type}/${kpi.id}/edit`;

  return (
    <div className="block rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600/50 transition-all duration-200 group">
      <Link to={`/goals/kpi/dictionary/${type}/${kpi.id}`} className="block">
        {/* Header: Title + Badges */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mb-0.5">
              {kpi.code}
            </p>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
              {kpi.name_en}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColorMap[type] ?? ""}`}
            >
              {typeLabelMap[type] ?? type}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColorMap[kpi.activation_status] ?? ""}`}
            >
              {kpi.activation_status}
            </span>
          </div>
        </div>

        {/* Context: Goal + Objectives */}
        {(kpi.goal || objectiveName || childObjectiveName) && (
          <div className="mb-4 space-y-1">
            {kpi.goal && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Target className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{kpi.goal.title}</span>
              </div>
            )}
            {(objectiveName || childObjectiveName) && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Crosshair className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {[objectiveName, childObjectiveName]
                    .filter(Boolean)
                    .join(" › ")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer: Meta info */}
        <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500 dark:text-slate-400">
          {kpi.owner_dept && (
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {kpi.owner_dept.name}
            </span>
          )}
          {kpi.reporting_frequency && (
            <span className="flex items-center gap-1.5 capitalize">
              <Calendar className="w-3.5 h-3.5" />
              {kpi.reporting_frequency}
            </span>
          )}
          {kpi.data_source && (
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              {kpi.data_source}
            </span>
          )}
        </div>
      </Link>

      {/* Quick actions */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center gap-3">
        <Link
          to={`/goals/kpi/targets?kpi_code=${encodeURIComponent(kpi.code)}`}
          className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <Target className="w-3.5 h-3.5" />
          Targets
        </Link>
        {canEdit && (
          <Link
            to={editHref}
            className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Link>
        )}
      </div>
    </div>
  );
};

export default KpiCard;
