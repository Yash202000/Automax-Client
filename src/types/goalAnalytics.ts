import type { GoalStatus, GoalPriority, UserBrief, DepartmentBrief } from "./goal";

// ──────────────────────────────────────────────────
// Analytics Response Types
// ──────────────────────────────────────────────────

export interface GoalStats {
  total: number;
  active: number;
  draft: number;
  under_review: number;
  achieved: number;
  missed: number;
  closed: number;
  overdue: number;
  at_risk: number;
}

export interface DistributionItem {
  label: string;
  value: number;
  color?: string;
}

export interface GoalDistributions {
  by_status: DistributionItem[];
  by_priority: DistributionItem[];
  by_department: DistributionItem[];
  by_category: DistributionItem[];
}

export interface ProgressSummary {
  average: number;
  ranges: DistributionItem[];
}

export interface AtRiskGoal {
  id: string;
  title: string;
  status: GoalStatus;
  priority: GoalPriority;
  progress: number;
  target_date?: string;
  owner?: UserBrief;
  department?: DepartmentBrief;
  last_check_in_status: string;
  days_overdue: number;
  risk_reason: string;
}

export interface AtRiskGoalsResponse {
  success: boolean;
  data: AtRiskGoal[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface TrendPoint {
  month: string;
  created: number;
  completed: number;
}

export interface TrendData {
  points: TrendPoint[];
}

// ──────────────────────────────────────────────────
// OKR Tree Types
// ──────────────────────────────────────────────────

export interface OKRTree {
  departments: OKRDepartmentNode[];
  total_goals: number;
}

export interface OKRDepartmentNode {
  id: string;
  name: string;
  code: string;
  level: number;
  goal_count: number;
  average_progress: number;
  goals: OKRGoalNode[];
  children?: OKRDepartmentNode[];
}

export interface OKRGoalNode {
  id: string;
  title: string;
  status: GoalStatus;
  priority: GoalPriority;
  progress: number;
  owner?: UserBrief;
  target_date?: string;
  level: number;
  metric_summary: string;
  health: "on_track" | "at_risk" | "behind";
  children?: OKRGoalNode[];
}

export interface OKRTreeFilter {
  department_id?: string;
  period_start?: string;
  period_end?: string;
  status?: string;
}
