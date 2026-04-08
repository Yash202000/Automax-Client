import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { reviewApi } from "../api/reviews";
import type {
  ReviewCycleCreateRequest,
  ReviewCycleUpdateRequest,
  BulkAssignRequest,
  GoalScoreUpdateRequest,
  ReviewSubmitRequest,
} from "../types/review";

// ──────────────────────────────────────────────────
// Query Keys
// ──────────────────────────────────────────────────

export const reviewKeys = {
  all: ["reviews"] as const,
  cycles: () => [...reviewKeys.all, "cycles"] as const,
  cycleList: (params: Record<string, unknown>) =>
    [...reviewKeys.cycles(), params] as const,
  cycleDetail: (id: string) => [...reviewKeys.cycles(), id] as const,
  assignments: () => [...reviewKeys.all, "assignments"] as const,
  assignmentDetail: (id: string) =>
    [...reviewKeys.assignments(), id] as const,
  cycleAssignments: (cycleId: string) =>
    [...reviewKeys.assignments(), "cycle", cycleId] as const,
  myReviews: (page: number, limit: number) =>
    [...reviewKeys.all, "my-reviews", page, limit] as const,
  myReviewTasks: (page: number, limit: number) =>
    [...reviewKeys.all, "my-review-tasks", page, limit] as const,
};

// ──────────────────────────────────────────────────
// Cycle Hooks
// ──────────────────────────────────────────────────

export function useReviewCycles(params: {
  page?: number;
  limit?: number;
  status?: string;
  department_id?: string;
}) {
  return useQuery({
    queryKey: reviewKeys.cycleList(params),
    queryFn: () => reviewApi.listCycles(params),
  });
}

export function useReviewCycle(id: string) {
  return useQuery({
    queryKey: reviewKeys.cycleDetail(id),
    queryFn: () => reviewApi.getCycle(id),
    enabled: !!id,
  });
}

export function useCreateCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ReviewCycleCreateRequest) =>
      reviewApi.createCycle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.cycles() });
      toast.success("Review cycle created");
    },
    onError: () => toast.error("Failed to create review cycle"),
  });
}

export function useUpdateCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ReviewCycleUpdateRequest;
    }) => reviewApi.updateCycle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.cycles() });
      toast.success("Review cycle updated");
    },
    onError: () => toast.error("Failed to update review cycle"),
  });
}

export function useDeleteCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewApi.deleteCycle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.cycles() });
      toast.success("Review cycle deleted");
    },
    onError: () => toast.error("Failed to delete review cycle"),
  });
}

export function useActivateCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewApi.activateCycle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.cycles() });
      toast.success("Review cycle activated");
    },
    onError: () => toast.error("Failed to activate review cycle"),
  });
}

export function useCompleteCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewApi.completeCycle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.cycles() });
      toast.success("Review cycle completed");
    },
    onError: () => toast.error("Failed to complete review cycle"),
  });
}

// ──────────────────────────────────────────────────
// Assignment Hooks
// ──────────────────────────────────────────────────

export function useCycleAssignments(cycleId: string) {
  return useQuery({
    queryKey: reviewKeys.cycleAssignments(cycleId),
    queryFn: () => reviewApi.listCycleAssignments(cycleId),
    enabled: !!cycleId,
  });
}

export function useReviewAssignment(id: string) {
  return useQuery({
    queryKey: reviewKeys.assignmentDetail(id),
    queryFn: () => reviewApi.getAssignment(id),
    enabled: !!id,
  });
}

export function useAssignReviewees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cycleId,
      data,
    }: {
      cycleId: string;
      data: BulkAssignRequest;
    }) => reviewApi.assignReviewees(cycleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.assignments() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.cycles() });
      toast.success("Reviewees assigned");
    },
    onError: () => toast.error("Failed to assign reviewees"),
  });
}

export function useRemoveAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewApi.removeAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.assignments() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.cycles() });
      toast.success("Assignment removed");
    },
    onError: () => toast.error("Failed to remove assignment"),
  });
}

// ──────────────────────────────────────────────────
// Scoring Hooks
// ──────────────────────────────────────────────────

export function useScoreGoals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      scores,
    }: {
      assignmentId: string;
      scores: GoalScoreUpdateRequest[];
    }) => reviewApi.scoreGoals(assignmentId, scores),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.assignments() });
      toast.success("Scores saved");
    },
    onError: () => toast.error("Failed to save scores"),
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      data,
    }: {
      assignmentId: string;
      data: ReviewSubmitRequest;
    }) => reviewApi.submitReview(assignmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      toast.success("Review submitted successfully");
    },
    onError: () => toast.error("Failed to submit review"),
  });
}

// ──────────────────────────────────────────────────
// My Reviews Hooks
// ──────────────────────────────────────────────────

export function useMyReviews(page = 1, limit = 20) {
  return useQuery({
    queryKey: reviewKeys.myReviews(page, limit),
    queryFn: () => reviewApi.listMyReviews({ page, limit }),
  });
}

export function useMyReviewTasks(page = 1, limit = 20) {
  return useQuery({
    queryKey: reviewKeys.myReviewTasks(page, limit),
    queryFn: () => reviewApi.listMyReviewTasks({ page, limit }),
  });
}
