import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  GitBranch,
  Circle,
  ArrowRight,
  ArrowLeft,
  Shield,
  FileText,
  Zap,
  AlertTriangle,
  Loader2,
  Settings,
  Layout,
  Mail,
  ClipboardList,
  Download,
} from 'lucide-react';
import { workflowApi, roleApi, classificationApi, locationApi, departmentApi, userApi, lookupApi } from '../../api/admin';
import type {
  WorkflowState,
  WorkflowTransition,
  WorkflowStateCreateRequest,
  WorkflowStateUpdateRequest,
  WorkflowTransitionCreateRequest,
  WorkflowTransitionUpdateRequest,
  WorkflowUpdateRequest,
  TransitionRequirementRequest,
  TransitionActionRequest,
  Classification,
  Location,
  Department,
  User,
  IncidentSource,
  IncidentFormField,
  LookupCategory,
} from '../../types';
import { INCIDENT_SOURCES, EMAIL_RECIPIENTS, type EmailRecipient, type TransitionEmailConfig } from '../../types';
import { cn } from '@/lib/utils';
import { Button } from '../../components/ui';
import { WorkflowCanvas } from '../../components/workflow';

type TabType = 'visual' | 'states' | 'transitions' | 'matching' | 'fields';

interface StateFormData {
  name: string;
  code: string;
  description: string;
  state_type: 'initial' | 'normal' | 'terminal';
  color: string;
  sla_hours: number | undefined;
  viewable_role_ids: string[];
}

interface TransitionFormData {
  name: string;
  code: string;
  description: string;
  from_state_id: string;
  to_state_id: string;
  role_ids: string[];
  // Department Assignment
  assign_department_id: string;
  auto_detect_department: boolean;
  // User Assignment
  assign_user_id: string;
  assignment_role_id: string;
  auto_match_user: boolean;
  manual_select_user: boolean;
}

const initialStateFormData: StateFormData = {
  name: '',
  code: '',
  description: '',
  state_type: 'normal',
  color: '#6366f1',
  sla_hours: undefined,
  viewable_role_ids: [],
};

const initialTransitionFormData: TransitionFormData = {
  name: '',
  code: '',
  description: '',
  from_state_id: '',
  to_state_id: '',
  role_ids: [],
  // Department Assignment
  assign_department_id: '',
  auto_detect_department: false,
  // User Assignment
  assign_user_id: '',
  assignment_role_id: '',
  auto_match_user: false,
  manual_select_user: false,
};

