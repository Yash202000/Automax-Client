import type { GoalBrief } from "./goal";

export interface UserBrief {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  avatar: string;
}

export interface DepartmentBrief {
  id: string;
  name: string;
  code: string;
}

export interface Pillar {
  id: string;
  name_en: string;
  name_ar: string;
  owner_id?: string;
  owner?: UserBrief;
  is_active: boolean;
  created_at: string;
}

export interface Enabler {
  id: string;
  name_en: string;
  name_ar: string;
  owner_id?: string;
  owner?: UserBrief;
  is_active: boolean;
  created_at: string;
}

// "Parent Objective" in product terminology — links directly to a Goal.
export interface OperationalObjective {
  id: string;
  name_en: string;
  name_ar: string;
  goal_id: string;
  goal?: GoalBrief;
  pillar_id?: string;
  pillar?: Pillar;
  enabler_id?: string;
  enabler?: Enabler;
  is_active: boolean;
  created_at: string;
}

// "Child Objective" / "Operational Objective" in product terminology —
// links to a Parent Objective (OperationalObjective above).
export interface Process {
  id: string;
  name_en: string;
  name_ar: string;
  operational_objective_id: string;
  operational_objective?: OperationalObjective;
  goal_id: string;
  goal?: GoalBrief;
  pillar_id?: string;
  pillar?: Pillar;
  enabler_id?: string;
  enabler?: Enabler;
  department_id?: string;
  department?: DepartmentBrief;
  unit: string;
  is_active: boolean;
  created_at: string;
}

export interface Initiative {
  id: string;
  name_en: string;
  name_ar: string;
  goal_id: string;
  goal?: GoalBrief;
  objective_id?: string;
  objective?: OperationalObjective;
  pillar_id?: string;
  enabler_id?: string;
  owner_id?: string;
  owner?: UserBrief;
  status: string;
  created_at: string;
}

export interface Domain {
  id: string;
  name_en: string;
  name_ar: string;
  type: string;
  is_active: boolean;
}

export interface AwardCriterion {
  id: string;
  criterion_no: number;
  name_en: string;
  name_ar: string;
  is_active: boolean;
}

export interface AwardSubCriterion {
  id: string;
  award_criterion_id: string;
  award_criterion?: AwardCriterion;
  sub_no: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
}

export interface KpiDataSource {
  id: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
}

export interface KpiDataSourceRequest {
  name_en: string;
  name_ar?: string;
}

export interface KpiSegmentationDimension {
  id: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
}

export interface KpiSegmentationDimensionRequest {
  name_en: string;
  name_ar?: string;
}

export type KPIType = "strategic" | "operational" | "award";
export type KPIPolarity = "ascending" | "descending";
export type KPIActivationStatus = "draft" | "active" | "inactive";
export type KPIFrequency = "monthly" | "quarterly" | "annually";

export interface KpiDashboardData {
  total_strategic: number;
  total_operational: number;
  total_award: number;
  pending_reviews: number;
  kpis_by_status: { status: string; count: number }[];
  kpis_by_goal: { goal: string; count: number }[];
}

export interface PerformanceTrend {
  year: number;
  quarter: number;
  avg_achievement: number;
  kpi_count: number;
}

export interface KpiCardDef {
  code: string;
  type: string;
  name_en: string;
  name_ar: string;
  formula: string;
  baseline: number;
  unit_of_measure?: string;
  polarity: string;
  reporting_frequency: string;
  data_source: string;
  strategic_goal?: string;
  owner_dept?: string;
  activation_status: string;
}

export interface BenchmarkSummaryItem {
  kpi_code: string;
  zone: string;
  benchmark_entity: string;
  avg_internal: number;
  avg_benchmark: number;
  avg_variance: number;
}

export interface SegSummaryItem {
  dimension_name: string;
  segment_name: string;
  avg_achievement: number;
  avg_pct: number;
}

export interface TrendDataPoint {
  period: string;
  value: number;
}

