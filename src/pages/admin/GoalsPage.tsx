import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Target,
} from "lucide-react";
import { useGoals } from "../../hooks/useGoals";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";
import { GoalStatusBadge } from "../../components/goals/GoalStatusBadge";
import { GoalPriorityBadge } from "../../components/goals/GoalPriorityBadge";
import { GoalProgressBar } from "../../components/goals/GoalProgressBar";
import { GoalFilters } from "../../components/goals/GoalFilters";
import type { GoalFilter, Goal } from "../../types/goal";

export const GoalsPage: React.FC = () => {
  const { hasPermission } = usePermissions();
  const [filters, setFilters] = useState<GoalFilter>({
    page: 1,
    limit: 10,
  });

  const { data, isLoading, error } = useGoals(filters);

  const goals = data?.data ?? [];
  const total = data?.total ?? 0;
  const currentPage = filters.page ?? 1;
  const limit = filters.limit ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const canCreate = hasPermission(PERMISSIONS.GOALS_CREATE);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getOwnerName = (goal: Goal): string => {
    if (goal.owner) {
      return `${goal.owner.first_name} ${goal.owner.last_name}`.trim();
    }
    return goal.owner_id ? goal.owner_id.slice(0, 8) + "..." : "-";
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="rounded-xl border border-red-300 dark:border-red-700/60 bg-red-50 dark:bg-red-900/20 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                Failed to load goals
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                {error instanceof Error
                  ? error.message
                  : "An unexpected error occurred."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Goals
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage and track organizational goals
            </p>
          </div>
        </div>
        {canCreate && (
          <Link
            to="/goals/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Goal
          </Link>
        )}
      </div>

      {/* Filters */}
      <GoalFilters filters={filters} onChange={setFilters} />

      {/* Table Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Target className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              No goals found
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
              Try adjusting your filters or create a new goal.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Target Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {goals.map((goal: Goal) => (
                    <tr
                      key={goal.id}
                      className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          to={`/goals/${goal.id}`}
                          className="text-sm font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {goal.title}
                        </Link>
                        {goal.category && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {goal.category}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <GoalPriorityBadge priority={goal.priority} />
                      </td>
                      <td className="px-6 py-4">
                        <GoalStatusBadge status={goal.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-32">
                          <GoalProgressBar progress={goal.progress} size="sm" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {getOwnerName(goal)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {formatDate(goal.target_date)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: Math.max(1, (prev.page ?? 1) - 1),
                    }))
                  }
                  disabled={currentPage <= 1}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: Math.min(totalPages, (prev.page ?? 1) + 1),
                    }))
                  }
                  disabled={currentPage >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
