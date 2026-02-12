import apiClient from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  User,
  UpdateProfileRequest,
  Classification,
  ClassificationCreateRequest,
  ClassificationUpdateRequest,
  ClassificationType,
  Location,
  LocationCreateRequest,
  LocationUpdateRequest,
  Department,
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
  DepartmentMatchRequest,
  DepartmentMatchResponse,
  Role,
  RoleCreateRequest,
  RoleUpdateRequest,
  Permission,
  PermissionCreateRequest,
  PermissionUpdateRequest,
  ActionLog,
  ActionLogFilter,
  ActionLogStats,
  ActionLogFilterOptions,
  Workflow,
  WorkflowCreateRequest,
  WorkflowUpdateRequest,
  WorkflowImportResponse,
  WorkflowState,
  WorkflowStateCreateRequest,
  WorkflowStateUpdateRequest,
  WorkflowTransition,
  WorkflowTransitionCreateRequest,
  WorkflowTransitionUpdateRequest,
  TransitionRequirementRequest,
  TransitionActionRequest,
  Incident,
  IncidentDetail,
  IncidentCreateRequest,
  IncidentUpdateRequest,
  IncidentTransitionRequest,
  IncidentComment,
  IncidentCommentRequest,
  IncidentAttachment,
  IncidentFilter,
  IncidentStats,
  AvailableTransition,
  TransitionHistory,
  IncidentRevision,
  IncidentRevisionFilter,
  IncidentSource,
  ConvertToRequestRequest,
  ConvertToRequestResponse,
  CanConvertToRequestResponse,
  CreateComplaintRequest,
  CreateQueryRequest,
  CreateRequestRequest,
  ReportDataSource,
  ReportFieldDefinition,
  DataSourceDefinition,
  ReportQueryRequest,
  ReportQueryResponse,
  ReportExportRequest,
  ReportTemplate,
  ReportTemplateCreateRequest,
  ReportTemplateUpdateRequest,
  ReportTemplateShareRequest,
  UserMatchRequest,
  UserMatchResponse,
  LookupCategory,
  LookupValue,
  LookupCategoryCreateRequest,
  LookupCategoryUpdateRequest,
  LookupValueCreateRequest,
  LookupValueUpdateRequest,
  PresenceInfo,
} from '../types';

