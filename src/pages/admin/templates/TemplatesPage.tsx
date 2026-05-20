import { useMemo, useState } from "react";

import {
  Plus,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
} from "lucide-react";

import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, Input } from "@/components/ui";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { notificationTemplateApi } from "@/api/admin";
import {
  ACTION_OPTIONS,
  CHANNEL_OPTIONS,
  MODULE_OPTIONS,
  STATUS_OPTIONS,
} from "@/constants/template";
import { toast } from "sonner";

const getErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as {
    response?: { data?: { error?: string; message?: string } };
    message?: string;
  };

  return (
    apiError.response?.data?.error ||
    apiError.response?.data?.message ||
    apiError.message ||
    fallback
  );
};

export default function TemplatesPage() {
  const { t } = useTranslation();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const channelOptions = CHANNEL_OPTIONS.map((option) => ({
    ...option,
    label: t(`notificationTemplates.channels.${option.value}`),
  }));

  const moduleOptions = MODULE_OPTIONS.map((option) => ({
    ...option,
    label: t(`notificationTemplates.modules.${option.value}`),
  }));

  const actionOptions = ACTION_OPTIONS.map((option) => ({
    ...option,
    label: t(`notificationTemplates.actions.${option.value}`),
  }));

  const statusOptions = STATUS_OPTIONS.map((option) => ({
    value: String(option.value),
    label: t(
      `notificationTemplates.status.${option.value === true ? "active" : "inactive"}`,
    ),
  }));

  const filters = useMemo(() => {
    const statusParam = searchParams.get("is_active");

    return {
      page: Number(searchParams.get("page") || 1),

      limit: Number(searchParams.get("limit") || 10),

      search: searchParams.get("search") || undefined,

      channel: searchParams.get("channel") || undefined,

      module_type: searchParams.get("module_type") || undefined,

      action_type: searchParams.get("action_type") || undefined,
      is_active:
        statusParam === "true"
          ? true
          : statusParam === "false"
            ? false
            : undefined,
    };
  }, [searchParams]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["notification-templates", filters],

    queryFn: () => notificationTemplateApi.list(filters),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      notificationTemplateApi.toggleStatus(id, is_active),

    onSuccess: () => {
      toast.success(t("notificationTemplates.statusUpdateSuccess"));
      queryClient.invalidateQueries({
        queryKey: ["notification-templates"],
      });
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, t("notificationTemplates.statusUpdateFailed")),
      );
    },
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
    name?: string;
  }>({
    isOpen: false,
    id: null,
    name: undefined,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationTemplateApi.delete(id),
    onSuccess: () => {
      toast.success(t("notificationTemplates.deleteSuccess"));
      queryClient.invalidateQueries({
        queryKey: ["notification-templates"],
      });
      setDeleteConfirm({ isOpen: false, id: null, name: undefined });
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, t("notificationTemplates.deleteFailed")),
      );
    },
  });

  const templates = data?.data || [];

  const total = data?.total || 0;

  const totalPages = Math.max(1, Math.ceil(total / (filters.limit || 10)));

  const updatePage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(page));
    setSearchParams(params);
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);

    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    params.set("page", "1");

    setSearchParams(params);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      !!filters.search ||
      !!filters.channel ||
      !!filters.module_type ||
      !!filters.action_type ||
      filters.is_active !== undefined
    );
  }, [filters]);

  const clearFilters = () => {
    setSearchParams({});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t("notificationTemplates.title")}
          </h1>

          <p className="text-sm text-muted-foreground">
            {t("notificationTemplates.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            isLoading={isFetching}
            leftIcon={
              !isFetching ? <RefreshCw className="w-4 h-4" /> : undefined
            }
          >
            {t("notificationTemplates.refresh")}
          </Button>

          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate("/admin/templates/new")}
          >
            {t("notificationTemplates.createButton")}
          </Button>
        </div>
      </div>

      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-4 h-4" />
            <Input
              placeholder={t("notificationTemplates.searchPlaceholder")}
              value={filters.search || ""}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              leftIcon={<Filter className="w-4 h-4" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              {t("notificationTemplates.filters")}
              {hasActiveFilters && (
                <span className="ml-1 w-2 h-2 rounded-full bg-[hsl(var(--primary))]" />
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {t("notificationTemplates.clearFilters")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-sm overflow-hidden mt-4">
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Channel */}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                  {t("notificationTemplates.form.channel")}
                </label>

                <select
                  value={filters.channel || ""}
                  onChange={(e) =>
                    handleFilterChange("channel", e.target.value || "")
                  }
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                >
                  <option value="">
                    {t("notificationTemplates.allChannels")}
                  </option>

                  {channelOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Module */}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                  {t("notificationTemplates.form.module")}
                </label>

                <select
                  value={filters.module_type || ""}
                  onChange={(e) =>
                    handleFilterChange("module_type", e.target.value || "")
                  }
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                >
                  <option value="">
                    {t("notificationTemplates.allModules")}
                  </option>

                  {moduleOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action */}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                  {t("notificationTemplates.form.action")}
                </label>

                <select
                  value={filters.action_type || ""}
                  onChange={(e) =>
                    handleFilterChange("action_type", e.target.value || "")
                  }
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                >
                  <option value="">
                    {t("notificationTemplates.allActions")}
                  </option>

                  {actionOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                  {t("notificationTemplates.form.status")}
                </label>
                <select
                  value={
                    filters.is_active === undefined
                      ? ""
                      : String(filters.is_active)
                  }
                  onChange={(e) =>
                    handleFilterChange("is_active", e.target.value || "")
                  }
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                >
                  <option value="">
                    {t("notificationTemplates.allStatuses")}
                  </option>
                  {statusOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)]">
                <th className="text-start px-4 py-3 font-medium text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                  {t("notificationTemplates.table.name")}
                </th>

                <th className="text-start px-4 py-3 font-medium text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                  {t("notificationTemplates.table.code")}
                </th>

                <th className="text-start px-4 py-3 font-medium text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                  {t("notificationTemplates.table.channel")}
                </th>

                <th className="text-start px-4 py-3 font-medium text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                  {t("notificationTemplates.table.module")}
                </th>

                <th className="text-start px-4 py-3 font-medium text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                  {t("notificationTemplates.table.action")}
                </th>

                <th className="text-start px-4 py-3 font-medium text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                  {t("notificationTemplates.table.status")}
                </th>

                <th className="text-end px-4 py-3 font-medium text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                  {t("notificationTemplates.table.actions")}
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, idx) => (
                    <tr
                      key={idx}
                      className="border-b last:border-b-0 bg-[hsl(var(--muted)/0.08)] animate-pulse"
                    >
                      <td className="px-4 py-4 h-12" colSpan={7} />
                    </tr>
                  ))
                : templates.map((item: any) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-b-0 hover:bg-[hsl(var(--muted)/0.08)] transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium">{item.name}</p>
                        </div>
                      </td>

                      <td className="px-4 py-4">{item.code}</td>

                      <td className="px-4 py-4 uppercase">
                        {t(`notificationTemplates.channels.${item.channel}`)}
                      </td>

                      <td className="px-4 py-4 capitalize">
                        {t(`notificationTemplates.modules.${item.module_type}`)}
                      </td>

                      <td className="px-4 py-4 capitalize">
                        {t(`notificationTemplates.actions.${item.action_type}`)}
                      </td>

                      <td className="px-4 py-4">
                        <button
                          onClick={() =>
                            toggleMutation.mutate({
                              id: item.id,

                              is_active: !item.is_active,
                            })
                          }
                          className="flex items-center gap-2"
                        >
                          {item.is_active ? (
                            <>
                              <ToggleRight className="w-5 h-5 text-green-500" />

                              <span className="text-green-600">
                                {t("notificationTemplates.status.active")}
                              </span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-5 h-5 text-gray-400" />

                              <span className="text-gray-500">
                                {t("notificationTemplates.status.inactive")}
                              </span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              navigate(`/admin/templates/${item.id}`)
                            }
                            className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                            title={t("notificationTemplates.editTemplate")}
                            type="button"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                isOpen: true,
                                id: item.id,
                                name: item.name,
                              })
                            }
                            className="p-2 text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                            title={t("notificationTemplates.deleteTemplate")}
                            type="button"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {!isLoading && templates.length === 0 && (
            <div className="py-20 text-center text-muted-foreground">
              {t("notificationTemplates.emptyState")}
            </div>
          )}
        </div>

        <div className="px-4 py-4 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[hsl(var(--muted)/0.3)]">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {t("notificationTemplates.showing", {
              from: Math.min(
                ((filters.page || 1) - 1) * (filters.limit || 10) + 1,
                total || 1,
              ),
              to: Math.min((filters.page || 1) * (filters.limit || 10), total),
              total,
            })}
          </p>

          <div dir="ltr" className="flex items-center gap-2">
            <button
              onClick={() => updatePage(Math.max(1, (filters.page || 1) - 1))}
              disabled={(filters.page || 1) === 1}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const currentPage = filters.page || 1;
                let pageNum: number;

                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => updatePage(pageNum)}
                    className={
                      "w-10 h-10 rounded-lg text-sm font-semibold transition-all " +
                      (currentPage === pageNum
                        ? "bg-linear-to-br from-primary to-accent text-[hsl(var(--primary-foreground))] shadow-lg shadow-[hsl(var(--primary)/0.3)]"
                        : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] hover:border-[hsl(var(--border))] border border-transparent")
                    }
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() =>
                updatePage(Math.min(totalPages, (filters.page || 1) + 1))
              }
              disabled={(filters.page || 1) === totalPages}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <ConfirmationModal
          isOpen={deleteConfirm.isOpen}
          onClose={() =>
            setDeleteConfirm({ isOpen: false, id: null, name: undefined })
          }
          onConfirm={() => {
            if (deleteConfirm.id) {
              deleteMutation.mutate(deleteConfirm.id);
            }
          }}
          title={t("notificationTemplates.deleteTitle")}
          message={t("notificationTemplates.deleteMessage", {
            name:
              deleteConfirm.name || t("notificationTemplates.deleteFallback"),
          })}
          confirmText={t("notificationTemplates.deleteConfirm")}
          cancelText={t("notificationTemplates.cancel")}
          variant="destructive"
          isLoading={deleteMutation.isPending}
        />
      </div>
    </div>
  );
}
