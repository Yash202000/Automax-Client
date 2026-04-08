import { useState, useMemo } from "react";
import { GitBranch, Target, Filter } from "lucide-react";
import { useOKRTree } from "../../hooks/useGoalAnalytics";
import { DepartmentNode } from "../../components/goals/OKRTreeNode";
import type { OKRTreeFilter } from "../../types/goalAnalytics";

export function OKRAlignmentPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const filter: OKRTreeFilter = useMemo(
    () => ({
      ...(statusFilter && { status: statusFilter }),
      ...(periodStart && { period_start: periodStart }),
      ...(periodEnd && { period_end: periodEnd }),
    }),
    [statusFilter, periodStart, periodEnd],
  );

  const { data: treeResp, isLoading } = useOKRTree(filter);
  const tree = treeResp?.data;

  const hasFilters = statusFilter || periodStart || periodEnd;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            OKR Alignment
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Company → Department → Team → Individual goal cascade
          </p>
        </div>
        {tree && (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Target className="w-4 h-4" />
            <span className="tabular-nums">{tree.total_goals} goals</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Filters
          </span>
          {hasFilters && (
            <button
              onClick={() => {
                setStatusFilter("");
                setPeriodStart("");
                setPeriodEnd("");
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-1.5 text-slate-900 dark:text-white"
            >
              <option value="">All</option>
              <option value="Draft">Draft</option>
              <option value="Active">Active</option>
              <option value="Under_Review">Under Review</option>
              <option value="Achieved">Achieved</option>
              <option value="Missed">Missed</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Period Start
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-1.5 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Period End
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm px-3 py-1.5 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" /> On Track
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> At Risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Behind
        </span>
      </div>

      {/* Tree */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            Loading OKR tree...
          </div>
        ) : tree?.departments?.length ? (
          <div className="py-2">
            {tree.departments.map((dept) => (
              <DepartmentNode key={dept.id} node={dept} depth={0} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <GitBranch className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {hasFilters
                ? "No goals match the current filters"
                : "No goals with department assignments found"}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Assign goals to departments and set parent-child relationships to
              see OKR alignment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default OKRAlignmentPage;
