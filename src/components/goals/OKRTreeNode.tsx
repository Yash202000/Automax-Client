import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Target,
} from "lucide-react";
import { GoalStatusBadge } from "./GoalStatusBadge";
import { GoalProgressBar } from "./GoalProgressBar";
import type { OKRDepartmentNode, OKRGoalNode } from "../../types/goalAnalytics";

const healthColors: Record<string, string> = {
  on_track: "bg-green-500",
  at_risk: "bg-amber-500",
  behind: "bg-red-500",
};

const healthLabels: Record<string, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  behind: "Behind",
};

// ──────────────────────────────────────────────────
// Goal Node
// ──────────────────────────────────────────────────

const GoalNode: React.FC<{ node: OKRGoalNode; depth: number }> = ({
  node,
  depth,
}) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-lg transition-colors group"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${healthColors[node.health] || "bg-slate-300"}`}
          title={healthLabels[node.health] || node.health}
        />

        <Target className="w-4 h-4 text-slate-400 flex-shrink-0" />

        <Link
          to={`/goals/${node.id}`}
          className="flex-1 min-w-0 flex items-center gap-2"
        >
          <span className="text-sm font-medium text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {node.title}
          </span>
          <GoalStatusBadge status={node.status} />
        </Link>

        {node.owner && (
          <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 hidden sm:block">
            {node.owner.first_name} {node.owner.last_name}
          </span>
        )}

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-20">
            <GoalProgressBar progress={node.progress} size="sm" />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums w-10 text-right">
            {Math.round(node.progress)}%
          </span>
        </div>
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <GoalNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────
// Department Node
// ──────────────────────────────────────────────────

export const DepartmentNode: React.FC<{
  node: OKRDepartmentNode;
  depth: number;
}> = ({ node, depth }) => {
  const [expanded, setExpanded] = useState(true);
  const hasContent =
    (node.goals && node.goals.length > 0) ||
    (node.children && node.children.length > 0);

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700/40 rounded-lg transition-colors cursor-pointer"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        {hasContent ? (
          <span className="p-0.5 text-slate-400">
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        ) : (
          <span className="w-5" />
        )}

        <Building2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />

        <span className="text-sm font-semibold text-slate-900 dark:text-white flex-1 min-w-0 truncate">
          {node.name}
          {node.code && (
            <span className="ml-1.5 text-xs font-normal text-slate-400">
              ({node.code})
            </span>
          )}
        </span>

        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {node.goal_count} goal{node.goal_count !== 1 ? "s" : ""}
        </span>

        {node.goal_count > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-20">
              <GoalProgressBar progress={node.average_progress} size="sm" />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums w-10 text-right">
              {Math.round(node.average_progress)}%
            </span>
          </div>
        )}
      </div>

      {expanded && hasContent && (
        <div>
          {/* Child departments */}
          {node.children?.map((child) => (
            <DepartmentNode key={child.id} node={child} depth={depth + 1} />
          ))}

          {/* Goals in this department */}
          {node.goals?.map((goal) => (
            <GoalNode key={goal.id} node={goal} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DepartmentNode;
