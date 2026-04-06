import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  goalApi,
  collaboratorApi,
  metricApi,
  evidenceApi,
  approvalApi,
  checkInApi,
  metricImportApi,
} from "../api/goals";
import type {
  GoalFilter,
  GoalCreateRequest,
  GoalUpdateRequest,
  GoalTransitionRequest,
  GoalCloneRequest,
  BulkActionRequest,
  GoalMetricCreateRequest,
  GoalMetricUpdateRequest,
  MetricValueUpdateRequest,
  CollaboratorAddRequest,
  EvidenceFilter,
  EvidenceTransitionRequest,
  CheckInCreateRequest,
  MetricImportBatchFilter,
  MetricImportBatchTransitionRequest,
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
  children: (goalId: string) =>
    [...goalKeys.all, "children", goalId] as const,
  tree: (goalId: string) => [...goalKeys.all, "tree", goalId] as const,
  checkIns: (goalId: string, page: number) =>
    [...goalKeys.all, "check-ins", goalId, page] as const,
  metricBatches: () => [...goalKeys.all, "metricBatches"] as const,
  metricBatch: (id: string) =>
    [...goalKeys.all, "metricBatch", id] as const,
  metricBatchTransitions: (id: string) =>
    [...goalKeys.all, "metricBatchTransitions", id] as const,
  metricBatchHistory: (id: string) =>
    [...goalKeys.all, "metricBatchHistory", id] as const,
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
// Import & Bulk Mutations
// ──────────────────────────────────────────────────

export function useImportGoals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, dryRun }: { file: File; dryRun: boolean }) =>
      goalApi.importGoals(file, dryRun),
    onSuccess: (data) => {
      if (data.data?.mode === "committed") {
        queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
        toast.success(
          `Imported ${data.data.goals_count} goals with ${data.data.metrics_count} metrics`,
        );
      }
    },
    onError: () => {
      toast.error("Failed to process import file");
    },
  });
}

export function useBulkAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkActionRequest) => goalApi.bulkAction(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
      const resp = data.data!;
      if (resp.failure_count === 0) {
        toast.success(`${resp.success_count} goals updated successfully`);
      } else {
        toast.warning(
          `${resp.success_count} succeeded, ${resp.failure_count} failed`,
        );
      }
    },
    onError: () => {
      toast.error("Bulk operation failed");
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: goalKeys.all });
      toast.success("Transition completed");
    },
    onError: () => {
      toast.error("Failed to execute transition");
    },
  });
}

export function useReplaceEvidenceFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      evidenceId,
      file,
    }: {
      evidenceId: string;
      file: File;
    }) => evidenceApi.replaceFile(evidenceId, file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: goalKeys.all });
      toast.success("Evidence file replaced");
    },
    onError: () => {
      toast.error("Failed to replace evidence file");
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

// ──────────────────────────────────────────────────
// Hierarchy Queries
// ──────────────────────────────────────────────────

export function useGoalChildren(goalId: string) {
  return useQuery({
    queryKey: goalKeys.children(goalId),
    queryFn: () => goalApi.getChildren(goalId),
    enabled: !!goalId,
  });
}

export function useGoalTree(goalId: string) {
  return useQuery({
    queryKey: goalKeys.tree(goalId),
    queryFn: () => goalApi.getTree(goalId),
    enabled: !!goalId,
  });
}

// ──────────────────────────────────────────────────
// Check-in Queries & Mutations
// ──────────────────────────────────────────────────

export function useGoalCheckIns(goalId: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: goalKeys.checkIns(goalId, page),
    queryFn: () => checkInApi.list(goalId, page, limit),
    enabled: !!goalId,
  });
}

export function useCreateCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      goalId,
      data,
    }: {
      goalId: string;
      data: CheckInCreateRequest;
    }) => checkInApi.create(goalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      toast.success("Check-in submitted");
    },
    onError: () => {
      toast.error("Failed to submit check-in");
    },
  });
}

export function useDeleteCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => checkInApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      toast.success("Check-in deleted");
    },
    onError: () => {
      toast.error("Failed to delete check-in");
    },
  });
}

// ──────────────────────────────────────────────────
// Metric Import Queries & Mutations
// ──────────────────────────────────────────────────

export function useMetricImportBatches(filter: MetricImportBatchFilter = {}) {
  return useQuery({
    queryKey: [...goalKeys.metricBatches(), filter],
    queryFn: () => metricImportApi.listBatches(filter),
  });
}

export function useMetricImportBatch(id: string) {
  return useQuery({
    queryKey: goalKeys.metricBatch(id),
    queryFn: () => metricImportApi.getBatch(id),
    enabled: !!id,
  });
}

export function useImportMetrics() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      dryRun,
      title,
      comment,
      primaryGoalId,
    }: {
      file: File;
      dryRun: boolean;
      title?: string;
      comment?: string;
      primaryGoalId?: string;
    }) => metricImportApi.importMetrics(file, dryRun, title, comment, primaryGoalId),
    onSuccess: (data, variables) => {
      if (!variables.dryRun) {
        queryClient.invalidateQueries({ queryKey: goalKeys.metricBatches() });
        toast.success("Metric import batch created");
      }
    },
    onError: () => {
      toast.error("Failed to process metric import");
    },
  });
}

export function useDeleteMetricImportBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => metricImportApi.deleteBatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.metricBatches() });
      toast.success("Import batch deleted");
    },
    onError: () => {
      toast.error("Failed to delete import batch");
    },
  });
}

export function useMetricBatchTransitions(batchId: string) {
  return useQuery({
    queryKey: goalKeys.metricBatchTransitions(batchId),
    queryFn: () => metricImportApi.getAvailableTransitions(batchId),
    enabled: !!batchId,
  });
}

export function useExecuteMetricBatchTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      batchId,
      data,
    }: {
      batchId: string;
      data: MetricImportBatchTransitionRequest;
    }) => metricImportApi.executeTransition(batchId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: goalKeys.all });
      toast.success("Transition completed");
    },
    onError: () => {
      toast.error("Failed to execute transition");
    },
  });
}

export function useMetricBatchTransitionHistory(batchId: string) {
  return useQuery({
    queryKey: goalKeys.metricBatchHistory(batchId),
    queryFn: () => metricImportApi.getTransitionHistory(batchId),
    enabled: !!batchId,
  });
}
