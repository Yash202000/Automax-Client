// ──────────────────────────────────────────────────
// Goal Status & Priority
// ──────────────────────────────────────────────────

export type GoalStatus =
  | "Draft"
  | "Active"
  | "Under_Review"
  | "Achieved"
  | "Missed"
  | "Closed";

export type GoalPriority = "Critical" | "High" | "Medium" | "Low";

export type MetricType = "Numeric" | "Percentage" | "Currency" | "Boolean";

export type EvidenceType =
  | "Report"
  | "Photo"
  | "Certificate"
  | "Invoice"
  | "Other";

export type CollaboratorRole = "collaborator" | "reviewer_l1" | "reviewer_l2";

// ──────────────────────────────────────────────────
// Brief / Embedded Types
// ──────────────────────────────────────────────────

export interface UserBrief {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string;
}

export interface DepartmentBrief {
  id: string;
  name: string;
  code: string;
}

// ──────────────────────────────────────────────────
// Response Types (match Go GoalResponse, etc.)
// ──────────────────────────────────────────────────

export interface GoalBrief {
  id: string;
  title: string;
  status: GoalStatus;
  priority: GoalPriority;
  progress: number;
  level: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  category_id?: string | null;
  priority: GoalPriority;
  status: GoalStatus;
  owner_id: string;
  owner?: UserBrief;
  department_id?: string;
  department?: DepartmentBrief;
  parent_goal_id?: string;
  parent_goal?: GoalBrief;
  children?: GoalBrief[];
  level: number;
  path: string;
  start_date?: string;
  target_date?: string;
  review_date?: string;
  progress: number;
  documenta_folder_id: string;
  metadata: string;
  created_by_id: string;
  created_by?: UserBrief;
  collaborators?: GoalCollaborator[];
  metrics?: GoalMetric[];
  evidence_count: number;
  created_at: string;
  updated_at: string;
}

