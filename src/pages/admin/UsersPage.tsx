import React, { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Mail,
  Shield,
  Building2,
  Filter,
  Download,
  RefreshCw,
  Plus,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Users as UsersIcon,
  X,
  Check,
  MapPin,
  Upload,
  Info,
  Phone,
  AlertTriangle,
  Key,
  EyeOff,
  ChevronDown,
  FileSpreadsheet,
} from "lucide-react";
import {
  Button,
  HierarchicalTreeSelect,
  PasswordChecklist,
  getPasswordRequirements,
  type TreeNode,
} from "../../components/ui";
import {
  userApi,
  departmentApi,
  locationApi,
  roleApi,
  classificationApi,
} from "../../api/admin";
import { ldapApi } from "../../api/ldap";
import { toast } from "sonner";
import type { User, Role, UpdateProfileRequest } from "../../types";
import type { LDAPUserListItem } from "../../api/ldap";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { FolderTree } from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";
import i18n from "@/i18n";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";

interface UserFormData {
  first_name: string;
  last_name: string;
  username: string;
  phone: string;
  extension: string;
  department_id: string;
  location_id: string;
  department_ids: string[];
  location_ids: string[];
  classification_ids: string[];
  role_ids: string[];
  is_active: boolean;
}

type UserFieldErrors = Partial<
  Record<"email" | "username" | "password" | "phone" | "form", string>
>;

const USER_PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

interface UserImportResult {
  imported: number;
  skipped: number;
  total?: number;
  errors: string[];
  note?: string;
  failed?: unknown[];
  failed_records?: unknown[];
}

const initialFormData: UserFormData = {
  first_name: "",
  last_name: "",
  username: "",
  phone: "",
  extension: "",
  department_id: "",
  location_id: "",
  department_ids: [],
  location_ids: [],
  classification_ids: [],
  role_ids: [],
  is_active: true,
};

