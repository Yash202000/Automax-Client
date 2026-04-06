import React, { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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

type TabType = "overview" | "metrics" | "evidence" | "collaborators" | "check-ins";

const TRANSITION_BUTTON_STYLES: Record<string, string> = {
  Active: "bg-blue-600 hover:bg-blue-700 text-white",
  Under_Review: "bg-amber-600 hover:bg-amber-700 text-white",
  Achieved: "bg-green-600 hover:bg-green-700 text-white",
  Missed: "bg-red-600 hover:bg-red-700 text-white",
  Closed: "bg-slate-600 hover:bg-slate-700 text-white",
  Draft: "bg-slate-500 hover:bg-slate-600 text-white",
};

export const GoalDetailPage: React.FC = () => {
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
    : "Unassigned";

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
      toast.error("Metric name is required");
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
      });
    } catch {
      // Toast handled by hook
    }
  };

  const handleDeleteMetric = async (metricId: string) => {
    if (!window.confirm("Are you sure you want to delete this metric?")) return;
    try {
      await deleteMetric.mutateAsync(metricId);
    } catch {
      // Toast handled by hook
    }
  };

  const handleDeleteEvidence = useCallback(
    async (evidenceId: string) => {
      if (!window.confirm("Are you sure you want to delete this evidence?"))
        return;
      try {
        await deleteEvidence.mutateAsync(evidenceId);
      } catch {
        // Toast handled by hook
      }
    },
    [deleteEvidence],
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
          <p className="text-lg font-medium">Goal not found</p>
          <Link
            to="/goals"
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Back to Goals
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
      label: "Overview",
      icon: <Target className="w-4 h-4" />,
    },
    {
      key: "metrics",
      label: "Metrics",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      key: "evidence",
      label: "Evidence",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      key: "collaborators",
      label: "Collaborators",
      icon: <Users className="w-4 h-4" />,
    },
    {
      key: "check-ins",
      label: "Check-ins",
      icon: <ClipboardCheck className="w-4 h-4" />,
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
          <ArrowLeft className="w-4 h-4" />
          Goals
        </Link>
        {goal?.parent_goal && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
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
                Category: {goal.category}
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
                Clone
              </button>
            )}

            {canEdit && (
              <Link
                to={`/goals/${goal.id}/edit`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </Link>
            )}

            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
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
                Delete Goal
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete &ldquo;{goal.title}&rdquo;? This
              action cannot be undone. All associated metrics, evidence, and
              collaborators will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteGoal.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleteGoal.isPending ? "Deleting..." : "Delete Goal"}
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
                Owner
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
                  Department
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
                Target Date
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
                Progress
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
        <nav className="flex gap-1 -mb-px" aria-label="Goal tabs">
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
              Description
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {goal.description || "No description provided."}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Status
                </p>
                <GoalStatusBadge status={goal.status} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Priority
                </p>
                <GoalPriorityBadge priority={goal.priority} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Category
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {goal.category || "--"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Owner
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {ownerName}
                </p>
              </div>
              {goal.department && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Department
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {goal.department.name}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Start Date
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatDate(goal.start_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Target Date
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatDate(goal.target_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Review Date
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatDate(goal.review_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Evidence Count
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
              Timeline
            </h2>
            <div className="flex items-center gap-8 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Created: {formatDate(goal.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Updated: {formatDate(goal.updated_at)}</span>
              </div>
              {goal.created_by && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>
                    Created by: {goal.created_by.first_name}{" "}
                    {goal.created_by.last_name}
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
                Child Goals ({goal.children?.length ?? 0})
              </h2>
              {canEdit && (
                <Link
                  to={`/goals/new?parent=${goal.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Child
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
              Metrics ({goal.metrics?.length ?? 0})
            </h2>
            {canEdit && (
              <button
                onClick={() => setShowAddMetric(!showAddMetric)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Metric
              </button>
            )}
          </div>

          {/* Add Metric Form */}
          {showAddMetric && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                New Metric
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newMetric.name}
                    onChange={(e) =>
                      setNewMetric({ ...newMetric, name: e.target.value })
                    }
                    placeholder="e.g., Revenue Target"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Type
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
                    Unit
                  </label>
                  <input
                    type="text"
                    value={newMetric.unit ?? ""}
                    onChange={(e) =>
                      setNewMetric({ ...newMetric, unit: e.target.value })
                    }
                    placeholder="e.g., %, USD, items"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Baseline Value
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
                    Target Value *
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
                    Weight
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
              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60">
                <button
                  onClick={() => setShowAddMetric(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMetric}
                  disabled={createMetric.isPending || !newMetric.name.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {createMetric.isPending ? "Creating..." : "Create Metric"}
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
                No metrics defined yet.
              </p>
              {canEdit && (
                <button
                  onClick={() => setShowAddMetric(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add First Metric
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
              Evidence ({evidenceData?.total ?? 0})
            </h2>
            <button
              onClick={() => setShowEvidenceUpload(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Evidence
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={evidenceSearch}
                  onChange={(e) => setEvidenceSearch(e.target.value)}
                  placeholder="Search by title or file name..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <option value="">All Types</option>
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
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="l1_review">L1 Review</option>
                <option value="l2_review">L2 Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="changes_requested">Changes Requested</option>
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
                  ? "No evidence matches your filters."
                  : "No evidence uploaded yet."}
              </p>
              {!evidenceSearch &&
                !evidenceTypeFilter &&
                !evidenceStatusFilter && (
                  <button
                    onClick={() => setShowEvidenceUpload(true)}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Upload First Evidence
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
              Collaborators
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
                              "Are you sure you want to delete this check-in?",
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
                    onClick={() =>
                      setCheckInPage((p) => Math.max(1, p - 1))
                    }
                    disabled={checkInPage <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                    Page {checkInPage} of{" "}
                    {Math.ceil(checkInData.total / 10)}
                  </span>
                  <button
                    onClick={() => setCheckInPage((p) => p + 1)}
                    disabled={
                      checkInPage >= Math.ceil(checkInData.total / 10)
                    }
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-12 text-center">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No check-ins yet. Submit your first progress update above.
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
