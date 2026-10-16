import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Filter,
  Plus,
  Search,
  TriangleAlert,
  X,
  ArrowRightLeft,
  Repeat,
  Play,
} from "lucide-react";
import { Button } from "../../components/ui";
import {
  BulkTransitionModal,
  MergeIncidentsModal,
} from "../../components/incidents";
import BulkConvertToRequestModal from "../../components/incidents/BulkConvertToRequestModal";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";
import { useAuthStore } from "../../stores/authStore";
import { useIncidentListWebSocket } from "../../lib/services/incidentListWebSocket";
import { incidentApi, incidentMergeApi, workflowApi } from "../../api/admin";
import type { Incident, IncidentDetail } from "../../types";
import type { FeedFilters } from "../../types";
import { useIncidentsList } from "../../hooks/useIncidentsList";
import { useIncidentStates } from "../../hooks/useIncidentStates";
import {
  EMPTY_FEED_FILTERS,
  isFeedFilterActive,
} from "../../utils/incidentFeed";
import { IncidentListCard } from "./components/IncidentListCard";
import { IncidentsPagination } from "./components/IncidentsPagination";
import { IncidentDetailsWorkspace } from "./components/IncidentDetailsWorkspace";
import { FilterDrawer } from "./components/FilterDrawer";

const PAGE_LIMIT = 10;

/**
 * Split-view incidents page (feed + details workspace).
 *
 * Isolated to `src/pages/incidents` (existing incident files untouched).
 * - Same endpoint as the old page (POST /incidents/search), same permissions.
 * - "New Incident" reuses the existing create page (/incidents/new).
 * - App header + sidebar untouched (renders inside IncidentLayout <Outlet/>).
 *
 * Layout contract:
 * - OUTER: plain fixed-height flex, NOT a card, NOT scrollable.
 * - LEFT feed (w-80): New + Filter (slide-out drawer), compact search
 *   (left only), scrollable cards, pagination pinned LAST.
 * - CENTER: details workspace (own scroll), wired to the selection.
 */
