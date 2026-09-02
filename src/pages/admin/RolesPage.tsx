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
  Crown,
  Download,
  Upload,
  Info,
  Search,
  MoreHorizontal,
  FileSpreadsheet,
  ChevronDown,
  X,
} from "lucide-react";
import { permissionApi, roleApi } from "../../api/admin";
import type { Role } from "../../types";
import { cn } from "@/lib/utils";
import { Button } from "../../components/ui";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";
import ExcelJs from "exceljs";
import { saveAs } from "file-saver";

const normalizeImportHeader = (header: string | undefined) => {
  if (!header) return "";

  return header
    .toString()
    .trim()
    .replace(/\s*\((required|optional)\)\s*$/i, "")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
};

const isImportMetadataRow = (
  row: Record<string, string | number | boolean | null | undefined>,
) => {
  const values = Object.values(row).filter(
    (value) => value !== undefined && value !== null && value !== "",
  );

  if (values.length === 0) return true;

  return values.every((value) => {
    const normalized = String(value).trim().toLowerCase();

    return (
      normalized === "(required)" ||
      normalized === "(optional)" ||
      normalized === "required" ||
      normalized === "optional"
    );
  });
};

export const RolesPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const canCreateRole = isSuperAdmin || hasPermission(PERMISSIONS.ROLES_CREATE);
  const canUpdateRole = isSuperAdmin || hasPermission(PERMISSIONS.ROLES_UPDATE);

  const isEPM940 =
    window.APP_CONFIG?.CLIENT === "EPM940" ||
    import.meta.env.VITE_CLIENT === "EPM940";

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => roleApi.list(),
  });

  const { data: permissionsData } = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: () => permissionApi.list(),
  });

  const filteredRoles = (rolesData?.data ?? []).filter((role: Role) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      role.name.toLowerCase().includes(q) ||
      role.code.toLowerCase().includes(q) ||
      (role.description || "").toLowerCase().includes(q)
    );
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => roleApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      setDeleteConfirm(null);
    },
  });

  const handleExportJson = async () => {
    try {
      setIsExporting(true);

      const blob = await roleApi.export();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `roles_export_${
        new Date().toISOString().split("T")[0]
      }.json`;

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

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);

      const roles = rolesData?.data ?? [];

      const workbook = new ExcelJs.Workbook();
      const worksheet = workbook.addWorksheet("Roles");

      worksheet.columns = [
        { header: "name", key: "name", width: 26 },
        { header: "code", key: "code", width: 26 },
        { header: "description", key: "description", width: 40 },
        { header: "permissions", key: "permissions", width: 50 },
        { header: "is_system", key: "is_system", width: 12 },
        {
          header: "is_department_manager",
          key: "is_department_manager",
          width: 22,
        },
        { header: "is_active", key: "is_active", width: 12 },
      ];

      roles.forEach((role: Role) => {
        worksheet.addRow({
          name: role.name,
          code: role.code,
          description: role.description || "",
          permissions: role.permissions?.map((p) => p.code).join(", ") || "",
          is_system: role.is_system ? "Yes" : "No",
          is_department_manager: role.is_department_manager ? "Yes" : "No",
          is_active: role.is_active ? "Yes" : "No",
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(
        blob,
        `roles_export_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJs.Workbook();
    const worksheet = workbook.addWorksheet("Roles");

    worksheet.columns = [
      { header: "name (Required)", key: "name", width: 26 },
      ...(isEPM940
        ? []
        : [{ header: "code (Required)", key: "code", width: 26 }]),
      { header: "description (Optional)", key: "description", width: 40 },
      { header: "permissions (Optional)", key: "permissions", width: 50 },
      {
        header: "is_department_manager (Optional)",
        key: "is_department_manager",
        width: 28,
      },
      { header: "is_active (Optional)", key: "is_active", width: 12 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "roles_import_template.xlsx");
  };

  const handleImportFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] || null;

    if (!file) return;

    const name = file.name.toLowerCase();

    if (!name.endsWith(".json") && !name.endsWith(".xlsx")) {
      setImportResult({
        imported: 0,
        skipped: 0,
        errors: ["Please select a valid JSON (.json) or Excel (.xlsx) file."],
      });

      event.target.value = "";
      return;
    }

    setImportFile(file);
    setIsImportModalOpen(true);
  };

  const handleImport = async () => {
    if (!importFile) return;

    try {
      setIsImporting(true);

      const file = importFile;

      // JSON import
      if (file.name.toLowerCase().endsWith(".json")) {
        const result = await roleApi.import(file);

        setImportResult({
          imported: result.data?.imported ?? 0,
          skipped: result.data?.skipped ?? 0,
          errors: result.data?.errors ?? [],
        });

        queryClient.invalidateQueries({
          queryKey: ["admin", "roles"],
        });

        setIsImportModalOpen(false);
        setImportFile(null);
        return;
      }

      // Excel import
      const workbook = new ExcelJs.Workbook();
      const buffer = await file.arrayBuffer();

      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        throw new Error("No worksheet found in the Excel file.");
      }

      const headerRow = worksheet.getRow(1);

      const headerValues = Array.isArray(headerRow.values)
        ? headerRow.values.slice(1)
        : [];

      const headers = headerValues.map((header) =>
        normalizeImportHeader(
          header === null || header === undefined ? "" : String(header),
        ),
      );
      if (!headers.length || !headers.some(Boolean)) {
        throw new Error("Excel file does not contain valid headers.");
      }

      const requiredHeaders = isEPM940 ? ["name"] : ["name", "code"];

      const missingHeaders = requiredHeaders.filter(
        (header) => !headers.includes(header),
      );

      if (missingHeaders.length > 0) {
        throw new Error(
          `Missing required column(s): ${missingHeaders.join(", ")}`,
        );
      }

      const rows: Record<string, string>[] = [];

      worksheet.eachRow((row: any, rowNumber) => {
        if (rowNumber === 1) return;

        const values = Array.isArray(row.values) ? row.values.slice(1) : [];

        const rowData: Record<string, string> = {};

        headers.forEach((header: string, index: number) => {
          if (!header) return;

          const value = values[index];

          rowData[header] =
            value === null || value === undefined ? "" : String(value).trim();
        });

        if (!isImportMetadataRow(rowData)) {
          rows.push(rowData);
        }
      });

      if (rows.length === 0) {
        throw new Error("No data rows found in the Excel file.");
      }

      const errors: string[] = [];
      const validPayloads: Array<Record<string, unknown>> = [];

      const seenCodes = new Set<string>();

      rows.forEach((row, index) => {
        const excelRowNumber = index + 2;

        const name = row.name?.trim();
        const code = row.code?.trim();

        if (!name) {
          errors.push(`Row ${excelRowNumber}: Name is required.`);
          return;
        }

        if (!isEPM940 && !code) {
          errors.push(`Row ${excelRowNumber}: Code is required.`);
          return;
        }

        const normalizedCode = code?.toLowerCase();

        if (seenCodes.has(normalizedCode)) {
          errors.push(`Row ${excelRowNumber}: Duplicate role code "${code}".`);
          return;
        }

        seenCodes.add(normalizedCode);

        const permissionCodes = row.permissions
          ? row.permissions
              .split(/[,;]/)
              .map((permission) => permission.trim())
              .filter(Boolean)
          : [];

        const permissionIds: string[] = [];

        for (const permissionCode of permissionCodes) {
          const permission = permissionsData?.data?.find(
            (permission) =>
              permission.code.toLowerCase() === permissionCode.toLowerCase(),
          );

          if (!permission) {
            errors.push(
              `Row ${excelRowNumber}: Permission "${permissionCode}" not found.`,
            );
            continue;
          }

          permissionIds.push(permission.id);
        }

        const parseBoolean = (value?: string) => {
          if (!value) return false;

          return ["true", "yes", "1"].includes(value.trim().toLowerCase());
        };

        validPayloads.push({
          name,
          code,
          description: row.description?.trim() || "",
          permission_ids: permissionIds,
          is_department_manager: parseBoolean(row.is_department_manager),
          is_active: parseBoolean(row.is_active),
        });
      });

      if (validPayloads.length === 0) {
        setImportResult({
          imported: 0,
          skipped: rows.length,
          errors,
        });

        setIsImportModalOpen(false);
        setImportFile(null);
        return;
      }

      const jsonBlob = new Blob([JSON.stringify(validPayloads, null, 2)], {
        type: "application/json",
      });

      const jsonFile = new File([jsonBlob], "roles_import.json", {
        type: "application/json",
      });

      const result = await roleApi.import(jsonFile);

      const data = result.data as {
        imported: number;
        skipped: number;
        errors?: string[];
      };

      setImportResult({
        imported: data.imported ?? 0,
        skipped: (data.skipped ?? 0) + (rows.length - validPayloads.length),
        errors: [...errors, ...(data.errors ?? [])],
      });

      queryClient.invalidateQueries({
        queryKey: ["admin", "roles"],
      });

      setIsImportModalOpen(false);
      setImportFile(null);
    } catch (error) {
      console.error("Import failed:", error);

      setImportResult({
        imported: 0,
        skipped: 0,
        errors: [
          error instanceof Error
            ? error.message
            : "Import failed. Please check the file format.",
        ],
      });

      setIsImportModalOpen(false);
      setImportFile(null);
    } finally {
      setIsImporting(false);
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
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<MoreHorizontal className="w-4 h-4" />}
              rightIcon={
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform",
                    isActionsMenuOpen && "rotate-180",
                  )}
                />
              }
              onClick={() => setIsActionsMenuOpen((v) => !v)}
            >
              {t("common.moreActions", {
                defaultValue: "More Actions",
              })}
            </Button>

            {isActionsMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-60"
                  onClick={() => setIsActionsMenuOpen(false)}
                />

                <div className="absolute right-0 mt-2 w-72 bg-[hsl(var(--card))] rounded-xl shadow-xl border border-[hsl(var(--border))] py-1.5 z-[70]">
                  <button
                    onClick={() => {
                      setIsActionsMenuOpen(false);
                      handleExportExcel();
                    }}
                    disabled={isExporting}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-[hsl(var(--muted))]"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    {isExporting
                      ? t("common.exporting")
                      : t("common.exportExcel")}
                  </button>

                  <button
                    onClick={() => {
                      setIsActionsMenuOpen(false);
                      handleExportJson();
                    }}
                    disabled={isExporting}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-[hsl(var(--muted))]"
                  >
                    <Download className="w-4 h-4" />
                    {isExporting
                      ? t("common.exporting")
                      : t("common.exportJson")}
                  </button>

                  <div className="my-1 border-t border-[hsl(var(--border))]" />

                  <button
                    onClick={() => {
                      setIsActionsMenuOpen(false);
                      handleDownloadTemplate();
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-[hsl(var(--muted))]"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    {t("common.downloadExcelTemplate")}
                  </button>
                </div>
              </>
            )}
          </div>
          <Button
            onClick={() => setIsImportModalOpen(true)}
            disabled={isImporting}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            {isImporting ? t("common.importing") : t("common.import")}
          </Button>

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

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
        />
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
          : filteredRoles.map((role: Role) => (
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
                        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                          {role.is_department_manager && (
                            <Crown className="w-4 h-4 text-indigo-500" />
                          )}
                          {role.name}
                        </h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] font-mono">
                          {role.code}
                        </p>
                      </div>
                    </div>

                    {(!role.is_system ||
                      role.is_department_manager ||
                      isSuperAdmin) && (
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
                        {!role.is_system && (
                          <button
                            onClick={() => setDeleteConfirm(role.id)}
                            className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
                            aria-label={t("roles.deleteRole")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
                  {role.is_department_manager && (
                    <div className="mt-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg shadow-sm">
                        <Crown className="w-3 h-3" />
                        {t("roles.departmentManager")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
      </div>

      {/* Empty state */}
      {!isLoading && filteredRoles.length === 0 && (
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

      {isImportModalOpen && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-lg w-full animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
              <div>
                <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                  Import Roles
                </h3>

                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                  Import roles from a JSON or Excel file.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isImporting) return;

                  setIsImportModalOpen(false);
                  setImportFile(null);
                }}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <div className="bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-[hsl(var(--primary)/0.1)] rounded-xl flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6 text-[hsl(var(--primary))]" />
                  </div>

                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {importFile ? importFile.name : "Select a role import file"}
                  </p>

                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    Supported formats: .json, .xlsx
                  </p>

                  <label className="mt-4">
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg text-sm font-medium cursor-pointer hover:opacity-90">
                      <Upload className="w-4 h-4" />
                      Choose File
                    </span>

                    <input
                      type="file"
                      accept=".json,.xlsx"
                      onChange={handleImportFileChange}
                      disabled={isImporting}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Selected file */}
              {importFile && (
                <div className="flex items-center gap-3 p-3 bg-[hsl(var(--success)/0.08)] border border-[hsl(var(--success)/0.2)] rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-[hsl(var(--success))]" />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                      {importFile.name}
                    </p>

                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {(importFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))]">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                }}
                disabled={isImporting}
              >
                {t("common.cancel")}
              </Button>

              <Button
                onClick={handleImport}
                disabled={!importFile || isImporting}
                isLoading={isImporting}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                {isImporting ? t("common.importing") : t("common.import")}
              </Button>
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
                    {t("goals.components.import.completedHeading")}
                  </h3>
                  <div className="space-y-1">
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      <span className="font-medium text-[hsl(var(--success))]">
                        {importResult.imported}
                      </span>{" "}
                      {t("roles.rolesImportedSuccessfully")}
                    </p>
                    {importResult.skipped > 0 && (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        <span className="font-medium text-[hsl(var(--warning))]">
                          {importResult.skipped}
                        </span>{" "}
                        {t("roles.rolesSkipped")}
                      </p>
                    )}
                    {importResult.errors.length > 0 && (
                      <div className="mt-3 max-h-40 overflow-y-auto">
                        <p className="text-xs font-medium text-[hsl(var(--destructive))] mb-2">
                          {t("roles.errors")}
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
                <Button onClick={() => setImportResult(null)}>
                  {t("common.close")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
