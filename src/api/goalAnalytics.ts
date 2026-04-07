import apiClient from "./client";
import type { ApiResponse } from "../types";
import type {
  GoalStats,
  GoalDistributions,
  ProgressSummary,
  AtRiskGoalsResponse,
  TrendData,
  OKRTree,
  OKRTreeFilter,
} from "../types/goalAnalytics";

export interface AnalyticsFilter {
  department_id?: string;
  period_start?: string;
  period_end?: string;
}

function buildParams(filter?: AnalyticsFilter): Record<string, string> {
  const params: Record<string, string> = {};
  if (filter?.department_id) params.department_id = filter.department_id;
  if (filter?.period_start) params.period_start = filter.period_start;
  if (filter?.period_end) params.period_end = filter.period_end;
  return params;
}

export const goalAnalyticsApi = {
  getStats: async (filter?: AnalyticsFilter): Promise<ApiResponse<GoalStats>> => {
    const { data } = await apiClient.get("/goals/analytics/stats", {
      params: buildParams(filter),
    });
    return data;
  },

  getDistributions: async (
    departmentId?: string,
    filter?: AnalyticsFilter,
  ): Promise<ApiResponse<GoalDistributions>> => {
    const params = buildParams(filter);
    if (departmentId) params.department_id = departmentId;
    const { data } = await apiClient.get("/goals/analytics/distributions", {
      params,
    });
    return data;
  },

  getProgressSummary: async (filter?: AnalyticsFilter): Promise<ApiResponse<ProgressSummary>> => {
    const { data } = await apiClient.get("/goals/analytics/progress", {
      params: buildParams(filter),
    });
    return data;
  },

  getAtRiskGoals: async (
    page = 1,
    limit = 10,
    filter?: AnalyticsFilter,
  ): Promise<AtRiskGoalsResponse> => {
    const { data } = await apiClient.get("/goals/analytics/at-risk", {
      params: { page, limit, ...buildParams(filter) },
    });
    return data;
  },

  getTrends: async (months = 12, filter?: AnalyticsFilter): Promise<ApiResponse<TrendData>> => {
    const { data } = await apiClient.get("/goals/analytics/trends", {
      params: { months, ...buildParams(filter) },
    });
    return data;
  },

  getOKRTree: async (
    filter: OKRTreeFilter = {},
  ): Promise<ApiResponse<OKRTree>> => {
    const params: Record<string, string> = {};
    if (filter.department_id) params.department_id = filter.department_id;
    if (filter.period_start) params.period_start = filter.period_start;
    if (filter.period_end) params.period_end = filter.period_end;
    if (filter.status) params.status = filter.status;
    const { data } = await apiClient.get("/goals/analytics/okr-tree", {
      params,
    });
    return data;
  },
};
