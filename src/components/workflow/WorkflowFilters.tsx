import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Filter } from "lucide-react";
import { Button } from "../ui";
import type { WorkflowFilter, User } from "../../types";
import { useQuery } from "@tanstack/react-query";
import { permissionApi, userApi } from "@/api/admin";
import { PERMISSIONS } from "@/constants/permissions";

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

  const { data: usersData } = useQuery({
    queryKey: ["admin", "users", 1, 100],
    queryFn: () => userApi.list(1, 100),
  });
  /* fetching workflow record type based on dashboard permissions for clients.  */
  const { data: permissionsData } = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: () => permissionApi.list(),
  });

  const availablePermissionCodes = React.useMemo(
    () =>
      new Set<string>(
        permissionsData?.data?.map((permission) => permission.code) ?? [],
      ),
    [permissionsData],
  );

  const RECORD_TYPE_PERMISSION_MAP = [
    {
      permission: PERMISSIONS.DASHBOARD_INCIDENTS,
      value: "incident",
      label: "Incident",
    },
    {
      permission: PERMISSIONS.DASHBOARD_REQUESTS,
      value: "request",
      label: "Request",
    },
    {
      permission: PERMISSIONS.DASHBOARD_COMPLAINTS,
      value: "complaint",
      label: "Complaint",
    },
    {
      permission: PERMISSIONS.DASHBOARD_QUERIES,
      value: "query",
      label: "Query",
    },
    {
      permission: PERMISSIONS.DASHBOARD_GOALS,
      value: "goal",
      label: "Goal",
    },
  ] as const;

  const recordTypeOptions = RECORD_TYPE_PERMISSION_MAP.filter(
    ({ permission }) => availablePermissionCodes.has(permission),
  );

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
              <option value={""}>
                {t("common.allStatuses", "All Statuses")}
              </option>
              <option value={"active"}>{t("common.active", "Active")}</option>
              <option value="inactive">
                {t("common.inactive", "Inactive")}
              </option>
            </select>
          </div>

          {/* Module */}
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
              {t("workflows.recordType", "Record Type")}
            </label>
            <select
              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
              value={filter.record_type ?? ""}
              onChange={(e) =>
                onFilterChange(
                  "record_type",
                  e.target.value as WorkflowFilter["record_type"],
                )
              }
            >
              <option value={""}>
                {t("workflows.recordTypeAllDesc", "All Records")}
              </option>
              {recordTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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
              <option value={""}>{t("common.allUsers", "All Users")}</option>
              {usersData?.data?.map((user: User) => (
                <option key={user.id} value={user.id}>
                  {user.first_name
                    ? `${user.first_name} ${user.last_name || ""}`
                    : user.username}
                </option>
              ))}
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
