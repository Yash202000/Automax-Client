import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Building2,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  MapPin,
  Shield,
  Crown,
  FolderTree,
  Eye,
  Download,
  Upload,
  Info,
  Users as UsersIcon,
  UserMinus,
  Mail,
  Search,
  Power,
  MoreHorizontal,
} from "lucide-react";
import ExcelJs from "exceljs";
import { saveAs } from "file-saver";
import {
  departmentApi,
  locationApi,
  classificationApi,
  roleApi,
  userApi,
} from "../../api/admin";
import type {
  Department,
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
  Role,
  User,
} from "../../types";
import { cn } from "@/lib/utils";
import { Button, HierarchicalTreeSelect } from "../../components/ui";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";
import { toast } from "sonner";

interface DepartmentFormData {
  name: string;
  name_ar: string;
  code: string;
  description: string;
  description_ar: string;
  type: "internal" | "external";
  parent_id: string;
  parent_name: string;
  supervisor_id: string;
  location_ids: string[];
  classification_ids: string[];
  role_ids: string[];
}

const initialFormData: DepartmentFormData = {
  name: "",
  name_ar: "",
  code: "",
  description: "",
  description_ar: "",
  type: "internal",
  parent_id: "",
  parent_name: "",
  supervisor_id: "",
  location_ids: [],
  classification_ids: [],
  role_ids: [],
};

const levelGradients = [
  "from-[hsl(var(--primary))] to-[hsl(var(--accent))]",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-blue-500 to-cyan-500",
  "from-rose-500 to-pink-500",
];

