import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  Check,
  Key,
  Users as UsersIcon,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { permissionApi, roleApi } from "../../api/admin";
import type { RoleUpdateRequest } from "../../types";
import {
  PermissionsEditor,
  UsersTab,
  type PermissionFilterMode,
} from "./RoleFormParts";

interface RoleFormData {
  name: string;
  description: string;
  permission_ids: string[];
}

export const RoleEditPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"permissions" | "users">(
    "permissions",
  );
  const [formData, setFormData] = useState<RoleFormData>({
    name: "",
    description: "",
    permission_ids: [],
  });
  const [initialFormData, setInitialFormData] = useState<RoleFormData>({
    name: "",
    description: "",
    permission_ids: [],
  });
  const [initialized, setInitialized] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [permissionFilter, setPermissionFilter] =
    useState<PermissionFilterMode>("all");

  const {
    data: roleData,
    isLoading: roleLoading,
    error: roleError,
  } = useQuery({
    queryKey: ["admin", "role", id],
    queryFn: () => roleApi.getById(id!),
    enabled: !!id,
  });

  const { data: permissionsData } = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: () => permissionApi.list(),
  });

  const role = roleData?.data;
  const allPermissions = useMemo(
    () => permissionsData?.data ?? [],
    [permissionsData],
  );

  // Initialize form once role is loaded
  if (role && !initialized) {
    const initial: RoleFormData = {
      name: role.name,
      description: role.description ?? "",
      permission_ids: (role.permissions ?? []).map((p) => p.id),
    };
    setFormData(initial);
    setInitialFormData(initial);
    setInitialized(true);
  }

  const updateMutation = useMutation({
    mutationFn: (data: RoleUpdateRequest) => roleApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "role", id] });
      toast.success(t("roles.updatedSuccess"));
      // Reset dirty-state baseline
      setInitialFormData(formData);
      navigate("/admin/roles");
    },
    onError: () => {
      toast.error(t("roles.updateFailed"));
    },
  });

  const togglePermission = (pid: string) => {
    setFormData((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(pid)
        ? prev.permission_ids.filter((x) => x !== pid)
        : [...prev.permission_ids, pid],
    }));
  };

  const toggleManyPermissions = (ids: string[], selectAll: boolean) => {
    setFormData((prev) => {
      const set = new Set(prev.permission_ids);
      if (selectAll) ids.forEach((i) => set.add(i));
      else ids.forEach((i) => set.delete(i));
      return { ...prev, permission_ids: Array.from(set) };
    });
  };

  const clearAllPermissions = () => {
    setFormData((prev) => ({ ...prev, permission_ids: [] }));
  };

  const isDirty = useMemo(() => {
    if (!initialized) return false;
    if (formData.name !== initialFormData.name) return true;
    if (formData.description !== initialFormData.description) return true;
    const a = [...formData.permission_ids].sort();
    const b = [...initialFormData.permission_ids].sort();
    if (a.length !== b.length) return true;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
    return false;
  }, [formData, initialFormData, initialized]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(t("roles.nameRequired"));
      return;
    }
    updateMutation.mutate({
      name: formData.name.trim(),
      description: formData.description,
      permission_ids: formData.permission_ids,
    });
  };

  if (roleLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div>
        </div>
      </div>
    );
  }

  if (roleError || !role) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="rounded-xl border border-red-300 dark:border-red-700/60 bg-red-50 dark:bg-red-900/20 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                {t("roles.failedToLoad")}
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                {roleError instanceof Error
                  ? roleError.message
                  : t("common.error")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            to="/admin/roles"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
            aria-label={t("roles.backToRoles")}
          >
            <ArrowLeft className="w-4 h-4 rtl:-rotate-180" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white truncate">
                {t("roles.editRole")}
              </h1>
              {isDirty && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                  {t("roles.unsavedChanges")}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {role.name}{" "}
              <span className="font-mono">({role.code})</span>
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Basic info */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
            {t("roles.basicInfo")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("roles.roleName")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("roles.roleCode")}
              </label>
              <input
                type="text"
                value={role.code}
                disabled
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-sm font-mono cursor-not-allowed"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("common.description")}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80">
          <div className="flex border-b border-slate-200 dark:border-slate-700/60 px-6">
            <button
              type="button"
              onClick={() => setActiveTab("permissions")}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === "permissions"
                  ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                  : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-slate-900 dark:hover:text-white",
              )}
            >
              <Key className="w-4 h-4" />
              {t("roles.permissions")}
              <span className="px-1.5 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded tabular-nums">
                {formData.permission_ids.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === "users"
                  ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                  : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-slate-900 dark:hover:text-white",
              )}
            >
              <UsersIcon className="w-4 h-4" />
              {t("roles.users")}
            </button>
          </div>

          <div className="p-6">
            {activeTab === "permissions" ? (
              <PermissionsEditor
                permissions={allPermissions}
                selectedIds={formData.permission_ids}
                onToggle={togglePermission}
                onToggleMany={toggleManyPermissions}
                onClearAll={clearAllPermissions}
                search={permissionSearch}
                onSearchChange={setPermissionSearch}
                filter={permissionFilter}
                onFilterChange={setPermissionFilter}
              />
            ) : (
              <UsersTab roleId={id!} />
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/admin/roles"
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {t("common.cancel")}
          </Link>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-[hsl(var(--primary-foreground))] rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending ? (
              <Save className="w-4 h-4 animate-pulse" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {updateMutation.isPending
              ? t("common.loading")
              : t("roles.updateRole")}
          </button>
        </div>
      </form>
    </div>
  );
};
