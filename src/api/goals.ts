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
    if (filter.category) params.append("category", filter.category);
    if (filter.search) params.append("search", filter.search);
    if (filter.start_from) params.append("start_from", filter.start_from);
    if (filter.start_to) params.append("start_to", filter.start_to);
    if (filter.target_from) params.append("target_from", filter.target_from);
    if (filter.target_to) params.append("target_to", filter.target_to);
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
