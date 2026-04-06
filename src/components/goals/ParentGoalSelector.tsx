import React, { useState, useEffect, useRef } from "react";
import { Search, X, GitBranch } from "lucide-react";
import { useGoals } from "../../hooks/useGoals";
import { GoalStatusBadge } from "./GoalStatusBadge";
import { GoalProgressBar } from "./GoalProgressBar";
import type { GoalBrief } from "../../types/goal";

interface ParentGoalSelectorProps {
  value?: string;
  excludeId?: string;
  selectedGoal?: GoalBrief | null;
  onChange: (goalId: string | undefined, goal?: GoalBrief) => void;
}

export const ParentGoalSelector: React.FC<ParentGoalSelectorProps> = ({
  value,
  excludeId,
  selectedGoal,
  onChange,
}) => {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: goalsData, isLoading } = useGoals({
    search: debouncedSearch || undefined,
    limit: 20,
  });

  const goals = (goalsData?.data ?? []).filter((g) => g.id !== excludeId);

  const handleSelect = (goal: (typeof goals)[0]) => {
    onChange(goal.id, {
      id: goal.id,
      title: goal.title,
      status: goal.status,
      priority: goal.priority,
      progress: goal.progress,
      level: goal.level,
    });
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange(undefined);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        <span className="flex items-center gap-1.5">
          <GitBranch className="w-4 h-4" />
          Parent Goal
        </span>
      </label>

      {value && selectedGoal ? (
        <div className="flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {selectedGoal.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <GoalStatusBadge status={selectedGoal.status} />
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {Math.round(selectedGoal.progress)}%
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search for a parent goal..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      )}

      {isOpen && !value && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          ) : goals.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              No goals found
            </div>
          ) : (
            goals.map((goal) => (
              <button
                key={goal.id}
                type="button"
                onClick={() => handleSelect(goal)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700/40 last:border-b-0"
              >
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {goal.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <GoalStatusBadge status={goal.status} />
                  <GoalProgressBar progress={goal.progress} size="sm" />
                  {goal.level > 0 && (
                    <span className="text-xs text-slate-400">
                      L{goal.level}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ParentGoalSelector;
