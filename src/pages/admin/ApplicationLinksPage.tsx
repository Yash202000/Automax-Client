import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { applicationLinkApi } from "../../api/applicationLinks";
import type {
  ApplicationLink,
  ApplicationLinkCreateRequest,
  ApplicationLinkUpdateRequest,
} from "../../types";
import {
  Plus,
  ExternalLink,
  Edit2,
  Trash2,
  Save,
  X,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";

const resolveImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return `/${url}`;
};

const AVAILABLE_ICONS = [
  "ExternalLink",
  "Link",
  "Globe",
  "Mail",
  "Phone",
  "Calendar",
  "FileText",
  "Settings",
  "Users",
  "Briefcase",
  "Database",
  "Server",
  "Cloud",
  "Code",
  "BookOpen",
  "MessageSquare",
  "Video",
  "Headphones",
  "ShoppingCart",
];

const AVAILABLE_COLORS = [
  {
    nameKey: "applicationLinks.colors.blue",
    value: "blue",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    nameKey: "applicationLinks.colors.violet",
    value: "violet",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    nameKey: "applicationLinks.colors.emerald",
    value: "emerald",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    nameKey: "applicationLinks.colors.amber",
    value: "amber",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    nameKey: "applicationLinks.colors.rose",
    value: "rose",
    gradient: "from-rose-500 to-pink-600",
  },
  {
    nameKey: "applicationLinks.colors.orange",
    value: "orange",
    gradient: "from-orange-500 to-red-600",
  },
];

type ApplicationLinkFormErrors = Partial<
  Record<"name" | "url" | "sso_callback_url", string>
>;

// Build an ordered display list: each root link followed by its direct children
function buildDisplayList(links: ApplicationLink[]): ApplicationLink[] {
  const roots = links.filter((l) => !l.parent_id);
  const childrenByParent: Record<string, ApplicationLink[]> = {};
  for (const l of links) {
    if (l.parent_id) {
      if (!childrenByParent[l.parent_id]) childrenByParent[l.parent_id] = [];
      childrenByParent[l.parent_id].push(l);
    }
  }
  return roots.flatMap((root) => [root, ...(childrenByParent[root.id] ?? [])]);
}

const ApplicationLinksPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canCreate =
    isSuperAdmin || hasPermission(PERMISSIONS.APPLICATION_LINKS_CREATE);
  const canUpdate =
    isSuperAdmin || hasPermission(PERMISSIONS.APPLICATION_LINKS_UPDATE);
  const canDelete =
    isSuperAdmin || hasPermission(PERMISSIONS.APPLICATION_LINKS_DELETE);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ApplicationLink | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formErrors, setFormErrors] = useState<ApplicationLinkFormErrors>({});
  const [formData, setFormData] = useState<ApplicationLinkCreateRequest>({
    parent_id: null,
    name: "",
    name_ar: "",
    description: "",
    description_ar: "",
    url: "",
    icon: "ExternalLink",
    color: "blue",
    sort_order: 0,
    is_active: true,
    sso_enabled: false,
    sso_callback_url: "",
    sso_redirect_path: "",
  });

  // Fetch application links
  const { data: linksResponse, isLoading } = useQuery({
    queryKey: ["admin", "application-links"],
    queryFn: () => applicationLinkApi.list(),
  });

  const links = linksResponse?.data || [];
  const displayLinks = buildDisplayList(links);
  const linksById = Object.fromEntries(links.map((l) => [l.id, l]));

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: ApplicationLinkCreateRequest) =>
      applicationLinkApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "application-links"],
      });
      queryClient.invalidateQueries({ queryKey: ["application-links"] });
      toast.success(t("applicationLinks.createdSuccess"));
      resetForm();
      setIsCreating(false);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || t("applicationLinks.createError"),
      );
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ApplicationLinkUpdateRequest;
    }) => applicationLinkApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "application-links"],
      });
      queryClient.invalidateQueries({ queryKey: ["application-links"] });
      toast.success(t("applicationLinks.updatedSuccess"));
      resetForm();
      setEditingId(null);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || t("applicationLinks.updateError"),
      );
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => applicationLinkApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "application-links"],
      });
      queryClient.invalidateQueries({ queryKey: ["application-links"] });
      toast.success(t("applicationLinks.deletedSuccess"));
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || t("applicationLinks.deleteError"),
      );
    },
  });

  // Image remove mutation
  const removeImageMutation = useMutation({
    mutationFn: (id: string) => applicationLinkApi.removeImage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "application-links"],
      });
      queryClient.invalidateQueries({ queryKey: ["application-links"] });
      setImageLoadError(false);
      setFormData((prev) => ({ ...prev, image_url: "" }));
      toast.success(t("applicationLinks.logoRemovedSuccess"));
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || t("applicationLinks.logoRemoveError"),
      );
    },
  });

  // Image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      applicationLinkApi.uploadImage(id, file),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "application-links"],
      });
      queryClient.invalidateQueries({ queryKey: ["application-links"] });
      if (response?.data?.link) {
        setImageLoadError(false);
        setFormData((prev) => ({
          ...prev,
          image_url: response.data?.link.image_url || "",
        }));
        toast.success(t("applicationLinks.logoUploadedSuccess"));
      }
      // Reset file input so same file can be re-selected after an error
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (
      error: // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any,
    ) => {
      toast.error(
        error.response?.data?.error || t("applicationLinks.logoUploadError"),
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("applicationLinks.fileSizeError"));
      return;
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("applicationLinks.fileTypeError"));
      return;
    }

    if (editingId) {
      uploadImageMutation.mutate({ id: editingId, file });
    }
  };

  const resetForm = () => {
    setImageLoadError(false);
    setFormErrors({});
    setFormData({
      parent_id: null,
      name: "",
      name_ar: "",
      description: "",
      description_ar: "",
      url: "",
      icon: "ExternalLink",
      image_url: "",
      color: "blue",
      sort_order: 0,
      is_active: true,
      sso_enabled: false,
      sso_callback_url: "",
      sso_redirect_path: "",
    });
  };

  const handleEdit = (link: ApplicationLink) => {
    setImageLoadError(false);
    setFormErrors({});
    setEditingId(link.id);
    setFormData({
      parent_id: link.parent_id ?? null,
      name: link.name,
      name_ar: link.name_ar || "",
      description: link.description,
      description_ar: link.description_ar || "",
      url: link.url,
      icon: link.icon,
      image_url: link.image_url || "",
      color: link.color,
      sort_order: link.sort_order,
      is_active: link.is_active,
      sso_enabled: link.sso_enabled,
      sso_callback_url: link.sso_callback_url || "",
      sso_redirect_path: link.sso_redirect_path || "",
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: ApplicationLinkFormErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = t("validation.fieldRequired", {
        field: t("applicationLinks.name"),
      });
    }

    // URL is required for child cards (they navigate on click)
    if (formData.parent_id && !formData.url?.trim()) {
      nextErrors.url = t("validation.fieldRequired", {
        field: t("applicationLinks.url"),
      });
    }

    if (formData.sso_enabled && !formData.sso_callback_url?.trim()) {
      nextErrors.sso_callback_url = t(
        "applicationLinks.ssoCallbackRequiredError",
      );
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const payload = {
      ...formData,
      name: formData.name.trim(),
      url: formData.url?.trim() || "",
      parent_id: formData.parent_id || null,
      sso_callback_url: formData.sso_callback_url?.trim() || "",
      sso_redirect_path: formData.sso_redirect_path?.trim() || "",
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getInputClassName = (hasError?: boolean, extraClassName = "") =>
    `w-full px-3 py-2 bg-[hsl(var(--background))] border rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] ${
      hasError
        ? "border-[hsl(var(--destructive))]"
        : "border-[hsl(var(--border))]"
    } ${extraClassName}`;

  const renderFieldError = (message?: string) =>
    message ? (
      <p className="mt-1 text-xs font-medium text-[hsl(var(--destructive))]">
        {message}
      </p>
    ) : null;

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deleteMutation.mutate(deleteConfirm.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[hsl(var(--muted-foreground))]">
          {t("applicationLinks.loading")}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
            {t("applicationLinks.title")}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {t("applicationLinks.subtitle")}
          </p>
        </div>
        {!isCreating && !editingId && canCreate && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-primary to-accent text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {t("applicationLinks.addApplicationLink")}
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (canCreate || canUpdate) && (
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
            {editingId
              ? t("applicationLinks.editApplicationLink")
              : t("applicationLinks.createApplicationLink")}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  {t("applicationLinks.name")}{" "}
                  <span className="text-[hsl(var(--destructive))]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) {
                      setFormErrors((prev) => ({
                        ...prev,
                        name: undefined,
                      }));
                    }
                  }}
                  required
                  className={getInputClassName(!!formErrors.name)}
                  placeholder={t("applicationLinks.namePlaceholder")}
                />
                {renderFieldError(formErrors.name)}
              </div>

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  {t("common.nameAr")}
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.name_ar}
                  onChange={(e) =>
                    setFormData({ ...formData, name_ar: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  placeholder={t("common.nameArPlaceholder")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  {t("common.nameAr")}
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.name_ar}
                  onChange={(e) =>
                    setFormData({ ...formData, name_ar: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  placeholder={t("common.nameArPlaceholder")}
                />
              </div>
            </div>

            {/* Parent group selector */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  {t("applicationLinks.parentGroup", "Parent Group")}
                </label>
                <select
                  value={formData.parent_id ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      parent_id: e.target.value || null,
                    })
                  }
                  className={getInputClassName()}
                >
                  <option value="">
                    {t("applicationLinks.noParent", "None (root card)")}
                  </option>
                  {links
                    .filter((l) => !l.parent_id && l.id !== editingId)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {i18n.language === "ar" && l.name_ar
                          ? l.name_ar
                          : l.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  {formData.parent_id
                    ? t(
                        "applicationLinks.childHint",
                        "This card will appear inside the group's sub-links modal.",
                      )
                    : t(
                        "applicationLinks.rootHint",
                        "Root cards appear directly on the dashboard. Leave URL empty to make this a group.",
                      )}
                </p>
              </div>
              <div />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  {t("applicationLinks.url")}
                  {formData.parent_id && (
                    <span className="text-[hsl(var(--destructive))]"> *</span>
                  )}
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => {
                    setFormData({ ...formData, url: e.target.value });
                    if (formErrors.url) {
                      setFormErrors((prev) => ({
                        ...prev,
                        url: undefined,
                      }));
                    }
                  }}
                  className={getInputClassName(!!formErrors.url)}
                  placeholder={t("applicationLinks.urlPlaceholder")}
                />
                {renderFieldError(formErrors.url)}
              </div>
              <div />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  {t("applicationLinks.description")}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  placeholder={t("applicationLinks.descriptionPlaceholder")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  {t("common.descriptionAr")}
                </label>
                <textarea
                  dir="rtl"
                  value={formData.description_ar}
                  onChange={(e) =>
                    setFormData({ ...formData, description_ar: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  placeholder={t("common.descriptionArPlaceholder")}
                />
              </div>
            </div>

            {isCreating && !editingId ? (
              <div className="bg-[hsl(var(--muted))] p-4 rounded-lg text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                {t("applicationLinks.saveFirstInfo")}
              </div>
            ) : (
              editingId && (
                <div className="bg-[hsl(var(--muted))] p-4 rounded-lg space-y-3">
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))]">
                    {t("applicationLinks.logoImage")}
                  </label>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {t("applicationLinks.uploadLogoHelp")}
                  </p>

                  {/* Preview */}
                  {formData.image_url && (
                    <div className="flex items-center gap-3">
                      {imageLoadError ? (
                        <div className="w-16 h-16 flex items-center justify-center bg-red-50 border border-red-200 rounded text-center">
                          <AlertTriangle className="w-6 h-6 text-red-400" />
                        </div>
                      ) : (
                        <img
                          src={resolveImageUrl(formData.image_url || "")}
                          alt={t("applicationLinks.logoPreview")}
                          className="w-16 h-16 object-contain bg-white rounded border border-[hsl(var(--border))]"
                          onError={() => setImageLoadError(true)}
                          onLoad={() => setImageLoadError(false)}
                        />
                      )}
                      <div className="flex flex-col gap-1">
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {imageLoadError ? (
                            <span className="text-red-500 font-medium">
                              {t("applicationLinks.logoLoadError")}
                            </span>
                          ) : (
                            t("applicationLinks.currentLogo")
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            editingId && removeImageMutation.mutate(editingId)
                          }
                          disabled={removeImageMutation.isPending}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 w-fit"
                        >
                          <X className="w-3 h-3" />
                          {removeImageMutation.isPending
                            ? t("applicationLinks.removing")
                            : t("applicationLinks.removeLogo")}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Upload input */}
                  <div className="relative">
                    {uploadImageMutation.isPending && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2 animate-pulse">
                        {t("applicationLinks.uploading")}
                      </p>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                      onChange={handleImageUpload}
                      disabled={uploadImageMutation.isPending}
                      className="block w-full text-sm text-[hsl(var(--foreground))]
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-medium
                      file:bg-[hsl(var(--primary))] file:text-white
                      hover:file:opacity-90 file:cursor-pointer
                      disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              )
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  {t("applicationLinks.icon")}
                </label>
                <select
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  className={getInputClassName()}
                >
                  {AVAILABLE_ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  {t("applicationLinks.color")}
                </label>
                <select
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className={getInputClassName()}
                >
                  {AVAILABLE_COLORS.map((color) => (
                    <option key={color.value} value={color.value}>
                      {t(color.nameKey)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  {t("applicationLinks.sortOrder")}
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.sort_order === 0 ? "" : formData.sort_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sort_order:
                        e.target.value === ""
                          ? 0
                          : parseInt(e.target.value, 10) || 0,
                    })
                  }
                  placeholder="0"
                  className={getInputClassName()}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
              <label
                htmlFor="is_active"
                className="text-sm text-[hsl(var(--foreground))]"
              >
                {t("applicationLinks.active")}
              </label>
            </div>

            {/* SSO Settings */}
            <div className="border border-[hsl(var(--border))] rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sso_enabled"
                  checked={formData.sso_enabled}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      sso_enabled: e.target.checked,
                    });
                    if (!e.target.checked && formErrors.sso_callback_url) {
                      setFormErrors((prev) => ({
                        ...prev,
                        sso_callback_url: undefined,
                      }));
                    }
                  }}
                  className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--ring))]"
                />
                <label
                  htmlFor="sso_enabled"
                  className="text-sm font-medium text-[hsl(var(--foreground))]"
                >
                  {t("applicationLinks.enableSSO")}
                </label>
              </div>
              {formData.sso_enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                      {t("applicationLinks.ssoCallbackUrl")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={formData.sso_callback_url}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          sso_callback_url: e.target.value,
                        });
                        if (formErrors.sso_callback_url) {
                          setFormErrors((prev) => ({
                            ...prev,
                            sso_callback_url: undefined,
                          }));
                        }
                      }}
                      className={getInputClassName(
                        !!formErrors.sso_callback_url,
                      )}
                      placeholder={t(
                        "applicationLinks.ssoCallbackUrlPlaceholder",
                      )}
                    />
                    {formErrors.sso_callback_url ? (
                      renderFieldError(formErrors.sso_callback_url)
                    ) : (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                        {t("applicationLinks.ssoCallbackHelp")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                      {t("applicationLinks.ssoRedirectPath")}
                    </label>
                    <input
                      type="text"
                      value={formData.sso_redirect_path}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sso_redirect_path: e.target.value,
                        })
                      }
                      className={getInputClassName()}
                      placeholder={t(
                        "applicationLinks.ssoRedirectPathPlaceholder",
                      )}
                    />
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      {t("applicationLinks.ssoRedirectPathHelp")}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-linear-to-br from-primary to-accent text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {editingId
                  ? t("applicationLinks.update")
                  : t("applicationLinks.create")}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-lg hover:opacity-90 transition-opacity"
              >
                <X className="w-4 h-4" />
                {t("applicationLinks.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Links List */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))]">
              <tr>
                <th className="px-6 py-4 text-start text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  {t("applicationLinks.tableNameHeader")}
                </th>
                <th className="px-6 py-4 text-start text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  {t("applicationLinks.tableUrlHeader")}
                </th>
                <th className="px-6 py-4 text-start text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  {t("applicationLinks.tableIconColorHeader")}
                </th>
                <th className="px-6 py-4 text-start text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  {t("applicationLinks.tableOrderHeader")}
                </th>
                <th className="px-6 py-4 text-start text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  {t("applicationLinks.tableStatusHeader")}
                </th>
                {(canUpdate || canDelete) && (
                  <th className="px-6 py-4 text-end text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    {t("applicationLinks.tableActionsHeader")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {displayLinks.length === 0 ? (
                <tr>
                  <td
                    colSpan={canUpdate || canDelete ? 6 : 5}
                    className="px-6 py-12 text-center text-[hsl(var(--muted-foreground))]"
                  >
                    {t("applicationLinks.noLinksYet")}
                    {canCreate ? ` ${t("applicationLinks.createOneNow")}` : ""}
                  </td>
                </tr>
              ) : (
                displayLinks.map((link) => {
                  const isChild = Boolean(link.parent_id);
                  const childCount = links.filter(
                    (l) => l.parent_id === link.id,
                  ).length;
                  const parentName = link.parent_id
                    ? (i18n.language === "ar" &&
                        linksById[link.parent_id]?.name_ar) ||
                      linksById[link.parent_id]?.name ||
                      ""
                    : "";

                  return (
                    <tr
                      key={link.id}
                      className={`hover:bg-[hsl(var(--muted)/0.3)] transition-colors ${
                        isChild ? "bg-[hsl(var(--muted)/0.15)]" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div
                          className={
                            isChild
                              ? "pl-5 border-l-2 border-[hsl(var(--border))]"
                              : ""
                          }
                        >
                          <div className="flex items-center gap-2">
                            {!isChild && childCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-700">
                                <Layers className="w-3 h-3" />
                                {childCount}
                              </span>
                            )}
                            <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                              {i18n.language === "ar" && link.name_ar
                                ? link.name_ar
                                : link.name}
                            </span>
                          </div>
                          {isChild && parentName && (
                            <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                              ↳ {parentName}
                            </div>
                          )}
                          {(link.description || link.description_ar) && (
                            <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                              {i18n.language === "ar" && link.description_ar
                                ? link.description_ar
                                : link.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {link.url ? (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                          >
                            <span className="max-w-[180px] truncate inline-block">
                              {link.url}
                            </span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-xs text-[hsl(var(--muted-foreground))] italic">
                            {t("applicationLinks.noUrl", "No URL — group card")}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[hsl(var(--muted-foreground))]">
                            {link.icon}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                            {link.color}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[hsl(var(--foreground))]">
                        {link.sort_order}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              link.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {link.is_active
                              ? t("applicationLinks.statusActive")
                              : t("applicationLinks.statusInactive")}
                          </span>
                          {link.sso_enabled && !link.sso_callback_url && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              <AlertTriangle className="w-3 h-3" />
                              {t("applicationLinks.ssoNoCallback")}
                            </span>
                          )}
                        </div>
                      </td>
                      {(canUpdate || canDelete) && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canUpdate && (
                              <button
                                onClick={() => handleEdit(link)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title={t("applicationLinks.editTitle")}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleteConfirm(link)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title={t("applicationLinks.deleteTitle")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                    {t("applicationLinks.deleteTitle")}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    {t("applicationLinks.deleteDescription", {
                      name: deleteConfirm.name,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {t("applicationLinks.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {deleteMutation.isPending
                    ? t("applicationLinks.deleting")
                    : t("applicationLinks.deleteTitle")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationLinksPage;
