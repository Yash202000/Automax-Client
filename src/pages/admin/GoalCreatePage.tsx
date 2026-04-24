import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Save, LayoutTemplate, Info } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useCreateGoal, useGoal } from "../../hooks/useGoals";
import { useActiveGoalTemplates } from "../../hooks/useGoalTemplates";
import { useCategoryTree } from "../../hooks/useCategories";
import { metricApi } from "../../api/goals";
import { userApi, departmentApi } from "../../api/admin";
import { useAuthStore } from "../../stores/authStore";
import { GOAL_PRIORITY_OPTIONS } from "../../types/goal";
import type {
  GoalCreateRequest,
  GoalPriority,
  GoalBrief,
  TemplateMetric,
} from "../../types/goal";
import type { Category } from "../../types/category";
import { ParentGoalSelector } from "../../components/goals/ParentGoalSelector";

// Flatten the category tree into a sorted flat list for <option> rendering.
const flattenCategories = (
  nodes: Category[],
  depth = 0,
  acc: Array<Category & { depth: number }> = [],
): Array<Category & { depth: number }> => {
  for (const n of nodes) {
    if (!n.is_active) continue;
    acc.push({ ...n, depth });
    if (n.children && n.children.length > 0) {
      flattenCategories(n.children, depth + 1, acc);
    }
  }
  return acc;
};

