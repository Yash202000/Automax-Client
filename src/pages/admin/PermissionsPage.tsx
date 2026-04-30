import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Key, Filter, Search, Info } from "lucide-react";
import { permissionApi } from "../../api/admin";
import type { Permission } from "../../types";
import { cn } from "@/lib/utils";

const actionColors: Record<string, string> = {
  create: "from-[hsl(var(--success))] to-teal-500",
  view: "from-blue-500 to-cyan-500",
  update: "from-[hsl(var(--warning))] to-orange-500",
  delete: "from-[hsl(var(--destructive))] to-pink-500",
  manage: "from-[hsl(var(--primary))] to-[hsl(var(--accent))]",
  transition: "from-purple-500 to-pink-500",
  assign: "from-indigo-500 to-blue-500",
  comment: "from-cyan-500 to-teal-500",
};

const actionBadgeColors: Record<string, string> = {
  create: "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]",
  view: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  update: "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]",
  delete: "bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]",
  manage: "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]",
  transition:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  assign:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  comment: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

export const PermissionsPage: React.FC = () => {
  const { t } = useTranslation();
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: modulesData } = useQuery({
    queryKey: ["admin", "permission-modules"],
    queryFn: () => permissionApi.getModules(),
  });

  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ["admin", "permissions", selectedModule],
    queryFn: () => permissionApi.list(selectedModule || undefined),
  });

  const groupedPermissions =
    permissionsData?.data?.reduce(
      (acc: Record<string, Permission[]>, perm: Permission) => {
        if (!acc[perm.module]) {
          acc[perm.module] = [];
        }
        acc[perm.module].push(perm);
        return acc;
      },
      {} as Record<string, Permission[]>,
    ) || {};

  // Filter by search query
  const filteredGroupedPermissions = Object.entries(groupedPermissions).reduce(
    (acc: Record<string, Permission[]>, [module, perms]) => {
      if (!searchQuery) {
        acc[module] = perms;
        return acc;
      }
      const filtered = perms.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.code.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      if (filtered.length > 0) {
        acc[module] = filtered;
      }
      return acc;
    },
    {} as Record<string, Permission[]>,
  );

  const totalPermissions = permissionsData?.data?.length || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <Key className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {t("permissions.title")}
            </h2>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">
            {t("permissions.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--muted)/0.5)] rounded-lg border border-[hsl(var(--border))]">
          <Info className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            {t("permissions.systemDefined")}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder={t("permissions.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
            />
          </div>

          {/* Module Filter */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="px-4 py-2.5 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
            >
              <option value="">{t("permissions.allModules")}</option>
              {modulesData?.data?.map((module: string) => (
                <option key={module} value={module}>
                  {module.charAt(0).toUpperCase() +
                    module.slice(1).replace(/-/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Total count */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--primary)/0.1)] rounded-xl">
            <span className="text-sm font-medium text-[hsl(var(--primary))]">
              {totalPermissions} {t("permissions.total")}
            </span>
          </div>
        </div>
      </div>

      {/* Permissions by module */}
      {isLoading ? (
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 text-center">
          <div className="w-10 h-10 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[hsl(var(--muted-foreground))]">
            {t("permissions.loadingPermissions")}
          </p>
        </div>
      ) : Object.keys(filteredGroupedPermissions).length === 0 ? (
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[hsl(var(--primary)/0.25)]">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
            {t("permissions.noPermissionsFound")}
          </h3>
          <p className="text-[hsl(var(--muted-foreground))]">
            {searchQuery
              ? t("permissions.adjustSearchQuery")
              : t("permissions.noPermissionsAvailable")}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(filteredGroupedPermissions).map(([module, perms]) => (
            <div
              key={module}
              className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden"
            >
              {/* Module Header */}
              <div className="px-6 py-4 bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.2)]">
                    <Key className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] capitalize">
                      {module.replace(/-/g, " ")}
                    </h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {perms.length} {t("permissions.permissionsCount")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Permissions List */}
              <div className="divide-y divide-[hsl(var(--border))]">
                {perms.map((permission: Permission) => (
                  <div
                    key={permission.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-[hsl(var(--muted)/0.3)] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-md",
                          actionColors[permission.action] ||
                            "from-[hsl(var(--muted-foreground))] to-[hsl(var(--foreground))]",
                        )}
                      >
                        <Key className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                          {permission.name}
                        </h4>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
                          {permission.code}
                        </p>
                        {permission.description && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                            {permission.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "px-2.5 py-1 text-xs font-medium rounded-lg capitalize",
                          actionBadgeColors[permission.action] ||
                            "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]",
                        )}
                      >
                        {permission.action}
                      </span>
                      <span
                        className={cn(
                          "px-2.5 py-1 text-xs font-medium rounded-lg",
                          permission.is_active
                            ? "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]"
                            : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
                        )}
                      >
                        {permission.is_active
                          ? t("common.active")
                          : t("common.inactive")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
