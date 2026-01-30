import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Tags,
  Workflow,
  Building2,
  User,
  Search,
  HelpCircle,
  Radio,
  FileText,
} from 'lucide-react';
import { Button, TreeSelect } from '../ui';
import type { TreeSelectNode } from '../ui';
import {
  queryApi,
  classificationApi,
  workflowApi,
  departmentApi,
  userApi,
  incidentApi,
} from '../../api/admin';
import type {
  Classification,
  Department,
  User as UserType,
  Incident,
  CreateQueryRequest,
} from '../../types';
import { cn } from '@/lib/utils';

interface CreateQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (queryId: string) => void;
}

export const CreateQueryModal: React.FC<CreateQueryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [channel, setChannel] = useState('');
  const [classificationId, setClassificationId] = useState('');
  const [workflowId, setWorkflowId] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<UserType | null>(null);
  const [sourceIncident, setSourceIncident] = useState<Incident | null>(null);
  const [incidentSearch, setIncidentSearch] = useState('');
  const [showIncidentSearch, setShowIncidentSearch] = useState(false);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Query for query classifications
  const { data: classificationsData, isLoading: classificationsLoading } = useQuery({
    queryKey: ['classifications', 'query'],
    queryFn: async () => {
      // Get 'query' and 'all' types
      const [queryRes, allRes] = await Promise.all([
        classificationApi.getTreeByType('query'),
        classificationApi.getTreeByType('all'),
      ]);
      const combined = [...(queryRes.data || []), ...(allRes.data || [])];
      // Deduplicate by ID
      const unique = combined.filter((item, index, self) =>
        index === self.findIndex(t => t.id === item.id)
      );
      return { success: true, data: unique };
    },
    enabled: isOpen,
  });

  // Query for query workflows
  const { data: workflowsData, isLoading: workflowsLoading } = useQuery({
    queryKey: ['workflows', 'query'],
    queryFn: async () => {
      // Get 'query' and 'all' types
      const [queryRes, allRes] = await Promise.all([
        workflowApi.listByRecordType('query', true),
        workflowApi.listByRecordType('all', true),
      ]);
      const combined = [...(queryRes.data || []), ...(allRes.data || [])];
      // Deduplicate by ID
      const unique = combined.filter((item, index, self) =>
        index === self.findIndex(t => t.id === item.id)
      );
      return { success: true, data: unique };
    },
    enabled: isOpen,
  });

  // Query for departments
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.list(),
    enabled: isOpen,
  });

  // Query for users (potential assignees)
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.list(1, 100),
    enabled: isOpen,
  });

  // Query for incidents created by the current user (for source incident search)
  const { data: incidentsData, isLoading: incidentsLoading } = useQuery({
    queryKey: ['incidents', 'my-reported', 'search', incidentSearch],
    queryFn: async () => {
      // Get incidents and requests created by current user
      const [incidentsRes, requestsRes] = await Promise.all([
        incidentApi.getMyReported(1, 50, 'incident'),
        incidentApi.getMyReported(1, 50, 'request'),
      ]);
      const combined = [...(incidentsRes.data || []), ...(requestsRes.data || [])];
      // Filter by search term
      if (incidentSearch) {
        const searchLower = incidentSearch.toLowerCase();
        return {
          data: combined.filter(i =>
            i.incident_number.toLowerCase().includes(searchLower) ||
            i.title.toLowerCase().includes(searchLower)
          ).slice(0, 10),
        };
      }
      return { data: combined.slice(0, 10) };
    },
    enabled: isOpen && incidentSearch.length >= 2,
  });

  const classifications = classificationsData?.data || [];
  const workflows = workflowsData?.data || [];
  const departments = departmentsData?.data || [];
  const users = usersData?.data || [];
  const searchedIncidents = incidentsData?.data || [];

  // Convert classifications to TreeSelectNode format
  const classificationTreeData: TreeSelectNode[] = useMemo(() => {
    const convertToTreeNode = (items: Classification[]): TreeSelectNode[] => {
      return items.map(item => ({
        id: item.id,
        name: item.name,
        children: item.children && item.children.length > 0
          ? convertToTreeNode(item.children)
          : undefined,
      }));
    };
    return convertToTreeNode(classifications);
  }, [classifications]);

  // Filter workflows based on selected classification
  const filteredWorkflows = useMemo(() => {
    const queryWorkflows = workflows.filter(w => w.is_active);

    if (!classificationId) {
      return queryWorkflows;
    }

    const matching = queryWorkflows.filter(w => {
      const hasNoClassificationRestriction = !w.classifications || w.classifications.length === 0;

      if (hasNoClassificationRestriction) return true;

      return w.classifications?.some(c => c.id === classificationId);
    });

    // If no workflows match the classification, show all workflows as fallback
    if (matching.length === 0) return queryWorkflows;
    return matching;
  }, [workflows, classificationId]);

  // Auto-select workflow when only one option available
  useEffect(() => {
    if (filteredWorkflows.length === 1 && !workflowId) {
      setWorkflowId(filteredWorkflows[0].id);
    } else if (workflowId && !filteredWorkflows.find(w => w.id === workflowId)) {
      // Clear workflow if it's no longer in the filtered list
      setWorkflowId('');
    }
  }, [filteredWorkflows, workflowId]);

  // Create query mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateQueryRequest) => queryApi.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['queries'] });
      if (result.data?.id) {
        onSuccess(result.data.id);
      }
      onClose();
    },
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setChannel('');
      setClassificationId('');
      setWorkflowId('');
      setSelectedDepartment(null);
      setSelectedAssignee(null);
      setSourceIncident(null);
      setIncidentSearch('');
      setShowIncidentSearch(false);
      setErrors({});
    }
  }, [isOpen]);

  // Flatten department tree for selection
  const flattenDepartments = (items: Department[], level = 0): (Department & { level: number })[] => {
    const result: (Department & { level: number })[] = [];
    for (const item of items) {
      result.push({ ...item, level });
      if (item.children && item.children.length > 0) {
        result.push(...flattenDepartments(item.children, level + 1));
      }
    }
    return result;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = t('queries.titleRequired', 'Title is required');
    }
    if (!classificationId) {
      newErrors.classification = t('queries.classificationRequired', 'Classification is required');
    }
    if (!workflowId) {
      newErrors.workflow = t('queries.workflowRequired', 'Workflow is required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const data: CreateQueryRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      classification_id: classificationId,
      workflow_id: workflowId,
      channel: channel.trim() || undefined,
      department_id: selectedDepartment?.id,
      assignee_id: selectedAssignee?.id,
      source_incident_id: sourceIncident?.id,
    };

    createMutation.mutate(data);
  };

  const handleSelectIncident = (incident: Incident) => {
    setSourceIncident(incident);
    setShowIncidentSearch(false);
    setIncidentSearch('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-3xl w-full animate-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                {t('queries.createQuery', 'Create Query')}
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {t('queries.createQueryDescription', 'Create a new query record')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-[hsl(var(--foreground))] flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t('queries.basicInfo', 'Basic Information')}
            </h4>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                {t('queries.title', 'Title')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('queries.titlePlaceholder', 'Enter query title...')}
                className={cn(
                  "w-full px-4 py-2 bg-[hsl(var(--background))] border rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500",
                  errors.title ? "border-red-500" : "border-[hsl(var(--border))]"
                )}
              />
              {errors.title && (
                <p className="text-xs text-red-500 mt-1">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                {t('queries.description', 'Description')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('queries.descriptionPlaceholder', 'Describe the query...')}
                rows={3}
                className="w-full px-4 py-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
              />
            </div>
          </div>

          {/* Channel (Optional) */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                <Radio className="w-3 h-3 inline mr-1" />
                {t('queries.channel', 'Channel')}
                <span className="text-xs text-[hsl(var(--muted-foreground))] ml-1">
                  ({t('common.optional', 'Optional')})
                </span>
              </label>
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder={t('queries.channelPlaceholder', 'e.g., Phone, Email, Web')}
                className="w-full px-4 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>
          </div>

          {/* Source Incident (Optional) */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-[hsl(var(--foreground))] flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t('queries.sourceIncident', 'Source Incident/Request')}
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                ({t('common.optional', 'Optional')})
              </span>
            </h4>

            {sourceIncident ? (
              <div className="flex items-center justify-between p-3 bg-[hsl(var(--muted)/0.5)] rounded-lg border border-[hsl(var(--border))]">
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {sourceIncident.incident_number}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {sourceIncident.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSourceIncident(null)}
                  className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  <input
                    type="text"
                    value={incidentSearch}
                    onChange={(e) => {
                      setIncidentSearch(e.target.value);
                      setShowIncidentSearch(true);
                    }}
                    onFocus={() => setShowIncidentSearch(true)}
                    placeholder={t('queries.searchSourceIncident', 'Search for incident/request number or title...')}
                    className="w-full pl-10 pr-4 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>

                {/* Search Results Dropdown */}
                {showIncidentSearch && incidentSearch.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {incidentsLoading ? (
                      <div className="p-4 text-center">
                        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      </div>
                    ) : searchedIncidents.length === 0 ? (
                      <div className="p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
                        {t('queries.noIncidentsFound', 'No incidents found')}
                      </div>
                    ) : (
                      searchedIncidents.map((incident) => (
                        <button
                          key={incident.id}
                          type="button"
                          onClick={() => handleSelectIncident(incident)}
                          className="w-full px-4 py-3 text-left hover:bg-[hsl(var(--muted)/0.5)] transition-colors border-b border-[hsl(var(--border))] last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                                {incident.incident_number}
                              </p>
                              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-[300px]">
                                {incident.title}
                              </p>
                            </div>
                            <span
                              className="px-2 py-0.5 text-xs rounded-full"
                              style={{
                                backgroundColor: incident.current_state?.color ? `${incident.current_state.color}20` : 'hsl(var(--muted))',
                                color: incident.current_state?.color || 'hsl(var(--foreground))',
                              }}
                            >
                              {incident.current_state?.name || incident.record_type}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Classification & Workflow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Classification */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-[hsl(var(--foreground))] flex items-center gap-2">
                <Tags className="w-4 h-4" />
                {t('queries.classification', 'Classification')} <span className="text-red-500">*</span>
              </h4>

              {classificationsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : classifications.length === 0 ? (
                <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
                  <div className="flex items-center gap-2 text-violet-700">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-xs">
                      {t('queries.noClassifications', 'No query classifications found.')}
                    </p>
                  </div>
                </div>
              ) : (
                <TreeSelect
                  data={classificationTreeData}
                  value={classificationId}
                  onChange={(id) => setClassificationId(id)}
                  placeholder={t('queries.selectClassification', 'Select classification...')}
                  error={errors.classification}
                  leafOnly={true}
                  emptyMessage={t('queries.noClassifications', 'No query classifications found.')}
                  maxHeight="200px"
                />
              )}
            </div>

            {/* Workflow */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-[hsl(var(--foreground))] flex items-center gap-2">
                <Workflow className="w-4 h-4" />
                {t('queries.workflow', 'Workflow')} <span className="text-red-500">*</span>
              </h4>

              {workflowsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredWorkflows.length === 0 ? (
                <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
                  <div className="flex items-center gap-2 text-violet-700">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-xs">
                      {t('queries.noWorkflows', 'No query workflows found.')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className={cn(
                  "space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2",
                  errors.workflow ? "border-red-500" : "border-[hsl(var(--border))]"
                )}>
                  {filteredWorkflows.map((workflow) => (
                    <button
                      key={workflow.id}
                      type="button"
                      onClick={() => setWorkflowId(workflow.id)}
                      className={cn(
                        "w-full p-2 rounded-lg text-left transition-colors text-sm",
                        workflowId === workflow.id
                          ? "bg-violet-500/10 text-violet-700 border border-violet-500"
                          : "hover:bg-[hsl(var(--muted)/0.5)]"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          workflowId === workflow.id
                            ? "border-violet-500 bg-violet-500"
                            : "border-[hsl(var(--muted-foreground))]"
                        )}>
                          {workflowId === workflow.id && (
                            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="truncate block">{workflow.name}</span>
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">
                            {workflow.code}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {errors.workflow && (
                <p className="text-xs text-red-500">{errors.workflow}</p>
              )}
            </div>
          </div>

          {/* Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Department */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-[hsl(var(--foreground))] flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {t('queries.department', 'Department')}
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  ({t('common.optional', 'Optional')})
                </span>
              </h4>

              <select
                value={selectedDepartment?.id || ''}
                onChange={(e) => {
                  const dept = departments.find(d => d.id === e.target.value);
                  setSelectedDepartment(dept || null);
                }}
                className="w-full px-4 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                <option value="">{t('queries.selectDepartment', 'Select department...')}</option>
                {flattenDepartments(departments).map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {'—'.repeat(dept.level)} {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-[hsl(var(--foreground))] flex items-center gap-2">
                <User className="w-4 h-4" />
                {t('queries.assignee', 'Assignee')}
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  ({t('common.optional', 'Optional')})
                </span>
              </h4>

              <select
                value={selectedAssignee?.id || ''}
                onChange={(e) => {
                  const user = users.find(u => u.id === e.target.value);
                  setSelectedAssignee(user || null);
                }}
                className="w-full px-4 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                <option value="">{t('queries.selectAssignee', 'Select assignee...')}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.username})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error Message */}
          {createMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-sm">
                  {(createMutation.error as Error)?.message || t('queries.createError', 'Failed to create query')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            isLoading={createMutation.isPending}
            leftIcon={!createMutation.isPending ? <CheckCircle2 className="w-4 h-4" /> : undefined}
            className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
          >
            {t('queries.create', 'Create Query')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateQueryModal;
