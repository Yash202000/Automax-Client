import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronDown, GitBranch } from "lucide-react";
import { GoalStatusBadge } from "./GoalStatusBadge";
import { GoalProgressBar } from "./GoalProgressBar";
import type { GoalBrief } from "../../types/goal";

interface GoalHierarchyTreeProps {
  children: GoalBrief[];
  parentId: string;
}

const TreeNode: React.FC<{ node: GoalBrief; depth: number }> = ({
  node,
  depth,
}) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = false; // GoalBrief doesn't have children — deeper levels loaded on demand

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-lg transition-colors group"
        style={{ paddingInlineStart: `${depth * 24 + 12}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4 rtl:-rotate-180" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <Link
          to={`/goals/${node.id}`}
          className="flex-1 min-w-0 flex items-center gap-3"
        >
          <span className="text-sm font-medium text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {node.title}
          </span>
          <GoalStatusBadge status={node.status} />
        </Link>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-24">
            <GoalProgressBar progress={node.progress} size="sm" />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums w-10 ltr:text-right rtl:text-left">
            {Math.round(node.progress)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export const GoalHierarchyTree: React.FC<GoalHierarchyTreeProps> = ({
  children,
  parentId: _parentId,
}) => {
  const { t } = useTranslation();

  if (children.length === 0) {
    return (
      <div className="text-center py-8">
        <GitBranch className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("goals.components.hierarchyTree.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {children.map((child) => (
        <TreeNode key={child.id} node={child} depth={0} />
      ))}
    </div>
  );
};

export default GoalHierarchyTree;
