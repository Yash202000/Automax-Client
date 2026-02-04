// Record Type definitions
export type RecordType = 'incident' | 'request' | 'complaint' | 'query';
export type ClassificationType = 'incident' | 'request' | 'complaint' | 'query' | 'both' | 'all';

// Base types
export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  avatar: string;
  department_id: string | null;
  department?: Department;
  departments?: Department[];
  location_id: string | null;
  location?: Location;
  locations?: Location[];
  classifications?: Classification[];
  roles: Role[];
  permissions: string[];
  is_active: boolean;
  is_super_admin: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  description: string;
  module: string;
  action: string;
  is_active: boolean;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  is_system: boolean;
  is_active: boolean;
  permissions: Permission[];
  created_at: string;
}

export interface Classification {
  id: string;
  name: string;
  description: string;
  type: ClassificationType;
  parent_id: string | null;
  level: number;
  path: string;
  is_active: boolean;
  sort_order: number;
  children?: Classification[];
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  code: string;
  description: string;
  type: string;
  parent_id: string | null;
  level: number;
  path: string;
  address: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  sort_order: number;
  children?: Location[];
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  parent_id: string | null;
  level: number;
  path: string;
  manager_id: string | null;
  is_active: boolean;
  sort_order: number;
  children?: Department[];
  locations?: Location[];
  classifications?: Classification[];
  roles?: Role[];
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Lookup types
export interface LookupCategory {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  is_system: boolean;
  is_active: boolean;
  add_to_incident_form?: boolean;
  values_count: number;
  values?: LookupValue[];
  created_at: string;
  updated_at: string;
}

export interface LookupValue {
  id: string;
  category_id: string;
  category?: LookupCategory;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  sort_order: number;
  color?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LookupCategoryCreateRequest {
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  is_active?: boolean;
  add_to_incident_form?: boolean;
}

export interface LookupCategoryUpdateRequest {
  code?: string;
  name?: string;
  name_ar?: string;
  description?: string;
  is_active?: boolean;
  add_to_incident_form?: boolean;
}

export interface LookupValueCreateRequest {
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  sort_order?: number;
  color?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface LookupValueUpdateRequest {
  code?: string;
  name?: string;
  name_ar?: string;
  description?: string;
  sort_order?: number;
  color?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

// Auth types
export interface AuthResponse {
  user: User;
  token: string;
  refresh_token?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  department_id?: string;
  location_id?: string;
  department_ids?: string[];
  location_ids?: string[];
  classification_ids?: string[];
  role_ids?: string[];
}

export interface UpdateProfileRequest {
  username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  department_id?: string;
  location_id?: string;
  department_ids?: string[];
  location_ids?: string[];
  classification_ids?: string[];
  role_ids?: string[];
  is_active?: boolean;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

// Classification request types
export interface ClassificationCreateRequest {
  name: string;
  description?: string;
  type?: ClassificationType;
  parent_id?: string;
  sort_order?: number;
}

export interface ClassificationUpdateRequest {
  name?: string;
  description?: string;
  type?: ClassificationType;
  is_active?: boolean;
  sort_order?: number;
}

// Location request types
export interface LocationCreateRequest {
  name: string;
  code?: string;
  description?: string;
  type?: string;
  parent_id?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  sort_order?: number;
}

export interface LocationUpdateRequest {
  name?: string;
  code?: string;
  description?: string;
  type?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
  sort_order?: number;
}

// Department request types
export interface DepartmentCreateRequest {
  name: string;
  code: string;
  description?: string;
  parent_id?: string;
  manager_id?: string;
  location_ids?: string[];
  classification_ids?: string[];
  role_ids?: string[];
  sort_order?: number;
}

export interface DepartmentUpdateRequest {
  name?: string;
  code?: string;
  description?: string;
  manager_id?: string;
  location_ids?: string[];
  classification_ids?: string[];
  role_ids?: string[];
  is_active?: boolean;
  sort_order?: number;
}

// Role request types
export interface RoleCreateRequest {
  name: string;
  code: string;
  description?: string;
  permission_ids?: string[];
}

export interface RoleUpdateRequest {
  name?: string;
  description?: string;
  permission_ids?: string[];
  is_active?: boolean;
}

// Permission request types
export interface PermissionCreateRequest {
  name: string;
  code: string;
  description?: string;
  module: string;
  action: string;
}

export interface PermissionUpdateRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// Action Log types
export interface ActionLog {
  id: string;
  user_id: string;
  user?: User;
  action: string;
  module: string;
  resource_id: string;
  description: string;
  old_value?: string;
  new_value?: string;
  ip_address: string;
  user_agent: string;
  status: string;
  error_msg?: string;
  duration: number;
  created_at: string;
}

export interface ActionLogFilter {
  user_id?: string;
  action?: string;
  module?: string;
  status?: string;
  resource_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ActionLogStats {
  total_actions: number;
  today_actions: number;
  success_rate: number;
  actions_by_module: Record<string, number>;
  actions_by_type: Record<string, number>;
}

export interface ActionLogFilterOptions {
  modules: string[];
  actions: string[];
}

// SMTP Configuration types
export interface SMTPConfig {
  id: string;
  host: string;
  port: number;
  username: string;
  password?: string; // Not returned from API for security
  from_email: string;
  from_name: string;
  encryption: 'none' | 'tls' | 'ssl';
  is_active: boolean;
  is_verified: boolean;
  last_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SMTPConfigCreateRequest {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  encryption: 'none' | 'tls' | 'ssl';
}

export interface SMTPConfigUpdateRequest {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  from_email?: string;
  from_name?: string;
  encryption?: 'none' | 'tls' | 'ssl';
  is_active?: boolean;
}

export interface SMTPTestRequest {
  to_email: string;
}

// Email notification recipients for transitions
export type EmailRecipient = 'assignee' | 'previous_assignee' | 'reporter' | 'creator' | 'department_head' | 'custom';

export const EMAIL_RECIPIENTS: { value: EmailRecipient; label: string; description: string }[] = [
  { value: 'assignee', label: 'Current Assignee', description: 'The user currently assigned to the incident' },
  { value: 'previous_assignee', label: 'Previous Assignee', description: 'The user who was previously assigned' },
  { value: 'reporter', label: 'Reporter', description: 'The person who reported the incident' },
  { value: 'creator', label: 'Creator', description: 'The user who created the incident' },
  { value: 'department_head', label: 'Department Head', description: 'The head of the assigned department' },
  { value: 'custom', label: 'Custom Email', description: 'Specify a custom email address' },
];

export interface TransitionEmailConfig {
  enabled: boolean;
  recipients: EmailRecipient[];
  custom_emails?: string[];
  subject_template?: string;
  body_template?: string;
  include_incident_details: boolean;
  include_transition_info: boolean;
  include_comments: boolean;
}

// Incident Source types
export type IncidentSource = 'field' | '940_system' | 'manual' | 'api' | 'email';

export const INCIDENT_SOURCES: { value: IncidentSource; label: string }[] = [
  { value: 'field', label: 'Field' },
  { value: '940_system', label: '940 System' },
  { value: 'manual', label: 'Manual Entry' },
  { value: 'api', label: 'API Integration' },
  { value: 'email', label: 'Email' },
];

// Workflow matching configuration
export interface WorkflowMatchConfig {
  classification_ids?: string[];
  location_ids?: string[];
  sources?: IncidentSource[];
  severity_min?: number;
  severity_max?: number;
  priority_min?: number;
  priority_max?: number;
}

// Incident form field names that can be made required
// Includes standard fields and lookup category codes (e.g., 'lookup:PRIORITY', 'lookup:NATIONALITY')
export type IncidentFormField =
  | 'description'
  | 'classification_id'
  | 'priority'
  | 'severity'
  | 'source'
  | 'source_incident_id'
  | 'channel'
  | 'assignee_id'
  | 'department_id'
  | 'location_id'
  | 'geolocation'
  | 'due_date'
  | 'reporter_name'
  | 'reporter_email'
  | 'attachments'
  | 'attachment'
  | `lookup:${string}`; // Dynamic lookup category required fields

// Workflow types
export interface Workflow {
  id: string;
  name: string;
  code: string;
  description: string;
  version: number;
  is_active: boolean;
  is_default: boolean;
  record_type: ClassificationType;
  canvas_layout?: string;
  required_fields?: IncidentFormField[];
  states?: WorkflowState[];
  transitions?: WorkflowTransition[];
  classifications?: Classification[];
  convert_to_request_roles?: Role[];
  locations?: Location[];
  sources?: IncidentSource[];
  severity_min?: number;
  severity_max?: number;
  priority_min?: number;
  priority_max?: number;
  match_config?: WorkflowMatchConfig;
  states_count: number;
  transitions_count: number;
  created_by?: User;
  created_at: string;
  updated_at: string;
}

export interface WorkflowState {
  id: string;
  workflow_id: string;
  name: string;
  code: string;
  description: string;
  state_type: 'initial' | 'normal' | 'terminal';
  color: string;
  position_x: number;
  position_y: number;
  sla_hours?: number;
  sort_order: number;
  is_active: boolean;
  viewable_roles?: Role[];
  created_at: string;
}

export interface WorkflowTransition {
  id: string;
  workflow_id: string;
  name: string;
  code: string;
  description: string;
  from_state_id: string;
  from_state?: WorkflowState;
  to_state_id: string;
  to_state?: WorkflowState;
  allowed_roles?: Role[];

  // Department Assignment
  assign_department_id?: string;
  assign_department?: Department;
  auto_detect_department: boolean;

  // User Assignment
  assign_user_id?: string;
  assign_user?: User;
  assignment_role_id?: string;
  assignment_role?: Role;
  auto_match_user: boolean;
  manual_select_user: boolean;

  requirements?: TransitionRequirement[];
  actions?: TransitionAction[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface TransitionRequirement {
  id: string;
  transition_id: string;
  requirement_type: 'comment' | 'attachment' | 'feedback' | 'field_value';
  field_name?: string;
  field_value?: string;
  is_mandatory: boolean;
  error_message?: string;
}

export interface TransitionAction {
  id: string;
  transition_id: string;
  action_type: 'email' | 'field_update' | 'webhook' | 'notification';
  name: string;
  description?: string;
  config?: string;
  execution_order: number;
  is_async: boolean;
  is_active: boolean;
}

// Workflow request types
export interface WorkflowCreateRequest {
  name: string;
  code: string;
  description?: string;
  record_type?: ClassificationType;
  classification_ids?: string[];
  location_ids?: string[];
  sources?: IncidentSource[];
  severity_min?: number;
  severity_max?: number;
  priority_min?: number;
  priority_max?: number;
  required_fields?: IncidentFormField[];
}

export interface WorkflowUpdateRequest {
  name?: string;
  code?: string;
  description?: string;
  record_type?: ClassificationType;
  is_active?: boolean;
  is_default?: boolean;
  canvas_layout?: string;
  classification_ids?: string[];
  convert_to_request_role_ids?: string[];
  location_ids?: string[];
  sources?: IncidentSource[];
  severity_min?: number;
  severity_max?: number;
  priority_min?: number;
  priority_max?: number;
  required_fields?: IncidentFormField[];
}

export interface WorkflowStateCreateRequest {
  name: string;
  code: string;
  description?: string;
  state_type?: 'initial' | 'normal' | 'terminal';
  color?: string;
  position_x?: number;
  position_y?: number;
  sla_hours?: number;
  sort_order?: number;
  viewable_role_ids?: string[];
}

export interface WorkflowStateUpdateRequest {
  name?: string;
  code?: string;
  description?: string;
  state_type?: 'initial' | 'normal' | 'terminal';
  color?: string;
  position_x?: number;
  position_y?: number;
  sla_hours?: number;
  sort_order?: number;
  is_active?: boolean;
  viewable_role_ids?: string[];
}

export interface WorkflowTransitionCreateRequest {
  name: string;
  code: string;
  description?: string;
  from_state_id: string;
  to_state_id: string;
  role_ids?: string[];
  sort_order?: number;

  // Department Assignment
  assign_department_id?: string;
  auto_detect_department?: boolean;

  // User Assignment
  assign_user_id?: string;
  assignment_role_id?: string;
  auto_match_user?: boolean;
  manual_select_user?: boolean;
}

export interface WorkflowTransitionUpdateRequest {
  name?: string;
  code?: string;
  description?: string;
  from_state_id?: string;
  to_state_id?: string;
  role_ids?: string[];
  sort_order?: number;
  is_active?: boolean;

  // Department Assignment
  assign_department_id?: string | null;
  auto_detect_department?: boolean;

  // User Assignment
  assign_user_id?: string | null;
  assignment_role_id?: string | null;
  auto_match_user?: boolean;
  manual_select_user?: boolean;
}

export interface WorkflowImportResponse {
  workflow: Workflow;
  warnings: string[];
}

export interface TransitionRequirementRequest {
  requirement_type: 'comment' | 'attachment' | 'feedback' | 'field_value';
  field_name?: string;
  field_value?: string;
  is_mandatory: boolean;
  error_message?: string;
}

export interface TransitionActionRequest {
  action_type: 'email' | 'field_update' | 'webhook' | 'notification';
  name: string;
  description?: string;
  config?: string;
  execution_order?: number;
  is_async?: boolean;
  is_active?: boolean;
}

// Incident types
export interface Incident {
  id: string;
  incident_number: string;
  title: string;
  description: string;
  record_type: RecordType;
  source_incident_id?: string;
  source_incident?: Incident;
  converted_request_id?: string;
  converted_request?: Incident;
  classification?: Classification;
  workflow?: Workflow;
  current_state?: WorkflowState;
  lookup_values?: LookupValue[];
  source?: IncidentSource;
  assignee?: User;
  assignees?: User[];
  department?: Department;
  location?: Location;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  due_date?: string;
  resolved_at?: string;
  closed_at?: string;
  sla_breached: boolean;
  sla_deadline?: string;
  reporter?: User;
  reporter_email: string;
  reporter_name: string;
  // Complaint-specific fields
  channel?: string;
  created_by_name?: string;
  created_by_mobile?: string;
  evaluation_count?: number;
  custom_fields?: string;
  comments_count: number;
  attachments_count: number;
  created_at: string;
  updated_at: string;
}

export interface IncidentDetail extends Incident {
  comments?: IncidentComment[];
  attachments?: IncidentAttachment[];
  feedback?: IncidentFeedback[];
  transition_history?: TransitionHistory[];
}

export interface IncidentComment {
  id: string;
  incident_id: string;
  author?: User;
  content: string;
  is_internal: boolean;
  transition_history_id?: string;
  created_at: string;
}

export interface IncidentAttachment {
  id: string;
  incident_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by?: User;
  transition_history_id?: string;
  created_at: string;
}

export interface IncidentFeedback {
  id: string;
  incident_id: string;
  rating: number;
  comment?: string;
  created_by?: User;
  transition_history_id?: string;
  created_at: string;
}

export interface IncidentFeedbackRequest {
  rating: number;
  comment?: string;
}

export interface TransitionHistory {
  id: string;
  incident_id: string;
  transition?: WorkflowTransition;
  from_state?: WorkflowState;
  to_state?: WorkflowState;
  performed_by?: User;
  comment?: string;
  old_values?: string;
  new_values?: string;
  action_results?: string;
  transitioned_at: string;
}

// Incident Revision Types
export type IncidentRevisionActionType =
  | 'field_change'
  | 'comment_added'
  | 'comment_modified'
  | 'comment_deleted'
  | 'attachment_added'
  | 'attachment_removed'
  | 'assignee_changed'
  | 'status_changed'
  | 'created';

export interface IncidentFieldChange {
  field_name: string;
  field_label: string;
  old_value: string | null;
  new_value: string | null;
}

export interface IncidentRevision {
  id: string;
  incident_id: string;
  revision_number: number;
  action_type: IncidentRevisionActionType;
  action_description: string;
  changes: IncidentFieldChange[];
  performed_by_id: string;
  performed_by?: User;
  performed_by_roles?: string[];
  performed_by_phone?: string;
  comment_id?: string;
  attachment_id?: string;
  transition_history_id?: string;
  created_at: string;
}

export interface IncidentRevisionFilter {
  incident_id?: string;
  action_type?: IncidentRevisionActionType;
  performed_by_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface AvailableTransition {
  transition: WorkflowTransition;
  can_execute: boolean;
  requirements?: TransitionRequirement[];
  reason?: string;
}

export interface StateStatDetail {
  id: string;
  name: string;
  count: number;
}

export interface IncidentStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  sla_breached: number;
  by_state: Record<string, number>;
  by_state_details?: StateStatDetail[];
}

// Incident request types
export interface IncidentCreateRequest {
  title: string;
  description?: string;
  classification_id?: string;
  workflow_id?: string;  // Now optional - can be auto-matched
  source?: IncidentSource;
  assignee_id?: string;
  department_id?: string;
  location_id?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  due_date?: string;
  reporter_email?: string;
  reporter_name?: string;
  custom_fields?: string;
  lookup_value_ids?: string[];
}

export interface IncidentUpdateRequest {
  title?: string;
  description?: string;
  classification_id?: string;
  assignee_id?: string;
  department_id?: string;
  location_id?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  due_date?: string;
  custom_fields?: string;
  lookup_value_ids?: string[];
}

export interface IncidentTransitionRequest {
  transition_id: string;
  comment?: string;
  attachments?: string[];

  // Feedback (collected during transition if required)
  feedback?: IncidentFeedbackRequest;

  // Assignment overrides (used when auto-detect finds multiple matches)
  department_id?: string;
  user_id?: string;
}

// Department Match types
export interface DepartmentMatchRequest {
  classification_id?: string;
  location_id?: string;
}

export interface DepartmentMatchResponse {
  departments: Department[];
  single_match: boolean;
  matched_department_id?: string;
}

// User Match types
export interface UserMatchRequest {
  role_id?: string;
  classification_id?: string;
  location_id?: string;
  department_id?: string;
  exclude_user_id?: string;
}

export interface UserMatchResponse {
  users: User[];
  single_match: boolean;
  matched_user_id?: string;
}

export interface IncidentCommentRequest {
  content: string;
  is_internal?: boolean;
}

export interface IncidentFilter {
  search?: string;
  workflow_id?: string;
  current_state_id?: string;
  classification_id?: string;
  priority?: number;
  severity?: number;
  assignee_id?: string;
  department_id?: string;
  location_id?: string;
  reporter_id?: string;
  sla_breached?: boolean;
  record_type?: RecordType;
  channel?: string;  // For complaints
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

// Convert Incident to Request types
export interface ConvertToRequestRequest {
  transition_id?: string;
  transition_comment?: string;
  classification_id: string;
  workflow_id: string;
  title?: string;
  description?: string;
  assignee_id?: string;
  department_id?: string;
  due_date?: string;
  feedback?: IncidentFeedbackRequest;
}

export interface ConvertToRequestResponse {
  original_incident: Incident;
  new_request: Incident;
}

export interface CanConvertToRequestResponse {
  can_convert: boolean;
  reason?: string;
}

// Complaint request types
export interface CreateComplaintRequest {
  title: string;
  description?: string;
  classification_id: string;
  workflow_id: string;
  source_incident_id?: string;
  source?: IncidentSource;
  channel?: string;
  reporter_id?: string; // Link to user who reported/created the complaint
  department_id?: string;
  assignee_id?: string;
  location_id?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  due_date?: string;
  lookup_value_ids?: string[];
}

export interface CreateQueryRequest {
  title: string;
  description?: string;
  classification_id: string;
  workflow_id: string;
  source_incident_id?: string;
  source?: IncidentSource;
  channel?: string;
  department_id?: string;
  assignee_id?: string;
  location_id?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  due_date?: string;
  lookup_value_ids?: string[];
}

export interface CreateRequestRequest {
  title: string;
  description?: string;
  classification_id: string;
  workflow_id: string;
  source_incident_id?: string;
  source?: IncidentSource;
  channel?: string;
  department_id?: string;
  assignee_id?: string;
  location_id?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  due_date?: string;
  lookup_value_ids?: string[];
}

// ===========================================
// REPORT BUILDER TYPES
// ===========================================

// Report Data Sources
export type ReportDataSource = 'incidents' | 'action_logs' | 'users' | 'departments' | 'locations' | 'workflows';

// Filter Operators
export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'between'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty'
  | 'before'
  | 'after'
  | 'on_date';

// Filter Value Types
export type FilterValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | (string | number)[]
  | { from: string; to: string }
  | null;

// Report Field Definition
export interface ReportFieldDefinition {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'enum' | 'relation';
  category: string;
  sortable: boolean;
  filterable: boolean;
  defaultSelected?: boolean;
  options?: { value: string | number; label: string }[];
  relationField?: string;
  description?: string;
  dynamicOptions?: 'departments' | 'locations' | 'classifications'; // For hierarchical dropdowns
}

// Data Source Definition
export interface DataSourceDefinition {
  key: ReportDataSource;
  label: string;
  description: string;
  icon: string;
  fields: ReportFieldDefinition[];
}

// Report Filter
export interface ReportFilter {
  id: string;
  field: string;
  operator: FilterOperator;
  value: FilterValue;
}

// Report Sort
export interface ReportSort {
  field: string;
  direction: 'asc' | 'desc';
}

// Report Column Config
export interface ReportColumnConfig {
  field: string;
  label: string;
  width?: number;
  sortOrder?: number;
}

// Report Template Config
export interface ReportTemplateConfig {
  columns: ReportColumnConfig[];
  filters: Omit<ReportFilter, 'id'>[];
  sorting: ReportSort[];
  options?: {
    includeSubDepartments?: boolean;
    includeSubLocations?: boolean;
    limit?: number;
  };
}

// Report Template Entity
export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  data_source: ReportDataSource;
  config: ReportTemplateConfig;
  is_public: boolean;
  is_system: boolean;
  created_by?: User;
  shared_with?: { user_id: string; username: string; can_edit: boolean }[];
  can_edit?: boolean;
  created_at: string;
  updated_at: string;
}

// Report Query Request
export interface ReportQueryRequest {
  data_source: ReportDataSource;
  columns: string[];
  filters: Omit<ReportFilter, 'id'>[];
  sorting: ReportSort[];
  page?: number;
  limit?: number;
  options?: {
    includeSubDepartments?: boolean;
    includeSubLocations?: boolean;
  };
}

// Report Query Response
export interface ReportQueryResponse<T = Record<string, unknown>> {
  success: boolean;
  data: T[];
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
  query_time_ms?: number;
}

// Report Export Request
export interface ReportExportRequest {
  data_source: ReportDataSource;
  columns: string[];
  filters: Omit<ReportFilter, 'id'>[];
  sorting: ReportSort[];
  format: 'xlsx' | 'pdf';
  options?: {
    title?: string;
    includeFilters?: boolean;
    includeTimestamp?: boolean;
  };
}

// Report Template Request Types
export interface ReportTemplateCreateRequest {
  name: string;
  description?: string;
  data_source: ReportDataSource;
  config: ReportTemplateConfig;
  is_public?: boolean;
}

export interface ReportTemplateUpdateRequest {
  name?: string;
  description?: string;
  config?: ReportTemplateConfig;
  is_public?: boolean;
}

export interface ReportTemplateShareRequest {
  user_ids: string[];
  can_edit: boolean;
}

// Re-export report template builder types
export * from './reportTemplate';