// User Management
export const userApi = {
  list: async (page = 1, limit = 10): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get<PaginatedResponse<User>>(`/admin/users?page=${page}&limit=${limit}`);
    return response.data;
  },

  create: async (
    data: {
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
    },
    avatarFile?: File
  ): Promise<ApiResponse<User>> => {
    if (avatarFile) {
      // Use FormData when avatar is provided
      const formData = new FormData();
      formData.append('email', data.email);
      formData.append('username', data.username);
      formData.append('password', data.password);
      if (data.first_name) formData.append('first_name', data.first_name);
      if (data.last_name) formData.append('last_name', data.last_name);
      if (data.phone) formData.append('phone', data.phone);
      if (data.department_id) formData.append('department_id', data.department_id);
      if (data.location_id) formData.append('location_id', data.location_id);
      if (data.department_ids?.length) formData.append('department_ids', JSON.stringify(data.department_ids));
      if (data.location_ids?.length) formData.append('location_ids', JSON.stringify(data.location_ids));
      if (data.classification_ids?.length) formData.append('classification_ids', JSON.stringify(data.classification_ids));
      if (data.role_ids?.length) formData.append('role_ids', JSON.stringify(data.role_ids));
      formData.append('avatar', avatarFile);

      const response = await apiClient.post<ApiResponse<User>>('/admin/users', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }
    // Regular JSON when no avatar
    // Clean up empty string values that should be null/undefined for UUID fields
    const cleanedData = {
      ...data,
      department_id: data.department_id || undefined,
      location_id: data.location_id || undefined,
    };
    const response = await apiClient.post<ApiResponse<User>>('/admin/users', cleanedData);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<User>> => {
    const response = await apiClient.get<ApiResponse<User>>(`/admin/users/${id}`);
    return response.data;
  },

  update: async (id: string, data: UpdateProfileRequest): Promise<ApiResponse<User>> => {
    const response = await apiClient.put<ApiResponse<User>>(`/admin/users/${id}`, data);
    return response.data;
  },

  // Find users matching criteria (role, classification, location, department)
  match: async (data: UserMatchRequest): Promise<ApiResponse<UserMatchResponse>> => {
    const response = await apiClient.post<ApiResponse<UserMatchResponse>>('/admin/users/match', data);
    return response.data;
  },

  // Export all users as JSON file
  export: async (): Promise<Blob> => {
    const response = await apiClient.get('/admin/users/export', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Import users from JSON file
  import: async (file: File): Promise<ApiResponse<{ imported: number; skipped: number; errors: string[]; note: string }>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<{ imported: number; skipped: number; errors: string[]; note: string }>>(
      '/admin/users/import',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },
};

// Classification API
export const classificationApi = {
  create: async (data: ClassificationCreateRequest): Promise<ApiResponse<Classification>> => {
    const response = await apiClient.post<ApiResponse<Classification>>('/admin/classifications', data);
    return response.data;
  },

  list: async (type?: ClassificationType): Promise<ApiResponse<Classification[]>> => {
    const url = type ? `/admin/classifications?type=${type}` : '/admin/classifications';
    const response = await apiClient.get<ApiResponse<Classification[]>>(url);
    return response.data;
  },

  listByType: async (type: ClassificationType): Promise<ApiResponse<Classification[]>> => {
    const response = await apiClient.get<ApiResponse<Classification[]>>(`/admin/classifications?type=${type}`);
    return response.data;
  },

  getTree: async (type?: ClassificationType): Promise<ApiResponse<Classification[]>> => {
    const url = type ? `/admin/classifications/tree?type=${type}` : '/admin/classifications/tree';
    const response = await apiClient.get<ApiResponse<Classification[]>>(url);
    return response.data;
  },

  getTreeByType: async (type: ClassificationType): Promise<ApiResponse<Classification[]>> => {
    const response = await apiClient.get<ApiResponse<Classification[]>>(`/admin/classifications/tree?type=${type}`);
    return response.data;
  },

  getChildren: async (parentId?: string): Promise<ApiResponse<Classification[]>> => {
    const url = parentId
      ? `/admin/classifications/children?parent_id=${parentId}`
      : '/admin/classifications/children';
    const response = await apiClient.get<ApiResponse<Classification[]>>(url);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Classification>> => {
    const response = await apiClient.get<ApiResponse<Classification>>(`/admin/classifications/${id}`);
    return response.data;
  },

  update: async (id: string, data: ClassificationUpdateRequest): Promise<ApiResponse<Classification>> => {
    const response = await apiClient.put<ApiResponse<Classification>>(`/admin/classifications/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/admin/classifications/${id}`);
    return response.data;
  },

  // Export all classifications as JSON file
  export: async (): Promise<Blob> => {
    const response = await apiClient.get('/admin/classifications/export', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Import classifications from JSON file
  import: async (file: File): Promise<ApiResponse<{ imported: number; skipped: number; errors: string[] }>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<{ imported: number; skipped: number; errors: string[] }>>(
      '/admin/classifications/import',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },
};

// Location API
export const locationApi = {
  create: async (data: LocationCreateRequest): Promise<ApiResponse<Location>> => {
    const response = await apiClient.post<ApiResponse<Location>>('/admin/locations', data);
    return response.data;
  },

  list: async (): Promise<ApiResponse<Location[]>> => {
    const response = await apiClient.get<ApiResponse<Location[]>>('/admin/locations');
    return response.data;
  },

  getTree: async (): Promise<ApiResponse<Location[]>> => {
    const response = await apiClient.get<ApiResponse<Location[]>>('/admin/locations/tree');
    return response.data;
  },

  getChildren: async (parentId?: string): Promise<ApiResponse<Location[]>> => {
    const url = parentId
      ? `/admin/locations/children?parent_id=${parentId}`
      : '/admin/locations/children';
    const response = await apiClient.get<ApiResponse<Location[]>>(url);
    return response.data;
  },

  getByType: async (type: string): Promise<ApiResponse<Location[]>> => {
    const response = await apiClient.get<ApiResponse<Location[]>>(`/admin/locations/by-type?type=${type}`);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Location>> => {
    const response = await apiClient.get<ApiResponse<Location>>(`/admin/locations/${id}`);
    return response.data;
  },

  update: async (id: string, data: LocationUpdateRequest): Promise<ApiResponse<Location>> => {
    const response = await apiClient.put<ApiResponse<Location>>(`/admin/locations/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/admin/locations/${id}`);
    return response.data;
  },

  // Export all locations as JSON file
  export: async (): Promise<Blob> => {
    const response = await apiClient.get('/admin/locations/export', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Import locations from JSON file
  import: async (file: File): Promise<ApiResponse<{ imported: number; skipped: number; errors: string[] }>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<{ imported: number; skipped: number; errors: string[] }>>(
      '/admin/locations/import',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },
};

// Department API
export const departmentApi = {
  create: async (data: DepartmentCreateRequest): Promise<ApiResponse<Department>> => {
    const response = await apiClient.post<ApiResponse<Department>>('/admin/departments', data);
    return response.data;
  },

  list: async (): Promise<ApiResponse<Department[]>> => {
    const response = await apiClient.get<ApiResponse<Department[]>>('/admin/departments');
    return response.data;
  },

  getTree: async (): Promise<ApiResponse<Department[]>> => {
    const response = await apiClient.get<ApiResponse<Department[]>>('/admin/departments/tree');
    return response.data;
  },

  getChildren: async (parentId?: string): Promise<ApiResponse<Department[]>> => {
    const url = parentId
      ? `/admin/departments/children?parent_id=${parentId}`
      : '/admin/departments/children';
    const response = await apiClient.get<ApiResponse<Department[]>>(url);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Department>> => {
    const response = await apiClient.get<ApiResponse<Department>>(`/admin/departments/${id}`);
    return response.data;
  },

  update: async (id: string, data: DepartmentUpdateRequest): Promise<ApiResponse<Department>> => {
    const response = await apiClient.put<ApiResponse<Department>>(`/admin/departments/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/admin/departments/${id}`);
    return response.data;
  },

  // Find departments matching criteria (classification, location)
  match: async (data: DepartmentMatchRequest): Promise<ApiResponse<DepartmentMatchResponse>> => {
    const response = await apiClient.post<ApiResponse<DepartmentMatchResponse>>('/admin/departments/match', data);
    return response.data;
  },

  // Export all departments as JSON file
  export: async (): Promise<Blob> => {
    const response = await apiClient.get('/admin/departments/export', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Import departments from JSON file
  import: async (file: File): Promise<ApiResponse<{ imported: number; skipped: number; errors: string[] }>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<{ imported: number; skipped: number; errors: string[] }>>(
      '/admin/departments/import',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },
};

// Role API
export const roleApi = {
  create: async (data: RoleCreateRequest): Promise<ApiResponse<Role>> => {
    const response = await apiClient.post<ApiResponse<Role>>('/admin/roles', data);
    return response.data;
  },

  list: async (): Promise<ApiResponse<Role[]>> => {
    const response = await apiClient.get<ApiResponse<Role[]>>('/admin/roles');
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Role>> => {
    const response = await apiClient.get<ApiResponse<Role>>(`/admin/roles/${id}`);
    return response.data;
  },

  update: async (id: string, data: RoleUpdateRequest): Promise<ApiResponse<Role>> => {
    const response = await apiClient.put<ApiResponse<Role>>(`/admin/roles/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/admin/roles/${id}`);
    return response.data;
  },

  assignPermissions: async (id: string, permissionIds: string[]): Promise<ApiResponse<Role>> => {
    const response = await apiClient.post<ApiResponse<Role>>(`/admin/roles/${id}/permissions`, {
      permission_ids: permissionIds,
    });
    return response.data;
  },

  export: async (): Promise<Blob> => {
    const response = await apiClient.get('/admin/roles/export', {
      responseType: 'blob',
    });
    return response.data;
  },

  import: async (file: File): Promise<ApiResponse<{ imported: number; skipped: number; errors: string[] }>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/admin/roles/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Permission API
export const permissionApi = {
  create: async (data: PermissionCreateRequest): Promise<ApiResponse<Permission>> => {
    const response = await apiClient.post<ApiResponse<Permission>>('/admin/permissions', data);
    return response.data;
  },

  list: async (module?: string): Promise<ApiResponse<Permission[]>> => {
    const url = module
      ? `/admin/permissions?module=${module}`
      : '/admin/permissions';
    const response = await apiClient.get<ApiResponse<Permission[]>>(url);
    return response.data;
  },

  getModules: async (): Promise<ApiResponse<string[]>> => {
    const response = await apiClient.get<ApiResponse<string[]>>('/admin/permissions/modules');
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Permission>> => {
    const response = await apiClient.get<ApiResponse<Permission>>(`/admin/permissions/${id}`);
    return response.data;
  },

  update: async (id: string, data: PermissionUpdateRequest): Promise<ApiResponse<Permission>> => {
    const response = await apiClient.put<ApiResponse<Permission>>(`/admin/permissions/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/admin/permissions/${id}`);
    return response.data;
  },
};

// Action Log API
export const actionLogApi = {
  list: async (filter: ActionLogFilter = {}): Promise<PaginatedResponse<ActionLog>> => {
    const params = new URLSearchParams();
    if (filter.page) params.append('page', String(filter.page));
    if (filter.limit) params.append('limit', String(filter.limit));
    if (filter.user_id) params.append('user_id', filter.user_id);
    if (filter.action) params.append('action', filter.action);
    if (filter.module) params.append('module', filter.module);
    if (filter.status) params.append('status', filter.status);
    if (filter.resource_id) params.append('resource_id', filter.resource_id);
    if (filter.start_date) params.append('start_date', filter.start_date);
    if (filter.end_date) params.append('end_date', filter.end_date);
    if (filter.search) params.append('search', filter.search);

    const response = await apiClient.get<PaginatedResponse<ActionLog>>(`/admin/action-logs?${params.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<ActionLog>> => {
    const response = await apiClient.get<ApiResponse<ActionLog>>(`/admin/action-logs/${id}`);
    return response.data;
  },

  getStats: async (): Promise<ApiResponse<ActionLogStats>> => {
    const response = await apiClient.get<ApiResponse<ActionLogStats>>('/admin/action-logs/stats');
    return response.data;
  },

  getFilterOptions: async (): Promise<ApiResponse<ActionLogFilterOptions>> => {
    const response = await apiClient.get<ApiResponse<ActionLogFilterOptions>>('/admin/action-logs/filter-options');
    return response.data;
  },

  getUserActions: async (userId: string, page = 1, limit = 20): Promise<PaginatedResponse<ActionLog>> => {
    const response = await apiClient.get<PaginatedResponse<ActionLog>>(
      `/admin/action-logs/user/${userId}?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  cleanup: async (retentionDays = 90): Promise<ApiResponse<{ deleted_count: number; retention_days: number }>> => {
    const response = await apiClient.delete<ApiResponse<{ deleted_count: number; retention_days: number }>>(
      `/admin/action-logs/cleanup?retention_days=${retentionDays}`
    );
    return response.data;
  },
};

// Workflow API
export const workflowApi = {
  create: async (data: WorkflowCreateRequest): Promise<ApiResponse<Workflow>> => {
    const response = await apiClient.post<ApiResponse<Workflow>>('/admin/workflows', data);
    return response.data;
  },

  list: async (activeOnly = false, recordType?: ClassificationType): Promise<ApiResponse<Workflow[]>> => {
    const params = new URLSearchParams();
    if (activeOnly) params.append('active_only', 'true');
    if (recordType) params.append('record_type', recordType);
    const url = `/admin/workflows${params.toString() ? '?' + params.toString() : ''}`;
    const response = await apiClient.get<ApiResponse<Workflow[]>>(url);
    return response.data;
  },

  listByRecordType: async (recordType: ClassificationType, activeOnly = false): Promise<ApiResponse<Workflow[]>> => {
    const params = new URLSearchParams();
    params.append('record_type', recordType);
    if (activeOnly) params.append('active_only', 'true');
    const response = await apiClient.get<ApiResponse<Workflow[]>>(`/admin/workflows?${params.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Workflow>> => {
    const response = await apiClient.get<ApiResponse<Workflow>>(`/admin/workflows/${id}`);
    return response.data;
  },

  update: async (id: string, data: WorkflowUpdateRequest): Promise<ApiResponse<Workflow>> => {
    const response = await apiClient.put<ApiResponse<Workflow>>(`/admin/workflows/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/admin/workflows/${id}`);
    return response.data;
  },

  listDeleted: async (): Promise<ApiResponse<Workflow[]>> => {
    const response = await apiClient.get<ApiResponse<Workflow[]>>('/admin/workflows/deleted');
    return response.data;
  },

  permanentDelete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/admin/workflows/${id}/permanent`);
    return response.data;
  },

  restore: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post<ApiResponse<null>>(`/admin/workflows/${id}/restore`);
    return response.data;
  },

  duplicate: async (id: string): Promise<ApiResponse<Workflow>> => {
    const response = await apiClient.post<ApiResponse<Workflow>>(`/admin/workflows/${id}/duplicate`);
    return response.data;
  },

  // States
  createState: async (workflowId: string, data: WorkflowStateCreateRequest): Promise<ApiResponse<WorkflowState>> => {
    const response = await apiClient.post<ApiResponse<WorkflowState>>(`/admin/workflows/${workflowId}/states`, data);
    return response.data;
  },

  listStates: async (workflowId: string): Promise<ApiResponse<WorkflowState[]>> => {
    const response = await apiClient.get<ApiResponse<WorkflowState[]>>(`/admin/workflows/${workflowId}/states`);
    return response.data;
  },

  updateState: async (workflowId: string, stateId: string, data: WorkflowStateUpdateRequest): Promise<ApiResponse<WorkflowState>> => {
    const response = await apiClient.put<ApiResponse<WorkflowState>>(`/admin/workflows/${workflowId}/states/${stateId}`, data);
    return response.data;
  },

  deleteState: async (workflowId: string, stateId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/admin/workflows/${workflowId}/states/${stateId}`);
    return response.data;
  },

  // Transitions
  createTransition: async (workflowId: string, data: WorkflowTransitionCreateRequest): Promise<ApiResponse<WorkflowTransition>> => {
    const response = await apiClient.post<ApiResponse<WorkflowTransition>>(`/admin/workflows/${workflowId}/transitions`, data);
    return response.data;
  },

  listTransitions: async (workflowId: string): Promise<ApiResponse<WorkflowTransition[]>> => {
    const response = await apiClient.get<ApiResponse<WorkflowTransition[]>>(`/admin/workflows/${workflowId}/transitions`);
    return response.data;
  },

  updateTransition: async (workflowId: string, transitionId: string, data: WorkflowTransitionUpdateRequest): Promise<ApiResponse<WorkflowTransition>> => {
    const response = await apiClient.put<ApiResponse<WorkflowTransition>>(`/admin/workflows/${workflowId}/transitions/${transitionId}`, data);
    return response.data;
  },

  deleteTransition: async (workflowId: string, transitionId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/admin/workflows/${workflowId}/transitions/${transitionId}`);
    return response.data;
  },

  // Transition configuration
  setTransitionRoles: async (transitionId: string, roleIds: string[]): Promise<ApiResponse<WorkflowTransition>> => {
    const response = await apiClient.put<ApiResponse<WorkflowTransition>>(`/admin/transitions/${transitionId}/roles`, { role_ids: roleIds });
    return response.data;
  },

  setTransitionRequirements: async (transitionId: string, requirements: TransitionRequirementRequest[]): Promise<ApiResponse<WorkflowTransition>> => {
    const response = await apiClient.put<ApiResponse<WorkflowTransition>>(`/admin/transitions/${transitionId}/requirements`, { requirements });
    return response.data;
  },

  setTransitionActions: async (transitionId: string, actions: TransitionActionRequest[]): Promise<ApiResponse<WorkflowTransition>> => {
    const response = await apiClient.put<ApiResponse<WorkflowTransition>>(`/admin/transitions/${transitionId}/actions`, { actions });
    return response.data;
  },

  // Classification assignment
  assignClassifications: async (workflowId: string, classificationIds: string[]): Promise<ApiResponse<Workflow>> => {
    const response = await apiClient.put<ApiResponse<Workflow>>(`/admin/workflows/${workflowId}/classifications`, { classification_ids: classificationIds });
    return response.data;
  },

  getByClassification: async (classificationId: string): Promise<ApiResponse<Workflow>> => {
    const response = await apiClient.get<ApiResponse<Workflow>>(`/admin/workflows/by-classification/${classificationId}`);
    return response.data;
  },

  // Find matching workflow based on criteria
  findMatchingWorkflow: (
    workflows: Workflow[],
    criteria: {
      classification_id?: string;
      location_id?: string;
      source?: string;
      priority?: number;
    }
  ): Workflow | null => {
    // Filter only active workflows
    const activeWorkflows = workflows.filter(w => w.is_active);

    // Score-based matching - higher score = better match
    let bestMatch: { workflow: Workflow; score: number } | null = null;

    for (const workflow of activeWorkflows) {
      let score = 0;
      let matchCount = 0;

      // Check classification match
      if (criteria.classification_id && workflow.classifications?.length) {
        if (workflow.classifications.some(c => c.id === criteria.classification_id)) {
          score += 10;
          matchCount++;
        }
      }

      // Check location match
      if (criteria.location_id && workflow.locations?.length) {
        if (workflow.locations.some(l => l.id === criteria.location_id)) {
          score += 10;
          matchCount++;
        }
      }

      // Check source match
      if (criteria.source && workflow.sources?.length) {
        if (workflow.sources.includes(criteria.source as IncidentSource)) {
          score += 10;
          matchCount++;
        }
      }

      // Check priority range
      if (criteria.priority !== undefined) {
        const minPri = workflow.priority_min ?? 1;
        const maxPri = workflow.priority_max ?? 5;
        if (criteria.priority >= minPri && criteria.priority <= maxPri) {
          score += 5;
          matchCount++;
        }
      }

      // Prefer workflows with more specific matching (more criteria matched)
      // Also prefer workflows that are marked as default if no match
      if (workflow.is_default && score === 0) {
        score = 1; // Default workflow gets lowest priority score
      }

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { workflow, score };
      }
    }

    // If no match found, return the default workflow
    if (!bestMatch) {
      const defaultWorkflow = activeWorkflows.find(w => w.is_default);
      return defaultWorkflow || activeWorkflows[0] || null;
    }

    return bestMatch.workflow;
  },

  // Update workflow matching configuration
  updateMatchConfig: async (workflowId: string, config: {
    classification_ids?: string[];
    location_ids?: string[];
    sources?: string[];
    priority_min?: number;
    priority_max?: number;
  }): Promise<ApiResponse<Workflow>> => {
    const response = await apiClient.put<ApiResponse<Workflow>>(`/admin/workflows/${workflowId}/match-config`, config);
    return response.data;
  },

  // Export/Import
  export: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/admin/workflows/${id}/export`, {
      responseType: 'blob',
    });
    return response.data;
  },

  import: async (file: File): Promise<ApiResponse<WorkflowImportResponse>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/admin/workflows/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// Incident API
export const incidentApi = {
  create: async (data: IncidentCreateRequest): Promise<ApiResponse<Incident>> => {
    const response = await apiClient.post<ApiResponse<Incident>>('/incidents', data);
    return response.data;
  },

  list: async (filter: IncidentFilter = {}): Promise<PaginatedResponse<Incident>> => {
    const params = new URLSearchParams();
    if (filter.page) params.append('page', String(filter.page));
    if (filter.limit) params.append('limit', String(filter.limit));
    if (filter.search) params.append('search', filter.search);
    if (filter.workflow_id) params.append('workflow_id', filter.workflow_id);
    if (filter.current_state_id) params.append('current_state_id', filter.current_state_id);
    if (filter.classification_id) params.append('classification_id', filter.classification_id);
    if (filter.priority) params.append('priority', String(filter.priority));
    if (filter.assignee_id) params.append('assignee_id', filter.assignee_id);
    if (filter.department_id) params.append('department_id', filter.department_id);
    if (filter.location_id) params.append('location_id', filter.location_id);
    if (filter.sla_breached !== undefined) params.append('sla_breached', String(filter.sla_breached));
    if (filter.record_type) params.append('record_type', filter.record_type);
    if (filter.start_date) params.append('start_date', filter.start_date);
    if (filter.end_date) params.append('end_date', filter.end_date);

    const response = await apiClient.get<PaginatedResponse<Incident>>(`/incidents?${params.toString()}`);
    return response.data;
  },

  listRequests: async (filter: Omit<IncidentFilter, 'record_type'> = {}): Promise<PaginatedResponse<Incident>> => {
    return incidentApi.list({ ...filter, record_type: 'request' });
  },

  getById: async (id: string): Promise<ApiResponse<IncidentDetail>> => {
    const response = await apiClient.get<ApiResponse<IncidentDetail>>(`/incidents/${id}`);
    return response.data;
  },

  update: async (id: string, data: IncidentUpdateRequest): Promise<ApiResponse<Incident>> => {
    const response = await apiClient.put<ApiResponse<Incident>>(`/incidents/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/incidents/${id}`);
    return response.data;
  },

  // State transitions
  transition: async (id: string, data: IncidentTransitionRequest): Promise<ApiResponse<Incident>> => {
    const response = await apiClient.post<ApiResponse<Incident>>(`/incidents/${id}/transition`, data);
    return response.data;
  },

  // Convert incident to request
  convertToRequest: async (id: string, data: ConvertToRequestRequest): Promise<ApiResponse<ConvertToRequestResponse>> => {
    const response = await apiClient.post<ApiResponse<ConvertToRequestResponse>>(`/incidents/${id}/convert-to-request`, data);
    return response.data;
  },

  // Check if user can convert incident to request
  canConvertToRequest: async (id: string): Promise<ApiResponse<CanConvertToRequestResponse>> => {
    const response = await apiClient.get<ApiResponse<CanConvertToRequestResponse>>(`/incidents/${id}/can-convert`);
    return response.data;
  },

  getAvailableTransitions: async (id: string): Promise<ApiResponse<AvailableTransition[]>> => {
    const response = await apiClient.get<ApiResponse<AvailableTransition[]>>(`/incidents/${id}/available-transitions`);
    return response.data;
  },

  getHistory: async (id: string): Promise<ApiResponse<TransitionHistory[]>> => {
    const response = await apiClient.get<ApiResponse<TransitionHistory[]>>(`/incidents/${id}/history`);
    return response.data;
  },

  // Comments
  addComment: async (incidentId: string, data: IncidentCommentRequest): Promise<ApiResponse<IncidentComment>> => {
    const response = await apiClient.post<ApiResponse<IncidentComment>>(`/incidents/${incidentId}/comments`, data);
    return response.data;
  },

  listComments: async (incidentId: string): Promise<ApiResponse<IncidentComment[]>> => {
    const response = await apiClient.get<ApiResponse<IncidentComment[]>>(`/incidents/${incidentId}/comments`);
    return response.data;
  },

  updateComment: async (incidentId: string, commentId: string, data: IncidentCommentRequest): Promise<ApiResponse<IncidentComment>> => {
    const response = await apiClient.put<ApiResponse<IncidentComment>>(`/incidents/${incidentId}/comments/${commentId}`, data);
    return response.data;
  },

  deleteComment: async (incidentId: string, commentId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/incidents/${incidentId}/comments/${commentId}`);
    return response.data;
  },

  // Attachments
  uploadAttachment: async (incidentId: string, file: File): Promise<ApiResponse<IncidentAttachment>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<IncidentAttachment>>(`/incidents/${incidentId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  listAttachments: async (incidentId: string): Promise<ApiResponse<IncidentAttachment[]>> => {
    const response = await apiClient.get<ApiResponse<IncidentAttachment[]>>(`/incidents/${incidentId}/attachments`);
    return response.data;
  },

  deleteAttachment: async (incidentId: string, attachmentId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/incidents/${incidentId}/attachments/${attachmentId}`);
    return response.data;
  },

  // Assignment
  assign: async (incidentId: string, assigneeId: string): Promise<ApiResponse<Incident>> => {
    const response = await apiClient.put<ApiResponse<Incident>>(`/incidents/${incidentId}/assign`, { assignee_id: assigneeId });
    return response.data;
  },

  // Stats and user queries
  getStats: async (recordType?: string): Promise<ApiResponse<IncidentStats>> => {
    const params = new URLSearchParams();
    if (recordType) params.append('record_type', recordType);
    const url = params.toString() ? `/incidents/stats?${params.toString()}` : '/incidents/stats';
    const response = await apiClient.get<ApiResponse<IncidentStats>>(url);
    return response.data;
  },

  getMyAssigned: async (page = 1, limit = 20, recordType?: string): Promise<PaginatedResponse<Incident>> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (recordType) params.append('record_type', recordType);
    const response = await apiClient.get<PaginatedResponse<Incident>>(`/incidents/my-assigned?${params.toString()}`);
    return response.data;
  },

  getMyReported: async (page = 1, limit = 20, recordType?: string): Promise<PaginatedResponse<Incident>> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (recordType) params.append('record_type', recordType);
    const response = await apiClient.get<PaginatedResponse<Incident>>(`/incidents/my-reported?${params.toString()}`);
    return response.data;
  },

  getSLABreached: async (): Promise<ApiResponse<Incident[]>> => {
    const response = await apiClient.get<ApiResponse<Incident[]>>('/incidents/sla-breached');
    return response.data;
  },

  // Revision History
  getRevisions: async (
    incidentId: string,
    filter: Omit<IncidentRevisionFilter, 'incident_id'> = {}
  ): Promise<PaginatedResponse<IncidentRevision>> => {
    const params = new URLSearchParams();
    if (filter.page) params.append('page', String(filter.page));
    if (filter.limit) params.append('limit', String(filter.limit));
    if (filter.action_type) params.append('action_type', filter.action_type);
    if (filter.performed_by_id) params.append('performed_by_id', filter.performed_by_id);
    if (filter.start_date) params.append('start_date', filter.start_date);
    if (filter.end_date) params.append('end_date', filter.end_date);

    const response = await apiClient.get<PaginatedResponse<IncidentRevision>>(
      `/incidents/${incidentId}/revisions?${params.toString()}`
    );
    return response.data;
  },

  exportRevisions: async (incidentId: string, format: 'xlsx' | 'pdf'): Promise<Blob> => {
    const response = await apiClient.get(`/incidents/${incidentId}/revisions/export?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Download Report
  downloadReport: async (incidentId: string, format: 'pdf' | 'json' | 'txt' = 'pdf'): Promise<Blob> => {
    const response = await apiClient.get(`/incidents/${incidentId}/report?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Presence tracking
  markPresence: async (incidentId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post<ApiResponse<null>>(`/incidents/${incidentId}/presence`);
    return response.data;
  },

  getPresence: async (incidentId: string): Promise<ApiResponse<PresenceInfo[]>> => {
    const response = await apiClient.get<ApiResponse<PresenceInfo[]>>(`/incidents/${incidentId}/presence`);
    return response.data;
  },

  removePresence: async (incidentId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/incidents/${incidentId}/presence`);
    return response.data;
  },
};

// Complaint API
export const complaintApi = {
  create: async (data: CreateComplaintRequest): Promise<ApiResponse<Incident>> => {
    const response = await apiClient.post<ApiResponse<Incident>>('/complaints', data);
    return response.data;
  },

  list: async (filter: Omit<IncidentFilter, 'record_type'> = {}): Promise<PaginatedResponse<Incident>> => {
    const params = new URLSearchParams();
    if (filter.page) params.append('page', String(filter.page));
    if (filter.limit) params.append('limit', String(filter.limit));
    if (filter.search) params.append('search', filter.search);
    if (filter.workflow_id) params.append('workflow_id', filter.workflow_id);
    if (filter.current_state_id) params.append('current_state_id', filter.current_state_id);
    if (filter.classification_id) params.append('classification_id', filter.classification_id);
    if (filter.assignee_id) params.append('assignee_id', filter.assignee_id);
    if (filter.department_id) params.append('department_id', filter.department_id);
    if (filter.channel) params.append('channel', filter.channel);
    if (filter.start_date) params.append('start_date', filter.start_date);
    if (filter.end_date) params.append('end_date', filter.end_date);

    const response = await apiClient.get<PaginatedResponse<Incident>>(`/complaints?${params.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<IncidentDetail>> => {
    const response = await apiClient.get<ApiResponse<IncidentDetail>>(`/complaints/${id}`);
    return response.data;
  },

  update: async (id: string, data: IncidentUpdateRequest): Promise<ApiResponse<Incident>> => {
    const response = await apiClient.put<ApiResponse<Incident>>(`/complaints/${id}`, data);
    return response.data;
  },

  // State transitions
  transition: async (id: string, data: IncidentTransitionRequest): Promise<ApiResponse<Incident>> => {
    const response = await apiClient.post<ApiResponse<Incident>>(`/complaints/${id}/transition`, data);
    return response.data;
  },

  getAvailableTransitions: async (id: string): Promise<ApiResponse<AvailableTransition[]>> => {
    const response = await apiClient.get<ApiResponse<AvailableTransition[]>>(`/complaints/${id}/available-transitions`);
    return response.data;
  },

  getHistory: async (id: string): Promise<ApiResponse<TransitionHistory[]>> => {
    const response = await apiClient.get<ApiResponse<TransitionHistory[]>>(`/complaints/${id}/history`);
    return response.data;
  },

  // Comments
  addComment: async (complaintId: string, data: IncidentCommentRequest): Promise<ApiResponse<IncidentComment>> => {
    const response = await apiClient.post<ApiResponse<IncidentComment>>(`/complaints/${complaintId}/comments`, data);
    return response.data;
  },

  listComments: async (complaintId: string): Promise<ApiResponse<IncidentComment[]>> => {
    const response = await apiClient.get<ApiResponse<IncidentComment[]>>(`/complaints/${complaintId}/comments`);
    return response.data;
  },

  updateComment: async (complaintId: string, commentId: string, data: IncidentCommentRequest): Promise<ApiResponse<IncidentComment>> => {
    const response = await apiClient.put<ApiResponse<IncidentComment>>(`/complaints/${complaintId}/comments/${commentId}`, data);
    return response.data;
  },

  deleteComment: async (complaintId: string, commentId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/complaints/${complaintId}/comments/${commentId}`);
    return response.data;
  },

  // Attachments
  uploadAttachment: async (complaintId: string, file: File): Promise<ApiResponse<IncidentAttachment>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<IncidentAttachment>>(`/complaints/${complaintId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  listAttachments: async (complaintId: string): Promise<ApiResponse<IncidentAttachment[]>> => {
    const response = await apiClient.get<ApiResponse<IncidentAttachment[]>>(`/complaints/${complaintId}/attachments`);
    return response.data;
  },

  deleteAttachment: async (complaintId: string, attachmentId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/complaints/${complaintId}/attachments/${attachmentId}`);
    return response.data;
  },

  // Evaluation (for closed complaints)
  incrementEvaluation: async (id: string): Promise<ApiResponse<IncidentDetail>> => {
    const response = await apiClient.post<ApiResponse<IncidentDetail>>(`/complaints/${id}/evaluate`);
    return response.data;
  },

  // Revision History
  getRevisions: async (
    complaintId: string,
    filter: Omit<IncidentRevisionFilter, 'incident_id'> = {}
  ): Promise<PaginatedResponse<IncidentRevision>> => {
    const params = new URLSearchParams();
    if (filter.page) params.append('page', String(filter.page));
    if (filter.limit) params.append('limit', String(filter.limit));
    if (filter.action_type) params.append('action_type', filter.action_type);
    if (filter.performed_by_id) params.append('performed_by_id', filter.performed_by_id);
    if (filter.start_date) params.append('start_date', filter.start_date);
    if (filter.end_date) params.append('end_date', filter.end_date);

    const response = await apiClient.get<PaginatedResponse<IncidentRevision>>(
      `/complaints/${complaintId}/revisions?${params.toString()}`
    );
    return response.data;
  },
};

// Query API
export const queryApi = {
  create: async (data: CreateQueryRequest): Promise<ApiResponse<Incident>> => {
    const response = await apiClient.post<ApiResponse<Incident>>('/queries', data);
    return response.data;
  },

  list: async (filter: Omit<IncidentFilter, 'record_type'> = {}): Promise<PaginatedResponse<Incident>> => {
    const params = new URLSearchParams();
    if (filter.page) params.append('page', String(filter.page));
    if (filter.limit) params.append('limit', String(filter.limit));
    if (filter.search) params.append('search', filter.search);
    if (filter.workflow_id) params.append('workflow_id', filter.workflow_id);
    if (filter.current_state_id) params.append('current_state_id', filter.current_state_id);
    if (filter.classification_id) params.append('classification_id', filter.classification_id);
    if (filter.assignee_id) params.append('assignee_id', filter.assignee_id);
    if (filter.department_id) params.append('department_id', filter.department_id);
    if (filter.channel) params.append('channel', filter.channel);
    if (filter.start_date) params.append('start_date', filter.start_date);
    if (filter.end_date) params.append('end_date', filter.end_date);

    const response = await apiClient.get<PaginatedResponse<Incident>>(`/queries?${params.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<IncidentDetail>> => {
    const response = await apiClient.get<ApiResponse<IncidentDetail>>(`/queries/${id}`);
    return response.data;
  },

  update: async (id: string, data: IncidentUpdateRequest): Promise<ApiResponse<Incident>> => {
    const response = await apiClient.put<ApiResponse<Incident>>(`/queries/${id}`, data);
    return response.data;
  },

  // State transitions
  transition: async (id: string, data: IncidentTransitionRequest): Promise<ApiResponse<Incident>> => {
    const response = await apiClient.post<ApiResponse<Incident>>(`/queries/${id}/transition`, data);
    return response.data;
  },

  getAvailableTransitions: async (id: string): Promise<ApiResponse<AvailableTransition[]>> => {
    const response = await apiClient.get<ApiResponse<AvailableTransition[]>>(`/queries/${id}/available-transitions`);
    return response.data;
  },

  getHistory: async (id: string): Promise<ApiResponse<TransitionHistory[]>> => {
    const response = await apiClient.get<ApiResponse<TransitionHistory[]>>(`/queries/${id}/history`);
    return response.data;
  },

  // Comments
  addComment: async (queryId: string, data: IncidentCommentRequest): Promise<ApiResponse<IncidentComment>> => {
    const response = await apiClient.post<ApiResponse<IncidentComment>>(`/queries/${queryId}/comments`, data);
    return response.data;
  },

  listComments: async (queryId: string): Promise<ApiResponse<IncidentComment[]>> => {
    const response = await apiClient.get<ApiResponse<IncidentComment[]>>(`/queries/${queryId}/comments`);
    return response.data;
  },

  updateComment: async (queryId: string, commentId: string, data: IncidentCommentRequest): Promise<ApiResponse<IncidentComment>> => {
    const response = await apiClient.put<ApiResponse<IncidentComment>>(`/queries/${queryId}/comments/${commentId}`, data);
    return response.data;
  },

  deleteComment: async (queryId: string, commentId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/queries/${queryId}/comments/${commentId}`);
    return response.data;
  },

  // Attachments
  uploadAttachment: async (queryId: string, file: File): Promise<ApiResponse<IncidentAttachment>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<IncidentAttachment>>(`/queries/${queryId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  listAttachments: async (queryId: string): Promise<ApiResponse<IncidentAttachment[]>> => {
    const response = await apiClient.get<ApiResponse<IncidentAttachment[]>>(`/queries/${queryId}/attachments`);
    return response.data;
  },

  deleteAttachment: async (queryId: string, attachmentId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/queries/${queryId}/attachments/${attachmentId}`);
    return response.data;
  },

  // Revision History
  getRevisions: async (
    queryId: string,
    filter: Omit<IncidentRevisionFilter, 'incident_id'> = {}
  ): Promise<PaginatedResponse<IncidentRevision>> => {
    const params = new URLSearchParams();
    if (filter.page) params.append('page', String(filter.page));
    if (filter.limit) params.append('limit', String(filter.limit));
    if (filter.action_type) params.append('action_type', filter.action_type);
    if (filter.performed_by_id) params.append('performed_by_id', filter.performed_by_id);
    if (filter.start_date) params.append('start_date', filter.start_date);
    if (filter.end_date) params.append('end_date', filter.end_date);

    const response = await apiClient.get<PaginatedResponse<IncidentRevision>>(
      `/queries/${queryId}/revisions?${params.toString()}`
    );
    return response.data;
  },

  // Evaluation
  incrementEvaluation: async (id: string): Promise<ApiResponse<Incident>> => {
    const response = await apiClient.post<ApiResponse<Incident>>(`/queries/${id}/evaluate`);
    return response.data;
  },
};

export const requestApi = {
  create: async (data: CreateRequestRequest): Promise<ApiResponse<Incident>> => {
    // Requests are created as incidents with record_type='request'
    const requestData = {
      ...data,
      record_type: 'request',
    };
    const response = await apiClient.post<ApiResponse<Incident>>('/incidents', requestData);
    return response.data;
  },

  list: async (filter: Omit<IncidentFilter, 'record_type'> = {}): Promise<PaginatedResponse<Incident>> => {
    const params = new URLSearchParams();
    params.append('record_type', 'request'); // Filter for requests only
    if (filter.page) params.append('page', String(filter.page));
    if (filter.limit) params.append('limit', String(filter.limit));
    if (filter.search) params.append('search', filter.search);
    if (filter.workflow_id) params.append('workflow_id', filter.workflow_id);
    if (filter.current_state_id) params.append('current_state_id', filter.current_state_id);
    if (filter.classification_id) params.append('classification_id', filter.classification_id);
    if (filter.assignee_id) params.append('assignee_id', filter.assignee_id);
    if (filter.department_id) params.append('department_id', filter.department_id);
    if (filter.channel) params.append('channel', filter.channel);
    if (filter.start_date) params.append('start_date', filter.start_date);
    if (filter.end_date) params.append('end_date', filter.end_date);

    const response = await apiClient.get<PaginatedResponse<Incident>>(`/incidents?${params.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<IncidentDetail>> => {
    const response = await apiClient.get<ApiResponse<IncidentDetail>>(`/incidents/${id}`);
    return response.data;
  },

  update: async (id: string, data: IncidentUpdateRequest): Promise<ApiResponse<Incident>> => {
    const response = await apiClient.put<ApiResponse<Incident>>(`/incidents/${id}`, data);
    return response.data;
  },

  // State transitions
  transition: async (id: string, data: IncidentTransitionRequest): Promise<ApiResponse<Incident>> => {
    const response = await apiClient.post<ApiResponse<Incident>>(`/incidents/${id}/transition`, data);
    return response.data;
  },

  getAvailableTransitions: async (id: string): Promise<ApiResponse<AvailableTransition[]>> => {
    const response = await apiClient.get<ApiResponse<AvailableTransition[]>>(`/incidents/${id}/available-transitions`);
    return response.data;
  },

  getHistory: async (id: string): Promise<ApiResponse<TransitionHistory[]>> => {
    const response = await apiClient.get<ApiResponse<TransitionHistory[]>>(`/incidents/${id}/history`);
    return response.data;
  },

  // Comments
  addComment: async (requestId: string, data: IncidentCommentRequest): Promise<ApiResponse<IncidentComment>> => {
    const response = await apiClient.post<ApiResponse<IncidentComment>>(`/incidents/${requestId}/comments`, data);
    return response.data;
  },

  listComments: async (requestId: string): Promise<ApiResponse<IncidentComment[]>> => {
    const response = await apiClient.get<ApiResponse<IncidentComment[]>>(`/incidents/${requestId}/comments`);
    return response.data;
  },

  updateComment: async (requestId: string, commentId: string, data: IncidentCommentRequest): Promise<ApiResponse<IncidentComment>> => {
    const response = await apiClient.put<ApiResponse<IncidentComment>>(`/incidents/${requestId}/comments/${commentId}`, data);
    return response.data;
  },

  deleteComment: async (requestId: string, commentId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/incidents/${requestId}/comments/${commentId}`);
    return response.data;
  },

  // Attachments
  uploadAttachment: async (requestId: string, file: File): Promise<ApiResponse<IncidentAttachment>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<IncidentAttachment>>(`/incidents/${requestId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  listAttachments: async (requestId: string): Promise<ApiResponse<IncidentAttachment[]>> => {
    const response = await apiClient.get<ApiResponse<IncidentAttachment[]>>(`/incidents/${requestId}/attachments`);
    return response.data;
  },

  deleteAttachment: async (requestId: string, attachmentId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/incidents/${requestId}/attachments/${attachmentId}`);
    return response.data;
  },

  // Revision History
  getRevisions: async (
    requestId: string,
    filter: Omit<IncidentRevisionFilter, 'incident_id'> = {}
  ): Promise<PaginatedResponse<IncidentRevision>> => {
    const params = new URLSearchParams();
    if (filter.page) params.append('page', String(filter.page));
    if (filter.limit) params.append('limit', String(filter.limit));
    if (filter.action_type) params.append('action_type', filter.action_type);
    if (filter.performed_by_id) params.append('performed_by_id', filter.performed_by_id);
    if (filter.start_date) params.append('start_date', filter.start_date);
    if (filter.end_date) params.append('end_date', filter.end_date);

    const response = await apiClient.get<PaginatedResponse<IncidentRevision>>(
      `/incidents/${requestId}/revisions?${params.toString()}`
    );
    return response.data;
  },

  // Evaluation
  incrementEvaluation: async (id: string): Promise<ApiResponse<Incident>> => {
    const response = await apiClient.post<ApiResponse<Incident>>(`/incidents/${id}/evaluate`);
    return response.data;
  },
};

// Report Builder API
export const reportApi = {
  // Get available data sources with their field definitions
  getDataSources: async (): Promise<ApiResponse<DataSourceDefinition[]>> => {
    const response = await apiClient.get<ApiResponse<DataSourceDefinition[]>>('/admin/reports/data-sources');
    return response.data;
  },

  // Get fields for a specific data source
  getDataSourceFields: async (dataSource: ReportDataSource): Promise<ApiResponse<ReportFieldDefinition[]>> => {
    const response = await apiClient.get<ApiResponse<ReportFieldDefinition[]>>(
      `/admin/reports/data-sources/${dataSource}/fields`
    );
    return response.data;
  },

  // Execute a report query
  query: async <T = Record<string, unknown>>(request: ReportQueryRequest): Promise<ReportQueryResponse<T>> => {
    const response = await apiClient.post<ReportQueryResponse<T>>('/admin/reports/query', request);
    return response.data;
  },

  // Export report to file
  export: async (request: ReportExportRequest): Promise<Blob> => {
    const response = await apiClient.post('/admin/reports/export', request, {
      responseType: 'blob',
    });
    return response.data;
  },

  // List all templates (owned + shared + public)
  listTemplates: async (dataSource?: ReportDataSource): Promise<ApiResponse<ReportTemplate[]>> => {
    const params = dataSource ? `?data_source=${dataSource}` : '';
    const response = await apiClient.get<ApiResponse<ReportTemplate[]>>(`/admin/reports${params}`);
    return response.data;
  },

  // Get a single template by ID
  getTemplate: async (id: string): Promise<ApiResponse<ReportTemplate>> => {
    const response = await apiClient.get<ApiResponse<ReportTemplate>>(`/admin/reports/${id}`);
    return response.data;
  },

  // Create a new template
  createTemplate: async (data: ReportTemplateCreateRequest): Promise<ApiResponse<ReportTemplate>> => {
    const response = await apiClient.post<ApiResponse<ReportTemplate>>('/admin/reports', data);
    return response.data;
  },

  // Update a template
  updateTemplate: async (id: string, data: ReportTemplateUpdateRequest): Promise<ApiResponse<ReportTemplate>> => {
    const response = await apiClient.put<ApiResponse<ReportTemplate>>(`/admin/reports/${id}`, data);
    return response.data;
  },

  // Delete a template
  deleteTemplate: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/admin/reports/${id}`);
    return response.data;
  },

  // Duplicate a template
  duplicateTemplate: async (id: string, newName?: string): Promise<ApiResponse<ReportTemplate>> => {
    const response = await apiClient.post<ApiResponse<ReportTemplate>>(`/admin/reports/${id}/duplicate`, {
      name: newName,
    });
    return response.data;
  },

  // Share template with users
  shareTemplate: async (id: string, data: ReportTemplateShareRequest): Promise<ApiResponse<ReportTemplate>> => {
    const response = await apiClient.post<ApiResponse<ReportTemplate>>(
      `/admin/reports/${id}/share`,
      data
    );
    return response.data;
  },

  // Remove sharing for specific users
  unshareTemplate: async (id: string, userIds: string[]): Promise<ApiResponse<ReportTemplate>> => {
    const response = await apiClient.post<ApiResponse<ReportTemplate>>(
      `/admin/reports/${id}/unshare`,
      { user_ids: userIds }
    );
    return response.data;
  },
};

// Lookup API
export const lookupApi = {
  // Categories
  listCategories: async (): Promise<ApiResponse<LookupCategory[]>> => {
    const response = await apiClient.get<ApiResponse<LookupCategory[]>>('/admin/lookups/categories');
    return response.data;
  },

  getCategory: async (id: string): Promise<ApiResponse<LookupCategory>> => {
    const response = await apiClient.get<ApiResponse<LookupCategory>>(`/admin/lookups/categories/${id}`);
    return response.data;
  },

  createCategory: async (data: LookupCategoryCreateRequest): Promise<ApiResponse<LookupCategory>> => {
    const response = await apiClient.post<ApiResponse<LookupCategory>>('/admin/lookups/categories', data);
    return response.data;
  },

  updateCategory: async (id: string, data: LookupCategoryUpdateRequest): Promise<ApiResponse<LookupCategory>> => {
    const response = await apiClient.put<ApiResponse<LookupCategory>>(`/admin/lookups/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/admin/lookups/categories/${id}`);
    return response.data;
  },

  // Values
  listValues: async (categoryId: string): Promise<ApiResponse<LookupValue[]>> => {
    const response = await apiClient.get<ApiResponse<LookupValue[]>>(`/admin/lookups/categories/${categoryId}/values`);
    return response.data;
  },

  getValue: async (id: string): Promise<ApiResponse<LookupValue>> => {
    const response = await apiClient.get<ApiResponse<LookupValue>>(`/admin/lookups/values/${id}`);
    return response.data;
  },

  createValue: async (categoryId: string, data: LookupValueCreateRequest): Promise<ApiResponse<LookupValue>> => {
    const response = await apiClient.post<ApiResponse<LookupValue>>(`/admin/lookups/categories/${categoryId}/values`, data);
    return response.data;
  },

  updateValue: async (id: string, data: LookupValueUpdateRequest): Promise<ApiResponse<LookupValue>> => {
    const response = await apiClient.put<ApiResponse<LookupValue>>(`/admin/lookups/values/${id}`, data);
    return response.data;
  },

  deleteValue: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/admin/lookups/values/${id}`);
    return response.data;
  },

  // Public - get values by category code (for dropdowns)
  getValuesByCode: async (code: string): Promise<ApiResponse<LookupValue[]>> => {
    const response = await apiClient.get<ApiResponse<LookupValue[]>>(`/lookups/${code}`);
    return response.data;
  },
};

// Call Log API
export const callLogApi = {
  list: async (page = 1, limit = 20, userId?: string): Promise<any> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (userId) params.append('user_id', userId);
    const response = await apiClient.get(`/admin/call-logs?${params.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<any> => {
    const response = await apiClient.get(`/admin/call-logs/${id}`);
    return response.data;
  },

  create: async (data: {
    user_id: string;
    caller_number: string;
    callee_number: string;
    call_type: 'inbound' | 'outbound' | 'internal';
    start_time: string;
    end_time?: string;
    duration?: number;
    status: 'answered' | 'missed' | 'rejected' | 'busy' | 'failed';
    recording_url?: string;
  }): Promise<any> => {
    const response = await apiClient.post('/admin/call-logs', data);
    return response.data;
  },

  update: async (id: string, data: Partial<{
    end_time: string;
    duration: number;
    status: string;
    recording_url: string;
  }>): Promise<any> => {
    const response = await apiClient.put(`/admin/call-logs/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<any> => {
    const response = await apiClient.delete(`/admin/call-logs/${id}`);
    return response.data;
  },
};