const STATE_COLORS = [
  { name: 'Purple', value: '#6366f1' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Green', value: '#10b981' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: '#6b7280' },
];

export const WorkflowDesignerPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('visual');
  const [isStateModalOpen, setIsStateModalOpen] = useState(false);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingState, setEditingState] = useState<WorkflowState | null>(null);
  const [editingTransition, setEditingTransition] = useState<WorkflowTransition | null>(null);
  const [configuringTransition, setConfiguringTransition] = useState<WorkflowTransition | null>(null);
  const [stateFormData, setStateFormData] = useState<StateFormData>(initialStateFormData);
  const [transitionFormData, setTransitionFormData] = useState<TransitionFormData>(initialTransitionFormData);
  const [deleteStateConfirm, setDeleteStateConfirm] = useState<string | null>(null);
  const [deleteTransitionConfirm, setDeleteTransitionConfirm] = useState<string | null>(null);

  // Requirements & Actions config
  const [requirements, setRequirements] = useState<TransitionRequirementRequest[]>([]);
  const [actions, setActions] = useState<TransitionActionRequest[]>([]);

  // Matching configuration
  const [matchingConfig, setMatchingConfig] = useState<{
    classification_ids: string[];
    location_ids: string[];
    sources: IncidentSource[];
    severity_min: number;
    severity_max: number;
    priority_min: number;
    priority_max: number;
    record_type: 'incident' | 'request' | 'complaint' | 'both' | 'all';
  }>({
    classification_ids: [],
    location_ids: [],
    sources: [],
    severity_min: 1,
    severity_max: 5,
    priority_min: 1,
    priority_max: 5,
    record_type: 'incident',
  });

  // Required fields configuration
  const [requiredFields, setRequiredFields] = useState<IncidentFormField[]>([]);

  // Convert to request role IDs
  const [convertToRequestRoleIds, setConvertToRequestRoleIds] = useState<string[]>([]);

  // Base form fields that can be made required
  const baseFormFields: { field: IncidentFormField; label: string; description: string }[] = [
    { field: 'description', label: 'Description', description: 'Detailed incident description' },
    { field: 'classification_id', label: 'Classification', description: 'Incident category/type' },
    { field: 'source', label: 'Source', description: 'Where the incident originated' },
    { field: 'source_incident_id', label: 'Source Incident Reference', description: 'Link to related incident/complaint/query' },
    { field: 'assignee_id', label: 'Assignee', description: 'User assigned to handle' },
    { field: 'department_id', label: 'Department', description: 'Responsible department' },
    { field: 'location_id', label: 'Location', description: 'Physical location' },
    { field: 'geolocation', label: 'Geolocation', description: 'GPS coordinates (latitude & longitude)' },
    { field: 'due_date', label: 'Due Date', description: 'Resolution deadline' },
    { field: 'reporter_name', label: 'Reporter Name', description: 'Name of person reporting' },
    { field: 'reporter_email', label: 'Reporter Email', description: 'Email of person reporting' },
    { field: 'attachments', label: 'Attachments', description: 'File attachments for the incident' },
  ];

  const { data: workflowData, isLoading } = useQuery({
    queryKey: ['admin', 'workflow', id],
    queryFn: () => workflowApi.getById(id!),
    enabled: !!id,
  });

  const { data: statesData } = useQuery({
    queryKey: ['admin', 'workflow', id, 'states'],
    queryFn: () => workflowApi.listStates(id!),
    enabled: !!id,
  });

  const { data: transitionsData } = useQuery({
    queryKey: ['admin', 'workflow', id, 'transitions'],
    queryFn: () => workflowApi.listTransitions(id!),
    enabled: !!id,
  });

  const { data: rolesData } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => roleApi.list(),
  });

  const { data: classificationsData } = useQuery({
    queryKey: ['admin', 'classifications'],
    queryFn: () => classificationApi.list(),
  });

  const { data: locationsData } = useQuery({
    queryKey: ['admin', 'locations'],
    queryFn: () => locationApi.list(),
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['admin', 'departments'],
    queryFn: () => departmentApi.list(),
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => userApi.list(1, 1000), // Get all users
  });

  const { data: lookupCategoriesData } = useQuery({
    queryKey: ['admin', 'lookups', 'categories'],
    queryFn: () => lookupApi.listCategories(),
  });

  const workflow = workflowData?.data;
  const classifications: Classification[] = classificationsData?.data || [];
  const locations: Location[] = locationsData?.data || [];
  const departments: Department[] = departmentsData?.data || [];
  const users: User[] = usersData?.data || [];
  const states = statesData?.data || [];
  const transitions = transitionsData?.data || [];
  const roles = rolesData?.data || [];
  const lookupCategories: LookupCategory[] = (lookupCategoriesData?.data || []).filter(
    (cat) => cat.add_to_incident_form
  );

  // Get Priority and Severity categories for matching rules
  const allLookupCategories: LookupCategory[] = lookupCategoriesData?.data || [];
  const priorityCategory = allLookupCategories.find(c => c.code === 'PRIORITY');
  const severityCategory = allLookupCategories.find(c => c.code === 'SEVERITY');
  const priorityValues = (priorityCategory?.values || []).sort((a, b) => a.sort_order - b.sort_order);
  const severityValues = (severityCategory?.values || []).sort((a, b) => a.sort_order - b.sort_order);

  // Available form fields including dynamic lookup categories
  const availableFormFields = React.useMemo(() => {
    const lookupFields = lookupCategories.map((cat) => ({
      field: `lookup:${cat.code}` as IncidentFormField,
      label: cat.name,
      description: cat.description || `${cat.name} lookup value`,
    }));
    return [...baseFormFields, ...lookupFields];
  }, [lookupCategories]);

  // Initialize matching config and required fields from workflow data
  useEffect(() => {
    if (workflow) {
      setMatchingConfig({
        classification_ids: workflow.classifications?.map(c => c.id) || [],
        location_ids: workflow.locations?.map(l => l.id) || [],
        sources: workflow.sources || [],
        severity_min: workflow.severity_min ?? 1,
        severity_max: workflow.severity_max ?? 5,
        priority_min: workflow.priority_min ?? 1,
        priority_max: workflow.priority_max ?? 5,
        record_type: (workflow.record_type as 'incident' | 'request' | 'complaint' | 'both' | 'all') || 'incident',
      });
      setRequiredFields(workflow.required_fields || []);
      setConvertToRequestRoleIds(workflow.convert_to_request_roles?.map(r => r.id) || []);
    }
  }, [workflow]);

  // Matching config mutation
  const updateMatchingMutation = useMutation({
    mutationFn: (config: typeof matchingConfig) => workflowApi.update(id!, {
      classification_ids: config.classification_ids,
      location_ids: config.location_ids,
      sources: config.sources,
      severity_min: config.severity_min,
      severity_max: config.severity_max,
      priority_min: config.priority_min,
      priority_max: config.priority_max,
      record_type: config.record_type,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
    },
  });

  // Required fields mutation
  const updateRequiredFieldsMutation = useMutation({
    mutationFn: (fields: IncidentFormField[]) => workflowApi.update(id!, {
      required_fields: fields,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
    },
  });

  // Convert to request roles mutation
  const updateConvertToRequestRolesMutation = useMutation({
    mutationFn: (roleIds: string[]) => workflowApi.update(id!, {
      convert_to_request_role_ids: roleIds,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
    },
  });

  // Canvas layout mutation
  const updateMutation = useMutation({
    mutationFn: ({ id: workflowId, data }: { id: string; data: WorkflowUpdateRequest }) =>
      workflowApi.update(workflowId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
    },
  });

  // State mutations
  const createStateMutation = useMutation({
    mutationFn: (data: WorkflowStateCreateRequest) => workflowApi.createState(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflow', id, 'states'] });
      closeStateModal();
    },
  });

  const updateStateMutation = useMutation({
    mutationFn: ({ workflowId, stateId, data }: { workflowId?: string; stateId: string; data: WorkflowStateUpdateRequest }) =>
      workflowApi.updateState(workflowId || id!, stateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflow', id, 'states'] });
      closeStateModal();
    },
  });

  const deleteStateMutation = useMutation({
    mutationFn: (stateId: string) => workflowApi.deleteState(id!, stateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflow', id, 'states'] });
      setDeleteStateConfirm(null);
    },
  });

  // Transition mutations
  const createTransitionMutation = useMutation({
    mutationFn: (data: WorkflowTransitionCreateRequest) => workflowApi.createTransition(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflow', id, 'transitions'] });
      closeTransitionModal();
    },
  });

  const updateTransitionMutation = useMutation({
    mutationFn: ({ transitionId, data }: { transitionId: string; data: WorkflowTransitionUpdateRequest }) =>
      workflowApi.updateTransition(id!, transitionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflow', id, 'transitions'] });
      closeTransitionModal();
    },
  });

  const deleteTransitionMutation = useMutation({
    mutationFn: (transitionId: string) => workflowApi.deleteTransition(id!, transitionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflow', id, 'transitions'] });
      setDeleteTransitionConfirm(null);
    },
  });

  // Config mutations
  const setRequirementsMutation = useMutation({
    mutationFn: ({ transitionId, reqs }: { transitionId: string; reqs: TransitionRequirementRequest[] }) =>
      workflowApi.setTransitionRequirements(transitionId, reqs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflow', id, 'transitions'] });
    },
  });

  const setActionsMutation = useMutation({
    mutationFn: ({ transitionId, acts }: { transitionId: string; acts: TransitionActionRequest[] }) =>
      workflowApi.setTransitionActions(transitionId, acts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflow', id, 'transitions'] });
    },
  });

  // State modal handlers
  const openCreateStateModal = () => {
    setEditingState(null);
    setStateFormData(initialStateFormData);
    setIsStateModalOpen(true);
  };

  const openEditStateModal = (state: WorkflowState) => {
    setEditingState(state);
    setStateFormData({
      name: state.name,
      code: state.code,
      description: state.description,
      state_type: state.state_type as 'initial' | 'normal' | 'terminal',
      color: state.color,
      sla_hours: state.sla_hours || undefined,
      viewable_role_ids: state.viewable_roles?.map((r) => r.id) || [],
    });
    setIsStateModalOpen(true);
  };

  const closeStateModal = () => {
    setIsStateModalOpen(false);
    setEditingState(null);
    setStateFormData(initialStateFormData);
  };

  // Transition modal handlers
  const openCreateTransitionModal = () => {
    setEditingTransition(null);
    setTransitionFormData(initialTransitionFormData);
    setIsTransitionModalOpen(true);
  };

  const openEditTransitionModal = (transition: WorkflowTransition) => {
    setEditingTransition(transition);
    setTransitionFormData({
      name: transition.name,
      code: transition.code,
      description: transition.description,
      from_state_id: transition.from_state_id,
      to_state_id: transition.to_state_id,
      role_ids: transition.allowed_roles?.map((r) => r.id) || [],
      // Department Assignment
      assign_department_id: transition.assign_department_id || '',
      auto_detect_department: transition.auto_detect_department || false,
      // User Assignment
      assign_user_id: transition.assign_user_id || '',
      assignment_role_id: transition.assignment_role_id || '',
      auto_match_user: transition.auto_match_user || false,
      manual_select_user: transition.manual_select_user || false,
    });
    setIsTransitionModalOpen(true);
  };

  const closeTransitionModal = () => {
    setIsTransitionModalOpen(false);
    setEditingTransition(null);
    setTransitionFormData(initialTransitionFormData);
  };

  // Config modal handlers
  const openConfigModal = (transition: WorkflowTransition) => {
    setConfiguringTransition(transition);
    setRequirements(
      transition.requirements?.map((r) => ({
        requirement_type: r.requirement_type,
        field_name: r.field_name,
        field_value: r.field_value,
        is_mandatory: r.is_mandatory,
        error_message: r.error_message,
      })) || []
    );
    setActions(
      transition.actions?.map((a) => ({
        action_type: a.action_type,
        name: a.name,
        description: a.description,
        config: a.config,
        execution_order: a.execution_order,
        is_async: a.is_async,
        is_active: a.is_active,
      })) || []
    );
    setIsConfigModalOpen(true);
  };

  const closeConfigModal = () => {
    setIsConfigModalOpen(false);
    setConfiguringTransition(null);
    setRequirements([]);
    setActions([]);
  };

  const handleStateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: stateFormData.name,
      code: stateFormData.code,
      description: stateFormData.description,
      state_type: stateFormData.state_type,
      color: stateFormData.color,
      sla_hours: stateFormData.sla_hours,
      viewable_role_ids: stateFormData.viewable_role_ids,
    };

    if (editingState) {
      updateStateMutation.mutate({ stateId: editingState.id, data });
    } else {
      createStateMutation.mutate(data);
    }
  };

  const handleTransitionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: transitionFormData.name,
      code: transitionFormData.code,
      description: transitionFormData.description,
      from_state_id: transitionFormData.from_state_id,
      to_state_id: transitionFormData.to_state_id,
      role_ids: transitionFormData.role_ids,
      // Department Assignment
      assign_department_id: transitionFormData.assign_department_id || undefined,
      auto_detect_department: transitionFormData.auto_detect_department,
      // User Assignment
      assign_user_id: transitionFormData.assign_user_id || undefined,
      assignment_role_id: transitionFormData.assignment_role_id || undefined,
      auto_match_user: transitionFormData.auto_match_user,
      manual_select_user: transitionFormData.manual_select_user,
    };

    if (editingTransition) {
      updateTransitionMutation.mutate({ transitionId: editingTransition.id, data });
    } else {
      createTransitionMutation.mutate(data);
    }
  };

  const handleSaveConfig = async () => {
    if (!configuringTransition) return;

    await setRequirementsMutation.mutateAsync({
      transitionId: configuringTransition.id,
      reqs: requirements,
    });
    await setActionsMutation.mutateAsync({
      transitionId: configuringTransition.id,
      acts: actions,
    });
    closeConfigModal();
  };

  const addRequirement = () => {
    setRequirements([
      ...requirements,
      { requirement_type: 'comment', is_mandatory: true },
    ]);
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const updateRequirement = (index: number, field: string, value: any) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], [field]: value };
    setRequirements(updated);
  };

  const addAction = () => {
    setActions([
      ...actions,
      {
        action_type: 'notification',
        name: '',
        is_async: false,
        is_active: true,
        execution_order: actions.length + 1,
      },
    ]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, field: string, value: any) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    setActions(updated);
  };

  const toggleRole = (roleId: string) => {
    setTransitionFormData((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter((id) => id !== roleId)
        : [...prev.role_ids, roleId],
    }));
  };

  const toggleStateRole = (roleId: string) => {
    setStateFormData((prev) => ({
      ...prev,
      viewable_role_ids: prev.viewable_role_ids.includes(roleId)
        ? prev.viewable_role_ids.filter((id) => id !== roleId)
        : [...prev.viewable_role_ids, roleId],
    }));
  };

  const getStateName = (stateId: string) => {
    const state = states.find((s) => s.id === stateId);
    return state?.name || 'Unknown';
  };

  const getStateColor = (stateId: string) => {
    const state = states.find((s) => s.id === stateId);
    return state?.color || '#6b7280';
  };

  const getStateTypeIcon = (stateType: string) => {
    switch (stateType) {
      case 'initial':
        return <Circle className="w-4 h-4 fill-emerald-500 text-emerald-500" />;
      case 'terminal':
        return <Circle className="w-4 h-4 fill-rose-500 text-rose-500" />;
      default:
        return <Circle className="w-4 h-4 fill-blue-500 text-blue-500" />;
    }
  };

  // Canvas handlers
  const handleCanvasTransitionAdd = useCallback((fromStateId: string, toStateId: string) => {
    setTransitionFormData({
      ...initialTransitionFormData,
      from_state_id: fromStateId,
      to_state_id: toStateId,
    });
    setIsTransitionModalOpen(true);
  }, []);

  const handleCanvasStateDelete = useCallback((stateId: string) => {
    setDeleteStateConfirm(stateId);
  }, []);

  const handleCanvasTransitionDelete = useCallback((transitionId: string) => {
    setDeleteTransitionConfirm(transitionId);
  }, []);

  const handleCanvasLayoutSave = useCallback(
    async (layout: string) => {
      if (!workflow) return;

      try {
        await updateMutation.mutateAsync({
          id: workflow.id,
          data: { canvas_layout: layout },
        });
      } catch (error) {
        console.error('Failed to save layout:', error);
      }
    },
    [workflow, updateMutation]
  );

  const handleExport = async () => {
    if (!workflow) return;

    try {
      const blob = await workflowApi.export(workflow.id);
      const filename = `workflow_${workflow.code}_${Date.now()}.json`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 text-center">
        <AlertTriangle className="w-12 h-12 text-[hsl(var(--destructive))] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{t('errors.notFound')}</h3>
        <p className="text-[hsl(var(--muted-foreground))] mb-6">{t('workflows.noWorkflowsDesc')}</p>
        <Button onClick={() => navigate('/workflows')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          {t('workflows.allWorkflows')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate('/workflows')}
              className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            </button>
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <GitBranch className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">{workflow.name}</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] font-mono">{workflow.code}</p>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Export Workflow
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden">
        <div className="flex border-b border-[hsl(var(--border))]">
          <button
            onClick={() => setActiveTab('visual')}
            className={cn(
              "flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
              activeTab === 'visual'
                ? "text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]"
            )}
          >
            <Layout className="w-4 h-4" />
            {t('workflows.visualDesigner')}
          </button>
          <button
            onClick={() => setActiveTab('states')}
            className={cn(
              "flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
              activeTab === 'states'
                ? "text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]"
            )}
          >
            <Circle className="w-4 h-4" />
            {t('workflows.statesTab')} ({states.length})
          </button>
          <button
            onClick={() => setActiveTab('transitions')}
            className={cn(
              "flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
              activeTab === 'transitions'
                ? "text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]"
            )}
          >
            <ArrowRight className="w-4 h-4" />
            {t('workflows.transitionsTab')} ({transitions.length})
          </button>
          <button
            onClick={() => setActiveTab('matching')}
            className={cn(
              "flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
              activeTab === 'matching'
                ? "text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]"
            )}
          >
            <Settings className="w-4 h-4" />
            {t('workflows.matchingRules')}
          </button>
          <button
            onClick={() => setActiveTab('fields')}
            className={cn(
              "flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
              activeTab === 'fields'
                ? "text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]"
            )}
          >
            <ClipboardList className="w-4 h-4" />
            {t('workflows.requiredFields')}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Visual Designer Tab */}
          {activeTab === 'visual' && (
            <WorkflowCanvas
              workflowId={id!}
              states={states}
              transitions={transitions}
              canvasLayout={workflow.canvas_layout}
              onStateAdd={openCreateStateModal}
              onStateEdit={openEditStateModal}
              onStateDelete={handleCanvasStateDelete}
              onTransitionAdd={handleCanvasTransitionAdd}
              onTransitionEdit={openEditTransitionModal}
              onTransitionDelete={handleCanvasTransitionDelete}
              onTransitionConfigure={openConfigModal}
              onLayoutSave={handleCanvasLayoutSave}
            />
          )}

          {activeTab === 'states' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={openCreateStateModal} leftIcon={<Plus className="w-4 h-4" />}>
                  {t('workflows.addState')}
                </Button>
              </div>

              {states.length === 0 ? (
                <div className="text-center py-12">
                  <Circle className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{t('workflows.noStates')}</h3>
                  <p className="text-[hsl(var(--muted-foreground))] mb-4">{t('workflows.noStatesDesc')}</p>
                  <Button onClick={openCreateStateModal} leftIcon={<Plus className="w-4 h-4" />}>
                    {t('workflows.addState')}
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[hsl(var(--border))]">
                        <th className="text-left py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">State</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">Code</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">SLA Hours</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">Viewable Roles</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {states.map((state) => (
                        <tr key={state.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: state.color }}
                              />
                              <span className="font-medium text-[hsl(var(--foreground))]">{state.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-mono text-[hsl(var(--muted-foreground))]">{state.code}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {getStateTypeIcon(state.state_type)}
                              <span className="text-sm text-[hsl(var(--foreground))] capitalize">{state.state_type}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-[hsl(var(--muted-foreground))]">
                              {state.sla_hours ? `${state.sla_hours}h` : '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {!state.viewable_roles || state.viewable_roles.length === 0 ? (
                                <span className="text-xs text-[hsl(var(--muted-foreground))]">All roles</span>
                              ) : (
                                <>
                                  {state.viewable_roles.slice(0, 2).map((role) => (
                                    <span
                                      key={role.id}
                                      className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded"
                                    >
                                      {role.name}
                                    </span>
                                  ))}
                                  {state.viewable_roles.length > 2 && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded">
                                      +{state.viewable_roles.length - 2}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditStateModal(state)}
                                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteStateConfirm(state.id)}
                                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'transitions' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={openCreateTransitionModal}
                  leftIcon={<Plus className="w-4 h-4" />}
                  disabled={states.length < 2}
                >
                  {t('workflows.addTransition')}
                </Button>
              </div>

              {states.length < 2 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-600">
                  {t('workflows.noStatesDesc')}
                </div>
              )}

              {transitions.length === 0 ? (
                <div className="text-center py-12">
                  <ArrowRight className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{t('workflows.noTransitions')}</h3>
                  <p className="text-[hsl(var(--muted-foreground))] mb-4">{t('workflows.noTransitionsDesc')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[hsl(var(--border))]">
                        <th className="text-left py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">Transition</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">From → To</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">Roles</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">Config</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transitions.map((transition) => (
                        <tr key={transition.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]">
                          <td className="py-3 px-4">
                            <div>
                              <span className="font-medium text-[hsl(var(--foreground))]">{transition.name}</span>
                              <p className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{transition.code}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="px-2 py-1 text-xs font-medium rounded-lg text-white"
                                style={{ backgroundColor: getStateColor(transition.from_state_id) }}
                              >
                                {getStateName(transition.from_state_id)}
                              </span>
                              <ArrowRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                              <span
                                className="px-2 py-1 text-xs font-medium rounded-lg text-white"
                                style={{ backgroundColor: getStateColor(transition.to_state_id) }}
                              >
                                {getStateName(transition.to_state_id)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {transition.allowed_roles?.length === 0 && (
                                <span className="text-xs text-[hsl(var(--muted-foreground))]">All roles</span>
                              )}
                              {transition.allowed_roles?.slice(0, 2).map((role) => (
                                <span
                                  key={role.id}
                                  className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded"
                                >
                                  {role.name}
                                </span>
                              ))}
                              {(transition.allowed_roles?.length || 0) > 2 && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded">
                                  +{transition.allowed_roles!.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {(transition.requirements?.length || 0) > 0 && (
                                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-600 rounded">
                                  <FileText className="w-3 h-3" />
                                  {transition.requirements?.length}
                                </span>
                              )}
                              {(transition.actions?.length || 0) > 0 && (
                                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-600 rounded">
                                  <Zap className="w-3 h-3" />
                                  {transition.actions?.length}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openConfigModal(transition)}
                                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                title="Configure Requirements & Actions"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openEditTransitionModal(transition)}
                                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTransitionConfirm(transition.id)}
                                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Matching Rules Tab */}
          {activeTab === 'matching' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-1">Auto-Workflow Matching</h3>
                <p className="text-xs text-blue-700">
                  Configure which incidents should automatically use this workflow based on classification, location, source, and severity.
                </p>
              </div>

              {/* Record Type Selection */}
              <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-5">
                <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Record Type</h4>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                  Specify which record types this workflow applies to.
                </p>
                <div className="flex gap-3">
                  <label className={cn(
                    "flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    matchingConfig.record_type === 'incident'
                      ? "border-blue-500 bg-blue-50"
                      : "border-[hsl(var(--border))] hover:border-blue-300"
                  )}>
                    <input
                      type="radio"
                      name="record_type"
                      value="incident"
                      checked={matchingConfig.record_type === 'incident'}
                      onChange={(e) => setMatchingConfig(prev => ({ ...prev, record_type: e.target.value as 'incident' | 'request' | 'complaint' | 'both' | 'all' }))}
                      className="sr-only"
                    />
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      matchingConfig.record_type === 'incident'
                        ? "border-blue-500 bg-blue-500"
                        : "border-[hsl(var(--muted-foreground))]"
                    )}>
                      {matchingConfig.record_type === 'incident' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">Incident Only</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">For incident management</p>
                    </div>
                  </label>
                  <label className={cn(
                    "flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    matchingConfig.record_type === 'request'
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-[hsl(var(--border))] hover:border-emerald-300"
                  )}>
                    <input
                      type="radio"
                      name="record_type"
                      value="request"
                      checked={matchingConfig.record_type === 'request'}
                      onChange={(e) => setMatchingConfig(prev => ({ ...prev, record_type: e.target.value as 'incident' | 'request' | 'complaint' | 'both' | 'all' }))}
                      className="sr-only"
                    />
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      matchingConfig.record_type === 'request'
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-[hsl(var(--muted-foreground))]"
                    )}>
                      {matchingConfig.record_type === 'request' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">Request Only</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">For service requests</p>
                    </div>
                  </label>
                  <label className={cn(
                    "flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    matchingConfig.record_type === 'both'
                      ? "border-purple-500 bg-purple-50"
                      : "border-[hsl(var(--border))] hover:border-purple-300"
                  )}>
                    <input
                      type="radio"
                      name="record_type"
                      value="both"
                      checked={matchingConfig.record_type === 'both'}
                      onChange={(e) => setMatchingConfig(prev => ({ ...prev, record_type: e.target.value as 'incident' | 'request' | 'complaint' | 'both' | 'all' }))}
                      className="sr-only"
                    />
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      matchingConfig.record_type === 'both'
                        ? "border-purple-500 bg-purple-500"
                        : "border-[hsl(var(--muted-foreground))]"
                    )}>
                      {matchingConfig.record_type === 'both' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">Both</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Incidents and requests</p>
                    </div>
                  </label>
                  <label className={cn(
                    "flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    matchingConfig.record_type === 'complaint'
                      ? "border-amber-500 bg-amber-50"
                      : "border-[hsl(var(--border))] hover:border-amber-300"
                  )}>
                    <input
                      type="radio"
                      name="record_type"
                      value="complaint"
                      checked={matchingConfig.record_type === 'complaint'}
                      onChange={(e) => setMatchingConfig(prev => ({ ...prev, record_type: e.target.value as 'incident' | 'request' | 'complaint' | 'both' | 'all' }))}
                      className="sr-only"
                    />
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      matchingConfig.record_type === 'complaint'
                        ? "border-amber-500 bg-amber-500"
                        : "border-[hsl(var(--muted-foreground))]"
                    )}>
                      {matchingConfig.record_type === 'complaint' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">Complaint Only</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">For citizen complaints</p>
                    </div>
                  </label>
                  <label className={cn(
                    "flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    matchingConfig.record_type === 'all'
                      ? "border-gray-500 bg-gray-50"
                      : "border-[hsl(var(--border))] hover:border-gray-300"
                  )}>
                    <input
                      type="radio"
                      name="record_type"
                      value="all"
                      checked={matchingConfig.record_type === 'all'}
                      onChange={(e) => setMatchingConfig(prev => ({ ...prev, record_type: e.target.value as 'incident' | 'request' | 'complaint' | 'both' | 'all' }))}
                      className="sr-only"
                    />
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      matchingConfig.record_type === 'all'
                        ? "border-gray-500 bg-gray-500"
                        : "border-[hsl(var(--muted-foreground))]"
                    )}>
                      {matchingConfig.record_type === 'all' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">All Types</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">All record types</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Classifications */}
                <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4">
                  <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">Classifications</h4>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                    Select which classifications this workflow applies to.
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {classifications.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-[hsl(var(--muted)/0.5)] rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={matchingConfig.classification_ids.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMatchingConfig(prev => ({
                                ...prev,
                                classification_ids: [...prev.classification_ids, c.id],
                              }));
                            } else {
                              setMatchingConfig(prev => ({
                                ...prev,
                                classification_ids: prev.classification_ids.filter(id => id !== c.id),
                              }));
                            }
                          }}
                          className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                        />
                        <span className="text-sm text-[hsl(var(--foreground))]">{c.name}</span>
                      </label>
                    ))}
                    {classifications.length === 0 && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] py-2">No classifications available</p>
                    )}
                  </div>
                </div>

                {/* Locations */}
                <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4">
                  <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">Locations</h4>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                    Select which locations this workflow applies to.
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {locations.map((l) => (
                      <label key={l.id} className="flex items-center gap-2 p-2 hover:bg-[hsl(var(--muted)/0.5)] rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={matchingConfig.location_ids.includes(l.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMatchingConfig(prev => ({
                                ...prev,
                                location_ids: [...prev.location_ids, l.id],
                              }));
                            } else {
                              setMatchingConfig(prev => ({
                                ...prev,
                                location_ids: prev.location_ids.filter(id => id !== l.id),
                              }));
                            }
                          }}
                          className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                        />
                        <span className="text-sm text-[hsl(var(--foreground))]">{l.name}</span>
                      </label>
                    ))}
                    {locations.length === 0 && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] py-2">No locations available</p>
                    )}
                  </div>
                </div>

                {/* Sources */}
                <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4">
                  <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">Sources</h4>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                    Select which incident sources this workflow applies to.
                  </p>
                  <div className="space-y-2">
                    {INCIDENT_SOURCES.map((source) => (
                      <label key={source.value} className="flex items-center gap-2 p-2 hover:bg-[hsl(var(--muted)/0.5)] rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={matchingConfig.sources.includes(source.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMatchingConfig(prev => ({
                                ...prev,
                                sources: [...prev.sources, source.value],
                              }));
                            } else {
                              setMatchingConfig(prev => ({
                                ...prev,
                                sources: prev.sources.filter(s => s !== source.value),
                              }));
                            }
                          }}
                          className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                        />
                        <span className="text-sm text-[hsl(var(--foreground))]">{source.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Severity & Priority Ranges */}
                <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4">
                  <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">Severity & Priority Range</h4>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                    Define the severity and priority range this workflow applies to.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Severity Range</label>
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          value={matchingConfig.severity_min}
                          onChange={(e) => setMatchingConfig(prev => ({ ...prev, severity_min: parseInt(e.target.value) || 1 }))}
                          className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                        >
                          {severityValues.map(v => (
                            <option key={v.id} value={v.sort_order}>{v.name}</option>
                          ))}
                          {severityValues.length === 0 && (
                            <>
                              <option value={1}>1 - Critical</option>
                              <option value={2}>2 - Major</option>
                              <option value={3}>3 - Moderate</option>
                              <option value={4}>4 - Minor</option>
                              <option value={5}>5 - Cosmetic</option>
                            </>
                          )}
                        </select>
                        <span className="text-[hsl(var(--muted-foreground))]">to</span>
                        <select
                          value={matchingConfig.severity_max}
                          onChange={(e) => setMatchingConfig(prev => ({ ...prev, severity_max: parseInt(e.target.value) || 5 }))}
                          className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                        >
                          {severityValues.map(v => (
                            <option key={v.id} value={v.sort_order}>{v.name}</option>
                          ))}
                          {severityValues.length === 0 && (
                            <>
                              <option value={1}>1 - Critical</option>
                              <option value={2}>2 - Major</option>
                              <option value={3}>3 - Moderate</option>
                              <option value={4}>4 - Minor</option>
                              <option value={5}>5 - Cosmetic</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Priority Range</label>
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          value={matchingConfig.priority_min}
                          onChange={(e) => setMatchingConfig(prev => ({ ...prev, priority_min: parseInt(e.target.value) || 1 }))}
                          className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                        >
                          {priorityValues.map(v => (
                            <option key={v.id} value={v.sort_order}>{v.name}</option>
                          ))}
                          {priorityValues.length === 0 && (
                            <>
                              <option value={1}>1 - Critical</option>
                              <option value={2}>2 - High</option>
                              <option value={3}>3 - Medium</option>
                              <option value={4}>4 - Low</option>
                              <option value={5}>5 - Very Low</option>
                            </>
                          )}
                        </select>
                        <span className="text-[hsl(var(--muted-foreground))]">to</span>
                        <select
                          value={matchingConfig.priority_max}
                          onChange={(e) => setMatchingConfig(prev => ({ ...prev, priority_max: parseInt(e.target.value) || 5 }))}
                          className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                        >
                          {priorityValues.map(v => (
                            <option key={v.id} value={v.sort_order}>{v.name}</option>
                          ))}
                          {priorityValues.length === 0 && (
                            <>
                              <option value={1}>1 - Critical</option>
                              <option value={2}>2 - High</option>
                              <option value={3}>3 - Medium</option>
                              <option value={4}>4 - Low</option>
                              <option value={5}>5 - Very Low</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => updateMatchingMutation.mutate(matchingConfig)}
                  isLoading={updateMatchingMutation.isPending}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Save Matching Rules
                </Button>
              </div>
            </div>
          )}

          {/* Form Fields Tab */}
          {activeTab === 'fields' && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-amber-800 mb-1">Required Form Fields</h3>
                <p className="text-xs text-amber-700">
                  Configure which fields are mandatory when creating incidents using this workflow. Title and Workflow are always required.
                </p>
              </div>

              <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6">
                <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Select Required Fields</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableFormFields.map((item) => (
                    <label
                      key={item.field}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border",
                        requiredFields.includes(item.field)
                          ? "bg-[hsl(var(--primary)/0.1)] border-[hsl(var(--primary))]"
                          : "bg-[hsl(var(--background))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={requiredFields.includes(item.field)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setRequiredFields(prev => [...prev, item.field]);
                          } else {
                            setRequiredFields(prev => prev.filter(f => f !== item.field));
                          }
                        }}
                        className="mt-0.5 w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                      />
                      <div>
                        <span className="text-sm font-medium text-[hsl(var(--foreground))]">{item.label}</span>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{item.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-[hsl(var(--muted)/0.5)] rounded-xl p-4">
                <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">Required Fields Summary</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-xs font-medium rounded">
                    Title (always)
                  </span>
                  <span className="px-2 py-1 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-xs font-medium rounded">
                    Workflow (always)
                  </span>
                  {requiredFields.map(field => {
                    const fieldConfig = availableFormFields.find(f => f.field === field);
                    return (
                      <span
                        key={field}
                        className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded"
                      >
                        {fieldConfig?.label || field}
                      </span>
                    );
                  })}
                  {requiredFields.length === 0 && (
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">No additional required fields</span>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => updateRequiredFieldsMutation.mutate(requiredFields)}
                  isLoading={updateRequiredFieldsMutation.isPending}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Save Required Fields
                </Button>
              </div>

              {/* Convert to Request Permissions Section */}
              <div className="mt-8 pt-8 border-t border-[hsl(var(--border))]">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Convert to Request Permissions</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    Configure which roles can convert incidents to requests. If no roles are selected, all users will be able to convert.
                  </p>
                </div>

                <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6">
                  <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Allowed Roles</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border",
                          convertToRequestRoleIds.includes(role.id)
                            ? "bg-[hsl(var(--primary)/0.1)] border-[hsl(var(--primary))]"
                            : "bg-[hsl(var(--background))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={convertToRequestRoleIds.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConvertToRequestRoleIds(prev => [...prev, role.id]);
                            } else {
                              setConvertToRequestRoleIds(prev => prev.filter(id => id !== role.id));
                            }
                          }}
                          className="mt-0.5 w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                        />
                        <div>
                          <span className="text-sm font-medium text-[hsl(var(--foreground))]">{role.name}</span>
                          {role.description && (
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{role.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-[hsl(var(--muted)/0.5)] rounded-xl p-4 mt-4">
                  <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">Selected Roles</h4>
                  <div className="flex flex-wrap gap-2">
                    {convertToRequestRoleIds.length === 0 ? (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">No roles selected - All users can convert incidents</span>
                    ) : (
                      convertToRequestRoleIds.map(roleId => {
                        const role = roles.find(r => r.id === roleId);
                        return (
                          <span
                            key={roleId}
                            className="px-2 py-1 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-xs font-medium rounded"
                          >
                            {role?.name || roleId}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={() => updateConvertToRequestRolesMutation.mutate(convertToRequestRoleIds)}
                    isLoading={updateConvertToRequestRolesMutation.isPending}
                    leftIcon={<Check className="w-4 h-4" />}
                  >
                    Save Convert to Request Permissions
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* State Modal */}
      {isStateModalOpen && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center">
                  <Circle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {editingState ? 'Edit State' : 'Add State'}
                  </h3>
                </div>
              </div>
              <button
                onClick={closeStateModal}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStateSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Name</label>
                  <input
                    type="text"
                    value={stateFormData.name}
                    onChange={(e) => setStateFormData({ ...stateFormData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Code</label>
                  <input
                    type="text"
                    value={stateFormData.code}
                    onChange={(e) => setStateFormData({ ...stateFormData, code: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Description</label>
                  <textarea
                    value={stateFormData.description}
                    onChange={(e) => setStateFormData({ ...stateFormData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">State Type</label>
                  <select
                    value={stateFormData.state_type}
                    onChange={(e) => setStateFormData({ ...stateFormData, state_type: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                  >
                    <option value="initial">Initial (Starting state)</option>
                    <option value="normal">Normal</option>
                    <option value="terminal">Terminal (End state)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {STATE_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setStateFormData({ ...stateFormData, color: color.value })}
                        className={cn(
                          "w-8 h-8 rounded-lg transition-all",
                          stateFormData.color === color.value
                            ? "ring-2 ring-offset-2 ring-[hsl(var(--primary))]"
                            : "hover:scale-110"
                        )}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">SLA Hours (optional)</label>
                  <input
                    type="number"
                    value={stateFormData.sla_hours || ''}
                    onChange={(e) => setStateFormData({ ...stateFormData, sla_hours: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                    min="0"
                  />
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    Maximum time an incident should remain in this state
                  </p>
                </div>

                {/* Viewable Roles */}
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    Viewable Roles
                    <span className="text-xs font-normal text-[hsl(var(--muted-foreground))] ml-2">
                      (leave empty to show to all roles)
                    </span>
                  </label>
                  <div className="border border-[hsl(var(--border))] rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all",
                          stateFormData.viewable_role_ids.includes(role.id)
                            ? "bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.3)]"
                            : "hover:bg-[hsl(var(--muted)/0.5)]"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={stateFormData.viewable_role_ids.includes(role.id)}
                          onChange={() => toggleStateRole(role.id)}
                          className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                        />
                        <Shield className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        <span className="text-sm text-[hsl(var(--foreground))]">{role.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
                <Button variant="ghost" type="button" onClick={closeStateModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={createStateMutation.isPending || updateStateMutation.isPending}
                  leftIcon={!(createStateMutation.isPending || updateStateMutation.isPending) ? <Check className="w-4 h-4" /> : undefined}
                >
                  {editingState ? 'Update State' : 'Add State'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transition Modal */}
      {isTransitionModalOpen && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {editingTransition ? 'Edit Transition' : 'Add Transition'}
                  </h3>
                </div>
              </div>
              <button
                onClick={closeTransitionModal}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransitionSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Name</label>
                  <input
                    type="text"
                    value={transitionFormData.name}
                    onChange={(e) => setTransitionFormData({ ...transitionFormData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                    placeholder="e.g., Start Working"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Code</label>
                  <input
                    type="text"
                    value={transitionFormData.code}
                    onChange={(e) => setTransitionFormData({ ...transitionFormData, code: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                    placeholder="e.g., start_working"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Description</label>
                  <textarea
                    value={transitionFormData.description}
                    onChange={(e) => setTransitionFormData({ ...transitionFormData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">From State</label>
                    <select
                      value={transitionFormData.from_state_id}
                      onChange={(e) => setTransitionFormData({ ...transitionFormData, from_state_id: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                      required
                    >
                      <option value="">Select state...</option>
                      {states.map((state) => (
                        <option key={state.id} value={state.id}>{state.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">To State</label>
                    <select
                      value={transitionFormData.to_state_id}
                      onChange={(e) => setTransitionFormData({ ...transitionFormData, to_state_id: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                      required
                    >
                      <option value="">Select state...</option>
                      {states.map((state) => (
                        <option key={state.id} value={state.id}>{state.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Allowed Roles */}
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    Allowed Roles
                    <span className="text-xs font-normal text-[hsl(var(--muted-foreground))] ml-2">
                      (leave empty to allow all roles)
                    </span>
                  </label>
                  <div className="border border-[hsl(var(--border))] rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all",
                          transitionFormData.role_ids.includes(role.id)
                            ? "bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.3)]"
                            : "hover:bg-[hsl(var(--muted)/0.5)]"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={transitionFormData.role_ids.includes(role.id)}
                          onChange={() => toggleRole(role.id)}
                          className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                        />
                        <Shield className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        <span className="text-sm text-[hsl(var(--foreground))]">{role.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Department Assignment */}
                <div className="border-t border-[hsl(var(--border))] pt-5">
                  <label className="block text-sm font-semibold text-[hsl(var(--foreground))] mb-3">
                    Department Assignment
                  </label>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={transitionFormData.auto_detect_department}
                        onChange={(e) => {
                          setTransitionFormData({
                            ...transitionFormData,
                            auto_detect_department: e.target.checked,
                            assign_department_id: e.target.checked ? '' : transitionFormData.assign_department_id,
                          });
                        }}
                        className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                      />
                      <div>
                        <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                          Auto-detect based on classification & location
                        </span>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          If one match: auto-assign. If multiple: prompt user during transition
                        </p>
                      </div>
                    </label>

                    {!transitionFormData.auto_detect_department && (
                      <div>
                        <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                          Or select specific department:
                        </label>
                        <select
                          value={transitionFormData.assign_department_id}
                          onChange={(e) => setTransitionFormData({ ...transitionFormData, assign_department_id: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                        >
                          <option value="">No department assignment</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Assignment */}
                <div className="border-t border-[hsl(var(--border))] pt-5">
                  <label className="block text-sm font-semibold text-[hsl(var(--foreground))] mb-3">
                    User Assignment
                  </label>

                  <div className="space-y-3">
                    {/* Option 1: No assignment */}
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] cursor-pointer">
                      <input
                        type="radio"
                        name="user_assignment_mode"
                        checked={!transitionFormData.auto_match_user && !transitionFormData.manual_select_user && !transitionFormData.assign_user_id}
                        onChange={() => {
                          setTransitionFormData({
                            ...transitionFormData,
                            auto_match_user: false,
                            manual_select_user: false,
                            assign_user_id: '',
                            assignment_role_id: '',
                          });
                        }}
                        className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))]"
                      />
                      <div>
                        <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                          No user assignment
                        </span>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          Don't change the incident assignee
                        </p>
                      </div>
                    </label>

                    {/* Option 2: Auto-assign all matching users */}
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] cursor-pointer">
                      <input
                        type="radio"
                        name="user_assignment_mode"
                        checked={transitionFormData.auto_match_user && !transitionFormData.manual_select_user}
                        onChange={() => {
                          setTransitionFormData({
                            ...transitionFormData,
                            auto_match_user: true,
                            manual_select_user: false,
                            assign_user_id: '',
                          });
                        }}
                        className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))]"
                      />
                      <div>
                        <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                          Auto-assign all matching users
                        </span>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          Automatically assigns ALL users matching role + incident criteria
                        </p>
                      </div>
                    </label>

                    {/* Option 3: Manual selection */}
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] cursor-pointer">
                      <input
                        type="radio"
                        name="user_assignment_mode"
                        checked={transitionFormData.manual_select_user}
                        onChange={() => {
                          setTransitionFormData({
                            ...transitionFormData,
                            auto_match_user: false,
                            manual_select_user: true,
                            assign_user_id: '',
                          });
                        }}
                        className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))]"
                      />
                      <div>
                        <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                          Manual selection during transition
                        </span>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          Performer selects from matching users when executing transition
                        </p>
                      </div>
                    </label>

                    {/* Option 4: Assign specific user */}
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] cursor-pointer">
                      <input
                        type="radio"
                        name="user_assignment_mode"
                        checked={!transitionFormData.auto_match_user && !transitionFormData.manual_select_user && !!transitionFormData.assign_user_id}
                        onChange={() => {
                          setTransitionFormData({
                            ...transitionFormData,
                            auto_match_user: false,
                            manual_select_user: false,
                            assignment_role_id: '',
                          });
                        }}
                        className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))]"
                      />
                      <div>
                        <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                          Assign specific user
                        </span>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          Always assign to a specific user
                        </p>
                      </div>
                    </label>

                    {/* Role selector for auto-match or manual selection */}
                    {(transitionFormData.auto_match_user || transitionFormData.manual_select_user) && (
                      <div className="ml-7">
                        <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                          Role to match (required):
                        </label>
                        <select
                          value={transitionFormData.assignment_role_id}
                          onChange={(e) => setTransitionFormData({ ...transitionFormData, assignment_role_id: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                        >
                          <option value="">Select a role...</option>
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* User selector for specific user assignment */}
                    {!transitionFormData.auto_match_user && !transitionFormData.manual_select_user && (
                      <div className="ml-7">
                        <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                          Select user:
                        </label>
                        <select
                          value={transitionFormData.assign_user_id}
                          onChange={(e) => setTransitionFormData({ ...transitionFormData, assign_user_id: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                        >
                          <option value="">No user assignment</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.first_name} {user.last_name} ({user.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
                <Button variant="ghost" type="button" onClick={closeTransitionModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={createTransitionMutation.isPending || updateTransitionMutation.isPending}
                  leftIcon={!(createTransitionMutation.isPending || updateTransitionMutation.isPending) ? <Check className="w-4 h-4" /> : undefined}
                >
                  {editingTransition ? 'Update Transition' : 'Add Transition'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {isConfigModalOpen && configuringTransition && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    Configure Transition
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{configuringTransition.name}</p>
                </div>
              </div>
              <button
                onClick={closeConfigModal}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6 space-y-6">
                {/* Requirements Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <label className="text-sm font-medium text-[hsl(var(--foreground))]">Requirements</label>
                    </div>
                    <Button variant="ghost" size="sm" onClick={addRequirement} leftIcon={<Plus className="w-4 h-4" />}>
                      Add
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {requirements.length === 0 ? (
                      <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">No requirements configured</p>
                    ) : (
                      requirements.map((req, index) => (
                        <div key={index} className="p-4 bg-[hsl(var(--muted)/0.5)] rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <select
                              value={req.requirement_type}
                              onChange={(e) => updateRequirement(index, 'requirement_type', e.target.value)}
                              className="px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                            >
                              <option value="comment">Comment Required</option>
                              <option value="attachment">Attachment Required</option>
                              <option value="feedback">Feedback Required</option>
                              <option value="field_value">Field Value Required</option>
                            </select>
                            <button
                              onClick={() => removeRequirement(index)}
                              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={req.is_mandatory}
                                onChange={(e) => updateRequirement(index, 'is_mandatory', e.target.checked)}
                                className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                              />
                              <span className="text-sm text-[hsl(var(--foreground))]">Mandatory</span>
                            </label>
                          </div>
                          <input
                            type="text"
                            placeholder="Error message (optional)"
                            value={req.error_message || ''}
                            onChange={(e) => updateRequirement(index, 'error_message', e.target.value)}
                            className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Actions Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-emerald-500" />
                      <label className="text-sm font-medium text-[hsl(var(--foreground))]">Automation Actions</label>
                    </div>
                    <Button variant="ghost" size="sm" onClick={addAction} leftIcon={<Plus className="w-4 h-4" />}>
                      Add
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {actions.length === 0 ? (
                      <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">No actions configured</p>
                    ) : (
                      actions.map((action, index) => {
                        // Parse email config if action type is email
                        const getEmailConfig = (): TransitionEmailConfig => {
                          try {
                            return action.config ? JSON.parse(action.config) : {
                              enabled: true,
                              recipients: [],
                              custom_emails: [],
                              subject_template: '',
                              body_template: '',
                              include_incident_details: true,
                              include_transition_info: true,
                              include_comments: false,
                            };
                          } catch {
                            return {
                              enabled: true,
                              recipients: [],
                              custom_emails: [],
                              subject_template: '',
                              body_template: '',
                              include_incident_details: true,
                              include_transition_info: true,
                              include_comments: false,
                            };
                          }
                        };

                        const updateEmailConfig = (updates: Partial<TransitionEmailConfig>) => {
                          const current = getEmailConfig();
                          const updated = { ...current, ...updates };
                          updateAction(index, 'config', JSON.stringify(updated));
                        };

                        const toggleRecipient = (recipient: EmailRecipient) => {
                          const config = getEmailConfig();
                          const recipients = config.recipients || [];
                          if (recipients.includes(recipient)) {
                            updateEmailConfig({ recipients: recipients.filter(r => r !== recipient) });
                          } else {
                            updateEmailConfig({ recipients: [...recipients, recipient] });
                          }
                        };

                        const emailConfig = getEmailConfig();

                        return (
                        <div key={index} className="p-4 bg-[hsl(var(--muted)/0.5)] rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <select
                              value={action.action_type}
                              onChange={(e) => updateAction(index, 'action_type', e.target.value)}
                              className="px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                            >
                              <option value="notification">Send Notification</option>
                              <option value="email">Send Email</option>
                              <option value="webhook">Call Webhook</option>
                              <option value="field_update">Update Field</option>
                            </select>
                            <button
                              onClick={() => removeAction(index)}
                              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Action name"
                            value={action.name}
                            onChange={(e) => updateAction(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                          />

                          {/* Email-specific configuration */}
                          {action.action_type === 'email' ? (
                            <div className="space-y-4 pt-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                                <Mail className="w-4 h-4" />
                                Email Notification Settings
                              </div>

                              {/* Recipients */}
                              <div>
                                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2">
                                  Email Recipients
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                  {EMAIL_RECIPIENTS.map((recipient) => (
                                    <label
                                      key={recipient.value}
                                      className={cn(
                                        "flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all border",
                                        emailConfig.recipients?.includes(recipient.value)
                                          ? "bg-blue-50 border-blue-200"
                                          : "bg-[hsl(var(--background))] border-[hsl(var(--border))] hover:border-blue-200"
                                      )}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={emailConfig.recipients?.includes(recipient.value) || false}
                                        onChange={() => toggleRecipient(recipient.value)}
                                        className="w-4 h-4 mt-0.5 text-blue-600 border-[hsl(var(--border))] rounded"
                                      />
                                      <div>
                                        <span className="text-xs font-medium text-[hsl(var(--foreground))]">
                                          {recipient.label}
                                        </span>
                                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-tight">
                                          {recipient.description}
                                        </p>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              {/* Custom emails input (shown when 'custom' is selected) */}
                              {emailConfig.recipients?.includes('custom') && (
                                <div>
                                  <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                                    Custom Email Addresses
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="email1@example.com, email2@example.com"
                                    value={emailConfig.custom_emails?.join(', ') || ''}
                                    onChange={(e) => updateEmailConfig({
                                      custom_emails: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                    })}
                                    className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                                  />
                                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                                    Separate multiple emails with commas
                                  </p>
                                </div>
                              )}

                              {/* Subject template */}
                              <div>
                                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                                  Subject Template
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g., [{{incident_number}}] Status changed to {{new_state}}"
                                  value={emailConfig.subject_template || ''}
                                  onChange={(e) => updateEmailConfig({ subject_template: e.target.value })}
                                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                                />
                                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                                  Use {'{{incident_number}}'}, {'{{title}}'}, {'{{new_state}}'}, {'{{old_state}}'}
                                </p>
                              </div>

                              {/* Body template */}
                              <div>
                                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                                  Body Template (optional)
                                </label>
                                <textarea
                                  placeholder="Custom email body template..."
                                  value={emailConfig.body_template || ''}
                                  onChange={(e) => updateEmailConfig({ body_template: e.target.value })}
                                  rows={3}
                                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm resize-none"
                                />
                              </div>

                              {/* Include options */}
                              <div>
                                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2">
                                  Include in Email
                                </label>
                                <div className="flex flex-wrap gap-3">
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={emailConfig.include_incident_details ?? true}
                                      onChange={(e) => updateEmailConfig({ include_incident_details: e.target.checked })}
                                      className="w-4 h-4 text-blue-600 border-[hsl(var(--border))] rounded"
                                    />
                                    <span className="text-xs text-[hsl(var(--foreground))]">Incident Details</span>
                                  </label>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={emailConfig.include_transition_info ?? true}
                                      onChange={(e) => updateEmailConfig({ include_transition_info: e.target.checked })}
                                      className="w-4 h-4 text-blue-600 border-[hsl(var(--border))] rounded"
                                    />
                                    <span className="text-xs text-[hsl(var(--foreground))]">Transition Info</span>
                                  </label>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={emailConfig.include_comments ?? false}
                                      onChange={(e) => updateEmailConfig({ include_comments: e.target.checked })}
                                      className="w-4 h-4 text-blue-600 border-[hsl(var(--border))] rounded"
                                    />
                                    <span className="text-xs text-[hsl(var(--foreground))]">Comments</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Non-email actions get the generic config textarea */
                            <textarea
                              placeholder="Configuration (JSON)"
                              value={action.config || ''}
                              onChange={(e) => updateAction(index, 'config', e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm font-mono resize-none"
                            />
                          )}

                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={action.is_async}
                                onChange={(e) => updateAction(index, 'is_async', e.target.checked)}
                                className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                              />
                              <span className="text-sm text-[hsl(var(--foreground))]">Run Async</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={action.is_active}
                                onChange={(e) => updateAction(index, 'is_active', e.target.checked)}
                                className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                              />
                              <span className="text-sm text-[hsl(var(--foreground))]">Active</span>
                            </label>
                          </div>
                        </div>
                      );})
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
                <Button variant="ghost" type="button" onClick={closeConfigModal}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveConfig}
                  isLoading={setRequirementsMutation.isPending || setActionsMutation.isPending}
                  leftIcon={!(setRequirementsMutation.isPending || setActionsMutation.isPending) ? <Check className="w-4 h-4" /> : undefined}
                >
                  Save Configuration
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete State Confirmation */}
      {deleteStateConfirm && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-[hsl(var(--destructive)/0.1)] rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-[hsl(var(--destructive))]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Delete State</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    This will also delete all transitions connected to this state.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setDeleteStateConfirm(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteStateMutation.mutate(deleteStateConfirm)}
                  isLoading={deleteStateMutation.isPending}
                >
                  Delete State
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Transition Confirmation */}
      {deleteTransitionConfirm && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-[hsl(var(--destructive)/0.1)] rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-[hsl(var(--destructive))]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Delete Transition</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    Are you sure you want to delete this transition?
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setDeleteTransitionConfirm(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteTransitionMutation.mutate(deleteTransitionConfirm)}
                  isLoading={deleteTransitionMutation.isPending}
                >
                  Delete Transition
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
