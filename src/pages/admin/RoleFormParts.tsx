import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Plus,
  UserMinus,
  Users as UsersIcon,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Permission, User } from "../../types";
import { userApi } from "../../api/admin";

export type PermissionFilterMode = "all" | "selected" | "unselected";

interface PermissionsEditorProps {
  permissions: Permission[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onToggleMany: (ids: string[], selectAll: boolean) => void;
  onClearAll: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  filter: PermissionFilterMode;
  onFilterChange: (f: PermissionFilterMode) => void;
}

const groupByModule = (perms: Permission[]): Record<string, Permission[]> =>
  perms.reduce(
    (acc, p) => {
      (acc[p.module] = acc[p.module] || []).push(p);
      return acc;
    },
    {} as Record<string, Permission[]>,
  );

export const PermissionsEditor: React.FC<PermissionsEditorProps> = ({
  permissions,
  selectedIds,
  onToggle,
  onToggleMany,
  onClearAll,
  search,
  onSearchChange,
  filter,
  onFilterChange,
}) => {
  const { t } = useTranslation();
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const grouped = useMemo(() => groupByModule(permissions), [permissions]);
  const sortedModules = useMemo(
    () => Object.keys(grouped).sort((a, b) => a.localeCompare(b)),
    [grouped],
  );

  // Collapsed module state (default: all expanded)
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(
    new Set(),
  );
  const [highlightedModule, setHighlightedModule] = useState<string | null>(
    null,
  );
  const moduleRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const highlightTimerRef = useRef<number | null>(null);

  // Selected permissions as chips — preserve order from permissions list
  const selectedChips = useMemo(
    () => permissions.filter((p) => selectedSet.has(p.id)),
    [permissions, selectedSet],
  );

  const matchesSearch = (p: Permission) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
  };

  const matchesFilter = (p: Permission) => {
    if (filter === "all") return true;
    const isSelected = selectedSet.has(p.id);
    return filter === "selected" ? isSelected : !isSelected;
  };

  // Per-module filtered perms (search + filter)
  const filteredByModule = useMemo(() => {
    const map: Record<string, Permission[]> = {};
    for (const mod of sortedModules) {
      const filtered = grouped[mod].filter(
        (p) => matchesSearch(p) && matchesFilter(p),
      );
      if (filtered.length > 0) map[mod] = filtered;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped, sortedModules, search, filter, selectedIds]);

  const visibleModules = Object.keys(filteredByModule);

  const scrollToModule = (module: string) => {
    // Ensure the module is expanded
    setCollapsedModules((prev) => {
      if (!prev.has(module)) return prev;
      const next = new Set(prev);
      next.delete(module);
      return next;
    });
    // Next tick so DOM is updated
    window.setTimeout(() => {
      const el = moduleRefs.current[module];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedModule(module);
        if (highlightTimerRef.current) {
          window.clearTimeout(highlightTimerRef.current);
        }
        highlightTimerRef.current = window.setTimeout(() => {
          setHighlightedModule(null);
        }, 1200);
      }
    }, 50);
  };

  const toggleModuleCollapse = (module: string) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  const expandAll = () => setCollapsedModules(new Set());
  const collapseAll = () => setCollapsedModules(new Set(sortedModules));

  const handleSelectAllModule = (mod: string) => {
    const ids = grouped[mod].map((p) => p.id);
    const allSelected = ids.every((id) => selectedSet.has(id));
    onToggleMany(ids, !allSelected);
  };

