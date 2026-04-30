import React, { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  User,
  Building2,
  Edit2,
  Trash2,
  Plus,
  Target,
  FileText,
  Users,
  BarChart3,
  Clock,
  AlertTriangle,
  Upload,
  Search,
  Copy,
  GitBranch,
  ClipboardCheck,
  ChevronRight,
  MessageSquare,
  History,
  Send,
} from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";
import {
  useGoal,
  useTransitionGoal,
  useDeleteGoal,
  useCloneGoal,
  useCreateMetric,
  useDeleteMetric,
  useGoalEvidences,
  useDeleteEvidence,
  useGoalCheckIns,
  useCreateCheckIn,
  useDeleteCheckIn,
  useGoalComments,
  useAddGoalComment,
  useDeleteGoalComment,
  useGoalActivity,
} from "../../hooks/useGoals";
import type {
  GoalStatus,
  GoalMetric,
  GoalMetricCreateRequest,
  MetricType,
  EvidenceType,
  EvidenceFilter,
  CheckInCreateRequest,
} from "../../types/goal";
import {
  VALID_GOAL_TRANSITIONS,
  GOAL_STATUS_LABELS,
  METRIC_TYPE_OPTIONS,
  EVIDENCE_TYPE_OPTIONS,
} from "../../types/goal";
import { GoalStatusBadge } from "../../components/goals/GoalStatusBadge";
import { GoalPriorityBadge } from "../../components/goals/GoalPriorityBadge";
import { GoalProgressBar } from "../../components/goals/GoalProgressBar";
import { MetricCard } from "../../components/goals/MetricCard";
import { MetricValueUpdateModal } from "../../components/goals/MetricValueUpdateModal";
import { EvidenceUploadModal } from "../../components/goals/EvidenceUploadModal";
import { EvidenceCard } from "../../components/goals/EvidenceCard";
import { GoalCloneModal } from "../../components/goals/GoalCloneModal";
import { CollaboratorPicker } from "../../components/goals/CollaboratorPicker";
import { GoalHierarchyTree } from "../../components/goals/GoalHierarchyTree";
import { CheckInForm } from "../../components/goals/CheckInForm";
import { CheckInCard } from "../../components/goals/CheckInCard";
import { useAuthStore } from "../../stores/authStore";
import { useGoalWebSocket } from "../../lib/services/goalWebSocket";

type TabType =
  | "overview"
  | "metrics"
  | "evidence"
  | "collaborators"
  | "check-ins"
  | "comments"
  | "activity";

const TRANSITION_BUTTON_STYLES: Record<string, string> = {
  Active: "bg-blue-600 hover:bg-blue-700 text-white",
  Under_Review: "bg-amber-600 hover:bg-amber-700 text-white",
  Achieved: "bg-green-600 hover:bg-green-700 text-white",
  Missed: "bg-red-600 hover:bg-red-700 text-white",
  Closed: "bg-slate-600 hover:bg-slate-700 text-white",
  Draft: "bg-slate-500 hover:bg-slate-600 text-white",
};

