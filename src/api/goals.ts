import apiClient from "./client";
import type { ApiResponse } from "../types";
import type {
  Goal,
  GoalCreateRequest,
  GoalUpdateRequest,
  GoalTransitionRequest,
  GoalCloneRequest,
  GoalFilter,
  GoalListResponse,
  GoalImportResponse,
  BulkActionRequest,
  BulkActionResponse,
  GoalMetric,
  GoalMetricCreateRequest,
  GoalMetricUpdateRequest,
  MetricValueUpdateRequest,
  MetricHistoryListResponse,
  GoalCollaborator,
  CollaboratorAddRequest,
  Evidence,
  EvidenceFilter,
  EvidenceListResponse,
  EvidenceTransitionRequest,
  EvidenceTransitionHistoryListResponse,
  AvailableTransition,
  ApprovalListResponse,
  GoalCheckIn,
  CheckInCreateRequest,
  CheckInListResponse,
  GoalCommentListResponse,
  GoalActivityListResponse,
  MetricImportBatch,
  MetricImportDryRunResponse,
  MetricImportBatchFilter,
  MetricImportBatchListResponse,
  MetricImportBatchTransitionRequest,
  MetricImportBatchTransitionHistory,
} from "../types/goal";

// ──────────────────────────────────────────────────
// Goal CRUD
// ──────────────────────────────────────────────────

