import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  LayoutTemplate,
  Search,
  Pencil,
  Trash2,
  X,
  ArrowLeft,
} from "lucide-react";
import {
  useGoalTemplates,
  useCreateGoalTemplate,
  useUpdateGoalTemplate,
  useDeleteGoalTemplate,
} from "../../hooks/useGoalTemplates";
import type {
  GoalTemplate,
  GoalTemplateCreateRequest,
  GoalTemplateUpdateRequest,
  GoalTemplateFilter,
  TemplateMetric,
  TemplateCollaboratorRole,
  CollaboratorRole,
} from "../../types/goal";
import {
  GOAL_PRIORITY_OPTIONS,
  METRIC_TYPE_OPTIONS,
  COLLABORATOR_ROLE_OPTIONS,
} from "../../types/goal";

export const GoalTemplatesPage: React.FC = () => {
  const { t } = useTranslation();
  const [filter] = useState<GoalTemplateFilter>({
    page: 1,
    limit: 20,
  });
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<GoalTemplate | null>(
    null,
  );
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data, isLoading } = useGoalTemplates({
    ...filter,
    search: search || undefined,
  });
  const createTemplate = useCreateGoalTemplate();
  const updateTemplate = useUpdateGoalTemplate();
  const deleteTemplate = useDeleteGoalTemplate();

  const templates = data?.data ?? [];
  const total = data?.total ?? 0;

  const handleCreate = () => {
    setEditingTemplate(null);
    setShowModal(true);
  };

  const handleEdit = (template: GoalTemplate) => {
    setEditingTemplate(template);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate.mutateAsync(id);
    setDeleteConfirm(null);
  };

  const handleToggleActive = async (template: GoalTemplate) => {
    await updateTemplate.mutateAsync({
      id: template.id,
      data: { is_active: !template.is_active },
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/goals"
            aria-label={t("goals.backToGoals")}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500 rtl:-rotate-180" />
          </Link>
          <div className="p-2 rounded-lg bg-purple-500/10">
            <LayoutTemplate className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("goals.templates.title")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("goals.templates.subtitle")}
            </p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("goals.templates.newTemplate")}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={t("goals.templates.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        ) : templates.length === 0 ? (
          <div className="py-20 text-center text-slate-500 dark:text-slate-400">
            {t("goals.templates.empty")}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/30">
                <th className="ltr:text-left rtl:text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t("goals.templates.table.name")}
                </th>
                <th className="ltr:text-left rtl:text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t("goals.templates.table.category")}
                </th>
                <th className="ltr:text-left rtl:text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t("goals.templates.table.priority")}
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t("goals.templates.table.metrics")}
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t("goals.templates.table.active")}
                </th>
                <th className="ltr:text-right rtl:text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t("goals.templates.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
              {templates.map((tpl) => (
                <tr
                  key={tpl.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {tpl.name}
                    </div>
                    {tpl.description && (
                      <div className="text-xs text-slate-500 truncate max-w-xs">
                        {tpl.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {tpl.category || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {tpl.priority || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="tabular-nums text-sm font-medium text-slate-700 dark:text-slate-300">
                      {tpl.default_metrics?.length ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(tpl)}
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        tpl.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                      }`}
                    >
                      {tpl.is_active
                        ? t("goals.templates.active")
                        : t("goals.templates.inactive")}
                    </button>
                  </td>
                  <td className="px-4 py-3 ltr:text-right rtl:text-left">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(tpl)}
                        aria-label={t("common.edit")}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(tpl.id)}
                        aria-label={t("common.delete")}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {total > (filter.limit ?? 20) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700/60">
            <span className="text-sm text-slate-500 tabular-nums">
              {total === 1
                ? t("goals.templates.totalOne", { count: total })
                : t("goals.templates.totalMany", { count: total })}
            </span>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <TemplateFormModal
          template={editingTemplate}
          onClose={() => {
            setShowModal(false);
            setEditingTemplate(null);
          }}
          onSave={async (data) => {
            if (editingTemplate) {
              await updateTemplate.mutateAsync({
                id: editingTemplate.id,
                data,
              });
            } else {
              await createTemplate.mutateAsync(
                data as GoalTemplateCreateRequest,
              );
            }
            setShowModal(false);
            setEditingTemplate(null);
          }}
          isLoading={createTemplate.isPending || updateTemplate.isPending}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700/60 dark:bg-slate-800/80">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {t("goals.templates.deleteTitle")}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {t("goals.templates.deleteConfirm")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteTemplate.isPending}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────
// Template Form Modal
// ──────────────────────────────────────────────────

function TemplateFormModal({
  template,
  onClose,
  onSave,
  isLoading,
}: {
  template: GoalTemplate | null;
  onClose: () => void;
  onSave: (
    _data: GoalTemplateCreateRequest | GoalTemplateUpdateRequest,
  ) => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [category, setCategory] = useState(template?.category ?? "");
  const [priority, setPriority] = useState(template?.priority ?? "Medium");
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [metrics, setMetrics] = useState<TemplateMetric[]>(
    template?.default_metrics ?? [],
  );
  const [collaborators, setCollaborators] = useState<
    TemplateCollaboratorRole[]
  >(template?.default_collaborators ?? []);

  const addMetric = () => {
    setMetrics([
      ...metrics,
      {
        name: "",
        metric_type: "Numeric",
        unit: "",
        baseline_value: 0,
        target_value: 100,
        weight: 1,
      },
    ]);
  };

  const removeMetric = (index: number) => {
    setMetrics(metrics.filter((_, i) => i !== index));
  };

  const updateMetric = (
    index: number,
    field: string,
    value: string | number,
  ) => {
    const updated = [...metrics];
    updated[index] = { ...updated[index], [field]: value };
    setMetrics(updated);
  };

  const addCollaboratorRole = () => {
    setCollaborators([...collaborators, { role: "collaborator" }]);
  };

  const removeCollaboratorRole = (index: number) => {
    setCollaborators(collaborators.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name,
      description,
      category,
      priority,
      is_active: isActive,
      default_metrics: metrics.filter((m) => m.name.trim()),
      default_collaborators: collaborators,
    };
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700/60 dark:bg-slate-800/80 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {template
              ? t("goals.templates.form.editTitle")
              : t("goals.templates.form.newTitle")}
          </h3>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("goals.templates.form.nameLabel")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("goals.templates.form.descriptionLabel")}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("goals.templates.form.categoryLabel")}
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("goals.templates.form.priorityLabel")}
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(
                    e.target.value as "Critical" | "High" | "Medium" | "Low",
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {GOAL_PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              id="is-active"
              className="rounded"
            />
            <label
              htmlFor="is-active"
              className="text-sm text-slate-700 dark:text-slate-300"
            >
              {t("goals.templates.form.active")}
            </label>
          </div>

          {/* Default Metrics */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("goals.templates.form.defaultMetrics")}
              </label>
              <button
                type="button"
                onClick={addMetric}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium"
              >
                {t("goals.templates.form.addMetric")}
              </button>
            </div>
            {metrics.length === 0 ? (
              <p className="text-xs text-slate-400">
                {t("goals.templates.form.noMetrics")}
              </p>
            ) : (
              <div className="space-y-2">
                {metrics.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/30"
                  >
                    <input
                      type="text"
                      placeholder={t("goals.templates.form.metricName")}
                      value={m.name}
                      onChange={(e) => updateMetric(i, "name", e.target.value)}
                      className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                    <select
                      value={m.metric_type}
                      onChange={(e) =>
                        updateMetric(i, "metric_type", e.target.value)
                      }
                      className="rounded border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    >
                      {METRIC_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder={t("goals.templates.form.target")}
                      value={m.target_value}
                      onChange={(e) =>
                        updateMetric(i, "target_value", Number(e.target.value))
                      }
                      className="w-20 rounded border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                    <input
                      type="number"
                      placeholder={t("goals.templates.form.weight")}
                      value={m.weight}
                      onChange={(e) =>
                        updateMetric(i, "weight", Number(e.target.value))
                      }
                      step="0.1"
                      className="w-16 rounded border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => removeMetric(i)}
                      aria-label={t("common.remove")}
                      className="p-1 text-slate-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Default Collaborator Roles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("goals.templates.form.defaultRoles")}
              </label>
              <button
                type="button"
                onClick={addCollaboratorRole}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium"
              >
                {t("goals.templates.form.addRole")}
              </button>
            </div>
            {collaborators.length === 0 ? (
              <p className="text-xs text-slate-400">
                {t("goals.templates.form.noRoles")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {collaborators.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/30"
                  >
                    <select
                      value={c.role}
                      onChange={(e) => {
                        const updated = [...collaborators];
                        updated[i] = {
                          role: e.target.value as CollaboratorRole,
                        };
                        setCollaborators(updated);
                      }}
                      className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    >
                      {COLLABORATOR_ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeCollaboratorRole(i)}
                      aria-label={t("common.remove")}
                      className="p-0.5 text-slate-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
            >
              {isLoading
                ? t("goals.templates.form.saving")
                : template
                  ? t("goals.templates.form.updateAction")
                  : t("goals.templates.form.createAction")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