export const GoalDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const user = useAuthStore((state) => state.user);

  // Real-time WebSocket updates
  useGoalWebSocket(id, user?.id);

  // ── State ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [metricUpdateId, setMetricUpdateId] = useState<string | null>(null);
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);

  // Evidence filters
  const [evidenceSearch, setEvidenceSearch] = useState("");
  const [evidenceTypeFilter, setEvidenceTypeFilter] = useState<
    EvidenceType | ""
  >("");
  const [evidenceStatusFilter, setEvidenceStatusFilter] = useState("");

  // ── New Metric Form ────────────────────────────────
  const [newMetric, setNewMetric] = useState<GoalMetricCreateRequest>({
    name: "",
    metric_type: "Numeric",
    unit: "",
    baseline_value: 0,
    target_value: 100,
    weight: 1,
    formula: "",
  });

  // ── Evidence filter (debounced via memo) ──────────
  const evidenceFilter: EvidenceFilter = useMemo(() => {
    const f: EvidenceFilter = {};
    if (evidenceSearch.trim()) f.search = evidenceSearch.trim();
    if (evidenceTypeFilter) f.evidence_type = evidenceTypeFilter;
    if (evidenceStatusFilter) f.status = evidenceStatusFilter;
    return f;
  }, [evidenceSearch, evidenceTypeFilter, evidenceStatusFilter]);

  // ── Queries ────────────────────────────────────────
  const { data: goalData, isLoading, error } = useGoal(id!);
  const { data: evidenceData, isLoading: evidenceLoading } = useGoalEvidences(
    id!,
    evidenceFilter,
  );

  // ── Check-in state ─────────────────────────────────
  const [checkInPage, setCheckInPage] = useState(1);

  // ── Comment state ─────────────────────────────────
  const [commentText, setCommentText] = useState("");
  const [commentPage, setCommentPage] = useState(1);

  // ── Activity state ────────────────────────────────
  const [activityPage, setActivityPage] = useState(1);

  // ── Mutations ──────────────────────────────────────
  const transitionGoal = useTransitionGoal();
  const deleteGoal = useDeleteGoal();
  const cloneGoal = useCloneGoal();
  const createMetric = useCreateMetric();
  const deleteMetric = useDeleteMetric();
  const deleteEvidence = useDeleteEvidence();
  const createCheckIn = useCreateCheckIn();
  const deleteCheckIn = useDeleteCheckIn();

  // ── Check-in queries ────────────────────────────────
  const { data: checkInData, isLoading: checkInsLoading } = useGoalCheckIns(
    id!,
    checkInPage,
  );

  // ── Comment queries & mutations ───────────────────
  const { data: commentData, isLoading: commentsLoading } = useGoalComments(
    id!,
    commentPage,
  );
  const addComment = useAddGoalComment();
  const deleteComment = useDeleteGoalComment();

  // ── Activity queries ──────────────────────────────
  const { data: activityData, isLoading: activityLoading } = useGoalActivity(
    id!,
    activityPage,
  );

  // ── Derived ────────────────────────────────────────
  const goal = goalData?.data;
  const evidences = evidenceData?.data ?? [];
  const canEdit = hasPermission(PERMISSIONS.GOALS_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.GOALS_DELETE);
  const metricToUpdate = metricUpdateId
    ? (goal?.metrics?.find((m: GoalMetric) => m.id === metricUpdateId) ?? null)
    : null;

  // ── Helpers ────────────────────────────────────────
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const ownerName = goal?.owner
    ? `${goal.owner.first_name} ${goal.owner.last_name}`.trim()
    : t("goals.detail.unassigned");

  // ── Handlers ───────────────────────────────────────
  const handleTransition = async (nextStatus: GoalStatus) => {
    if (!id) return;
    try {
      await transitionGoal.mutateAsync({ id, data: { status: nextStatus } });
    } catch {
      // Toast handled by hook
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteGoal.mutateAsync(id);
      navigate("/goals");
    } catch {
      // Toast handled by hook
    }
  };

  const handleCreateMetric = async () => {
    if (!id || !newMetric.name.trim()) {
      toast.error(t("goals.detail.metrics.nameRequired"));
      return;
    }
    try {
      await createMetric.mutateAsync({ goalId: id, data: newMetric });
      setShowAddMetric(false);
      setNewMetric({
        name: "",
        metric_type: "Numeric",
        unit: "",
        baseline_value: 0,
        target_value: 100,
        weight: 1,
        formula: "",
      });
    } catch {
      // Toast handled by hook
    }
  };

  const handleDeleteMetric = async (metricId: string) => {
    if (!window.confirm(t("goals.detail.deleteMetricConfirm"))) return;
    try {
      await deleteMetric.mutateAsync(metricId);
    } catch {
      // Toast handled by hook
    }
  };

  const handleDeleteEvidence = useCallback(
    async (evidenceId: string) => {
      if (!window.confirm(t("goals.detail.deleteEvidenceConfirm"))) return;
      try {
        await deleteEvidence.mutateAsync(evidenceId);
      } catch {
        // Toast handled by hook
      }
    },
    [deleteEvidence, t],
  );

  // ── Loading / Error ────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
          <AlertTriangle className="w-12 h-12 mb-4 text-red-400" />
          <p className="text-lg font-medium">{t("goals.notFound")}</p>
          <Link
            to="/goals"
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {t("goals.backToGoals")}
          </Link>
        </div>
      </div>
    );
  }

  const validTransitions = VALID_GOAL_TRANSITIONS[goal.status] ?? [];

  // ── Tab Definitions ────────────────────────────────
  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    {
      key: "overview",
      label: t("goals.detail.tabs.overview"),
      icon: <Target className="w-4 h-4" />,
    },
    {
      key: "metrics",
      label: t("goals.detail.tabs.metrics"),
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      key: "evidence",
      label: t("goals.detail.tabs.evidence"),
      icon: <FileText className="w-4 h-4" />,
    },
    {
      key: "collaborators",
      label: t("goals.detail.tabs.collaborators"),
      icon: <Users className="w-4 h-4" />,
    },
    {
      key: "check-ins",
      label: t("goals.detail.tabs.checkIns"),
      icon: <ClipboardCheck className="w-4 h-4" />,
    },
    {
      key: "comments",
      label: t("goals.detail.tabs.comments"),
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      key: "activity",
      label: t("goals.detail.tabs.activity"),
      icon: <History className="w-4 h-4" />,
    },
  ];

  // ── Render ─────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Back Link + Parent Breadcrumb ──────────── */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          to="/goals"
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:-rotate-180" />
          {t("goals.title")}
        </Link>
        {goal?.parent_goal && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 rtl:-rotate-180" />
            <Link
              to={`/goals/${goal.parent_goal.id}`}
              className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
            >
              {goal.parent_goal.title}
            </Link>
          </>
        )}
      </div>

      {/* ── Header ────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                {goal.title}
              </h1>
              <GoalStatusBadge status={goal.status} />
              <GoalPriorityBadge priority={goal.priority} />
            </div>
            {goal.category && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("goals.detail.categoryLabel", { name: goal.category })}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status transitions */}
            {validTransitions.map((nextStatus) => (
              <button
                key={nextStatus}
                onClick={() => handleTransition(nextStatus)}
                disabled={transitionGoal.isPending}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${TRANSITION_BUTTON_STYLES[nextStatus] ?? "bg-slate-600 hover:bg-slate-700 text-white"}`}
              >
                {GOAL_STATUS_LABELS[nextStatus]}
              </button>
            ))}

            {canEdit && (
              <button
                onClick={() => setShowCloneModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                <Copy className="w-4 h-4" />
                {t("goals.detail.clone")}
              </button>
            )}

            {canEdit && (
              <Link
                to={`/goals/${goal.id}/edit`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                {t("common.edit")}
              </Link>
            )}

            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t("common.delete")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ─────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t("goals.detail.deleteTitle")}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {t("goals.detail.deleteConfirm", { title: goal.title })}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteGoal.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleteGoal.isPending
                  ? t("goals.detail.deleting")
                  : t("goals.detail.deleteTitle")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Goal Info Card ────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("goals.detail.overview.owner")}
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {ownerName}
              </p>
            </div>
          </div>
          {goal.department && (
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("goals.detail.overview.department")}
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {goal.department.name}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20">
              <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("goals.detail.overview.targetDate")}
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {formatDate(goal.target_date)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("goals.detail.overview.progress")}
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-white tabular-nums">
                {Math.round(goal.progress)}%
              </p>
            </div>
          </div>
        </div>
        <GoalProgressBar progress={goal.progress} size="lg" />
      </div>

      {/* ── Tabs ──────────────────────────────────── */}
      <div className="border-b border-slate-200 dark:border-slate-700/60">
        <nav className="flex gap-1 -mb-px" aria-label={t("goals.goalTabs")}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab Content ───────────────────────────── */}

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Description */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t("goals.detail.overview.description")}
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {goal.description || t("goals.detail.overview.noDescription")}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t("goals.detail.overview.details")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {t("goals.detail.overview.status")}
                </p>
                <GoalStatusBadge status={goal.status} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {t("goals.detail.overview.priority")}
                </p>
                <GoalPriorityBadge priority={goal.priority} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {t("goals.detail.overview.category")}
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {goal.category || "--"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {t("goals.detail.overview.owner")}
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {ownerName}
                </p>
              </div>
              {goal.department && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    {t("goals.detail.overview.department")}
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {goal.department.name}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {t("goals.detail.overview.startDate")}
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatDate(goal.start_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {t("goals.detail.overview.targetDate")}
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatDate(goal.target_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {t("goals.detail.overview.reviewDate")}
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatDate(goal.review_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {t("goals.detail.overview.evidenceCount")}
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white tabular-nums">
                  {goal.evidence_count}
                </p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t("goals.detail.overview.timeline")}
            </h2>
            <div className="flex items-center gap-8 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>
                  {t("goals.detail.overview.created", {
                    date: formatDate(goal.created_at),
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>
                  {t("goals.detail.overview.updated", {
                    date: formatDate(goal.updated_at),
                  })}
                </span>
              </div>
              {goal.created_by && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>
                    {t("goals.detail.overview.createdBy", {
                      name: `${goal.created_by.first_name} ${goal.created_by.last_name}`,
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Child Goals (Hierarchy) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                {t("goals.detail.overview.childGoals", {
                  count: goal.children?.length ?? 0,
                })}
              </h2>
              {canEdit && (
                <Link
                  to={`/goals/new?parent=${goal.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t("goals.detail.overview.addChild")}
                </Link>
              )}
            </div>
            <GoalHierarchyTree
              children={goal.children ?? []}
              parentId={goal.id}
            />
          </div>
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === "metrics" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t("goals.detail.metrics.heading", {
                count: goal.metrics?.length ?? 0,
              })}
            </h2>
            {canEdit && (
              <button
                onClick={() => setShowAddMetric(!showAddMetric)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t("goals.detail.metrics.addMetric")}
              </button>
            )}
          </div>

          {/* Add Metric Form */}
          {showAddMetric && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                {t("goals.detail.metrics.newMetric")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t("goals.detail.metrics.nameLabel")}
                  </label>
                  <input
                    type="text"
                    value={newMetric.name}
                    onChange={(e) =>
                      setNewMetric({ ...newMetric, name: e.target.value })
                    }
                    placeholder={t("goals.detail.metrics.namePlaceholder")}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t("goals.detail.metrics.typeLabel")}
                  </label>
                  <select
                    value={newMetric.metric_type}
                    onChange={(e) =>
                      setNewMetric({
                        ...newMetric,
                        metric_type: e.target.value as MetricType,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {METRIC_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t("goals.detail.metrics.unitLabel")}
                  </label>
                  <input
                    type="text"
                    value={newMetric.unit ?? ""}
                    onChange={(e) =>
                      setNewMetric({ ...newMetric, unit: e.target.value })
                    }
                    placeholder={t("goals.detail.metrics.unitPlaceholder")}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t("goals.detail.metrics.baselineLabel")}
                  </label>
                  <input
                    type="number"
                    value={newMetric.baseline_value ?? 0}
                    onChange={(e) =>
                      setNewMetric({
                        ...newMetric,
                        baseline_value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t("goals.detail.metrics.targetValueLabel")}
                  </label>
                  <input
                    type="number"
                    value={newMetric.target_value}
                    onChange={(e) =>
                      setNewMetric({
                        ...newMetric,
                        target_value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t("goals.detail.metrics.weightLabel")}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newMetric.weight ?? 1}
                    onChange={(e) =>
                      setNewMetric({
                        ...newMetric,
                        weight: parseFloat(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Formula (optional) — computed value from sibling metrics.
                  When set, the current value is derived automatically; manual
                  value updates are ignored in favor of the formula. */}
              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("goals.detail.metrics.formulaLabel")}{" "}
                  <span className="text-slate-400 font-normal">
                    {t("goals.detail.metrics.formulaOptional")}
                  </span>
                </label>
                <textarea
                  rows={2}
                  value={newMetric.formula ?? ""}
                  onChange={(e) =>
                    setNewMetric({ ...newMetric, formula: e.target.value })
                  }
                  placeholder={t("goals.detail.metrics.formulaPlaceholder")}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {t("goals.referenceOtherMetricsWith")}
                  <code className="font-mono text-[10px] bg-slate-100 dark:bg-slate-700 px-1 rounded">{`\${metric_name}`}</code>
                  {t("goals.helpers")}
                  <code className="font-mono text-[10px] bg-slate-100 dark:bg-slate-700 px-1 rounded">
                    min
                  </code>
                  ,{" "}
                  <code className="font-mono text-[10px] bg-slate-100 dark:bg-slate-700 px-1 rounded">
                    max
                  </code>
                  ,{" "}
                  <code className="font-mono text-[10px] bg-slate-100 dark:bg-slate-700 px-1 rounded">
                    abs
                  </code>
                  ,{" "}
                  <code className="font-mono text-[10px] bg-slate-100 dark:bg-slate-700 px-1 rounded">
                    round
                  </code>
                  ,{" "}
                  <code className="font-mono text-[10px] bg-slate-100 dark:bg-slate-700 px-1 rounded">
                    pow
                  </code>
                  .
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60">
                <button
                  onClick={() => setShowAddMetric(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleCreateMetric}
                  disabled={createMetric.isPending || !newMetric.name.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {createMetric.isPending
                    ? t("goals.detail.metrics.creating")
                    : t("goals.detail.metrics.create")}
                </button>
              </div>
            </div>
          )}

          {/* Metric Cards */}
          {goal.metrics && goal.metrics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goal.metrics.map((metric: GoalMetric) => (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                  onUpdateValue={(metricId) => setMetricUpdateId(metricId)}
                  onDelete={canEdit ? handleDeleteMetric : undefined}
                  canEdit={canEdit}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-12 text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("goals.detail.metrics.empty")}
              </p>
              {canEdit && (
                <button
                  onClick={() => setShowAddMetric(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t("goals.detail.metrics.addFirst")}
                </button>
              )}
            </div>
          )}

          {/* Metric Value Update Modal */}
          {metricToUpdate && (
            <MetricValueUpdateModal
              metric={metricToUpdate}
              isOpen={!!metricUpdateId}
              onClose={() => setMetricUpdateId(null)}
              goalId={id!}
            />
          )}
        </div>
      )}

      {/* Evidence Tab */}
      {activeTab === "evidence" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t("goals.detail.evidence.heading", {
                count: evidenceData?.total ?? 0,
              })}
            </h2>
            <button
              onClick={() => setShowEvidenceUpload(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              {t("goals.detail.evidence.upload")}
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={evidenceSearch}
                  onChange={(e) => setEvidenceSearch(e.target.value)}
                  placeholder={t("goals.detail.evidence.searchPlaceholder")}
                  className="w-full ltr:pl-9 rtl:pr-9 ltr:pr-3 rtl:pl-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {/* Type filter */}
              <select
                value={evidenceTypeFilter}
                onChange={(e) =>
                  setEvidenceTypeFilter(e.target.value as EvidenceType | "")
                }
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t("goals.detail.evidence.allTypes")}</option>
                {EVIDENCE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {/* Status filter */}
              <select
                value={evidenceStatusFilter}
                onChange={(e) => setEvidenceStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">
                  {t("goals.detail.evidence.allStatuses")}
                </option>
                <option value="draft">
                  {t("goals.detail.evidence.statusDraft")}
                </option>
                <option value="submitted">
                  {t("goals.detail.evidence.statusSubmitted")}
                </option>
                <option value="l1_review">
                  {t("goals.detail.evidence.statusL1Review")}
                </option>
                <option value="l2_review">
                  {t("goals.detail.evidence.statusL2Review")}
                </option>
                <option value="approved">
                  {t("goals.detail.evidence.statusApproved")}
                </option>
                <option value="rejected">
                  {t("goals.detail.evidence.statusRejected")}
                </option>
                <option value="changes_requested">
                  {t("goals.detail.evidence.statusChangesRequested")}
                </option>
              </select>
            </div>
          </div>

          {/* Evidence List */}
          {evidenceLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : evidences.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evidences.map((evidence) => (
                <EvidenceCard
                  key={evidence.id}
                  evidence={evidence}
                  onDelete={canEdit ? handleDeleteEvidence : undefined}
                  canEdit={canEdit}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {evidenceSearch || evidenceTypeFilter || evidenceStatusFilter
                  ? t("goals.detail.evidence.noneMatching")
                  : t("goals.detail.evidence.empty")}
              </p>
              {!evidenceSearch &&
                !evidenceTypeFilter &&
                !evidenceStatusFilter && (
                  <button
                    onClick={() => setShowEvidenceUpload(true)}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {t("goals.detail.evidence.uploadFirst")}
                  </button>
                )}
            </div>
          )}

          {/* Evidence Upload Modal */}
          <EvidenceUploadModal
            goalId={id!}
            isOpen={showEvidenceUpload}
            onClose={() => setShowEvidenceUpload(false)}
            metrics={goal.metrics}
          />
        </div>
      )}

      {/* Collaborators Tab */}
      {activeTab === "collaborators" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t("goals.detail.collaborators.heading")}
            </h2>
            <CollaboratorPicker
              goalId={id!}
              existingCollaborators={goal.collaborators ?? []}
            />
          </div>
        </div>
      )}

      {/* Check-ins Tab */}
      {activeTab === "check-ins" && (
        <div className="space-y-6">
          {/* Check-in Form */}
          {canEdit && (
            <CheckInForm
              metrics={goal.metrics}
              isPending={createCheckIn.isPending}
              onSubmit={(data: CheckInCreateRequest) => {
                createCheckIn.mutate({ goalId: id!, data });
              }}
            />
          )}

          {/* Check-in List */}
          {checkInsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (checkInData?.data ?? []).length > 0 ? (
            <div className="space-y-4">
              {(checkInData?.data ?? []).map((checkIn) => (
                <CheckInCard
                  key={checkIn.id}
                  checkIn={checkIn}
                  onDelete={
                    canEdit
                      ? (checkInId) => {
                          if (
                            window.confirm(
                              t("goals.detail.deleteCheckInConfirm"),
                            )
                          ) {
                            deleteCheckIn.mutate(checkInId);
                          }
                        }
                      : undefined
                  }
                  canEdit={canEdit}
                />
              ))}

              {/* Pagination */}
              {checkInData && checkInData.total > 10 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setCheckInPage((p) => Math.max(1, p - 1))}
                    disabled={checkInPage <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {t("common.previous")}
                  </button>
                  <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                    {t("goals.pageOf", {
                      current: checkInPage,
                      total: Math.ceil(checkInData.total / 10),
                    })}
                  </span>
                  <button
                    onClick={() => setCheckInPage((p) => p + 1)}
                    disabled={checkInPage >= Math.ceil(checkInData.total / 10)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {t("common.next")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-12 text-center">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("goals.detail.checkIns.empty")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Comments Tab */}
      {activeTab === "comments" && (
        <div className="space-y-6">
          {/* Add Comment */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t("goals.detail.comments.addHeading")}
            </h2>
            <div className="space-y-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t("goals.detail.comments.placeholder")}
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-end">
                <button
                  onClick={async () => {
                    if (!commentText.trim()) {
                      toast.error(t("goals.detail.comments.cannotBeEmpty"));
                      return;
                    }
                    try {
                      await addComment.mutateAsync({
                        goalId: id!,
                        content: commentText.trim(),
                      });
                      setCommentText("");
                    } catch {
                      // Toast handled by hook
                    }
                  }}
                  disabled={addComment.isPending || !commentText.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {addComment.isPending
                    ? t("goals.detail.comments.posting")
                    : t("goals.detail.comments.submit")}
                </button>
              </div>
            </div>
          </div>

          {/* Comment List */}
          {commentsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (commentData?.data ?? []).length > 0 ? (
            <div className="space-y-4">
              {(commentData?.data ?? []).map((comment) => {
                const authorName = comment.author
                  ? `${comment.author.first_name} ${comment.author.last_name}`.trim()
                  : t("goals.detail.comments.unknown");
                const initial = authorName.charAt(0).toUpperCase();
                const isOwn = comment.author?.id === user?.id;
                const relativeTime = (() => {
                  const diff =
                    Date.now() - new Date(comment.created_at).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 1) return t("goals.detail.comments.justNow");
                  if (mins < 60)
                    return t("goals.detail.comments.minutesAgo", {
                      count: mins,
                    });
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24)
                    return t("goals.detail.comments.hoursAgo", { count: hrs });
                  const days = Math.floor(hrs / 24);
                  return t("goals.detail.comments.daysAgo", { count: days });
                })();

                return (
                  <div
                    key={comment.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {initial}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {authorName}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {relativeTime}
                            </span>
                          </div>
                          {isOwn && (
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    t("goals.detail.deleteCommentConfirm"),
                                  )
                                ) {
                                  deleteComment.mutate(comment.id);
                                }
                              }}
                              className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                              title={t("goals.detail.comments.deleteTitle")}
                              aria-label={t(
                                "goals.detail.comments.deleteTitle",
                              )}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {commentData && commentData.total > 20 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setCommentPage((p) => Math.max(1, p - 1))}
                    disabled={commentPage <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {t("common.previous")}
                  </button>
                  <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                    {t("goals.pageOf", {
                      current: commentPage,
                      total: Math.ceil(commentData.total / 20),
                    })}
                  </span>
                  <button
                    onClick={() => setCommentPage((p) => p + 1)}
                    disabled={commentPage >= Math.ceil(commentData.total / 20)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {t("common.next")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("goals.detail.comments.empty")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === "activity" && (
        <div className="space-y-6">
          {activityLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (activityData?.data ?? []).length > 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                {t("goals.detail.activity.heading")}
              </h2>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700/60" />

                <div className="space-y-6">
                  {(activityData?.data ?? []).map((entry) => {
                    const actionColors: Record<string, string> = {
                      create:
                        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                      update:
                        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                      delete:
                        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                      transition:
                        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                      view: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400",
                    };
                    const colorClass =
                      actionColors[entry.action?.toLowerCase()] ??
                      actionColors.view;
                    const userName = entry.user
                      ? `${entry.user.first_name} ${entry.user.last_name}`.trim()
                      : t("goals.detail.activity.system");
                    const timestamp = new Date(entry.created_at).toLocaleString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      },
                    );

                    return (
                      <div key={entry.id} className="relative pl-10">
                        {/* Timeline dot */}
                        <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 bg-slate-400 dark:bg-slate-500 z-10" />

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${colorClass}`}
                          >
                            {entry.action}
                          </span>
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {entry.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {userName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timestamp}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pagination */}
              {activityData && activityData.total > 20 && (
                <div className="flex items-center justify-center gap-2 pt-6 mt-6 border-t border-slate-200 dark:border-slate-700/60">
                  <button
                    onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                    disabled={activityPage <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {t("common.previous")}
                  </button>
                  <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                    {t("goals.pageOf", {
                      current: activityPage,
                      total: Math.ceil(activityData.total / 20),
                    })}
                  </span>
                  <button
                    onClick={() => setActivityPage((p) => p + 1)}
                    disabled={
                      activityPage >= Math.ceil(activityData.total / 20)
                    }
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {t("common.next")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-12 text-center">
              <History className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("goals.detail.activity.empty")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Clone Modal ─────────────────────────────── */}
      {goal && (
        <GoalCloneModal
          goal={goal}
          isOpen={showCloneModal}
          onClose={() => setShowCloneModal(false)}
          isLoading={cloneGoal.isPending}
          onClone={async (data) => {
            const result = await cloneGoal.mutateAsync({ id: goal.id, data });
            setShowCloneModal(false);
            if (result?.data?.id) {
              navigate(`/goals/${result.data.id}`);
            }
          }}
        />
      )}
    </div>
  );
};

export default GoalDetailPage;