export function IncidentsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const canCreate = isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_CREATE);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState<FeedFilters>(EMPTY_FEED_FILTERS);
  const [draft, setDraft] = useState<FeedFilters>(EMPTY_FEED_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);

  // Bulk selection + bulk ops — same gates and modals as the old list.
  const [selectedIncidents, setSelectedIncidents] = useState<Incident[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showBulkTransitionModal, setShowBulkTransitionModal] = useState(false);
  const [isValidationLoading, setIsValidationLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    canMerge: boolean;
    errors: string[];
    masterOptions: unknown[];
  } | null>(null);

  const toggleBulkSelected = (incident: Incident) => {
    if (incident.master_incident_id) return;
    setSelectedIncidents((prev) =>
      prev.some((i) => i.id === incident.id)
        ? prev.filter((i) => i.id !== incident.id)
        : [...prev, incident],
    );
  };
  const isBulkSelected = (incident: Incident) =>
    selectedIncidents.some((i) => i.id === incident.id);
  const clearBulkSelection = () => setSelectedIncidents([]);

  const selectedWorkflowId =
    selectedIncidents?.length >= 2
      ? selectedIncidents.every(
          (inc, _, arr) => inc.workflow?.id === arr[0].workflow?.id,
        )
        ? selectedIncidents[0].workflow?.id || null
        : null
      : null;

  const { data: mergePermissionData } = useQuery({
    queryKey: [
      "incidents",
      "v2-list",
      "merge",
      "can-merge",
      selectedWorkflowId,
    ],
    queryFn: () => incidentMergeApi.canMerge(selectedWorkflowId || undefined),
    enabled: !!selectedWorkflowId,
  });
  const canMergeIncidents =
    isSuperAdmin ||
    (selectedWorkflowId && mergePermissionData?.data?.can_merge) ||
    false;

  const { data: bulkWorkflowsData } = useQuery({
    queryKey: ["workflows", "incident"],
    queryFn: async () => {
      const [a, b] = await Promise.all([
        workflowApi.listByRecordType("incident", false),
        workflowApi.listByRecordType("both", false),
      ]);
      return [...(a.data || []), ...(b.data || [])];
    },
    staleTime: 300_000,
  });
  const canConvertToRequest = useMemo(() => {
    if (isSuperAdmin) return true;
    const allowedRoleIds =
      bulkWorkflowsData
        ?.flatMap((wf) => wf?.convert_to_request_roles || [])
        ?.map((role: { id: string }) => role.id) || [];
    const userRoleIds = user?.roles?.map((role) => role.id) || [];
    return userRoleIds.some((roleId: string) =>
      allowedRoleIds.includes(roleId),
    );
  }, [user, bulkWorkflowsData, isSuperAdmin]);

  const canTransitionIncident =
    isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_TRANSITION);

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
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      const errorMsg =
        e.response?.data?.error || t("incidents.merge.validationFailed");
      // eslint-disable-next-line no-console
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

  useEffect(() => {
    if (selectedIncidents.length >= 2) {
      void validateMerge();
    } else {
      setValidationResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIncidents]);

  const isMergeDisabled =
    isValidationLoading ||
    !validationResult?.canMerge ||
    (validationResult?.errors?.length ?? 0) > 0;

  const handleMergeSuccess = () => {
    clearBulkSelection();
    setShowMergeModal(false);
    void refetch();
    toast.success(t("incidents.merge.mergeSuccess"));
  };

  // Debounce search -> query (300ms), reset to page 1.
  useEffect(() => {
    const h = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(h);
  }, [searchInput]);

  const {
    incidents,
    totalPages,
    totalItems,
    isLoading,
    isError,
    refetch,
    isShortSearch,
  } = useIncidentsList({ page, limit: PAGE_LIMIT, search, filters: applied });

  // Live viewer-count / list updates (shared singleton, import-only reuse).
  useIncidentListWebSocket();

  // Deep-link preselection (?id=) — used by the /incidents/:id redirect,
  // since there is no standalone details page.
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedId = searchParams.get("id");

  // Resolve the deep link: fetch the incident by id, then narrow the feed
  // to its number so its card is visible and selectable. Until that
  // resolves, hold selection at null so the workspace never flashes an
  // unrelated incident.
  const preselectQuery = useQuery({
    queryKey: ["incidents", "v2-list", "preselect", preselectedId ?? "none"],
    queryFn: () => incidentApi.getById(preselectedId!),
    enabled: !!preselectedId,
    staleTime: 60_000,
    retry: false,
  });
  const preselectDetail = preselectQuery.data?.data ?? null;

  const autoNarrowedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!preselectedId || selectedId) return;
    if (
      !searchInput &&
      preselectDetail &&
      autoNarrowedFor.current !== preselectedId
    ) {
      autoNarrowedFor.current = preselectedId;
      setSearchInput(preselectDetail.incident_number);
      return;
    }
    // 2. Once the incident is visible (or the id proves unresolvable),
    //    promote to normal click-state and drop ?id= so the search box
    //    stays freely editable afterwards.
    const found = incidents.find((i) => i.id === preselectedId);
    const unresolvable = !preselectQuery.isLoading && !preselectDetail;
    const userClearedSearch =
      autoNarrowedFor.current === preselectedId && searchInput === "";
    if (found || unresolvable || userClearedSearch) {
      if (found) setSelectedId(preselectedId);
      const next = new URLSearchParams(searchParams);
      next.delete("id");
      setSearchParams(next, { replace: true });
    }
  }, [
    preselectedId,
    selectedId,
    searchInput,
    preselectDetail,
    incidents,
    preselectQuery.isLoading,
    searchParams,
    setSearchParams,
  ]);

  const resolvingPreselect =
    !!preselectedId &&
    !selectedId &&
    (preselectQuery.isLoading ||
      (!!preselectDetail &&
        searchInput === preselectDetail.incident_number &&
        !incidents.some((i) => i.id === preselectedId)));

  // Derived selection: explicit click first, then ?id=, then first visible
  // card when the id is missing from the current page.
  const selectedIncident: Incident | null = useMemo(() => {
    if (resolvingPreselect) return null;
    if (selectedId) {
      const found = incidents.find((i) => i.id === selectedId);
      if (found) return found;
    }
    if (preselectedId) {
      const found = incidents.find((i) => i.id === preselectedId);
      if (found) return found;
    }
    return incidents[0] ?? null;
  }, [incidents, selectedId, preselectedId, resolvingPreselect]);
  const effectiveSelectedId = selectedIncident?.id ?? null;

  const filterActive = isFeedFilterActive(applied);

  // Sidebar-driven filters: the layout menu links to /incidents with
  // ?status={name} | ?current_state_id={id} | ?sla_breached=true, and bare
  // /incidents for Total. Same route stays mounted, so sync those URL
  // params into the feed filters (drawer selections otherwise untouched).
  const stateOptions = useIncidentStates();
  const urlStatus = searchParams.get("status");
  const urlStateId = searchParams.get("current_state_id");
  const urlSlaBreached = searchParams.get("sla_breached") === "true";

  useEffect(() => {
    const patch: Partial<FeedFilters> = {};
    if (urlStateId) {
      patch.stateIds = [urlStateId];
    } else if (urlStatus) {
      if (stateOptions.length === 0) return; // lookup still loading
      const q = urlStatus.trim().toLowerCase();
      const match = stateOptions.find(
        (s) => s.name.toLowerCase() === q || s.name_ar?.toLowerCase() === q,
      );
      patch.stateIds = match ? [match.id] : [];
    } else if (!preselectedId) {
      // Total (or any param-less visit): clear sidebar-owned dimensions.
      patch.stateIds = [];
      patch.sla = undefined;
    }
    if (urlSlaBreached) patch.sla = "breached";
    if (Object.keys(patch).length === 0) return;
    setApplied((prev) => {
      const sameStates =
        patch.stateIds === undefined ||
        JSON.stringify(prev.stateIds) === JSON.stringify(patch.stateIds);
      const sameSla = !("sla" in patch) || prev.sla === patch.sla;
      if (sameStates && sameSla) return prev;
      return { ...prev, ...patch };
    });
    setPage(1);
  }, [urlStatus, urlStateId, urlSlaBreached, stateOptions, preselectedId]);

  const openDrawer = () => {
    setDraft(applied);
    setDrawerOpen(true);
  };

  return (
    <div
      data-testid="incidents-list-outer"
      className="relative flex h-[calc(100vh-70px-1rem)] w-full min-w-0 flex-col overflow-hidden lg:h-[calc(100vh-70px-2rem)]"
    >
      {/* Stacked (one after another) below md with page-level scroll;
          fixed side-by-side split from md up. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto md:flex-row md:overflow-hidden">
        {/* ── LEFT feed panel (w-80) ─────────────────────────────── */}
        <aside
          aria-label={t("incidents.incidentFeed", "Incident feed")}
          className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm md:min-h-0 md:w-80"
        >
          {/* New + Filter */}
          <div className="p-2.5 border-b border-[hsl(var(--border))] space-y-2 shrink-0">
            <div className="flex items-center gap-2">
              {canCreate ? (
                <Button
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => navigate("/incidents/new")}
                  className="flex-1"
                >
                  {t("incidents.newIncident")}
                </Button>
              ) : null}
              <button
                type="button"
                onClick={openDrawer}
                title={t("incidents.openFilters")}
                className={`px-2.5 py-2 border rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors shrink-0 shadow-sm cursor-pointer ${
                  filterActive || drawerOpen
                    ? "bg-cyan-500/10 dark:bg-cyan-600/20 hover:bg-cyan-600/30 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:text-[hsl(var(--foreground))]"
                    : "bg-[hsl(var(--muted)/0.8)] hover:bg-[hsl(var(--muted)/0.7)] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                <Filter className="h-3 w-3 text-cyan-700 dark:text-cyan-400" />
                {t("common.filter")}
                {filterActive ? (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-cyan-400"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            </div>
            {/* compact search — LEFT SECTION ONLY */}
            <div className="relative">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("incidents.feedSearchPlaceholder")}
                aria-label={t("incidents.searchIncidents")}
                className="w-full bg-[hsl(var(--muted)/0.8)] border border-[hsl(var(--border))] rounded-lg py-1 ps-7 pe-7 text-xs focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 placeholder:text-[hsl(var(--muted-foreground))] text-[hsl(var(--foreground))] outline-none"
              />
              <Search className="pointer-events-none absolute start-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label={t("incidents.clearSearch")}
                  className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--muted-foreground))]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {/* bulk selection bar — same gates and modals as the old list */}
          {selectedIncidents.length > 0 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] flex-wrap shrink-0">
              <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
                {selectedIncidents.length} {t("common.selected")}
              </span>
              <button
                type="button"
                onClick={clearBulkSelection}
                className="text-[11px] text-cyan-700 dark:text-cyan-400 hover:text-cyan-700 dark:text-cyan-300 font-medium"
              >
                {t("common.clear")}
              </button>
              {selectedIncidents.length >= 2 && canMergeIncidents ? (
                <button
                  type="button"
                  onClick={() => setShowMergeModal(true)}
                  disabled={isMergeDisabled}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold transition-colors disabled:opacity-40"
                >
                  <ArrowRightLeft className="h-3 w-3" />
                  {t("incidents.merge.title")}
                </button>
              ) : null}
              {canConvertToRequest &&
              selectedIncidents.length > 1 &&
              allSameState ? (
                <button
                  type="button"
                  onClick={() => setShowConvertModal(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] text-[11px] font-medium transition-colors"
                >
                  <Repeat className="h-3 w-3" />
                  {t("incidents.convertToRequest")}
                </button>
              ) : null}
              {canTransitionIncident && selectedIncidents.length > 1 ? (
                <button
                  type="button"
                  disabled={!canBulkTransition}
                  onClick={() => setShowBulkTransitionModal(true)}
                  title={
                    !canBulkTransition
                      ? t("incidents.bulkTransitionDisabled")
                      : undefined
                  }
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] text-[11px] font-medium transition-colors disabled:opacity-40"
                >
                  <Play className="h-3 w-3" />
                  {t("incidents.bulkTransition")}
                </button>
              ) : null}
            </div>
          ) : null}

          {/* cards — inner scroll from md up, natural flow when stacked */}
          <div
            data-testid="incidents-list-scroll"
            className="space-y-2 p-2.5 md:min-h-0 md:flex-1 md:overflow-y-auto"
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">
                  {t("incidents.loadingIncidents", "Loading incidents…")}
                </p>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[hsl(var(--border))] py-14 text-center">
                <TriangleAlert className="h-6 w-6 text-rose-700 dark:text-rose-400" />
                <p className="mt-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                  {t("incidents.failedToLoad", "Failed to load")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => refetch()}
                >
                  {t("common.tryAgain", "Try again")}
                </Button>
              </div>
            ) : isShortSearch ? (
              <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
                {t("search.minCharsTitle")} {t("search.minCharsDesc")}
              </div>
            ) : incidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[hsl(var(--border))] py-14 text-center">
                <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                  {t("incidents.noIncidents", "No incidents")}
                </p>
                <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                  {search || filterActive
                    ? t("incidents.tryDifferentSearch")
                    : t("incidents.noIncidentsDesc", "Nothing here yet.")}
                </p>
              </div>
            ) : (
              incidents.map((incident) => (
                <IncidentListCard
                  key={incident.id}
                  incident={incident}
                  selected={incident.id === effectiveSelectedId}
                  onSelect={(inc) => setSelectedId(inc.id)}
                  selectable
                  checked={isBulkSelected(incident)}
                  onToggle={toggleBulkSelected}
                />
              ))
            )}
          </div>

          {/* pagination LAST — pinned footer */}
          <div className="p-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] shrink-0">
            <IncidentsPagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              limit={PAGE_LIMIT}
              onPageChange={setPage}
            />
          </div>
        </aside>

        {/* ── CENTER workspace (stacked below md, side pane from md) ── */}
        <section
          aria-label={t("incidents.incidentDetails")}
          className="flex w-full min-w-0 shrink-0 flex-col overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-background md:min-h-0 md:flex-1 md:shrink"
        >
          {resolvingPreselect ? (
            <div
              className="flex h-full flex-col items-center justify-center gap-2 p-8"
              role="status"
              aria-label={t("incidents.loadingIncident", "Loading incident")}
            >
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--border))] border-t-cyan-400" />
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {t("incidents.loadingIncident", "Loading incident…")}
              </p>
            </div>
          ) : (
            <IncidentDetailsWorkspace
              key={selectedIncident?.id ?? "none"}
              incident={selectedIncident}
            />
          )}
        </section>
      </div>

      {/* ── slide-out filter drawer ──────────────────────────────── */}
      {drawerOpen ? (
        <>
          <div
            className="absolute inset-0 z-40 bg-black/60"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <FilterDrawer
            draft={draft}
            onChange={setDraft}
            onReset={() => setDraft(EMPTY_FEED_FILTERS)}
            onApply={() => {
              setApplied(draft);
              setPage(1);
              setDrawerOpen(false);
            }}
            onClose={() => setDrawerOpen(false)}
          />
        </>
      ) : null}

      {/* bulk ops — same modals as the old list */}
      {selectedIncidents.length >= 2 ? (
        <MergeIncidentsModal
          isOpen={showMergeModal}
          onClose={() => setShowMergeModal(false)}
          selectedIncidents={selectedIncidents}
          onMergeSuccess={handleMergeSuccess}
        />
      ) : null}
      <BulkTransitionModal
        isOpen={showBulkTransitionModal}
        onClose={() => setShowBulkTransitionModal(false)}
        selectedIncidents={selectedIncidents}
        onSuccess={() => {
          clearBulkSelection();
          void refetch();
        }}
      />
      <BulkConvertToRequestModal
        incidents={selectedIncidents as IncidentDetail[]}
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        onSuccess={(newRequestId) => {
          setShowConvertModal(false);
          navigate(`/requests/${newRequestId}`);
        }}
      />
    </div>
  );
}

export default IncidentsListPage;
