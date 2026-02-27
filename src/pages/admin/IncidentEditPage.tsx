import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, AlertTriangle, Info, Zap, Upload, X, Paperclip, Loader2 } from 'lucide-react';
import { Button, Card, Input, Select, Textarea, TreeSelect, LocationPicker, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '../../components/ui';
import type { TreeSelectNode, LocationData } from '../../components/ui';
import { workflowApi, classificationApi, incidentApi, lookupApi } from '../../api/admin';
import { userApi, departmentApi, locationApi } from '../../api/admin';
import type { IncidentUpdateRequest, User, Department, Location, Workflow, Classification, IncidentSource, iLocationOption, LookupValue } from '../../types';

import { DynamicLookupField } from '../../components/common/DynamicLookupField';
import { useAuthStore } from '../../stores/authStore';
import { Modal } from '../../components/ui';

export function IncidentEditPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);

    const [formData, setFormData] = useState<Omit<IncidentUpdateRequest, 'lookup_value_ids' | 'custom_lookup_fields' | 'version'>>({
        title: '',
        description: '',
        classification_id: '',
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

    const [lookupValues, setLookupValues] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [attachments, setAttachments] = useState<File[]>([]);
    const [locationOptions, setLocationOptions] = useState<iLocationOption[]>([]);
    const [showLocationOption, setShowLocationOption] = useState<boolean>(false);
    const [initialized, setInitialized] = useState(false);

    // Fetch the existing incident
    const { data: incidentData, isLoading: incidentLoading, isError: incidentError } = useQuery({
        queryKey: ['incident', id],
        queryFn: () => incidentApi.getById(id!),
        enabled: !!id,
    });

    const incident = incidentData?.data;

    console.log('incident', incident);

    // Fetch data
    const { data: workflowsData } = useQuery({
        queryKey: ['admin', 'workflows', 'active'],
        queryFn: () => workflowApi.list(true),
    });

    const { data: classificationsData } = useQuery({
        queryKey: ['admin', 'classifications', 'tree', 'incident'],
        queryFn: async () => {
            const [incidentRes, allRes] = await Promise.all([
                classificationApi.getTree('incident'),
                classificationApi.getTree('all'),
            ]);
            const combined = [...(incidentRes.data || []), ...(allRes.data || [])];
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
    const rawClassifications: Classification[] = classificationsData?.data || [];
    const users: User[] = usersData?.data || [];
    const departments: Department[] = departmentsData?.data || [];
    const rawLocations: Location[] = locationsData?.data || [];

    // Filter classifications based on user's assignments (unless super admin)
    const classifications = useMemo(() => {
        if (!user || user.is_super_admin) return rawClassifications;
        if (!user.classifications || user.classifications.length === 0) return rawClassifications;

        const userClassificationIds = new Set(user.classifications.map(c => c.id));

        const hasUserAccess = (node: Classification): boolean => {
            if (userClassificationIds.has(node.id)) return true;
            if (node.children && node.children.length > 0) {
                return node.children.some(child => hasUserAccess(child));
            }
            return false;
        };

        const filterByUserAccess = (nodes: Classification[]): Classification[] => {
            return nodes
                .map(node => {
                    if (!hasUserAccess(node)) return null;
                    const filteredNode: Classification = {
                        ...node,
                        children: node.children && node.children.length > 0
                            ? filterByUserAccess(node.children)
                            : undefined,
                    };
                    return filteredNode;
                })
                .filter(Boolean) as Classification[];
        };

        return filterByUserAccess(rawClassifications);
    }, [rawClassifications, user]);

    // Filter locations based on user's assignments (unless super admin)
    const locations = useMemo(() => {
        if (!user || user.is_super_admin) return rawLocations;
        if (!user.locations || user.locations.length === 0) return rawLocations;

        const userLocationIds = new Set(user.locations.map(l => l.id));

        const hasUserAccess = (node: Location): boolean => {
            if (userLocationIds.has(node.id)) return true;
            if (node.children && node.children.length > 0) {
                return node.children.some(child => hasUserAccess(child));
            }
            return false;
        };

        const filterByUserAccess = (nodes: Location[]): Location[] => {
            return nodes
                .map(node => {
                    if (!hasUserAccess(node)) return null;
                    const filteredNode: Location = {
                        ...node,
                        children: node.children && node.children.length > 0
                            ? filterByUserAccess(node.children)
                            : undefined,
                    };
                    return filteredNode;
                })
                .filter(Boolean) as Location[];
        };

        return filterByUserAccess(rawLocations);
    }, [rawLocations, user]);

    const incidentLookupCategories = (lookupCategoriesData?.data || []).filter(
        (cat) => cat.add_to_incident_form
    );

    // Initialize form data once incident is loaded
    useEffect(() => {
        if (!incident || initialized) return;

        setFormData({
            title: incident.title || '',
            description: incident.description || '',
            classification_id: incident.classification?.id || '',
            assignee_id: incident.assignee?.id || '',
            department_id: incident.department?.id || '',
            location_id: incident.location?.id || '',
            latitude: incident.latitude,
            longitude: incident.longitude,
            address: incident.address,
            city: incident.city,
            state: incident.state,
            country: incident.country,
            postal_code: incident.postal_code,
            due_date: incident.due_date
                ? new Date(incident.due_date).toISOString().slice(0, 16)
                : '',
        });

        // Pre-populate lookup values
        if (incident.lookup_values && incidentLookupCategories.length > 0) {
            const initialLookupValues: Record<string, any> = {};
            for (const lv of incident.lookup_values) {
                const category = incidentLookupCategories.find(cat =>
                    cat.values?.some(v => v.id === lv.id)
                );
                if (category) {
                    const existing = initialLookupValues[category.id];
                    if (category.field_type === 'multiselect') {
                        if (existing) {
                            initialLookupValues[category.id] = [...existing, lv.id];
                        } else {
                            initialLookupValues[category.id] = [lv.id];
                        }
                    } else {
                        initialLookupValues[category.id] = lv.id;
                    }
                }
            }
            setLookupValues(initialLookupValues);
        }

        setInitialized(true);
    }, [incident, incidentLookupCategories, initialized]);

    const getLookupValueFromState = (categoryCode: string): LookupValue | undefined => {
        const category = incidentLookupCategories.find(c => c.code === categoryCode);
        if (!category || !lookupValues[category.id]) return undefined;
        return category.values?.find(v => v.id === lookupValues[category.id]);
    };

    const selectedWorkflow = workflows.find(w => w.id === incident?.workflow?.id);
    const workflowRequiredFields = selectedWorkflow?.required_fields || [];

    // Convert classifications to TreeSelectNode format
    const classificationTree = classifications as unknown as TreeSelectNode[];
    // Convert locations to TreeSelectNode format
    const locationTree = locations as unknown as TreeSelectNode[];

    const updateMutation = useMutation({
        mutationFn: async ({ data, files }: { data: IncidentUpdateRequest; files: File[] }) => {
            const response = await incidentApi.update(id!, data);
            // Upload any new attachments
            if (response.data && files.length > 0) {
                await Promise.all(
                    files.map(file => incidentApi.uploadAttachment(response.data!.id, file))
                );
            }
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
            queryClient.invalidateQueries({ queryKey: ['incident', id] });
            navigate(`/incidents/${id}`);
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to update incident';
            setErrors(prev => ({ ...prev, submit: message }));
        },
    });

    const fetchLocationCoords = async (name: string) => {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json`
        );
        const data = await response.json();

        if (data.length > 0) {
            if (data.length === 1) {
                const { lat, lon } = data[0];
                setFormData(prev => ({ ...prev, latitude: lat, longitude: lon }));
            } else {
                setLocationOptions(data.map((item: any) => ({
                    name: item.display_name,
                    lat: item.lat,
                    lon: item.lon,
                    type: item.type
                })));
                setShowLocationOption(true);
            }
        } else {
            setFormData(prev => ({ ...prev, latitude: undefined, longitude: undefined }));
        }
    };

    const updateNode = (nodes: any[], id: string, callback: (node: any) => void) => {
        for (let node of nodes) {
            if (node.id === id) {
                callback(node);
                return true;
            }
            if (node.children && node.children.length) {
                const found = updateNode(node.children, id, callback);
                if (found) return true;
            }
        }
        return false;
    };

    const handleChange = (field: keyof typeof formData, value: string | IncidentSource | undefined) => {
        if (field === 'location_id' && value) {
            updateNode(locations, value, (node) => {
                fetchLocationCoords(node.name);
            });
        }
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field as string]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleLookupChange = (categoryId: string, value: any) => {
        setLookupValues(prev => ({ ...prev, [categoryId]: value }));
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

    const validFormFields = ['description', 'classification_id', 'assignee_id', 'department_id', 'location_id', 'geolocation', 'due_date'];

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.title?.trim()) newErrors.title = t('incidents.titleRequired');

        if (!formData.classification_id || !formData.classification_id.trim()) {
            newErrors.classification_id = t('incidents.fieldRequired', { field: t('incidents.classification') });
        }
        if (!formData.location_id || !formData.location_id.trim()) {
            newErrors.location_id = t('incidents.fieldRequired', { field: t('incidents.location') });
        }

        // Always require priority (lookup:PRIORITY)
        const priorityCategory = incidentLookupCategories.find(c => c.code === 'PRIORITY');
        if (priorityCategory) {
            const priorityValue = lookupValues[priorityCategory.id];
            if (!priorityValue) {
                newErrors['lookup:PRIORITY'] = t('incidents.fieldRequired', { field: priorityCategory.name });
            }
        }

        for (const field of workflowRequiredFields) {
            if (field === 'classification_id' || field === 'location_id' || field === 'lookup:PRIORITY') {
                continue;
            }

            if (field.startsWith('lookup:')) {
                const categoryCode = field.replace('lookup:', '');
                const category = incidentLookupCategories.find(c => c.code === categoryCode);
                if (category) {
                    const value = lookupValues[category.id];
                    if (category.field_type === 'multiselect') {
                        if (!value || (Array.isArray(value) && value.length === 0)) {
                            newErrors[field] = t('incidents.fieldRequired', { field: category.name });
                        }
                    } else if (!value) {
                        newErrors[field] = t('incidents.fieldRequired', { field: category.name });
                    }
                }
            } else if (field === 'attachments') {
                if (attachments.length === 0 && (!incident?.attachments_count || incident.attachments_count === 0)) {
                    newErrors.attachments = t('incidents.fieldRequired', { field: t('incidents.attachments', 'Attachments') });
                }
            } else if (field === 'geolocation') {
                if (formData.latitude === undefined || formData.longitude === undefined) {
                    newErrors.geolocation = t('incidents.fieldRequired', { field: t('incidents.geolocation', 'Geolocation') });
                }
            } else if (validFormFields.includes(field)) {
                const value = formData[field as keyof typeof formData];
                if (!value || (typeof value === 'string' && !value.trim())) {
                    newErrors[field] = t('incidents.fieldRequired', { field });
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        if (!incident) return;

        const submitData: IncidentUpdateRequest = {
            ...formData,
            version: incident.version,
        };

        // Ensure empty strings are not sent for optional UUID fields
        if (submitData.assignee_id === '') submitData.assignee_id = undefined;
        if (submitData.department_id === '') submitData.department_id = undefined;
        if (submitData.location_id === '') submitData.location_id = undefined;
        if (submitData.classification_id === '') submitData.classification_id = undefined;

        // Separate lookup values by field type
        const selectLookupIds: string[] = [];
        const customLookupFields: Record<string, any> = {};

        for (const [categoryId, value] of Object.entries(lookupValues)) {
            const category = incidentLookupCategories.find(c => c.id === categoryId);
            if (!category) continue;

            const fieldType = category.field_type || 'select';

            if (fieldType === 'select' || fieldType === 'multiselect') {
                if (Array.isArray(value)) {
                    selectLookupIds.push(...value.filter(Boolean));
                } else if (value) {
                    selectLookupIds.push(value);
                }
            } else {
                customLookupFields[`lookup:${category.code}`] = {
                    value: value,
                    field_type: fieldType,
                    category_id: categoryId,
                };
            }
        }

        if (selectLookupIds.length > 0) {
            submitData.lookup_value_ids = selectLookupIds;
        }

        if (Object.keys(customLookupFields).length > 0) {
            submitData.custom_lookup_fields = customLookupFields;
        }

        if (formData.due_date) {
            submitData.due_date = new Date(formData.due_date).toISOString();
        } else {
            submitData.due_date = undefined;
        }

        updateMutation.mutate({ data: submitData, files: attachments });
    };

    const userOptions = [
        { value: '', label: t('incidents.unassigned') },
        ...users.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` })),
    ];

    const departmentOptions = [
        { value: '', label: t('incidents.noDepartment') },
        ...departments.map(d => ({ value: d.id, label: d.name })),
    ];

    // --- Loading / Error states ---
    if (incidentLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
            </div>
        );
    }

    if (incidentError || !incident) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <AlertTriangle className="w-10 h-10 text-red-500" />
                <p className="text-[hsl(var(--foreground))]">{t('incidents.notFound', 'Incident not found.')}</p>
                <Button variant="outline" onClick={() => navigate('/incidents')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('common.back', 'Back')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate(`/incidents/${id}`)}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{t('incidents.editIncident', 'Edit Incident')}</h1>
                    <p className="text-gray-600">
                        {t('incidents.editIncidentSubtitle', 'Update incident')} <span className="font-medium text-[hsl(var(--primary))]">#{incident.incident_number}</span>
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-4">{t('incidents.basicInformation')}</h2>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-[hsl(var(--foreground))]">
                                        {t('incidents.incidentTitle')} <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={formData.title || ''}
                                            readOnly
                                            className="w-full px-4 py-2 bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] cursor-not-allowed"
                                        />
                                        <svg
                                            className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <p className="text-xs text-[hsl(var(--muted-foreground))] italic">
                                        {t('incidents.titleAutoGenerated', 'Title is automatically generated from selected classification, location, and area')}
                                    </p>
                                    {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                                </div>
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

                        {/* Matching Criteria */}
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-4">{t('incidents.matchingCriteria', 'Matching Criteria')}</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <TreeSelect
                                    label={t('incidents.classification')}
                                    data={classificationTree}
                                    value={formData.classification_id || ''}
                                    onChange={(id) => handleChange('classification_id', id)}
                                    placeholder={t('incidents.selectClassification')}
                                    required={true}
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
                                    required={true}
                                    error={errors.location_id}
                                    leafOnly={true}
                                    emptyMessage={t('incidents.noLocations', 'No locations available')}
                                />
                                {incidentLookupCategories
                                    .filter(category => category.code === 'PRIORITY')
                                    .map(category => (
                                        <DynamicLookupField
                                            key={category.id}
                                            category={category}
                                            value={lookupValues[category.id]}
                                            onChange={handleLookupChange}
                                            required={true}
                                            error={errors[`lookup:${category.code}`]}
                                        />
                                    ))}
                            </div>
                        </Card>

                        {/* Additional Details */}
                        {(incidentLookupCategories.some(cat => cat.code !== 'PRIORITY') || workflowRequiredFields.includes('geolocation')) && (
                            <Card className="p-6">
                                <h2 className="text-lg font-semibold mb-4">{t('incidents.additionalDetails', 'Additional Details')}</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    {incidentLookupCategories
                                        .filter(category => category.code !== 'PRIORITY')
                                        .map(category => {
                                            const lookupFieldKey = `lookup:${category.code}`;
                                            const isRequired = workflowRequiredFields.includes(lookupFieldKey as any);
                                            return (
                                                <DynamicLookupField
                                                    key={category.id}
                                                    category={category}
                                                    value={lookupValues[category.id]}
                                                    onChange={handleLookupChange}
                                                    required={isRequired}
                                                    error={errors[lookupFieldKey]}
                                                />
                                            );
                                        })}
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
                        )}

                        {/* Attachments */}
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-4">
                                {t('incidents.attachments', 'Attachments')}
                                {workflowRequiredFields.includes('attachments') && (
                                    <span className="text-red-500 ml-1">*</span>
                                )}
                            </h2>
                            <div className="space-y-4">
                                {/* New attachments to upload */}
                                {incident.attachments_count > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase">{t('incidents.newAttachments', 'New Attachments')}</p>
                                        {incident.attachments?.map((file, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Paperclip className="w-4 h-4 text-gray-500" />
                                                    <span className="text-sm text-gray-700 truncate max-w-[250px]">
                                                        {file.file_name}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        ({(file.file_size / 1024).toFixed(1)} KB)
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
                        {/* Workflow (read-only display) */}
                        <Card className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Zap className="w-5 h-5 text-blue-600" />
                                <h2 className="text-lg font-semibold">{t('incidents.workflow')}</h2>
                            </div>
                            <div className="px-3 py-2 bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded-md text-sm text-[hsl(var(--foreground))]">
                                {incident.workflow?.name || t('incidents.noWorkflow', 'No workflow')}
                            </div>
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                                <Info className="w-3 h-3" />
                                <span>{t('incidents.workflowCannotChange', 'Workflow cannot be changed after creation')}</span>
                            </p>
                        </Card>

                        {/* Assignment */}
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

                        {/* Actions */}
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
                                    isLoading={updateMutation.isPending}
                                >
                                    {t('incidents.saveChanges', 'Save Changes')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => navigate(`/incidents/${id}`)}
                                >
                                    {t('common.cancel')}
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </form>

            {/* Location selection modal */}
            <Modal
                isOpen={showLocationOption}
                showCloseButton={false}
                onClose={() => { }}
            >
                <ModalHeader>
                    <ModalTitle>Select Location</ModalTitle>
                    <ModalDescription>Please select a location</ModalDescription>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-2'>
                        {
                            locationOptions.map(x => (
                                <div className='flex flex-col hover:bg-gray-100 cursor-pointer p-2 rounded-lg' onClick={() => {
                                    setFormData(prev => ({ ...prev, latitude: x.lat, longitude: x.lon }));
                                    setShowLocationOption(false);
                                }}>
                                    <span>{x.name}</span>
                                    <span className='text-gray-500'>Lat: {x.lat} Lon: {x.lon}</span>
                                    <span>{x.type}</span>
                                </div>
                            ))
                        }
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button variant="outline" onClick={() => setShowLocationOption(false)}>
                        {t('common.cancel')}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
