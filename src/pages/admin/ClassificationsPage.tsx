import React, { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  FolderTree,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Info,
  Layers,
  Download,
  Upload,
  Clock,
  Eye,
  Users,
  Briefcase,
} from "lucide-react";
import {
  classificationApi,
  lookupApi,
  userApi,
  departmentApi,
} from "../../api/admin";
import type {
  Classification,
  ClassificationCreateRequest,
  ClassificationUpdateRequest,
  ClassificationType,
  ClassificationCriticalityCreateRequest,
  LookupValue,
  User,
  Department,
} from "../../types";
import { cn } from "@/lib/utils";
import { Button } from "../../components/ui";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";

interface ClassificationFormData {
  name: string;
  description: string;
  parent_id: string;
  parent_name: string;
  sort_order: number;
  type: ClassificationType;
  criticalities: ClassificationCriticalityCreateRequest[];
}

const initialFormData: ClassificationFormData = {
  name: "",
  description: "",
  parent_id: "",
  parent_name: "",
  sort_order: 0,
  type: "both",
  criticalities: [],
};

const levelGradients = [
  "from-[hsl(var(--primary))] to-[hsl(var(--accent))]",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-blue-500 to-cyan-500",
  "from-rose-500 to-pink-500",
];

const levelBadgeColors = [
  "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]",
  "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]",
  "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]",
];

