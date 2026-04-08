import React, { useState } from "react";
import { Link } from "react-router-dom";
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
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div className="p-2 rounded-lg bg-purple-500/10">
            <LayoutTemplate className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Goal Templates
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pre-configured templates for quick goal creation
            </p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
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
            No templates found. Create one to get started.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/30">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Priority
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Metrics
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Active
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
              {templates.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {t.name}
                    </div>
                    {t.description && (
                      <div className="text-xs text-slate-500 truncate max-w-xs">
                        {t.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {t.category || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {t.priority || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="tabular-nums text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t.default_metrics?.length ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(t)}
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        t.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                      }`}
                    >
                      {t.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(t)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(t.id)}
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
              {total} template{total !== 1 ? "s" : ""}
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
              Delete Template
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Are you sure you want to delete this template? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteTemplate.isPending}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                Delete
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
            {template ? "Edit Template" : "New Template"}
          </h3>
          <button
            onClick={onClose}
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
                Name *
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
                Description
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
                Category
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
                Priority
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
              Active
            </label>
          </div>

          {/* Default Metrics */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Default Metrics
              </label>
              <button
                type="button"
                onClick={addMetric}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium"
              >
                + Add Metric
              </button>
            </div>
            {metrics.length === 0 ? (
              <p className="text-xs text-slate-400">
                No default metrics configured.
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
                      placeholder="Metric name"
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
                      placeholder="Target"
                      value={m.target_value}
                      onChange={(e) =>
                        updateMetric(i, "target_value", Number(e.target.value))
                      }
                      className="w-20 rounded border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                    <input
                      type="number"
                      placeholder="Weight"
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
                Default Collaborator Roles
              </label>
              <button
                type="button"
                onClick={addCollaboratorRole}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium"
              >
                + Add Role
              </button>
            </div>
            {collaborators.length === 0 ? (
              <p className="text-xs text-slate-400">
                No default collaborator roles configured.
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
            >
              {isLoading ? "Saving..." : template ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
