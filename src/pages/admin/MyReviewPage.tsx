import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardCheck,
  Star,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Inbox,
} from "lucide-react";
import { useMyReviews, useMyReviewTasks } from "../../hooks/useReviews";
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

type TabType = "my-reviews" | "review-tasks";

export const MyReviewPage: React.FC = () => {
  const [tab, setTab] = useState<TabType>("my-reviews");
  const [reviewPage, setReviewPage] = useState(1);
  const [taskPage, setTaskPage] = useState(1);
  const limit = 20;

  const { data: reviewsData, isLoading: reviewsLoading } = useMyReviews(
    reviewPage,
    limit,
  );
  const { data: tasksData, isLoading: tasksLoading } = useMyReviewTasks(
    taskPage,
    limit,
  );

  const reviews = reviewsData?.data ?? [];
  const reviewsTotal = reviewsData?.total_items ?? 0;
  const reviewsTotalPages = reviewsData?.total_pages ?? 1;

  const tasks = tasksData?.data ?? [];
  const tasksTotal = tasksData?.total_items ?? 0;
  const tasksTotalPages = tasksData?.total_pages ?? 1;

  const isMyReviews = tab === "my-reviews";
  const items = isMyReviews ? reviews : tasks;
  const total = isMyReviews ? reviewsTotal : tasksTotal;
  const totalPages = isMyReviews ? reviewsTotalPages : tasksTotalPages;
  const page = isMyReviews ? reviewPage : taskPage;
  const setPage = isMyReviews ? setReviewPage : setTaskPage;
  const loading = isMyReviews ? reviewsLoading : tasksLoading;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-violet-100 dark:bg-violet-900/40 rounded-xl">
          <ClipboardCheck
            size={22}
            className="text-violet-600 dark:text-violet-400"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            My Reviews
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Reviews where you are being reviewed, or tasks where you review
            others
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg w-fit">
        <button
          onClick={() => setTab("my-reviews")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "my-reviews"
              ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          My Reviews ({reviewsTotal})
        </button>
        <button
          onClick={() => setTab("review-tasks")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "review-tasks"
              ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Review Tasks ({tasksTotal})
        </button>
      </div>

      {/* Card List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-blue-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
            <Inbox size={40} className="mb-3 opacity-50" />
            <p className="text-sm">
              {isMyReviews
                ? "No reviews assigned to you"
                : "No review tasks pending"}
            </p>
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              to={`/goals/reviews/assignments/${item.id}`}
              className="block rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">
                    {item.cycle?.title ?? "Review"}
                  </h3>
                  <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                    {item.cycle && (
                      <span className="flex items-center gap-1">
                        <Calendar size={13} />
                        <span className="tabular-nums">
                          {formatDate(item.cycle.period_start)} –{" "}
                          {formatDate(item.cycle.period_end)}
                        </span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <User size={13} />
                      {isMyReviews
                        ? item.reviewer
                          ? `Reviewer: ${item.reviewer.first_name} ${item.reviewer.last_name}`
                          : "Reviewer: Unknown"
                        : item.employee
                          ? `Employee: ${item.employee.first_name} ${item.employee.last_name}`
                          : "Employee: Unknown"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {item.overall_rating != null && (
                    <div className="flex items-center gap-1">
                      <Star
                        size={16}
                        className="text-amber-400 fill-amber-400"
                      />
                      <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                        {item.overall_rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${assignmentStatusColor[item.status]}`}
                  >
                    {item.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
            Showing {(page - 1) * limit + 1} –{" "}
            {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
