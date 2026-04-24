import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Edit2,
  Trash2,
  Shield,
  Key,
  AlertTriangle,
  Sparkles,
  Download,
  Upload,
  Info,
} from "lucide-react";
import { roleApi } from "../../api/admin";
import type { Role } from "../../types";
import { cn } from "@/lib/utils";
import { Button } from "../../components/ui";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";

export const RolesPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const canCreateRole = isSuperAdmin || hasPermission(PERMISSIONS.ROLES_CREATE);
  const canUpdateRole = isSuperAdmin || hasPermission(PERMISSIONS.ROLES_UPDATE);

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => roleApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => roleApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      setDeleteConfirm(null);
    },
  });

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await roleApi.export();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `roles_export_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const result = await roleApi.import(file);
      if (result.data) {
        setImportResult(result.data);
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    } catch (error) {
      console.error("Import failed:", error);
      setImportResult({
        imported: 0,
        skipped: 0,
        errors: ["Import failed. Please check the file format."],
      });
    } finally {
      setIsImporting(false);
      // Reset the file input
      event.target.value = "";
    }
  };

  const getRoleGradient = (role: Role) => {
    if (role.is_system) return "from-amber-500 to-orange-500";
    const gradients = [
      "from-[hsl(var(--primary))] to-[hsl(var(--accent))]",
      "from-blue-500 to-cyan-500",
      "from-emerald-500 to-teal-500",
      "from-rose-500 to-pink-500",
      "from-indigo-500 to-blue-500",
    ];
    const index = role.name.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <Shield className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {t("roles.title")}
            </h2>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">
            {t("roles.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--success))] text-white rounded-lg hover:bg-[hsl(var(--success)/0.9)] transition-colors text-sm font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting..." : "Export"}
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] rounded-lg hover:bg-[hsl(var(--accent)/0.9)] transition-colors text-sm font-medium shadow-md cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{isImporting ? "Importing..." : "Import"}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={isImporting}
              className="hidden"
            />
          </label>
          {canCreateRole && (
            <Button
              onClick={() => navigate("/admin/roles/new")}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {t("roles.addRole")}
            </Button>
          )}
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 animate-pulse"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[hsl(var(--muted))] rounded-xl" />
                  <div className="flex-1">
                    <div className="h-5 bg-[hsl(var(--muted))] rounded w-1/2 mb-2" />
                    <div className="h-4 bg-[hsl(var(--muted))] rounded w-3/4" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 bg-[hsl(var(--muted))] rounded w-full" />
                  <div className="h-3 bg-[hsl(var(--muted))] rounded w-2/3" />
                </div>
              </div>
            ))
          : rolesData?.data?.map((role: Role) => (
              <div
                key={role.id}
                className="group relative bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 hover:shadow-xl hover:shadow-[hsl(var(--foreground)/0.05)] hover:border-[hsl(var(--border))] transition-all duration-300"
              >
                {/* Gradient decoration */}
                <div
                  className={cn(
                    "absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity",
                    getRoleGradient(role),
                  )}
                />

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-12 h-12 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-lg",
                          getRoleGradient(role),
                        )}
                      >
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                          {role.name}
                        </h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] font-mono">
                          {role.code}
                        </p>
                      </div>
                    </div>

                    {!role.is_system && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canUpdateRole && (
                          <button
                            onClick={() =>
                              navigate(`/admin/roles/${role.id}/edit`)
                            }
                            className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                            aria-label={t("roles.editRole")}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm(role.id)}
                          className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
                          aria-label={t("roles.deleteRole")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2 mb-4">
                    {role.description || t("roles.noDescriptionProvided")}
                  </p>

                  <div className="pt-4 border-t border-[hsl(var(--border))]">
                    <div className="flex items-center gap-2 mb-3">
                      <Key className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                        {role.permissions?.length || 0}{" "}
                        {t("roles.permissionsCount")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {role.permissions?.slice(0, 4).map((perm) => (
                        <span
                          key={perm.id}
                          className="px-2.5 py-1 text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-lg"
                        >
                          {perm.code}
                        </span>
                      ))}
                      {(role.permissions?.length || 0) > 4 && (
                        <span className="px-2.5 py-1 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-lg">
                          +{role.permissions!.length - 4} {t("roles.more")}
                        </span>
                      )}
                    </div>
                  </div>

                  {role.is_system && (
                    <div className="mt-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg shadow-sm">
                        <Sparkles className="w-3 h-3" />
                        {t("roles.systemRole")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
      </div>

      {/* Empty state */}
      {!isLoading && rolesData?.data?.length === 0 && (
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[hsl(var(--primary)/0.25)]">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
            {t("roles.noRolesYet")}
          </h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">
            {t("roles.createFirstRole")}
          </p>
          {canCreateRole && (
            <Button
              onClick={() => navigate("/admin/roles/new")}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {t("roles.createRole")}
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-[hsl(var(--destructive)/0.1)] rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-[hsl(var(--destructive))]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {t("roles.deleteConfirmTitle")}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    {t("roles.deleteConfirmMessage")}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(deleteConfirm)}
                  isLoading={deleteMutation.isPending}
                >
                  {deleteMutation.isPending
                    ? t("roles.deleting")
                    : t("roles.deleteRole")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Result Modal */}
      {importResult && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                    importResult.skipped > 0
                      ? "bg-[hsl(var(--warning)/0.1)]"
                      : "bg-[hsl(var(--success)/0.1)]",
                  )}
                >
                  <Info
                    className={cn(
                      "w-6 h-6",
                      importResult.skipped > 0
                        ? "text-[hsl(var(--warning))]"
                        : "text-[hsl(var(--success))]",
                    )}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
                    Import Complete
                  </h3>
                  <div className="space-y-1">
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      <span className="font-medium text-[hsl(var(--success))]">
                        {importResult.imported}
                      </span>{" "}
                      roles imported successfully
                    </p>
                    {importResult.skipped > 0 && (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        <span className="font-medium text-[hsl(var(--warning))]">
                          {importResult.skipped}
                        </span>{" "}
                        roles skipped
                      </p>
                    )}
                    {importResult.errors.length > 0 && (
                      <div className="mt-3 max-h-40 overflow-y-auto">
                        <p className="text-xs font-medium text-[hsl(var(--destructive))] mb-2">
                          Errors:
                        </p>
                        <ul className="space-y-1">
                          {importResult.errors.map((error, index) => (
                            <li
                              key={index}
                              className="text-xs text-[hsl(var(--muted-foreground))] pl-3"
                            >
                              • {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setImportResult(null)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
