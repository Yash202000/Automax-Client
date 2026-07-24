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
  owner?: DepartmentBrief;
  is_active: boolean;
  created_at: string;
}

export interface Enabler {
  id: string;
  name_en: string;
  name_ar: string;
  owner_id?: string;
  owner?: DepartmentBrief;
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
  pillar?: Pillar;
  enabler_id?: string;
  enabler?: Enabler;
  owner_id?: string;
  owner?: DepartmentBrief;
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

export type KpiTargetStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "returned"
  | "rejected"
  | "locked"
  | "superseded";

export type KpiTargetType =
  | "Period Target"
  | "Annual Target"
  | "Milestone / Ad Hoc";

export type KpiTargetBasis =
  | "Strategic Plan"
  | "Previous Year"
  | "Benchmark"
  | "Regulatory Requirement"
  | "Contract / SLA"
  | "Management Decision"
  | "Forecast"
  | "Other";

export interface KpiTargetSegmentationValue {
  dimension: string;
  value: string;
}

export interface KpiTarget {
  id: string;
  kpi_code: string;
  kpi_type: KPIType;
  metric_id: string;
  metric?: { id: string; name: string };
  calculation_type_snapshot: KpiCalculationType;
  direction_snapshot: KpiDirection;
  unit_snapshot: string;
  decimal_precision_snapshot: number;
  reporting_frequency_snapshot: string;
  target_year: number;
  period_code: string;
  period_start: string;
  period_end: string;
  target_value?: number;
  target_type: KpiTargetType;
  target_basis: KpiTargetBasis;
  target_rationale: string;
  threshold_mode: KpiThresholdMode;
  excellent_threshold?: number;
  achieved_threshold?: number;
  warning_threshold?: number;
  target_range_min?: number;
  target_range_max?: number;
  segmentation_values?: KpiTargetSegmentationValue[];
  target_status: KpiTargetStatus;
  effective_from?: string;
  effective_to?: string;
  approved_by_id?: string;
  approved_by?: UserBrief;
  approved_at?: string;
  supersedes_entry_id?: string;
  created_at: string;
  updated_at: string;
}

// Keep the old name as alias for backward compatibility
export type KpiAnnualTarget = KpiTarget;

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
  metric_id: string;
  target_year: number;
  period_code: string;
  target_value?: number;
  target_type: KpiTargetType;
  target_basis: KpiTargetBasis;
  target_rationale: string;
  threshold_mode: KpiThresholdMode;
  excellent_threshold?: number;
  achieved_threshold?: number;
  warning_threshold?: number;
  target_range_min?: number;
  target_range_max?: number;
  segmentation_values?: KpiTargetSegmentationValue[];
  effective_from?: string;
  effective_to?: string;
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

export type KpiCalculationType =
  | "Direct Value"
  | "Percentage - Ratio"
  | "Ratio"
  | "Average"
  | "Sum"
  | "Difference"
  | "Weighted Average"
  | "Formula";

export type KpiDirection =
  | "Higher is Better"
  | "Lower is Better"
  | "Target Range"
  | "Exact Target"
  | "Informational";

export type KpiAggregationMethod =
  | "Sum"
  | "Average"
  | "Latest Approved Value"
  | "Minimum"
  | "Maximum"
  | "Weighted Average"
  | "No Aggregation";

export type KpiThresholdMode =
  | "Use Global KPI Rules"
  | "Percentage of Target"
  | "Absolute Values"
  | "Target Range"
  | "No Thresholds";

export type KpiPerformanceStatus =
  | "Exceeded"
  | "Achieved"
  | "Warning"
  | "Below Target"
  | "In Range"
  | "Out of Range"
  | "Informational"
  | "Not Calculable";

export type KpiDataSourceType =
  | "Manual"
  | "System Integration"
  | "File Import"
  | "Database Query"
  | "Certified Report"
  | "Other";

export type KpiDataQualityStatus =
  | "Complete"
  | "Partial"
  | "Estimated"
  | "Provisional"
  | "Corrected"
  | "Not Verified";

export interface KpiMetricSnapshot {
  calculation_type: KpiCalculationType;
  direction: KpiDirection;
  unit?: string;
  decimal_precision: number;
  numerator_label?: string;
  denominator_label?: string;
  aggregation_method: KpiAggregationMethod;
}

export interface KpiMetric extends KpiMetricSnapshot {
  id: string;
  kpi_id: string;
  kpi_type: KPIType;
  name: string;
  metric_code?: string;
  metric_description?: string;
  metric_status?: string;
  display_order?: number;
  metric_type: string;
  unit?: string;
  custom_unit_label?: string;
  baseline_value: number;
  current_value: number;
  target_value: number;
  weight: number;
  formula?: string;
  reporting_frequency?: string;
  numerator_label?: string;
  numerator_variable_code?: string;
  denominator_label?: string;
  denominator_variable_code?: string;
  direct_actual_label?: string;
  allow_manual_actual_override?: boolean;
  advanced_formula_enabled?: boolean;
  formula_code?: string;
  divide_by_zero_handling?: string;
  rounding_rule?: string;
  calculation_trace_required?: boolean;
  metric_owner_id?: string;
  metric_owner?: UserBrief;
  data_source?: string;
  evidence_required?: boolean;
  start_date?: string;
  due_date?: string;
  created_by_id: string;
  created_by?: UserBrief;
  created_at: string;
  updated_at: string;
}

export interface KpiMetricRequest {
  name: string;
  metric_code?: string;
  metric_description?: string;
  metric_status?: string;
  display_order?: number;
  metric_type?: string;
  unit?: string;
  custom_unit_label?: string;
  baseline_value?: number;
  target_value: number;
  weight?: number;
  formula?: string;
  calculation_type?: KpiCalculationType;
  direction?: KpiDirection;
  decimal_precision?: number;
  aggregation_method?: KpiAggregationMethod;
  reporting_frequency?: string;
  numerator_label?: string;
  numerator_variable_code?: string;
  denominator_label?: string;
  denominator_variable_code?: string;
  direct_actual_label?: string;
  allow_manual_actual_override?: boolean;
  advanced_formula_enabled?: boolean;
  formula_code?: string;
  divide_by_zero_handling?: string;
  rounding_rule?: string;
  calculation_trace_required?: boolean;
  metric_owner_id?: string;
  data_source?: string;
  evidence_required?: boolean;
  start_date?: string;
  due_date?: string;
}

export interface KpiAttachmentUploadResult {
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

export type KpiEvidenceType =
  | "Report"
  | "Photo"
  | "Certificate"
  | "Invoice"
  | "Other";

export const KPI_EVIDENCE_TYPE_OPTIONS: {
  value: KpiEvidenceType;
  label: string;
}[] = [
  { value: "Report", label: "Report" },
  { value: "Photo", label: "Photo" },
  { value: "Certificate", label: "Certificate" },
  { value: "Invoice", label: "Invoice" },
  { value: "Other", label: "Other" },
];

export interface KpiEngagementEvidence {
  id: string;
  kpi_id: string;
  kpi_type: KPIType;
  title: string;
  evidence_type: KpiEvidenceType;
  description: string;
  metric_id?: string;
  metric?: { id: string; name: string };
  file_url: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by_id: string;
  uploaded_by?: UserBrief;
  created_at: string;
}

export interface KpiEngagementEvidenceRequest {
  title: string;
  evidence_type?: KpiEvidenceType;
  description?: string;
  metric_id?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
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

// ─── KPI Entries ──────────────────────────────────────────────────────────

export type KpiEntryStatus = "draft" | "submitted" | "approved" | "rejected";

export interface KpiEntryComponentValue {
  component: string;
  value: number;
  weight?: number;
  sequence: number;
}

export interface KpiEntry {
  id: string;
  kpi_id: string;
  kpi_type: KPIType;
  metric_id: string;
  metric?: { id: string; name: string };
  reporting_year: number;
  period_code: string;
  period_start: string;
  period_end: string;
  calculation_type_snapshot: KpiCalculationType;
  direction_snapshot: KpiDirection;
  unit_snapshot: string;
  decimal_precision_snapshot: number;
  numerator_label_snapshot?: string;
  denominator_label_snapshot?: string;
  aggregation_method_snapshot: KpiAggregationMethod;
  target_id?: string;
  target_value_snapshot?: number;
  threshold_mode_snapshot: KpiThresholdMode;
  direct_actual_value?: number;
  numerator_value?: number;
  denominator_value?: number;
  component_values?: KpiEntryComponentValue[];
  actual_value: number;
  actual_calculation_trace: string;
  achievement_percentage?: number;
  variance_value?: number;
  performance_status: KpiPerformanceStatus;
  aggregated_value?: number;
  data_source_type: KpiDataSourceType;
  source_reference: string;
  data_cutoff_date: string;
  data_quality_status: KpiDataQualityStatus;
  data_quality_notes?: string;
  evidence?: KpiEntryEvidence[];
  evidence_count: number;
  performance_commentary?: string;
  improvement_action?: string;
  status: KpiEntryStatus;
  submitted_by_id?: string;
  submitted_by?: UserBrief;
  approved_by_id?: string;
  approved_by?: UserBrief;
  entry_version: number;
  supersedes_entry_id?: string;
  created_at: string;
  updated_at: string;
}

export interface KpiEntryRequest {
  metric_id: string;
  reporting_year: number;
  period_code: string;
  direct_actual_value?: number;
  numerator_value?: number;
  denominator_value?: number;
  component_values?: KpiEntryComponentValue[];
  data_source_type: KpiDataSourceType;
  source_reference: string;
  data_cutoff_date: string;
  data_quality_status: KpiDataQualityStatus;
  data_quality_notes?: string;
  performance_commentary?: string;
  improvement_action?: string;
}

export interface KpiEntryEvidence {
  id: string;
  entry_id: string;
  title: string;
  evidence_type: KpiEvidenceType;
  description: string;
  file_url: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by_id: string;
  uploaded_by?: UserBrief;
  created_at: string;
}

// ─── Period & Entry Utility Constants ──────────────────────────────────────

export const REPORTING_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const REPORTING_QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

export const REPORTING_SEMI_ANNUALS = ["H1", "H2"] as const;

export const DATA_SOURCE_TYPE_OPTIONS: {
  value: KpiDataSourceType;
  label: string;
}[] = [
  { value: "Manual", label: "Manual" },
  { value: "System Integration", label: "System Integration" },
  { value: "File Import", label: "File Import" },
  { value: "Database Query", label: "Database Query" },
  { value: "Certified Report", label: "Certified Report" },
  { value: "Other", label: "Other" },
];

export const DATA_QUALITY_STATUS_OPTIONS: {
  value: KpiDataQualityStatus;
  label: string;
}[] = [
  { value: "Complete", label: "Complete" },
  { value: "Partial", label: "Partial" },
  { value: "Estimated", label: "Estimated" },
  { value: "Provisional", label: "Provisional" },
  { value: "Corrected", label: "Corrected" },
  { value: "Not Verified", label: "Not Verified" },
];

export const CALCULATION_TYPE_OPTIONS: {
  value: KpiCalculationType;
  label: string;
}[] = [
  { value: "Direct Value", label: "Direct Value" },
  { value: "Percentage - Ratio", label: "Percentage - Ratio" },
  { value: "Ratio", label: "Ratio" },
  { value: "Average", label: "Average" },
  { value: "Sum", label: "Sum" },
  { value: "Difference", label: "Difference" },
  { value: "Weighted Average", label: "Weighted Average" },
  { value: "Formula", label: "Formula (Phase 2)" },
];

export const DIRECTION_OPTIONS: { value: KpiDirection; label: string }[] = [
  { value: "Higher is Better", label: "Higher is Better" },
  { value: "Lower is Better", label: "Lower is Better" },
  { value: "Target Range", label: "Target Range" },
  { value: "Exact Target", label: "Exact Target" },
  { value: "Informational", label: "Informational" },
];

export const AGGREGATION_METHOD_OPTIONS: {
  value: KpiAggregationMethod;
  label: string;
}[] = [
  { value: "Sum", label: "Sum" },
  { value: "Average", label: "Average" },
  { value: "Latest Approved Value", label: "Latest Approved Value" },
  { value: "Minimum", label: "Minimum" },
  { value: "Maximum", label: "Maximum" },
  { value: "Weighted Average", label: "Weighted Average" },
  { value: "No Aggregation", label: "No Aggregation" },
];

export const THRESHOLD_MODE_OPTIONS: {
  value: KpiThresholdMode;
  label: string;
}[] = [
  { value: "Use Global KPI Rules", label: "Use Global KPI Rules" },
  { value: "Percentage of Target", label: "Percentage of Target" },
  { value: "Absolute Values", label: "Absolute Values" },
  { value: "Target Range", label: "Target Range" },
  { value: "No Thresholds", label: "No Thresholds" },
];

export function getPeriodOptionsByFrequency(
  frequency?: string,
): { value: string; label: string }[] {
  switch (frequency) {
    case "monthly":
      return REPORTING_MONTHS.map((m) => ({
        value: m.toLowerCase(),
        label: m,
      }));
    case "quarterly":
      return REPORTING_QUARTERS.map((q) => ({
        value: q.toLowerCase(),
        label: q,
      }));
    case "semi_annual":
    case "semiannual":
      return REPORTING_SEMI_ANNUALS.map((h) => ({
        value: h.toLowerCase(),
        label: h,
      }));
    case "annually":
    case "annual":
      return [{ value: "annual", label: "Annual" }];
    default:
      return REPORTING_MONTHS.map((m) => ({
        value: m.toLowerCase(),
        label: m,
      }));
  }
}

export function getYearOptions(): { value: number; label: string }[] {
  const current = new Date().getFullYear();
  const years: { value: number; label: string }[] = [];
  for (let y = current - 2; y <= current + 3; y++) {
    years.push({ value: y, label: String(y) });
  }
  return years;
}

export function formatPeriodDate(year: number, periodCode: string): string {
  return `${year}-${periodCode.toUpperCase()}-01`;
}

// ─── Target Utility Constants ─────────────────────────────────────────────

export const TARGET_TYPE_OPTIONS: { value: KpiTargetType; label: string }[] = [
  { value: "Period Target", label: "Period Target" },
  { value: "Annual Target", label: "Annual Target" },
  { value: "Milestone / Ad Hoc", label: "Milestone / Ad Hoc" },
];

export const TARGET_BASIS_OPTIONS: { value: KpiTargetBasis; label: string }[] =
  [
    { value: "Strategic Plan", label: "Strategic Plan" },
    { value: "Previous Year", label: "Previous Year" },
    { value: "Benchmark", label: "Benchmark" },
    { value: "Regulatory Requirement", label: "Regulatory Requirement" },
    { value: "Contract / SLA", label: "Contract / SLA" },
    { value: "Management Decision", label: "Management Decision" },
    { value: "Forecast", label: "Forecast" },
    { value: "Other", label: "Other" },
  ];

export const TARGET_STATUS_OPTIONS: {
  value: KpiTargetStatus;
  label: string;
}[] = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "returned", label: "Returned" },
  { value: "rejected", label: "Rejected" },
  { value: "locked", label: "Locked" },
  { value: "superseded", label: "Superseded" },
];

// ─── Collaborator Assignment Types ─────────────────────────────────────────

export interface KpiCollaboratorAssignment {
  id: string;
  kpi_id: string;
  kpi_type: string;
  user_id: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    is_active: boolean;
  };
  user_category: string;
  collaborator_type: string;
  organization_scope: string[];
  metric_scope: string;
  metric_scope_ids: string[];
  period_scope: string;
  period_scope_year: number;
  period_scope_periods: string[];
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  delegate_for_user_id?: string;
  delegate_for_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    is_active: boolean;
  };
  delegation_reason?: string;
  notification_prefs: string[];
  created_by_id: string;
  created_by?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    is_active: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface KpiCollaboratorAssignmentRequest {
  user_id: string;
  user_category: string;
  collaborator_type: string;
  organization_scope?: string[];
  metric_scope?: string;
  metric_scope_ids?: string[];
  period_scope?: string;
  period_scope_year?: number;
  period_scope_periods?: string[];
  effective_from: string;
  effective_to?: string;
  is_active?: boolean;
  delegate_for_user_id?: string;
  delegation_reason?: string;
  notification_prefs?: string[];
}

