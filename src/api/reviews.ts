import apiClient from "./client";
import type { ApiResponse } from "../types";
import type {
  ReviewCycle,
  ReviewAssignment,
  ReviewCycleCreateRequest,
  ReviewCycleUpdateRequest,
  BulkAssignRequest,
  GoalScoreUpdateRequest,
  ReviewSubmitRequest,
} from "../types/review";

export const reviewApi = {
  // ── Cycles ──────────────────────────────────────

  createCycle: async (
    data: ReviewCycleCreateRequest,
  ): Promise<ApiResponse<ReviewCycle>> => {
    const resp = await apiClient.post("/reviews/cycles", data);
    return resp.data;
  },

  listCycles: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    department_id?: string;
  }): Promise<{
    success: boolean;
    data: ReviewCycle[];
    total_items: number;
    page: number;
    limit: number;
    total_pages: number;
  }> => {
    const resp = await apiClient.get("/reviews/cycles", { params });
    return resp.data;
  },

  getCycle: async (id: string): Promise<ApiResponse<ReviewCycle>> => {
    const resp = await apiClient.get(`/reviews/cycles/${id}`);
    return resp.data;
  },

  updateCycle: async (
    id: string,
    data: ReviewCycleUpdateRequest,
  ): Promise<ApiResponse<ReviewCycle>> => {
    const resp = await apiClient.put(`/reviews/cycles/${id}`, data);
    return resp.data;
  },

  deleteCycle: async (id: string): Promise<ApiResponse<null>> => {
    const resp = await apiClient.delete(`/reviews/cycles/${id}`);
    return resp.data;
  },

  activateCycle: async (id: string): Promise<ApiResponse<ReviewCycle>> => {
    const resp = await apiClient.post(`/reviews/cycles/${id}/activate`);
    return resp.data;
  },

  completeCycle: async (id: string): Promise<ApiResponse<ReviewCycle>> => {
    const resp = await apiClient.post(`/reviews/cycles/${id}/complete`);
    return resp.data;
  },

  // ── Assignments ──────────────────────────────────

  assignReviewees: async (
    cycleId: string,
    data: BulkAssignRequest,
  ): Promise<ApiResponse<ReviewAssignment[]>> => {
    const resp = await apiClient.post(
      `/reviews/cycles/${cycleId}/assignments`,
      data,
    );
    return resp.data;
  },

  listCycleAssignments: async (
    cycleId: string,
  ): Promise<{ success: boolean; data: ReviewAssignment[]; total: number }> => {
    const resp = await apiClient.get(
      `/reviews/cycles/${cycleId}/assignments`,
    );
    return resp.data;
  },

  getAssignment: async (
    id: string,
  ): Promise<ApiResponse<ReviewAssignment>> => {
    const resp = await apiClient.get(`/reviews/assignments/${id}`);
    return resp.data;
  },

  removeAssignment: async (id: string): Promise<ApiResponse<null>> => {
    const resp = await apiClient.delete(`/reviews/assignments/${id}`);
    return resp.data;
  },

  // ── Scoring ──────────────────────────────────────

  scoreGoals: async (
    assignmentId: string,
    scores: GoalScoreUpdateRequest[],
  ): Promise<ApiResponse<ReviewAssignment>> => {
    const resp = await apiClient.post(
      `/reviews/assignments/${assignmentId}/score`,
      scores,
    );
    return resp.data;
  },

  submitReview: async (
    assignmentId: string,
    data: ReviewSubmitRequest,
  ): Promise<ApiResponse<ReviewAssignment>> => {
    const resp = await apiClient.post(
      `/reviews/assignments/${assignmentId}/submit`,
      data,
    );
    return resp.data;
  },

  // ── My Reviews ──────────────────────────────────

  listMyReviews: async (params: {
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: ReviewAssignment[];
    total_items: number;
    page: number;
    limit: number;
    total_pages: number;
  }> => {
    const resp = await apiClient.get("/reviews/my-reviews", { params });
    return resp.data;
  },

  listMyReviewTasks: async (params: {
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: ReviewAssignment[];
    total_items: number;
    page: number;
    limit: number;
    total_pages: number;
  }> => {
    const resp = await apiClient.get("/reviews/my-review-tasks", { params });
    return resp.data;
  },
};
