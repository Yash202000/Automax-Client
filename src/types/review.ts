import type { UserBrief, DepartmentBrief, GoalBrief } from "./goal";

// ──────────────────────────────────────────────────
// Review Cycle Types
// ──────────────────────────────────────────────────

export type ReviewCycleStatus = "draft" | "active" | "completed" | "archived";
export type ReviewAssignmentStatus = "pending" | "in_progress" | "completed";

export interface ReviewCycle {
  id: string;
  title: string;
  description: string;
  period_start: string;
  period_end: string;
  status: ReviewCycleStatus;
  department_id?: string;
  department?: DepartmentBrief;
  created_by_id: string;
  created_by?: UserBrief;
  assignment_count: number;
  completed_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewCycleBrief {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  status: ReviewCycleStatus;
}

// ──────────────────────────────────────────────────
// Review Assignment Types
// ──────────────────────────────────────────────────

export interface GoalScoreResponse {
  id: string;
  goal_id: string;
  goal?: GoalBrief;
  weight: number;
  achievement_pct: number;
  rating?: number;
  comments: string;
}

export interface ReviewAssignment {
  id: string;
  cycle_id: string;
  cycle?: ReviewCycleBrief;
  employee_id: string;
  employee?: UserBrief;
  reviewer_id: string;
  reviewer?: UserBrief;
  status: ReviewAssignmentStatus;
  overall_rating?: number;
  comments: string;
  completed_at?: string;
  goal_scores?: GoalScoreResponse[];
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────────
// Request Types
// ──────────────────────────────────────────────────

export interface ReviewCycleCreateRequest {
  title: string;
  description?: string;
  period_start: string;
  period_end: string;
  department_id?: string;
}

export interface ReviewCycleUpdateRequest {
  title?: string;
  description?: string;
  period_start?: string;
  period_end?: string;
  department_id?: string;
}

export interface ReviewAssignmentCreateRequest {
  employee_id: string;
  reviewer_id: string;
}

export interface BulkAssignRequest {
  assignments: ReviewAssignmentCreateRequest[];
}

export interface GoalScoreUpdateRequest {
  goal_id: string;
  weight: number;
  rating?: number;
  comments?: string;
}

export interface ReviewSubmitRequest {
  overall_rating: number;
  comments?: string;
  goal_scores?: GoalScoreUpdateRequest[];
}