export interface CollaboratorPermissionMatrix {
  collaborator_type: string;
  view_kpi: boolean;
  view_entries: boolean;
  create_draft: boolean;
  edit_own_draft: boolean;
  edit_others_draft: string;
  submit_entry: boolean;
  review: string;
  return: boolean;
  approve_reject: string;
  manage_targets: string;
  manage_collaborators: boolean;
  scope_rule: string;
  critical_constraint: string;
}

export const COLLABORATOR_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "KPI Owner", label: "KPI Owner" },
  { value: "Data Contributor", label: "Data Contributor" },
  { value: "Data Submitter", label: "Data Submitter" },
  { value: "Reviewer", label: "Reviewer" },
  { value: "Approver", label: "Approver" },
  { value: "Viewer", label: "Viewer" },
];

export const USER_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "Internal Employee", label: "Internal Employee" },
  { value: "External Consultant", label: "External Consultant" },
  { value: "Contractor", label: "Contractor" },
  { value: "Service Provider", label: "Service Provider" },
  {
    value: "System / Integration Account",
    label: "System / Integration Account",
  },
];

export const PERIOD_SCOPE_OPTIONS: { value: string; label: string }[] = [
  { value: "All Periods", label: "All Periods" },
  { value: "Current Period", label: "Current Period" },
  { value: "Specific Year", label: "Specific Year" },
  { value: "Specific Periods", label: "Specific Periods" },
];

export const NOTIFICATION_PREF_OPTIONS: { value: string; label: string }[] = [
  { value: "Assignment", label: "Assignment" },
  { value: "Period Open", label: "Period Open" },
  { value: "Reminder", label: "Reminder" },
  { value: "Submitted", label: "Submitted" },
  { value: "Returned", label: "Returned" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "Locked", label: "Locked" },
];
