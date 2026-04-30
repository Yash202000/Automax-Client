import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Check } from "lucide-react";
import { toast } from "sonner";
import { permissionApi, roleApi } from "../../api/admin";
import type { RoleCreateRequest } from "../../types";
import { PermissionsEditor, type PermissionFilterMode } from "./RoleFormParts";

interface RoleFormData {
  name: string;
  code: string;
  description: string;
  permission_ids: string[];
}

const initialFormData: RoleFormData = {
  name: "",
  code: "",
  description: "",
  permission_ids: [],
};

export const RoleCreatePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<RoleFormData>(initialFormData);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [permissionFilter, setPermissionFilter] =
    useState<PermissionFilterMode>("all");

  const { data: permissionsData } = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: () => permissionApi.list(),
  });

  const allPermissions = useMemo(
    () => permissionsData?.data ?? [],
    [permissionsData],
  );

  const createMutation = useMutation({
    mutationFn: (data: RoleCreateRequest) => roleApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      toast.success(t("roles.createdSuccess"));
      const newId = (res as any)?.data?.id;
      if (newId) {
        navigate(`/admin/roles/${newId}/edit`, { replace: true });
      } else {
        navigate("/admin/roles", { replace: true });
      }
    },
    onError: () => {
      toast.error(t("roles.createFailed"));
    },
  });

  const togglePermission = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(id)
        ? prev.permission_ids.filter((pid) => pid !== id)
        : [...prev.permission_ids, id],
    }));
  };

  const toggleManyPermissions = (ids: string[], selectAll: boolean) => {
    setFormData((prev) => {
      const set = new Set(prev.permission_ids);
      if (selectAll) ids.forEach((id) => set.add(id));
      else ids.forEach((id) => set.delete(id));
      return { ...prev, permission_ids: Array.from(set) };
    });
  };

  const clearAllPermissions = () => {
    setFormData((prev) => ({ ...prev, permission_ids: [] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(t("roles.nameRequired"));
      return;
    }
    if (!formData.code.trim()) {
      toast.error(t("roles.codeRequired"));
      return;
    }
    createMutation.mutate({
      name: formData.name.trim(),
      code: formData.code.trim(),
      description: formData.description,
      permission_ids: formData.permission_ids,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/admin/roles"
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label={t("roles.backToRoles")}
        >
          <ArrowLeft className="w-4 h-4 rtl:-rotate-180" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("roles.createRole")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("roles.addNewRole")}
          </p>
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
                {t("roles.roleName")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={t("roles.eGContentManager")}
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
                {t("roles.roleCode")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={t("roles.roleKeyExample")}
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] outline-none"
              />
              <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                {t("roles.roleCodeHint")}
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("common.description")}
              </label>
              <textarea
                placeholder={t("roles.describeWhatThisRoleIsFor")}
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

        {/* Permissions */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
            {t("roles.permissions")}
          </h2>
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
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-[hsl(var(--primary-foreground))] rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? (
              <Save className="w-4 h-4 animate-pulse" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {createMutation.isPending
              ? t("common.loading")
              : t("roles.createRole")}
          </button>
        </div>
      </form>
    </div>
  );
};
