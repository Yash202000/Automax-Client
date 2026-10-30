import { useState } from "react";
import { History } from "lucide-react";
import { Button } from "../ui/Button";
import { Input, Textarea } from "../ui/Input";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "../ui/Modal";
import {
  useKpiBaselineRevisions,
  useRequestBaselineRevision,
  useReviewBaselineRevision,
} from "../../hooks/useKpi";
import { usePermissions } from "../../hooks/usePermissions";
import { useAuthStore } from "../../stores/authStore";
import type { KpiBaselineRevision, KpiMetric } from "../../types/kpi";

const statusBadgeClass: Record<KpiBaselineRevision["status"], string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const personName = (p?: { first_name: string; last_name: string }) =>
  p ? `${p.first_name} ${p.last_name}`.trim() : "—";

interface Props {
  kpiType: string;
  kpiId: string;
  metric: KpiMetric;
}

// Baseline revisions for a metric whose KPI is approved — the Baseline is
// locked for the cycle, so changing it means requesting a revision that
// another user with kpi:approve approves (the backend enforces both rules).
export function BaselineRevisionPanel({ kpiType, kpiId, metric }: Props) {
  const { canUpdateKpi, canApproveKpi } = usePermissions();
  const currentUser = useAuthStore((state) => state.user);
  const { data } = useKpiBaselineRevisions(metric.id);
  const revisions = data?.data ?? [];
  const hasPending = revisions.some((r) => r.status === "pending");

  const requestRevision = useRequestBaselineRevision(metric.id);
  const reviewRevision = useReviewBaselineRevision(kpiType, kpiId, metric.id);

  const [showRequest, setShowRequest] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [review, setReview] = useState<{
    revision: KpiBaselineRevision;
    decision: "approve" | "reject";
  } | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  const newValueNum = Number(newValue);
  const canSubmitRequest =
    newValue.trim() !== "" &&
    Number.isFinite(newValueNum) &&
    newValueNum !== metric.baseline_value &&
    reason.trim() !== "";

  const openRequest = () => {
    setNewValue(String(metric.baseline_value ?? 0));
    setReason("");
    setShowRequest(true);
  };

  const submitRequest = async () => {
    await requestRevision.mutateAsync({
      new_value: newValueNum,
      reason: reason.trim(),
    });
    setShowRequest(false);
  };

  const submitReview = async () => {
    if (!review) return;
    await reviewRevision.mutateAsync({
      revisionId: review.revision.id,
      decision: review.decision,
      comment: reviewComment.trim() || undefined,
    });
    setReview(null);
  };

  return (
    <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-700/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Baseline Revisions
          </h3>
        </div>
        {canUpdateKpi() && (
          <Button
            size="sm"
            variant="outline"
            disabled={hasPending}
            title={
              hasPending ? "A revision is already awaiting approval" : undefined
            }
            onClick={openRequest}
          >
            Request Baseline Revision
          </Button>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        The Baseline is locked for this cycle. Changes take effect only after
        the revision is approved.
      </p>

      {revisions.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">No revisions yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-700/60">
          {revisions.map((r) => {
            const canReview =
              r.status === "pending" &&
              canApproveKpi() &&
              r.requested_by_id !== currentUser?.id;
            return (
              <li key={r.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-white">
                      {r.old_value} → {r.new_value}
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadgeClass[r.status]}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  {canReview && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReviewComment("");
                          setReview({ revision: r, decision: "reject" });
                        }}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => {
                          setReviewComment("");
                          setReview({ revision: r, decision: "approve" });
                        }}
                      >
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {r.reason}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Requested by {personName(r.requested_by)} on{" "}
                  {new Date(r.created_at).toLocaleDateString()}
                  {r.reviewed_at && (
                    <>
                      {" · "}
                      {r.status === "approved"
                        ? "Approved"
                        : "Rejected"} by {personName(r.reviewed_by)} on{" "}
                      {new Date(r.reviewed_at).toLocaleDateString()}
                    </>
                  )}
                </p>
                {r.review_comment && (
                  <p className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">
                    “{r.review_comment}”
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={showRequest} onClose={() => setShowRequest(false)}>
        <ModalHeader>
          <ModalTitle>Request Baseline Revision</ModalTitle>
          <ModalDescription>
            Current baseline for “{metric.name}” is {metric.baseline_value}. The
            new value applies only after approval.
          </ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <Input
            label="New Baseline *"
            type="number"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
          <Textarea
            label="Reason *"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why does the baseline need to change?"
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowRequest(false)}>
            Cancel
          </Button>
          <Button
            variant="success"
            disabled={!canSubmitRequest}
            isLoading={requestRevision.isPending}
            onClick={submitRequest}
          >
            Submit for Approval
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={!!review} onClose={() => setReview(null)}>
        <ModalHeader>
          <ModalTitle>
            {review?.decision === "approve" ? "Approve" : "Reject"} Baseline
            Revision
          </ModalTitle>
          <ModalDescription>
            {review &&
              `Baseline ${review.revision.old_value} → ${review.revision.new_value}. ${
                review.decision === "approve"
                  ? "The metric's Baseline will be updated."
                  : "The Baseline stays unchanged."
              }`}
          </ModalDescription>
        </ModalHeader>
        <ModalBody>
          <Textarea
            label="Comment"
            rows={2}
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setReview(null)}>
            Cancel
          </Button>
          <Button
            variant={review?.decision === "approve" ? "success" : "destructive"}
            isLoading={reviewRevision.isPending}
            onClick={submitReview}
          >
            {review?.decision === "approve" ? "Approve" : "Reject"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
