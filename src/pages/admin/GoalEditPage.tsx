import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useGoal, useUpdateGoal } from "../../hooks/useGoals";
import { useCategoryTree } from "../../hooks/useCategories";
import { userApi, departmentApi } from "../../api/admin";
import { GOAL_PRIORITY_OPTIONS } from "../../types/goal";
import type { GoalUpdateRequest, GoalPriority, GoalBrief } from "../../types/goal";
import type { Category } from "../../types/category";
import { ParentGoalSelector } from "../../components/goals/ParentGoalSelector";

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

export const GoalEditPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: goalData, isLoading, error } = useGoal(id!);
  const updateGoal = useUpdateGoal();

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

  const goal = goalData?.data;

  const [form, setForm] = useState<GoalUpdateRequest>({
    title: "",
    description: "",
    category: "",
    category_id: "",
    priority: "Medium",
    owner_id: "",
    department_id: "",
    start_date: "",
    target_date: "",
    review_date: "",
  });

  const { data: categoryTreeData } = useCategoryTree();
  const flatCategories = flattenCategories(categoryTreeData?.data ?? []);

  const [initialized, setInitialized] = useState(false);
  const [parentGoal, setParentGoal] = useState<GoalBrief | null>(null);

  // Pre-fill form when goal data loads
  if (goal && !initialized) {
    setForm({
      title: goal.title ?? "",
      description: goal.description ?? "",
      category: goal.category ?? "",
      category_id: goal.category_id ?? "",
      priority: goal.priority ?? "Medium",
      owner_id: goal.owner_id ?? "",
      department_id: goal.department_id ?? "",
      parent_goal_id: goal.parent_goal_id ?? "",
      start_date: goal.start_date ? goal.start_date.slice(0, 10) : "",
      target_date: goal.target_date ? goal.target_date.slice(0, 10) : "",
      review_date: goal.review_date ? goal.review_date.slice(0, 10) : "",
    });
    if (goal.parent_goal) {
      setParentGoal(goal.parent_goal);
    }
    setInitialized(true);
  }

  const handleChange = (field: keyof GoalUpdateRequest, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title?.trim()) {
      toast.error(t("goals.create.errors.titleRequired"));
      return;
    }
    if (!form.owner_id?.trim()) {
      toast.error(t("goals.create.errors.ownerRequired"));
      return;
    }

    const payload: GoalUpdateRequest = {};

    if (form.title?.trim()) payload.title = form.title.trim();
    if (form.description?.trim()) payload.description = form.description.trim();
    if (form.category_id?.trim()) {
      payload.category_id = form.category_id.trim();
      // New tree-backed category takes over; clear legacy free-text.
      payload.category = "";
    } else if (form.category_id === "") {
      // Explicit clear from tree select.
      payload.category_id = "";
    }
    if (!form.category_id && form.category?.trim()) {
      payload.category = form.category.trim();
    }
    if (form.priority) payload.priority = form.priority;
    if (form.owner_id?.trim()) payload.owner_id = form.owner_id.trim();
    if (form.department_id?.trim())
      payload.department_id = form.department_id.trim();
    if (form.parent_goal_id?.trim())
      payload.parent_goal_id = form.parent_goal_id.trim();
    if (form.start_date)
      payload.start_date =
        form.start_date.length === 10
          ? `${form.start_date}T00:00:00Z`
          : form.start_date;
    if (form.target_date)
      payload.target_date =
        form.target_date.length === 10
          ? `${form.target_date}T00:00:00Z`
          : form.target_date;
    if (form.review_date)
      payload.review_date =
        form.review_date.length === 10
          ? `${form.review_date}T00:00:00Z`
          : form.review_date;

    try {
      await updateGoal.mutateAsync({ id: id!, data: payload });
      navigate(`/goals/${id}`);
    } catch {
      // Error toast is handled by the hook
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="rounded-xl border border-red-300 dark:border-red-700/60 bg-red-50 dark:bg-red-900/20 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                {t("goals.failedToLoad")}
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                {error instanceof Error
                  ? error.message
                  : t("goals.unexpectedError")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link
          to={`/goals/${id}`}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="w-4 h-4 rtl:-rotate-180" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("goals.edit.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("goals.edit.subtitle")}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("goals.create.fields.title")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title ?? ""}
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
                value={form.priority ?? "Medium"}
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
                value={form.owner_id ?? ""}
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
                excludeId={id}
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
              to={`/goals/${id}`}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t("common.cancel")}
            </Link>
            <button
              type="submit"
              disabled={updateGoal.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {updateGoal.isPending
                ? t("goals.edit.submitting")
                : t("goals.edit.submit")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