export const GoalCreatePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createGoal = useCreateGoal();
  const { data: templatesData } = useActiveGoalTemplates();
  const activeTemplates = templatesData?.data ?? [];
  const [searchParams] = useSearchParams();
  const presetParentId = searchParams.get("parent") ?? undefined;
  const { data: presetParentData } = useGoal(presetParentId ?? "");
  const [pendingMetrics, setPendingMetrics] = useState<TemplateMetric[]>([]);
  const [parentGoal, setParentGoal] = useState<GoalBrief | null>(null);
  const [parentInitialized, setParentInitialized] = useState(false);
  // Default the owner to the current user — users creating a goal usually own it.
  // The field stays editable so admins/managers can reassign at create time.
  const currentUser = useAuthStore((s) => s.user);
  const [form, setForm] = useState<GoalCreateRequest>({
    title: "",
    description: "",
    category: "",
    category_id: "",
    priority: "Medium",
    owner_id: currentUser?.id ?? "",
    department_id: currentUser?.department_id ?? "",
    parent_goal_id: presetParentId,
    start_date: "",
    target_date: "",
    review_date: "",
  });

  const { data: categoryTreeData } = useCategoryTree();
  const flatCategories = flattenCategories(categoryTreeData?.data ?? []);

  // Pre-fill parent from URL param
  if (presetParentData?.data && !parentInitialized) {
    const pg = presetParentData.data;
    setParentGoal({
      id: pg.id,
      title: pg.title,
      status: pg.status,
      priority: pg.priority,
      progress: pg.progress,
      level: pg.level,
    });
    setForm((prev) => ({ ...prev, parent_goal_id: pg.id }));
    setParentInitialized(true);
  }

  const { data: usersData } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => userApi.list(1, 100),
  });
  const { data: departmentsData } = useQuery({
    queryKey: ["admin", "departments"],
    queryFn: () => departmentApi.list(),
  });
  const users = usersData?.data || [];
  const departments = departmentsData?.data || [];

  const handleChange = (field: keyof GoalCreateRequest, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTemplateSelect = (templateId: string) => {
    if (!templateId) {
      setPendingMetrics([]);
      return;
    }
    const template = activeTemplates.find((t) => t.id === templateId);
    if (!template) return;
    setForm((prev) => ({
      ...prev,
      category: template.category || prev.category || "",
      priority: (template.priority as GoalPriority) || prev.priority,
    }));
    setPendingMetrics(template.default_metrics ?? []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error(t("goals.create.errors.titleRequired"));
      return;
    }
    if (!form.owner_id.trim()) {
      toast.error(t("goals.create.errors.ownerRequired"));
      return;
    }

    const payload: GoalCreateRequest = {
      title: form.title.trim(),
      priority: form.priority,
      owner_id: form.owner_id.trim(),
    };

    if (form.description?.trim()) payload.description = form.description.trim();
    if (form.category_id?.trim()) {
      payload.category_id = form.category_id.trim();
      // Clear legacy free-text category when a tree category is selected.
      payload.category = "";
    } else if (form.category?.trim()) {
      payload.category = form.category.trim();
    }
    if (form.department_id?.trim())
      payload.department_id = form.department_id.trim();
    if (form.parent_goal_id?.trim())
      payload.parent_goal_id = form.parent_goal_id.trim();
    if (form.start_date) payload.start_date = `${form.start_date}T00:00:00Z`;
    if (form.target_date) payload.target_date = `${form.target_date}T00:00:00Z`;
    if (form.review_date) payload.review_date = `${form.review_date}T00:00:00Z`;

    try {
      const result = await createGoal.mutateAsync(payload);
      // Create metrics from template if any
      if (pendingMetrics.length > 0 && result?.data?.id) {
        for (const m of pendingMetrics) {
          try {
            await metricApi.create(result.data.id, {
              name: m.name,
              metric_type: m.metric_type,
              unit: m.unit,
              baseline_value: m.baseline_value,
              target_value: m.target_value,
              weight: m.weight,
            });
          } catch {
            toast.error(
              t("goals.create.errors.metricCreateFailed", { name: m.name }),
            );
          }
        }
      }
      navigate("/goals");
    } catch {
      // Error toast is handled by the hook
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/goals"
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label={t("goals.backToGoals")}
        >
          <ArrowLeft className="w-4 h-4 rtl:-rotate-180" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("goals.create.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("goals.create.subtitle")}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Template Selector */}
            {activeTemplates.length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  <span className="flex items-center gap-1.5">
                    <LayoutTemplate className="w-4 h-4" />
                    {t("goals.create.template")}
                  </span>
                </label>
                <select
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">{t("goals.create.noTemplate")}</option>
                  {activeTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                      {tpl.category ? ` (${tpl.category})` : ""}
                    </option>
                  ))}
                </select>
                {pendingMetrics.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                    <Info className="w-3.5 h-3.5" />
                    {t("goals.create.metricsWillBeCreated", {
                      count: pendingMetrics.length,
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("goals.create.fields.title")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder={t("goals.create.fields.titlePlaceholder")}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("goals.create.fields.description")}
              </label>
              <textarea
                value={form.description ?? ""}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder={t("goals.create.fields.descriptionPlaceholder")}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              />
            </div>

            {/* Category (tree-backed) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("goals.create.fields.category")}
              </label>
              <select
                value={form.category_id ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    category_id: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">
                  {flatCategories.length === 0
                    ? t("goals.create.fields.noCategories")
                    : t("goals.create.fields.noneCategory")}
                </option>
                {flatCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {"— ".repeat(cat.depth)}
                    {cat.name}
                  </option>
                ))}
              </select>
              {form.category && !form.category_id && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  {t("goals.create.fields.legacyCategoryHint", {
                    value: form.category,
                  })}
                </p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("goals.create.fields.priority")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                value={form.priority}
                onChange={(e) =>
                  handleChange("priority", e.target.value as GoalPriority)
                }
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {GOAL_PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Owner */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("goals.create.fields.owner")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                value={form.owner_id}
                onChange={(e) => handleChange("owner_id", e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">{t("goals.create.fields.selectOwner")}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("goals.create.fields.department")}
              </label>
              <select
                value={form.department_id ?? ""}
                onChange={(e) => handleChange("department_id", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">
                  {t("goals.create.fields.noDepartment")}
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Parent Goal */}
            <div className="md:col-span-2">
              <ParentGoalSelector
                value={form.parent_goal_id}
                selectedGoal={parentGoal}
                onChange={(goalId, goal) => {
                  setForm((prev) => ({ ...prev, parent_goal_id: goalId }));
                  setParentGoal(goal ?? null);
                }}
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("goals.create.fields.startDate")}
              </label>
              <input
                type="date"
                value={form.start_date ?? ""}
                onChange={(e) => handleChange("start_date", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Target Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("goals.create.fields.targetDate")}
              </label>
              <input
                type="date"
                value={form.target_date ?? ""}
                onChange={(e) => handleChange("target_date", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Review Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("goals.create.fields.reviewDate")}
              </label>
              <input
                type="date"
                value={form.review_date ?? ""}
                onChange={(e) => handleChange("review_date", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700/60">
            <Link
              to="/goals"
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t("common.cancel")}
            </Link>
            <button
              type="submit"
              disabled={createGoal.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {createGoal.isPending
                ? t("goals.create.submitting")
                : t("goals.create.submit")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
