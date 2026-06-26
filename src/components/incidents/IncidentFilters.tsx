import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Settings2, Check } from "lucide-react";
import { Button } from "../ui";
import { MultiTreeSelect } from "../ui/MultiTreeSelect";
import {
  workflowApi,
  userApi,
  departmentApi,
  classificationApi,
  locationApi,
  incidentApi,
} from "../../api/admin";
import {
  type IncidentFilter,
  type Workflow,
  type User as UserType,
  type WorkflowState,
  INCIDENT_SOURCES,
} from "../../types";
import { cn, getLocalizedName } from "@/lib/utils";
import i18n from "@/i18n";

// Column configuration (shared across pages)
export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean;
}

export interface IncidentFiltersProps {
  /** Current filter state */
  filter: IncidentFilter;
  /** Callback when any filter value changes */
  onFilterChange: (key: keyof IncidentFilter, value: any) => void;
  /** Callback to clear all filters */
  onClearFilters: () => void;
  /** Whether there are any active filters */
  hasActiveFilters: boolean;
  /** Record type for workflow queries: "incident" | "request" | "both" */
  recordType?: "incident" | "request" | "both";
  /** Show the assignee filter dropdown */
  showAssigneeFilter?: boolean;
  /** Show column configuration */
  showColumnConfig?: boolean;
  /** Column config state (required if showColumnConfig is true) */
  columns?: ColumnConfig[];
  /** Column toggle handler */
  onToggleColumn?: (columnId: string) => void;
  /** Column reset handler */
  onResetColumns?: () => void;
  /** Whether the state filter should be disabled */
  disableStateFilter?: boolean;
  /** Whether the SLA filter should be disabled */
  disableSlaFilter?: boolean;
  /** Whether can view all incidents (affects clear filter visibility) */
  canViewAllIncidents?: boolean;
  /** Whether a status filter was applied from URL */
  hasStatusFilter?: boolean;
  /** For transition filter: uses searchParams directly */
  searchParams?: URLSearchParams;
  setSearchParams?: (params: URLSearchParams) => void;
}

