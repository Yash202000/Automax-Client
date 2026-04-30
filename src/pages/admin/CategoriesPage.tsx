import React, { useState, useMemo } from "react";
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
  Tag,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  useCategoryTree,
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "../../hooks/useCategories";
import type {
  Category,
  CategoryCreateRequest,
  CategoryUpdateRequest,
} from "../../types/category";
import { cn } from "@/lib/utils";
import { Button } from "../../components/ui";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";

interface CategoryFormData {
  name: string;
  code: string;
  description: string;
  parent_id: string;
  parent_name: string;
  sort_order: number;
  is_active: boolean;
}

const initialFormData: CategoryFormData = {
  name: "",
  code: "",
  description: "",
  parent_id: "",
  parent_name: "",
  sort_order: 0,
  is_active: true,
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
  category: Category;
  level: number;
  onAdd: (parentId: string, parentName: string) => void;
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  t: TFunction;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  category,
  level,
  onAdd,
  onEdit,
  onDelete,
  canCreate,
  canEdit,
  canDelete,
  t,
}) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;
  const gradient = levelGradients[level % levelGradients.length];
  const badgeColor = levelBadgeColors[level % levelBadgeColors.length];

  return (
    <div>
      <div
        className="flex items-center justify-between py-3.5 px-4 hover:bg-[hsl(var(--muted)/0.5)] transition-colors group"
        style={{ paddingLeft: `${level * 28 + 20}px` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors flex-shrink-0"
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              )}
            </button>
          ) : (
            <span className="w-7 flex-shrink-0" />
          )}
          <div
            className={cn(
              "w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-md flex-shrink-0",
              gradient,
            )}
          >
            <FolderTree className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">
                {category.name}
              </h4>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                {category.code}
              </span>
            </div>
            {category.description && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-1">
                {category.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-lg",
              badgeColor,
            )}
          >
            {t("categories.level", "Level")} {category.level}
          </span>
          <span
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-lg",
              category.is_active
                ? "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]"
                : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
            )}
          >
            {category.is_active
              ? t("categories.active", "Active")
              : t("categories.inactive", "Inactive")}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canCreate && (
              <button
                onClick={() => onAdd(category.id, category.name)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.1)] rounded-lg transition-colors"
                title={t("categories.addChild", "Add sub-category")}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => onEdit(category)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                title={t("common.edit", "Edit")}
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(category.id)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
                title={t("common.delete", "Delete")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {category.children!.map((child) => (
            <TreeNode
              key={child.id}
              category={child}
              level={level + 1}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
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

export const CategoriesPage: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const canCreate =
    isSuperAdmin || hasPermission(PERMISSIONS.CATEGORIES_CREATE);
  const canEdit = isSuperAdmin || hasPermission(PERMISSIONS.CATEGORIES_UPDATE);
  const canDelete =
    isSuperAdmin || hasPermission(PERMISSIONS.CATEGORIES_DELETE);

  const { data: treeData, isLoading } = useCategoryTree();
  const { data: flatList } = useCategories({ include_inactive: true });

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  // Filter tree client-side if not showing inactive
  const filteredTree = useMemo<Category[]>(() => {
    const all = treeData?.data ?? [];
    if (showInactive) return all;
    const filter = (nodes: Category[]): Category[] =>
      nodes
        .filter((n) => n.is_active)
        .map((n) => ({
          ...n,
          children: n.children ? filter(n.children) : undefined,
        }));
    return filter(all);
  }, [treeData?.data, showInactive]);

  const openCreateModal = (parentId = "", parentName = "") => {
    setEditingCategory(null);
    setFormData({
      ...initialFormData,
      parent_id: parentId,
      parent_name: parentName,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    const parentCat = flatList?.data?.find((c) => c.id === category.parent_id);
    setEditingCategory(category);
    setFormData({
      name: category.name,
      code: category.code,
      description: category.description ?? "",
      parent_id: category.parent_id ?? "",
      parent_name: parentCat?.name ?? "",
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCategory) {
      const payload: CategoryUpdateRequest = {
        name: formData.name,
        description: formData.description,
        sort_order: formData.sort_order,
        is_active: formData.is_active,
      };
      try {
        await updateMutation.mutateAsync({
          id: editingCategory.id,
          data: payload,
        });
        closeModal();
      } catch {
        /* hook toasts */
      }
    } else {
      const payload: CategoryCreateRequest = {
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
        parent_id: formData.parent_id || undefined,
        sort_order: formData.sort_order,
      };
      try {
        await createMutation.mutateAsync(payload);
        closeModal();
      } catch {
        /* hook toasts */
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirm);
      setDeleteConfirm(null);
    } catch {
      /* hook toasts; keep modal open so user sees error */
      setDeleteConfirm(null);
    }
  };

  const rootCount = filteredTree.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <FolderTree className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {t("admin.categories", "Categories")}
            </h2>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">
            {t("categories.subtitle", "Manage goal category hierarchy")}
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
              {t("categories.aboutTitle", "About Categories")}
            </h4>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {t(
                "categories.aboutDescription",
                "Categories let you organize goals in a tree structure. Each category has a unique code and can contain sub-categories. Once created, a category's parent cannot be changed.",
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Category Tree */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden">
        {/* Header with Add Root Button */}
        <div className="px-6 py-4 bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.2)]">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                {t("categories.hierarchy", "Category Hierarchy")}
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {rootCount} {t("categories.rootCategories", "root categories")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[hsl(var(--border))] text-sm text-[hsl(var(--foreground))] cursor-pointer hover:bg-[hsl(var(--muted))]">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-[hsl(var(--border))]"
              />
              {t("categories.showInactive", "Show inactive")}
            </label>
            {canCreate && (
              <button
                onClick={() => openCreateModal()}
                className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-primary to-accent text-[hsl(var(--primary-foreground))] rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-colors text-sm font-medium shadow-md shadow-[hsl(var(--primary)/0.25)]"
              >
                <Plus className="w-4 h-4" />
                {t("categories.newCategory", "New Category")}
              </button>
            )}
          </div>
        </div>

        {/* Tree Content */}
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[hsl(var(--muted-foreground))]">
              {t("categories.loading", "Loading categories…")}
            </p>
          </div>
        ) : rootCount === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[hsl(var(--primary)/0.25)]">
              <FolderTree className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
              {t("categories.noCategoriesYet", "No categories yet")}
            </h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              {t(
                "categories.createFirstCategory",
                "Create your first category to start organizing goals.",
              )}
            </p>
            {canCreate && (
              <Button
                onClick={() => openCreateModal()}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                {t("categories.createCategory", "Create Category")}
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {filteredTree.map((cat) => (
              <TreeNode
                key={cat.id}
                category={cat}
                level={0}
                onAdd={openCreateModal}
                onEdit={openEditModal}
                onDelete={setDeleteConfirm}
                canCreate={canCreate}
                canEdit={canEdit}
                canDelete={canDelete}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

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
                    {t(
                      "categories.deleteConfirmTitle",
                      "Delete this category?",
                    )}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    {t(
                      "categories.deleteConfirmMessage",
                      "This cannot be undone. The backend will refuse if the category has children or is used by any goal.",
                    )}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleteMutation.isPending}
                >
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  isLoading={deleteMutation.isPending}
                >
                  {deleteMutation.isPending
                    ? t("categories.deleting", "Deleting…")
                    : t("categories.deleteCategory", "Delete Category")}
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
                    {editingCategory
                      ? t("categories.editCategory", "Edit Category")
                      : t("categories.createCategory", "Create Category")}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {editingCategory
                      ? t("categories.updateDetails", "Update category details")
                      : formData.parent_name
                        ? `${t("categories.addingUnder", "Adding under")} "${formData.parent_name}"`
                        : t("categories.addNewRoot", "Add a new root category")}
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
              className="p-6 space-y-4 overflow-y-auto flex-1"
            >
              {/* Parent Info Banner */}
              {!editingCategory && formData.parent_name && (
                <div className="flex items-center gap-3 p-3 bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.2)] rounded-xl">
                  <FolderTree className="w-5 h-5 text-[hsl(var(--primary))]" />
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {t("categories.parentCategory", "Parent category")}
                    </p>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {formData.parent_name}
                    </p>
                  </div>
                </div>
              )}

              {editingCategory && (
                <div className="flex items-center gap-3 p-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-xl text-xs text-[hsl(var(--muted-foreground))]">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {t(
                      "categories.parentImmutable",
                      "A category's parent cannot be changed after creation.",
                    )}
                  </span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  {t("categories.name", "Name")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t(
                    "categories.namePlaceholder",
                    "e.g. Strategic, Revenue Growth",
                  )}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                  required
                  maxLength={100}
                />
              </div>

              {/* Code (create only) */}
              {!editingCategory && (
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Tag className="w-4 h-4" />
                      {t("categories.code", "Code")}{" "}
                      <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder={t(
                      "categories.codePlaceholder",
                      "e.g. strategic, revenue_growth",
                    )}
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all font-mono"
                    required
                    maxLength={50}
                  />
                  <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                    {t(
                      "categories.codeHelp",
                      "Unique identifier. Cannot be changed after creation.",
                    )}
                  </p>
                </div>
              )}

              {editingCategory && (
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Tag className="w-4 h-4" />
                      {t("categories.code", "Code")}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    disabled
                    className="w-full px-4 py-2.5 bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--muted-foreground))] font-mono cursor-not-allowed"
                  />
                </div>
              )}

              {/* Parent selector (create-only, optional if no preset) */}
              {!editingCategory && !formData.parent_name && (
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t("categories.parentCategory", "Parent category")}
                  </label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => {
                      const id = e.target.value;
                      const parent = flatList?.data?.find((c) => c.id === id);
                      setFormData({
                        ...formData,
                        parent_id: id,
                        parent_name: parent?.name ?? "",
                      });
                    }}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                  >
                    <option value="">
                      {t("categories.noneRootLevel", "— Root level —")}
                    </option>
                    {(flatList?.data ?? [])
                      .filter((c) => c.is_active)
                      .sort((a, b) => a.path.localeCompare(b.path))
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {"— ".repeat(cat.level)}
                          {cat.name} ({cat.code})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  {t("categories.description", "Description")}
                </label>
                <textarea
                  placeholder={t(
                    "categories.descriptionPlaceholder",
                    "Optional description for this category",
                  )}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all resize-none"
                />
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  {t("categories.sortOrder")}
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
                  {t(
                    "categories.sortOrderHelp",
                    "Lower values appear first within the same parent.",
                  )}
                </p>
              </div>

              {/* is_active (edit only) */}
              {editingCategory && (
                <div>
                  <label className="flex items-center gap-3 p-3 bg-[hsl(var(--muted)/0.3)] rounded-xl border border-[hsl(var(--border))] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_active: e.target.checked,
                        })
                      }
                      className="rounded border-[hsl(var(--border))]"
                    />
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {t("categories.active", "Active")}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t(
                          "categories.activeHelp",
                          "Inactive categories are hidden from goal selection but remain on existing goals.",
                        )}
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border))] sticky bottom-0 bg-[hsl(var(--card))]">
                <Button variant="ghost" type="button" onClick={closeModal}>
                  {t("common.cancel", "Cancel")}
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
                    ? t("categories.saving", "Saving…")
                    : editingCategory
                      ? t("common.update", "Update")
                      : t("common.create", "Create")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
