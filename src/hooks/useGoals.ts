import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  goalApi,
  collaboratorApi,
  metricApi,
  evidenceApi,
  approvalApi,
} from "../api/goals";
import type {
  GoalFilter,
  GoalCreateRequest,
  GoalUpdateRequest,
  GoalTransitionRequest,
  GoalCloneRequest,
  GoalMetricCreateRequest,
  GoalMetricUpdateRequest,
  MetricValueUpdateRequest,
  CollaboratorAddRequest,
  EvidenceFilter,
  EvidenceTransitionRequest,
} from "../types/goal";

// ──────────────────────────────────────────────────
// Query Keys
// ──────────────────────────────────────────────────

export const goalKeys = {
  all: ["goals"] as const,
  lists: () => [...goalKeys.all, "list"] as const,
  list: (filter: GoalFilter) => [...goalKeys.lists(), filter] as const,
  details: () => [...goalKeys.all, "detail"] as const,
  detail: (id: string) => [...goalKeys.details(), id] as const,
  evidences: (goalId: string, filter?: EvidenceFilter) =>
    [...goalKeys.all, "evidences", goalId, filter] as const,
  evidenceTransitions: (evidenceId: string) =>
    [...goalKeys.all, "evidenceTransitions", evidenceId] as const,
  evidenceTransitionHistory: (evidenceId: string) =>
    [...goalKeys.all, "evidenceTransitionHistory", evidenceId] as const,
  metricHistory: (metricId: string) =>
    [...goalKeys.all, "metricHistory", metricId] as const,
  pendingApprovals: (page: number, limit: number) =>
    [...goalKeys.all, "approvals", "pending", page, limit] as const,
  completedApprovals: (page: number, limit: number) =>
    [...goalKeys.all, "approvals", "completed", page, limit] as const,
};

// ──────────────────────────────────────────────────
// Goal Queries
// ──────────────────────────────────────────────────

export function useGoals(filter: GoalFilter = {}) {
  return useQuery({
    queryKey: goalKeys.list(filter),
    queryFn: () => goalApi.list(filter),
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: goalKeys.detail(id),
    queryFn: () => goalApi.getById(id),
    enabled: !!id,
  });
}

// ──────────────────────────────────────────────────
// Goal Mutations
// ──────────────────────────────────────────────────

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GoalCreateRequest) => goalApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
      toast.success("Goal created successfully");
    },
    onError: () => {
      toast.error("Failed to create goal");
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: GoalUpdateRequest }) =>
      goalApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: goalKeys.detail(variables.id),
      });
      toast.success("Goal updated successfully");
    },
    onError: () => {
      toast.error("Failed to update goal");
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
      toast.success("Goal deleted successfully");
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      const msg = error?.response?.data?.error || "Failed to delete goal";
      toast.error(msg);
    },
  });
}

export function useTransitionGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: GoalTransitionRequest }) =>
      goalApi.transition(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: goalKeys.detail(variables.id),
      });
      toast.success("Goal status updated");
    },
    onError: () => {
      toast.error("Failed to transition goal status");
    },
  });
}

export function useCloneGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: GoalCloneRequest }) =>
      goalApi.clone(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
      toast.success("Goal cloned successfully");
    },
    onError: () => {
      toast.error("Failed to clone goal");
    },
  });
}

// ──────────────────────────────────────────────────
// Collaborator Mutations
// ──────────────────────────────────────────────────

export function useAddCollaborator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      goalId,
      data,
    }: {
      goalId: string;
      data: CollaboratorAddRequest;
    }) => collaboratorApi.add(goalId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: goalKeys.detail(variables.goalId),
      });
      toast.success("Collaborator added");
    },
    onError: () => {
      toast.error("Failed to add collaborator");
    },
  });
}

export function useRemoveCollaborator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, userId }: { goalId: string; userId: string }) =>
      collaboratorApi.remove(goalId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: goalKeys.detail(variables.goalId),
      });
      toast.success("Collaborator removed");
    },
    onError: () => {
      toast.error("Failed to remove collaborator");
    },
  });
}

