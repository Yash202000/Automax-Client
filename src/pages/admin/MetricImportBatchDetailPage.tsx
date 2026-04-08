import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  FileSpreadsheet,
  Loader2,
  Trash2,
  Send,
  ArrowRight,
  User,
  MessageSquare,
} from "lucide-react";
import {
  useMetricImportBatch,
  useMetricBatchTransitions,
  useExecuteMetricBatchTransition,
  useMetricBatchTransitionHistory,
  useDeleteMetricImportBatch,
} from "../../hooks/useGoals";
import type {
  MetricImportBatch,
  MetricImportItem,
  AvailableTransition,
  MetricImportBatchTransitionHistory,
} from "../../types/goal";
import { useAuthStore } from "../../stores/authStore";
import { useGoalWebSocket } from "../../lib/services/goalWebSocket";

// ── Helpers ────────────────────────────────────────────

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Draft: {
    bg: "bg-slate-100 dark:bg-slate-700/50",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-300 dark:border-slate-600",
  },
  Submitted: {
    bg: "bg-blue-50 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-300 dark:border-blue-700",
  },
  In_Review: {
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-300 dark:border-amber-700",
  },
  Approved: {
    bg: "bg-green-50 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-300 dark:border-green-700",
  },
  Rejected: {
    bg: "bg-red-50 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-300 dark:border-red-700",
  },
  Changes_Requested: {
    bg: "bg-orange-50 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-300 dark:border-orange-700",
  },
};

const getStatusColors = (status: string) =>
  STATUS_COLORS[status] ?? STATUS_COLORS.Draft;

const getTransitionButtonStyle = (code: string): string => {
  if (code.startsWith("approve")) {
    return "bg-green-600 hover:bg-green-700 text-white";
  }
  if (code.startsWith("reject")) {
    return "bg-red-600 hover:bg-red-700 text-white";
  }
  if (code.startsWith("request_changes")) {
    return "bg-amber-500 hover:bg-amber-600 text-white";
  }
  if (code.startsWith("submit") || code.startsWith("resubmit")) {
    return "bg-blue-600 hover:bg-blue-700 text-white";
  }
  return "bg-slate-600 hover:bg-slate-700 text-white";
};

const getUserName = (user?: { first_name: string; last_name: string }): string => {
  if (!user) return "System";
  return `${user.first_name} ${user.last_name}`.trim() || "Unknown";
};

// ── Sub-components ─────────────────────────────────────

const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors = getStatusColors(status);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
};

const StateBadgeFromColor: React.FC<{ name: string; color: string }> = ({
  name,
  color,
}) => (
  <span
    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    style={{
      backgroundColor: `${color}20`,
      color: color,
      border: `1px solid ${color}40`,
    }}
  >
    {name}
  </span>
);

const InfoPill: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700/60">
    <span className="text-slate-400 dark:text-slate-500">{icon}</span>
    <span className="text-xs text-slate-500 dark:text-slate-400">{label}:</span>
    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
      {value}
    </span>
  </div>
);

// ── Confirmation Dialog ────────────────────────────────