interface TreeNodeProps {
  department: Department;
  level: number;
  onView: (id: string) => void;
  onAdd: (parentId: string, parentName: string) => void;
  onEdit: (dept: Department) => void;
  onDelete: (id: string) => void;
  onToggleActive: (dept: Department) => void;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  t: (key: string) => string;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  department,
  level,
  onView,
  onAdd,
  onEdit,
  onDelete,
  onToggleActive,
  canCreate,
  canEdit,
  canDelete,
  t,
}) => {
  const [expanded, setExpanded] = useState(true);
  const { i18n } = useTranslation();
  const hasChildren = department.children && department.children.length > 0;
  const gradient = levelGradients[level % levelGradients.length];
  const displayName =
    i18n.language === "ar" && department.name_ar
      ? department.name_ar
      : department.name;

  return (
    <div>
      <div
        className="flex items-center justify-between py-3.5 px-4 hover:bg-[hsl(var(--muted)/0.5)] transition-colors group"
        style={{ paddingLeft: `${level * 28 + 20}px` }}
      >
        <div className="flex items-center gap-3">
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              )}
            </button>
          ) : (
            <span className="w-7" />
          )}
          <button
            onClick={() => onView(department.id)}
            className={cn(
              "w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-md hover:scale-105 transition-transform",
              gradient,
            )}
          >
            <Building2 className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => onView(department.id)}
            className="text-start hover:opacity-80 transition-opacity"
          >
            <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors">
              {displayName}
            </h4>
            <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
              {department.code}
            </p>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-lg",
              department.is_active
                ? "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]"
                : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
            )}
          >
            {department.is_active
              ? t("departments.active")
              : t("departments.inactive")}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canCreate && (
              <button
                onClick={() => onAdd(department.id, displayName)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.1)] rounded-lg transition-colors"
                title={t("departments.addChildDepartment")}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onView(department.id)}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
              title={t("departments.viewDetails")}
            >
              <Eye className="w-4 h-4" />
            </button>
            {canEdit && (
              <button
                onClick={() => onToggleActive(department)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  department.is_active
                    ? "text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.1)]"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)]",
                )}
                title={
                  department.is_active
                    ? t("departments.deactivate")
                    : t("departments.activate")
                }
              >
                <Power className="w-4 h-4" />
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => onEdit(department)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                title={t("common.edit")}
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(department.id)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
                title={t("common.delete")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {department.children!.map((child) => (
            <TreeNode
              key={child.id}
              department={child}
              level={level + 1}
              onView={onView}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
              canCreate={canCreate}
              canEdit={canEdit}
              canDelete={canDelete}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DepartmentsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  );
  const [formData, setFormData] = useState<DepartmentFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [search, setSearch] = useState("");
  const [modalTab, setModalTab] = useState<"details" | "users">("details");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const canCreateDepartment =
    isSuperAdmin || hasPermission(PERMISSIONS.DEPARTMENTS_CREATE);
  const canEditDepartment =
    isSuperAdmin || hasPermission(PERMISSIONS.DEPARTMENTS_UPDATE);
  const canDeleteDepartment =
    isSuperAdmin || hasPermission(PERMISSIONS.DEPARTMENTS_DELETE);

  // Handle edit state from navigation (e.g., from DepartmentDetailPage)
  useEffect(() => {
    const state = location.state as { editDepartment?: Department } | null;
    if (state?.editDepartment) {
      const dept = state.editDepartment;
      setEditingDepartment(dept);
      setFormData({
        name: dept.name,
        name_ar: dept.name_ar || "",
        code: dept.code,
        description: dept.description || "",
        description_ar: dept.description_ar || "",
        type: (dept.type as "internal" | "external") || "internal",
        parent_id: dept.parent_id || "",
        parent_name: "",
        supervisor_id: dept.supervisor_id || "",
        location_ids: dept.locations?.map((l) => l.id) || [],
        classification_ids: dept.classifications?.map((c) => c.id) || [],
        role_ids: dept.roles?.map((r) => r.id) || [],
      });
      setIsModalOpen(true);
      // Clear the state to prevent reopening on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const handleViewDepartment = (id: string) => {
    navigate(`/admin/departments/${id}`);
  };

  const filterTreeNodes = useCallback(
    (nodes: Department[], q: string): Department[] => {
      if (!q) return nodes;
      return nodes.reduce<Department[]>((acc, node) => {
        const name =
          i18n.language === "ar" && node.name_ar ? node.name_ar : node.name;
        if (
          name.toLowerCase().includes(q) ||
          node.code.toLowerCase().includes(q)
        ) {
          acc.push(node);
        } else {
          const filteredChildren = filterTreeNodes(node.children ?? [], q);
          if (filteredChildren.length > 0)
            acc.push({ ...node, children: filteredChildren });
        }
        return acc;
      }, []);
    },
    [i18n.language],
  );

  const { data: treeData, isLoading } = useQuery({
    queryKey: ["admin", "departments", "tree"],
    queryFn: () => departmentApi.getTree(),
  });

  const displayedTreeNodes = useMemo(() => {
    if (!search) return treeData?.data ?? [];
    return filterTreeNodes(treeData?.data ?? [], search.toLowerCase().trim());
  }, [treeData?.data, search, filterTreeNodes]);

  const { data: departmentsList } = useQuery({
    queryKey: ["admin", "departments", "list"],
    queryFn: () => departmentApi.list(),
  });

  const { data: locationsData } = useQuery({
    queryKey: ["admin", "locations", "tree"],
    queryFn: () => locationApi.getTree(),
  });

  const { data: classificationsData } = useQuery({
    queryKey: ["admin", "classifications", "tree"],
    queryFn: () => classificationApi.getTree(),
  });

  const { data: rolesData } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => roleApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: DepartmentCreateRequest) => departmentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "departments"] });
      closeModal();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || error.message;
      setError(message);
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DepartmentUpdateRequest }) =>
      departmentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "departments"] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.error || "Failed to update department",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "departments"] });
      setDeleteConfirm(null);
    },
    onError: (err: any) => {
      setDeleteError(
        err?.response?.data?.error || t("departments.deleteError"),
      );
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      departmentApi.update(id, { is_active: isActive } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "departments"] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.error;
      toast.error(errorMsg);
    },
  });

  const { data: deptUsersData, isLoading: deptUsersLoading } = useQuery({
    queryKey: ["admin", "dept-users", editingDepartment?.id],
    queryFn: () => userApi.list(1, 500, "", [], [editingDepartment!.id]),
    enabled: !!editingDepartment,
  });

  const { data: userSearchData, isFetching: userSearchFetching } = useQuery({
    queryKey: ["admin", "user-search-dept", userSearchTerm],
    queryFn: () => userApi.list(1, 20, userSearchTerm),
    enabled: userSearchTerm.trim().length >= 2,
  });

  const currentDeptUserIds = new Set(
    ((deptUsersData?.data as unknown as User[]) ?? []).map((u: User) => u.id),
  );
  const userSearchResults = (
    (userSearchData?.data as unknown as User[]) ?? []
  ).filter((u: User) => !currentDeptUserIds.has(u.id));

  const addUserToDeptMutation = useMutation({
    mutationFn: ({ user }: { user: User }) => {
      const currentDeptIds = (user.departments ?? []).map((d) => d.id);
      const newDeptIds = [
        ...new Set([...currentDeptIds, editingDepartment!.id]),
      ];
      return userApi.update(user.id, {
        username: user.username,
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        phone: user.phone ?? "",
        department_ids: newDeptIds,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "dept-users", editingDepartment?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "user-search-dept", userSearchTerm],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User added to department");
    },
    onError: () => toast.error("Failed to add user to department"),
  });

  const removeUserFromDeptMutation = useMutation({
    mutationFn: ({ user }: { user: User }) => {
      const newDeptIds = (user.departments ?? [])
        .filter((d) => d.id !== editingDepartment!.id)
        .map((d) => d.id);
      return userApi.update(user.id, {
        username: user.username,
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        phone: user.phone ?? "",
        department_ids: newDeptIds,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "dept-users", editingDepartment?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User removed from department");
    },
    onError: () => toast.error("Failed to remove user from department"),
  });

  const openCreateModal = (parentId: string = "", parentName: string = "") => {
    setEditingDepartment(null);
    setFormData({
      ...initialFormData,
      parent_id: parentId,
      parent_name: parentName,
    });
    setModalTab("details");
    setUserSearchTerm("");
    setIsModalOpen(true);
  };

  const openEditModal = (department: Department) => {
    const parentDept = departmentsList?.data?.find(
      (d: Department) => d.id === department.parent_id,
    );
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      name_ar: department.name_ar || "",
      code: department.code,
      description: department.description,
      description_ar: department.description_ar || "",
      type: (department.type as "internal" | "external") || "internal",
      parent_id: department.parent_id || "",
      parent_name: parentDept?.name || "",
      supervisor_id: department.supervisor_id || "",
      location_ids: department.locations?.map((l) => l.id) || [],
      classification_ids: department.classifications?.map((c) => c.id) || [],
      role_ids: department.roles?.map((r) => r.id) || [],
    });
    setModalTab("details");
    setUserSearchTerm("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDepartment(null);
    setFormData(initialFormData);
    setModalTab("details");
    setUserSearchTerm("");
    setError(null);
    setErrors({});
  };

  const isEPM940 =
    window.APP_CONFIG?.CLIENT === "EPM940" ||
    import.meta.env.VITE_CLIENT === "EPM940";

  const validateDepartmentName = (name: string): string | undefined => {
    const trimmed = name.trim();

    if (!trimmed) return t("common.nameRequired");

    if (!/[A-Za-z]/.test(trimmed)) return t("common.nameInvalid");

    if (!/^[A-Za-z0-9\s'",.&()/-]+$/.test(trimmed)) {
      return t("common.nameAllowedCharacters");
    }

    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const name = formData.name.trim();
    const name_ar = formData.name_ar.trim();
    const code = formData.code.trim();

    const nameError = validateDepartmentName(name);
    if (nameError) {
      newErrors.name = nameError;
    }

    if (name_ar && !/^[\u0600-\u06FF0-9\s]+$/.test(name_ar)) {
      newErrors.name_ar = t("departments.invalidArabicName");
    }
    if (!isEPM940) {
      if (!code) {
        newErrors.code = t("departments.codeRequired", {
          defaultValue: "Department code is required",
        });
      } else if (!/^[a-zA-Z0-9\s]+$/.test(code)) {
        newErrors.code = t("departments.invalidCode", {
          defaultValue:
            "Department code can only contain letters, numbers and spaces",
        });
      }
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    const name_ar = formData.name_ar.trim();
    const code = formData.code.trim();

    if (!validateForm()) {
      toast.error(t("errors.validationError"));
      return;
    }

    const payload = {
      name,
      name_ar: name_ar || undefined,
      code,
      description: formData.description,
      description_ar: formData.description_ar || undefined,
      type: formData.type,
      parent_id: formData.parent_id || undefined,
      supervisor_id: formData.supervisor_id || undefined,
      location_ids: formData.location_ids,
      classification_ids: formData.classification_ids,
      role_ids: formData.role_ids,
    };

    if (editingDepartment) {
      updateMutation.mutate({ id: editingDepartment.id, data: payload });
    } else {
      createMutation.mutate(payload as DepartmentCreateRequest);
    }
  };

  const toggleItem = (
    field: "location_ids" | "classification_ids" | "role_ids",
    id: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter((i) => i !== id)
        : [...prev[field], id],
    }));
  };

  const selectAll = (
    field: "location_ids" | "classification_ids" | "role_ids",
    ids: string[],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: ids }));
  };

  const clearAll = (
    field: "location_ids" | "classification_ids" | "role_ids",
  ) => {
    setFormData((prev) => ({ ...prev, [field]: [] }));
  };

  const flattenTree = <T extends { children?: T[] }>(nodes: T[]): T[] => {
    const result: T[] = [];
    nodes.forEach((node) => {
      result.push(node);
      if (node.children?.length) {
        result.push(...flattenTree(node.children));
      }
    });
    return result;
  };

  const resolveImportRelationIds = (
    raw: string | undefined,
    items: Array<{ id: string; name: string; code?: string }>,
    label: string,
  ): { ids: string[]; errors: string[] } => {
    const errors: string[] = [];
    const ids: string[] = [];

    String(raw || "")
      .split(/[;,]/)
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((name) => {
        const match = items.find(
          (item) =>
            item.name.trim().toLowerCase() === name.toLowerCase() ||
            (item.code &&
              item.code.trim().toLowerCase() === name.toLowerCase()),
        );
        if (!match) {
          errors.push(`${label} "${name}" was not found`);
          return;
        }
        ids.push(match.id);
      });

    return { ids, errors };
  };

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

  const handleExportJson = async () => {
    try {
      setIsExporting(true);
      const blob = await departmentApi.export();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `departments_export_${new Date().toISOString().split("T")[0]}.json`;
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

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportSelectedIds, setExportSelectedIds] = useState<string[]>([]);

  const flattenDepartments = (nodes: Department[]): Department[] => {
    const result: Department[] = [];
    nodes.forEach((node) => {
      result.push(node);
      if (node.children?.length) {
        result.push(...flattenDepartments(node.children));
      }
    });
    return result;
  };

  const openDepartmentExportModal = () => {
    setExportSelectedIds(
      flattenDepartments(treeData?.data ?? []).map((dept) => dept.id),
    );
    setIsExportModalOpen(true);
  };

  const handleExportExcel = async (selectedIds?: string[]) => {
    try {
      setIsExporting(true);

      const list =
        typeof selectedIds === "undefined"
          ? (treeData?.data ?? [])
          : flattenDepartments(treeData?.data ?? []).filter((dept) =>
              selectedIds.includes(dept.id),
            );

      const workbook = new ExcelJs.Workbook();
      const worksheet = workbook.addWorksheet("Departments");

      worksheet.columns = [
        { header: "name", key: "name", width: 26 },
        { header: "name_ar", key: "name_ar", width: 26 },
        { header: "code", key: "code", width: 18 },
        { header: "description", key: "description", width: 30 },
        { header: "description_ar", key: "description_ar", width: 30 },
        { header: "type", key: "type", width: 16 },
        { header: "parent_department", key: "parent_department", width: 26 },
        { header: "locations", key: "locations", width: 28 },
        { header: "classifications", key: "classifications", width: 28 },
        { header: "roles", key: "roles", width: 28 },
        { header: "sort_order", key: "sort_order", width: 12 },
        { header: "is_active", key: "is_active", width: 12 },
      ];

      const allDepartments =
        typeof selectedIds === "undefined" ? flattenDepartments(list) : list;
      const nameById = new Map<string, string>();
      allDepartments.forEach((dept) => nameById.set(dept.id, dept.name));

      allDepartments.forEach((dept) => {
        worksheet.addRow({
          name: dept.name,
          name_ar: dept.name_ar || "",
          code: dept.code,
          description: dept.description || "",
          description_ar: dept.description_ar || "",
          type: dept.type,
          parent_department: dept.parent_id
            ? nameById.get(dept.parent_id) || ""
            : "",
          locations: dept.locations?.map((loc) => loc.name).join(", ") || "",
          classifications:
            dept.classifications?.map((cls) => cls.name).join(", ") || "",
          roles: dept.roles?.map((role) => role.name).join(", ") || "",
          sort_order: dept.sort_order,
          is_active: dept.is_active ? "Yes" : "No",
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(
        blob,
        `departments_export_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
      if (selectedIds?.length) {
        setIsExportModalOpen(false);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJs.Workbook();
    const worksheet = workbook.addWorksheet("Departments");

    worksheet.columns = [
      { header: "name (Required)", key: "name", width: 26 },
      { header: "name_ar (Optional)", key: "name_ar", width: 26 },
      ...(isEPM940
        ? []
        : [{ header: "code (Required)", key: "code", width: 18 }]),
      { header: "description (Optional)", key: "description", width: 30 },
      { header: "description_ar (Optional)", key: "description_ar", width: 30 },
      { header: "type (Optional)", key: "type", width: 16 },
      {
        header: "parent_department (Optional)",
        key: "parent_department",
        width: 26,
      },
      { header: "locations (Optional)", key: "locations", width: 28 },
      {
        header: "classifications (Optional)",
        key: "classifications",
        width: 28,
      },
      { header: "roles (Optional)", key: "roles", width: 28 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "departments_import_template.xlsx");
  };

  const handleImportFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith(".json") && !name.endsWith(".xlsx")) {
      toast.error("Please select a valid JSON (.json) or Excel (.xlsx) file.");
      event.target.value = "";
      setImportFile(null);
      return;
    }

    setImportFile(file);
    setIsImportModalOpen(true);
    event.target.value = "";
  };

  const closeImportModal = () => {
    if (isImporting) return;
    setIsImportModalOpen(false);
    setImportFile(null);
  };

  const handleImport = async () => {
    if (!importFile) return;

    try {
      setIsImporting(true);

      if (!importFile.name.toLowerCase().endsWith(".xlsx")) {
        const result = await departmentApi.import(importFile);
        setImportResult(result.data || null);
        queryClient.invalidateQueries({ queryKey: ["admin", "departments"] });
        setIsImportModalOpen(false);
        setImportFile(null);
        return;
      }

      const arrayBuffer = await importFile.arrayBuffer();
      const workbook = new ExcelJs.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        throw new Error("Worksheet not found");
      }

      const headers: string[] = [];
      worksheet.getRow(1).eachCell((cell) => headers.push(cell.text ?? ""));

      const rawRows: Record<string, string>[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
          obj[header] = row.getCell(index + 1).text || "";
        });
        rawRows.push(obj);
      });

      const normalizedRows = rawRows
        .filter((row) => !isImportMetadataRow(row))
        .map((row) => {
          const normalized: Record<string, string> = {};
          Object.entries(row).forEach(([key, value]) => {
            const normalizedKey = normalizeImportHeader(key);
            if (normalizedKey) {
              normalized[normalizedKey] = String(value ?? "");
            }
          });
          return normalized;
        });

      if (normalizedRows.length === 0) {
        setImportResult({
          imported: 0,
          skipped: 0,
          errors: [
            "No data found in file. Please ensure the file contains department records.",
          ],
        });
        return;
      }

      const errors: string[] = [];
      const validPayloads: Array<Record<string, unknown>> = [];
      const seenDepartmentNames = new Set<string>();
      const seenDepartmentCodes = new Set<string>();
      const existingDepartmentNames = new Set(
        (departmentsList?.data ?? []).map((dept: Department) =>
          dept.name.trim().toLowerCase(),
        ),
      );
      const existingDepartmentCodes = new Set(
        (departmentsList?.data ?? []).map((dept: Department) =>
          dept.code.trim().toLowerCase(),
        ),
      );

      normalizedRows.forEach((row, index) => {
        const rowNum = index + 1;
        const rowLabel = `Row ${rowNum}`;
        const name = String(row.name || "").trim();
        const code = String(row.code || "").trim();

        const nameError = validateDepartmentName(name);
        if (nameError) {
          errors.push(`${rowLabel}: ${nameError}`);
          return;
        }

        if (!isEPM940 && !code) {
          errors.push(`${rowLabel}: Code is required`);
          return;
        }

        if (
          existingDepartmentNames.has(name.toLowerCase()) ||
          seenDepartmentNames.has(name.toLowerCase())
        ) {
          errors.push(`${rowLabel}: Duplicate department name "${name}"`);
          return;
        }

        if (
          code &&
          (existingDepartmentCodes.has(code.toLowerCase()) ||
            seenDepartmentCodes.has(code.toLowerCase()))
        ) {
          errors.push(`${rowLabel}: Duplicate department code "${code}"`);
          return;
        }

        seenDepartmentNames.add(name.toLowerCase());
        if (code) seenDepartmentCodes.add(code.toLowerCase());

        const parentName = String(row.parent_department || "").trim();
        const parentMatch = !parentName
          ? undefined
          : departmentsList?.data?.find(
              (dept: Department) =>
                dept.name.trim().toLowerCase() === parentName.toLowerCase() ||
                dept.code.trim().toLowerCase() === parentName.toLowerCase(),
            );

        if (parentName && !parentMatch) {
          errors.push(
            `${rowLabel}: Parent department "${parentName}" was not found`,
          );
          return;
        }

        const locationResult = resolveImportRelationIds(
          row.locations,
          flattenTree(locationsData?.data ?? []),
          "Location",
        );
        const classificationResult = resolveImportRelationIds(
          row.classifications,
          flattenTree(classificationsData?.data ?? []),
          "Classification",
        );
        const roleResult = resolveImportRelationIds(
          row.roles,
          rolesData?.data ?? [],
          "Role",
        );

        const relationErrors = [
          ...locationResult.errors,
          ...classificationResult.errors,
          ...roleResult.errors,
        ];

        if (relationErrors.length > 0) {
          relationErrors.forEach((relationError) =>
            errors.push(`${rowLabel}: ${relationError}`),
          );
          return;
        }

        validPayloads.push({
          name: String(row.name || "").trim(),
          name_ar: String(row.name_ar || "").trim() || undefined,
          code: String(row.code || "").trim(),
          description: String(row.description || "").trim(),
          description_ar: String(row.description_ar || "").trim() || undefined,
          type: String(row.type || "internal").trim() as
            | "internal"
            | "external",
          parent_id: parentMatch?.id || undefined,
          location_ids: locationResult.ids,
          classification_ids: classificationResult.ids,
          role_ids: roleResult.ids,
        });
      });

      const skippedCount = normalizedRows.length - validPayloads.length;

      if (validPayloads.length === 0) {
        setImportResult({
          imported: 0,
          skipped: skippedCount,
          errors,
        });
        return;
      }

      const jsonBlob = new Blob([JSON.stringify(validPayloads, null, 2)], {
        type: "application/json",
      });
      const jsonFile = new File([jsonBlob], "departments_import.json", {
        type: "application/json",
      });

      const result = await departmentApi.import(jsonFile);
      const data = result.data as {
        imported: number;
        skipped: number;
        errors: string[];
      };

      setImportResult({
        imported: data.imported,
        skipped: data.skipped + skippedCount,
        errors: [...errors, ...(data.errors || [])],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "departments"] });
      setIsImportModalOpen(false);
      setImportFile(null);
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("Failed to import departments");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <Building2 className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {t("departments.title")}
            </h2>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">
            {t("departments.subtitle")}
          </p>
        </div>
      </div>

      {/* Department Tree */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden">
        {/* Header with Add Root Button */}
        <div className="px-6 py-4 bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.2)]">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                {t("departments.hierarchy")}
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {treeData?.data?.length || 0} {t("departments.rootDepartments")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
                {t("common.moreActions", { defaultValue: "More Actions" })}
              </Button>
              {isActionsMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[60]"
                    onClick={() => setIsActionsMenuOpen(false)}
                  />
                  <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-72 bg-[hsl(var(--card))] rounded-xl shadow-xl border border-[hsl(var(--border))] py-1.5 z-[70] animate-scale-in origin-top-right">
                    <button
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        openDepartmentExportModal();
                      }}
                      disabled={isExporting}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
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
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
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
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      {t("common.downloadExcelTemplate")}
                    </button>
                  </div>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={() => setIsImportModalOpen(true)}
            >
              {isImporting ? t("common.importing") : t("common.import")}
            </Button>
            {canCreateDepartment && (
              <button
                onClick={() => openCreateModal()}
                className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-primary to-accent text-[hsl(var(--primary-foreground))] rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-colors text-sm font-medium shadow-md shadow-[hsl(var(--primary)/0.25)]"
              >
                <Plus className="w-4 h-4" />
                {t("departments.addRootDepartment")}
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-[hsl(var(--border))]">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
            />
          </div>
        </div>

        {/* Tree Content */}
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[hsl(var(--muted-foreground))]">
              {t("departments.loading")}
            </p>
          </div>
        ) : treeData?.data?.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[hsl(var(--primary)/0.25)]">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
              {t("departments.noDepartmentsYet")}
            </h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              {t("departments.createFirstDepartment")}
            </p>
            {canCreateDepartment && (
              <Button
                onClick={() => openCreateModal()}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                {t("departments.createDepartment")}
              </Button>
            )}
          </div>
        ) : displayedTreeNodes.length === 0 && search ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-[hsl(var(--muted))] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
            </div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
              {t("departments.noSearchResults", {
                defaultValue: "No departments found",
              })}
            </h3>
            <p className="text-[hsl(var(--muted-foreground))]">
              {t("departments.tryDifferentSearch", {
                defaultValue: "Try a different search term",
              })}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {displayedTreeNodes.map((dept: Department) => (
              <TreeNode
                key={dept.id}
                department={dept}
                level={0}
                onView={handleViewDepartment}
                onAdd={openCreateModal}
                onEdit={openEditModal}
                onDelete={setDeleteConfirm}
                onToggleActive={(d) =>
                  toggleActiveMutation.mutate({
                    id: d.id,
                    isActive: !d.is_active,
                  })
                }
                canCreate={canCreateDepartment}
                canEdit={canEditDepartment}
                canDelete={canDeleteDepartment}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {isExportModalOpen && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-lg w-full animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
              <div>
                <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                  Select departments to export
                </h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                  By default, all departments are selected.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <HierarchicalTreeSelect
                data={treeData?.data ?? []}
                selectedIds={exportSelectedIds}
                onSelectionChange={setExportSelectedIds}
                colorScheme="primary"
                maxHeight="280px"
                leafOnly={false}
                hierarchyType="department"
                label="Departments"
              />
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))]">
              <Button
                variant="ghost"
                onClick={() => setIsExportModalOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => handleExportExcel(exportSelectedIds)}
                disabled={exportSelectedIds.length === 0}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Export Excel
              </Button>
            </div>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl border border-[hsl(var(--border))] max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
                    <Upload className="w-5 h-5 text-[hsl(var(--primary))]" />
                  </div>
                  <h3 className="text-xl font-bold text-[hsl(var(--foreground))]">
                    Import Departments
                  </h3>
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 ml-11">
                  Upload a JSON (.json) or Excel (.xlsx) file to import
                  departments
                </p>
              </div>
              <button
                type="button"
                onClick={closeImportModal}
                disabled={isImporting}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors disabled:opacity-50"
                aria-label={t("common.close")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  Select JSON (.json) or Excel (.xlsx) file
                </label>
                <label
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all",
                    "bg-[hsl(var(--background))] border-[hsl(var(--border))]",
                    isImporting
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer hover:border-[hsl(var(--primary))]",
                  )}
                >
                  <span className="px-4 py-2 rounded-lg text-sm font-medium bg-[hsl(var(--primary))] text-white whitespace-nowrap">
                    {t("common.chooseFile")}
                  </span>
                  <span className="text-sm text-[hsl(var(--muted-foreground))] truncate">
                    {importFile ? importFile.name : t("common.noFileChosen")}
                  </span>
                  <input
                    type="file"
                    accept=".json,.xlsx,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleImportFileChange}
                    disabled={isImporting}
                    className="hidden"
                  />
                </label>
                {importFile && (
                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                    {t("common.selected")}: {importFile.name} (
                    {(importFile.size / 1024).toFixed(2)} {t("common.kb")})
                  </p>
                )}
              </div>

              <div className="p-4 bg-[hsl(var(--muted)/0.5)] rounded-xl">
                <div className="flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">
                    <p className="font-medium text-[hsl(var(--foreground))] mb-1">
                      {t("common.importNotes")}
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Valid JSON (.json) or Excel (.xlsx) file required</li>
                      <li>
                        Rows that fail validation are skipped and listed after
                        import
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <Button
                variant="ghost"
                onClick={closeImportModal}
                disabled={isImporting}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleImport}
                disabled={!importFile}
                isLoading={isImporting}
                leftIcon={
                  !isImporting ? <Upload className="w-4 h-4" /> : undefined
                }
              >
                {isImporting ? t("common.importing") : "Import Departments"}
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
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {t("goals.components.import.completedHeading")}
                  </h3>
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      <span className="font-medium text-[hsl(var(--success))]">
                        {importResult.imported}
                      </span>{" "}
                      {t("departments.departmentsImportedSuccessfully")}
                    </p>
                    {importResult.skipped > 0 && (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        <span className="font-medium text-[hsl(var(--warning))]">
                          {importResult.skipped}
                        </span>{" "}
                        {t("departments.departmentsSkipped")}
                      </p>
                    )}
                    {importResult.errors.length > 0 && (
                      <div className="mt-3 max-h-40 overflow-y-auto">
                        <p className="text-xs font-medium text-[hsl(var(--destructive))] mb-2">
                          {t("departments.errors")}
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
                    {t("departments.deleteConfirmTitle")}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    {t("departments.deleteConfirmMessage")}
                  </p>
                </div>
              </div>
              {deleteError && (
                <div className="mt-3 mb-4 rounded-md border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.1)] px-4 py-3 text-sm font-medium text-[hsl(var(--destructive))]">
                  {deleteError}
                </div>
              )}
              {!deleteError ? (
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setDeleteConfirm(null)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(deleteConfirm)}
                    isLoading={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending
                      ? t("departments.deleting")
                      : t("departments.deleteDepartment")}
                  </Button>
                </div>
              ) : (
                <div className="flex justify-end mt-6 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteConfirm(null);
                      setDeleteError(null);
                    }}
                  >
                    {t("common.close")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.25)]">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {editingDepartment
                      ? t("departments.editDepartment")
                      : t("departments.createDepartment")}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {editingDepartment
                      ? t("departments.updateDetails")
                      : formData.parent_name
                        ? `${t("departments.addingUnder")} "${formData.parent_name}"`
                        : t("departments.addNewRoot")}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab bar — edit mode only */}
            {editingDepartment && (
              <div className="flex border-b border-[hsl(var(--border))] px-6">
                <button
                  type="button"
                  onClick={() => setModalTab("details")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                    modalTab === "details"
                      ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                      : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                  )}
                >
                  <Building2 className="w-4 h-4" />
                  {t("incidents.details")}
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab("users")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                    modalTab === "users"
                      ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                      : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                  )}
                >
                  <UsersIcon className="w-4 h-4" />
                  {t("departments.users")}
                  {deptUsersData?.data && (
                    <span className="px-1.5 py-0.5 text-xs font-semibold bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded">
                      {(deptUsersData.data as unknown as User[]).length}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Modal Body */}
            <form
              onSubmit={handleSubmit}
              className="overflow-y-auto max-h-[calc(90vh-140px)]"
            >
              {/* ── Users tab ── */}
              {modalTab === "users" && editingDepartment && (
                <div className="p-6 space-y-4">
                  {/* Search to add */}
                  <div>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <input
                        type="text"
                        placeholder={t("roles.searchUsersToAdd")}
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                      />
                      {userSearchFetching && (
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    {userSearchTerm.trim().length >= 2 && (
                      <div className="mt-2 border border-[hsl(var(--border))] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                        {!userSearchFetching &&
                        userSearchResults.length === 0 ? (
                          <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-5">
                            {t("users.noUsers")}
                          </p>
                        ) : (
                          userSearchResults.map((user: User) => (
                            <div
                              key={user.id}
                              className="flex items-center gap-3 px-4 py-2.5 border-b border-[hsl(var(--border))] last:border-b-0 hover:bg-[hsl(var(--muted)/0.4)] transition-colors"
                            >
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt={user.username}
                                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-[hsl(var(--border))] flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-semibold text-white">
                                    {user.first_name?.[0] || user.username[0]}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
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
                                onClick={() =>
                                  addUserToDeptMutation.mutate({ user })
                                }
                                disabled={addUserToDeptMutation.isPending}
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
                    <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                    <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      {t("departments.currentMembers")}
                      {
                        ((deptUsersData?.data as unknown as User[]) ?? [])
                          .length
                      }
                      )
                    </span>
                    <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                  </div>

                  {/* Members list */}
                  {deptUsersLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 rounded-xl border border-[hsl(var(--border))] animate-pulse"
                        >
                          <div className="w-9 h-9 rounded-lg bg-[hsl(var(--muted))]" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 bg-[hsl(var(--muted))] rounded w-1/3" />
                            <div className="h-3 bg-[hsl(var(--muted))] rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !((deptUsersData?.data as unknown as User[]) ?? [])
                      .length ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-10 h-10 rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center mb-2">
                        <UsersIcon className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                      </div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {t("roles.noUsersAssignedYet")}
                      </p>
                    </div>
                  ) : (
                    <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                      {(deptUsersData!.data as unknown as User[]).map(
                        (user: User) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))] last:border-b-0 hover:bg-[hsl(var(--muted)/0.4)] transition-colors group"
                          >
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.username}
                                className="w-9 h-9 rounded-lg object-cover ring-1 ring-[hsl(var(--border))] flex-shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-semibold text-white">
                                  {user.first_name?.[0] || user.username[0]}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
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
                                  : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
                              )}
                            >
                              {user.is_active ? "Active" : "Inactive"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                removeUserFromDeptMutation.mutate({ user })
                              }
                              disabled={removeUserFromDeptMutation.isPending}
                              title={t("departments.removeFromDepartment")}
                              className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 disabled:opacity-50"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* ── Details tab (and create mode) ── */}
              {(modalTab === "details" || !editingDepartment) && (
                <div className="p-6 space-y-5">
                  {/* Parent Info Banner (when adding child) */}
                  {!editingDepartment && formData.parent_name && (
                    <div className="flex items-center gap-3 p-3 bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.2)] rounded-xl">
                      <Building2 className="w-5 h-5 text-[hsl(var(--primary))]" />
                      <div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {t("departments.parentDepartment")}
                        </p>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                          {formData.parent_name}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                        {t("departments.name")}
                        <span className="text-[hsl(var(--destructive))] ml-1">
                          *
                        </span>
                      </label>
                      <input
                        type="text"
                        placeholder={t("departments.namePlaceholder")}
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (errors.name) {
                            setErrors({ ...errors, name: "" });
                          }
                        }}
                        className={`w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all  ${
                          errors.name
                            ? "border-[hsl(var(--destructive))]"
                            : "border-slate-300 dark:border-slate-600"
                        }`}
                        // required
                      />
                      {errors.name && (
                        <p className="mt-1 text-xs text-[hsl(var(--destructive))]">
                          {errors.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                        {t("departments.nameAr", "Name (Arabic)")}
                      </label>
                      <input
                        type="text"
                        dir="rtl"
                        placeholder="الاسم بالعربية"
                        value={formData.name_ar}
                        onChange={(e) => {
                          setFormData({ ...formData, name_ar: e.target.value });

                          if (errors.name_ar) {
                            setErrors((prev) => ({
                              ...prev,
                              name_ar: "",
                            }));
                          }
                        }}
                        // className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                        className={`w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all  ${
                          errors.name_ar
                            ? "border-[hsl(var(--destructive))]"
                            : "border-slate-300 dark:border-slate-600"
                        }`}
                      />

                      {errors.name_ar && (
                        <p className="mt-1 text-xs text-[hsl(var(--destructive))]">
                          {errors.name_ar}
                        </p>
                      )}
                    </div>
                  </div>
                  {!isEPM940 && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                          {t("departments.code")}
                          <span className="text-[hsl(var(--destructive))] ml-1">
                            *
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder={t("departments.codePlaceholder")}
                          value={formData.code}
                          onChange={(e) => {
                            setFormData({ ...formData, code: e.target.value });

                            if (errors.code) {
                              setErrors((prev) => ({
                                ...prev,
                                code: "",
                              }));
                            }
                          }}
                          // className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                          className={`w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all  ${
                            errors.code
                              ? "border-[hsl(var(--destructive))]"
                              : "border-slate-300 dark:border-slate-600"
                          }`}
                          // required
                        />
                        {errors.code && (
                          <p className="mt-1 text-xs text-[hsl(var(--destructive))]">
                            {errors.code}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Department Type */}
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("departments.type")}
                    </label>
                    <div className="flex gap-3">
                      {(["internal", "external"] as const).map((t_) => (
                        <button
                          key={t_}
                          type="button"
                          onClick={() => setFormData({ ...formData, type: t_ })}
                          className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                            formData.type === t_
                              ? t_ === "internal"
                                ? "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]"
                                : "bg-amber-500 text-white border-amber-500"
                              : "bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]"
                          }`}
                        >
                          {t_ === "internal"
                            ? t("departments.typeInternal")
                            : t("departments.typeExternal")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Only show parent selector when editing */}
                  {editingDepartment && (
                    <div>
                      <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                        {t("departments.parentDepartment")}
                      </label>
                      <select
                        value={formData.parent_id}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            parent_id: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                      >
                        <option value="">
                          {t("departments.noneRootLevel")}
                        </option>
                        {departmentsList?.data
                          ?.filter(
                            (d: Department) => d.id !== editingDepartment?.id,
                          )
                          .map((dept: Department) => (
                            <option key={dept.id} value={dept.id}>
                              {i18n.language === "ar" && dept.name_ar
                                ? dept.name_ar
                                : dept.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                        {t("departments.description")}
                      </label>
                      <textarea
                        placeholder={t("departments.descriptionPlaceholder")}
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        rows={2}
                        className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                        {t("departments.descriptionAr", "Description (Arabic)")}
                      </label>
                      <textarea
                        dir="rtl"
                        placeholder="الوصف بالعربية"
                        value={formData.description_ar}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description_ar: e.target.value,
                          })
                        }
                        rows={2}
                        className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* Locations */}
                  <div>
                    <HierarchicalTreeSelect
                      data={locationsData?.data || []}
                      selectedIds={formData.location_ids}
                      onSelectionChange={(ids) =>
                        setFormData((prev) => ({
                          ...prev,
                          location_ids: ids,
                        }))
                      }
                      label={t("departments.locations")}
                      icon={
                        <MapPin className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      }
                      emptyMessage={t("departments.noLocationsAvailable")}
                      colorScheme="primary"
                      maxHeight="192px"
                    />
                  </div>

                  {/* Classifications */}
                  <div>
                    <HierarchicalTreeSelect
                      data={classificationsData?.data || []}
                      selectedIds={formData.classification_ids}
                      onSelectionChange={(ids) =>
                        setFormData((prev) => ({
                          ...prev,
                          classification_ids: ids,
                        }))
                      }
                      label={t("departments.classifications")}
                      icon={
                        <FolderTree className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      }
                      emptyMessage={t("departments.noClassificationsAvailable")}
                      colorScheme="accent"
                      maxHeight="192px"
                      hierarchyType="classification"
                    />
                  </div>

                  {/* Roles */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {t("departments.defaultRoles")}
                      </label>
                      <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] rounded-md">
                        {formData.role_ids.length}{" "}
                        {t("common.selected").toLowerCase()}
                      </span>
                      <div className="ml-auto flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            selectAll(
                              "role_ids",
                              (rolesData?.data || []).map((r: Role) => r.id),
                            )
                          }
                          className="text-xs text-[hsl(var(--primary))] hover:underline"
                        >
                          {t("common.selectAll")}
                        </button>
                        <span className="text-[hsl(var(--muted-foreground))]">
                          ·
                        </span>
                        <button
                          type="button"
                          onClick={() => clearAll("role_ids")}
                          className="text-xs text-[hsl(var(--muted-foreground))] hover:underline"
                        >
                          {t("common.clear")}
                        </button>
                      </div>
                    </div>
                    <div className="border border-[hsl(var(--border))] rounded-xl max-h-48 overflow-y-auto p-3">
                      <div className="flex flex-col gap-1">
                        {rolesData?.data?.length === 0 ? (
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">
                            {t("departments.noRolesAvailable")}
                          </p>
                        ) : (
                          rolesData?.data?.map((role: Role) => (
                            <label
                              key={role.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[hsl(var(--muted)/0.5)] cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={formData.role_ids.includes(role.id)}
                                onChange={() => toggleItem("role_ids", role.id)}
                                className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] accent-[hsl(var(--primary))]"
                              />
                              <span className="text-sm text-[hsl(var(--foreground))] flex items-center gap-1">
                                {role.is_department_manager && (
                                  <Crown className="w-3.5 h-3.5 text-indigo-500" />
                                )}
                                {role.name}
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}{" "}
              {error ? (
                <div className="p-4 bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive))] rounded-xl mx-6 mb-4">
                  <p className="text-sm text-[hsl(var(--destructive))]">
                    {error}
                  </p>
                </div>
              ) : null}
              {/* end details tab */}
              {/* Modal Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
                <Button variant="ghost" type="button" onClick={closeModal}>
                  {t("common.cancel")}
                </Button>
                {(modalTab === "details" || !editingDepartment) && (
                  <Button
                    type="submit"
                    isLoading={
                      createMutation.isPending || updateMutation.isPending
                    }
                    leftIcon={
                      !(
                        createMutation.isPending || updateMutation.isPending
                      ) ? (
                        <Check className="w-4 h-4" />
                      ) : undefined
                    }
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? t("departments.saving")
                      : editingDepartment
                        ? t("common.update")
                        : t("common.create")}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