// ──────────────────────────────────────────────────
// Metric Queries & Mutations
// ──────────────────────────────────────────────────

export function useMetricHistory(metricId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: goalKeys.metricHistory(metricId),
    queryFn: () => metricApi.getHistory(metricId, page, limit),
    enabled: !!metricId,
  });
}

export function useCreateMetric() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      goalId,
      data,
    }: {
      goalId: string;
      data: GoalMetricCreateRequest;
    }) => metricApi.create(goalId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: goalKeys.detail(variables.goalId),
      });
      toast.success("Metric created");
    },
    onError: () => {
      toast.error("Failed to create metric");
    },
  });
}

export function useUpdateMetric() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: GoalMetricUpdateRequest }) =>
      metricApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      toast.success("Metric updated");
    },
    onError: () => {
      toast.error("Failed to update metric");
    },
  });
}

export function useDeleteMetric() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => metricApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      toast.success("Metric deleted");
    },
    onError: () => {
      toast.error("Failed to delete metric");
    },
  });
}

export function useUpdateMetricValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: MetricValueUpdateRequest;
    }) => metricApi.updateValue(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      toast.success("Metric value updated");
    },
    onError: () => {
      toast.error("Failed to update metric value");
    },
  });
}

// ──────────────────────────────────────────────────
// Evidence Queries & Mutations
// ──────────────────────────────────────────────────

export function useGoalEvidences(goalId: string, filter: EvidenceFilter = {}) {
  return useQuery({
    queryKey: goalKeys.evidences(goalId, filter),
    queryFn: () => evidenceApi.list(goalId, filter),
    enabled: !!goalId,
  });
}

export function useUploadEvidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      goalId,
      file,
      data,
    }: {
      goalId: string;
      file: File;
      data: {
        title: string;
        evidence_type: string;
        comment: string;
        metric_id?: string;
      };
    }) => evidenceApi.upload(goalId, file, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: goalKeys.evidences(variables.goalId),
      });
      queryClient.invalidateQueries({
        queryKey: goalKeys.detail(variables.goalId),
      });
      toast.success("Evidence uploaded");
    },
    onError: () => {
      toast.error("Failed to upload evidence");
    },
  });
}

export function useDeleteEvidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (evidenceId: string) => evidenceApi.delete(evidenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      toast.success("Evidence deleted");
    },
    onError: () => {
      toast.error("Failed to delete evidence");
    },
  });
}

export function useEvidenceTransitions(evidenceId: string) {
  return useQuery({
    queryKey: goalKeys.evidenceTransitions(evidenceId),
    queryFn: () => evidenceApi.getAvailableTransitions(evidenceId),
    enabled: !!evidenceId,
  });
}

export function useEvidenceTransitionHistory(evidenceId: string) {
  return useQuery({
    queryKey: goalKeys.evidenceTransitionHistory(evidenceId),
    queryFn: () => evidenceApi.getTransitionHistory(evidenceId),
    enabled: !!evidenceId,
  });
}

export function useExecuteEvidenceTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      evidenceId,
      data,
    }: {
      evidenceId: string;
      data: EvidenceTransitionRequest;
    }) => evidenceApi.executeTransition(evidenceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      toast.success("Transition completed");
    },
    onError: () => {
      toast.error("Failed to execute transition");
    },
  });
}

// ──────────────────────────────────────────────────
// Approval Queries
// ──────────────────────────────────────────────────

export function usePendingApprovals(page = 1, limit = 10) {
  return useQuery({
    queryKey: goalKeys.pendingApprovals(page, limit),
    queryFn: () => approvalApi.listPending(page, limit),
  });
}

export function useCompletedApprovals(page = 1, limit = 10) {
  return useQuery({
    queryKey: goalKeys.completedApprovals(page, limit),
    queryFn: () => approvalApi.listCompleted(page, limit),
  });
}
