import React, { useEffect, useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Eye,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Building2,
  UserCheck,
  PenLine,
  Repeat,
  ArrowRightLeft,
  Map,
  ChevronUp,
  ChevronDown,
  GitMerge,
  Link2,
  Play,
} from "lucide-react";
import { Button, Checkbox } from "../../components/ui";
import { incidentApi, incidentMergeApi } from "../../api/admin";
import type {
  Incident,
  IncidentFilter,
  IncidentMergeOption,
} from "../../types";
import { useIncidentListWebSocket } from "../../lib/services/incidentListWebSocket";
import { cn } from "@/lib/utils";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";
import { useAuthStore } from "@/stores/authStore";
import BulkConvertToRequestModal from "@/components/incidents/BulkConvertToRequestModal";
import {
  MergeIncidentsModal,
  BulkTransitionModal,
  SMSLegends,
  IncidentFilters,
} from "../../components/incidents";
import LocationMap from "@/components/maps/LocationMap";

interface MyIncidentsPageProps {
  type: "assigned" | "created";
}

export const MyIncidentsPage: React.FC<MyIncidentsPageProps> = ({ type }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [filter, setFilter] = useState<IncidentFilter>({
    record_type: "incident",
  });
  const [selectedIncidents, setSelectedIncidents] = useState<any[]>([]);
  const [showConvertModal, setShowConvertModal] = useState<boolean>(false);
  const [showBulkTransitionModal, setShowBulkTransitionModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const [isValidationLoading, setIsValidationLoading] =
    useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<{
    canMerge: boolean;
    errors: string[];
    masterOptions: IncidentMergeOption[];
  } | null>(null);

  const isAssigned = type === "assigned";
  const canCreateIncident =
    isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_CREATE);
  const canTransitionIncident =
    isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_TRANSITION);
  const pageTitle = isAssigned
    ? t("incidents.assignedToMe")
    : t("incidents.createdByMe");
  const pageDescription = isAssigned
    ? t("incidents.assignedToMeDesc")
    : t("incidents.createdByMeDesc");
  const PageIcon = isAssigned ? UserCheck : PenLine;

  // Filter handlers
  const handleFilterChange = (key: keyof IncidentFilter, value: any) => {
    setFilter((prev) => {
      const next = { ...prev };
      if (key === "current_state_id") {
        delete next.transition_id;
        delete next.converted_to_request;
      }
      if (value === undefined || value === "" || value === null) {
        delete next[key];
      } else {
        (next as any)[key] = value;
      }
      return next;
    });
    setPage(1);
  };

  const clearFilters = () => {
    setFilter({ record_type: "incident" });
    setPage(1);
  };

  const hasActiveFilters = !!(
    filter.search ||
    filter.workflow_id ||
    filter.current_state_id ||
    (filter.classification_ids && filter.classification_ids.length > 0) ||
    (filter.location_ids && filter.location_ids.length > 0) ||
    (filter.department_ids && filter.department_ids.length > 0) ||
    filter.sla_breached !== undefined ||
    filter.priority !== undefined ||
    !!filter.start_date ||
    !!filter.end_date ||
    !!filter.reporter_phone ||
    !!filter.reporter_phone_search
  );

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
      const errorMsg =
        err.response?.data?.error || t("incidents.merge.validationFailed");
      console.error(errorMsg);
      toast.error(errorMsg);
      setValidationResult({
        canMerge: false,
        errors: [errorMsg],
        masterOptions: [],
      });
    } finally {
      setIsValidationLoading(false);
    }
  };

  const canMergeIncidents =
    isSuperAdmin ||
    (selectedWorkflowId && mergePermissionData?.data?.can_merge) ||
    false;

  const handleMergeSuccess = () => {
    setSelectedIncidents([]);
    setShowMergeModal(false);
    refetch();
    toast.success(t("incidents.merge.mergeSuccess"));
  };

  // Build the full filter for the API query
  const queryFilter: IncidentFilter = useMemo(
    () => ({
      ...filter,
      page,
      limit,
      record_type: "incident",
      ...(isAssigned ? { assignee_id: user?.id } : { reporter_id: user?.id }),
    }),
    [filter, page, limit, isAssigned, user?.id],
  );

  // Skip the API call when search is 1-2 chars
  const isShortSearch = !!(
    queryFilter.search &&
    queryFilter.search.length > 0 &&
    queryFilter.search.length < 3
  );
  const finalFilter = isShortSearch
    ? { ...queryFilter, search: undefined }
    : queryFilter;

  const {
    data: incidentsData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [
      "incidents",
      type === "assigned" ? "my-assigned" : "my-reported",
      finalFilter,
    ],
    queryFn: () => incidentApi.list(finalFilter),
    enabled: !isShortSearch && !!user?.id,
    placeholderData: keepPreviousData,
  });

  const { data: statsData } = useQuery({
    queryKey: ["incidents", "stats", type],
    queryFn: () =>
      incidentApi.getIncidentStatsV2({
        assignee_id: type === "assigned" ? user?.id : undefined,
        reporter_id: type === "created" ? user?.id : undefined,
      }),
  });

  // Real-time viewer count updates via WebSocket (no polling!)
  useIncidentListWebSocket();

  const stats = statsData?.data;
  const incidents = incidentsData?.data || [];
  const totalPages = incidentsData?.total_pages ?? 1;
  const totalItems = incidentsData?.total_items ?? 0;

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

  const toggleSelectAll = (checked: boolean, incidents: any[]) => {
    if (checked) {
      setSelectedIncidents(incidents);
    } else {
      setSelectedIncidents([]);
    }
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
        inc.current_state?.id === first.current_state?.id,
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
  }, [selectedIncidents, validateMerge]);

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
            {t("incidents.errorLoadingMine")}
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <PageIcon className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {pageTitle}
            </h1>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">
            {pageDescription}
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
            {showMap ? t("common.hideMap") : t("common.showMap")}
          </Button>
          {selectedIncidents?.length >= 2 && canMergeIncidents && (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                <span className="text-sm font-medium text-indigo-700">
                  {selectedIncidents?.length} {t("common.selected")}
                </span>
                <button
                  onClick={() => setSelectedIncidents([])}
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
                {t("incidents.merge.title")}
              </Button>
            </>
          )}
          {selectedIncidents?.length > 1 && allSameState ? (
            <Button
              leftIcon={<Repeat className="w-4 h-4" />}
              onClick={() => setShowConvertModal(true)}
            >
              {t("incidents.convertToRequest")}
            </Button>
          ) : null}
          {canTransitionIncident && canBulkTransition && (
            <Button
              variant="outline"
              onClick={() => setShowBulkTransitionModal(true)}
              leftIcon={<Play className="w-4 h-4" />}
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

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <AlertTriangle className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                {stats?.total || 0}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {t("common.total")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                {stats?.open || 0}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {t("incidents.open")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                {stats?.resolved || 0}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {t("incidents.resolved")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                {stats?.sla_breached || 0}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {t("common.sla")} {t("common.breached")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showMap && (
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <LocationMap locations={getLocation()} height="450px" />
        </div>
      )}

      {/* Filters Bar */}
      <IncidentFilters
        filter={filter}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        recordType="incident"
        showAssigneeFilter={false}
        canViewAllIncidents={true}
      />

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
              <PageIcon className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
            </div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
              {t("incidents.noIncidents")}
            </h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              {hasActiveFilters
                ? t("incidents.noIncidentsMatch")
                : isAssigned
                  ? t("incidents.noAssignedIncidents")
                  : t("incidents.noCreatedIncidents")}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                {t("common.clearFilters", "Clear Filters")}
              </Button>
            ) : canCreateIncident ? (
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
                    <th className="px-6 py-4 text-start">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t("incidents.incident")}
                      </span>
                    </th>
                    <th className="px-6 py-4 text-start">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t("common.state")}
                      </span>
                    </th>
                    <th className="px-6 py-4 text-start">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t("common.priority")}
                      </span>
                    </th>
                    <th className="px-6 py-4 text-start">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {isAssigned
                          ? t("common.department")
                          : t("common.assignee")}
                      </span>
                    </th>
                    <th className="px-6 py-4 text-start">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t("common.dueDate")}
                      </span>
                    </th>
                    <th className="px-6 py-4 text-start">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t("common.sla")}
                      </span>
                    </th>
                    <th className="px-6 py-4 text-right">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t("common.actions")}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {incidents.map((incident: Incident) => {
                    const priority = getLookupValue(incident, "PRIORITY");

                    // Detect master and child incidents
                    // Child: is_merged=true AND has master_incident_id
                    // Master: is_merged=true AND NO master_incident_id (or master_incident_id === id)
                    const isChildIncident =
                      incident.is_merged && !!incident.master_incident_id;
                    const isMasterIncident =
                      incident.is_merged && !isChildIncident;

                    return (
                      <tr
                        key={incident.id}
                        className={cn(
                          "hover:bg-[hsl(var(--muted)/0.5)] transition-colors",
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
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <div className="flex items-center gap-2">
                              {/* Master incident icon */}
                              {isMasterIncident && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300"
                                  title={t(
                                    "incidents.masterIncidentHasMergedChildTickets",
                                  )}
                                >
                                  <GitMerge className="w-3 h-3" />
                                  {t("incidents.master")}
                                </span>
                              )}
                              {/* Child incident icon */}
                              {isChildIncident && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300"
                                  title={t("incidents.childIncidentMerged")}
                                >
                                  <Link2 className="w-3 h-3" />
                                  {t("incidents.child")}
                                </span>
                              )}
                              <p
                                className={cn(
                                  "text-xs font-medium mb-0.5",
                                  isChildIncident
                                    ? "text-gray-400 cursor-not-allowed"
                                    : "text-[hsl(var(--primary))] cursor-pointer hover:underline",
                                )}
                                onClick={() =>
                                  !isChildIncident &&
                                  navigate(`/incidents/${incident.id}`)
                                }
                              >
                                {incident.incident_number}
                              </p>
                              <SMSLegends incident={incident} />
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
                        <td className="px-6 py-4">
                          {isAssigned ? (
                            incident.department ? (
                              <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                                <Building2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                                {incident.department.name}
                              </div>
                            ) : (
                              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                                -
                              </span>
                            )
                          ) : incident.assignee ? (
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
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                            <Calendar className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                            {formatDate(incident.due_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
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
                        </td>
                        <td className="px-6 py-4 text-right">
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[hsl(var(--muted)/0.3)]">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {t("incidents.showingResults", {
                    from: (page - 1) * limit + 1,
                    to: Math.min(page * limit, totalItems),
                    total: totalItems,
                  })}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={cn(
                            "w-10 h-10 rounded-lg text-sm font-semibold transition-all",
                            page === pageNum
                              ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/0.3)]"
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
                      setPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={page === totalPages}
                    className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <BulkConvertToRequestModal
        incidents={selectedIncidents}
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        onSuccess={(newRequestId) => {
          setShowConvertModal(false);
          navigate(`/requests/${newRequestId}`);
        }}
      />
      <BulkTransitionModal
        isOpen={showBulkTransitionModal}
        onClose={() => setShowBulkTransitionModal(false)}
        selectedIncidents={selectedIncidents}
        onSuccess={() => {
          setSelectedIncidents([]);
          refetch();
        }}
      />

      <MergeIncidentsModal
        isOpen={showMergeModal}
        onClose={() => setShowMergeModal(false)}
        selectedIncidents={selectedIncidents}
        onMergeSuccess={handleMergeSuccess}
      />
    </div>
  );
};
