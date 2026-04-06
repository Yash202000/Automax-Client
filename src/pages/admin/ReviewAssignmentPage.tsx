import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardCheck,
  Star,
  Calendar,
  User,
  Target,
  Loader2,
  Save,
  Send,
} from "lucide-react";
import {
  useReviewAssignment,
  useScoreGoals,
  useSubmitReview,
} from "../../hooks/useReviews";
import { useAuthStore } from "../../stores/authStore";
import type {
  GoalScoreUpdateRequest,
  ReviewAssignmentStatus,
} from "../../types/review";

// ── Helpers ────────────────────────────────────────────

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const statusColor: Record<ReviewAssignmentStatus, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  in_progress:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  completed:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

// ── Rating Stars Component ──────────────────────

const RatingInput: React.FC<{
  value: number | undefined;
  onChange: (val: number) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          className={`p-0.5 transition-colors ${disabled ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
        >
          <Star
            size={18}
            className={
              value != null && star <= value
                ? "text-amber-400 fill-amber-400"
                : "text-slate-300 dark:text-slate-600"
            }
          />
        </button>
      ))}
    </div>
  );
};

// ── Main Page ────────────────────────────────────────

export const ReviewAssignmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useReviewAssignment(id!);
  const scoreGoals = useScoreGoals();
  const submitReview = useSubmitReview();
  const currentUser = useAuthStore((s) => s.user);

  const assignment = data?.data;
  const isReviewer = currentUser?.id === assignment?.reviewer_id;
  const isCompleted = assignment?.status === "completed";
  const canEdit = isReviewer && !isCompleted;

  // Local state for editing
  const [scores, setScores] = useState<
    Record<string, { weight: number; rating?: number; comments: string }>
  >({});
  const [overallRating, setOverallRating] = useState<number>(0);
  const [comments, setComments] = useState("");

  // Populate local state from assignment data
  useEffect(() => {
    if (!assignment) return;
    if (assignment.overall_rating != null)
      setOverallRating(assignment.overall_rating);
    setComments(assignment.comments ?? "");

    if (assignment.goal_scores) {
      const s: typeof scores = {};
      for (const gs of assignment.goal_scores) {
        s[gs.goal_id] = {
          weight: gs.weight,
          rating: gs.rating,
          comments: gs.comments,
        };
      }
      setScores(s);
    }
  }, [assignment]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-20 text-slate-400">
        Assignment not found
      </div>
    );
  }

  const handleSaveDraft = () => {
    const goalScores: GoalScoreUpdateRequest[] = Object.entries(scores).map(
      ([goalId, s]) => ({
        goal_id: goalId,
        weight: s.weight,
        rating: s.rating,
        comments: s.comments,
      }),
    );
    scoreGoals.mutate({ assignmentId: id!, scores: goalScores });
  };

  const handleSubmit = () => {
    if (overallRating < 1 || overallRating > 5) return;

    const goalScores: GoalScoreUpdateRequest[] = Object.entries(scores).map(
      ([goalId, s]) => ({
        goal_id: goalId,
        weight: s.weight,
        rating: s.rating,
        comments: s.comments,
      }),
    );
    submitReview.mutate({
      assignmentId: id!,
      data: {
        overall_rating: overallRating,
        comments,
        goal_scores: goalScores,
      },
    });
  };

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        to={
          assignment.cycle
            ? `/goals/reviews/${assignment.cycle_id}`
            : "/goals/reviews"
        }
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4 transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      {/* Header Card */}
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
                {assignment.cycle?.title ?? "Review Assignment"}
              </h1>
              {assignment.cycle && (
                <div className="flex items-center gap-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
                  <Calendar size={13} />
                  <span className="tabular-nums">
                    {formatDate(assignment.cycle.period_start)} –{" "}
                    {formatDate(assignment.cycle.period_end)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <span
            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColor[assignment.status]}`}
          >
            {assignment.status.replace("_", " ")}
          </span>
        </div>

        {/* People */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60">
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
              Employee
            </p>
            <div className="flex items-center gap-2">
              <User size={16} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {assignment.employee
                  ? `${assignment.employee.first_name} ${assignment.employee.last_name}`
                  : assignment.employee_id}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
              Reviewer
            </p>
            <div className="flex items-center gap-2">
              <User size={16} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {assignment.reviewer
                  ? `${assignment.reviewer.first_name} ${assignment.reviewer.last_name}`
                  : assignment.reviewer_id}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Scores Section */}
      {assignment.goal_scores && assignment.goal_scores.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/60">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Target size={16} className="text-blue-500" />
              Goal Scores
            </h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
            {assignment.goal_scores.map((gs) => {
              const localScore = scores[gs.goal_id] ?? {
                weight: gs.weight,
                rating: gs.rating,
                comments: gs.comments,
              };

              return (
                <div key={gs.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {gs.goal?.title ?? gs.goal_id}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>
                          Achievement:{" "}
                          <span className="tabular-nums font-medium">
                            {gs.achievement_pct.toFixed(0)}%
                          </span>
                        </span>
                        {gs.goal && (
                          <span className="capitalize">
                            {gs.goal.status} · {gs.goal.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    <RatingInput
                      value={localScore.rating}
                      disabled={!canEdit}
                      onChange={(val) =>
                        setScores((prev) => ({
                          ...prev,
                          [gs.goal_id]: { ...localScore, rating: val },
                        }))
                      }
                    />
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mb-2">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(gs.achievement_pct, 100)}%` }}
                    />
                  </div>
                  {canEdit ? (
                    <textarea
                      value={localScore.comments}
                      onChange={(e) =>
                        setScores((prev) => ({
                          ...prev,
                          [gs.goal_id]: {
                            ...localScore,
                            comments: e.target.value,
                          },
                        }))
                      }
                      rows={2}
                      placeholder="Comments on this goal..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    localScore.comments && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        {localScore.comments}
                      </p>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Overall Rating & Comments */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-4">
          Overall Assessment
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Overall Rating
          </label>
          <div className="flex items-center gap-3">
            <RatingInput
              value={overallRating}
              onChange={setOverallRating}
              disabled={!canEdit}
            />
            {overallRating > 0 && (
              <span className="tabular-nums text-lg font-bold text-slate-900 dark:text-white">
                {overallRating}.0
              </span>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Comments
          </label>
          {canEdit ? (
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder="Overall review comments..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {comments || "No comments"}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        {canEdit && (
          <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/60">
            <button
              onClick={handleSaveDraft}
              disabled={scoreGoals.isPending}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {scoreGoals.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Save Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitReview.isPending || overallRating < 1}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {submitReview.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Submit Review
            </button>
          </div>
        )}

        {isCompleted && assignment.completed_at && (
          <p className="text-sm text-green-600 dark:text-green-400 mt-3">
            Completed on {formatDate(assignment.completed_at)}
          </p>
        )}
      </div>
    </div>
  );
};
