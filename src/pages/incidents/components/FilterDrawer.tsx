import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  Star,
  TriangleAlert,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn, getLocalizedName } from "@/lib/utils";
import {
  classificationApi,
  departmentApi,
  incidentApi,
  locationApi,
  lookupApi,
  userApi,
  workflowApi,
} from "../../../api/admin";
import { usePermissions } from "../../../hooks/usePermissions";
import { PERMISSIONS } from "../../../constants/permissions";
import { useAuthStore } from "../../../stores/authStore";
import type { FeedFilters, SlaFilter } from "../../../types";
import { priorityTone, stateTone } from "@/utils/incidentTone";
import {
  filterTreeByName,
  findNodeById,
  type TreeSelectNode,
} from "@/utils/treeUtils";

/* ------------------------------------------------------------------ */
/* helpers (shared tree + tone utils from the project)               */
/* ------------------------------------------------------------------ */

function nodeLabel(nodes: TreeSelectNode[], id: string): string {
  const n = findNodeById(nodes, id);
  return n ? getLocalizedName(n) || id : id;
}

function Chip({
  className,
  dotClass,
  icon,
  label,
  onRemove,
}: {
  className: string;
  dotClass?: string;
  icon?: React.ReactNode;
  label: string;
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded max-w-full",
        className,
      )}
    >
      {dotClass ? (
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotClass)} />
      ) : null}
      {icon}
      <span className="truncate max-w-[140px]">{label}</span>
      <button
        type="button"
        aria-label={`Remove ${label}`}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="hover:text-[hsl(var(--foreground))] cursor-pointer shrink-0"
      >
        <X className="h-2 w-2" />
      </button>
    </span>
  );
}