interface TreeNodeProps {
  classification: Classification;
  level: number;
  onAdd: (parentId: string, parentName: string) => void;
  onEdit: (cls: Classification) => void;
  onDelete: (id: string) => void;
  onView: (cls: Classification) => void;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  t: (key: string) => string;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  classification,
  level,
  onAdd,
  onEdit,
  onDelete,
  onView,
  canCreate,
  canEdit,
  canDelete,
  t,
}) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren =
    classification.children && classification.children.length > 0;
  const gradient = levelGradients[level % levelGradients.length];
  const badgeColor = levelBadgeColors[level % levelBadgeColors.length];

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
          <div
            className={cn(
              "w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-md",
              gradient,
            )}
          >
            <FolderTree className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              {classification.name}
            </h4>
            {classification.description && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-1">
                {classification.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-lg",
              badgeColor,
            )}
          >
            {t("classifications.level")} {classification.level}
          </span>
          <span
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-lg",
              classification.type === "incident"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : classification.type === "request"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : classification.type === "complaint"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : classification.type === "all"
                      ? "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
            )}
          >
            {classification.type === "incident"
              ? t("classifications.incident")
              : classification.type === "request"
                ? t("classifications.request")
                : classification.type === "complaint"
                  ? t("classifications.complaint")
                  : classification.type === "query"
                    ? t("classifications.query")
                    : classification.type === "all"
                      ? t("classifications.all")
                      : t("classifications.both")}
          </span>
          <span
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-lg",
              classification.is_active
                ? "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]"
                : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
            )}
          >
            {classification.is_active
              ? t("classifications.active")
              : t("classifications.inactive")}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onView(classification)}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View assigned users & departments"
            >
              <Eye className="w-4 h-4" />
            </button>
            {canCreate && (
              <button
                onClick={() => onAdd(classification.id, classification.name)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.1)] rounded-lg transition-colors"
                title={t("classifications.addChildClassification")}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => onEdit(classification)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                title={t("common.edit")}
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(classification.id)}
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
          {classification.children!.map((child) => (
            <TreeNode
              key={child.id}
              classification={child}
              level={level + 1}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
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

export const ClassificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClassification, setEditingClassification] =
    useState<Classification | null>(null);
  const [formData, setFormData] =
    useState<ClassificationFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [viewingClassification, setViewingClassification] =
    useState<Classification | null>(null);
  const [viewUsers, setViewUsers] = useState<User[]>([]);
  const [viewDepartments, setViewDepartments] = useState<Department[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewTab, setViewTab] = useState<"users" | "departments">("users");

  const canCreateClassification =
    isSuperAdmin || hasPermission(PERMISSIONS.CLASSIFICATIONS_CREATE);
  const canEditClassification =
    isSuperAdmin || hasPermission(PERMISSIONS.CLASSIFICATIONS_UPDATE);
  const canDeleteClassification =
    isSuperAdmin || hasPermission(PERMISSIONS.CLASSIFICATIONS_DELETE);

  const { data: treeData, isLoading } = useQuery({
    queryKey: ["admin", "classifications", "tree"],
    queryFn: () => classificationApi.getTree(),
  });

  const { data: classificationsList } = useQuery({
    queryKey: ["admin", "classifications", "list"],
    queryFn: () => classificationApi.list(),
  });

  // Fetch PRIORITY lookup values for criticality configuration
  const { data: priorityLookupData } = useQuery({
    queryKey: ["admin", "lookups", "priority"],
    queryFn: async () => {
      const categories = await lookupApi.listCategories();
      const priorityCategory = categories.data?.find(
        (cat) => cat.code === "PRIORITY",
      );
      if (priorityCategory) {
        return await lookupApi.listValues(priorityCategory.id);
      }
      return { data: [] };
    },
  });

  const priorityValues: LookupValue[] = priorityLookupData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: ClassificationCreateRequest) =>
      classificationApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "classifications"] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ClassificationUpdateRequest;
    }) => classificationApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "classifications"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => classificationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "classifications"] });
      setDeleteConfirm(null);
    },
  });

  const openCreateModal = (parentId: string = "", parentName: string = "") => {
    setEditingClassification(null);
    // Initialize criticalities with default values (0 hours, 30 minutes) for each priority
    const defaultCriticalities = priorityValues.map((priority) => ({
      criticality_id: priority.id,
      max_closing_hours: 0,
      max_closing_minutes: 30,
    }));
    setFormData({
      ...initialFormData,
      parent_id: parentId,
      parent_name: parentName,
      criticalities: defaultCriticalities,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (classification: Classification) => {
    const parentCls = classificationsList?.data?.find(
      (c: Classification) => c.id === classification.parent_id,
    );
    setEditingClassification(classification);

    // Initialize criticalities - use existing values or defaults
    const existingCriticalities = classification.criticalities || [];
    const criticalities = priorityValues.map((priority) => {
      const existing = existingCriticalities.find(
        (c) => c.criticality_id === priority.id,
      );
      if (existing) {
        return {
          criticality_id: existing.criticality_id,
          max_closing_hours: existing.max_closing_hours,
          max_closing_minutes: existing.max_closing_minutes,
        };
      }
      return {
        criticality_id: priority.id,
        max_closing_hours: 0,
        max_closing_minutes: 30,
      };
    });

    setFormData({
      name: classification.name,
      description: classification.description,
      parent_id: classification.parent_id || "",
      parent_name: parentCls?.name || "",
      sort_order: classification.sort_order,
      type: classification.type || "both",
      criticalities,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClassification(null);
    setFormData(initialFormData);
  };

  const openViewModal = async (classification: Classification) => {
    setViewingClassification(classification);
    setViewTab("users");
    setViewLoading(true);
    try {
      const [usersRes, deptsRes] = await Promise.all([
        userApi.list(1, 100, "", [], [], [], [classification.id]),
        departmentApi.list(),
      ]);
      setViewUsers(usersRes.data || []);
      const allDepts: Department[] = deptsRes.data || [];
      setViewDepartments(
        allDepts.filter((d) =>
          d.classifications?.some((c) => c.id === classification.id),
        ),
      );
    } finally {
      setViewLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate criticalities - all must have closing time configured
    const hasInvalidCriticality = formData.criticalities.some(
      (c) =>
        c.max_closing_hours < 0 ||
        c.max_closing_hours > 840 ||
        c.max_closing_minutes < 0 ||
        c.max_closing_minutes > 59,
    );

    if (hasInvalidCriticality) {
      toast.error(t("classifications.criticalityRequired"));
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      parent_id: formData.parent_id || undefined,
      sort_order: formData.sort_order,
      type: formData.type,
      criticalities: formData.criticalities,
    };

    if (editingClassification) {
      updateMutation.mutate({ id: editingClassification.id, data: payload });
    } else {
      createMutation.mutate(payload as ClassificationCreateRequest);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await classificationApi.export();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `classifications_export_${new Date().toISOString().split("T")[0]}.json`;
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
      const result = await classificationApi.import(file);
      setImportResult(result.data || null);
      queryClient.invalidateQueries({ queryKey: ["admin", "classifications"] });
    } catch (error) {
      console.error("Import failed:", error);
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <FolderTree className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {t("classifications.title")}
            </h2>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">
            {t("classifications.subtitle")}
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-[hsl(var(--primary)/0.05)] to-[hsl(var(--accent)/0.05)] border border-[hsl(var(--primary)/0.2)] rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1">
              {t("classifications.aboutTitle")}
            </h4>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {t("classifications.aboutDescription")}
            </p>
          </div>
        </div>
      </div>

      {/* Classification Tree */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden">
        {/* Header with Add Root Button */}
        <div className="px-6 py-4 bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.2)]">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                {t("classifications.hierarchy")}
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {treeData?.data?.length || 0}{" "}
                {t("classifications.rootClassifications")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            {canCreateClassification && (
              <button
                onClick={() => openCreateModal()}
                className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-primary to-accent text-[hsl(var(--primary-foreground))] rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-colors text-sm font-medium shadow-md shadow-[hsl(var(--primary)/0.25)]"
              >
                <Plus className="w-4 h-4" />
                {t("classifications.addRootClassification")}
              </button>
            )}
          </div>
        </div>

        {/* Tree Content */}
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[hsl(var(--muted-foreground))]">
              {t("classifications.loading")}
            </p>
          </div>
        ) : treeData?.data?.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[hsl(var(--primary)/0.25)]">
              <FolderTree className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
              {t("classifications.noClassificationsYet")}
            </h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              {t("classifications.createFirstClassification")}
            </p>
            {canCreateClassification && (
              <Button
                onClick={() => openCreateModal()}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                {t("classifications.createClassification")}
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {treeData?.data?.map((cls: Classification) => (
              <TreeNode
                key={cls.id}
                classification={cls}
                level={0}
                onAdd={openCreateModal}
                onEdit={openEditModal}
                onDelete={setDeleteConfirm}
                onView={openViewModal}
                canCreate={canCreateClassification}
                canEdit={canEditClassification}
                canDelete={canDeleteClassification}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* View Assigned Users & Departments Modal */}
      {viewingClassification && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-lg",
                    levelGradients[
                      viewingClassification.level % levelGradients.length
                    ],
                  )}
                >
                  <FolderTree className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {viewingClassification.name}
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Level {viewingClassification.level} ·{" "}
                    {viewingClassification.type}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingClassification(null)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Tabs */}
            <div className="flex border-b border-[hsl(var(--border))] flex-shrink-0 px-6">
              <button
                onClick={() => setViewTab("users")}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
                  viewTab === "users"
                    ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                    : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                )}
              >
                <Users className="w-4 h-4" />
                Users
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-xs font-semibold",
                    viewTab === "users"
                      ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                      : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
                  )}
                >
                  {viewUsers.length}
                </span>
              </button>
              <button
                onClick={() => setViewTab("departments")}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
                  viewTab === "departments"
                    ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                    : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                )}
              >
                <Briefcase className="w-4 h-4" />
                Departments
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-xs font-semibold",
                    viewTab === "departments"
                      ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                      : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
                  )}
                >
                  {viewDepartments.length}
                </span>
              </button>
            </div>
            {/* Tab Content */}
            <div className="overflow-y-auto flex-1 p-4">
              {viewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : viewTab === "users" ? (
                viewUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 bg-[hsl(var(--muted))] rounded-xl flex items-center justify-center mb-3">
                      <Users className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
                    </div>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      No users assigned
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      No users are assigned to this classification.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {viewUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 bg-[hsl(var(--muted)/0.3)] hover:bg-[hsl(var(--muted)/0.5)] rounded-lg transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {user.first_name?.[0]}
                          {user.last_name?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : viewDepartments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 bg-[hsl(var(--muted))] rounded-xl flex items-center justify-center mb-3">
                    <Briefcase className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    No departments assigned
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    No departments are assigned to this classification.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {viewDepartments.map((dept) => (
                    <div
                      key={dept.id}
                      className="flex items-center gap-3 p-3 bg-[hsl(var(--muted)/0.3)] hover:bg-[hsl(var(--muted)/0.5)] rounded-lg transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                          {dept.name}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono truncate">
                          {dept.code}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "px-2 py-0.5 text-xs font-medium rounded-md flex-shrink-0",
                          dept.type === "internal"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                        )}
                      >
                        {dept.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="flex justify-end px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)] flex-shrink-0">
              <Button onClick={() => setViewingClassification(null)}>
                Close
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
                    Import Complete
                  </h3>
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      <span className="font-medium text-[hsl(var(--success))]">
                        {importResult.imported}
                      </span>{" "}
                      classifications imported successfully
                    </p>
                    {importResult.skipped > 0 && (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        <span className="font-medium text-[hsl(var(--warning))]">
                          {importResult.skipped}
                        </span>{" "}
                        classifications skipped
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
                    {t("classifications.deleteConfirmTitle")}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    {t("classifications.deleteConfirmMessage")}
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
                    ? t("classifications.deleting")
                    : t("classifications.deleteClassification")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-2xl w-full animate-scale-in max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.25)]">
                  <FolderTree className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {editingClassification
                      ? t("classifications.editClassification")
                      : t("classifications.createClassification")}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {editingClassification
                      ? t("classifications.updateDetails")
                      : formData.parent_name
                        ? `${t("classifications.addingUnder")} "${formData.parent_name}"`
                        : t("classifications.addNewRoot")}
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

            {/* Modal Body - Scrollable */}
            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-4 overflow-y-auto flex-1"
            >
              {/* Parent Info Banner (when adding child) */}
              {!editingClassification && formData.parent_name && (
                <div className="flex items-center gap-3 p-3 bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.2)] rounded-xl">
                  <FolderTree className="w-5 h-5 text-[hsl(var(--primary))]" />
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {t("classifications.parentClassification")}
                    </p>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {formData.parent_name}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  {t("classifications.name")}
                </label>
                <input
                  type="text"
                  placeholder={t("classifications.namePlaceholder")}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                  required
                />
              </div>

              {/* Only show parent selector when editing */}
              {editingClassification && (
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t("classifications.parentClassification")}
                  </label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) =>
                      setFormData({ ...formData, parent_id: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                  >
                    <option value="">{t("locations.noneRootLevel")}</option>
                    {classificationsList?.data
                      ?.filter(
                        (c: Classification) =>
                          c.id !== editingClassification?.id,
                      )
                      .map((cls: Classification) => (
                        <option key={cls.id} value={cls.id}>
                          {"—".repeat(cls.level)} {cls.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  {t("classifications.description")}
                </label>
                <textarea
                  placeholder={t("classifications.descriptionPlaceholder")}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  {t("classifications.type")}
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as ClassificationType,
                    })
                  }
                  className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                >
                  <option value="all">{t("classifications.typeAll")}</option>
                  <option value="both">{t("classifications.typeBoth")}</option>
                  <option value="incident">
                    {t("classifications.typeIncident")}
                  </option>
                  <option value="request">
                    {t("classifications.typeRequest")}
                  </option>
                  <option value="complaint">
                    {t("classifications.typeComplaint")}
                  </option>
                  <option value="query">
                    {t("classifications.typeQuery")}
                  </option>
                </select>
                <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                  {t("classifications.typeHelp")}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  {t("classifications.sortOrder")}
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sort_order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                  min={0}
                />
                <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                  {t("classifications.sortOrderHelp")}
                </p>
              </div>

              {/* Criticality Configuration Section */}
              <div className="border-t border-[hsl(var(--border))] pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-[hsl(var(--primary))]" />
                  <div>
                    <label className="block text-sm font-semibold text-[hsl(var(--foreground))]">
                      {t("classifications.maxClosingTimeByCriticality")}
                    </label>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {t("classifications.criticalitySettingsHelp")}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {priorityValues.map((priority) => {
                    const criticality = formData.criticalities.find(
                      (c) => c.criticality_id === priority.id,
                    );
                    const index = formData.criticalities.findIndex(
                      (c) => c.criticality_id === priority.id,
                    );

                    return (
                      <div
                        key={priority.id}
                        className="flex items-center gap-3 p-3 bg-[hsl(var(--muted)/0.3)] rounded-xl border border-[hsl(var(--border))]"
                        style={{
                          borderLeftColor: priority.color || "#6B7280",
                          borderLeftWidth: "4px",
                        }}
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: priority.color || "#6B7280",
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                            {priority.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div>
                            <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-0.5">
                              {t("classifications.hours")}
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="840"
                              value={criticality?.max_closing_hours || 0}
                              onChange={(e) => {
                                const newCriticalities = [
                                  ...formData.criticalities,
                                ];
                                if (index >= 0) {
                                  newCriticalities[index] = {
                                    ...newCriticalities[index],
                                    max_closing_hours:
                                      parseInt(e.target.value) || 0,
                                  };
                                }
                                setFormData({
                                  ...formData,
                                  criticalities: newCriticalities,
                                });
                              }}
                              className="w-20 px-2 py-1.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                              placeholder={t(
                                "classifications.hoursPlaceholder",
                              )}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-0.5">
                              {t("classifications.minutes")}
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={criticality?.max_closing_minutes || 0}
                              onChange={(e) => {
                                const newCriticalities = [
                                  ...formData.criticalities,
                                ];
                                if (index >= 0) {
                                  newCriticalities[index] = {
                                    ...newCriticalities[index],
                                    max_closing_minutes: Math.min(
                                      59,
                                      parseInt(e.target.value) || 0,
                                    ),
                                  };
                                }
                                setFormData({
                                  ...formData,
                                  criticalities: newCriticalities,
                                });
                              }}
                              className="w-20 px-2 py-1.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                              placeholder={t(
                                "classifications.minutesPlaceholder",
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer - Fixed at bottom */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border))] flex-shrink-0 sticky bottom-0 bg-[hsl(var(--card))] pt-4">
                <Button variant="ghost" type="button" onClick={closeModal}>
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  isLoading={
                    createMutation.isPending || updateMutation.isPending
                  }
                  leftIcon={
                    !(createMutation.isPending || updateMutation.isPending) ? (
                      <Check className="w-4 h-4" />
                    ) : undefined
                  }
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? t("classifications.saving")
                    : editingClassification
                      ? t("common.update")
                      : t("common.create")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
