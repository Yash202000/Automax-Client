import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, AlertTriangle, Info, Zap, Upload, X, Paperclip } from 'lucide-react';
import { Button, Card, Input, Select, Textarea, TreeSelect, LocationPicker } from '../../components/ui';
import type { TreeSelectNode, LocationData } from '../../components/ui';
import { workflowApi, classificationApi, incidentApi, lookupApi } from '../../api/admin';
import { userApi, departmentApi, locationApi } from '../../api/admin';
import type { IncidentCreateRequest, User, Department, Location, Workflow, Classification, IncidentSource, LookupValue } from '../../types';
import { INCIDENT_SOURCES } from '../../types';

export function IncidentCreatePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Omit<IncidentCreateRequest, 'lookup_value_ids'>>({
    title: '',
    description: '',
    workflow_id: '',
    classification_id: '',
    source: undefined,
    assignee_id: '',
    department_id: '',
    location_id: '',
    latitude: undefined,
    longitude: undefined,
    address: undefined,
    city: undefined,
    state: undefined,
    country: undefined,
    postal_code: undefined,
    due_date: '',
  });

  const [lookupValues, setLookupValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoMatchedWorkflow, setAutoMatchedWorkflow] = useState<Workflow | null>(null);
  const [isAutoMatched, setIsAutoMatched] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  // Fetch data
  const { data: workflowsData } = useQuery({
    queryKey: ['admin', 'workflows', 'active'],
    queryFn: () => workflowApi.list(true),
  });

  const { data: classificationsData } = useQuery({
    queryKey: ['admin', 'classifications', 'tree', 'incident'],
    queryFn: async () => {
      // Get both 'incident' and 'all' types for incident creation
      const [incidentRes, allRes] = await Promise.all([
        classificationApi.getTree('incident'),
        classificationApi.getTree('all'),
      ]);
      const combined = [...(incidentRes.data || []), ...(allRes.data || [])];
      // Deduplicate by ID
      const unique = combined.filter((item, index, self) =>
        index === self.findIndex(t => t.id === item.id)
      );
      return { success: true, data: unique };
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => userApi.list(1, 100),
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['admin', 'departments'],
    queryFn: () => departmentApi.list(),
  });

  const { data: locationsData } = useQuery({
    queryKey: ['admin', 'locations', 'tree'],
    queryFn: () => locationApi.getTree(),
  });

  const { data: lookupCategoriesData } = useQuery({
    queryKey: ['admin', 'lookups', 'categories'],
    queryFn: () => lookupApi.listCategories(),
  });

  const workflows: Workflow[] = workflowsData?.data || [];
  const classifications: Classification[] = classificationsData?.data || [];
  const users: User[] = usersData?.data || [];
  const departments: Department[] = departmentsData?.data || [];
  const locations: Location[] = locationsData?.data || [];

  const incidentLookupCategories = (lookupCategoriesData?.data || []).filter(
    (cat) => cat.add_to_incident_form
  );


  const getLookupValueFromState = (categoryCode: string): LookupValue | undefined => {
    const category = incidentLookupCategories.find(c => c.code === categoryCode);
    if (!category || !lookupValues[category.id]) return undefined;
    return category.values?.find(v => v.id === lookupValues[category.id]);
  };

  // Filter workflows based on selected classification and location
  const filteredWorkflows = useMemo(() => {
    // Only filter for incident type workflows
    const incidentWorkflows = workflows.filter(w =>
      w.is_active && (w.record_type === 'incident' || w.record_type === 'both' || w.record_type === 'all')
    );

    if (!formData.classification_id && !formData.location_id) {
      // No filters yet, show all active incident workflows
      return incidentWorkflows;
    }

    // Filter workflows that match the selected criteria
    const matching = incidentWorkflows.filter(w => {
      // Check if workflow has no restrictions (matches all)
      const hasNoClassificationRestriction = !w.classifications || w.classifications.length === 0;
      const hasNoLocationRestriction = !w.locations || w.locations.length === 0;

      // Check classification match
      let classificationMatch = hasNoClassificationRestriction;
      if (formData.classification_id && w.classifications?.length) {
        classificationMatch = w.classifications.some(c => c.id === formData.classification_id);
      }

      // Check location match
      let locationMatch = hasNoLocationRestriction;
      if (formData.location_id && w.locations?.length) {
        locationMatch = w.locations.some(l => l.id === formData.location_id);
      }

      return classificationMatch && locationMatch;
    });

    // If no matching workflows, return all active ones with default marked
    if (matching.length === 0) {
      return incidentWorkflows;
    }

    return matching;
  }, [workflows, formData.classification_id, formData.location_id]);

  // Auto-select workflow if only one matches, or clear if current selection is not in filtered list
  useEffect(() => {
    // If current workflow is not in filtered list, clear it
    if (formData.workflow_id && filteredWorkflows.length > 0) {
      const isCurrentValid = filteredWorkflows.some(w => w.id === formData.workflow_id);
      if (!isCurrentValid) {
        // Current workflow no longer matches, select the first available or default
        const defaultWorkflow = filteredWorkflows.find(w => w.is_default) || filteredWorkflows[0];
        setFormData(prev => ({ ...prev, workflow_id: defaultWorkflow.id }));
        setIsAutoMatched(true);
      }
    }
    // If only one workflow matches and nothing is selected, auto-select it
    else if (filteredWorkflows.length === 1 && !formData.workflow_id) {
      setFormData(prev => ({ ...prev, workflow_id: filteredWorkflows[0].id }));
      setIsAutoMatched(true);
    }
    // If multiple workflows and nothing selected, select the default one
    else if (filteredWorkflows.length > 1 && !formData.workflow_id) {
      const defaultWorkflow = filteredWorkflows.find(w => w.is_default);
      if (defaultWorkflow) {
        setFormData(prev => ({ ...prev, workflow_id: defaultWorkflow.id }));
        setIsAutoMatched(true);
      }
    }
  }, [filteredWorkflows, formData.workflow_id]);

  const matchWorkflow = useCallback(() => {
    if (filteredWorkflows.length === 0) return;

    const priorityValue = getLookupValueFromState('PRIORITY');
    const severityValue = getLookupValueFromState('SEVERITY');

    const matched = workflowApi.findMatchingWorkflow(filteredWorkflows, {
      classification_id: formData.classification_id || undefined,
      location_id: formData.location_id || undefined,
      source: formData.source || undefined,
      priority: priorityValue ? priorityValue.sort_order : undefined,
      severity: severityValue ? severityValue.sort_order : undefined,
    });

    if (matched) {
      setAutoMatchedWorkflow(matched);
      if (!formData.workflow_id || isAutoMatched) {
        setFormData(prev => ({ ...prev, workflow_id: matched.id }));
        setIsAutoMatched(true);
      }
    }
  }, [filteredWorkflows, formData.classification_id, formData.location_id, formData.source, lookupValues, isAutoMatched, formData.workflow_id]);

  useEffect(() => {
    matchWorkflow();
  }, [matchWorkflow]);

  const createMutation = useMutation({
    mutationFn: async ({ data, files }: { data: IncidentCreateRequest; files: File[] }) => {
      console.log('Creating incident with data:', data);
      const response = await incidentApi.create(data);
      console.log('Incident created:', response);
      // Upload attachments after incident is created
      if (response.data && files.length > 0) {
        console.log('Uploading attachments:', files.length);
        await Promise.all(
          files.map(file => incidentApi.uploadAttachment(response.data!.id, file))
        );
        console.log('Attachments uploaded successfully');
      }
      return response;
    },
    onSuccess: (response) => {
      console.log('Mutation success, navigating...');
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      if (response.data) {
        navigate(`/incidents/${response.data.id}`);
      } else {
        navigate('/incidents');
      }
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create incident';
      setErrors(prev => ({ ...prev, submit: message }));
    },
  });

  const handleChange = (field: keyof typeof formData, value: string | IncidentSource | undefined) => {
    if (field === 'workflow_id' && value) {
      setIsAutoMatched(false);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLookupChange = (categoryId: string, valueId: string) => {
    setLookupValues(prev => ({ ...prev, [categoryId]: valueId }));
  };

  const handleLocationChange = (location: LocationData | undefined) => {
    if (location) {
      setFormData(prev => ({
        ...prev,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        city: location.city,
        state: location.state,
        country: location.country,
        postal_code: location.postal_code,
      }));
      if (errors.geolocation) {
        setErrors(prev => ({ ...prev, geolocation: '' }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        latitude: undefined,
        longitude: undefined,
        address: undefined,
        city: undefined,
        state: undefined,
        country: undefined,
        postal_code: undefined,
      }));
    }
  };

  const selectedWorkflow = workflows.find(w => w.id === formData.workflow_id);
  const workflowRequiredFields = selectedWorkflow?.required_fields || [];

  // List of valid form data fields for validation
  const validFormFields = ['description', 'classification_id', 'source', 'assignee_id', 'department_id', 'location_id', 'geolocation', 'due_date'];

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = t('incidents.titleRequired');
    if (!formData.workflow_id) newErrors.workflow_id = t('incidents.workflowRequired');

    for (const field of workflowRequiredFields) {
      // Check for lookup field requirements (format: lookup:CATEGORY_CODE)
      if (field.startsWith('lookup:')) {
        const categoryCode = field.replace('lookup:', '');
        const category = incidentLookupCategories.find(c => c.code === categoryCode);
        if (category && !lookupValues[category.id]) {
          newErrors[field] = t('incidents.fieldRequired', { field: category.name });
        }
      } else if (field === 'attachments') {
        // Check attachments separately since they're not in formData
        if (attachments.length === 0) {
          newErrors.attachments = t('incidents.fieldRequired', { field: t('incidents.attachments', 'Attachments') });
        }
      } else if (field === 'geolocation') {
        // Check geolocation - both latitude and longitude must be set
        if (formData.latitude === undefined || formData.longitude === undefined) {
          newErrors.geolocation = t('incidents.fieldRequired', { field: t('incidents.geolocation', 'Geolocation') });
        }
      } else if (validFormFields.includes(field)) {
        // Standard field validation - only check fields that exist in formData
        const value = formData[field as keyof typeof formData];
        if (!value || (typeof value === 'string' && !value.trim())) {
          newErrors[field] = t('incidents.fieldRequired', { field });
        }
      }
    }
    setErrors(newErrors);
    console.log('Validation errors:', newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted, validating...');
    if (!validate()) {
      console.log('Validation failed');
      return;
    }
    console.log('Validation passed, creating incident...');

    const submitData: IncidentCreateRequest = { ...formData };
    
    // Ensure empty strings are not sent for optional UUID fields
    if (submitData.assignee_id === '') submitData.assignee_id = undefined;
    if (submitData.department_id === '') submitData.department_id = undefined;
    if (submitData.location_id === '') submitData.location_id = undefined;
    if (submitData.classification_id === '') submitData.classification_id = undefined;

    const lookupIds = Object.values(lookupValues).filter(Boolean);
    if (lookupIds.length > 0) {
      submitData.lookup_value_ids = lookupIds;
    }

    if (formData.due_date) {
      submitData.due_date = new Date(formData.due_date).toISOString();
    } else {
      submitData.due_date = undefined;
    }

    createMutation.mutate({ data: submitData, files: attachments });
  };
  
  const sourceOptions = [
    { value: '', label: t('incidents.selectSource') },
    ...INCIDENT_SOURCES.map(s => ({ value: s.value, label: s.label })),
  ];

  const workflowOptions = [
    { value: '', label: t('incidents.selectWorkflow') },
    ...filteredWorkflows.map(wf => ({
      value: wf.id,
      label: wf.is_default ? `${wf.name} (${t('common.default', 'Default')})` : wf.name
    })),
  ];

  // Convert classifications to TreeSelectNode format
  const classificationTree = classifications as unknown as TreeSelectNode[];

  const userOptions = [
    { value: '', label: t('incidents.unassigned') },
    ...users.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` })),
  ];

  const departmentOptions = [
    { value: '', label: t('incidents.noDepartment') },
    ...departments.map(d => ({ value: d.id, label: d.name })),
  ];

  // Convert locations to TreeSelectNode format
  const locationTree = locations as unknown as TreeSelectNode[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/incidents')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t('incidents.createIncident')}</h1>
          <p className="text-gray-600">{t('incidents.createIncidentSubtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">{t('incidents.basicInformation')}</h2>
              <div className="space-y-4">
                <Input
                  label={t('incidents.incidentTitle')}
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  error={errors.title}
                  placeholder={t('incidents.titlePlaceholder')}
                  required
                />
                <Textarea
                  label={t('incidents.description')}
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder={t('incidents.descriptionPlaceholder')}
                  rows={5}
                  required={workflowRequiredFields.includes('description')}
                  error={errors.description}
                />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">{t('incidents.details')}</h2>
              <div className="grid grid-cols-2 gap-4">
                <TreeSelect
                  label={t('incidents.classification')}
                  data={classificationTree}
                  value={formData.classification_id || ''}
                  onChange={(id) => handleChange('classification_id', id)}
                  placeholder={t('incidents.selectClassification')}
                  required={workflowRequiredFields.includes('classification_id')}
                  error={errors.classification_id}
                  leafOnly={true}
                  emptyMessage={t('incidents.noClassifications', 'No classifications available')}
                />
                <TreeSelect
                  label={t('incidents.location')}
                  data={locationTree}
                  value={formData.location_id || ''}
                  onChange={(id) => handleChange('location_id', id)}
                  placeholder={t('incidents.selectLocation', 'Select location')}
                  required={workflowRequiredFields.includes('location_id')}
                  error={errors.location_id}
                  leafOnly={true}
                  emptyMessage={t('incidents.noLocations', 'No locations available')}
                />
                <Select
                  label={t('incidents.source')}
                  value={formData.source || ''}
                  onChange={(e) => handleChange('source', e.target.value as IncidentSource || undefined)}
                  options={sourceOptions}
                  required={workflowRequiredFields.includes('source')}
                  error={errors.source}
                />

                {incidentLookupCategories.map(category => {
                  const lookupFieldKey = `lookup:${category.code}`;
                  const isRequired = workflowRequiredFields.includes(lookupFieldKey as any);
                  return (
                    <Select
                      key={category.id}
                      label={i18n.language === 'ar' ? category.name_ar || category.name : category.name}
                      value={lookupValues[category.id] || ''}
                      onChange={(e) => handleLookupChange(category.id, e.target.value)}
                      options={[
                        { value: '', label: t('common.select') },
                        ...(category.values || []).map(v => ({
                          value: v.id,
                          label: i18n.language === 'ar' && v.name_ar ? v.name_ar : v.name,
                        }))
                      ]}
                      required={isRequired}
                      error={errors[lookupFieldKey]}
                    />
                  );
                })}

                {/* Geolocation field - spans full width */}
                {workflowRequiredFields.includes('geolocation') && (
                  <div className="col-span-2">
                    <LocationPicker
                      label={t('incidents.geolocation', 'Geolocation')}
                      value={formData.latitude !== undefined && formData.longitude !== undefined ? {
                        latitude: formData.latitude,
                        longitude: formData.longitude,
                        address: formData.address,
                        city: formData.city,
                        state: formData.state,
                        country: formData.country,
                        postal_code: formData.postal_code,
                      } : undefined}
                      onChange={handleLocationChange}
                      required
                      error={errors.geolocation}
                    />
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                {t('incidents.attachments', 'Attachments')}
                {workflowRequiredFields.includes('attachments') && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </h2>
              <div className="space-y-4">
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700 truncate max-w-[250px]">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <Upload className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {t('incidents.clickToUpload', 'Click to upload files')}
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
                  <p className="text-sm text-red-500">{errors.attachments}</p>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold">{t('incidents.workflow')}</h2>
              </div>
              <Select
                label={t('incidents.workflow')}
                value={formData.workflow_id || ''}
                onChange={(e) => handleChange('workflow_id', e.target.value)}
                error={errors.workflow_id}
                options={workflowOptions}
                required
              />
              {isAutoMatched && autoMatchedWorkflow && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
                  <Info className="w-3 h-3" />
                  <span>{t('incidents.autoMatchedHint')}</span>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">{t('incidents.assignment')}</h2>
              <div className="space-y-4">
                <Select
                  label={t('incidents.assignee')}
                  value={formData.assignee_id || ''}
                  onChange={(e) => handleChange('assignee_id', e.target.value)}
                  options={userOptions}
                  required={workflowRequiredFields.includes('assignee_id')}
                  error={errors.assignee_id}
                />
                <Select
                  label={t('incidents.department')}
                  value={formData.department_id || ''}
                  onChange={(e) => handleChange('department_id', e.target.value)}
                  options={departmentOptions}
                  required={workflowRequiredFields.includes('department_id')}
                  error={errors.department_id}
                />
                <Input
                  label={t('incidents.dueDate')}
                  type="datetime-local"
                  value={formData.due_date || ''}
                  onChange={(e) => handleChange('due_date', e.target.value)}
                  required={workflowRequiredFields.includes('due_date')}
                  error={errors.due_date}
                />
              </div>
            </Card>

            <Card className="p-6">
              {errors.submit && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{errors.submit}</span>
                </div>
              )}
              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  leftIcon={<Save className="w-4 h-4" />}
                  isLoading={createMutation.isPending}
                >
                  {t('incidents.createIncident')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/incidents')}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
