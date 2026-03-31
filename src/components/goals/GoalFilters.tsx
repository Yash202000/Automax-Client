import React from "react";
import { Search, X } from "lucide-react";
import type { GoalFilter, GoalStatus } from "../../types/goal";
import { GOAL_STATUS_LABELS, GOAL_PRIORITY_OPTIONS } from "../../types/goal";

interface GoalFiltersProps {
  filters: GoalFilter;
  onChange: (updated: GoalFilter) => void;
}

const STATUS_OPTIONS = Object.entries(GOAL_STATUS_LABELS) as [
  GoalStatus,
  string,
][];

export const GoalFilters: React.FC<GoalFiltersProps> = ({
  filters,
  onChange,
}) => {
  const updateFilter = (key: keyof GoalFilter, value: string | undefined) => {
    onChange({
      ...filters,
      [key]: value || undefined,
      // Reset to page 1 when filters change
      page: 1,
    });
  };

  const clearFilters = () => {
    onChange({
      page: 1,
      limit: filters.limit,
    });
  };

  const hasActiveFilters =
    filters.status ||
    filters.priority ||
    filters.search ||
    filters.category ||
    filters.start_from ||
    filters.target_to;

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <label
          htmlFor="goal-filter-search"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="goal-filter-search"
            type="text"
            value={filters.search ?? ""}
            onChange={(e) => updateFilter("search", e.target.value)}
            placeholder="Search goals..."
            className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Status */}
      <div className="min-w-[150px]">
        <label
          htmlFor="goal-filter-status"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Status
        </label>
        <select
          id="goal-filter-status"
          value={filters.status ?? ""}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Priority */}
      <div className="min-w-[140px]">
        <label
          htmlFor="goal-filter-priority"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Priority
        </label>
        <select
          id="goal-filter-priority"
          value={filters.priority ?? ""}
          onChange={(e) => updateFilter("priority", e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">All Priorities</option>
          {GOAL_PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category */}
      <div className="min-w-[150px]">
        <label
          htmlFor="goal-filter-category"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Category
        </label>
        <input
          id="goal-filter-category"
          type="text"
          value={filters.category ?? ""}
          onChange={(e) => updateFilter("category", e.target.value)}
          placeholder="Category..."
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Start From */}
      <div className="min-w-[160px]">
        <label
          htmlFor="goal-filter-start-from"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Start From
        </label>
        <input
          id="goal-filter-start-from"
          type="date"
          value={filters.start_from ?? ""}
          onChange={(e) => updateFilter("start_from", e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Target To */}
      <div className="min-w-[160px]">
        <label
          htmlFor="goal-filter-target-to"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Target To
        </label>
        <input
          id="goal-filter-target-to"
          type="date"
          value={filters.target_to ?? ""}
          onChange={(e) => updateFilter("target_to", e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
          Clear Filters
        </button>
      )}
    </div>
  );
};

export default GoalFilters;