export const goalApi = {
  create: async (data: GoalCreateRequest): Promise<ApiResponse<Goal>> => {
    const res = await apiClient.post("/goals", data);
    return res.data;
  },

  list: async (filter: GoalFilter = {}): Promise<GoalListResponse> => {
    const params = new URLSearchParams();
    if (filter.page) params.append("page", String(filter.page));
    if (filter.limit) params.append("limit", String(filter.limit));
    if (filter.status) params.append("status", filter.status);
    if (filter.priority) params.append("priority", filter.priority);
    if (filter.owner_id) params.append("owner_id", filter.owner_id);
    if (filter.department_id)
      params.append("department_id", filter.department_id);
    if (filter.parent_goal_id)
      params.append("parent_goal_id", filter.parent_goal_id);
    if (filter.root_only) params.append("root_only", "true");
    if (filter.category) params.append("category", filter.category);
    if (filter.search) params.append("search", filter.search);
    const toStartOfDay = (d: string) => `${d}T00:00:00Z`;
    const toEndOfDay = (d: string) => `${d}T23:59:59Z`;
    if (filter.start_from)
      params.append("start_from", toStartOfDay(filter.start_from));
    if (filter.start_to)
      params.append("start_to", toEndOfDay(filter.start_to));
    if (filter.target_from)
      params.append("target_from", toStartOfDay(filter.target_from));
    if (filter.target_to)
      params.append("target_to", toEndOfDay(filter.target_to));
    if (filter.sort_by) params.append("sort_by", filter.sort_by);
    if (filter.sort_order) params.append("sort_order", filter.sort_order);

    const res = await apiClient.get(`/goals?${params.toString()}`);
    return res.data;
  },

  getById: async (id: string): Promise<ApiResponse<Goal>> => {
    const res = await apiClient.get(`/goals/${id}`);
    return res.data;
  },

  update: async (
    id: string,
    data: GoalUpdateRequest,
  ): Promise<ApiResponse<Goal>> => {
    const res = await apiClient.put(`/goals/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete(`/goals/${id}`);
    return res.data;
  },

  transition: async (
    id: string,
    data: GoalTransitionRequest,
  ): Promise<ApiResponse<Goal>> => {
    const res = await apiClient.post(`/goals/${id}/transition`, data);
    return res.data;
  },

  clone: async (
    id: string,
    data: GoalCloneRequest,
  ): Promise<ApiResponse<Goal>> => {
    const res = await apiClient.post(`/goals/${id}/clone`, data);
    return res.data;
  },

  exportCSV: async (filter: GoalFilter = {}): Promise<Blob> => {
    const params = new URLSearchParams();
    params.append("format", "csv");
    if (filter.status) params.append("status", filter.status);
    if (filter.priority) params.append("priority", filter.priority);
    if (filter.owner_id) params.append("owner_id", filter.owner_id);
    if (filter.department_id) params.append("department_id", filter.department_id);
    if (filter.category) params.append("category", filter.category);
    if (filter.search) params.append("search", filter.search);

    const res = await apiClient.get(`/goals/export?${params.toString()}`, {
      responseType: "blob",
    });
    return res.data;
  },

  exportJSON: async (filter: GoalFilter = {}): Promise<{ success: boolean; data: Goal[]; total: number }> => {
    const params = new URLSearchParams();
    params.append("format", "json");
    if (filter.status) params.append("status", filter.status);
    if (filter.priority) params.append("priority", filter.priority);
    if (filter.owner_id) params.append("owner_id", filter.owner_id);
    if (filter.department_id) params.append("department_id", filter.department_id);
    if (filter.category) params.append("category", filter.category);
    if (filter.search) params.append("search", filter.search);

    const res = await apiClient.get(`/goals/export?${params.toString()}`);
    return res.data;
  },

  importGoals: async (
    file: File,
    dryRun: boolean,
  ): Promise<ApiResponse<GoalImportResponse>> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("dry_run", dryRun ? "true" : "false");

    const res = await apiClient.post("/goals/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  bulkAction: async (
    data: BulkActionRequest,
  ): Promise<ApiResponse<BulkActionResponse>> => {
    const res = await apiClient.post("/goals/bulk", data);
    return res.data;
  },

  getChildren: async (goalId: string): Promise<ApiResponse<Goal[]>> => {
    const res = await apiClient.get(`/goals/${goalId}/children`);
    return res.data;
  },

  getTree: async (goalId: string): Promise<ApiResponse<Goal>> => {
    const res = await apiClient.get(`/goals/${goalId}/tree`);
    return res.data;
  },
};

// ──────────────────────────────────────────────────
// Check-ins
// ──────────────────────────────────────────────────

export const checkInApi = {
  create: async (
    goalId: string,
    data: CheckInCreateRequest,
  ): Promise<ApiResponse<GoalCheckIn>> => {
    const res = await apiClient.post(`/goals/${goalId}/check-ins`, data);
    return res.data;
  },

  list: async (
    goalId: string,
    page = 1,
    limit = 10,
  ): Promise<CheckInListResponse> => {
    const res = await apiClient.get(`/goals/${goalId}/check-ins`, {
      params: { page, limit },
    });
    return res.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete(`/goals/check-ins/${id}`);
    return res.data;
  },
};

// ──────────────────────────────────────────────────
// Collaborators
// ──────────────────────────────────────────────────

export const collaboratorApi = {
  add: async (
    goalId: string,
    data: CollaboratorAddRequest,
  ): Promise<ApiResponse<GoalCollaborator>> => {
    const res = await apiClient.post(`/goals/${goalId}/collaborators`, data);
    return res.data;
  },

  remove: async (
    goalId: string,
    userId: string,
  ): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete(
      `/goals/${goalId}/collaborators/${userId}`,
    );
    return res.data;
  },
};

// ──────────────────────────────────────────────────
// Metrics
// ──────────────────────────────────────────────────

export const metricApi = {
  create: async (
    goalId: string,
    data: GoalMetricCreateRequest,
  ): Promise<ApiResponse<GoalMetric>> => {
    const res = await apiClient.post(`/goals/${goalId}/metrics`, data);
    return res.data;
  },

  update: async (
    id: string,
    data: GoalMetricUpdateRequest,
  ): Promise<ApiResponse<GoalMetric>> => {
    const res = await apiClient.put(`/goals/metrics/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete(`/goals/metrics/${id}`);
    return res.data;
  },

  updateValue: async (
    id: string,
    data: MetricValueUpdateRequest,
  ): Promise<ApiResponse<GoalMetric>> => {
    const res = await apiClient.put(`/goals/metrics/${id}/value`, data);
    return res.data;
  },

  getHistory: async (
    id: string,
    page = 1,
    limit = 20,
  ): Promise<MetricHistoryListResponse> => {
    const res = await apiClient.get(`/goals/metrics/${id}/history`, {
      params: { page, limit },
    });
    return res.data;
  },
};

// ──────────────────────────────────────────────────
// Evidence
// ──────────────────────────────────────────────────

export const evidenceApi = {
  upload: async (
    goalId: string,
    file: File,
    data: {
      title: string;
      evidence_type: string;
      comment: string;
      metric_id?: string;
    },
  ): Promise<ApiResponse<Evidence>> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", data.title);
    formData.append("evidence_type", data.evidence_type);
    formData.append("comment", data.comment);
    if (data.metric_id) formData.append("metric_id", data.metric_id);

    const res = await apiClient.post(`/goals/${goalId}/evidences`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  list: async (
    goalId: string,
    filter: EvidenceFilter = {},
  ): Promise<EvidenceListResponse> => {
    const params = new URLSearchParams();
    if (filter.page) params.append("page", String(filter.page));
    if (filter.limit) params.append("limit", String(filter.limit));
    if (filter.status) params.append("status", filter.status);
    if (filter.search) params.append("search", filter.search);
    if (filter.evidence_type)
      params.append("evidence_type", filter.evidence_type);
    if (filter.start_date) params.append("start_date", filter.start_date);
    if (filter.end_date) params.append("end_date", filter.end_date);

    const res = await apiClient.get(
      `/goals/${goalId}/evidences?${params.toString()}`,
    );
    return res.data;
  },

  getById: async (id: string): Promise<ApiResponse<Evidence>> => {
    const res = await apiClient.get(`/goals/evidences/${id}`);
    return res.data;
  },

  getPreviewUrl: async (
    id: string,
  ): Promise<{ success: boolean; data: { preview_url: string } }> => {
    const res = await apiClient.get(`/goals/evidences/${id}/preview`);
    return res.data;
  },

  download: async (id: string): Promise<Blob> => {
    const res = await apiClient.get(`/goals/evidences/${id}/download`, {
      responseType: "blob",
    });
    return res.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete(`/goals/evidences/${id}`);
    return res.data;
  },

  getAvailableTransitions: async (
    id: string,
  ): Promise<ApiResponse<AvailableTransition[]>> => {
    const res = await apiClient.get(
      `/goals/evidences/${id}/available-transitions`,
    );
    return res.data;
  },

  executeTransition: async (
    id: string,
    data: EvidenceTransitionRequest,
  ): Promise<ApiResponse<Evidence>> => {
    const res = await apiClient.post(`/goals/evidences/${id}/transition`, data);
    return res.data;
  },

  getTransitionHistory: async (
    id: string,
    page = 1,
    limit = 50,
  ): Promise<EvidenceTransitionHistoryListResponse> => {
    const res = await apiClient.get(
      `/goals/evidences/${id}/transition-history`,
      {
        params: { page, limit },
      },
    );
    return res.data;
  },

  replaceFile: async (
    evidenceId: string,
    file: File,
  ): Promise<ApiResponse<Evidence>> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.put(
      `/goals/evidences/${evidenceId}/file`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data;
  },
};

// ──────────────────────────────────────────────────
// Approvals
// ──────────────────────────────────────────────────

export const approvalApi = {
  listPending: async (page = 1, limit = 10): Promise<ApprovalListResponse> => {
    const res = await apiClient.get("/approvals/pending", {
      params: { page, limit },
    });
    return res.data;
  },

  listCompleted: async (
    page = 1,
    limit = 10,
  ): Promise<ApprovalListResponse> => {
    const res = await apiClient.get("/approvals/completed", {
      params: { page, limit },
    });
    return res.data;
  },
};

// ──────────────────────────────────────────────────
// Comments
// ──────────────────────────────────────────────────

export const goalCommentApi = {
  list: async (
    goalId: string,
    page = 1,
    limit = 20,
  ): Promise<GoalCommentListResponse> => {
    const res = await apiClient.get(`/goals/${goalId}/comments`, {
      params: { page, limit },
    });
    return res.data;
  },

  add: async (
    goalId: string,
    content: string,
  ): Promise<ApiResponse<{ id: string }>> => {
    const res = await apiClient.post(`/goals/${goalId}/comments`, { content });
    return res.data;
  },

  delete: async (commentId: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete(`/goals/comments/${commentId}`);
    return res.data;
  },
};

// ──────────────────────────────────────────────────
// Activity
// ──────────────────────────────────────────────────

export const goalActivityApi = {
  list: async (
    goalId: string,
    page = 1,
    limit = 20,
  ): Promise<GoalActivityListResponse> => {
    const res = await apiClient.get(`/goals/${goalId}/activity`, {
      params: { page, limit },
    });
    return res.data;
  },
};

// ──────────────────────────────────────────────────
// Metric Import/Export
// ──────────────────────────────────────────────────

export const metricImportApi = {
  exportTemplate: async (
    filter: GoalFilter = {},
    format: "csv" | "xlsx" = "csv",
  ): Promise<Blob> => {
    const params = new URLSearchParams();
    params.append("format", format);
    if (filter.status) params.append("status", filter.status);
    if (filter.priority) params.append("priority", filter.priority);
    if (filter.department_id) params.append("department_id", filter.department_id);
    const res = await apiClient.get(
      `/goals/metrics/export-template?${params.toString()}`,
      { responseType: "blob" },
    );
    return res.data;
  },

  importMetrics: async (
    file: File,
    dryRun: boolean,
    title?: string,
    comment?: string,
    primaryGoalId?: string,
  ): Promise<ApiResponse<MetricImportDryRunResponse | MetricImportBatch>> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("dry_run", String(dryRun));
    if (title) formData.append("title", title);
    if (comment) formData.append("comment", comment);
    if (primaryGoalId) formData.append("primary_goal_id", primaryGoalId);
    const res = await apiClient.post("/goals/metrics/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  listBatches: async (
    filter: MetricImportBatchFilter = {},
  ): Promise<MetricImportBatchListResponse> => {
    const res = await apiClient.get("/goals/metric-batches", {
      params: filter,
    });
    return res.data;
  },

  getBatch: async (
    id: string,
  ): Promise<ApiResponse<MetricImportBatch>> => {
    const res = await apiClient.get(`/goals/metric-batches/${id}`);
    return res.data;
  },

  deleteBatch: async (id: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete(`/goals/metric-batches/${id}`);
    return res.data;
  },

  getAvailableTransitions: async (
    id: string,
  ): Promise<ApiResponse<AvailableTransition[]>> => {
    const res = await apiClient.get(
      `/goals/metric-batches/${id}/available-transitions`,
    );
    return res.data;
  },

  executeTransition: async (
    id: string,
    data: MetricImportBatchTransitionRequest,
  ): Promise<ApiResponse<MetricImportBatch>> => {
    const res = await apiClient.post(
      `/goals/metric-batches/${id}/transition`,
      data,
    );
    return res.data;
  },

  getTransitionHistory: async (
    id: string,
  ): Promise<ApiResponse<MetricImportBatchTransitionHistory[]>> => {
    const res = await apiClient.get(
      `/goals/metric-batches/${id}/transition-history`,
    );
    return res.data;
  },
};
