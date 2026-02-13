import type { DataSourceDefinition, ReportFieldDefinition, FilterOperator } from '../types';

// Filter operators by field type
export const FILTER_OPERATORS_BY_TYPE: Record<string, { value: FilterOperator; label: string }[]> = {
  string: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'greater_than_or_equal', label: 'Greater than or equal' },
    { value: 'less_than_or_equal', label: 'Less than or equal' },
    { value: 'between', label: 'Between' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  date: [
    { value: 'on_date', label: 'On date' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'between', label: 'Between' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  datetime: [
    { value: 'on_date', label: 'On date' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'between', label: 'Between' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  boolean: [
    { value: 'equals', label: 'Is' },
  ],
  enum: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'in', label: 'Is any of' },
    { value: 'not_in', label: 'Is none of' },
  ],
  relation: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'contains', label: 'Contains' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
};

// Incidents Data Source Fields
const incidentFields: ReportFieldDefinition[] = [
  // Basic Info
  { field: 'incident_number', label: 'Incident Number', type: 'string', category: 'Basic Info', sortable: true, filterable: true, defaultSelected: true },
  { field: 'title', label: 'Title', type: 'string', category: 'Basic Info', sortable: true, filterable: true, defaultSelected: true },
  { field: 'description', label: 'Description', type: 'string', category: 'Basic Info', sortable: false, filterable: true },
  { field: 'source', label: 'Source', type: 'enum', category: 'Basic Info', sortable: true, filterable: true, options: [
    { value: 'web', label: 'Web Portal' },
    { value: 'mobile', label: 'Mobile App' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'walk_in', label: 'Walk-in' },
    { value: 'api', label: 'API Integration' },
    { value: 'social_media', label: 'Social Media' },
    { value: '940_system', label: '940 System' },
    { value: '940_manual', label: '940 Manual' },
    { value: 'field', label: 'Field' },
    { value: 'manual', label: 'Manual Entry' },
    { value: 'other', label: 'Other' },
  ]},

  // Status
  { field: 'current_state.name', label: 'Current State', type: 'string', category: 'Status', sortable: true, filterable: true, defaultSelected: true, relationField: 'current_state' },
  { field: 'current_state.state_type', label: 'State Type', type: 'enum', category: 'Status', sortable: true, filterable: true, options: [
    { value: 'initial', label: 'Initial' },
    { value: 'normal', label: 'Normal' },
    { value: 'terminal', label: 'Terminal' },
  ]},
  { field: 'priority', label: 'Priority', type: 'enum', category: 'Status', sortable: true, filterable: true, defaultSelected: true, options: [
    { value: 1, label: 'Critical' },
    { value: 2, label: 'High' },
    { value: 3, label: 'Medium' },
    { value: 4, label: 'Low' },
    { value: 5, label: 'Minimal' },
  ]},

  // SLA
  { field: 'sla_breached', label: 'SLA Breached', type: 'boolean', category: 'SLA', sortable: true, filterable: true },
  { field: 'sla_deadline', label: 'SLA Deadline', type: 'datetime', category: 'SLA', sortable: true, filterable: true },
  { field: 'due_date', label: 'Due Date', type: 'date', category: 'SLA', sortable: true, filterable: true },

  // Relations
  { field: 'assignee.username', label: 'Assignee Username', type: 'string', category: 'Relations', sortable: true, filterable: true, relationField: 'assignee' },
  { field: 'assignee.full_name', label: 'Assignee Name', type: 'string', category: 'Relations', sortable: true, filterable: true, relationField: 'assignee', defaultSelected: true },
  { field: 'department_id', label: 'Department', type: 'enum', category: 'Relations', sortable: true, filterable: true, relationField: 'department', dynamicOptions: 'departments' },
  { field: 'location_id', label: 'Location', type: 'enum', category: 'Relations', sortable: true, filterable: true, relationField: 'location', dynamicOptions: 'locations' },
  { field: 'classification_id', label: 'Classification', type: 'enum', category: 'Relations', sortable: true, filterable: true, relationField: 'classification', dynamicOptions: 'classifications' },
  { field: 'workflow.name', label: 'Workflow', type: 'string', category: 'Relations', sortable: true, filterable: true, relationField: 'workflow' },

  // Reporter
  { field: 'reporter_name', label: 'Reporter Name', type: 'string', category: 'Reporter', sortable: true, filterable: true },
  { field: 'reporter_email', label: 'Reporter Email', type: 'string', category: 'Reporter', sortable: true, filterable: true },

  // Counts
  { field: 'comments_count', label: 'Comments Count', type: 'number', category: 'Counts', sortable: true, filterable: true },
  { field: 'attachments_count', label: 'Attachments Count', type: 'number', category: 'Counts', sortable: true, filterable: true },

  // Timestamps
  { field: 'created_at', label: 'Created At', type: 'datetime', category: 'Timestamps', sortable: true, filterable: true, defaultSelected: true },
  { field: 'updated_at', label: 'Updated At', type: 'datetime', category: 'Timestamps', sortable: true, filterable: true },
  { field: 'resolved_at', label: 'Resolved At', type: 'datetime', category: 'Timestamps', sortable: true, filterable: true },
  { field: 'closed_at', label: 'Closed At', type: 'datetime', category: 'Timestamps', sortable: true, filterable: true },
];

// Action Logs Data Source Fields
const actionLogFields: ReportFieldDefinition[] = [
  // Core
  { field: 'id', label: 'Log ID', type: 'string', category: 'Core', sortable: true, filterable: true },
  { field: 'action', label: 'Action', type: 'enum', category: 'Core', sortable: true, filterable: true, defaultSelected: true, options: [
    { value: 'create', label: 'Create' },
    { value: 'update', label: 'Update' },
    { value: 'delete', label: 'Delete' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'view', label: 'View' },
  ]},
  { field: 'module', label: 'Module', type: 'string', category: 'Core', sortable: true, filterable: true, defaultSelected: true },
  { field: 'description', label: 'Description', type: 'string', category: 'Core', sortable: false, filterable: true, defaultSelected: true },
  { field: 'resource_id', label: 'Resource ID', type: 'string', category: 'Core', sortable: true, filterable: true },

  // Status
  { field: 'status', label: 'Status', type: 'enum', category: 'Status', sortable: true, filterable: true, defaultSelected: true, options: [
    { value: 'success', label: 'Success' },
    { value: 'failed', label: 'Failed' },
  ]},
  { field: 'error_msg', label: 'Error Message', type: 'string', category: 'Status', sortable: false, filterable: true },
  { field: 'duration', label: 'Duration (ms)', type: 'number', category: 'Status', sortable: true, filterable: true },

  // User
  { field: 'user.username', label: 'Username', type: 'string', category: 'User', sortable: true, filterable: true, defaultSelected: true, relationField: 'user' },
  { field: 'user.email', label: 'User Email', type: 'string', category: 'User', sortable: true, filterable: true, relationField: 'user' },

  // Request Info
  { field: 'ip_address', label: 'IP Address', type: 'string', category: 'Request', sortable: true, filterable: true },
  { field: 'user_agent', label: 'User Agent', type: 'string', category: 'Request', sortable: false, filterable: true },

  // Timestamps
  { field: 'created_at', label: 'Timestamp', type: 'datetime', category: 'Timestamps', sortable: true, filterable: true, defaultSelected: true },
];

// Users Data Source Fields
const userFields: ReportFieldDefinition[] = [
  // Identity
  { field: 'id', label: 'User ID', type: 'string', category: 'Identity', sortable: true, filterable: true },
  { field: 'username', label: 'Username', type: 'string', category: 'Identity', sortable: true, filterable: true, defaultSelected: true },
  { field: 'email', label: 'Email', type: 'string', category: 'Identity', sortable: true, filterable: true, defaultSelected: true },
  { field: 'first_name', label: 'First Name', type: 'string', category: 'Identity', sortable: true, filterable: true, defaultSelected: true },
  { field: 'last_name', label: 'Last Name', type: 'string', category: 'Identity', sortable: true, filterable: true, defaultSelected: true },
  { field: 'phone', label: 'Phone', type: 'string', category: 'Identity', sortable: true, filterable: true },

  // Status
  { field: 'is_active', label: 'Active', type: 'boolean', category: 'Status', sortable: true, filterable: true, defaultSelected: true },
  { field: 'is_super_admin', label: 'Super Admin', type: 'boolean', category: 'Status', sortable: true, filterable: true },
  { field: 'last_login_at', label: 'Last Login', type: 'datetime', category: 'Status', sortable: true, filterable: true },

  // Relations
  { field: 'department_id', label: 'Primary Department', type: 'enum', category: 'Relations', sortable: true, filterable: true, relationField: 'department', dynamicOptions: 'departments' },
  { field: 'location_id', label: 'Primary Location', type: 'enum', category: 'Relations', sortable: true, filterable: true, relationField: 'location', dynamicOptions: 'locations' },

  // Timestamps
  { field: 'created_at', label: 'Created At', type: 'datetime', category: 'Timestamps', sortable: true, filterable: true },
];

// Departments Data Source Fields
const departmentFields: ReportFieldDefinition[] = [
  // Basic Info
  { field: 'id', label: 'Department ID', type: 'string', category: 'Basic Info', sortable: true, filterable: true },
  { field: 'name', label: 'Name', type: 'string', category: 'Basic Info', sortable: true, filterable: true, defaultSelected: true },
  { field: 'code', label: 'Code', type: 'string', category: 'Basic Info', sortable: true, filterable: true, defaultSelected: true },
  { field: 'description', label: 'Description', type: 'string', category: 'Basic Info', sortable: false, filterable: true },

  // Hierarchy
  { field: 'level', label: 'Level', type: 'number', category: 'Hierarchy', sortable: true, filterable: true },
  { field: 'path', label: 'Path', type: 'string', category: 'Hierarchy', sortable: true, filterable: true },
  { field: 'parent_id', label: 'Parent Department', type: 'enum', category: 'Hierarchy', sortable: true, filterable: true, relationField: 'parent', dynamicOptions: 'departments' },

  // Relations
  { field: 'manager.username', label: 'Manager Username', type: 'string', category: 'Relations', sortable: true, filterable: true, relationField: 'manager' },
  { field: 'manager.full_name', label: 'Manager Name', type: 'string', category: 'Relations', sortable: true, filterable: true, relationField: 'manager' },

  // Status
  { field: 'is_active', label: 'Active', type: 'boolean', category: 'Status', sortable: true, filterable: true, defaultSelected: true },
  { field: 'sort_order', label: 'Sort Order', type: 'number', category: 'Status', sortable: true, filterable: true },

  // Timestamps
  { field: 'created_at', label: 'Created At', type: 'datetime', category: 'Timestamps', sortable: true, filterable: true },
];

// Locations Data Source Fields
const locationFields: ReportFieldDefinition[] = [
  // Basic Info
  { field: 'id', label: 'Location ID', type: 'string', category: 'Basic Info', sortable: true, filterable: true },
  { field: 'name', label: 'Name', type: 'string', category: 'Basic Info', sortable: true, filterable: true, defaultSelected: true },
  { field: 'code', label: 'Code', type: 'string', category: 'Basic Info', sortable: true, filterable: true, defaultSelected: true },
  { field: 'description', label: 'Description', type: 'string', category: 'Basic Info', sortable: false, filterable: true },
  { field: 'type', label: 'Type', type: 'string', category: 'Basic Info', sortable: true, filterable: true, defaultSelected: true },
  { field: 'address', label: 'Address', type: 'string', category: 'Basic Info', sortable: true, filterable: true },

  // Hierarchy
  { field: 'level', label: 'Level', type: 'number', category: 'Hierarchy', sortable: true, filterable: true },
  { field: 'path', label: 'Path', type: 'string', category: 'Hierarchy', sortable: true, filterable: true },
  { field: 'parent_id', label: 'Parent Location', type: 'enum', category: 'Hierarchy', sortable: true, filterable: true, relationField: 'parent', dynamicOptions: 'locations' },

  // Status
  { field: 'is_active', label: 'Active', type: 'boolean', category: 'Status', sortable: true, filterable: true, defaultSelected: true },
  { field: 'sort_order', label: 'Sort Order', type: 'number', category: 'Status', sortable: true, filterable: true },

  // Timestamps
  { field: 'created_at', label: 'Created At', type: 'datetime', category: 'Timestamps', sortable: true, filterable: true },
];

// Workflows Data Source Fields
const workflowFields: ReportFieldDefinition[] = [
  // Basic Info
  { field: 'id', label: 'Workflow ID', type: 'string', category: 'Basic Info', sortable: true, filterable: true },
  { field: 'name', label: 'Name', type: 'string', category: 'Basic Info', sortable: true, filterable: true, defaultSelected: true },
  { field: 'code', label: 'Code', type: 'string', category: 'Basic Info', sortable: true, filterable: true, defaultSelected: true },
  { field: 'description', label: 'Description', type: 'string', category: 'Basic Info', sortable: false, filterable: true },
  { field: 'version', label: 'Version', type: 'number', category: 'Basic Info', sortable: true, filterable: true },

  // Status
  { field: 'is_active', label: 'Active', type: 'boolean', category: 'Status', sortable: true, filterable: true, defaultSelected: true },
  { field: 'is_default', label: 'Default Workflow', type: 'boolean', category: 'Status', sortable: true, filterable: true },

  // Counts
  { field: 'states_count', label: 'States Count', type: 'number', category: 'Counts', sortable: true, filterable: true, defaultSelected: true },
  { field: 'transitions_count', label: 'Transitions Count', type: 'number', category: 'Counts', sortable: true, filterable: true },

  // Matching Config
  { field: 'priority_min', label: 'Min Priority', type: 'number', category: 'Matching', sortable: true, filterable: true },
  { field: 'priority_max', label: 'Max Priority', type: 'number', category: 'Matching', sortable: true, filterable: true },

  // Creator
  { field: 'created_by.username', label: 'Created By', type: 'string', category: 'Creator', sortable: true, filterable: true, relationField: 'created_by' },

  // Timestamps
  { field: 'created_at', label: 'Created At', type: 'datetime', category: 'Timestamps', sortable: true, filterable: true },
  { field: 'updated_at', label: 'Updated At', type: 'datetime', category: 'Timestamps', sortable: true, filterable: true },
];

// All Data Sources with their definitions
export const DATA_SOURCES: DataSourceDefinition[] = [
  {
    key: 'incidents',
    label: 'Incidents',
    description: 'Incident tracking and management data',
    icon: 'AlertCircle',
    fields: incidentFields,
  },
  {
    key: 'action_logs',
    label: 'Action Logs',
    description: 'System audit trail and user activity',
    icon: 'FileText',
    fields: actionLogFields,
  },
  {
    key: 'users',
    label: 'Users',
    description: 'User accounts and profiles',
    icon: 'Users',
    fields: userFields,
  },
  {
    key: 'departments',
    label: 'Departments',
    description: 'Organizational department structure',
    icon: 'Building2',
    fields: departmentFields,
  },
  {
    key: 'locations',
    label: 'Locations',
    description: 'Physical location hierarchy',
    icon: 'MapPin',
    fields: locationFields,
  },
  {
    key: 'workflows',
    label: 'Workflows',
    description: 'Workflow definitions and configurations',
    icon: 'GitBranch',
    fields: workflowFields,
  },
];

// Helper function to get fields for a data source
export const getFieldsForDataSource = (dataSource: string): ReportFieldDefinition[] => {
  const source = DATA_SOURCES.find(ds => ds.key === dataSource);
  return source?.fields || [];
};

// Helper function to get default selected fields for a data source
export const getDefaultFieldsForDataSource = (dataSource: string): string[] => {
  const fields = getFieldsForDataSource(dataSource);
  return fields.filter(f => f.defaultSelected).map(f => f.field);
};

// Helper function to get operators for a field type
export const getOperatorsForFieldType = (fieldType: string): { value: FilterOperator; label: string }[] => {
  return FILTER_OPERATORS_BY_TYPE[fieldType] || FILTER_OPERATORS_BY_TYPE.string;
};

// Helper function to group fields by category
export const groupFieldsByCategory = (fields: ReportFieldDefinition[]): Record<string, ReportFieldDefinition[]> => {
  return fields.reduce((acc, field) => {
    const category = field.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(field);
    return acc;
  }, {} as Record<string, ReportFieldDefinition[]>);
};
