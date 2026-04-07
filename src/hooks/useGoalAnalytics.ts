import { useQuery } from "@tanstack/react-query";
import { goalAnalyticsApi } from "../api/goalAnalytics";
import type { AnalyticsFilter } from "../api/goalAnalytics";
import type { OKRTreeFilter } from "../types/goalAnalytics";

// ──────────────────────────────────────────────────
// Query Keys
// ──────────────────────────────────────────────────

export const goalAnalyticsKeys = {
  all: ["goalAnalytics"] as const,
  stats: (filter?: AnalyticsFilter) =>
    [...goalAnalyticsKeys.all, "stats", filter] as const,
  distributions: (deptId?: string, filter?: AnalyticsFilter) =>
    [...goalAnalyticsKeys.all, "distributions", deptId, filter] as const,
  progress: (filter?: AnalyticsFilter) =>
    [...goalAnalyticsKeys.all, "progress", filter] as const,
  atRisk: (page: number, limit: number, filter?: AnalyticsFilter) =>
    [...goalAnalyticsKeys.all, "atRisk", page, limit, filter] as const,
  trends: (months?: number, filter?: AnalyticsFilter) =>
    [...goalAnalyticsKeys.all, "trends", months, filter] as const,
  okrTree: (filter: OKRTreeFilter) =>
    [...goalAnalyticsKeys.all, "okrTree", filter] as const,
};

// ──────────────────────────────────────────────────
// Analytics Queries
// ──────────────────────────────────────────────────

export function useGoalStats(filter?: AnalyticsFilter) {
  return useQuery({
    queryKey: goalAnalyticsKeys.stats(filter),
    queryFn: () => goalAnalyticsApi.getStats(filter),
  });
}

export function useGoalDistributions(departmentId?: string, filter?: AnalyticsFilter) {
  return useQuery({
    queryKey: goalAnalyticsKeys.distributions(departmentId, filter),
    queryFn: () => goalAnalyticsApi.getDistributions(departmentId, filter),
  });
}

export function useProgressSummary(filter?: AnalyticsFilter) {
  return useQuery({
    queryKey: goalAnalyticsKeys.progress(filter),
    queryFn: () => goalAnalyticsApi.getProgressSummary(filter),
  });
}

export function useAtRiskGoals(page = 1, limit = 10, filter?: AnalyticsFilter) {
  return useQuery({
    queryKey: goalAnalyticsKeys.atRisk(page, limit, filter),
    queryFn: () => goalAnalyticsApi.getAtRiskGoals(page, limit, filter),
  });
}

export function useGoalTrends(months = 12, filter?: AnalyticsFilter) {
  return useQuery({
    queryKey: goalAnalyticsKeys.trends(months, filter),
    queryFn: () => goalAnalyticsApi.getTrends(months, filter),
  });
}

// ──────────────────────────────────────────────────
// OKR Tree Query
// ──────────────────────────────────────────────────

export function useOKRTree(filter: OKRTreeFilter = {}) {
  return useQuery({
    queryKey: goalAnalyticsKeys.okrTree(filter),
    queryFn: () => goalAnalyticsApi.getOKRTree(filter),
  });
}
