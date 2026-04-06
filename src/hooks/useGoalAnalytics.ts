import { useQuery } from "@tanstack/react-query";
import { goalAnalyticsApi } from "../api/goalAnalytics";
import type { OKRTreeFilter } from "../types/goalAnalytics";

// ──────────────────────────────────────────────────
// Query Keys
// ──────────────────────────────────────────────────

export const goalAnalyticsKeys = {
  all: ["goalAnalytics"] as const,
  stats: () => [...goalAnalyticsKeys.all, "stats"] as const,
  distributions: (deptId?: string) =>
    [...goalAnalyticsKeys.all, "distributions", deptId] as const,
  progress: () => [...goalAnalyticsKeys.all, "progress"] as const,
  atRisk: (page: number, limit: number) =>
    [...goalAnalyticsKeys.all, "atRisk", page, limit] as const,
  trends: (months?: number) =>
    [...goalAnalyticsKeys.all, "trends", months] as const,
  okrTree: (filter: OKRTreeFilter) =>
    [...goalAnalyticsKeys.all, "okrTree", filter] as const,
};

// ──────────────────────────────────────────────────
// Analytics Queries
// ──────────────────────────────────────────────────

export function useGoalStats() {
  return useQuery({
    queryKey: goalAnalyticsKeys.stats(),
    queryFn: () => goalAnalyticsApi.getStats(),
  });
}

export function useGoalDistributions(departmentId?: string) {
  return useQuery({
    queryKey: goalAnalyticsKeys.distributions(departmentId),
    queryFn: () => goalAnalyticsApi.getDistributions(departmentId),
  });
}

export function useProgressSummary() {
  return useQuery({
    queryKey: goalAnalyticsKeys.progress(),
    queryFn: () => goalAnalyticsApi.getProgressSummary(),
  });
}

export function useAtRiskGoals(page = 1, limit = 10) {
  return useQuery({
    queryKey: goalAnalyticsKeys.atRisk(page, limit),
    queryFn: () => goalAnalyticsApi.getAtRiskGoals(page, limit),
  });
}

export function useGoalTrends(months = 12) {
  return useQuery({
    queryKey: goalAnalyticsKeys.trends(months),
    queryFn: () => goalAnalyticsApi.getTrends(months),
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