const TransitionDialog: React.FC<{
  transition: AvailableTransition;
  isExecuting: boolean;
  onConfirm: (comment: string) => void;
  onCancel: () => void;
}> = ({ transition, isExecuting, onConfirm, onCancel }) => {
  const [comment, setComment] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 shadow-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Confirm: {transition.transition.name}
        </h3>
        {transition.transition.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {transition.transition.description}
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Comment (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Add a comment..."
          />
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isExecuting}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(comment)}
            disabled={isExecuting}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${getTransitionButtonStyle(transition.transition.code)}`}
          >
            {isExecuting && <Loader2 className="w-4 h-4 animate-spin" />}
            {transition.transition.name}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Delete Confirmation Dialog ─────────────────────────

const DeleteDialog: React.FC<{
  batchTitle: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ batchTitle, isDeleting, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div
      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    />
    <div className="relative w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 shadow-xl p-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
        Delete Import Batch
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Are you sure you want to delete <strong>"{batchTitle}"</strong>? This action
        cannot be undone.
      </p>
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isDeleting}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ── Items Table ────────────────────────────────────────

const ItemsTable: React.FC<{ items: MetricImportItem[] }> = ({ items }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700/60">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        Import Items
      </h2>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Goal Title
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Metric Name
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Type
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Unit
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Old Value
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              New Value
            </th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Applied
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
              <td className="px-4 py-3">
                <Link
                  to={`/goals/${item.goal_id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                >
                  {item.goal_title}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                {item.metric_name}
              </td>
              <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                {item.metric_type}
              </td>
              <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                {item.unit || "\u2014"}
              </td>
              <td className="px-4 py-3 text-sm text-right text-slate-700 dark:text-slate-300 tabular-nums">
                {item.old_value}
              </td>
              <td className="px-4 py-3 text-sm text-right text-slate-700 dark:text-slate-300 tabular-nums">
                {item.new_value}
              </td>
              <td className="px-4 py-3 text-center">
                {item.applied ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                ) : (
                  <span className="text-slate-300 dark:text-slate-600 text-lg">
                    &mdash;
                  </span>
                )}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
              >
                No import items found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// ── Transition History Timeline ────────────────────────

const TransitionTimeline: React.FC<{
  history: MetricImportBatchTransitionHistory[];
}> = ({ history }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700/60">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        Transition History
      </h2>
    </div>
    {history.length === 0 ? (
      <div className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
        No transitions recorded yet.
      </div>
    ) : (
      <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
        {history.map((entry) => (
          <div key={entry.id} className="px-5 py-4 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <StateBadgeFromColor
                name={entry.from_state_name}
                color={entry.from_state_color}
              />
              <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <StateBadgeFromColor
                name={entry.to_state_name}
                color={entry.to_state_color}
              />
              <span className="text-xs text-slate-400 dark:text-slate-500 mx-1">
                &middot;
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {entry.transition_name}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {entry.is_system_action ? (
                  <em className="text-slate-400 dark:text-slate-500">System</em>
                ) : (
                  getUserName(entry.performed_by)
                )}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="tabular-nums">
                  {formatDateTime(entry.transitioned_at)}
                </span>
              </span>
            </div>
            {entry.comment && (
              <div className="flex items-start gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
                <span>{entry.comment}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

// ── Main Component ─────────────────────────────────────

export const MetricImportBatchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // ── State ──────────────────────────────────────────
  const [selectedTransition, setSelectedTransition] =
    useState<AvailableTransition | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ── Queries ────────────────────────────────────────
  const { data: batchData, isLoading: batchLoading } = useMetricImportBatch(
    id ?? "",
  );
  const { data: transitionsData } = useMetricBatchTransitions(id ?? "");
  const { data: historyData } = useMetricBatchTransitionHistory(id ?? "");

  // ── Mutations ──────────────────────────────────────
  const executeTransition = useExecuteMetricBatchTransition();
  const deleteBatch = useDeleteMetricImportBatch();

  // ── Derived ────────────────────────────────────────
  const batch: MetricImportBatch | undefined = batchData?.data;
  const transitions: AvailableTransition[] = transitionsData?.data ?? [];
  const history: MetricImportBatchTransitionHistory[] = historyData?.data ?? [];
  const items: MetricImportItem[] = batch?.items ?? [];

  // Real-time WebSocket updates
  useGoalWebSocket(batch?.primary_goal_id, user?.id);

  // ── Handlers ───────────────────────────────────────
  const handleExecuteTransition = (comment: string) => {
    if (!selectedTransition || !batch || !id) return;

    executeTransition.mutate(
      {
        batchId: id,
        data: {
          transition_id: selectedTransition.transition.id,
          comment: comment || undefined,
          version: batch.version,
        },
      },
      {
        onSuccess: () => {
          setSelectedTransition(null);
        },
      },
    );
  };

  const handleDelete = () => {
    if (!id) return;

    deleteBatch.mutate(id, {
      onSuccess: () => {
        navigate("/goals/metric-batches");
      },
    });
  };

  // ── Loading ────────────────────────────────────────
  if (batchLoading) {
    return (
      <div className="animate-fade-in">
        <LoadingState />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="animate-fade-in space-y-6">
        <Link
          to="/goals/metric-batches"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Metric Batches
        </Link>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-12 text-center">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Import batch not found.
          </p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Back Link ─────────────────────────────── */}
      <Link
        to="/goals/metric-batches"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Metric Batches
      </Link>

      {/* ── Header ────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {batch.title}
            </h1>
            <StatusBadge status={batch.status} />
            {batch.current_state && (
              <StateBadgeFromColor
                name={batch.current_state.name}
                color={batch.current_state.color}
              />
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <InfoPill
              icon={<User className="w-3.5 h-3.5" />}
              label="Imported By"
              value={getUserName(batch.imported_by)}
            />
            <InfoPill
              icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
              label="File"
              value={batch.file_name}
            />
            <InfoPill
              icon={<Clock className="w-3.5 h-3.5" />}
              label="Created"
              value={formatDate(batch.created_at)}
            />
            <InfoPill
              icon={<Send className="w-3.5 h-3.5" />}
              label="Items"
              value={String(batch.item_count)}
            />
            <InfoPill
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              label="Goals"
              value={String(batch.goal_count)}
            />
          </div>
        </div>

        {/* ── Actions ──────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          {transitions.map((t) => {
            const disabled = !t.can_execute;
            return (
              <div key={t.transition.id} className="relative group">
                <button
                  onClick={() => !disabled && setSelectedTransition(t)}
                  disabled={disabled}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getTransitionButtonStyle(t.transition.code)}`}
                >
                  {t.transition.name}
                </button>
                {disabled && t.reason && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="px-3 py-1.5 text-xs text-white bg-slate-900 dark:bg-slate-700 rounded-lg shadow-lg whitespace-nowrap">
                      {t.reason}
                    </div>
                    <div className="w-2 h-2 bg-slate-900 dark:bg-slate-700 rotate-45 mx-auto -mt-1" />
                  </div>
                )}
              </div>
            );
          })}
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-red-200 dark:border-red-800/50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* ── Comment ────────────────────────────────── */}
      {batch.comment && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 px-5 py-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {batch.comment}
          </p>
        </div>
      )}

      {/* ── Items Table ────────────────────────────── */}
      <ItemsTable items={items} />

      {/* ── Transition History ─────────────────────── */}
      <TransitionTimeline history={history} />

      {/* ── Transition Confirmation Dialog ─────────── */}
      {selectedTransition && (
        <TransitionDialog
          transition={selectedTransition}
          isExecuting={executeTransition.isPending}
          onConfirm={handleExecuteTransition}
          onCancel={() => setSelectedTransition(null)}
        />
      )}

      {/* ── Delete Confirmation Dialog ─────────────── */}
      {showDeleteDialog && (
        <DeleteDialog
          batchTitle={batch.title}
          isDeleting={deleteBatch.isPending}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  );
};

export default MetricImportBatchDetailPage;
