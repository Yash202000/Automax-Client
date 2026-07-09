import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Filter } from "lucide-react";
import { Button } from "../ui";
import type { WorkflowFilter } from "../../types";

export interface WorkflowFilterProps {
  filter: WorkflowFilter;
  onFilterChange: <K extends keyof WorkflowFilter>(
    key: K,
    value: WorkflowFilter[K],
  ) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const WorkflowFilters: React.FC<WorkflowFilterProps> = ({
  filter,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}) => {
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
          <input
            type="text"
            value={filter.search ?? ""}
            onChange={(e) => onFilterChange("search", e.target.value)}
            placeholder={t(
              "workflow.searchPlaceholder", //add it
              "Search workflow name...",
            )}
            className="w-full pl-12 pr-4 py-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] focus:bg-[hsl(var(--background))] transition-all text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            leftIcon={<Filter className="w-4 h-4" />}
            onClick={() => setShowFilters((prev) => !prev)}
          >
            {t("common.filters")}
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 rounded-full bg-[hsl(var(--primary))]" />
            )}
          </Button>
          {/* clear all filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              {t("common.clear")}
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-[hsl(var(--border))] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
              {t("common.status")}
            </label>
            <select
              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
              value={filter.status ?? ""}
              onChange={(e) => onFilterChange("status", e.target.value)}
            >
              <option>{t("common.allStatuses", "All Statuses")}</option>
              <option>{t("common.active", "Active")}</option>
              <option>{t("common.inactive", "Inactive")}</option>
            </select>
          </div>

          {/* Module */}
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
              {t("common.module", "Module")}
            </label>
            <select
              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
              value={filter.module ?? ""}
              onChange={(e) => onFilterChange("module", e.target.value)}
            >
              <option>{t("common.allModules", "All Modules")}</option>
            </select>
          </div>

          {/* Created By */}
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
              {t("common.createdBy", "Created By")}
            </label>
            <select
              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
              value={filter.created_by ?? ""}
              onChange={(e) => onFilterChange("created_by", e.target.value)}
            >
              <option>{t("common.allUsers", "All Users")}</option>
            </select>
          </div>

          {/* Created From */}
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
              {t("common.createdFrom", "Created From")}
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
              value={filter.created_from ?? ""}
              onChange={(e) => onFilterChange("created_from", e.target.value)}
            />
          </div>

          {/* Created To */}
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
              {t("common.createdTo", "Created To")}
            </label>
            <input
              type="date"
              value={filter.created_to ?? ""}
              onChange={(e) => onFilterChange("created_to", e.target.value)}
              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
            />
          </div>

          {/* Last Modified From */}
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
              {t("common.modifiedFrom", "Last Modified From")}
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
              value={filter.modified_from ?? ""}
              onChange={(e) => onFilterChange("modified_from", e.target.value)}
            />
          </div>

          {/* Last Modified To */}
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
              {t("common.modifiedTo", "Last Modified To")}
            </label>
            <input
              type="date"
              value={filter.modified_to ?? ""}
              onChange={(e) => onFilterChange("modified_to", e.target.value)}
              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowFilters;