export interface KpiPerformanceSummary {
  kpi_code: string;
  total_target: number;
  total_actual: number;
  avg_achievement: number;
  last_updated: string;
  quarterly_trend?: TrendDataPoint[];
}

export interface EnhancedKpiDashboardData extends KpiDashboardData {
  performance_trends: PerformanceTrend[];
  benchmark_summaries: BenchmarkSummaryItem[];
  segmentation_summaries: SegSummaryItem[];
  recent_kpi_cards: KpiCardDef[];
  top_performers: KpiPerformanceSummary[];
  low_performers: KpiPerformanceSummary[];
}

export interface StrategicKPI {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  pillar_id?: string;
  pillar?: Pillar;
  domain_id?: string;
  domain?: Domain;
  owner_dept_id?: string;
  owner_dept?: DepartmentBrief;
  goal_id: string;
  goal?: GoalBrief;
  process_id?: string;
  process?: Process;
  polarity: string;
  activation_status: string;
  description_en: string;
  description_ar: string;
  formula: string;
  baseline: number;
  unit_of_measure: string;
  reporting_frequency: string;
  lifecycle: string;
  data_source: string;
  segmentation_axes: string;
  related_units: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface OperationalKPI {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  goal_id: string;
  goal?: GoalBrief;
  operational_objective_id: string;
  operational_objective?: OperationalObjective;
  process_id: string;
  process?: Process;
  owner_dept_id?: string;
  owner_dept?: DepartmentBrief;
  polarity: string;
  activation_status: string;
  description_en: string;
  description_ar: string;
  formula: string;
  baseline: number;
  unit_of_measure: string;
  reporting_frequency: string;
  data_source: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AwardKPI {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  award_sub_criterion_id: string;
  award_sub_criterion?: AwardSubCriterion;
  owner_dept_id?: string;
  owner_dept?: DepartmentBrief;
  polarity: string;
  activation_status: string;
  description_en: string;
  description_ar: string;
  formula: string;
  baseline: number;
  unit_of_measure: string;
  reporting_frequency: string;
  data_source: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type KPIPerfStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "published";

export type KPIPeriodType =
  | "month"
  | "quarter"
  | "semi_annual"
  | "annual"
  | "custom";

export interface KpiAnnualTarget {
  id: string;
  kpi_code: string;
  kpi_type: KPIType;
  year: number;
  period_type: KPIPeriodType;
  period_key: string;
  target_value: number;
  created_at: string;
}

export interface KpiPerformance {
  id: string;
  kpi_code: string;
  kpi_type: KPIType;
  year: number;
  quarter: number;
  period_type: KPIPeriodType;
  period_key: string;
  target: number;
  actual: number;
  achievement_pct: number;
  trend_description: string;
  justification: string;
  corrective_action: string;
  status: KPIPerfStatus;
  submitted_by_id?: string;
  submitted_by?: UserBrief;
  approved_by_id?: string;
  approved_by?: UserBrief;
  created_at: string;
  updated_at: string;
}

export interface KpiBenchmark {
  id: string;
  kpi_code: string;
  kpi_type: KPIType;
  year: number;
  quarter: number;
  zone: string;
  department_id?: string;
  department?: DepartmentBrief;
  benchmark_entity: string;
  internal_achievement: number;
  benchmark_achievement: number;
  variance: number;
  notes: string;
  created_at: string;
}

export interface KpiBenchmarkRequest {
  kpi_code: string;
  kpi_type: KPIType;
  year: number;
  quarter?: number;
  zone?: string;
  department_id?: string;
  benchmark_entity: string;
  internal_achievement?: number;
  benchmark_achievement?: number;
  notes?: string;
}

export interface KpiSegmentation {
  id: string;
  kpi_code: string;
  kpi_type: KPIType;
  year: number;
  quarter: number;
  dimension_name: string;
  segment_name: string;
  target: number;
  achievement: number;
  achievement_pct: number;
  department_id?: string;
  department?: DepartmentBrief;
  zone: string;
  created_at: string;
}

export interface KpiSegmentationRequest {
  kpi_code: string;
  kpi_type: KPIType;
  year: number;
  quarter: number;
  dimension_name: string;
  segment_name: string;
  target?: number;
  achievement?: number;
  department_id?: string;
  zone?: string;
}

// kpi_code === null/undefined means this is the global default band.
export interface PerformanceBand {
  id: string;
  kpi_code?: string | null;
  green_min: number;
  amber_min: number;
  created_at: string;
  updated_at: string;
}

export interface PerformanceBandRequest {
  kpi_code?: string | null;
  green_min: number;
  amber_min: number;
}

export interface PillarRequest {
  name_en: string;
  name_ar?: string;
  owner_id?: string;
}

export interface EnablerRequest {
  name_en: string;
  name_ar?: string;
  owner_id?: string;
}

export interface OperationalObjectiveRequest {
  name_en: string;
  name_ar?: string;
  goal_id: string;
  pillar_id?: string;
  enabler_id?: string;
}

export interface ProcessRequest {
  name_en: string;
  name_ar?: string;
  operational_objective_id: string;
  goal_id: string;
  pillar_id?: string;
  enabler_id?: string;
  department_id?: string;
  unit?: string;
}

export interface InitiativeRequest {
  name_en: string;
  name_ar?: string;
  goal_id: string;
  objective_id?: string;
  pillar_id?: string;
  enabler_id?: string;
  owner_id?: string;
  status?: string;
}

export interface DomainRequest {
  name_en: string;
  name_ar?: string;
  type: string;
}

export interface AwardCriterionRequest {
  criterion_no: number;
  name_en: string;
  name_ar?: string;
}

export interface AwardSubCriterionRequest {
  award_criterion_id: string;
  sub_no: string;
  name_en: string;
  name_ar?: string;
}

export interface StrategicKPIRequest {
  code: string;
  name_en: string;
  name_ar?: string;
  pillar_id?: string;
  domain_id?: string;
  owner_dept_id?: string;
  goal_id: string;
  process_id: string;
  polarity?: string;
  activation_status?: string;
  description_en?: string;
  description_ar?: string;
  formula?: string;
  baseline?: number;
  unit_of_measure?: string;
  reporting_frequency?: string;
  lifecycle?: string;
  data_source?: string;
  segmentation_axes?: string;
  related_units?: string;
  notes?: string;
}

export interface OperationalKPIRequest {
  code: string;
  name_en: string;
  name_ar?: string;
  goal_id: string;
  operational_objective_id: string;
  process_id: string;
  owner_dept_id?: string;
  polarity?: string;
  activation_status?: string;
  description_en?: string;
  description_ar?: string;
  formula?: string;
  baseline?: number;
  unit_of_measure?: string;
  reporting_frequency?: string;
  data_source?: string;
  notes?: string;
}

export interface AwardKPIRequest {
  code: string;
  name_en: string;
  name_ar?: string;
  award_sub_criterion_id: string;
  owner_dept_id?: string;
  polarity?: string;
  activation_status?: string;
  description_en?: string;
  description_ar?: string;
  formula?: string;
  baseline?: number;
  unit_of_measure?: string;
  reporting_frequency?: string;
  data_source?: string;
  notes?: string;
}

export interface KpiAnnualTargetRequest {
  kpi_code: string;
  kpi_type: KPIType;
  year: number;
  period_type?: KPIPeriodType;
  period_key?: string;
  target_value: number;
}

export interface KpiPerformanceRequest {
  kpi_code: string;
  kpi_type: KPIType;
  year: number;
  quarter: number;
  period_type?: KPIPeriodType;
  period_key?: string;
  target?: number;
  actual?: number;
  trend_description?: string;
  justification?: string;
  corrective_action?: string;
}

export interface KpiPerformanceUpdateRequest {
  target: number;
  actual: number;
  trend_description?: string;
  justification?: string;
  corrective_action?: string;
}

export interface KpiPerformanceEvidence {
  id: string;
  kpi_performance_id: string;
  description: string;
  file_url: string;
  uploaded_by_id: string;
  uploaded_by?: UserBrief;
  created_at: string;
}

export interface KpiPerformanceEvidenceRequest {
  description: string;
  file_url?: string;
}

export interface WorkflowTransitionBrief {
  id: string;
  workflow_id: string;
  name: string;
  code: string;
  from_state_id: string;
  to_state_id: string;
  to_state?: { id: string; name: string; code: string };
  description?: string;
  is_rejection?: boolean;
}

export interface KpiWorkflowAction {
  id: string;
  workflow_instance_id: string;
  transition_id: string;
  transition_name?: string;
  from_state_name?: string;
  to_state_name?: string;
  performed_by_id: string;
  performed_by?: UserBrief;
  comment: string;
  performed_at: string;
  created_at: string;
}

export type CorrectiveActionStatus =
  | "open"
  | "in_progress"
  | "closed"
  | "escalated";

export interface KpiCorrectiveAction {
  id: string;
  kpi_performance_id: string;
  description: string;
  owner_id: string;
  owner?: UserBrief;
  due_date?: string;
  status: CorrectiveActionStatus;
  closure_note: string;
  closure_evidence_url: string;
  escalated_at?: string;
  created_by_id: string;
  created_by?: UserBrief;
  created_at: string;
  updated_at: string;
}

export interface KpiCorrectiveActionRequest {
  kpi_performance_id: string;
  description: string;
  owner_id: string;
  due_date?: string;
}

export interface KpiCorrectiveActionStatusRequest {
  status: CorrectiveActionStatus;
  closure_note?: string;
  closure_evidence_url?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total_items: number;
  page: number;
  limit: number;
}

// ─── KPI Engagement (Metrics, Evidence, Collaborators, Check-ins, Comments, Activity) ──

export interface KpiMetric {
  id: string;
  kpi_id: string;
  kpi_type: KPIType;
  name: string;
  metric_type: string;
  unit: string;
  baseline_value: number;
  current_value: number;
  target_value: number;
  weight: number;
  formula?: string;
  start_date?: string;
  due_date?: string;
  created_by_id: string;
  created_by?: UserBrief;
  created_at: string;
  updated_at: string;
}

export interface KpiMetricRequest {
  name: string;
  metric_type?: string;
  unit?: string;
  baseline_value?: number;
  target_value: number;
  weight?: number;
  formula?: string;
  start_date?: string;
  due_date?: string;
  attachment_title?: string;
  attachment_file_url?: string;
}

export interface KpiEngagementEvidence {
  id: string;
  kpi_id: string;
  kpi_type: KPIType;
  title: string;
  description: string;
  file_url: string;
  uploaded_by_id: string;
  uploaded_by?: UserBrief;
  created_at: string;
}

export interface KpiEngagementEvidenceRequest {
  title: string;
  description?: string;
  file_url?: string;
}

export type KpiCollaboratorRole = "collaborator" | "reviewer";

export interface KpiCollaborator {
  id: string;
  kpi_id: string;
  kpi_type: KPIType;
  user_id: string;
  user?: UserBrief;
  role: KpiCollaboratorRole;
  created_at: string;
}

export interface KpiCollaboratorAddRequest {
  user_id: string;
  role?: KpiCollaboratorRole;
}

export type KpiCheckInStatus = "on_track" | "at_risk" | "behind" | "blocked";

export interface KpiCheckIn {
  id: string;
  kpi_id: string;
  kpi_type: KPIType;
  author_id: string;
  author?: UserBrief;
  status: KpiCheckInStatus;
  content: string;
  created_at: string;
}

export interface KpiCheckInRequest {
  status: KpiCheckInStatus;
  content: string;
}

export interface KpiComment {
  id: string;
  kpi_id: string;
  kpi_type: KPIType;
  author_id: string;
  author?: UserBrief;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface KpiCommentRequest {
  content: string;
}

export interface KpiActivity {
  id: string;
  action: string;
  module: string;
  resource_id: string;
  description: string;
  user?: UserBrief;
  created_at: string;
}

export interface KpiListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}
