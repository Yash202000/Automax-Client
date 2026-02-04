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
  FileText,
  Radio,
  Upload,
  Paperclip,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Button, TreeSelect, LocationPicker } from '../ui';
import type { TreeSelectNode, LocationData } from '../ui';
import {
  queryApi,
  classificationApi,
  workflowApi,
  departmentApi,
  userApi,
  incidentApi,
  locationApi,
  lookupApi,
} from '../../api/admin';
import type {
  Classification,
  Department,
  User as UserType,
  Incident,
  CreateQueryRequest,
  IncidentSource,
} from '../../types';
import { INCIDENT_SOURCES } from '../../types';
import { cn } from '@/lib/utils';

interface CreateQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (requestId: string) => void;
}

export const CreateQueryModal: React.FC<CreateQueryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState<IncidentSource | undefined>(undefined);
  const [channel, setChannel] = useState('');
  const [classificationId, setClassificationId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [workflowId, setWorkflowId] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<UserType | null>(null);
  const [sourceIncident, setSourceIncident] = useState<Incident | null>(null);
  const [incidentSearch, setIncidentSearch] = useState('');
  const [showIncidentSearch, setShowIncidentSearch] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [lookupValues, setLookupValues] = useState<Record<string, string>>({});
  const [dueDate, setDueDate] = useState('');

  // Geolocation fields
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [city, setCity] = useState<string | undefined>(undefined);
  const [state, setState] = useState<string | undefined>(undefined);
  const [country, setCountry] = useState<string | undefined>(undefined);
  const [postalCode, setPostalCode] = useState<string | undefined>(undefined);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Query for request classifications
  const { data: classificationsData, isLoading: classificationsLoading } = useQuery({
    queryKey: ['classifications', 'query'],
    queryFn: async () => {
      // Get 'query', 'both', and 'all' types
      const [requestRes, bothRes, allRes] = await Promise.all([
        classificationApi.getTreeByType('query'),
        classificationApi.getTreeByType('both'),
        classificationApi.getTreeByType('all'),
      ]);
      const combined = [...(requestRes.data || []), ...(bothRes.data || []), ...(allRes.data || [])];
      // Deduplicate by ID
      const unique = combined.filter((item, index, self) =>
        index === self.findIndex(t => t.id === item.id)
      );
      return { success: true, data: unique };
    },
    enabled: isOpen,
  });

  // Query for request workflows
  const { data: workflowsData, isLoading: workflowsLoading } = useQuery({
    queryKey: ['workflows', 'query'],
    queryFn: async () => {
      // Get 'query', 'both', and 'all' types
      const [requestRes, bothRes, allRes] = await Promise.all([
        workflowApi.listByRecordType('query', true),
        workflowApi.listByRecordType('both', true),
        workflowApi.listByRecordType('all', true),
      ]);
      const combined = [...(requestRes.data || []), ...(bothRes.data || []), ...(allRes.data || [])];
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

  // Query for locations
  const { data: locationsData } = useQuery({
    queryKey: ['locations', 'tree'],
    queryFn: () => locationApi.getTree(),
    enabled: isOpen,
  });

  // Query for lookup categories
  const { data: lookupCategoriesData } = useQuery({
    queryKey: ['lookups', 'categories'],
    queryFn: () => lookupApi.listCategories(),
    enabled: isOpen,
  });

  // Query for incidents created by the current user (for source incident search)
  const { data: incidentsData, isLoading: incidentsLoading } = useQuery({
    queryKey: ['incidents', 'my-reported', 'search', incidentSearch],
    queryFn: async () => {
      // Get incidents and queries created by current user
      const [incidentsRes, queriesRes] = await Promise.all([
        incidentApi.getMyReported(1, 50, 'incident'),
        incidentApi.getMyReported(1, 50, 'query'),
      ]);
      const combined = [...(incidentsRes.data || []), ...(queriesRes.data || [])];
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
  const locations = locationsData?.data || [];
  const searchedIncidents = incidentsData?.data || [];

  // Filter lookup categories for request form
  const requestLookupCategories = (lookupCategoriesData?.data || []).filter(
    (cat) => cat.add_to_incident_form
  );

  // Get selected workflow and its required fields
  const selectedWorkflow = workflows.find(w => w.id === workflowId);
  const workflowRequiredFields = selectedWorkflow?.required_fields || [];

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
    const requestWorkflows = workflows.filter(w => w.is_active);

    if (!classificationId) {
      return requestWorkflows;
    }

    const matching = requestWorkflows.filter(w => {
      const hasNoClassificationRestriction = !w.classifications || w.classifications.length === 0;

      if (hasNoClassificationRestriction) return true;

      return w.classifications?.some(c => c.id === classificationId);
    });

    // If no workflows match the classification, show all workflows as fallback
    if (matching.length === 0) return requestWorkflows;
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

  // Create request mutation
  const createMutation = useMutation({
    mutationFn: async ({ data, files }: { data: CreateQueryRequest; files: File[] }) => {
      const response = await queryApi.create(data);
      // Upload attachments after request is created
      if (response.data && files.length > 0) {
        await Promise.all(
          files.map(file => queryApi.uploadAttachment(response.data!.id, file))
        );
      }
      return response;
    },
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
      setSource(undefined);
      setChannel('');
      setClassificationId('');
      setLocationId('');
      setWorkflowId('');
      setSelectedDepartment(null);
      setSelectedAssignee(null);
      setSourceIncident(null);
      setIncidentSearch('');
      setShowIncidentSearch(false);
      setAttachments([]);
      setLookupValues({});
      setDueDate('');
      setLatitude(undefined);
      setLongitude(undefined);
      setAddress(undefined);
      setCity(undefined);
      setState(undefined);
      setCountry(undefined);
      setPostalCode(undefined);
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

    // Check workflow required fields
    if (workflowRequiredFields.includes('description') && !description.trim()) {
      newErrors.description = t('queries.fieldRequired', { field: t('queries.description', 'Description') });
    }
    if (workflowRequiredFields.includes('source') && !source) {
      newErrors.source = t('queries.fieldRequired', { field: t('queries.source', 'Source') });
    }
    if (workflowRequiredFields.includes('channel') && !channel.trim()) {
      newErrors.channel = t('queries.fieldRequired', { field: t('queries.channel', 'Channel') });
    }
    if (workflowRequiredFields.includes('location_id') && !locationId) {
      newErrors.location = t('queries.fieldRequired', { field: t('queries.location', 'Location') });
    }
    if (workflowRequiredFields.includes('department_id') && !selectedDepartment) {
      newErrors.department = t('queries.fieldRequired', { field: t('queries.department', 'Department') });
    }
    if (workflowRequiredFields.includes('assignee_id') && !selectedAssignee) {
      newErrors.assignee = t('queries.fieldRequired', { field: t('queries.assignee', 'Assignee') });
    }
    if (workflowRequiredFields.includes('due_date') && !dueDate) {
      newErrors.due_date = t('queries.fieldRequired', { field: t('queries.dueDate', 'Due Date') });
    }
    if (workflowRequiredFields.includes('geolocation') && (latitude === undefined || longitude === undefined)) {
      newErrors.geolocation = t('queries.fieldRequired', { field: t('queries.geolocation', 'Geolocation') });
    }
    if ((workflowRequiredFields.includes('attachments') || workflowRequiredFields.includes('attachment')) && attachments.length === 0) {
      newErrors.attachments = t('queries.fieldRequired', { field: t('queries.attachments', 'Attachments') });
    }
    if (workflowRequiredFields.includes('source_incident_id') && !sourceIncident) {
      newErrors.source_incident_id = t('queries.fieldRequired', { field: t('queries.sourceIncident', 'Source Incident') });
    }

    // Check lookup field requirements
    for (const field of workflowRequiredFields) {
      if (field.startsWith('lookup:')) {
        const categoryCode = field.replace('lookup:', '');
        const category = requestLookupCategories.find(c => c.code === categoryCode);
        if (category && !lookupValues[category.id]) {
          newErrors[field] = t('queries.fieldRequired', { field: category.name });
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const lookupIds = Object.values(lookupValues).filter(Boolean);

    const data: CreateQueryRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      classification_id: classificationId,
      workflow_id: workflowId,
      source: source || undefined,
      channel: channel.trim() || undefined,
      department_id: selectedDepartment?.id,
      assignee_id: selectedAssignee?.id,
      location_id: locationId || undefined,
      latitude,
      longitude,
      address,
      city,
      state,
      country,
      postal_code: postalCode,
      due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      source_incident_id: sourceIncident?.id,
      lookup_value_ids: lookupIds.length > 0 ? lookupIds : undefined,
    };

    createMutation.mutate({ data, files: attachments });
  };

  const handleSelectIncident = (incident: Incident) => {
    setSourceIncident(incident);
    setShowIncidentSearch(false);
    setIncidentSearch('');
  };

  const handleLookupChange = (categoryId: string, valueId: string) => {
    setLookupValues(prev => ({ ...prev, [categoryId]: valueId }));
  };

  const handleLocationChange = (location: LocationData | undefined) => {
    if (location) {
      setLatitude(location.latitude);
      setLongitude(location.longitude);
      setAddress(location.address);
      setCity(location.city);
      setState(location.state);
      setCountry(location.country);
      setPostalCode(location.postal_code);
      if (errors.geolocation) {
        setErrors(prev => ({ ...prev, geolocation: '' }));
      }
    } else {
      setLatitude(undefined);
      setLongitude(undefined);
      setAddress(undefined);
      setCity(undefined);
      setState(undefined);
      setCountry(undefined);
      setPostalCode(undefined);
    }
  };

  // Convert locations to TreeSelectNode format
  const locationTree = locations as unknown as TreeSelectNode[];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-3xl w-full animate-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                {t('queries.createQuery', 'Create Query')}
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {t('queries.createQueryDescription', 'Create a new request record')}
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
                placeholder={t('queries.titlePlaceholder', 'Enter request title...')}
                className={cn(
                  "w-full px-4 py-2 bg-[hsl(var(--background))] border rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
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
                {workflowRequiredFields.includes('description') && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('queries.descriptionPlaceholder', 'Describe the request...')}
                rows={3}
                className={cn(
                  "w-full px-4 py-3 bg-[hsl(var(--background))] border rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none",
                  errors.description ? "border-red-500" : "border-[hsl(var(--border))]"
                )}
              />
              {errors.description && (
                <p className="text-xs text-red-500 mt-1">{errors.description}</p>
              )}
            </div>
          </div>

          {/* Source & Channel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Source */}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                {t('queries.source', 'Source')}
                {workflowRequiredFields.includes('source') ? (
                  <span className="text-red-500 ml-1">*</span>
                ) : (
                  <span className="text-xs text-[hsl(var(--muted-foreground))] ml-1">
                    ({t('common.optional', 'Optional')})
                  </span>
                )}
              </label>
              <select
                value={source || ''}
                onChange={(e) => setSource((e.target.value as IncidentSource) || undefined)}
                className={cn(
                  "w-full px-4 py-2 bg-[hsl(var(--background))] border rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                  errors.source ? "border-red-500" : "border-[hsl(var(--border))]"
                )}
              >
                <option value="">{t('queries.selectSource', 'Select source...')}</option>
                {INCIDENT_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              {errors.source && (
                <p className="text-xs text-red-500 mt-1">{errors.source}</p>
              )}
            </div>

            {/* Channel */}
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                <Radio className="w-3 h-3 inline mr-1" />
                {t('queries.channel', 'Channel')}
                {workflowRequiredFields.includes('channel') ? (
                  <span className="text-red-500 ml-1">*</span>
                ) : (
                  <span className="text-xs text-[hsl(var(--muted-foreground))] ml-1">
                    ({t('common.optional', 'Optional')})
                  </span>
                )}
              </label>
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder={t('queries.channelPlaceholder', 'e.g., Phone, Email, Web')}
                className={cn(
                  "w-full px-4 py-2 bg-[hsl(var(--background))] border rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                  errors.channel ? "border-red-500" : "border-[hsl(var(--border))]"
                )}
              />
              {errors.channel && (
                <p className="text-xs text-red-500 mt-1">{errors.channel}</p>
              )}
            </div>
          </div>

          {/* Source Incident */}
          {workflowRequiredFields.includes('source_incident_id') && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-[hsl(var(--foreground))] flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t('queries.sourceIncident', 'Source Incident/Query')}
              {workflowRequiredFields.includes('source_incident_id') ? (
                <span className="text-xs text-red-500">*</span>
              ) : (
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  ({t('common.optional', 'Optional')})
                </span>
              )}
            </h4>
            {errors.source_incident_id && (
              <p className="text-xs text-red-500">{errors.source_incident_id}</p>
            )}

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
                    className="w-full pl-10 pr-4 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Search Results Dropdown */}
                {showIncidentSearch && incidentSearch.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {incidentsLoading ? (
                      <div className="p-4 text-center">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
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
          )}

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
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : classifications.length === 0 ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-xs">
                      {t('queries.noClassifications', 'No request classifications found.')}
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
                  emptyMessage={t('queries.noClassifications', 'No request classifications found.')}
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
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredWorkflows.length === 0 ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-xs">
                      {t('queries.noWorkflows', 'No request workflows found.')}
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
                          ? "bg-blue-500/10 text-blue-700 border border-blue-500"
                          : "hover:bg-[hsl(var(--muted)/0.5)]"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          workflowId === workflow.id
                            ? "border-blue-500 bg-blue-500"
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

          {/* Location & Lookup Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Location */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-[hsl(var(--foreground))] flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {t('queries.location', 'Location')}
                {workflowRequiredFields.includes('location_id') ? (
                  <span className="text-red-500 ml-1">*</span>
                ) : (
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    ({t('common.optional', 'Optional')})
                  </span>
                )}
              </h4>
              <TreeSelect
                data={locationTree}
                value={locationId || ''}
                onChange={(id) => setLocationId(id)}
                placeholder={t('queries.selectLocation', 'Select location...')}
                error={errors.location}
                leafOnly={true}
                emptyMessage={t('queries.noLocations', 'No locations available')}
              />
            </div>

            {/* Lookup Categories */}
            {requestLookupCategories.map(category => {
              const lookupFieldKey = `lookup:${category.code}`;
              const isRequired = workflowRequiredFields.includes(lookupFieldKey as any);
              return (
                <div key={category.id} className="space-y-3">
                  <h4 className="text-sm font-medium text-[hsl(var(--foreground))] flex items-center gap-2">
                    <Tags className="w-4 h-4" />
                    {i18n.language === 'ar' ? category.name_ar || category.name : category.name}
                    {isRequired && <span className="text-red-500 ml-1">*</span>}
                  </h4>
                  <select
                    value={lookupValues[category.id] || ''}
                    onChange={(e) => handleLookupChange(category.id, e.target.value)}
                    className={cn(
                      "w-full px-4 py-2 bg-[hsl(var(--background))] border rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                      errors[lookupFieldKey] ? "border-red-500" : "border-[hsl(var(--border))]"
                    )}
                  >
                    <option value="">{t('common.select', 'Select...')}</option>
                    {(category.values || []).map(v => (
                      <option key={v.id} value={v.id}>
                        {i18n.language === 'ar' && v.name_ar ? v.name_ar : v.name}
                      </option>
                    ))}
                  </select>
                  {errors[lookupFieldKey] && (
                    <p className="text-xs text-red-500">{errors[lookupFieldKey]}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Geolocation - full width if required */}
          {workflowRequiredFields.includes('geolocation') && (
            <div>
              <h4 className="text-sm font-medium text-[hsl(var(--foreground))] flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4" />
                {t('queries.geolocation', 'Geolocation')}
                <span className="text-red-500 ml-1">*</span>
              </h4>
              <LocationPicker
                label={t('queries.geolocation', 'Geolocation')}
                value={latitude !== undefined && longitude !== undefined ? {
                  latitude,
                  longitude,
                  address,
                  city,
                  state,
                  country,
                  postal_code: postalCode,
                } : undefined}
                onChange={handleLocationChange}
                required
                error={errors.geolocation}
              />
            </div>
          )}

          {/* Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Department */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-[hsl(var(--foreground))] flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {t('queries.department', 'Department')}
                {workflowRequiredFields.includes('department_id') ? (
                  <span className="text-red-500 ml-1">*</span>
                ) : (
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    ({t('common.optional', 'Optional')})
                  </span>
                )}
              </h4>

              <select
                value={selectedDepartment?.id || ''}
                onChange={(e) => {
                  const dept = departments.find(d => d.id === e.target.value);
                  setSelectedDepartment(dept || null);
                }}
                className={cn(
                  "w-full px-4 py-2 bg-[hsl(var(--background))] border rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                  errors.department ? "border-red-500" : "border-[hsl(var(--border))]"
                )}
              >
                <option value="">{t('queries.selectDepartment', 'Select department...')}</option>
                {flattenDepartments(departments).map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {'—'.repeat(dept.level)} {dept.name}
                  </option>
                ))}
              </select>
              {errors.department && (
                <p className="text-xs text-red-500">{errors.department}</p>
              )}
            </div>

            {/* Assignee */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-[hsl(var(--foreground))] flex items-center gap-2">
                <User className="w-4 h-4" />
                {t('queries.assignee', 'Assignee')}
                {workflowRequiredFields.includes('assignee_id') ? (
                  <span className="text-red-500 ml-1">*</span>
                ) : (
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    ({t('common.optional', 'Optional')})
                  </span>
                )}
              </h4>

              <select
                value={selectedAssignee?.id || ''}
                onChange={(e) => {
                  const user = users.find(u => u.id === e.target.value);
                  setSelectedAssignee(user || null);
                }}
                className={cn(
                  "w-full px-4 py-2 bg-[hsl(var(--background))] border rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                  errors.assignee ? "border-red-500" : "border-[hsl(var(--border))]"
                )}
              >
                <option value="">{t('queries.selectAssignee', 'Select assignee...')}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.username})
                  </option>
                ))}
              </select>
              {errors.assignee && (
                <p className="text-xs text-red-500">{errors.assignee}</p>
              )}
            </div>

            {/* Due Date */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-[hsl(var(--foreground))] flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t('queries.dueDate', 'Due Date')}
                {workflowRequiredFields.includes('due_date') ? (
                  <span className="text-red-500 ml-1">*</span>
                ) : (
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    ({t('common.optional', 'Optional')})
                  </span>
                )}
              </h4>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={cn(
                  "w-full px-4 py-2 bg-[hsl(var(--background))] border rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                  errors.due_date ? "border-red-500" : "border-[hsl(var(--border))]"
                )}
              />
              {errors.due_date && (
                <p className="text-xs text-red-500">{errors.due_date}</p>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-[hsl(var(--foreground))] flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              {t('queries.attachments', 'Attachments')}
              {(workflowRequiredFields.includes('attachments') || workflowRequiredFields.includes('attachment')) && (
                <span className="text-red-500">*</span>
              )}
            </h4>

            <div className="space-y-4">
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-[hsl(var(--muted)/0.5)] rounded-lg border border-[hsl(var(--border))]"
                    >
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        <span className="text-sm text-[hsl(var(--foreground))] truncate max-w-[250px]">
                          {file.name}
                        </span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                        className="p-1 text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className={cn(
                "flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors",
                errors.attachments ? "border-red-500" : "border-[hsl(var(--border))]"
              )}>
                <Upload className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  {t('queries.clickToUpload', 'Click to upload files')}
                </span>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      setAttachments(prev => [...prev, ...files]);
                      if (errors.attachments) {
                        setErrors(prev => ({ ...prev, attachments: '' }));
                      }
                    }
                    e.target.value = '';
                  }}
                />
              </label>
              {errors.attachments && (
                <p className="text-xs text-red-500">{errors.attachments}</p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {createMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-sm">
                  {(createMutation.error as Error)?.message || t('queries.createError', 'Failed to create request')}
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
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
          >
            {t('queries.create', 'Create Query')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateQueryModal;