function SelectBox({
  label,
  selectedText,
  isOpen,
  onToggle,
  trigger,
  dropdown,
  badge,
}: {
  label: string;
  selectedText?: string;
  isOpen: boolean;
  onToggle: () => void;
  trigger: React.ReactNode;
  dropdown: React.ReactNode;
  badge?: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
          {label}
        </label>
        {selectedText ? (
          <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono">
            {selectedText}
          </span>
        ) : null}
      </div>
      <div className="relative space-y-1.5">
        <div
          onClick={onToggle}
          className="w-full bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] hover:border-cyan-500/50 rounded-lg p-1.5 text-xs flex items-center justify-between text-[hsl(var(--foreground))] cursor-pointer shadow-inner min-h-[34px] transition-all gap-1"
        >
          <div className="flex items-center gap-1 flex-wrap min-w-0 flex-1">
            {trigger}
          </div>
          <div className="flex items-center gap-1 shrink-0 ps-1">
            {badge != null && badge > 0 ? (
              <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 text-[9px] font-mono flex items-center justify-center font-bold">
                {badge}
              </span>
            ) : null}
            <ChevronDown className="text-[hsl(var(--muted-foreground))] text-[10px] ms-0.5 h-3 w-3" />
          </div>
        </div>
        {isOpen ? (
          <div className="bg-[hsl(var(--card))] border border-cyan-500/30 rounded-lg shadow-2xl p-2 space-y-2 z-20">
            {dropdown}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DropSearch({
  placeholder,
  onSearch,
}: {
  placeholder: string;
  onSearch: (query: string) => void;
}) {
  return (
    <div className="relative">
      <input
        onChange={(e) => onSearch(e.target.value)}
        className="w-full bg-[hsl(var(--muted)/0.9)] border border-[hsl(var(--border))] rounded-md py-1 ps-6 pe-2 text-[11px] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
        placeholder={placeholder}
        type="text"
      />
      <Search className="absolute start-2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-[hsl(var(--muted-foreground))]" />
    </div>
  );
}

function TreeView({
  nodes,
  selected,
  onToggle,
  search,
}: {
  nodes: TreeSelectNode[];
  selected: string[];
  onToggle: (id: string) => void;
  search: string;
}) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const visible = useMemo(
    () => filterTreeByName(nodes, search),
    [nodes, search],
  );
  const searching = search.trim().length > 0;

  const flip = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderNodes = (
    list: TreeSelectNode[],
    depth: number,
  ): React.ReactNode =>
    list.map((n) => {
      const kids = n.children || [];
      const isCollapsed = !searching && collapsed.has(n.id);
      const checked = selected.includes(n.id);
      return (
        <div key={n.id} className="space-y-0.5">
          <div className="flex items-center justify-between p-1 rounded hover:bg-[hsl(var(--muted)/0.6)] transition-colors group">
            <div className="flex items-center gap-1.5 min-w-0">
              {kids.length > 0 ? (
                <button
                  type="button"
                  onClick={() => flip(n.id)}
                  aria-label={
                    isCollapsed ? t("common.expand") : t("common.collapse")
                  }
                  className="w-4 h-4 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-cyan-700 dark:text-cyan-300 shrink-0"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-2.5 w-2.5 rtl:rotate-180" />
                  ) : (
                    <ChevronDown className="h-2.5 w-2.5" />
                  )}
                </button>
              ) : (
                <span className="w-4 shrink-0" />
              )}
              <input
                checked={checked}
                onChange={() => onToggle(n.id)}
                className="w-3.5 h-3.5 rounded bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-cyan-600 dark:text-cyan-500 cursor-pointer accent-cyan-500 shrink-0"
                type="checkbox"
              />
              <span
                className={cn(
                  "truncate",
                  depth === 0
                    ? "font-semibold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--foreground))]"
                    : checked
                      ? "text-cyan-700 dark:text-cyan-300 font-medium group-hover:text-[hsl(var(--foreground))]"
                      : "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]",
                )}
              >
                {getLocalizedName(n)}
              </span>
            </div>
            {kids.length > 0 ? (
              <span className="text-[9px] text-[hsl(var(--muted-foreground))] font-mono shrink-0">
                {kids.length}
              </span>
            ) : null}
          </div>
          {kids.length > 0 && !isCollapsed ? (
            <div className="ps-5 space-y-0.5 border-s border-[hsl(var(--border))] ms-2">
              {renderNodes(kids, depth + 1)}
            </div>
          ) : null}
        </div>
      );
    });

  if (!visible.length) {
    return (
      <p className="text-[11px] text-[hsl(var(--muted-foreground))] p-1">
        {t("common.noResults")}
      </p>
    );
  }
  return (
    <div className="space-y-1 max-h-40 overflow-y-auto pe-0.5 select-none text-[11px]">
      {renderNodes(visible, 0)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* drawer                                                              */
/* ------------------------------------------------------------------ */

interface FilterDrawerProps {
  draft: FeedFilters;
  onChange: (nextFilter: FeedFilters) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}

export function FilterDrawer({
  draft,
  onChange,
  onApply,
  onReset,
  onClose,
}: FilterDrawerProps) {
  const { t } = useTranslation();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const user = useAuthStore((s) => s.user);
  const canViewAll =
    isSuperAdmin ||
    hasPermission(PERMISSIONS.INCIDENTS_VIEW_ALL) ||
    hasPermission(PERMISSIONS.INCIDENTS_VIEW_DEPARTMENT_ONLY);
  const canFilterPhone =
    isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_FILTER_REPORTER_PHONE);

  const [openBox, setOpenBox] = useState<string | null>("state");
  const toggleBox = (k: string) => setOpenBox((p) => (p === k ? null : k));

  const patch = (p: Partial<FeedFilters>) => onChange({ ...draft, ...p });
  const toggleId = (
    key:
      | "stateIds"
      | "assigneeIds"
      | "departmentIds"
      | "classificationIds"
      | "locationIds",
    id: string,
  ) =>
    patch({
      [key]: draft[key].includes(id)
        ? draft[key].filter((x) => x !== id)
        : [...draft[key], id],
    } as Partial<FeedFilters>);

  /* states (counts from stats, fallback to workflow states) */
  const { data: statsData } = useQuery({
    queryKey: [
      "incidents",
      "v2-list",
      "filter-stats",
      canViewAll ? "all" : user?.id,
    ],
    queryFn: () =>
      incidentApi.getIncidentStatsV2({
        ...(canViewAll ? {} : { my_record: user?.id }),
      }),
    staleTime: 60_000,
  });
  const { data: workflowsData } = useQuery({
    queryKey: ["workflows", "incident"],
    queryFn: async () => {
      const [a, b] = await Promise.all([
        workflowApi.listByRecordType("incident", false),
        workflowApi.listByRecordType("both", false),
      ]);
      const combined = [...(a.data || []), ...(b.data || [])];
      return combined.filter(
        (w, i, self) => i === self.findIndex((x) => x.id === w.id),
      );
    },
    staleTime: 300_000,
  });

  const stateOptions = useMemo(() => {
    const fromStats =
      statsData?.data?.workflow_stats?.flatMap(
        (w) => w.by_state_details || [],
      ) || [];
    if (fromStats.length) {
      const seen = new Map<
        string,
        { id: string; name: string; name_ar?: string; count: number }
      >();
      for (const s of fromStats) {
        if (!seen.has(s.id))
          seen.set(s.id, {
            id: s.id,
            name: s.name,
            name_ar: s.name_ar,
            count: s.count,
          });
      }
      return [...seen.values()].map((s) => ({
        id: s.id,
        label: getLocalizedName(s) || s.name,
        count: s.count,
        dot: stateTone(s.name).dot,
        pill: stateTone(s.name).pill,
      }));
    }
    const all = (workflowsData || []).flatMap((w) => w.states || []);
    const uniq: { id: string; name: string; name_ar?: string }[] = [];
    for (const s of all) {
      if (!uniq.find((x) => x.name === s.name))
        uniq.push({
          id: s.id,
          name: s.name,
          name_ar: (s as { name_ar?: string }).name_ar,
        });
    }
    return uniq.map((s) => ({
      id: s.id,
      label: getLocalizedName(s) || s.name,
      count: undefined as number | undefined,
      dot: stateTone(s.name).dot,
      pill: stateTone(s.name).pill,
    }));
  }, [statsData, workflowsData]);
  const stateMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of stateOptions) m.set(o.id, o.label);
    return m;
  }, [stateOptions]);
  const [stateSearch, setStateSearch] = useState("");
  const visibleStates = useMemo(() => {
    const q = stateSearch.trim().toLowerCase();
    if (!q) return stateOptions;
    return stateOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [stateOptions, stateSearch]);

  /* transitions for selected states */
  const { data: transitionOptions = [] } = useQuery({
    queryKey: [
      "incidents",
      "v2-list",
      "filter-transitions",
      [...draft.stateIds].sort(),
    ],
    queryFn: async () => {
      const all: { id: string; label: string }[] = [];
      for (const sid of draft.stateIds) {
        try {
          const r = await incidentApi.getTransitionsByState(sid);
          for (const tr of r.data || []) {
            if (!all.find((x) => x.id === tr.id))
              all.push({ id: tr.id, label: getLocalizedName(tr) || tr.name });
          }
        } catch {
          /* ignore per-state failures */
        }
      }
      return all;
    },
    enabled: draft.stateIds.length > 0,
    staleTime: 60_000,
  });
  const [transSearch, setTransSearch] = useState("");

  /* assignees */
  const { data: usersData } = useQuery({
    queryKey: ["admin", "users", 1, 100],
    queryFn: () => userApi.list(1, 100),
    staleTime: 300_000,
  });
  const [userSearch, setUserSearch] = useState("");
  const userOptions = useMemo(() => {
    const users = usersData?.data || [];
    const q = userSearch.trim().toLowerCase();
    return users
      .filter((u) => {
        if (!q) return true;
        const label =
          `${u.first_name || ""} ${u.last_name || ""} ${u.username} ${u.email || ""}`.toLowerCase();
        return label.includes(q);
      })
      .slice(0, 50)
      .map((u) => ({
        id: u.id,
        label:
          [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username,
      }));
  }, [usersData, userSearch]);
  const userMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of usersData?.data || [])
      m.set(
        u.id,
        [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username,
      );
    return m;
  }, [usersData]);

  /* trees */
  const { data: deptData } = useQuery({
    queryKey: ["admin", "departments", "tree"],
    queryFn: () => departmentApi.getTree(),
    staleTime: 300_000,
  });
  const { data: classData } = useQuery({
    queryKey: ["admin", "classifications", "tree", "incident-all"],
    queryFn: async () => {
      const [a, b] = await Promise.all([
        classificationApi.getTree("incident"),
        classificationApi.getTree("all"),
      ]);
      const combined = [...(a.data || []), ...(b.data || [])];
      return combined.filter(
        (c, i, self) => i === self.findIndex((x) => x.id === c.id),
      );
    },
    staleTime: 300_000,
  });
  const { data: locData } = useQuery({
    queryKey: ["admin", "locations", "tree"],
    queryFn: () => locationApi.getTree(),
    staleTime: 300_000,
  });
  const deptNodes = useMemo(
    () => (deptData?.data || []) as unknown as TreeSelectNode[],
    [deptData],
  );
  const classNodes = useMemo(
    () => (classData || []) as unknown as TreeSelectNode[],
    [classData],
  );
  const locNodes = useMemo(
    () => (locData?.data || []) as unknown as TreeSelectNode[],
    [locData],
  );
  const [treeSearch, setTreeSearch] = useState("");
  const [treeBox, setTreeBox] = useState<string | null>(null);

  /* priorities */
  const { data: lookupData } = useQuery({
    queryKey: ["lookups", "categories"],
    queryFn: () => lookupApi.listCategories(),
    staleTime: 300_000,
  });
  const priorityOptions = useMemo(() => {
    const cat = (lookupData?.data || []).find((c) => c.code === "PRIORITY");
    return [...(cat?.values || [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((v) => ({
        id: String(v.sort_order),
        sortOrder: v.sort_order,
        label: getLocalizedName(v),
        color: v.color,
      }));
  }, [lookupData]);

  /* Source options from SOURCE lookup category */
  const sourceOptions = useMemo(() => {
    const cat = (lookupData?.data || []).find((c) => c.code === "SOURCE");
    return [...(cat?.values || [])].map((v) => ({
      value: v.code.toLowerCase(),
      label: getLocalizedName(v),
    }));
  }, [lookupData]);

  const isEPM940 =
    window.APP_CONFIG?.CLIENT === "EPM940" ||
    import.meta.env.VITE_CLIENT === "EPM940";

  const activePriority = priorityOptions.find(
    (p) => p.sortOrder === draft.priority,
  );

  const placeholder = (
    <span className="text-[hsl(var(--muted-foreground))] text-xs truncate">
      {t("common.select")}…
    </span>
  );

  return (
    <aside className="absolute inset-y-0 start-0 w-64 bg-[hsl(var(--card))] border-e border-[hsl(var(--border))] z-50 flex flex-col shadow-2xl">
      {/* header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.9)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 dark:bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-700 dark:text-cyan-400">
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 fill-none stroke-current"
              strokeWidth="2"
            >
              <line x1="4" y1="5" x2="20" y2="5" strokeLinecap="round" />
              <line x1="7" y1="12" x2="17" y2="12" strokeLinecap="round" />
              <line x1="10" y1="19" x2="14" y2="19" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="font-bold text-xs tracking-wide text-[hsl(var(--foreground))]">
            {t("common.filters")}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onReset}
            title={t("common.clearFilters")}
            className="text-[11px] text-[hsl(var(--muted-foreground))] hover:text-cyan-700 dark:text-cyan-300 px-2 py-1 rounded transition-colors"
          >
            {t("common.reset")}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.8)] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* fields */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* State */}
        <SelectBox
          label={t("common.state")}
          isOpen={openBox === "state"}
          onToggle={() => toggleBox("state")}
          badge={draft.stateIds.length}
          trigger={
            draft.stateIds.length ? (
              <>
                {draft.stateIds.map((id) => {
                  const opt = stateOptions.find((o) => o.id === id);
                  return (
                    <Chip
                      key={id}
                      className={
                        opt?.pill ||
                        "bg-cyan-500/10 dark:bg-cyan-950/60 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300"
                      }
                      dotClass={opt?.dot || "bg-cyan-400"}
                      label={opt?.label || stateMap.get(id) || id}
                      onRemove={() => toggleId("stateIds", id)}
                    />
                  );
                })}
              </>
            ) : (
              <span className="text-[hsl(var(--muted-foreground))] text-xs truncate">
                {t("incidents.selectStates")}
              </span>
            )
          }
          dropdown={
            <>
              <DropSearch
                placeholder={t("incidents.searchStates")}
                onSearch={setStateSearch}
              />
              <div className="space-y-1 max-h-36 overflow-y-auto pe-0.5">
                {visibleStates.map((o) => (
                  <label
                    key={o.id}
                    className="flex items-center justify-between p-1 rounded hover:bg-[hsl(var(--muted)/0.6)] cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        checked={draft.stateIds.includes(o.id)}
                        onChange={() => toggleId("stateIds", o.id)}
                        className="w-3.5 h-3.5 rounded bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-cyan-600 dark:text-cyan-500 cursor-pointer accent-cyan-500 shrink-0"
                        type="checkbox"
                      />
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          o.dot,
                        )}
                      />
                      <span className="text-[11px] text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--foreground))] truncate">
                        {o.label}
                      </span>
                    </div>
                    {o.count != null ? (
                      <span className="text-[9px] text-[hsl(var(--muted-foreground))] font-mono shrink-0">
                        {o.count}
                      </span>
                    ) : null}
                  </label>
                ))}
                {visibleStates.length === 0 ? (
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] p-1">
                    {t("common.noResults")}
                  </p>
                ) : null}
              </div>
            </>
          }
        />

        {/* Transition */}
        <SelectBox
          label={t("incidents.transition")}
          isOpen={openBox === "trans"}
          onToggle={() => toggleBox("trans")}
          trigger={
            draft.transitionId ? (
              <Chip
                className="bg-cyan-500/10 dark:bg-cyan-950/60 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300"
                label={
                  transitionOptions.find((o) => o.id === draft.transitionId)
                    ?.label || draft.transitionId
                }
                onRemove={() => patch({ transitionId: undefined })}
              />
            ) : (
              <span className="text-[hsl(var(--muted-foreground))] text-xs truncate">
                {t("incidents.selectTransitions")}
              </span>
            )
          }
          dropdown={
            draft.stateIds.length === 0 ? (
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] p-1">
                {t("incidents.selectStateFirst")}
              </p>
            ) : (
              <>
                <DropSearch
                  placeholder={t("incidents.searchTransitions")}
                  onSearch={setTransSearch}
                />
                <div className="space-y-1 max-h-32 overflow-y-auto pe-0.5">
                  {transitionOptions
                    .filter((o) =>
                      o.label
                        .toLowerCase()
                        .includes(transSearch.trim().toLowerCase()),
                    )
                    .map((o) => (
                      <label
                        key={o.id}
                        className="flex items-center gap-2 p-1 rounded hover:bg-[hsl(var(--muted)/0.6)] cursor-pointer group"
                      >
                        <input
                          checked={draft.transitionId === o.id}
                          onChange={() =>
                            patch({
                              transitionId:
                                draft.transitionId === o.id ? undefined : o.id,
                            })
                          }
                          className="w-3.5 h-3.5 rounded bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-cyan-600 dark:text-cyan-500 cursor-pointer accent-cyan-500 shrink-0"
                          type="checkbox"
                        />
                        <span className="text-[11px] text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] truncate">
                          {o.label}
                        </span>
                      </label>
                    ))}
                </div>
              </>
            )
          }
        />

        {/* Assignee */}
        <SelectBox
          label={t("common.assignee")}
          isOpen={openBox === "assignee"}
          onToggle={() => toggleBox("assignee")}
          badge={draft.assigneeIds.length}
          trigger={
            draft.assigneeIds.length ? (
              <>
                {draft.assigneeIds.map((id) => (
                  <Chip
                    key={id}
                    className="bg-cyan-500/10 dark:bg-cyan-950/60 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300"
                    label={userMap.get(id) || id}
                    onRemove={() => toggleId("assigneeIds", id)}
                  />
                ))}
              </>
            ) : (
              <span className="text-[hsl(var(--muted-foreground))] text-xs truncate">
                {t("incidents.selectAssignees")}
              </span>
            )
          }
          dropdown={
            <>
              <DropSearch
                placeholder={t("incidents.searchAssignees")}
                onSearch={setUserSearch}
              />
              <div className="space-y-1 max-h-32 overflow-y-auto pe-0.5">
                {userOptions.map((o) => (
                  <label
                    key={o.id}
                    className="flex items-center gap-2 p-1 rounded hover:bg-[hsl(var(--muted)/0.6)] cursor-pointer group"
                  >
                    <input
                      checked={draft.assigneeIds.includes(o.id)}
                      onChange={() => toggleId("assigneeIds", o.id)}
                      className="w-3.5 h-3.5 rounded bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-cyan-600 dark:text-cyan-500 cursor-pointer accent-cyan-500 shrink-0"
                      type="checkbox"
                    />
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] truncate">
                      {o.label}
                    </span>
                  </label>
                ))}
                {userOptions.length === 0 ? (
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] p-1">
                    {t("common.noResults")}
                  </p>
                ) : null}
              </div>
            </>
          }
        />

        {/* Department */}
        <SelectBox
          label={t("incidents.department")}
          selectedText={
            draft.departmentIds.length
              ? t("incidents.selectedCount", {
                  count: draft.departmentIds.length,
                })
              : undefined
          }
          isOpen={treeBox === "dept"}
          onToggle={() => {
            setTreeBox((p) => (p === "dept" ? null : "dept"));
            setTreeSearch("");
          }}
          trigger={
            draft.departmentIds.length ? (
              <>
                {draft.departmentIds.map((id) => (
                  <Chip
                    key={id}
                    className="bg-cyan-500/10 dark:bg-cyan-950/60 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300"
                    label={nodeLabel(deptNodes, id)}
                    onRemove={() => toggleId("departmentIds", id)}
                  />
                ))}
              </>
            ) : (
              placeholder
            )
          }
          dropdown={
            <>
              <DropSearch
                placeholder={t("incidents.searchDepartments")}
                onSearch={(q) => {
                  setTreeBox("dept");
                  setTreeSearch(q);
                }}
              />
              <TreeView
                nodes={deptNodes}
                selected={draft.departmentIds}
                onToggle={(id) => toggleId("departmentIds", id)}
                search={treeBox === "dept" ? treeSearch : ""}
              />
            </>
          }
        />

        {/* Classification */}
        <SelectBox
          label={t("incidents.classification")}
          selectedText={
            draft.classificationIds.length
              ? t("incidents.selectedCount", {
                  count: draft.classificationIds.length,
                })
              : undefined
          }
          isOpen={treeBox === "class"}
          onToggle={() => {
            setTreeBox((p) => (p === "class" ? null : "class"));
            setTreeSearch("");
          }}
          trigger={
            draft.classificationIds.length ? (
              <>
                {draft.classificationIds.map((id) => (
                  <Chip
                    key={id}
                    className="bg-cyan-500/10 dark:bg-cyan-950/60 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300"
                    label={nodeLabel(classNodes, id)}
                    onRemove={() => toggleId("classificationIds", id)}
                  />
                ))}
              </>
            ) : (
              placeholder
            )
          }
          dropdown={
            <>
              <DropSearch
                placeholder={t("incidents.searchClassifications")}
                onSearch={(q) => {
                  setTreeBox("class");
                  setTreeSearch(q);
                }}
              />
              <TreeView
                nodes={classNodes}
                selected={draft.classificationIds}
                onToggle={(id) => toggleId("classificationIds", id)}
                search={treeBox === "class" ? treeSearch : ""}
              />
            </>
          }
        />

        {/* Location */}
        <SelectBox
          label={t("incidents.location")}
          selectedText={
            draft.locationIds.length
              ? t("incidents.selectedCount", {
                  count: draft.locationIds.length,
                })
              : undefined
          }
          isOpen={treeBox === "loc"}
          onToggle={() => {
            setTreeBox((p) => (p === "loc" ? null : "loc"));
            setTreeSearch("");
          }}
          trigger={
            draft.locationIds.length ? (
              <>
                {draft.locationIds.map((id) => (
                  <Chip
                    key={id}
                    className="bg-cyan-500/10 dark:bg-cyan-950/60 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300"
                    label={nodeLabel(locNodes, id)}
                    onRemove={() => toggleId("locationIds", id)}
                  />
                ))}
              </>
            ) : (
              placeholder
            )
          }
          dropdown={
            <>
              <DropSearch
                placeholder={t("incidents.searchLocations")}
                onSearch={(q) => {
                  setTreeBox("loc");
                  setTreeSearch(q);
                }}
              />
              <TreeView
                nodes={locNodes}
                selected={draft.locationIds}
                onToggle={(id) => toggleId("locationIds", id)}
                search={treeBox === "loc" ? treeSearch : ""}
              />
            </>
          }
        />

        {/* Priority */}
        <SelectBox
          label={t("incidents.priority")}
          isOpen={openBox === "prio"}
          onToggle={() => toggleBox("prio")}
          trigger={
            activePriority ? (
              <Chip
                className="bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400"
                icon={<Star className="h-2 w-2 fill-current shrink-0" />}
                label={activePriority.label}
                onRemove={() => patch({ priority: undefined })}
              />
            ) : (
              placeholder
            )
          }
          dropdown={
            <div className="space-y-1 max-h-32 overflow-y-auto pe-0.5">
              {priorityOptions.map((o) => {
                const tone = priorityTone(o.label);
                return (
                  <label
                    key={o.sortOrder}
                    className="flex items-center justify-between p-1 rounded hover:bg-[hsl(var(--muted)/0.6)] cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        checked={draft.priority === o.sortOrder}
                        onChange={() =>
                          patch({
                            priority:
                              draft.priority === o.sortOrder
                                ? undefined
                                : o.sortOrder,
                          })
                        }
                        className="w-3.5 h-3.5 rounded bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-cyan-600 dark:text-cyan-500 cursor-pointer accent-cyan-500 shrink-0"
                        type="checkbox"
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={
                          o.color ? { backgroundColor: o.color } : undefined
                        }
                      >
                        {!o.color ? (
                          <span
                            className={cn(
                              "block w-1.5 h-1.5 rounded-full",
                              tone?.dot || "bg-slate-400",
                            )}
                          />
                        ) : null}
                      </span>
                      <span className="text-[11px] text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] truncate">
                        {o.label}
                      </span>
                    </div>
                  </label>
                );
              })}
              {priorityOptions.length === 0 ? (
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] p-1">
                  {t("incidents.noPriorities")}
                </p>
              ) : null}
            </div>
          }
        />

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">
              {t("incidents.fromDate")}
            </label>
            <input
              value={draft.startDate || ""}
              onChange={(e) =>
                patch({ startDate: e.target.value || undefined })
              }
              className="w-full bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] hover:border-[hsl(var(--border))] rounded-lg px-2 py-1.5 text-xs text-[hsl(var(--foreground))] focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              style={{ colorScheme: "dark" }}
              type="date"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">
              {t("incidents.toDate")}
            </label>
            <input
              value={draft.endDate || ""}
              min={draft.startDate || undefined}
              onChange={(e) => patch({ endDate: e.target.value || undefined })}
              className="w-full bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] hover:border-[hsl(var(--border))] rounded-lg px-2 py-1.5 text-xs text-[hsl(var(--foreground))] focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              style={{ colorScheme: "dark" }}
              type="date"
            />
          </div>
        </div>

        {/* SLA Status */}
        <SelectBox
          label="SLA Status"
          isOpen={openBox === "sla"}
          onToggle={() => toggleBox("sla")}
          trigger={
            draft.sla ? (
              <Chip
                className={
                  draft.sla === "breached"
                    ? "bg-rose-500/10 dark:bg-rose-950/50 border border-rose-500/40 text-rose-700 dark:text-rose-300"
                    : "bg-cyan-500/10 dark:bg-cyan-950/60 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300"
                }
                icon={
                  draft.sla === "breached" ? (
                    <TriangleAlert className="h-2 w-2 shrink-0" />
                  ) : undefined
                }
                label={
                  draft.sla === "within"
                    ? t("incidents.withinSLA")
                    : t("incidents.slaBreached")
                }
                onRemove={() => patch({ sla: undefined })}
              />
            ) : (
              placeholder
            )
          }
          dropdown={
            <div className="space-y-1 max-h-32 overflow-y-auto pe-0.5">
              {(
                [
                  { id: "within", label: t("incidents.withinSLA") },
                  { id: "breached", label: t("incidents.slaBreached") },
                ] as { id: SlaFilter; label: string }[]
              ).map((o) => (
                <label
                  key={o.id}
                  className="flex items-center gap-2 p-1 rounded hover:bg-[hsl(var(--muted)/0.6)] cursor-pointer group"
                >
                  <input
                    checked={draft.sla === o.id}
                    onChange={() =>
                      patch({ sla: draft.sla === o.id ? undefined : o.id })
                    }
                    className="w-3.5 h-3.5 rounded bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-cyan-600 dark:text-cyan-500 cursor-pointer accent-cyan-500 shrink-0"
                    type="checkbox"
                  />
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] truncate">
                    {o.label}
                  </span>
                </label>
              ))}
            </div>
          }
        />

        {/* Reporter Phone */}
        {canFilterPhone ? (
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
              {t("incidents.reporterPhone")}
            </label>
            <input
              value={draft.reporterPhone || ""}
              onChange={(e) =>
                patch({ reporterPhone: e.target.value || undefined })
              }
              className="w-full bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] hover:border-[hsl(var(--border))] rounded-lg px-2.5 py-1.5 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              placeholder={t("incidents.reporterPhonePlaceholder")}
              type="tel"
            />
          </div>
        ) : null}

        {/* Workflow */}
        <SelectBox
          label={t("common.workflow")}
          isOpen={openBox === "workflow"}
          onToggle={() => toggleBox("workflow")}
          trigger={
            draft.workflowId ? (
              <Chip
                className="bg-cyan-500/10 dark:bg-cyan-950/60 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300"
                label={
                  workflowsData?.find((w) => w.id === draft.workflowId)?.name ||
                  draft.workflowId
                }
                onRemove={() => patch({ workflowId: undefined })}
              />
            ) : (
              placeholder
            )
          }
          dropdown={
            <div className="space-y-1 max-h-32 overflow-y-auto pe-0.5">
              {workflowsData?.map((w) => (
                <label
                  key={w.id}
                  className="flex items-center gap-2 p-1 rounded hover:bg-[hsl(var(--muted)/0.6)] cursor-pointer group"
                >
                  <input
                    checked={draft.workflowId === w.id}
                    onChange={() =>
                      patch({
                        workflowId:
                          draft.workflowId === w.id ? undefined : w.id,
                      })
                    }
                    className="w-3.5 h-3.5 rounded bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-cyan-600 dark:text-cyan-500 cursor-pointer accent-cyan-500 shrink-0"
                    type="checkbox"
                  />
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] truncate">
                    {getLocalizedName(w)}
                  </span>
                </label>
              ))}
              {workflowsData?.length === 0 ? (
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] p-1">
                  {t("common.noResults")}
                </p>
              ) : null}
            </div>
          }
        />

        {/* Source */}
        <SelectBox
          label={t("common.source")}
          isOpen={openBox === "source"}
          onToggle={() => toggleBox("source")}
          trigger={
            draft.source ? (
              <Chip
                className="bg-cyan-500/10 dark:bg-cyan-950/60 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300"
                label={
                  sourceOptions.find((s) => s.value === draft.source)?.label ||
                  draft.source
                }
                onRemove={() => patch({ source: undefined })}
              />
            ) : (
              placeholder
            )
          }
          dropdown={
            <div className="space-y-1 max-h-32 overflow-y-auto pe-0.5">
              {sourceOptions.map((s) => (
                <label
                  key={s.value}
                  className="flex items-center gap-2 p-1 rounded hover:bg-[hsl(var(--muted)/0.6)] cursor-pointer group"
                >
                  <input
                    checked={draft.source === s.value}
                    onChange={() =>
                      patch({
                        source: draft.source === s.value ? undefined : s.value,
                      })
                    }
                    className="w-3.5 h-3.5 rounded bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-cyan-600 dark:text-cyan-500 cursor-pointer accent-cyan-500 shrink-0"
                    type="checkbox"
                  />
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] truncate">
                    {s.label}
                  </span>
                </label>
              ))}
              {sourceOptions.length === 0 ? (
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] p-1">
                  {t("common.noResults")}
                </p>
              ) : null}
            </div>
          }
        />

        {/* MOMRA Reference Number */}
        {isEPM940 ? (
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
              {t("incidents.momraRefNumLabel", "MOMRA Reference Number")}
            </label>
            <input
              value={draft.momraRef || ""}
              onChange={(e) => patch({ momraRef: e.target.value || undefined })}
              className="w-full bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] hover:border-[hsl(var(--border))] rounded-lg px-2.5 py-1.5 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              placeholder={t(
                "incidents.momraRefNumPlaceholder",
                "Enter MOMRA reference number",
              )}
            />
          </div>
        ) : null}

        {/* Converted to Request */}
        <SelectBox
          label={t("incidents.convertedTo", "Converted to Request")}
          isOpen={openBox === "converted"}
          onToggle={() => toggleBox("converted")}
          trigger={
            draft.convertedToRequest !== undefined ? (
              <Chip
                className="bg-cyan-500/10 dark:bg-cyan-950/60 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300"
                label={
                  draft.convertedToRequest ? t("common.yes") : t("common.no")
                }
                onRemove={() => patch({ convertedToRequest: undefined })}
              />
            ) : (
              placeholder
            )
          }
          dropdown={
            <div className="space-y-1 max-h-32 overflow-y-auto pe-0.5">
              <label
                key="converted-yes"
                className="flex items-center gap-2 p-1 rounded hover:bg-[hsl(var(--muted)/0.6)] cursor-pointer group"
              >
                <input
                  checked={draft.convertedToRequest === true}
                  onChange={() =>
                    patch({
                      convertedToRequest:
                        draft.convertedToRequest === true ? undefined : true,
                    })
                  }
                  className="w-3.5 h-3.5 rounded bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-cyan-600 dark:text-cyan-500 cursor-pointer accent-cyan-500 shrink-0"
                  type="checkbox"
                />
                <span className="text-[11px] text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] truncate">
                  {t("common.yes")}
                </span>
              </label>
              <label
                key="converted-no"
                className="flex items-center gap-2 p-1 rounded hover:bg-[hsl(var(--muted)/0.6)] cursor-pointer group"
              >
                <input
                  checked={draft.convertedToRequest === false}
                  onChange={() =>
                    patch({
                      convertedToRequest:
                        draft.convertedToRequest === false ? undefined : false,
                    })
                  }
                  className="w-3.5 h-3.5 rounded bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-cyan-600 dark:text-cyan-500 cursor-pointer accent-cyan-500 shrink-0"
                  type="checkbox"
                />
                <span className="text-[11px] text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] truncate">
                  {t("common.no")}
                </span>
              </label>
            </div>
          }
        />
      </div>

      {/* footer */}
      <div className="p-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.9)] flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onReset}
          className="flex-1 py-1.5 px-3 bg-[hsl(var(--muted)/0.8)] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-lg text-xs font-semibold transition-all shadow-sm"
        >
          {t("common.reset")}
        </button>
        <button
          type="button"
          onClick={onApply}
          className="flex-1 py-1.5 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-cyan-950/40 flex items-center justify-center gap-1.5"
        >
          <Check className="h-3 w-3" />
          {t("incidents.applyFilters")}
        </button>
      </div>
    </aside>
  );
}

export default FilterDrawer;
