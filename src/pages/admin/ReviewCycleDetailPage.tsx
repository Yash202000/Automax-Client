import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ClipboardCheck,
  Calendar,
  Building2,
  Users,
  Play,
  CheckCircle2,
  Trash2,
  Star,
  Loader2,
  UserPlus,
} from "lucide-react";
import {
  useReviewCycle,
  useCycleAssignments,
  useActivateCycle,
  useCompleteCycle,
  useAssignReviewees,
  useRemoveAssignment,
} from "../../hooks/useReviews";
import type { ReviewAssignmentStatus } from "../../types/review";

// ── Helpers ────────────────────────────────────────────

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const assignmentStatusColor: Record<ReviewAssignmentStatus, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  in_progress:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  completed:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const cycleStatusColor: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  completed:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  archived: "bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400",
};

// ── Add Assignment Modal ──────────────────────────────

const AddAssignmentModal: React.FC<{
  open: boolean;
  onClose: () => void;
  cycleId: string;
}> = ({ open, onClose, cycleId }) => {
  const { t } = useTranslation();
  const assignReviewees = useAssignReviewees();
  const [employeeId, setEmployeeId] = useState("");
  const [reviewerId, setReviewerId] = useState("");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    assignReviewees.mutate(
      {
        cycleId,
        data: {
          assignments: [{ employee_id: employeeId, reviewer_id: reviewerId }],
        },
      },
      {
        onSuccess: () => {
          onClose();
          setEmployeeId("");
          setReviewerId("");
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t("goals.reviews.addAssignmentModal.title")}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("goals.reviews.addAssignmentModal.employeeId")}
            </label>
            <input
              type="text"
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t(
                "goals.reviews.addAssignmentModal.employeeIdPlaceholder",
              )}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("goals.reviews.addAssignmentModal.reviewerId")}
            </label>
            <input
              type="text"
              required
              value={reviewerId}
              onChange={(e) => setReviewerId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t(
                "goals.reviews.addAssignmentModal.reviewerIdPlaceholder",
              )}
            />
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
              disabled={assignReviewees.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {assignReviewees.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              {t("goals.reviews.addAssignmentModal.assign")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────

export const ReviewCycleDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: cycleData, isLoading: cycleLoading } = useReviewCycle(id!);
  const { data: assignmentsData, isLoading: assignmentsLoading } =
    useCycleAssignments(id!);
  const activateCycle = useActivateCycle();
  const completeCycle = useCompleteCycle();
  const removeAssignment = useRemoveAssignment();
  const [showAddModal, setShowAddModal] = useState(false);

  const cycle = cycleData?.data;
  const assignments = assignmentsData?.data ?? [];

  const cycleStatusLabel = (s: string): string => {
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

  const assignmentStatusLabel = (s: ReviewAssignmentStatus): string => {
    switch (s) {
      case "pending":
        return t("goals.reviews.detail.statusPending");
      case "in_progress":
        return t("goals.reviews.detail.statusInProgress");
      case "completed":
        return t("goals.reviews.detail.statusCompleted");
      default:
        return s;
    }
  };

  if (cycleLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="text-center py-20 text-slate-400">
        {t("goals.reviews.detail.notFound")}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        to="/goals/reviews"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4 transition-colors"
      >
        <ArrowLeft size={16} className="rtl:-rotate-180" />
        {t("goals.reviews.detail.backToCycles")}
      </Link>

      {/* Cycle Header Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-100 dark:bg-violet-900/40 rounded-xl">
              <ClipboardCheck
                size={22}
                className="text-violet-600 dark:text-violet-400"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {cycle.title}
              </h1>
              {cycle.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {cycle.description}
                </p>
              )}
            </div>
          </div>
          <span
            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${cycleStatusColor[cycle.status]}`}
          >
            {cycleStatusLabel(cycle.status)}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-6 mt-4 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-slate-400" />
            <span className="tabular-nums">
              {formatDate(cycle.period_start)} – {formatDate(cycle.period_end)}
            </span>
          </div>
          {cycle.department && (
            <div className="flex items-center gap-1.5">
              <Building2 size={14} className="text-slate-400" />
              {cycle.department.name}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-slate-400" />
            <span className="tabular-nums">
              {t("goals.reviews.detail.completedOf", {
                completed: cycle.completed_count,
                total: cycle.assignment_count,
              })}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60">
          {cycle.status === "draft" && (
            <button
              onClick={() => activateCycle.mutate(cycle.id)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Play size={14} />
              {t("goals.reviews.activate")}
            </button>
          )}
          {cycle.status === "active" && (
            <button
              onClick={() => completeCycle.mutate(cycle.id)}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <CheckCircle2 size={14} />
              {t("goals.reviews.detail.completeCycle")}
            </button>
          )}
          {(cycle.status === "draft" || cycle.status === "active") && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium rounded-lg transition-colors"
            >
              <UserPlus size={14} />
              {t("goals.reviews.detail.addAssignment")}
            </button>
          )}
        </div>
      </div>

      {/* Assignments Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/60">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            {t("goals.reviews.detail.assignments", {
              count: assignments.length,
            })}
          </h2>
        </div>

        {assignmentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-blue-500" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
            <Users size={32} className="mb-2 opacity-50" />
            <p className="text-sm">{t("goals.reviews.detail.noAssignments")}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/60">
                <th className="ltr:text-left rtl:text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                  {t("goals.reviews.detail.assignmentTable.employee")}
                </th>
                <th className="ltr:text-left rtl:text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                  {t("goals.reviews.detail.assignmentTable.reviewer")}
                </th>
                <th className="ltr:text-left rtl:text-right px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                  {t("goals.reviews.detail.assignmentTable.status")}
                </th>
                <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                  {t("goals.reviews.detail.assignmentTable.rating")}
                </th>
                <th className="ltr:text-right rtl:text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                  {t("goals.reviews.detail.assignmentTable.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
              {assignments.map((a) => (
                <tr
                  key={a.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-900 dark:text-white">
                    {a.employee
                      ? `${a.employee.first_name} ${a.employee.last_name}`
                      : a.employee_id}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {a.reviewer
                      ? `${a.reviewer.first_name} ${a.reviewer.last_name}`
                      : a.reviewer_id}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${assignmentStatusColor[a.status]}`}
                    >
                      {assignmentStatusLabel(a.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a.overall_rating != null ? (
                      <div className="flex items-center justify-center gap-1">
                        <Star
                          size={14}
                          className="text-amber-400 fill-amber-400"
                        />
                        <span className="tabular-nums font-medium text-slate-900 dark:text-white">
                          {a.overall_rating.toFixed(1)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">–</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/goals/reviews/assignments/${a.id}`}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        {t("goals.reviews.detail.viewAction")}
                      </Link>
                      {a.status !== "completed" && (
                        <button
                          onClick={() => {
                            if (confirm(t("goals.reviews.detail.removePrompt")))
                              removeAssignment.mutate(a.id);
                          }}
                          aria-label={t("common.remove")}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AddAssignmentModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        cycleId={id!}
      />
    </div>
  );
};