  return (
    <div className="space-y-4">
      {/* Sticky summary bar */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700/60">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {t("roles.selectedPermissions", { count: selectedChips.length })}
          </span>
          {selectedChips.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
            >
              {t("common.clear")}
            </button>
          )}
        </div>
        {selectedChips.length === 0 ? (
          <p className="text-xs text-[hsl(var(--muted-foreground))] italic">
            {t("roles.noPermissionsSelectedYet")}
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {selectedChips.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => scrollToModule(p.module)}
                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-xs font-mono whitespace-nowrap hover:bg-[hsl(var(--primary)/0.15)] transition-colors flex-shrink-0"
                title={p.name}
              >
                <span>{p.code}</span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={t("common.remove")}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(p.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggle(p.id);
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-full hover:bg-[hsl(var(--primary)/0.2)] p-0.5"
                >
                  <X className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search + filter + expand/collapse */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder={t("roles.searchPermissions")}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full ps-10 pe-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] outline-none transition-all"
          />
        </div>
        {/* Filter toggle */}
        <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-0.5 text-xs font-medium">
          {(["all", "selected", "unselected"] as PermissionFilterMode[]).map(
            (f) => (
              <button
                key={f}
                type="button"
                onClick={() => onFilterChange(f)}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-colors",
                  filter === f
                    ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700",
                )}
              >
                {f === "all"
                  ? t("common.all")
                  : f === "selected"
                    ? t("roles.selectedOnly")
                    : t("roles.unselectedOnly")}
              </button>
            ),
          )}
        </div>
        {/* Expand/collapse */}
        <div className="inline-flex gap-1">
          <button
            type="button"
            onClick={expandAll}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {t("roles.expandAll")}
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {t("roles.collapseAll")}
          </button>
        </div>
      </div>

      {/* Module grid */}
      <div className="space-y-3">
        {visibleModules.length === 0 ? (
          <div className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))] border border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
            {t("roles.noPermissionsFound")}
          </div>
        ) : (
          visibleModules.map((mod) => {
            const allPerms = grouped[mod];
            const visiblePerms = filteredByModule[mod];
            const total = allPerms.length;
            const selectedInModule = allPerms.filter((p) =>
              selectedSet.has(p.id),
            ).length;
            const hasSelected = selectedInModule > 0;
            const allSelected = selectedInModule === total && total > 0;
            const isCollapsed = collapsedModules.has(mod);
            const isHighlighted = highlightedModule === mod;

            return (
              <div
                key={mod}
                ref={(el) => {
                  moduleRefs.current[mod] = el;
                }}
                className={cn(
                  "rounded-xl border bg-white dark:bg-slate-800/80 transition-all duration-300 border-s-4",
                  "border-slate-200 dark:border-slate-700/60",
                  hasSelected
                    ? "border-s-[hsl(var(--primary))]"
                    : "border-s-slate-200 dark:border-s-slate-700/60",
                  isHighlighted && "ring-2 ring-[hsl(var(--primary))]",
                )}
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleModuleCollapse(mod)}
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] rtl:-rotate-180 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                    )}
                    <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize truncate">
                      {mod}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded-md tabular-nums",
                        hasSelected
                          ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                      )}
                    >
                      {selectedInModule}/{total}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAllModule(mod)}
                    className={cn(
                      "text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap",
                      allSelected
                        ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600",
                    )}
                  >
                    {allSelected
                      ? t("roles.allSelected")
                      : t("roles.selectAllCount", {
                          selected: selectedInModule,
                          total,
                        })}
                  </button>
                </div>
                {!isCollapsed && (
                  <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {visiblePerms.map((p) => {
                      const isChecked = selectedSet.has(p.id);
                      return (
                        <label
                          key={p.id}
                          className={cn(
                            "flex items-start gap-2.5 p-3 rounded-lg cursor-pointer border transition-all",
                            isChecked
                              ? "bg-[hsl(var(--primary)/0.05)] border-[hsl(var(--primary)/0.3)]"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/60 hover:border-slate-400 dark:hover:border-slate-500",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggle(p.id)}
                            className="mt-0.5 w-4 h-4 accent-[hsl(var(--primary))] shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-slate-900 dark:text-white truncate">
                              {p.name}
                            </span>
                            <span className="block text-xs font-mono text-[hsl(var(--muted-foreground))] truncate">
                              {p.code}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Users tab (edit mode only)
// ──────────────────────────────────────────────────────────────────────────────

interface UsersTabProps {
  roleId: string;
}

export const UsersTab: React.FC<UsersTabProps> = ({ roleId }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [userSearchTerm, setUserSearchTerm] = useState("");

  const { data: roleUsersData, isLoading: roleUsersLoading } = useQuery({
    queryKey: ["admin", "role-users", roleId],
    queryFn: () => userApi.list(1, 500, "", [roleId]),
    enabled: !!roleId,
  });

  const { data: userSearchData, isFetching: userSearchFetching } = useQuery({
    queryKey: ["admin", "user-search", userSearchTerm],
    queryFn: () => userApi.list(1, 20, userSearchTerm),
    enabled: userSearchTerm.trim().length >= 2,
  });

  const currentRoleUserIds = new Set(
    ((roleUsersData?.data as unknown as User[]) ?? []).map((u: User) => u.id),
  );
  const userSearchResults = (
    (userSearchData?.data as unknown as User[]) ?? []
  ).filter((u: User) => !currentRoleUserIds.has(u.id));

  const addUserToRoleMutation = useMutation({
    mutationFn: ({ user }: { user: User }) => {
      const currentRoleIds = (user.roles ?? []).map((r) => r.id);
      const newRoleIds = [...new Set([...currentRoleIds, roleId])];
      return userApi.update(user.id, {
        username: user.username,
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        phone: user.phone ?? "",
        role_ids: newRoleIds,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "role-users", roleId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "user-search", userSearchTerm],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User added to role");
    },
    onError: () => {
      toast.error("Failed to add user to role");
    },
  });

  const removeUserFromRoleMutation = useMutation({
    mutationFn: ({ user }: { user: User }) => {
      const newRoleIds = (user.roles ?? [])
        .filter((r) => r.id !== roleId)
        .map((r) => r.id);
      return userApi.update(user.id, {
        username: user.username,
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        phone: user.phone ?? "",
        role_ids: newRoleIds,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "role-users", roleId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User removed from role");
    },
    onError: () => {
      toast.error("Failed to remove user from role");
    },
  });

  const currentMembers = (roleUsersData?.data as unknown as User[]) ?? [];

  return (
    <div className="space-y-4">
      {/* Search to add users */}
      <div>
        <div className="relative">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder={t("roles.searchUsersToAdd")}
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            className="w-full ps-10 pe-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] outline-none transition-all"
          />
          {userSearchFetching && (
            <div className="absolute end-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {userSearchTerm.trim().length >= 2 && (
          <div className="mt-2 border border-slate-200 dark:border-slate-700/60 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
            {!userSearchFetching && userSearchResults.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-5">
                {userSearchData
                  ? t("roles.noUsersFound")
                  : t("roles.typeToSearch")}
              </p>
            ) : (
              userSearchResults.map((user: User) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700/60 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700/60 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br rtl:bg-linear-to-bl from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-white">
                        {user.first_name?.[0] || user.username[0]}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {user.first_name || user.last_name
                        ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
                        : user.username}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                      {user.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addUserToRoleMutation.mutate({ user })}
                    disabled={addUserToRoleMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("common.add")}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
        <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
          {t("roles.currentMembers", { count: currentMembers.length })}
        </span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
      </div>

      {/* Members list */}
      {roleUsersLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 animate-pulse"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : currentMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-2">
            <UsersIcon className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {t("roles.noUsersAssignedYet")}
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-700/60 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
          {currentMembers.map((user: User) => (
            <div
              key={user.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700/60 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors group"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-9 h-9 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700/60 flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-linear-to-br rtl:bg-linear-to-bl from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-white">
                    {user.first_name?.[0] || user.username[0]}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {user.first_name || user.last_name
                    ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
                    : user.username}
                </p>
                <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] truncate">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  {user.email}
                </div>
              </div>
              <span
                className={cn(
                  "hidden sm:inline-flex px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0",
                  user.is_active
                    ? "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]"
                    : "bg-slate-100 dark:bg-slate-700 text-[hsl(var(--muted-foreground))]",
                )}
              >
                {user.is_active
                  ? t("common.active")
                  : t("common.inactive")}
              </span>
              <button
                type="button"
                onClick={() => removeUserFromRoleMutation.mutate({ user })}
                disabled={removeUserFromRoleMutation.isPending}
                title={t("roles.removeFromRole")}
                className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 disabled:opacity-50"
              >
                <UserMinus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