export const UsersPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [page, setPage] = useState(1);

  const canCreateUser = isSuperAdmin || hasPermission(PERMISSIONS.USERS_CREATE);
  const canUpdateUser = isSuperAdmin || hasPermission(PERMISSIONS.USERS_UPDATE);
  const [search, setSearch] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterRoleIds, setFilterRoleIds] = useState<string[]>([]);
  const [filterDepartmentIds, setFilterDepartmentIds] = useState<string[]>([]);
  const [filterLocationIds, setFilterLocationIds] = useState<string[]>([]);
  const [filterClassificationIds, setFilterClassificationIds] = useState<
    string[]
  >([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    right: number;
    left: number;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isADModalOpen, setIsADModalOpen] = useState(false);
  const [adUsers, setAdUsers] = useState<LDAPUserListItem[]>([]);
  const [adUsersLoading, setAdUsersLoading] = useState(false);
  const [adSearchQuery, setAdSearchQuery] = useState("");
  const [adRegistering, setAdRegistering] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<UserFieldErrors>({});
  const [createFormData, setCreateFormData] = useState({
    email: "",
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    extension: "",
    department_id: "",
    location_id: "",
    department_ids: [] as string[],
    location_ids: [] as string[],
    classification_ids: [] as string[],
    role_ids: [] as string[],
  });
  const [createFormErrors, setCreateFormErrors] = useState<UserFieldErrors>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<UserImportResult | null>(
    null,
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const limit = 10;

  const [deptSearch, setDeptSearch] = useState("");
  const [locSearch, setLocSearch] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] =
    useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordRequirementLabels = useMemo(
    () => ({
      minLength: t("users.passwordRequirementMinLength"),
      uppercase: t("users.passwordRequirementUppercase"),
      lowercase: t("users.passwordRequirementLowercase"),
      number: t("users.passwordRequirementNumber"),
      specialChar: t("users.passwordRequirementSpecialChar"),
    }),
    [t],
  );

  const passwordRequirements = useMemo(
    () =>
      getPasswordRequirements(
        createFormData.password,
        passwordRequirementLabels,
      ),
    [createFormData.password, passwordRequirementLabels],
  );

  const isCreatePasswordValid = passwordRequirements.every(
    (requirement) => requirement.valid,
  );

  const adminResetPasswordRequirements = useMemo(
    () => getPasswordRequirements(newPassword, passwordRequirementLabels),
    [newPassword, passwordRequirementLabels],
  );

  const isAdminResetPasswordValid = adminResetPasswordRequirements.every(
    (requirement) => requirement.valid,
  );
  const doAdminResetPasswordsMatch =
    newPassword === confirmPassword && confirmPassword.length > 0;

  const filterTreeNodes = useCallback(
    (nodes: TreeNode[], search: string): TreeNode[] => {
      if (!search) return nodes;
      return nodes.reduce<TreeNode[]>((acc, node) => {
        if (node.name.toLowerCase().includes(search.toLowerCase())) {
          acc.push(node);
        } else {
          const filteredChildren = filterTreeNodes(node.children ?? [], search);
          if (filteredChildren.length > 0)
            acc.push({ ...node, children: filteredChildren });
        }
        return acc;
      }, []);
    },
    [],
  );

  const flattenTree = useCallback(
    (
      nodes: TreeNode[],
      map: Record<string, string> = {},
    ): Record<string, string> => {
      for (const node of nodes) {
        map[node.id] = node.name;
        if (node.children) flattenTree(node.children, map);
      }
      return map;
    },
    [],
  );

  const activeFilterCount =
    filterRoleIds.length +
    filterDepartmentIds.length +
    filterLocationIds.length +
    filterClassificationIds.length;

  const clearAllFilters = () => {
    setFilterRoleIds([]);
    setFilterDepartmentIds([]);
    setFilterLocationIds([]);
    setFilterClassificationIds([]);
    setPage(1);
  };

  const toggleRoleId = (id: string) => {
    setFilterRoleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setPage(1);
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: [
      "admin",
      "users",
      page,
      limit,
      search,
      filterRoleIds,
      filterDepartmentIds,
      filterLocationIds,
      filterClassificationIds,
    ],
    queryFn: () =>
      userApi.list(
        page,
        limit,
        search,
        filterRoleIds,
        filterDepartmentIds,
        filterLocationIds,
        filterClassificationIds,
      ),
  });

  const { data: departmentsTreeData } = useQuery({
    queryKey: ["admin", "departments", "tree"],
    queryFn: () => departmentApi.getTree(),
  });

  const { data: locationsTreeData } = useQuery({
    queryKey: ["admin", "locations", "tree"],
    queryFn: () => locationApi.getTree(),
  });

  const { data: rolesData } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => roleApi.list(),
  });

  const { data: classificationsTreeData } = useQuery({
    queryKey: ["admin", "classifications", "tree"],
    queryFn: () => classificationApi.getTree(),
  });

  // Transform tree data to TreeNode format
  const transformToTreeNodes = useCallback((data: unknown[]): TreeNode[] => {
    return (data || []).map((item: unknown) => {
      const node = item as { id: string; name: string; children?: unknown[] };
      return {
        id: node.id,
        name: node.name,
        children: node.children
          ? transformToTreeNodes(node.children)
          : undefined,
      };
    });
  }, []);

  const departmentsTree = useMemo(
    () => transformToTreeNodes(departmentsTreeData?.data || []),
    [departmentsTreeData?.data, transformToTreeNodes],
  );
  const locationsTree = useMemo(
    () => transformToTreeNodes(locationsTreeData?.data || []),
    [locationsTreeData?.data, transformToTreeNodes],
  );
  const classificationsTree = useMemo(
    () => transformToTreeNodes(classificationsTreeData?.data || []),
    [classificationsTreeData?.data, transformToTreeNodes],
  );

  const filteredDepartmentsTree = useMemo(
    () => filterTreeNodes(departmentsTree, deptSearch),
    [departmentsTree, deptSearch, filterTreeNodes],
  );
  const filteredLocationsTree = useMemo(
    () => filterTreeNodes(locationsTree, locSearch),
    [locationsTree, locSearch, filterTreeNodes],
  );
  const filteredClassificationsTree = useMemo(
    () => filterTreeNodes(classificationsTree, classSearch),
    [classificationsTree, classSearch, filterTreeNodes],
  );

  const departmentNameMap = useMemo(
    () => flattenTree(departmentsTree),
    [departmentsTree, flattenTree],
  );
  const locationNameMap = useMemo(
    () => flattenTree(locationsTree),
    [locationsTree, flattenTree],
  );
  const classificationNameMap = useMemo(
    () => flattenTree(classificationsTree),
    [classificationsTree, flattenTree],
  );
  const roleNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    const roles = (rolesData?.data || []) as Array<{
      id: string;
      name: string;
    }>;
    for (const r of roles) map[r.id] = r.name;
    return map;
  }, [rolesData?.data]);

  // Handle dropdown positioning
  const handleDropdownToggle = useCallback(
    (userId: string) => {
      if (activeDropdown === userId) {
        setActiveDropdown(null);
        setDropdownPosition(null);
      } else {
        const button = document.getElementById(`action-btn-${userId}`);
        if (button) {
          const rect = button.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + 4,
            right: window.innerWidth - rect.right,
            left: rect.left,
          });
        }
        setActiveDropdown(userId);
      }
    },
    [activeDropdown],
  );

  const closeDropdown = useCallback(() => {
    setActiveDropdown(null);
    setDropdownPosition(null);
  }, []);

  const getApiErrorMessage = useCallback(
    (error: any, fallback: string) =>
      error.response?.data?.error || error.message || fallback,
    [],
  );

  const getApiFieldErrors = useCallback((message: string): UserFieldErrors => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("email")) {
      return { email: message };
    }

    if (lowerMessage.includes("user")) {
      return { username: message };
    }

    if (lowerMessage.includes("password")) {
      return { password: message };
    }

    if (lowerMessage.includes("phone")) {
      return { phone: message };
    }

    return { form: message };
  }, []);

  const getInputClassName = useCallback(
    (hasError?: boolean, extraClassName = "") =>
      cn(
        "w-full px-4 py-2.5 bg-[hsl(var(--background))] border rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all",
        hasError
          ? "border-[hsl(var(--destructive))]"
          : "border-[hsl(var(--border))]",
        extraClassName,
      ),
    [],
  );

  const renderFieldError = (message?: string) =>
    message ? (
      <p className="mt-1 text-xs font-medium text-[hsl(var(--destructive))]">
        {message}
      </p>
    ) : null;

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProfileRequest }) =>
      userApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(t("users.userUpdatedSuccessfully"));
      closeModal();
    },
    onError: (error: any) => {
      const errorMessage = getApiErrorMessage(error, t("users.updateFailed"));
      setFormErrors(getApiFieldErrors(errorMessage));
    },
  });

  const createMutation = useMutation({
    mutationFn: (params: { data: typeof createFormData; avatar?: File }) =>
      userApi.create(params.data, params.avatar),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(t("users.userCreatedSuccessfully"));
      closeCreateModal();
    },
    onError: (error: any) => {
      const errorMessage = getApiErrorMessage(error, t("users.createFailed"));
      setCreateFormErrors(getApiFieldErrors(errorMessage));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setDeleteLoading(false);
      setShowDeleteConfirmation(false);
      toast.success(t("users.userDeletedSuccessfully"));
      closeDropdown();
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.error || error.message || t("users.deleteFailed");
      setDeleteLoading(false);
      setShowDeleteConfirmation(false);
      toast.error(t("common.error"), {
        description: errorMessage,
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      userApi.adminPasswordReset(id, newPassword),
    onSuccess: () => {
      toast.success(
        t("users.passwordResetSuccessfully", {
          defaultValue: "Password reset successfully",
        }),
      );
      setShowPasswordForm(false);
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.error ||
          t("users.passwordResetFailed", {
            defaultValue: "Failed to reset password",
          }),
      );
    },
  });

  const openCreateModal = () => {
    setCreateFormData({
      email: "",
      username: "",
      password: "",
      first_name: "",
      last_name: "",
      phone: "",
      extension: "",
      department_id: "",
      location_id: "",
      department_ids: [],
      location_ids: [],
      classification_ids: [],
      role_ids: [],
    });
    setAvatarFile(null);
    setAvatarPreview(null);
    setCreateFormErrors({});
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateFormData({
      email: "",
      username: "",
      password: "",
      first_name: "",
      last_name: "",
      phone: "",
      extension: "",
      department_id: "",
      location_id: "",
      department_ids: [],
      location_ids: [],
      classification_ids: [],
      role_ids: [],
    });
    setAvatarFile(null);
    setAvatarPreview(null);
    setCreateFormErrors({});
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: UserFieldErrors = {};

    if (!createFormData.email.trim()) {
      errors.email = t("validation.fieldRequired", {
        field: t("users.email"),
      });
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createFormData.email.trim())
    ) {
      errors.email = t("auth.invalidEmail");
    }

    if (!createFormData.username.trim()) {
      errors.username = t("validation.fieldRequired", {
        field: t("users.username"),
      });
    }

    if (!createFormData.password.trim()) {
      errors.password = t("validation.fieldRequired", {
        field: t("auth.password"),
      });
    } else if (!USER_PASSWORD_POLICY_REGEX.test(createFormData.password)) {
      errors.password = t("users.passwordPolicy");
    }

    setCreateFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    createMutation.mutate({
      data: createFormData,
      avatar: avatarFile || undefined,
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const toggleCreateRole = (roleId: string) => {
    setCreateFormData((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter((id) => id !== roleId)
        : [...prev.role_ids, roleId],
    }));
  };

  const openEditModal = (user: User) => {
    const classificationIds = user.classifications?.map((c) => c.id) || [];
    const locationIds = user.locations?.map((l) => l.id) || [];

    setEditingUser(user);
    setFormErrors({});
    setFormData({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      username: user.username,
      phone: user.phone || "",
      extension: (user as any).extension || "",
      department_id: user.department_id || "",
      location_id: user.location_id || "",
      department_ids: user.departments?.map((d) => d.id) || [],
      location_ids: locationIds,
      classification_ids: classificationIds,
      role_ids: user.roles?.map((r) => r.id) || [],
      is_active: user.is_active,
    });
    setIsModalOpen(true);
    setActiveDropdown(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData(initialFormData);
    setFormErrors({});
    setShowPasswordForm(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  const openViewModal = (user: User) => {
    setViewingUser(user);
    setIsViewModalOpen(true);
    closeDropdown();
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setViewingUser(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const errors: UserFieldErrors = {};

    if (!formData.username.trim()) {
      errors.username = t("validation.fieldRequired", {
        field: t("users.username"),
      });
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    let phoneChanged = false;
    if (editingUser.phone !== formData.phone) {
      phoneChanged = true;
    }
    const payload: UpdateProfileRequest = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      username: formData.username,
      mobile_verified: phoneChanged ? false : editingUser.mobile_verified,
      phone: formData.phone,
      extension: formData.extension || "",
      department_id: formData.department_id || undefined,
      location_id: formData.location_id || undefined,
      department_ids: formData.department_ids,
      location_ids: formData.location_ids,
      classification_ids: formData.classification_ids,
      role_ids: formData.role_ids,
      is_active: formData.is_active,
    } as any;

    updateMutation.mutate({ id: editingUser.id, data: payload });
  };

  const toggleRole = (roleId: string) => {
    setFormData((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter((id) => id !== roleId)
        : [...prev.role_ids, roleId],
    }));
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await userApi.export();
      const jsonText = await blob.text();
      const users = JSON.parse(jsonText);
      const resolveNames = (ids: unknown, map: Record<string, string>) =>
        ids instanceof Array
          ? ids
              .map((id: string) => map[id] || id)
              .filter(Boolean)
              .join(", ")
          : "";
      const rows = users.map((u: Record<string, unknown>) => [
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        resolveNames(u.department_ids, departmentNameMap),
        resolveNames(u.location_ids, locationNameMap),
        resolveNames(u.classification_ids, classificationNameMap),
        resolveNames(u.role_ids, roleNameMap),
        u.is_active ? "Yes" : "No",
        u.is_super_admin ? "Yes" : "No",
      ]);
      const ws = XLSX.utils.aoa_to_sheet([
        [
          "username",
          "email",
          "first_name",
          "last_name",
          "phone",
          "departments",
          "locations",
          "classifications",
          "roles",
          "is_active",
          "is_super_admin",
        ],
        ...rows,
      ]);
      ws["!cols"] = [
        { wch: 20 },
        { wch: 30 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 40 },
        { wch: 40 },
        { wch: 40 },
        { wch: 40 },
        { wch: 10 },
        { wch: 16 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Users");
      XLSX.writeFile(
        wb,
        `users_export_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJson = async () => {
    try {
      setIsExporting(true);
      const blob = await userApi.export();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `users_export_${new Date().toISOString().split("T")[0]}.json`;
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

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [
        "username",
        "email",
        "password",
        "first_name",
        "last_name",
        "phone",
        "extension",
      ],
      [
        "(Required)",
        "(Required)",
        "(Required)",
        "(Optional)",
        "(Optional)",
        "(Optional)",
        "(Optional)",
      ],
    ]);
    ws["!cols"] = [
      { wch: 20 },
      { wch: 30 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, "users_import_template.xlsx");
  };

  const closeImportModal = () => {
    if (isImporting) return;
    setIsImportModalOpen(false);
    setImportFile(null);
  };
  const handleConfirmDelete = () => {
    setDeleteLoading(true);
    const user = filteredUsers?.find((u: User) => u.id === activeDropdown);
    if (user) {
      deleteMutation.mutate(user.id);
    }
  };

  const handleImportFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      const name = file.name.toLowerCase();
      if (!name.endsWith(".json") && !name.endsWith(".xlsx")) {
        toast.error(
          t("users.validJsonOrExcelRequired", {
            defaultValue:
              "Please select a valid JSON (.json) or Excel (.xlsx) file",
          }),
        );
        event.target.value = "";
        setImportFile(null);
        return;
      }
    }
    setImportFile(file);
  };

  const validateImportRows = (
    rows: Array<{ username?: string; email?: string; password?: string }>,
  ): string[] => {
    const errors: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    const usernameSet = new Map<string, number[]>();
    const emailSet = new Map<string, number[]>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      const rowLabel = `Row ${rowNum}`;

      if (!row.username?.trim()) {
        errors.push(
          `${rowLabel}: ${t("users.importUsernameRequired", { defaultValue: "Username is required" })}`,
        );
      } else if (!usernameRegex.test(row.username.trim())) {
        errors.push(
          `${rowLabel}: "${row.username}" - ${t("auth.usernameInvalidChars", { defaultValue: "Username can only contain letters, numbers, and underscores" })}`,
        );
      }
      if (!row.password?.trim()) {
        errors.push(
          `${rowLabel}: ${t("users.importPasswordRequired", { defaultValue: "Password is required" })}`,
        );
      }
      if (!row.email?.trim()) {
        errors.push(
          `${rowLabel}: ${t("users.importEmailRequired", { defaultValue: "Email is required" })}`,
        );
      } else if (!emailRegex.test(row.email.trim())) {
        errors.push(
          `${rowLabel}: "${row.email}" - ${t("auth.invalidEmail", { defaultValue: "Invalid email format" })}`,
        );
      }

      if (row.username?.trim()) {
        const existing = usernameSet.get(row.username.trim()) || [];
        existing.push(rowNum);
        usernameSet.set(row.username.trim(), existing);
      }
      if (row.email?.trim()) {
        const existing = emailSet.get(row.email.trim()) || [];
        existing.push(rowNum);
        emailSet.set(row.email.trim(), existing);
      }
    }

    for (const [username, rows] of usernameSet) {
      if (rows.length > 1) {
        errors.push(
          t("users.importDuplicateUsername", {
            defaultValue: `Duplicate username "${username}" found in rows: ${rows.join(", ")}`,
          }),
        );
      }
    }
    for (const [email, rows] of emailSet) {
      if (rows.length > 1) {
        errors.push(
          t("users.importDuplicateEmail", {
            defaultValue: `Duplicate email "${email}" found in rows: ${rows.join(", ")}`,
          }),
        );
      }
    }

    return errors;
  };

  const handleImport = async () => {
    if (!importFile) return;
    try {
      setIsImporting(true);
      let jsonRows: Array<{
        username: string;
        email: string;
        first_name: string;
        last_name: string;
        phone: string;
        extension: string;
        is_active: boolean;
        is_super_admin: boolean;
      }>;

      if (importFile.name.toLowerCase().endsWith(".xlsx")) {
        const arrayBuffer = await importFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
        jsonRows = rows.map((row) => ({
          username: row.username || "",
          email: row.email || "",
          password: row.password || "",
          first_name: row.first_name || "",
          last_name: row.last_name || "",
          phone: row.phone || "",
          extension: row.extension || "",
          is_active: true,
          is_super_admin: false,
        }));
      } else {
        const text = await importFile.text();
        jsonRows = JSON.parse(text);
      }

      if (jsonRows.length === 0) {
        setImportResult({
          imported: 0,
          skipped: 0,
          total: 0,
          errors: [
            t("users.importEmptyFile", {
              defaultValue:
                "No data found in file. Please ensure the file contains user records.",
            }),
          ],
        } as UserImportResult);
        return;
      }

      const validationErrors = validateImportRows(jsonRows);
      const clientSkipped: string[] = [];

      const validRows = jsonRows.filter((row, i) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        const rowNum = i + 1;
        const rowErrors: string[] = [];

        if (!row.email?.trim() || !emailRegex.test(row.email.trim())) {
          rowErrors.push(
            `Row ${rowNum}: "${row.email || ""}" - Enter a valid email address`,
          );
        }
        if (!row.username?.trim() || !usernameRegex.test(row.username.trim())) {
          rowErrors.push(
            `Row ${rowNum}: "${row.username || ""}" - Invalid username`,
          );
        }
        if (!row.password?.trim()) {
          rowErrors.push(`Row ${rowNum}: Password is required`);
        }

        if (rowErrors.length > 0) {
          clientSkipped.push(...rowErrors);
          return false;
        }
        return true;
      });

      if (validRows.length === 0) {
        setImportResult({
          imported: 0,
          skipped: jsonRows.length,
          total: jsonRows.length,
          errors: validationErrors,
        } as UserImportResult);
        return;
      }

      const jsonBlob = new Blob([JSON.stringify(validRows, null, 2)], {
        type: "application/json",
      });
      const jsonFile = new File([jsonBlob], "users_import.json", {
        type: "application/json",
      });

      const result = await userApi.import(jsonFile);
      const data = result.data as UserImportResult;
      setImportResult({
        imported: data.imported,
        skipped: data.skipped + clientSkipped.length,
        total: jsonRows.length,
        errors: [...clientSkipped, ...data.errors],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setIsImportModalOpen(false);
      setImportFile(null);
    } catch (importError) {
      console.error("Import failed:", importError);
      toast.error(t("users.importFailed"));
    } finally {
      setIsImporting(false);
    }
  };

  const filteredUsers = data?.data;

  const totalPages = data?.total_pages ?? 1;

  if (error) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-[hsl(var(--destructive)/0.1)] rounded-2xl flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-[hsl(var(--destructive))]" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
            {t("users.failedToLoad")}
          </h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6 text-center max-w-sm">
            {t("users.errorLoading")}
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
              <UsersIcon className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {t("users.title")}
            </h1>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">
            {t("users.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<FileSpreadsheet className="w-4 h-4" />}
            onClick={handleExport}
            isLoading={isExporting}
          >
            {isExporting
              ? t("common.exporting")
              : t("users.exportExcel", { defaultValue: "Export Excel" })}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportJson}
            isLoading={isExporting}
          >
            {isExporting
              ? t("common.exporting")
              : t("users.exportJson", { defaultValue: "Export JSON" })}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<FileSpreadsheet className="w-4 h-4" />}
            onClick={handleDownloadTemplate}
          >
            {t("users.downloadTemplate", {
              defaultValue: "Download User Import Template",
            })}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => setIsImportModalOpen(true)}
          >
            {t("common.import")}
          </Button>
          {canCreateUser && (
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openCreateModal}
            >
              {t("users.addUser")}
            </Button>
          )}
          {canCreateUser && (
            <Button
              leftIcon={<Building2 className="w-4 h-4" />}
              onClick={async () => {
                setIsADModalOpen(true);
                setAdUsersLoading(true);
                setAdSearchQuery("");
                try {
                  const res = await ldapApi.fetchUsers();
                  if (res.success && res.data) {
                    setAdUsers(res.data);
                  }
                } catch {
                  toast.error("Failed to fetch Active Directory users");
                } finally {
                  setAdUsersLoading(false);
                }
              }}
              variant="outline"
            >
              {t("users.AddAdUser")}
            </Button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-5 h-5" />
            <input
              type="text"
              placeholder={t("users.searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-12 pr-4 py-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] focus:bg-[hsl(var(--background))] transition-all text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterOpen((v) => !v)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all",
                isFilterOpen || activeFilterCount > 0
                  ? "bg-[hsl(var(--primary)/0.1)] border-[hsl(var(--primary)/0.3)] text-[hsl(var(--primary))]"
                  : "bg-transparent border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]",
              )}
            >
              <Filter className="w-4 h-4" />
              {t("common.filter")}
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 text-xs font-bold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg border border-transparent transition-all"
              >
                <X className="w-3.5 h-3.5" />
                {t("common.clear")}
              </button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              isLoading={isFetching}
              leftIcon={
                !isFetching ? <RefreshCw className="w-4 h-4" /> : undefined
              }
            >
              {t("common.refresh")}
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        {isFilterOpen && (
          <div className="border-t border-[hsl(var(--border))] p-5 space-y-5">
            {/* Roles — flat chips */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> {t("users.roles")}
                  {filterRoleIds.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded">
                      {filterRoleIds.length}
                    </span>
                  )}
                </p>
                {filterRoleIds.length > 0 && (
                  <button
                    onClick={() => {
                      setFilterRoleIds([]);
                      setPage(1);
                    }}
                    className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                  >
                    {t("common.clear")}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {rolesData?.data?.map((role: Role) => (
                  <button
                    key={role.id}
                    onClick={() => toggleRoleId(role.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                      filterRoleIds.includes(role.id)
                        ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.3)]"
                        : "bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]",
                    )}
                  >
                    {filterRoleIds.includes(role.id) && (
                      <Check className="inline w-3 h-3 mr-1" />
                    )}
                    {role.name}
                  </button>
                ))}
                {!rolesData?.data?.length && (
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {t("users.noRolesAvailable")}
                  </span>
                )}
              </div>
            </div>

            {/* Tree selects — 3-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Departments */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />{" "}
                    {t("users.department")}
                    {filterDepartmentIds.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent-foreground))] rounded">
                        {filterDepartmentIds.length}
                      </span>
                    )}
                  </p>
                  {filterDepartmentIds.length > 0 && (
                    <button
                      onClick={() => {
                        setFilterDepartmentIds([]);
                        setPage(1);
                      }}
                      className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                    >
                      {t("common.clear")}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                  <input
                    type="text"
                    placeholder={t("incidents.searchDepartments")}
                    value={deptSearch}
                    onChange={(e) => setDeptSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary)/0.3)] focus:border-[hsl(var(--primary))] transition-all"
                  />
                </div>
                <HierarchicalTreeSelect
                  data={filteredDepartmentsTree}
                  selectedIds={filterDepartmentIds}
                  onSelectionChange={(ids) => {
                    setFilterDepartmentIds(ids);
                    setPage(1);
                  }}
                  emptyMessage="No departments found"
                  colorScheme="accent"
                  maxHeight="220px"
                />
              </div>

              {/* Locations */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> {t("users.location")}
                    {filterLocationIds.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-[hsl(var(--success)/0.2)] text-[hsl(var(--success))] rounded">
                        {filterLocationIds.length}
                      </span>
                    )}
                  </p>
                  {filterLocationIds.length > 0 && (
                    <button
                      onClick={() => {
                        setFilterLocationIds([]);
                        setPage(1);
                      }}
                      className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                    >
                      {t("common.clear")}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                  <input
                    type="text"
                    placeholder={t("users.searchLocations")}
                    value={locSearch}
                    onChange={(e) => setLocSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary)/0.3)] focus:border-[hsl(var(--primary))] transition-all"
                  />
                </div>
                <HierarchicalTreeSelect
                  data={filteredLocationsTree}
                  selectedIds={filterLocationIds}
                  onSelectionChange={(ids) => {
                    setFilterLocationIds(ids);
                    setPage(1);
                  }}
                  emptyMessage="No locations found"
                  colorScheme="success"
                  maxHeight="220px"
                />
              </div>

              {/* Classifications */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1.5">
                    <FolderTree className="w-3.5 h-3.5" />{" "}
                    {t("users.classifications")}
                    {filterClassificationIds.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))] rounded">
                        {filterClassificationIds.length}
                      </span>
                    )}
                  </p>
                  {filterClassificationIds.length > 0 && (
                    <button
                      onClick={() => {
                        setFilterClassificationIds([]);
                        setPage(1);
                      }}
                      className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                    >
                      {t("common.clear")}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                  <input
                    type="text"
                    placeholder={t("users.searchClassifications")}
                    value={classSearch}
                    onChange={(e) => setClassSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary)/0.3)] focus:border-[hsl(var(--primary))] transition-all"
                  />
                </div>
                <HierarchicalTreeSelect
                  data={filteredClassificationsTree}
                  selectedIds={filterClassificationIds}
                  onSelectionChange={(ids) => {
                    setFilterClassificationIds(ids);
                    setPage(1);
                  }}
                  emptyMessage="No classifications found"
                  colorScheme="warning"
                  maxHeight="220px"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[hsl(var(--primary)/0.1)] rounded-2xl mb-4">
              <div className="w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-[hsl(var(--muted-foreground))]">
              {t("users.loadingUsers")}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="px-6 py-4 text-start">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t("users.user")}
                      </span>
                    </th>
                    <th className="px-6 py-4 text-start">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t("users.email")}
                      </span>
                    </th>
                    <th className="px-6 py-4 text-start">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t("users.extension")}
                      </span>
                    </th>
                    <th className="px-6 py-4 text-start">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t("users.phone")}
                      </span>
                    </th>
                    <th className="px-6 py-4 text-start">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t("users.roles")}
                      </span>
                    </th>
                    <th className="px-6 py-4 text-start">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t("users.department")}
                      </span>
                    </th>
                    <th className="px-6 py-4 text-start">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t("users.location")}
                      </span>
                    </th>
                    <th className="px-6 py-4 text-start">
                      <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {t("users.status")}
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
                  {filteredUsers?.map((user: User) => (
                    <tr
                      key={user.id}
                      className="hover:bg-[hsl(var(--muted)/0.5)] transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.username}
                              className="w-10 h-10 rounded-xl object-cover ring-2 ring-[hsl(var(--border))]"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center ring-2 ring-[hsl(var(--primary)/0.2)]">
                              <span className="text-[hsl(var(--primary-foreground))] text-sm font-semibold">
                                {user.first_name?.[0] || user.username[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
                              {user.first_name} {user.last_name}
                              {user.is_ad_user && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full">
                                  <Building2 className="w-3 h-3" />
                                  AD
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">
                              @{user.username}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                          <span className="text-sm text-[hsl(var(--foreground))] truncate max-w-[200px]">
                            {user.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {(user as any).extension ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-lg">
                            <Phone className="w-3 h-3" />
                            Ext. {(user as any).extension}
                          </span>
                        ) : (
                          <span className="text-sm text-[hsl(var(--muted-foreground))]">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                            {/* the + sign goes to the end when changing to arabic so adding dir="ltr" */}
                            <span
                              dir="ltr"
                              className="text-sm text-[hsl(var(--foreground))]"
                            >
                              {user.phone}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-[hsl(var(--muted-foreground))]">
                            {t("users.noPhone")}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {user.is_super_admin && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg shadow-sm">
                              <Shield className="w-3 h-3" />
                              {t("profile.superAdmin")}
                            </span>
                          )}
                          {user.roles?.slice(0, 2).map((role) => (
                            <span
                              key={role.id}
                              className="px-2 py-1 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-lg"
                            >
                              {role.name}
                            </span>
                          ))}
                          {(user.roles?.length || 0) > 2 && (
                            <span className="px-2 py-1 text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-lg">
                              +{user.roles!.length - 2}
                            </span>
                          )}
                          {!user.is_super_admin &&
                            (!user.roles || user.roles.length === 0) && (
                              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                                {t("users.noRoles")}
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {user.departments && user.departments.length > 0 ? (
                            <>
                              {user.departments.slice(0, 2).map((dept) => (
                                <span
                                  key={dept.id}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[hsl(var(--accent)/0.1)] rounded-lg"
                                >
                                  <Building2 className="w-3 h-3" />
                                  {dept.name}
                                </span>
                              ))}
                              {user.departments.length > 2 && (
                                <span className="px-2 py-1 text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-lg">
                                  +{user.departments.length - 2}
                                </span>
                              )}
                            </>
                          ) : user.department ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs  bg-[hsl(var(--accent)/0.1)] rounded-lg">
                              <Building2 className="w-3 h-3" />
                              {user.department.name}
                            </span>
                          ) : (
                            <span className="text-sm text-[hsl(var(--muted-foreground))]">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {user.locations && user.locations.length > 0 ? (
                            <>
                              {user.locations.slice(0, 2).map((loc) => (
                                <span
                                  key={loc.id}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] rounded-lg"
                                >
                                  <MapPin className="w-3 h-3" />
                                  {loc.name}
                                </span>
                              ))}
                              {user.locations.length > 2 && (
                                <span className="px-2 py-1 text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-lg">
                                  +{user.locations.length - 2}
                                </span>
                              )}
                            </>
                          ) : user.location ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] rounded-lg">
                              <MapPin className="w-3 h-3" />
                              {user.location.name}
                            </span>
                          ) : (
                            <span className="text-sm text-[hsl(var(--muted-foreground))]">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t("users.active")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-full">
                            <XCircle className="w-3.5 h-3.5" />
                            {t("users.inactive")}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          id={`action-btn-${user.id}`}
                          onClick={() => handleDropdownToggle(user.id)}
                          className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
                        >
                          <MoreHorizontal className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[hsl(var(--muted)/0.3)]">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {t("common.showing")}{" "}
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {(page - 1) * limit + 1}
                </span>{" "}
                {t("users.to")}{" "}
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {Math.min(page * limit, data?.total_items || 0)}
                </span>{" "}
                {t("common.of")}{" "}
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {data?.total_items || 0}
                </span>{" "}
                {t("users.users")}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 rtl:-rotate-180" />
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
                            ? "bg-linear-to-br from-primary to-accent text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/0.3)]"
                            : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] hover:border-[hsl(var(--border))] border border-transparent",
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rtl:-rotate-180" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Dropdown - rendered as fixed portal */}
      {activeDropdown && dropdownPosition && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={closeDropdown} />
          <div
            className="fixed w-48 bg-[hsl(var(--card))] rounded-xl shadow-xl border border-[hsl(var(--border))] py-1.5 z-[70] animate-scale-in origin-top-right"
            style={{
              top: dropdownPosition.top,
              ...(i18n.language === "ar"
                ? { left: dropdownPosition.left }
                : { right: dropdownPosition.right }),
            }}
          >
            <button
              onClick={() => {
                const user = filteredUsers?.find(
                  (u: User) => u.id === activeDropdown,
                );
                if (user) {
                  openViewModal(user);
                }
              }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
            >
              <Eye className="w-4 h-4" />
              {t("users.viewDetails")}
            </button>
            <button
              onClick={() => {
                const user = filteredUsers?.find(
                  (u: User) => u.id === activeDropdown,
                );
                if (user) {
                  openEditModal(user);
                  closeDropdown();
                }
              }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              {t("users.editUser")}
            </button>
            <div className="my-1 border-t border-[hsl(var(--border))]" />
            <button
              onClick={() => {
                setShowDeleteConfirmation(true);
              }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t("users.deleteUser")}
            </button>
          </div>
        </>
      )}

      {/* Edit User Modal */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.25)]">
                  <UsersIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {t("users.editUser")}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {editingUser.email}
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

            {/* Modal Body */}
            <form
              onSubmit={handleSubmit}
              className="overflow-y-auto max-h-[calc(90vh-140px)]"
              noValidate
            >
              <div className="p-6 space-y-5">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("users.firstName")}
                    </label>
                    <input
                      type="text"
                      placeholder={t("users.firstNamePlaceholder")}
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                      className={getInputClassName()}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("users.lastName")}
                    </label>
                    <input
                      type="text"
                      placeholder={t("users.lastNamePlaceholder")}
                      value={formData.last_name}
                      onChange={(e) =>
                        setFormData({ ...formData, last_name: e.target.value })
                      }
                      className={getInputClassName()}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("users.username")}
                    </label>
                    <input
                      type="text"
                      placeholder={t("users.usernamePlaceholder")}
                      value={formData.username}
                      onChange={(e) => {
                        setFormData({ ...formData, username: e.target.value });
                        if (formErrors.username || formErrors.form) {
                          setFormErrors((prev) => ({
                            ...prev,
                            username: undefined,
                            form: undefined,
                          }));
                        }
                      }}
                      className={getInputClassName(
                        !!formErrors?.username,
                        "font-mono",
                      )}
                    />
                    {renderFieldError(formErrors?.username)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("users.phone")}
                    </label>
                    <input
                      type="text"
                      placeholder={t("users.phonePlaceholder")}
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className={getInputClassName(!!formErrors?.phone)}
                    />
                    {renderFieldError(formErrors?.phone)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t("users.extension")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("users.extensionPlaceholder")}
                    value={formData.extension}
                    onChange={(e) =>
                      setFormData({ ...formData, extension: e.target.value })
                    }
                    className={getInputClassName()}
                  />
                </div>

                {/* Password Reset */}
                {canUpdateUser && !editingUser?.is_ad_user && (
                  <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordForm(!showPasswordForm);
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        <span>
                          {t("users.resetPassword", {
                            defaultValue: "Reset Password",
                          })}
                        </span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-[hsl(var(--muted-foreground))] transition-transform",
                          showPasswordForm && "rotate-180",
                        )}
                      />
                    </button>
                    {showPasswordForm && (
                      <div className="px-4 pb-4 space-y-3 border-t border-[hsl(var(--border))] pt-3">
                        <div>
                          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                            {t("users.newPassword", {
                              defaultValue: "New Password",
                            })}
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              placeholder="••••••••"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full px-4 py-2.5 pr-10 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowNewPassword(!showNewPassword)
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                            >
                              {showNewPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                            {t("users.confirmPassword", {
                              defaultValue: "Confirm Password",
                            })}
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="••••••••"
                              value={confirmPassword}
                              onChange={(e) =>
                                setConfirmPassword(e.target.value)
                              }
                              className="w-full px-4 py-2.5 pr-10 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        {newPassword && (
                          <PasswordChecklist
                            requirements={adminResetPasswordRequirements}
                          />
                        )}
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              !isAdminResetPasswordValid ||
                              !doAdminResetPasswordsMatch ||
                              resetPasswordMutation.isPending
                            }
                            onClick={() => {
                              if (!newPassword) {
                                toast.error(
                                  t("users.passwordRequired", {
                                    defaultValue: "Password is required",
                                  }),
                                );
                                return;
                              }
                              if (!isAdminResetPasswordValid) {
                                toast.error(t("users.passwordPolicy"));
                                return;
                              }
                              if (newPassword !== confirmPassword) {
                                toast.error(
                                  t("users.passwordsDoNotMatch", {
                                    defaultValue: "Passwords do not match",
                                  }),
                                );
                                return;
                              }
                              resetPasswordMutation.mutate({
                                id: editingUser!.id,
                                newPassword,
                              });
                            }}
                            isLoading={resetPasswordMutation.isPending}
                            leftIcon={
                              !resetPasswordMutation.isPending ? (
                                <Key className="w-3.5 h-3.5" />
                              ) : undefined
                            }
                          >
                            {resetPasswordMutation.isPending
                              ? t("users.resetting", {
                                  defaultValue: "Resetting...",
                                })
                              : t("users.updatePassword", {
                                  defaultValue: "Update Password",
                                })}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Departments (Hierarchical Multi-select) */}
                <HierarchicalTreeSelect
                  data={departmentsTree}
                  selectedIds={formData.department_ids}
                  onSelectionChange={async (ids) => {
                    setFormData({ ...formData, department_ids: ids });

                    // Auto-populate classifications and locations from departments
                    try {
                      const allClassifications = new Set<string>();
                      const allLocations = new Set<string>();

                      for (const deptId of ids) {
                        const dept = await departmentApi.getById(deptId);
                        if (dept.success && dept.data) {
                          // Add department's classifications
                          dept.data.classifications?.forEach((c) =>
                            allClassifications.add(c.id),
                          );
                          // Add department's locations
                          dept.data.locations?.forEach((l) =>
                            allLocations.add(l.id),
                          );
                        }
                      }

                      setFormData((prev) => ({
                        ...prev,
                        department_ids: ids,
                        classification_ids: Array.from(allClassifications),
                        location_ids: Array.from(allLocations),
                      }));
                    } catch (error) {
                      console.error(
                        "Error fetching department details:",
                        error,
                      );
                      setFormData({ ...formData, department_ids: ids });
                    }
                  }}
                  label={t("users.departments")}
                  icon={
                    <Building2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  }
                  emptyMessage={t("users.noDepartmentsAvailable")}
                  colorScheme="accent"
                  maxHeight="180px"
                />

                {/* Locations (Hierarchical Multi-select) */}
                <HierarchicalTreeSelect
                  data={locationsTree}
                  selectedIds={formData.location_ids}
                  onSelectionChange={(ids) =>
                    setFormData({ ...formData, location_ids: ids })
                  }
                  label={t("users.locations")}
                  icon={
                    <MapPin className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  }
                  emptyMessage={t("users.noLocationsAvailable")}
                  colorScheme="success"
                  maxHeight="180px"
                />

                {/* Classifications (Hierarchical Multi-select) */}
                <HierarchicalTreeSelect
                  data={classificationsTree}
                  selectedIds={formData.classification_ids}
                  onSelectionChange={(ids) =>
                    setFormData({ ...formData, classification_ids: ids })
                  }
                  label={t("users.classifications")}
                  icon={
                    <FolderTree className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  }
                  emptyMessage={t("users.noClassificationsAvailable")}
                  colorScheme="warning"
                  maxHeight="180px"
                />

                {/* Roles */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {t("users.roles")}
                    </label>
                    <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-md">
                      {formData.role_ids.length} {t("common.selected")}
                    </span>
                  </div>
                  <div className="border border-[hsl(var(--border))] rounded-xl max-h-40 overflow-y-auto p-3">
                    <div className="flex flex-wrap gap-2">
                      {rolesData?.data?.length === 0 ? (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {t("users.noRolesAvailable")}
                        </p>
                      ) : (
                        rolesData?.data?.map((role: Role) => (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => toggleRole(role.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                              formData.role_ids.includes(role.id)
                                ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary)/0.2)]"
                                : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]",
                            )}
                          >
                            {role.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {t("users.status")}
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, is_active: true })
                      }
                      className={cn(
                        "flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
                        formData.is_active
                          ? "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] ring-2 ring-[hsl(var(--success)/0.2)]"
                          : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]",
                      )}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {t("users.active")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, is_active: false })
                      }
                      className={cn(
                        "flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
                        !formData.is_active
                          ? "bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] ring-2 ring-[hsl(var(--destructive)/0.2)]"
                          : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]",
                      )}
                    >
                      <XCircle className="w-4 h-4" />
                      {t("users.inactive")}
                    </button>
                  </div>
                </div>
                {formErrors?.form && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                    <div>{renderFieldError(formErrors.form)}</div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
                <Button variant="ghost" type="button" onClick={closeModal}>
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  isLoading={updateMutation.isPending}
                  leftIcon={
                    !updateMutation.isPending ? (
                      <Check className="w-4 h-4" />
                    ) : undefined
                  }
                >
                  {updateMutation.isPending
                    ? t("users.saving")
                    : t("users.updateUser")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.25)]">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {t("users.createNewUser")}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {t("users.addNewUserToSystem")}
                  </p>
                </div>
              </div>
              <button
                onClick={closeCreateModal}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={handleCreateSubmit}
              className="overflow-y-auto max-h-[calc(90vh-140px)]"
              noValidate
            >
              <div className="p-6 space-y-5">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    {avatarPreview ? (
                      <div className="relative">
                        <img
                          src={avatarPreview}
                          alt={t("users.avatarPreview")}
                          className="w-24 h-24 rounded-full object-cover ring-4 ring-[hsl(var(--primary)/0.2)]"
                        />
                        <button
                          type="button"
                          onClick={removeAvatar}
                          className="absolute -top-1 -right-1 p-1 bg-[hsl(var(--destructive))] text-white rounded-full hover:bg-[hsl(var(--destructive)/0.8)] transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center ring-4 ring-[hsl(var(--primary)/0.2)]">
                        <UsersIcon className="w-10 h-10 text-white" />
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <span className="px-4 py-2 text-sm font-medium text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] rounded-lg hover:bg-[hsl(var(--primary)/0.2)] transition-colors">
                      {avatarPreview
                        ? t("users.changePhoto")
                        : t("users.uploadPhoto")}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Email & Username */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("users.email")}{" "}
                      <span className="text-[hsl(var(--destructive))]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder={t("users.emailPlaceholder")}
                      value={createFormData.email}
                      onChange={(e) => {
                        setCreateFormData({
                          ...createFormData,
                          email: e.target.value,
                        });
                        if (createFormErrors.email || createFormErrors.form) {
                          setCreateFormErrors((prev) => ({
                            ...prev,
                            email: undefined,
                            form: undefined,
                          }));
                        }
                      }}
                      className={getInputClassName(!!createFormErrors.email)}
                    />
                    {renderFieldError(createFormErrors.email)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("users.username")}{" "}
                      <span className="text-[hsl(var(--destructive))]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      placeholder={t("users.usernamePlaceholder")}
                      value={createFormData.username}
                      onChange={(e) => {
                        setCreateFormData({
                          ...createFormData,
                          username: e.target.value,
                        });
                        if (
                          createFormErrors.username ||
                          createFormErrors.form
                        ) {
                          setCreateFormErrors((prev) => ({
                            ...prev,
                            username: undefined,
                            form: undefined,
                          }));
                        }
                      }}
                      className={getInputClassName(
                        !!createFormErrors.username,
                        "font-mono",
                      )}
                    />
                    {renderFieldError(createFormErrors.username)}
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t("auth.password")}{" "}
                    <span className="text-[hsl(var(--destructive))]">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder={t("users.enterPassword")}
                    value={createFormData.password}
                    onChange={(e) => {
                      setCreateFormData({
                        ...createFormData,
                        password: e.target.value,
                      });
                      if (createFormErrors.password || createFormErrors.form) {
                        setCreateFormErrors((prev) => ({
                          ...prev,
                          password: undefined,
                          form: undefined,
                        }));
                      }
                    }}
                    className={getInputClassName(!!createFormErrors.password)}
                  />
                  {renderFieldError(createFormErrors.password)}
                  <PasswordChecklist requirements={passwordRequirements} />
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("users.firstName")}
                    </label>
                    <input
                      type="text"
                      placeholder={t("users.firstNamePlaceholder")}
                      value={createFormData.first_name}
                      onChange={(e) =>
                        setCreateFormData({
                          ...createFormData,
                          first_name: e.target.value,
                        })
                      }
                      className={getInputClassName()}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("users.lastName")}
                    </label>
                    <input
                      type="text"
                      placeholder={t("users.lastNamePlaceholder")}
                      value={createFormData.last_name}
                      onChange={(e) =>
                        setCreateFormData({
                          ...createFormData,
                          last_name: e.target.value,
                        })
                      }
                      className={getInputClassName()}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t("users.phone")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("users.phonePlaceholder")}
                    value={createFormData.phone}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        phone: e.target.value,
                      })
                    }
                    className={getInputClassName(!!createFormErrors?.phone)}
                  />
                  {renderFieldError(createFormErrors?.phone)}
                </div>

                {/* Extension */}
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t("users.extension")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("users.extensionPlaceholder")}
                    value={createFormData.extension}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        extension: e.target.value,
                      })
                    }
                    className={getInputClassName()}
                  />
                </div>

                {/* Departments (Hierarchical Multi-select) */}
                <HierarchicalTreeSelect
                  data={departmentsTree}
                  selectedIds={createFormData.department_ids}
                  onSelectionChange={async (ids) => {
                    // Auto-populate classifications and locations from departments
                    try {
                      const allClassifications = new Set<string>();
                      const allLocations = new Set<string>();

                      for (const deptId of ids) {
                        const dept = await departmentApi.getById(deptId);
                        if (dept.success && dept.data) {
                          // Add department's classifications
                          dept.data.classifications?.forEach((c) =>
                            allClassifications.add(c.id),
                          );
                          // Add department's locations
                          dept.data.locations?.forEach((l) =>
                            allLocations.add(l.id),
                          );
                        }
                      }

                      setCreateFormData((prev) => ({
                        ...prev,
                        department_ids: ids,
                        classification_ids: Array.from(allClassifications),
                        location_ids: Array.from(allLocations),
                      }));
                    } catch (error) {
                      console.error(
                        "Error fetching department details:",
                        error,
                      );
                      setCreateFormData({
                        ...createFormData,
                        department_ids: ids,
                      });
                    }
                  }}
                  label={t("users.departments")}
                  icon={
                    <Building2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  }
                  emptyMessage={t("users.noDepartmentsAvailable")}
                  colorScheme="accent"
                  maxHeight="180px"
                />

                {/* Locations (Hierarchical Multi-select) */}
                <HierarchicalTreeSelect
                  data={locationsTree}
                  selectedIds={createFormData.location_ids}
                  onSelectionChange={(ids) =>
                    setCreateFormData({ ...createFormData, location_ids: ids })
                  }
                  label={t("users.locations")}
                  icon={
                    <MapPin className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  }
                  emptyMessage={t("users.noLocationsAvailable")}
                  colorScheme="success"
                  maxHeight="180px"
                />

                {/* Classifications (Hierarchical Multi-select) */}
                <HierarchicalTreeSelect
                  data={classificationsTree}
                  selectedIds={createFormData.classification_ids}
                  onSelectionChange={(ids) =>
                    setCreateFormData({
                      ...createFormData,
                      classification_ids: ids,
                    })
                  }
                  label={t("users.classifications")}
                  icon={
                    <FolderTree className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  }
                  emptyMessage={t("users.noClassificationsAvailable")}
                  colorScheme="warning"
                  maxHeight="180px"
                />

                {/* Roles */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {t("users.roles")}
                    </label>
                    <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-md">
                      {createFormData.role_ids.length} {t("common.selected")}
                    </span>
                  </div>
                  <div className="border border-[hsl(var(--border))] rounded-xl max-h-40 overflow-y-auto p-3">
                    <div className="flex flex-wrap gap-2">
                      {rolesData?.data?.length === 0 ? (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {t("users.noRolesAvailable")}
                        </p>
                      ) : (
                        rolesData?.data?.map((role: Role) => (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => toggleCreateRole(role.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                              createFormData.role_ids.includes(role.id)
                                ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary)/0.2)]"
                                : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]",
                            )}
                          >
                            {role.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                {createFormErrors?.form && (
                  <div className=" flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                    <div>{renderFieldError(createFormErrors.form)}</div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={closeCreateModal}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={!isCreatePasswordValid || createMutation.isPending}
                  isLoading={createMutation.isPending}
                  leftIcon={
                    !createMutation.isPending ? (
                      <Check className="w-4 h-4" />
                    ) : undefined
                  }
                >
                  {createMutation.isPending
                    ? t("users.creating")
                    : t("users.createUser")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add AD User Modal */}
      {isADModalOpen && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/25">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    Add Active Directory User
                  </h2>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Search and select a user from Active Directory
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsADModalOpen(false)}
                className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
              >
                <X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search AD users..."
                  value={adSearchQuery}
                  onChange={(e) => setAdSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] text-sm"
                />
              </div>

              {adUsersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]" />
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {adUsers
                    .filter(
                      (u) =>
                        !adSearchQuery ||
                        u.username
                          .toLowerCase()
                          .includes(adSearchQuery.toLowerCase()) ||
                        (u.display_name &&
                          u.display_name
                            .toLowerCase()
                            .includes(adSearchQuery.toLowerCase())) ||
                        (u.email &&
                          u.email
                            .toLowerCase()
                            .includes(adSearchQuery.toLowerCase())) ||
                        (u.phone &&
                          u.phone
                            .toLowerCase()
                            .includes(adSearchQuery.toLowerCase())),
                    )
                    .map((adUser) => (
                      <div
                        key={adUser.dn}
                        className="flex items-center justify-between p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                            {adUser.display_name || adUser.username}
                          </p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                            @{adUser.username}
                            {adUser.email && ` - ${adUser.email}`}
                            {adUser.phone && ` - ${adUser.phone}`}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          isLoading={adRegistering === adUser.username}
                          disabled={adRegistering === adUser.username}
                          onClick={async () => {
                            setAdRegistering(adUser.username);
                            try {
                              const res = await ldapApi.register({
                                username: adUser.username,
                              });
                              if (res.success) {
                                toast.success(
                                  `AD user "${adUser.username}" registered successfully`,
                                );
                                queryClient.invalidateQueries({
                                  queryKey: ["users"],
                                });
                                setIsADModalOpen(false);
                              } else {
                                toast.error(
                                  res.error || "Failed to register AD user",
                                );
                              }
                            } catch (err: any) {
                              const msg =
                                err?.response?.data?.error ||
                                "Failed to register AD user";
                              toast.error(msg);
                            } finally {
                              setAdRegistering(null);
                            }
                          }}
                        >
                          Add to System
                        </Button>
                      </div>
                    ))}
                  {adUsers.length === 0 && !adSearchQuery && (
                    <p className="text-center text-sm text-[hsl(var(--muted-foreground))] py-8">
                      No Active Directory users found
                    </p>
                  )}
                  {adUsers.length > 0 &&
                    adSearchQuery &&
                    adUsers.filter(
                      (u) =>
                        u.username
                          .toLowerCase()
                          .includes(adSearchQuery.toLowerCase()) ||
                        (u.display_name &&
                          u.display_name
                            .toLowerCase()
                            .includes(adSearchQuery.toLowerCase())) ||
                        (u.email &&
                          u.email
                            .toLowerCase()
                            .includes(adSearchQuery.toLowerCase())) ||
                        (u.phone &&
                          u.phone
                            .toLowerCase()
                            .includes(adSearchQuery.toLowerCase())),
                    ).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                          <span className="text-amber-600 text-xl font-bold">
                            !
                          </span>
                        </div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                          No results found
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                          No AD user matches &quot;{adSearchQuery}&quot;
                        </p>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {isViewModalOpen && viewingUser && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.25)]">
                  {viewingUser.avatar ? (
                    <img
                      src={viewingUser.avatar}
                      alt={viewingUser.username}
                      className="w-full h-full rounded-xl object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-white">
                      {viewingUser.first_name?.[0]?.toUpperCase() ||
                        viewingUser.username[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {viewingUser.first_name} {viewingUser.last_name}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    @{viewingUser.username}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium",
                    viewingUser.is_active
                      ? "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]"
                      : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
                  )}
                >
                  {viewingUser.is_active
                    ? t("users.active")
                    : t("users.inactive")}
                </span>
                <button
                  onClick={closeViewModal}
                  className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6 space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    {t("users.phone")}
                  </p>
                  <p className="text-sm text-[hsl(var(--foreground))]">
                    {viewingUser.phone || t("users.notProvided")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    {t("users.extension")}
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[hsl(var(--primary))]" />
                    <p className="text-sm text-[hsl(var(--foreground))]">
                      {(viewingUser as any).extension || t("users.notProvided")}
                    </p>
                  </div>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    {t("users.email")}
                  </p>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[hsl(var(--primary))]" />
                    <p className="text-sm text-[hsl(var(--foreground))]">
                      {viewingUser.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Departments */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    {t("users.departments")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {viewingUser.departments &&
                  viewingUser.departments.length > 0 ? (
                    viewingUser.departments.map((dept) => (
                      <span
                        key={dept.id}
                        className="px-2.5 py-1 rounded-lg text-xs bg-[hsl(var(--accent)/0.1)]"
                      >
                        {dept.name}
                      </span>
                    ))
                  ) : viewingUser.department ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs bg-[hsl(var(--accent)/0.1)]">
                      {viewingUser.department.name}
                    </span>
                  ) : (
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                      {t("users.noDepartmentsAssigned")}
                    </span>
                  )}
                </div>
              </div>

              {/* Locations */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    {t("users.locations")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {viewingUser.locations && viewingUser.locations.length > 0 ? (
                    viewingUser.locations.map((loc) => (
                      <span
                        key={loc.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]"
                      >
                        {loc.name}
                      </span>
                    ))
                  ) : viewingUser.location ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]">
                      {viewingUser.location.name}
                    </span>
                  ) : (
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                      {t("users.noLocationsAssigned")}
                    </span>
                  )}
                </div>
              </div>

              {/* Classifications */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    {t("users.classifications")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {viewingUser.classifications &&
                  viewingUser.classifications.length > 0 ? (
                    viewingUser.classifications.map((cls) => (
                      <span
                        key={cls.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]"
                      >
                        {cls.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                      {t("users.noClassificationsAssigned")}
                    </span>
                  )}
                </div>
              </div>

              {/* Roles */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    {t("users.roles")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {viewingUser.roles && viewingUser.roles.length > 0 ? (
                    viewingUser.roles.map((role) => (
                      <span
                        key={role.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                      >
                        {role.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                      {t("users.noRolesAssigned")}
                    </span>
                  )}
                </div>
              </div>

              {/* Meta Info */}
              <div className="pt-4 border-t border-[hsl(var(--border))] grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    {t("users.lastLogin")}
                  </p>
                  <p className="text-sm text-[hsl(var(--foreground))]">
                    {viewingUser.last_login_at
                      ? new Date(viewingUser.last_login_at).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : t("users.never")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    {t("users.accountCreated")}
                  </p>
                  <p className="text-sm text-[hsl(var(--foreground))]">
                    {new Date(viewingUser.created_at).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <Button variant="ghost" onClick={closeViewModal}>
                {t("common.close")}
              </Button>
              <Button
                onClick={() => {
                  closeViewModal();
                  openEditModal(viewingUser);
                }}
                leftIcon={<Edit2 className="w-4 h-4" />}
              >
                {t("users.editUser")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
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
                    {t("users.importUsers")}
                  </h3>
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 ml-11">
                  {t("users.uploadJsonOrExcelToImport", {
                    defaultValue:
                      "Upload a JSON (.json) or Excel (.xlsx) file to import users",
                  })}
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
                  {t("users.selectJsonOrExcelFile", {
                    defaultValue: "Select JSON (.json) or Excel (.xlsx) file",
                  })}
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
                      <li>
                        {t("users.validJsonOrExcelRequired", {
                          defaultValue:
                            "Valid JSON (.json) or Excel (.xlsx) file required",
                        })}
                      </li>
                      <li>{t("users.failedImportsDownloadNote")}</li>
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
                {isImporting ? t("common.importing") : t("users.importUsers")}
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
              <div className="flex flex-col items-start gap-4 mb-6">
                <div className="flex items-center gap-3 border-border border-0 border-b w-full pb-2">
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
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {t("goals.components.import.completedHeading")}
                  </h3>
                </div>

                <div className="mt-2 space-y-2">
                  <p className="text-base font-semibold text-[hsl(var(--foreground))]">
                    <span className="text-[hsl(var(--muted-foreground))]">
                      {t("users.totalRecords", { defaultValue: "Total" })}:
                    </span>{" "}
                    {importResult.total ??
                      importResult.imported + importResult.skipped}
                  </p>
                  <p className="text-base font-semibold text-[hsl(var(--foreground))]">
                    <span className="text-[hsl(var(--success))]">
                      {importResult.imported}
                    </span>{" "}
                    {t("users.imported")}
                  </p>
                  {importResult.skipped > 0 && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {t("users.importSummary", {
                        success: importResult.imported,
                        errors: importResult.skipped,
                      })}
                    </p>
                  )}
                  {importResult.note && (
                    <div className="mt-3 p-3 bg-[hsl(var(--accent)/0.1)] border border-[hsl(var(--accent))] rounded-lg">
                      <p className="text-xs flex items-center gap-2 font-medium text-[hsl(var(--accent))]">
                        <AlertTriangle
                          className="text-yellow-500 mb-1"
                          size={28}
                        />
                        {importResult.note}
                      </p>
                    </div>
                  )}
                  {importResult.errors.length > 0 && (
                    <div className="mt-3 max-h-40 overflow-y-auto">
                      <p className="text-xs font-medium text-[hsl(var(--destructive))] mb-2">
                        {t("users.errors")}
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
              <div className="flex justify-end gap-3">
                <Button onClick={() => setImportResult(null)}>
                  {t("common.close")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onConfirm={handleConfirmDelete}
        title={t("common.delete")}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        onClose={() => setShowDeleteConfirmation(false)}
        message={`Are you sure you want to delete this user?`}
        isLoading={deleteLoading}
      />
    </div>
  );
};
