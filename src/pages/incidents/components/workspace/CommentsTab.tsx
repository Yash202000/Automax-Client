import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Send, Trash2 } from "lucide-react";
import RenderWithIncidentMentions from "@/components/common/RenderWithIncidentMentions";
import { incidentApi } from "../../../../api/admin";
import type { IncidentComment } from "../../../../types";
import { formatActivityDateTime } from "./workspaceUtils";

/* Comments tab — same combined comments + feedbacks data as
   IncidentDetailPage (newest first): composer box with internal flag,
   avatar cards with delete. */
export function CommentsTab({
  incidentId,
  comments,
  loading,
  onChanged,
}: {
  incidentId: string;
  comments: IncidentComment[];
  loading: boolean;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [commentText, setCommentText] = useState("");
  const [isInternalComment, setIsInternalComment] = useState(false);

  const addCommentMutation = useMutation({
    mutationFn: (data: { content: string; is_internal?: boolean }) =>
      incidentApi.addComment(incidentId, data),
    onSuccess: () => {
      setCommentText("");
      onChanged();
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      incidentApi.deleteComment(incidentId, commentId),
    onSuccess: () => onChanged(),
  });

  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-sm">
      <div className="space-y-4">
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 space-y-3 shadow-inner">
          <textarea
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="w-full bg-transparent text-[hsl(var(--foreground))] text-xs placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
            placeholder={t("incidents.addCommentPlaceholder")}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[hsl(var(--border))]">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={isInternalComment}
                onChange={(e) => setIsInternalComment(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-cyan-600 dark:text-cyan-500 cursor-pointer focus:ring-0 focus:outline-none"
              />
              <span className="text-xs text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--muted-foreground))] transition-colors">
                {t("incidents.internalComment")}
              </span>
            </label>
            <button
              type="button"
              onClick={() =>
                addCommentMutation.mutate({
                  content: commentText,
                  is_internal: isInternalComment,
                })
              }
              disabled={!commentText.trim() || addCommentMutation.isPending}
              className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-950/40 transition-all disabled:opacity-60"
            >
              {addCommentMutation.isPending ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {t("incidents.addComment")}
            </button>
          </div>
        </div>
        {loading ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[hsl(var(--border))] border-t-transparent" />
            {t("incidents.updating")}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-xs text-[hsl(var(--muted-foreground))] py-6">
            {t("incidents.noCommentsYet")}
          </p>
        ) : (
          <div className="space-y-2.5">
            {comments.map((comment) => {
              const authorName =
                comment.author?.first_name || comment.author?.username || "—";
              return (
                <div
                  key={comment.id}
                  className="bg-[hsl(var(--card)/0.9)] border border-[hsl(var(--border))] rounded-xl p-3.5 hover:border-[hsl(var(--border))] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {(
                          comment.author?.first_name?.[0] ||
                          comment.author?.username?.[0] ||
                          "?"
                        ).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[hsl(var(--foreground))] truncate">
                            {authorName}
                          </span>
                          {comment.is_internal ? (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 shrink-0">
                              {t("incidents.internal")}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5 whitespace-pre-wrap break-words">
                          <RenderWithIncidentMentions text={comment.content} />
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[11px] text-[hsl(var(--muted-foreground))] font-mono whitespace-nowrap">
                        {formatActivityDateTime(comment.created_at)}
                      </span>
                      {comment.type !== "feedback" ? (
                        <button
                          type="button"
                          onClick={() =>
                            deleteCommentMutation.mutate(comment.id)
                          }
                          disabled={deleteCommentMutation.isPending}
                          className="text-[hsl(var(--muted-foreground))] hover:text-rose-700 dark:text-rose-400 transition-colors disabled:opacity-50"
                          title={t("common.delete", "Delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
