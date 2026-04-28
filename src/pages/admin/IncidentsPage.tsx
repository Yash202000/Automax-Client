import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Eye,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Calendar,
  User,
  Building2,
  Settings2,
  Check,
  ArrowRightLeft,
  Repeat,
  Map,
  ChevronUp,
  ChevronDown,
  GitMerge,
  Link2,
  Play,
} from "lucide-react";
import { Button, Checkbox } from "../../components/ui";
import { MultiTreeSelect } from "../../components/ui/MultiTreeSelect";
import {
  incidentApi,
  workflowApi,
  userApi,
  departmentApi,
  classificationApi,
  locationApi,
  incidentMergeApi,
} from "../../api/admin";
import type {
  Incident,
  IncidentFilter,
  Workflow,
  User as UserType,
  WorkflowState,
  IncidentMergeOption,
} from "../../types";
import { useIncidentListWebSocket } from "../../lib/services/incidentListWebSocket";
import { cn } from "@/lib/utils";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";
import {
  MergeIncidentsModal,
  BulkTransitionModal,
} from "../../components/incidents";
import BulkConvertToRequestModal from "@/components/incidents/BulkConvertToRequestModal";
import { useAuthStore } from "@/stores/authStore";
import { LocationMap } from "@/components/maps";

// Column configuration
interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean; // Can't be hidden
}

const COLUMN_STORAGE_KEY = "incident_columns_config";

const defaultColumns: ColumnConfig[] = [
  {
    id: "incident",
    label: "incidents.incident",
    visible: true,
    required: true,
  },
  { id: "state", label: "incidents.status", visible: true },
  { id: "priority", label: "incidents.priority", visible: true },
  { id: "assignee", label: "incidents.assignee", visible: true },
  { id: "department", label: "incidents.department", visible: false },
  { id: "due_date", label: "incidents.dueDate", visible: true },
  { id: "created_at", label: "incidents.createdAt", visible: false },
  { id: "sla", label: "incidents.slaStatus", visible: true },
  { id: "actions", label: "common.actions", visible: true, required: true },
];

// Returns true when an incident is in a ready_to_close state and within 24 hours of auto-reversion.
const getRtcHoursRemaining = (incident: Incident): number | null => {
  if (
    !incident.ready_to_close_expires_at ||
    !incident.current_state?.is_ready_to_close
  )
    return null;
  const hoursLeft =
    (new Date(incident.ready_to_close_expires_at).getTime() - Date.now()) /
    (1000 * 60 * 60);
  return hoursLeft > 0 ? hoursLeft : null;
};

const loadColumnsFromStorage = (): ColumnConfig[] => {
  try {
    const stored = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ColumnConfig[];
      // Merge with defaults to ensure all columns exist
      return defaultColumns.map((def) => {
        const stored = parsed.find((p) => p.id === def.id);
        return stored ? { ...def, visible: stored.visible } : def;
      });
    }
  } catch {
    // Ignore parse errors
  }
  return defaultColumns;
};

