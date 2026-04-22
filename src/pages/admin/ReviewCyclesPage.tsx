import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ClipboardCheck,
  Plus,
  Calendar,
  Building2,
  Users,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Play,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  useReviewCycles,
  useCreateCycle,
  useDeleteCycle,
  useActivateCycle,
  useCompleteCycle,
} from "../../hooks/useReviews";
import type {
  ReviewCycleStatus,
  ReviewCycleCreateRequest,
} from "../../types/review";

// ── Helpers ────────────────────────────────────────────

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const statusColor: Record<ReviewCycleStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  active:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  completed:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  archived:
    "bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400",
};

// ── Create Modal ──────────────────────────────────────

const CreateCycleModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const createCycle = useCreateCycle();
  const [form, setForm] = useState<ReviewCycleCreateRequest>({
    title: "",
    period_start: "",
    period_end: "",
    description: "",
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCycle.mutate(form, {
      onSuccess: () => {
        onClose();
        setForm({ title: "", period_start: "", period_end: "", description: "" });
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t("goals.reviews.createModal.title")}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("goals.reviews.createModal.titleLabel")}
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t("goals.reviews.createModal.titlePlaceholder")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("goals.reviews.createModal.descriptionLabel")}
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("goals.reviews.createModal.periodStart")}
              </label>
              <input
                type="date"
                required
                value={form.period_start}
                onChange={(e) =>
                  setForm({ ...form, period_start: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("goals.reviews.createModal.periodEnd")}
              </label>
              <input
                type="date"
                required
                value={form.period_end}
                onChange={(e) =>
                  setForm({ ...form, period_end: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={createCycle.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {createCycle.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              {t("goals.reviews.createModal.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────

export const ReviewCyclesPage: React.FC = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const limit = 20;

  const { data, isLoading } = useReviewCycles({
    page,
    limit,
    status: statusFilter || undefined,
  });
  const deleteCycle = useDeleteCycle();
  const activateCycle = useActivateCycle();
  const completeCycle = useCompleteCycle();

  const cycles = data?.data ?? [];
  const total = data?.total_items ?? 0;
  const totalPages = data?.total_pages ?? 1;

  const statusLabel = (s: ReviewCycleStatus): string => {
    switch (s) {
      case "draft":
        return t("goals.reviews.statusDraft");
      case "active":
        return t("goals.reviews.statusActive");
      case "completed":
        return t("goals.reviews.statusCompleted");
      case "archived":
        return t("goals.reviews.statusArchived");
      default:
        return s;
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-100 dark:bg-violet-900/40 rounded-xl">
            <ClipboardCheck
              size={22}
              className="text-violet-600 dark:text-violet-400"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("goals.reviews.title")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("goals.reviews.subtitle")}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          {t("goals.reviews.newCycle")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
        >
          <option value="">{t("goals.reviews.allStatuses")}</option>
          <option value="draft">{t("goals.reviews.statusDraft")}</option>
          <option value="active">{t("goals.reviews.statusActive")}</option>
          <option value="completed">{t("goals.reviews.statusCompleted")}</option>
          <option value="archived">{t("goals.reviews.statusArchived")}</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-blue-500" />
          </div>
        ) : cycles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
            <ClipboardCheck size={40} className="mb-3 opacity-50" />
            <p className="text-sm">{t("goals.reviews.empty")}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50">
                <th className="ltr:text-left rtl:text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                  {t("goals.reviews.table.title")}
                </th>
                <th className="ltr:text-left rtl:text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                  {t("goals.reviews.table.period")}
                </th>
                <th className="ltr:text-left rtl:text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                  {t("goals.reviews.table.status")}
                </th>
                <th className="ltr:text-left rtl:text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                  {t("goals.reviews.table.department")}
                </th>
                <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                  {t("goals.reviews.table.progress")}
                </th>
                <th className="ltr:text-right rtl:text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                  {t("goals.reviews.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
              {cycles.map((cycle) => (
                <tr
                  key={cycle.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/goals/reviews/${cycle.id}`}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {cycle.title}
                    </Link>
                    {cycle.created_by && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {t("goals.reviews.table.createdBy", {
                          name: `${cycle.created_by.first_name} ${cycle.created_by.last_name}`,
                        })}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400" />
                      <span className="tabular-nums">
                        {formatDate(cycle.period_start)} –{" "}
                        {formatDate(cycle.period_end)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[cycle.status]}`}
                    >
                      {statusLabel(cycle.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {cycle.department ? (
                      <div className="flex items-center gap-1.5">
                        <Building2 size={14} className="text-slate-400" />
                        {cycle.department.name}
                      </div>
                    ) : (
                      <span className="text-slate-400">
                        {t("goals.reviews.table.all")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Users size={14} className="text-slate-400" />
                      <span className="tabular-nums text-slate-600 dark:text-slate-300">
                        {cycle.completed_count}/{cycle.assignment_count}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {cycle.status === "draft" && (
                        <>
                          <button
                            onClick={() => activateCycle.mutate(cycle.id)}
                            title={t("goals.reviews.activate")}
                            aria-label={t("goals.reviews.activate")}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            <Play size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(t("goals.reviews.deletePrompt")))
                                deleteCycle.mutate(cycle.id);
                            }}
                            title={t("common.delete")}
                            aria-label={t("common.delete")}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      {cycle.status === "active" && (
                        <button
                          onClick={() => completeCycle.mutate(cycle.id)}
                          title={t("goals.reviews.complete")}
                          aria-label={t("goals.reviews.complete")}
                          className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700/60">
            <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
              {t("goals.reviews.showing", {
                from: (page - 1) * limit + 1,
                to: Math.min(page * limit, total),
                total,
              })}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label={t("common.previous")}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} className="rtl:-rotate-180" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label={t("common.next")}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} className="rtl:-rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateCycleModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
};
