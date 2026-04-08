import apiClient from "./client";
import type { ApiResponse } from "../types";
import type {
  GoalTemplate,
  GoalTemplateCreateRequest,
  GoalTemplateUpdateRequest,
  GoalTemplateFilter,
  GoalTemplateListResponse,
} from "../types/goal";

export const goalTemplateApi = {
  create: async (
    data: GoalTemplateCreateRequest,
  ): Promise<ApiResponse<GoalTemplate>> => {
    const res = await apiClient.post("/goal-templates", data);
    return res.data;
  },

  list: async (
    filter: GoalTemplateFilter = {},
  ): Promise<GoalTemplateListResponse> => {
    const params = new URLSearchParams();
    if (filter.page) params.append("page", String(filter.page));
    if (filter.limit) params.append("limit", String(filter.limit));
    if (filter.search) params.append("search", filter.search);
    if (filter.is_active !== undefined)
      params.append("is_active", String(filter.is_active));

    const res = await apiClient.get(`/goal-templates?${params.toString()}`);
    return res.data;
  },

  listActive: async (): Promise<ApiResponse<GoalTemplate[]>> => {
    const res = await apiClient.get("/goal-templates/active");
    return res.data;
  },

  getById: async (id: string): Promise<ApiResponse<GoalTemplate>> => {
    const res = await apiClient.get(`/goal-templates/${id}`);
    return res.data;
  },

  update: async (
    id: string,
    data: GoalTemplateUpdateRequest,
  ): Promise<ApiResponse<GoalTemplate>> => {
    const res = await apiClient.put(`/goal-templates/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete(`/goal-templates/${id}`);
    return res.data;
  },
};
