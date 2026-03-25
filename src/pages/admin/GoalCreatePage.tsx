import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useCreateGoal } from "../../hooks/useGoals";
import { userApi, departmentApi } from "../../api/admin";
import { GOAL_PRIORITY_OPTIONS } from "../../types/goal";
import type { GoalCreateRequest, GoalPriority } from "../../types/goal";

export const GoalCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const createGoal = useCreateGoal();

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

  const [form, setForm] = useState<GoalCreateRequest>({
    title: "",
    description: "",
    category: "",
    priority: "Medium",
    owner_id: "",
    department_id: "",
    start_date: "",
    target_date: "",
    review_date: "",
  });

  const handleChange = (field: keyof GoalCreateRequest, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.owner_id.trim()) {
      toast.error("Owner is required");
      return;
    }

    const payload: GoalCreateRequest = {
      title: form.title.trim(),
      priority: form.priority,
      owner_id: form.owner_id.trim(),
    };

    if (form.description?.trim()) payload.description = form.description.trim();
    if (form.category?.trim()) payload.category = form.category.trim();
    if (form.department_id?.trim())
      payload.department_id = form.department_id.trim();
    if (form.start_date) payload.start_date = `${form.start_date}T00:00:00Z`;
    if (form.target_date) payload.target_date = `${form.target_date}T00:00:00Z`;
    if (form.review_date) payload.review_date = `${form.review_date}T00:00:00Z`;

    try {
      await createGoal.mutateAsync(payload);
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
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Create Goal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Define a new goal for your organization
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
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Enter goal title"
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                value={form.description ?? ""}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Describe the goal and its objectives"
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <input
                type="text"
                value={form.category ?? ""}
                onChange={(e) => handleChange("category", e.target.value)}
                placeholder="e.g. Revenue, Operations"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Priority <span className="text-red-500">*</span>
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
                Owner <span className="text-red-500">*</span>
              </label>
              <select
                value={form.owner_id}
                onChange={(e) => handleChange("owner_id", e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Select owner</option>
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
                Department
              </label>
              <select
                value={form.department_id ?? ""}
                onChange={(e) => handleChange("department_id", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Start Date
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
                Target Date
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
                Review Date
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
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createGoal.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {createGoal.isPending ? "Creating..." : "Create Goal"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