export interface GoalMetric {
  id: string;
  goal_id: string;
  name: string;
  metric_type: MetricType;
  unit: string;
  baseline_value: number;
  current_value: number;
  target_value: number;
  weight: number;
  formula?: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface MetricHistory {
  id: string;
  metric_id: string;
  old_value: number;
  new_value: number;
  changed_by_id: string;
  changed_by?: UserBrief;
  comment: string;
  created_at: string;
}

export interface GoalCollaborator {
  id: string;
  user_id: string;
  user?: UserBrief;
  role: CollaboratorRole;
  created_at: string;
}

export interface WorkflowStateBrief {
  id: string;
  name: string;
  code: string;
  state_type: string;
  color: string;
}

export interface Evidence {
  id: string;
  goal_id: string;
  metric_id?: string;
  title: string;
  evidence_type: EvidenceType;
  comment: string;
  documenta_file_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by_id: string;
  uploaded_by?: UserBrief;
  workflow_id?: string;
  current_state_id?: string;
  current_state?: WorkflowStateBrief;
  assigned_to_id?: string;
  assigned_to?: UserBrief;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface EvidenceTransitionHistory {
  id: string;
  evidence_id: string;
  transition_name: string;
  from_state_name: string;
  to_state_name: string;
  from_state_color: string;
  to_state_color: string;
  performed_by_id: string;
  performed_by?: UserBrief;
  comment: string;
  is_system_action: boolean;
  transitioned_at: string;
  created_at: string;
}

export interface AvailableTransition {
  transition: WorkflowTransitionBrief;
  can_execute: boolean;
  requirements?: TransitionRequirement[];
  reason?: string;
}

export interface WorkflowTransitionBrief {
  id: string;
  workflow_id: string;
  name: string;
  code: string;
  description: string;
  from_state_id: string;
  to_state_id: string;
  is_rejection: boolean;
  is_active: boolean;
  sort_order: number;
  requirements?: TransitionRequirement[];
}

export interface TransitionRequirement {
  id: string;
  transition_id: string;
  requirement_type: string;
  field_name?: string;
  field_value?: string;
  is_mandatory?: boolean;
  error_message?: string;
}

export interface ApprovalListItem {
  id: string;
  evidence_id: string;
  evidence_title: string;
  evidence_version: number;
  goal_id: string;
  goal_title: string;
  goal_priority: GoalPriority;
  status: string;
  state_name: string;
  state_color: string;
  submitted_by?: UserBrief;
  assigned_to?: UserBrief;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────────
// Comment & Activity Types
// ──────────────────────────────────────────────────

export interface GoalComment {
  id: string;
  goal_id: string;
  author?: UserBrief;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface GoalCommentListResponse {
  success: boolean;
  data: GoalComment[];
  total: number;
  page: number;
  limit: number;
}

export interface GoalActivity {
  id: string;
  goal_id: string;
  action: string;
  description: string;
  user?: UserBrief;
  created_at: string;
}

export interface GoalActivityListResponse {
  success: boolean;
  data: GoalActivity[];
  total: number;
  page: number;
  limit: number;
}

// ──────────────────────────────────────────────────
// Request Types
// ──────────────────────────────────────────────────

export interface GoalCreateRequest {
  title: string;
  description?: string;
  /** Legacy free-text category (kept for backward compatibility). */
  category?: string;
  /** Preferred: uuid of a Category in the hierarchy. */
  category_id?: string;
  priority: GoalPriority;
  owner_id: string;
  department_id?: string;
  parent_goal_id?: string;
  start_date?: string;
  target_date?: string;
  review_date?: string;
  metadata?: string;
}

export interface GoalUpdateRequest {
  title?: string;
  description?: string;
  /** Legacy free-text category (kept for backward compatibility). */
  category?: string;
  /** Preferred: uuid of a Category in the hierarchy. */
  category_id?: string;
  priority?: GoalPriority;
  owner_id?: string;
  department_id?: string;
  parent_goal_id?: string;
  start_date?: string;
  target_date?: string;
  review_date?: string;
  metadata?: string;
}

export interface GoalTransitionRequest {
  status: GoalStatus;
}

export interface GoalCloneRequest {
  title?: string;
  start_date?: string;
  target_date?: string;
  review_date?: string;
  owner_id?: string;
}

export interface GoalFilter {
  page?: number;
  limit?: number;
  status?: GoalStatus;
  priority?: GoalPriority;
  owner_id?: string;
  department_id?: string;
  parent_goal_id?: string;
  root_only?: boolean;
  category?: string;
  search?: string;
  start_from?: string;
  start_to?: string;
  target_from?: string;
  target_to?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  /** "mine" restricts to goals owned by or collaborated on by the caller. */
  scope?: "mine";
}

export interface GoalMetricCreateRequest {
  name: string;
  metric_type: MetricType;
  unit?: string;
  baseline_value?: number;
  current_value?: number;
  target_value: number;
  weight?: number;
  formula?: string;
}

export interface GoalMetricUpdateRequest {
  name?: string;
  metric_type?: MetricType;
  unit?: string;
  baseline_value?: number;
  target_value?: number;
  weight?: number;
  formula?: string;
}

export interface MetricValueUpdateRequest {
  value: number;
  comment?: string;
}

export interface CollaboratorAddRequest {
  user_id: string;
  role: CollaboratorRole;
}

export interface EvidenceTransitionRequest {
  transition_id: string;
  comment?: string;
  version: number;
}

export interface EvidenceFilter {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  evidence_type?: EvidenceType;
  start_date?: string;
  end_date?: string;
}

// ──────────────────────────────────────────────────
// Paginated List Response
// ──────────────────────────────────────────────────

export interface GoalListResponse {
  success: boolean;
  data: Goal[];
  total: number;
  page: number;
  limit: number;
}

export interface EvidenceListResponse {
  success: boolean;
  data: Evidence[];
  total: number;
  page: number;
  limit: number;
}

export interface MetricHistoryListResponse {
  success: boolean;
  data: MetricHistory[];
  total: number;
  page: number;
  limit: number;
}

export interface ApprovalListResponse {
  success: boolean;
  data: ApprovalListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface EvidenceTransitionHistoryListResponse {
  success: boolean;
  data: EvidenceTransitionHistory[];
  total: number;
  page: number;
  limit: number;
}

// ──────────────────────────────────────────────────
// Goal Templates
// ──────────────────────────────────────────────────

export interface TemplateMetric {
  name: string;
  metric_type: MetricType;
  unit: string;
  baseline_value: number;
  target_value: number;
  weight: number;
}

export interface TemplateCollaboratorRole {
  role: CollaboratorRole;
}

export interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: GoalPriority;
  default_metrics: TemplateMetric[];
  default_collaborators: TemplateCollaboratorRole[];
  workflow_id?: string;
  is_active: boolean;
  created_by_id: string;
  created_by?: UserBrief;
  created_at: string;
  updated_at: string;
}

export interface GoalTemplateCreateRequest {
  name: string;
  description?: string;
  category?: string;
  priority?: GoalPriority;
  default_metrics?: TemplateMetric[];
  default_collaborators?: TemplateCollaboratorRole[];
  workflow_id?: string;
  is_active?: boolean;
}

export interface GoalTemplateUpdateRequest {
  name?: string;
  description?: string;
  category?: string;
  priority?: GoalPriority;
  default_metrics?: TemplateMetric[];
  default_collaborators?: TemplateCollaboratorRole[];
  workflow_id?: string;
  is_active?: boolean;
}

export interface GoalTemplateFilter {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}

export interface GoalTemplateListResponse {
  success: boolean;
  data: GoalTemplate[];
  total: number;
  page: number;
  limit: number;
}

// ──────────────────────────────────────────────────
// Valid Transitions (mirrors Go ValidGoalTransitions)
// ──────────────────────────────────────────────────

export const VALID_GOAL_TRANSITIONS: Record<GoalStatus, GoalStatus[]> = {
  Draft: ["Active"],
  Active: ["Under_Review"],
  Under_Review: ["Achieved", "Missed", "Active"],
  Achieved: ["Closed"],
  Missed: ["Closed", "Active"],
  Closed: [],
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  Draft: "Draft",
  Active: "Active",
  Under_Review: "Under Review",
  Achieved: "Achieved",
  Missed: "Missed",
  Closed: "Closed",
};

export const GOAL_PRIORITY_OPTIONS: { value: GoalPriority; label: string }[] = [
  { value: "Critical", label: "Critical" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

export const METRIC_TYPE_OPTIONS: { value: MetricType; label: string }[] = [
  { value: "Numeric", label: "Numeric" },
  { value: "Percentage", label: "Percentage" },
  { value: "Currency", label: "Currency" },
  { value: "Boolean", label: "Boolean" },
];

export const EVIDENCE_TYPE_OPTIONS: { value: EvidenceType; label: string }[] = [
  { value: "Report", label: "Report" },
  { value: "Photo", label: "Photo" },
  { value: "Certificate", label: "Certificate" },
  { value: "Invoice", label: "Invoice" },
  { value: "Other", label: "Other" },
];

export const COLLABORATOR_ROLE_OPTIONS: {
  value: CollaboratorRole;
  label: string;
}[] = [
  { value: "collaborator", label: "Collaborator" },
  { value: "reviewer_l1", label: "L1 Reviewer" },
  { value: "reviewer_l2", label: "L2 Reviewer" },
];

// ──────────────────────────────────────────────────
// Import Types
// ──────────────────────────────────────────────────

export interface ImportRowResult {
  row_number: number;
  status: "valid" | "warning" | "error";
  errors?: string[];
  warnings?: string[];
  goal_title: string;
}

export interface GoalImportResponse {
  mode: "dry_run" | "committed";
  total_rows: number;
  goals_count: number;
  metrics_count: number;
  valid_count: number;
  error_count: number;
  warning_count: number;
  rows: ImportRowResult[];
  created_goal_ids?: string[];
}

// ──────────────────────────────────────────────────
// Bulk Action Types
// ──────────────────────────────────────────────────

export interface BulkActionRequest {
  goal_ids: string[];
  action: "transition" | "reassign" | "close";
  new_status?: GoalStatus;
  new_owner_id?: string;
}

export interface BulkActionItemResult {
  goal_id: string;
  success: boolean;
  error?: string;
}

export interface BulkActionResponse {
  total_requested: number;
  success_count: number;
  failure_count: number;
  results: BulkActionItemResult[];
}

// ──────────────────────────────────────────────────
// Check-in Types
// ──────────────────────────────────────────────────

export type CheckInStatus = "on_track" | "at_risk" | "behind" | "blocked";

export interface GoalCheckIn {
  id: string;
  goal_id: string;
  author_id: string;
  author?: UserBrief;
  status: CheckInStatus;
  content: string;
  progress_snapshot: number;
  metric_updates: string;
  created_at: string;
}

export interface CheckInCreateRequest {
  status: CheckInStatus;
  content: string;
  metric_updates?: { metric_id: string; value: number; comment?: string }[];
}

export interface CheckInListResponse {
  success: boolean;
  data: GoalCheckIn[];
  total: number;
  page: number;
  limit: number;
}

export const CHECK_IN_STATUS_OPTIONS = [
  { value: "on_track" as CheckInStatus, label: "On Track", color: "green" },
  { value: "at_risk" as CheckInStatus, label: "At Risk", color: "amber" },
  { value: "behind" as CheckInStatus, label: "Behind", color: "red" },
  { value: "blocked" as CheckInStatus, label: "Blocked", color: "slate" },
];

// ──────────────────────────────────────────────────
// Metric Import/Export
// ──────────────────────────────────────────────────

export interface MetricImportBatch {
  id: string;
  title: string;
  comment: string;
  status: string;
  item_count: number;
  goal_count: number;
  file_name: string;
  imported_by_id: string;
  imported_by?: UserBrief;
  primary_goal_id: string;
  primary_goal_title?: string;
  workflow_id?: string;
  current_state_id?: string;
  current_state?: WorkflowStateBrief;
  assigned_to_id?: string;
  assigned_to?: UserBrief;
  version: number;
  items?: MetricImportItem[];
  created_at: string;
  updated_at: string;
}

export interface MetricImportItem {
  id: string;
  goal_id: string;
  goal_title: string;
  metric_id: string;
  metric_name: string;
  metric_type: string;
  unit: string;
  old_value: number;
  new_value: number;
  applied: boolean;
}

export interface MetricImportValidationItem {
  row_number: number;
  goal_id: string;
  goal_title: string;
  metric_id: string;
  metric_name: string;
  current_value: number;
  new_value: number;
  status: "valid" | "error" | "warning" | "skipped";
  errors?: string[];
  warnings?: string[];
}

export interface MetricImportDryRunResponse {
  total_rows: number;
  valid_count: number;
  error_count: number;
  warning_count: number;
  skipped_count: number;
  goal_count: number;
  items: MetricImportValidationItem[];
}

export interface MetricImportBatchFilter {
  page?: number;
  limit?: number;
  status?: string;
}

export interface MetricImportBatchListResponse {
  success: boolean;
  data: MetricImportBatch[];
  total: number;
  page: number;
  limit: number;
}

export interface MetricImportBatchTransitionRequest {
  transition_id: string;
  comment?: string;
  version: number;
}

export interface MetricImportBatchTransitionHistory {
  id: string;
  batch_id: string;
  transition_name: string;
  from_state_name: string;
  to_state_name: string;
  from_state_color: string;
  to_state_color: string;
  performed_by_id: string;
  performed_by?: UserBrief;
  comment: string;
  is_system_action: boolean;
  transitioned_at: string;
  created_at: string;
}
