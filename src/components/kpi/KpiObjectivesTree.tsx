import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Layers,
  GitBranch,
  Pencil,
  Trash2,
  Plus,
  Download,
  Upload,
} from "lucide-react";
import type { OperationalObjective, Process } from "../../types/kpi";

interface KpiObjectivesTreeProps {
  operationalObjectives: OperationalObjective[];
  processes: Process[];
  canManage?: boolean;
  onAddParent: () => void;
  onEditParent: (item: OperationalObjective) => void;
  onDeleteParent: (id: string) => void;
  onExportParent: () => void;
  onImportParent: () => void;
  onAddChild: () => void;
  onEditChild: (item: Process) => void;
  onDeleteChild: (id: string) => void;
  onExportChild: () => void;
  onImportChild: () => void;
}

// Parent Objective -> Operational Objective hierarchy, shown as an
// expandable tree. This is the single, sole place both levels are created,
// edited, exported, and imported — there are no separate flat tabs for them
// in Master Data anymore.
export const KpiObjectivesTree: React.FC<KpiObjectivesTreeProps> = ({
  operationalObjectives,
  processes,
  canManage,
  onAddParent,
  onEditParent,
  onDeleteParent,
  onExportParent,
  onImportParent,
  onAddChild,
  onEditChild,
  onDeleteChild,
  onExportChild,
  onImportChild,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      {canManage && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-0 px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/20">
          <ObjectivesToolbarGroup
            icon={
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            }
            iconBg="bg-blue-50 dark:bg-blue-900/20"
            title="Parent Objectives"
            addLabel="Add Parent Objective"
            onAdd={onAddParent}
            onExport={onExportParent}
            onImport={onImportParent}
          />
          <div className="hidden lg:block w-px h-9 bg-slate-200 dark:bg-slate-700 mx-6" />
          <ObjectivesToolbarGroup
            icon={
              <GitBranch className="w-4 h-4 text-green-600 dark:text-green-400" />
            }
            iconBg="bg-green-50 dark:bg-green-900/20"
            title="Operational Objectives"
            addLabel="Add Operational Objective"
            onAdd={onAddChild}
            onExport={onExportChild}
            onImport={onImportChild}
          />
        </div>
      )}

      {operationalObjectives.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Layers className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No parent objectives found.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/30">
          {operationalObjectives.map((po) => {
            const children = processes.filter(
              (p) => p.operational_objective_id === po.id,
            );
            const isOpen = expanded.has(po.id);
            return (
              <div key={po.id}>
                <div className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <button
                    onClick={() => toggle(po.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    {children.length > 0 ? (
                      isOpen ? (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      )
                    ) : (
                      <span className="w-4 h-4 shrink-0" />
                    )}
                    <Layers className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {po.name_en}
                    </span>
                    {po.goal && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                        — {po.goal.title}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                      ({children.length})
                    </span>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    {po.pillar && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                        {po.pillar.name_en}
                      </span>
                    )}
                    {po.enabler && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                        {po.enabler.name_en}
                      </span>
                    )}
                    {canManage && (
                      <>
                        <button
                          onClick={() => onEditParent(po)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteParent(po.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {isOpen && children.length > 0 && (
                  <div className="bg-slate-50/50 dark:bg-slate-900/30">
                    {children.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-3 ps-14 pe-6 py-2.5 border-t border-slate-100 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <GitBranch className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                            {c.name_en}
                          </span>
                          {c.unit && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                              · {c.unit}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {c.pillar && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                              {c.pillar.name_en}
                            </span>
                          )}
                          {c.enabler && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                              {c.enabler.name_en}
                            </span>
                          )}
                          {canManage && (
                            <>
                              <button
                                onClick={() => onEditChild(c)}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteChild(c.id)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface ObjectivesToolbarGroupProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  addLabel: string;
  onAdd: () => void;
  onExport: () => void;
  onImport: () => void;
}

const ObjectivesToolbarGroup: React.FC<ObjectivesToolbarGroupProps> = ({
  icon,
  iconBg,
  title,
  addLabel,
  onAdd,
  onExport,
  onImport,
}) => (
  <div className="flex items-center justify-between gap-3 flex-1 min-w-0">
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${iconBg}`}
      >
        {icon}
      </div>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
        {title}
      </span>
    </div>
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={onExport}
        title={`Export ${title}`}
        aria-label={`Export ${title}`}
        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:text-slate-200 dark:hover:bg-slate-700/60 transition-colors"
      >
        <Download className="w-4 h-4" />
      </button>
      <button
        onClick={onImport}
        title={`Import ${title}`}
        aria-label={`Import ${title}`}
        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:text-slate-200 dark:hover:bg-slate-700/60 transition-colors"
      >
        <Upload className="w-4 h-4" />
      </button>
      <button
        onClick={onAdd}
        title={addLabel}
        aria-label={addLabel}
        className="p-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors ms-1"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export default KpiObjectivesTree;
