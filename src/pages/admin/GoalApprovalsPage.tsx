import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
  FileText,
  Inbox,
} from "lucide-react";
import {
  usePendingApprovals,
  useCompletedApprovals,
  useEvidenceTransitions,
} from "../../hooks/useGoals";
import type { ApprovalListItem } from "../../types/goal";
import { GoalPriorityBadge } from "../../components/goals/GoalPriorityBadge";
import { EvidenceTransitionModal } from "../../components/goals/EvidenceTransitionModal";

type TabType = "pending" | "completed";

// ── Helpers ────────────────────────────────────────────
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getUserName = (item: ApprovalListItem): string => {
  if (item.submitted_by) {
    return `${item.submitted_by.first_name} ${item.submitted_by.last_name}`.trim();
  }
  return "Unknown";
};

// ── Sub-components (outside render) ────────────────────

const ApprovalPagination: React.FC<{
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}> = ({ page, totalPages, total, limit, onPageChange }) => {
  if (totalPages <= 1) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700/60">
      <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
        Showing {startItem} - {endItem} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums px-2">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-12 text-center">
    <Inbox className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
    <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
  </div>
);

const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

const PendingRow: React.FC<{
  item: ApprovalListItem;
  onReview: (item: ApprovalListItem) => void;
}> = ({ item, onReview }) => (
  <tr className="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
    <td className="px-4 py-3">
      <Link
        to={`/goals/${item.goal_id}`}
        className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
      >
        {item.goal_title}
      </Link>
      <div className="mt-0.5">
        <GoalPriorityBadge priority={item.goal_priority} />
      </div>
    </td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {item.evidence_title}
        </span>
      </div>
    </td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {getUserName(item)}
        </span>
      </div>
    </td>
    <td className="px-4 py-3">
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
        style={{
          backgroundColor: `${item.state_color}20`,
          color: item.state_color,
          border: `1px solid ${item.state_color}40`,
        }}
      >
        {item.state_name}
      </span>
    </td>
    <td className="px-4 py-3">
      <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
        {formatDate(item.created_at)}
      </span>
    </td>
    <td className="px-4 py-3">
      <button
        onClick={() => onReview(item)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
      >
        <Eye className="w-3.5 h-3.5" />
        Review
      </button>
    </td>
  </tr>
);

const CompletedRow: React.FC<{ item: ApprovalListItem }> = ({ item }) => (
  <tr className="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
    <td className="px-4 py-3">
      <Link
        to={`/goals/${item.goal_id}`}
        className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
      >
        {item.goal_title}
      </Link>
      <div className="mt-0.5">
        <GoalPriorityBadge priority={item.goal_priority} />
      </div>
    </td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {item.evidence_title}
        </span>
      </div>
    </td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {getUserName(item)}
        </span>
      </div>
    </td>
    <td className="px-4 py-3">
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
        style={{
          backgroundColor: `${item.state_color}20`,
          color: item.state_color,
          border: `1px solid ${item.state_color}40`,
        }}
      >
        {item.state_name}
      </span>
    </td>
    <td className="px-4 py-3">
      <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
        {formatDate(item.updated_at)}
      </span>
    </td>
  </tr>
);

// ── Main Component ─────────────────────────────────────

export const GoalApprovalsPage: React.FC = () => {
  // ── State ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [pendingPage, setPendingPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [reviewItem, setReviewItem] = useState<ApprovalListItem | null>(null);

  const limit = 10;

  // ── Queries ────────────────────────────────────────
  const { data: pendingData, isLoading: pendingLoading } = usePendingApprovals(
    pendingPage,
    limit,
  );

  const { data: completedData, isLoading: completedLoading } =
    useCompletedApprovals(completedPage, limit);

  // Fetch transitions for the selected review item
  const { data: transitionsData } = useEvidenceTransitions(
    reviewItem?.evidence_id ?? "",
  );

  // ── Derived ────────────────────────────────────────
  const pendingApprovals = pendingData?.data ?? [];
  const pendingTotal = pendingData?.total ?? 0;
  const pendingTotalPages = Math.ceil(pendingTotal / limit);

  const completedApprovals = completedData?.data ?? [];
  const completedTotal = completedData?.total ?? 0;
  const completedTotalPages = Math.ceil(completedTotal / limit);

  const transitions = transitionsData?.data ?? [];

  // ── Tab Definitions ────────────────────────────────
  const tabs: {
    key: TabType;
    label: string;
    icon: React.ReactNode;
    count: number;
  }[] = [
    {
      key: "pending",
      label: "Pending",
      icon: <Clock className="w-4 h-4" />,
      count: pendingTotal,
    },
    {
      key: "completed",
      label: "Completed",
      icon: <CheckCircle2 className="w-4 h-4" />,
      count: completedTotal,
    },
  ];

  // ── Render ─────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Goal Approvals
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review and manage evidence approval requests
          </p>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────── */}
      <div className="border-b border-slate-200 dark:border-slate-700/60">
        <nav className="flex gap-1 -mb-px" aria-label="Approval tabs">
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
              {tab.count > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-medium tabular-nums ${
                    activeTab === tab.key
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Pending Tab ───────────────────────────── */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {pendingLoading ? (
            <LoadingState />
          ) : pendingApprovals.length === 0 ? (
            <EmptyState message="No pending approvals. You're all caught up!" />
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Goal
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Evidence
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Submitted By
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        State
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingApprovals.map((item) => (
                      <PendingRow
                        key={item.id}
                        item={item}
                        onReview={setReviewItem}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3">
                <ApprovalPagination
                  page={pendingPage}
                  totalPages={pendingTotalPages}
                  total={pendingTotal}
                  limit={limit}
                  onPageChange={setPendingPage}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Completed Tab ─────────────────────────── */}
      {activeTab === "completed" && (
        <div className="space-y-4">
          {completedLoading ? (
            <LoadingState />
          ) : completedApprovals.length === 0 ? (
            <EmptyState message="No completed approvals yet." />
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Goal
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Evidence
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Submitted By
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Result
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedApprovals.map((item) => (
                      <CompletedRow key={item.id} item={item} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3">
                <ApprovalPagination
                  page={completedPage}
                  totalPages={completedTotalPages}
                  total={completedTotal}
                  limit={limit}
                  onPageChange={setCompletedPage}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Transition Modal ──────────────────────── */}
      {reviewItem && (
        <EvidenceTransitionModal
          evidenceId={reviewItem.evidence_id}
          evidenceTitle={reviewItem.evidence_title}
          evidenceVersion={reviewItem.evidence_version}
          transitions={transitions}
          isOpen={true}
          onClose={() => setReviewItem(null)}
        />
      )}
    </div>
  );
};

export default GoalApprovalsPage;