export const IncidentsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const statusFilter = useMemo(() => {
    const stateTypeParam = searchParams.get("state_type");
    const statusParam = searchParams.get("status");
    if (stateTypeParam) {
      return stateTypeParam === "initial"
        ? t("incidents.initial")
        : stateTypeParam === "terminal"
          ? t("incidents.resolved")
          : t("incidents.inProgress");
    } else if (statusParam) {
      return statusParam;
    }
    return null;
  }, [searchParams, t]);
  const [columns, setColumns] = useState<ColumnConfig[]>(
    loadColumnsFromStorage,
  );
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [selectedIncidents, setSelectedIncidents] = useState<any[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const columnConfigRef = useRef<HTMLDivElement>(null);
  const [showConvertModal, setShowConvertModal] = useState<boolean>(false);
  const [showBulkTransitionModal, setShowBulkTransitionModal] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const { user } = useAuthStore();
  const [isValidationLoading, setIsValidationLoading] =
    useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<{
    canMerge: boolean;
    errors: string[];
    masterOptions: IncidentMergeOption[];
  } | null>(null);

  const canViewAllIncidents =
    isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_VIEW_ALL);
  const canTransitionIncident =
    isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_TRANSITION);
  const canCreateIncident =
    isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_CREATE);

  // Check if all selected incidents belong to the same workflow
  const selectedWorkflowId =
    selectedIncidents?.length >= 2
      ? selectedIncidents.every(
          (inc, _, arr) => inc.workflow?.id === arr[0].workflow?.id,
        )
        ? selectedIncidents[0].workflow?.id || null
        : null
      : null;

  // Check merge permission for the selected workflow
  const { data: mergePermissionData } = useQuery({
    queryKey: ["incidents", "merge", "can-merge", selectedWorkflowId],
    queryFn: () => incidentMergeApi.canMerge(selectedWorkflowId || undefined),
    enabled: !!selectedWorkflowId,
  });

  const validateMerge = async () => {
    setIsValidationLoading(true);
    try {
      const incidentIds = selectedIncidents.map((inc) => inc.id);
      const response = await incidentMergeApi.validateMerge(incidentIds);
      const data = response.data;
      setValidationResult({
        canMerge: data?.can_merge ?? false,
        errors: data?.errors || [],
        masterOptions: data?.master_options || [],
      });
    } catch (err: any) {
      console.error(
        err.response?.data?.error || t("incidentMerge.validationFailed"),
      );
    } finally {
      setIsValidationLoading(false);
    }
  };

  const canMergeIncidents =
    isSuperAdmin ||
    (selectedWorkflowId && mergePermissionData?.data?.can_merge) ||
    false;

  // Get status from URL - users with view permission can access if status filter is applied
  const urlStatusParam = searchParams.get("status");
  const urlSlaBreachedParam = searchParams.get("sla_breached");
  const hasUrlFilter = !!urlStatusParam || urlSlaBreachedParam === "true";

  // Redirect if user doesn't have view_all permission AND no status filter is applied
  useEffect(() => {
    if (!canViewAllIncidents && !hasUrlFilter) {
      if (canTransitionIncident) {
        navigate("/incidents/my-assigned", { replace: true });
      } else if (canCreateIncident) {
        navigate("/incidents/my-created", { replace: true });
      }
    }
  }, [
    canViewAllIncidents,
    canTransitionIncident,
    canCreateIncident,
    hasUrlFilter,
    navigate,
  ]);

  // Handle click outside column config dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        columnConfigRef.current &&
        !columnConfigRef.current.contains(event.target as Node)
      ) {
        setShowColumnConfig(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Save columns to localStorage when changed
  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  const toggleColumn = (columnId: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId && !col.required
          ? { ...col, visible: !col.visible }
          : col,
      ),
    );
  };

  const isColumnVisible = (columnId: string) => {
    return columns.find((c) => c.id === columnId)?.visible ?? true;
  };

  const visibleColumnCount = columns.filter((c) => c.visible).length;

  // // Multi-select handlers
  // const toggleSelectIncident = (incidentId: string) => {
  //   setSelectedIncidents(prev => {
  //     const next = new Set(prev);
  //     if (next.has(incidentId)) {
  //       next.delete(incidentId);
  //     } else {
  //       next.add(incidentId);
  //     }
  //     return next;
  //   });
  // };

  const toggleSelectAll = (checked: boolean, incidents: any[]) => {
    if (checked) {
      setSelectedIncidents(incidents);
    } else {
      setSelectedIncidents([]);
    }
  };

  const clearSelection = () => {
    setSelectedIncidents([]);
  };

  const handleMergeSuccess = () => {
    clearSelection();
    setShowMergeModal(false);
    refetch();
    toast.success(t("incidentMerge.mergeSuccess"));
  };

  // Queries - only fetch incident-type workflows
  const { data: workflowsData } = useQuery({
    queryKey: ["workflows", "incident"],
    queryFn: async () => {
      const [incidentRes, bothRes] = await Promise.all([
        workflowApi.listByRecordType("incident", false),
        workflowApi.listByRecordType("both", false),
      ]);
      const combined = [...(incidentRes.data || []), ...(bothRes.data || [])];
      const unique = combined.filter(
        (item, index, self) =>
          index === self.findIndex((t) => t.id === item.id),
      );
      return { success: true, data: unique };
    },
  });

  // Get all states from incident workflows for filter
  const allStates = useMemo(
    () => workflowsData?.data?.flatMap((w: Workflow) => w.states || []) || [],
    [workflowsData],
  );

  const uniqueStates = useMemo(
    () =>
      allStates.reduce((acc: WorkflowState[], state: WorkflowState) => {
        if (!acc.find((s) => s.name === state.name)) {
          acc.push(state);
        }
        return acc;
      }, []),
    [allStates],
  );

  const filter: IncidentFilter = useMemo(() => {
    const statusParam = searchParams.get("status");

    let currentStateId: string | undefined = searchParams.get(
      "current_state_id",
    )
      ? String(searchParams.get("current_state_id"))
      : undefined;

    if (statusParam && uniqueStates.length) {
      const matchingState = uniqueStates.find(
        (s) => s.name.toLowerCase() === statusParam.toLowerCase(),
      );

      if (matchingState) {
        currentStateId = matchingState.id;
      }
    }
    return {
      page: Number(searchParams.get("page") || 1),
      limit: Number(searchParams.get("limit") || 10),
      record_type: "incident",

      search: searchParams.get("search") || undefined,
      workflow_id: searchParams.get("workflow_id") || undefined,
      assignee_id: searchParams.get("assignee_id") || undefined,

      priority: searchParams.get("priority")
        ? Number(searchParams.get("priority"))
        : undefined,

      status: searchParams.get("status") || undefined,

      sla_breached:
        searchParams.get("sla_breached") === "true"
          ? true
          : searchParams.get("sla_breached") === "false"
            ? false
            : undefined,

      department_ids: searchParams.getAll("department_ids"),
      location_ids: searchParams.getAll("location_ids"),
      classification_ids: searchParams.getAll("classification_ids"),

      current_state_id: currentStateId,
      transition_id: searchParams.get("transition_id") || undefined,
    };
  }, [searchParams, uniqueStates]);

  const canConvertToRequest = useMemo(() => {
    if (isSuperAdmin) return true;
    const allowedRoleIds =
      workflowsData?.data
        ?.flatMap((wf) => wf?.convert_to_request_roles || [])
        ?.map((role: any) => role.id) || [];

    const userRoleIds = user?.roles?.map((role: any) => role.id) || [];

    return userRoleIds.some((roleId: string) =>
      allowedRoleIds.includes(roleId),
    );
  }, [user, workflowsData?.data, isSuperAdmin]);

  const { data: statsData } = useQuery({
    queryKey: ["incidents", "stats", "incident"],
    queryFn: () => incidentApi.getStats("incident"),
  });

  const { data: availableTransitions, isLoading: isTransitionsLoading } =
    useQuery({
      queryKey: ["incidents", "available-transitions", filter.current_state_id],
      queryFn: () =>
        incidentApi.getTransitionsByState(filter.current_state_id || ""),
      enabled: !!filter.current_state_id,
    });

  // Skip the API call when search is 1-2 chars — wait for 3+ before fetching
  const isShortSearch = !!(
    filter.search &&
    filter.search.length > 0 &&
    filter.search.length < 3
  );
  const queryFilter = isShortSearch ? { ...filter, search: undefined } : filter;

  const {
    data: incidentsData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["incidents", queryFilter],
    queryFn: () => incidentApi.list(queryFilter),
    enabled: !isShortSearch,
  });

  // Real-time viewer count updates via WebSocket (no polling!)
  useIncidentListWebSocket();

  const { data: usersData } = useQuery({
    queryKey: ["admin", "users", 1, 100],
    queryFn: () => userApi.list(1, 100),
  });

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

  const stats = statsData?.data;
  const incidents = incidentsData?.data || [];
  const totalPages = incidentsData?.total_pages ?? 1;
  const totalItems = incidentsData?.total_items ?? 0;

  const handleFilterChange = (key: keyof IncidentFilter, value: any) => {
    const params = new URLSearchParams(searchParams);

    params.delete(key);

    if (key === "current_state_id") {
      params.delete("transition_id");
    }

    if (value !== undefined && value !== "" && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, v));
      } else {
        params.set(key, String(value));
      }
    }

    // reset page
    params.set("page", "1");

    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({
      page: "1",
      limit: "10",
      record_type: "incident",
    });
  };

  const updatePage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(page));
    setSearchParams(params);
  };
  const hasActiveFilters = !!(
    filter.search ||
    filter.workflow_id ||
    filter.current_state_id ||
    (filter.classification_ids && filter.classification_ids.length > 0) ||
    (filter.location_ids && filter.location_ids.length > 0) ||
    filter.assignee_id ||
    (filter.department_ids && filter.department_ids.length > 0) ||
    filter.sla_breached !== undefined ||
    filter.priority !== undefined
  );

  const getLookupValue = (incident: Incident, categoryCode: string) => {
    return incident.lookup_values?.find(
      (lv) => lv.category?.code === categoryCode,
    );
  };

  const getLookupLabel = (value: any) => {
    if (!value) return null;
    return i18n.language === "ar" && value.name_ar ? value.name_ar : value.name;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    item: Incident,
  ) => {
    const { checked } = e.target;

    setSelectedIncidents((prev) =>
      checked ? [...prev, item] : prev.filter((i) => i.id !== item.id),
    );
  };

  const allSameState =
    selectedIncidents?.length > 0 &&
    selectedIncidents.every(
      (incident) =>
        incident?.current_state?.name ===
          selectedIncidents[0]?.current_state?.name &&
        incident?.location?.id === selectedIncidents[0]?.location?.id &&
        incident?.classification?.id ===
          selectedIncidents[0]?.classification?.id,
    );

  const canBulkTransition = useMemo(() => {
    if (selectedIncidents.length < 2) return false;
    const first = selectedIncidents[0];
    return selectedIncidents.every(
      (inc) =>
        inc.workflow?.id === first.workflow?.id &&
        inc.current_state?.id === first.current_state?.id &&
        inc.classification?.id === first.classification?.id &&
        inc.location?.id === first.location?.id,
    );
  }, [selectedIncidents]);

  const isSelected = (item: Incident) =>
    selectedIncidents.some((i) => i?.id === item?.id);

  const getLocation = () => {
    return (incidents || [])
      .filter(
        (incident) =>
          incident.latitude !== undefined && incident.longitude !== undefined,
      )
      .map((incident) => {
        return {
          id: incident.id,
          name: incident.incident_number,
          code: incident.incident_number,
          description: incident.description,
          latitude: Number(incident.latitude),
          longitude: Number(incident.longitude),
          type: "building",
          address: incident.address || incident.location?.address || "",
        } as any; // Cast as any to avoid missing required Location fields
      });
  };

  useEffect(() => {
    if (selectedIncidents.length >= 2) {
      validateMerge();
    } else {
      setValidationResult(null);
    }
  }, [selectedIncidents]);

  const isMergeDisabled =
    isValidationLoading ||
    !validationResult?.canMerge ||
    (validationResult?.errors?.length ?? 0) > 0;

  if (error) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-[hsl(var(--destructive)/0.1)] rounded-2xl flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-[hsl(var(--destructive))]" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
            {t("incidents.failedToLoad")}
          </h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6 text-center max-w-sm">
            {t("incidents.errorLoading")}
          </p>
          <Button
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            {t("common.tryAgain")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div
        className={`flex flex-col gap-4 ${selectedIncidents.length > 1 ? "lg:flex-col lg:items-start lg:justify-start" : "lg:flex-row lg:items-center lg:justify-between"}`}
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className={`p-2 rounded-lg ${filter.sla_breached ? "bg-red-500/10" : "bg-[hsl(var(--primary)/0.1)]"}`}
            >
              <AlertTriangle
                className={`w-5 h-5 ${filter.sla_breached ? "text-red-500" : "text-[hsl(var(--primary))]"}`}
              />
            </div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {filter.sla_breached
                ? t("incidents.slaBreached")
                : statusFilter
                  ? `${statusFilter} ${t("incidents.title")}`
                  : t("incidents.title")}
            </h1>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">
            {filter.sla_breached
              ? t("incidents.showingSlaBreach")
              : statusFilter
                ? `${t("incidents.showingStatus")}: ${statusFilter}`
                : t("incidents.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={showMap ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowMap(!showMap)}
            leftIcon={<Map className="w-4 h-4" />}
            rightIcon={
              showMap ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )
            }
          >
            {showMap
              ? t("common.hideMap", "Hide Map")
              : t("common.showMap", "Show Map")}
          </Button>
          {selectedIncidents?.length >= 2 && canMergeIncidents && (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                <span className="text-sm font-medium text-indigo-700">
                  {selectedIncidents?.length} {t("common.selected")}
                </span>
                <button
                  onClick={clearSelection}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  {t("common.clear")}
                </button>
              </div>
              <Button
                variant="default"
                onClick={() => setShowMergeModal(true)}
                leftIcon={<ArrowRightLeft className="w-4 h-4" />}
                disabled={isMergeDisabled}
              >
                {t("incidentMerge.title")}
              </Button>
            </>
          )}
          {canConvertToRequest &&
          selectedIncidents?.length > 1 &&
          allSameState ? (
            <Button
              leftIcon={<Repeat className="w-4 h-4" />}
              onClick={() => setShowConvertModal(true)}
            >
              {t("incidents.convertToRequest")}
            </Button>
          ) : null}
          {canTransitionIncident && selectedIncidents?.length > 1 && (
            <Button
              disabled={!canBulkTransition}
              variant="outline"
              onClick={() => setShowBulkTransitionModal(true)}
              leftIcon={<Play className="w-4 h-4" />}
              title={
                !canBulkTransition
                  ? t("incidents.bulkTransitionDisabled")
                  : undefined
              }
            >
              {t("incidents.bulkTransition")}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            leftIcon={
              !isFetching ? <RefreshCw className="w-4 h-4" /> : undefined
            }
          >
            {t("common.refresh")}
          </Button>
          {canCreateIncident && (
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => navigate("/incidents/new")}
            >
              {t("incidents.createIncident")}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && !statusFilter && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <AlertTriangle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  {stats.total}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {t("incidents.total", "Total")}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  {stats.open}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {t("incidents.initial", "Initial")}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  {stats.in_progress}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {t("incidents.inProgress", "In Progress")}
                </p>
              </div>
            </div>
          </div>
          <div
            className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm cursor-pointer hover:border-red-500/50 transition-colors"
            onClick={() => setSearchParams({ sla_breached: "true" })}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  {stats.sla_breached}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {t("incidents.slaBreached", "SLA Breached")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMap && (
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <LocationMap locations={getLocation()} height="450px" />
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
            <input
              type="text"
              placeholder={t("incidents.searchPlaceholder")}
              value={filter.search || ""}
              onChange={(e) =>
                handleFilterChange("search", e.target.value || undefined)
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
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {t("common.clear")}
              </Button>
            )}
            {/* Column Configuration */}
            <div className="relative" ref={columnConfigRef}>
              <Button
                variant={showColumnConfig ? "secondary" : "outline"}
                size="sm"
                leftIcon={<Settings2 className="w-4 h-4" />}
                onClick={() => setShowColumnConfig(!showColumnConfig)}
              >
                {t("common.columns")}
                <span className="ms-1 text-xs text-[hsl(var(--muted-foreground))]">
                  ({visibleColumnCount})
                </span>
              </Button>
              {showColumnConfig && (
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
                        onClick={() => toggleColumn(col.id)}
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
                      onClick={() => setColumns(defaultColumns)}
                      className="text-xs text-[hsl(var(--primary))] hover:text-[hsl(var(--primary)/0.8)] font-medium"
                    >
                      {t("common.resetToDefaults")}
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                  handleFilterChange("workflow_id", e.target.value || undefined)
                }
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
              >
                <option value="">{t("common.allWorkflows")}</option>
                {workflowsData?.data?.map((workflow: Workflow) => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.name}
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
                  handleFilterChange(
                    "current_state_id",
                    e.target.value || undefined,
                  )
                }
                disabled={!canViewAllIncidents && hasUrlFilter}
                className={cn(
                  "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]",
                  !canViewAllIncidents &&
                    hasUrlFilter &&
                    "opacity-60 cursor-not-allowed",
                )}
              >
                <option value="">{t("common.allStates")}</option>
                {uniqueStates.map((state: WorkflowState) => (
                  <option key={state.id} value={state.id}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
            {filter.current_state_id && (
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                  {t("incidents.transition")}
                </label>

                <select
                  value={filter.transition_id || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "transition_id",
                      e.target.value || undefined,
                    )
                  }
                  disabled={
                    isTransitionsLoading ||
                    (!canViewAllIncidents && hasUrlFilter)
                  }
                  className={cn(
                    "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]",
                    (isTransitionsLoading ||
                      (!canViewAllIncidents && hasUrlFilter)) &&
                      "opacity-60 cursor-not-allowed",
                  )}
                >
                  {isTransitionsLoading ? (
                    <option>Loading...</option>
                  ) : (
                    <>
                      <option value="">{t("incidents.allTransitions")}</option>

                      {availableTransitions?.data?.map((transition: any) => (
                        <option key={transition.id} value={transition.id}>
                          {transition.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                {t("common.assignee")}
              </label>
              <select
                value={filter.assignee_id || ""}
                onChange={(e) =>
                  handleFilterChange("assignee_id", e.target.value || undefined)
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
            <MultiTreeSelect
              data={departmentsData?.data || []}
              selectedIds={filter.department_ids || []}
              onSelectionChange={(ids) =>
                handleFilterChange(
                  "department_ids",
                  ids.length ? ids : undefined,
                )
              }
              label={t("common.department")}
              placeholder={t("common.allDepartments")}
              leafOnly={false}
            />
            <MultiTreeSelect
              data={classificationsData?.data || []}
              selectedIds={filter.classification_ids || []}
              onSelectionChange={(ids) =>
                handleFilterChange(
                  "classification_ids",
                  ids.length ? ids : undefined,
                )
              }
              label={t("common.classification")}
              placeholder={t("common.allClassifications")}
              leafOnly={false}
            />
            <MultiTreeSelect
              data={locationsData?.data || []}
              selectedIds={filter.location_ids || []}
              onSelectionChange={(ids) =>
                handleFilterChange("location_ids", ids.length ? ids : undefined)
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
                  handleFilterChange(
                    "priority",
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
              >
                <option value="">
                  {t("common.allPriorities", "All Priorities")}
                </option>
                <option value="1">
                  {t("priorities.critical", "Critical")}
                </option>
                <option value="2">{t("priorities.high", "High")}</option>
                <option value="3">{t("priorities.medium", "Medium")}</option>
                <option value="4">{t("priorities.low", "Low")}</option>
                <option value="5">{t("priorities.veryLow", "Very Low")}</option>
              </select>
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
                  handleFilterChange(
                    "sla_breached",
                    e.target.value === ""
                      ? undefined
                      : e.target.value === "true",
                  )
                }
                disabled={!canViewAllIncidents && hasUrlFilter}
                className={cn(
                  "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]",
                  !canViewAllIncidents &&
                    hasUrlFilter &&
                    "opacity-60 cursor-not-allowed",
                )}
              >
                <option value="">{t("common.all")}</option>
                <option value="true">{t("common.breached")}</option>
                <option value="false">{t("common.onTrack")}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Incidents Table */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[hsl(var(--primary)/0.1)] rounded-2xl mb-4">
              <div className="w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-[hsl(var(--muted-foreground))]">
              {t("incidents.loadingIncidents")}
            </p>
          </div>
        ) : isShortSearch || incidents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[hsl(var(--muted))] rounded-2xl mb-4">
              <AlertTriangle className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
            </div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
              {isShortSearch
                ? t("search.minCharsTitle", "Keep Typing…")
                : t("incidents.noIncidents")}
            </h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              {isShortSearch
                ? t(
                    "search.minCharsDesc",
                    "Enter at least 3 characters to search",
                  )
                : hasActiveFilters
                  ? t("incidents.adjustFilters")
                  : t("incidents.noIncidentsDesc")}
            </p>
            {!isShortSearch && hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                {t("common.clearFilters")}
              </Button>
            ) : !isShortSearch && canCreateIncident ? (
              <Button
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => navigate("/incidents/new")}
              >
                {t("incidents.createIncident")}
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    {/* Select Checkbox Column */}
                    <th className="ps-4">
                      <Checkbox
                        checked={
                          selectedIncidents.length === incidents.length &&
                          incidents.length > 0
                        }
                        onChange={(e) =>
                          toggleSelectAll(e.target.checked, incidents)
                        }
                      />
                    </th>
                    {isColumnVisible("incident") && (
                      <th className="px-6 py-4 text-start">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t("incidents.title")}
                        </span>
                      </th>
                    )}
                    {isColumnVisible("state") && (
                      <th className="px-6 py-4 text-start">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t("common.state")}
                        </span>
                      </th>
                    )}
                    {isColumnVisible("priority") && (
                      <th className="px-6 py-4 text-start">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t("common.priority")}
                        </span>
                      </th>
                    )}
                    {isColumnVisible("assignee") && (
                      <th className="px-6 py-4 text-start">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t("common.assignee")}
                        </span>
                      </th>
                    )}
                    {isColumnVisible("department") && (
                      <th className="px-6 py-4 text-start">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t("common.department")}
                        </span>
                      </th>
                    )}
                    {isColumnVisible("due_date") && (
                      <th className="px-6 py-4 text-start">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t("common.dueDate")}
                        </span>
                      </th>
                    )}
                    {isColumnVisible("created_at") && (
                      <th className="px-6 py-4 text-start">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t("common.created")}
                        </span>
                      </th>
                    )}
                    {isColumnVisible("sla") && (
                      <th className="px-6 py-4 text-start">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t("common.sla")}
                        </span>
                      </th>
                    )}
                    {isColumnVisible("actions") && (
                      <th className="px-6 py-4 text-start">
                        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          {t("common.actions")}
                        </span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {incidents.map((incident: Incident) => {
                    const priority = getLookupValue(incident, "PRIORITY");
                    const rtcHours = getRtcHoursRemaining(incident);
                    const isExpiringSoon = rtcHours !== null && rtcHours <= 24;

                    // Detect master and child incidents
                    const isMasterIncident =
                      (incident.merged_incidents_count ?? 0) > 0;
                    const isChildIncident = !!incident.master_incident_id;

                    return (
                      <tr
                        key={incident.id}
                        className={cn(
                          "hover:bg-[hsl(var(--muted)/0.5)] transition-colors",
                          isExpiringSoon &&
                            "bg-amber-50/40 border-l-2 border-l-amber-400",
                          isChildIncident &&
                            "opacity-50 bg-gray-50/50 pointer-events-none",
                        )}
                      >
                        <td
                          onClick={(e) => e.stopPropagation()}
                          className="ps-4"
                        >
                          <Checkbox
                            id={incident.id}
                            checked={isSelected(incident)}
                            disabled={isChildIncident}
                            onChange={(e) =>
                              !isChildIncident &&
                              handleCheckboxChange(e, incident)
                            }
                          />
                        </td>
                        {isColumnVisible("incident") && (
                          <td className="px-6 py-4">
                            <div className="max-w-xs">
                              <div className="flex items-center gap-2">
                                {/* Master incident icon */}
                                {isMasterIncident && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300"
                                    title="Master incident (has merged child tickets)"
                                  >
                                    <GitMerge className="w-3 h-3" />
                                    Master
                                  </span>
                                )}
                                {/* Child incident icon */}
                                {isChildIncident && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300"
                                    title="Child incident (merged)"
                                  >
                                    <Link2 className="w-3 h-3" />
                                    Child
                                  </span>
                                )}
                                <p
                                  className={cn(
                                    "text-xs font-medium mb-0.5",
                                    isChildIncident
                                      ? "text-gray-400 cursor-not-allowed"
                                      : "text-[hsl(var(--primary))] cursor-pointer",
                                  )}
                                  onClick={() =>
                                    !isChildIncident &&
                                    navigate(`/incidents/${incident.id}`)
                                  }
                                >
                                  {incident.incident_number}
                                </p>
                                {incident.active_viewers &&
                                  incident.active_viewers > 0 && (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300"
                                      title={`${incident.active_viewers} user${incident.active_viewers > 1 ? "s" : ""} currently viewing`}
                                    >
                                      <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                        <path
                                          fillRule="evenodd"
                                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      {incident.active_viewers}
                                    </span>
                                  )}
                              </div>
                              <p className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">
                                {incident.title}
                              </p>
                            </div>
                          </td>
                        )}
                        {isColumnVisible("state") && (
                          <td className="px-6 py-4">
                            {incident.current_state ? (
                              <span
                                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: incident.current_state.color
                                    ? `${incident.current_state.color}20`
                                    : "hsl(var(--muted))",
                                  color:
                                    incident.current_state.color ||
                                    "hsl(var(--foreground))",
                                }}
                              >
                                {incident.current_state.name}
                              </span>
                            ) : (
                              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                                -
                              </span>
                            )}
                          </td>
                        )}
                        {isColumnVisible("priority") && (
                          <td className="px-6 py-4">
                            {priority ? (
                              <span
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-white"
                                style={{
                                  backgroundColor:
                                    priority.color || "bg-gray-400",
                                }}
                              >
                                {getLookupLabel(priority)}
                              </span>
                            ) : (
                              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                                -
                              </span>
                            )}
                          </td>
                        )}
                        {isColumnVisible("assignee") && (
                          <td className="px-6 py-4">
                            {incident.assignee ? (
                              <div className="flex items-center gap-2">
                                {incident.assignee.avatar ? (
                                  <img
                                    src={incident.assignee.avatar}
                                    alt={incident.assignee.username}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center">
                                    <span className="text-white text-xs font-semibold">
                                      {incident.assignee.first_name?.[0] ||
                                        incident.assignee.username[0]}
                                    </span>
                                  </div>
                                )}
                                <span className="text-sm text-[hsl(var(--foreground))]">
                                  {incident.assignee.first_name ||
                                    incident.assignee.username}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {t("common.unassigned")}
                              </span>
                            )}
                          </td>
                        )}
                        {isColumnVisible("department") && (
                          <td className="px-6 py-4">
                            {incident.department ? (
                              <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                                <Building2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                                {incident.department.name}
                              </div>
                            ) : (
                              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                                -
                              </span>
                            )}
                          </td>
                        )}
                        {isColumnVisible("due_date") && (
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                              <Calendar className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                              {formatDate(incident.due_date)}
                            </div>
                          </td>
                        )}
                        {isColumnVisible("created_at") && (
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                              <Clock className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                              {formatDate(incident.created_at)}
                            </div>
                          </td>
                        )}
                        {isColumnVisible("sla") && (
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {incident.sla_breached ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-600">
                                  <AlertTriangle className="w-3 h-3" />
                                  {t("common.breached")}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-600">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {t("common.onTrack")}
                                </span>
                              )}
                              {isExpiringSoon && rtcHours !== null && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700"
                                  title={`Ready to Close expires at ${new Date(incident.ready_to_close_expires_at!).toLocaleString()}`}
                                >
                                  <Clock className="w-3 h-3" />
                                  RTC: {Math.floor(rtcHours)}h{" "}
                                  {Math.round((rtcHours % 1) * 60)}m left
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        {isColumnVisible("actions") && (
                          <td className="px-6 py-4 text-start">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isChildIncident}
                              leftIcon={<Eye className="w-4 h-4" />}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isChildIncident) {
                                  navigate(`/incidents/${incident.id}`);
                                }
                              }}
                            >
                              {t("common.view")}
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[hsl(var(--muted)/0.3)]">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {t("common.showing")}{" "}
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {((filter.page || 1) - 1) * (filter.limit || 10) + 1}
                </span>{" "}
                {t("common.to")}{" "}
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {Math.min(
                    (filter.page || 1) * (filter.limit || 10),
                    totalItems,
                  )}
                </span>{" "}
                {t("common.of")}{" "}
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {totalItems}
                </span>{" "}
                {t("incidents.title").toLowerCase()}
              </p>

              <div dir="ltr" className="flex items-center gap-2">
                <button
                  onClick={() =>
                    updatePage(Math.max(1, (filter.page || 1) - 1))
                  }
                  disabled={(filter.page || 1) === 1}
                  className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const currentPage = filter.page || 1;
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => updatePage(pageNum)}
                        className={cn(
                          "w-10 h-10 rounded-lg text-sm font-semibold transition-all",
                          currentPage === pageNum
                            ? "bg-linear-to-br from-primary to-accent text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/0.3)]"
                            : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] hover:border-[hsl(var(--border))] border border-transparent",
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() =>
                    updatePage(Math.min(totalPages, (filter.page || 1) + 1))
                  }
                  disabled={(filter.page || 1) === totalPages}
                  className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Merge Incidents Modal */}
      {selectedIncidents?.length >= 2 && (
        <MergeIncidentsModal
          isOpen={showMergeModal}
          onClose={() => setShowMergeModal(false)}
          selectedIncidents={selectedIncidents}
          onMergeSuccess={handleMergeSuccess}
        />
      )}

      <BulkTransitionModal
        isOpen={showBulkTransitionModal}
        onClose={() => setShowBulkTransitionModal(false)}
        selectedIncidents={selectedIncidents}
        onSuccess={() => {
          clearSelection();
          refetch();
        }}
      />

      <BulkConvertToRequestModal
        incidents={selectedIncidents}
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        onSuccess={(newRequestId) => {
          setShowConvertModal(false);
          navigate(`/requests/${newRequestId}`);
        }}
      />
    </div>
  );
};