export const IncidentFilters: React.FC<IncidentFiltersProps> = ({
  filter,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
  recordType = "incident",
  showAssigneeFilter = false,
  showColumnConfig = false,
  columns,
  onToggleColumn,
  onResetColumns,
  disableStateFilter = false,
  disableSlaFilter = false,
  canViewAllIncidents = false,
  searchParams,
  setSearchParams,
}) => {
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const columnConfigRef = useRef<HTMLDivElement>(null);

  const sourceOptions = INCIDENT_SOURCES.map((source) => ({
    value: source.value,
    label:
      i18n.language === "ar" && source.label_ar
        ? source.label_ar
        : source.label,
  }));

  // Handle click outside column config dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        columnConfigRef.current &&
        !columnConfigRef.current.contains(event.target as Node)
      ) {
        setShowColumnDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch workflows based on record type
  const { data: workflowsData } = useQuery({
    queryKey: ["workflows", recordType],
    queryFn: async () => {
      if (recordType === "both") {
        const res = await workflowApi.listByRecordType("both", false);
        return { success: true, data: res.data || [] };
      }
      const [primaryRes, bothRes] = await Promise.all([
        workflowApi.listByRecordType(recordType, false),
        workflowApi.listByRecordType("both", false),
      ]);
      const combined = [...(primaryRes.data || []), ...(bothRes.data || [])];
      const unique = combined.filter(
        (item, index, self) =>
          index === self.findIndex((t) => t.id === item.id),
      );
      return { success: true, data: unique };
    },
  });

  // Get all states from workflows for the filter
  const allStates = React.useMemo(
    () => workflowsData?.data?.flatMap((w: Workflow) => w.states || []) || [],
    [workflowsData],
  );

  const uniqueStates = React.useMemo(
    () =>
      allStates.reduce((acc: WorkflowState[], state: WorkflowState) => {
        if (!acc.find((s) => s.name === state.name)) {
          acc.push(state);
        }
        return acc;
      }, []),
    [allStates],
  );

  // Transition filter data (only when a state is selected)
  const { data: availableTransitions, isLoading: isTransitionsLoading } =
    useQuery({
      queryKey: ["incidents", "available-transitions", filter.current_state_id],
      queryFn: () =>
        incidentApi.getTransitionsByState(filter.current_state_id || ""),
      enabled: !!filter.current_state_id,
    });

  // Users for assignee filter
  const { data: usersData } = useQuery({
    queryKey: ["admin", "users", 1, 100],
    queryFn: () => userApi.list(1, 100),
    enabled: showAssigneeFilter,
  });

  // Tree data for multi-selects
  const { data: departmentsData } = useQuery({
    queryKey: ["admin", "departments", "tree"],
    queryFn: () => departmentApi.getTree(),
  });

  const { data: classificationsData } = useQuery({
    queryKey: ["admin", "classifications", "tree"],
    queryFn: () => classificationApi.getTree(),
  });

  const { data: locationsData } = useQuery({
    queryKey: ["admin", "locations", "tree"],
    queryFn: () => locationApi.getTree(),
  });

  const visibleColumnCount = columns?.filter((c) => c.visible).length ?? 0;

  return (
    <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
          <input
            type="text"
            placeholder={t("incidents.searchPlaceholder")}
            value={filter.search || ""}
            onChange={(e) =>
              onFilterChange("search", e.target.value || undefined)
            }
            className="w-full pl-12 pr-4 py-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] focus:bg-[hsl(var(--background))] transition-all text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            leftIcon={<Filter className="w-4 h-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {t("common.filters")}
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 rounded-full bg-[hsl(var(--primary))]" />
            )}
          </Button>
          {hasActiveFilters && canViewAllIncidents && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              {t("common.clear")}
            </Button>
          )}
          {/* Column Configuration */}
          {showColumnConfig && columns && onToggleColumn && onResetColumns && (
            <div className="relative" ref={columnConfigRef}>
              <Button
                variant={showColumnDropdown ? "secondary" : "outline"}
                size="sm"
                leftIcon={<Settings2 className="w-4 h-4" />}
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              >
                {t("common.columns")}
                <span className="ms-1 text-xs text-[hsl(var(--muted-foreground))]">
                  ({visibleColumnCount})
                </span>
              </Button>
              {showColumnDropdown && (
                <div className="absolute end-0 top-full mt-2 w-56 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                      {t("common.configureColumns")}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      {t("common.toggleColumnVisibility")}
                    </p>
                  </div>
                  <div className="py-2 max-h-64 overflow-y-auto">
                    {columns.map((col) => (
                      <button
                        key={col.id}
                        onClick={() => onToggleColumn(col.id)}
                        disabled={col.required}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                          col.required
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-[hsl(var(--muted)/0.5)]",
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                            col.visible
                              ? "bg-[hsl(var(--primary))] border-[hsl(var(--primary))]"
                              : "border-[hsl(var(--border))]",
                          )}
                        >
                          {col.visible && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                        <span
                          className={cn(
                            "flex-1 text-start",
                            col.visible
                              ? "text-[hsl(var(--foreground))]"
                              : "text-[hsl(var(--muted-foreground))]",
                          )}
                        >
                          {t(col.label)}
                        </span>
                        {col.required && (
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">
                            {t("common.required")}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                    <button
                      onClick={onResetColumns}
                      className="text-xs text-[hsl(var(--primary))] hover:text-[hsl(var(--primary)/0.8)] font-medium"
                    >
                      {t("common.resetToDefaults")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-[hsl(var(--border))] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
              {t("common.workflow")}
            </label>
            <select
              value={filter.workflow_id || ""}
              onChange={(e) =>
                onFilterChange("workflow_id", e.target.value || undefined)
              }
              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
            >
              <option value="">{t("common.allWorkflows")}</option>
              {workflowsData?.data?.map((workflow: Workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {getLocalizedName(workflow)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
              {t("common.state")}
            </label>
            <select
              value={filter.current_state_id || ""}
              onChange={(e) =>
                onFilterChange("current_state_id", e.target.value || undefined)
              }
              disabled={disableStateFilter}
              className={cn(
                "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]",
                disableStateFilter ? "opacity-60 cursor-not-allowed" : "",
              )}
            >
              <option value="">{t("common.allStates")}</option>
              {uniqueStates.map((state: WorkflowState) => (
                <option key={state.id} value={state.id}>
                  {getLocalizedName(state)}
                </option>
              ))}
            </select>
          </div>
          {filter.current_state_id && searchParams && setSearchParams && (
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                {t("incidents.transition")}
              </label>

              <select
                value={
                  filter.converted_to_request
                    ? "__converted_to_request__"
                    : filter.transition_id || ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__converted_to_request__") {
                    const params = new URLSearchParams(searchParams);
                    params.delete("transition_id");
                    params.set("converted_to_request", "true");
                    params.set("page", "1");
                    setSearchParams(params);
                  } else {
                    const params = new URLSearchParams(searchParams);
                    params.delete("converted_to_request");
                    params.delete("transition_id");
                    if (val) params.set("transition_id", val);
                    params.set("page", "1");
                    setSearchParams(params);
                  }
                }}
                disabled={isTransitionsLoading}
                className={cn(
                  "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]",
                  isTransitionsLoading ? "opacity-60 cursor-not-allowed" : "",
                )}
              >
                {isTransitionsLoading ? (
                  <option>Loading...</option>
                ) : (
                  <>
                    <option value="">{t("incidents.allTransitions")}</option>
                    {availableTransitions?.data?.map((transition: any) => (
                      <option key={transition.id} value={transition.id}>
                        {getLocalizedName(transition)}
                      </option>
                    ))}
                    <option value="__converted_to_request__">
                      {t("incidents.convertToRequest", "Convert to Request")}
                    </option>
                  </>
                )}
              </select>
            </div>
          )}
          {showAssigneeFilter && (
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                {t("common.assignee")}
              </label>
              <select
                value={filter.assignee_id || ""}
                onChange={(e) =>
                  onFilterChange("assignee_id", e.target.value || undefined)
                }
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
              >
                <option value="">{t("common.allAssignees")}</option>
                {usersData?.data?.map((user: UserType) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name
                      ? `${user.first_name} ${user.last_name || ""}`
                      : user.username}
                  </option>
                ))}
              </select>
            </div>
          )}
          <MultiTreeSelect
            data={departmentsData?.data || []}
            selectedIds={filter.department_ids || []}
            onSelectionChange={(ids) =>
              onFilterChange("department_ids", ids.length ? ids : undefined)
            }
            label={t("common.department")}
            placeholder={t("common.allDepartments")}
            leafOnly={false}
          />
          <MultiTreeSelect
            data={classificationsData?.data || []}
            selectedIds={filter.classification_ids || []}
            onSelectionChange={(ids) =>
              onFilterChange("classification_ids", ids.length ? ids : undefined)
            }
            label={t("common.classification")}
            placeholder={t("common.allClassifications")}
            leafOnly={false}
          />
          <MultiTreeSelect
            data={locationsData?.data || []}
            selectedIds={filter.location_ids || []}
            onSelectionChange={(ids) =>
              onFilterChange("location_ids", ids.length ? ids : undefined)
            }
            label={t("common.location")}
            placeholder={t("common.allLocations")}
            leafOnly={false}
          />
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
              {t("common.priority", "Priority")}
            </label>
            <select
              value={filter.priority ?? ""}
              onChange={(e) =>
                onFilterChange(
                  "priority",
                  e.target.value === "" ? undefined : Number(e.target.value),
                )
              }
              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
            >
              <option value="">
                {t("common.allPriorities", "All Priorities")}
              </option>
              <option value="1">{t("priorities.critical", "Critical")}</option>
              <option value="2">{t("priorities.high", "High")}</option>
              <option value="3">{t("priorities.medium", "Medium")}</option>
              <option value="4">{t("priorities.low", "Low")}</option>
              <option value="5">{t("priorities.veryLow", "Very Low")}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
              {t("incidents.fromDate")}
            </label>
            <input
              type="date"
              value={filter.start_date || ""}
              onChange={(e) =>
                onFilterChange("start_date", e.target.value || undefined)
              }
              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
              {t("incidents.toDate")}
            </label>
            <input
              type="date"
              value={filter.end_date || ""}
              min={filter.start_date || undefined}
              onChange={(e) =>
                onFilterChange("end_date", e.target.value || undefined)
              }
              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
              {t("common.slaStatus")}
            </label>
            <select
              value={
                filter.sla_breached === undefined
                  ? ""
                  : filter.sla_breached.toString()
              }
              onChange={(e) =>
                onFilterChange(
                  "sla_breached",
                  e.target.value === "" ? undefined : e.target.value === "true",
                )
              }
              disabled={disableSlaFilter}
              className={cn(
                "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]",
                disableSlaFilter && "opacity-60 cursor-not-allowed",
              )}
            >
              <option value="">{t("common.all")}</option>
              <option value="true">{t("common.breached")}</option>
              <option value="false">{t("common.onTrack")}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
              {t("common.source")}
            </label>
            <select
              value={filter.source === undefined ? "" : filter.source}
              onChange={(e) => onFilterChange("source", e.target.value)}
              className={cn(
                "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]",
              )}
            >
              <option value="">{t("common.allSources")}</option>
              {sourceOptions?.map((source) => (
                <option value={source.value}>{source.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentFilters;
