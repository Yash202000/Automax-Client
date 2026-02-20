import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Building2,
  MapPin,
  FolderTree,
  Shield,
  Users,
  Edit2,
  CheckCircle2,
  XCircle,
  Mail,
  ExternalLink,
  X,
  Search,
  UserMinus,
  Plus,
  Users as UsersIcon,
  ChevronDown,
  ChevronRight,
  Check,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { departmentApi, locationApi, classificationApi, roleApi, userApi } from '../../api/admin';
import type { Location, Classification, Role, User, DepartmentUpdateRequest } from '../../types';
import { cn } from '@/lib/utils';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../constants/permissions';
import { toast } from 'sonner';

interface EditFormData {
  name: string;
  code: string;
  description: string;
  type: 'internal' | 'external';
  location_ids: string[];
  classification_ids: string[];
  role_ids: string[];
}

interface TreePickerNodeProps {
  node: Location | Classification;
  selectedIds: string[];
  onToggle: (id: string) => void;
  depth: number;
}

const TreePickerNode: React.FC<TreePickerNodeProps> = ({ node, selectedIds, onToggle, depth }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isSelected = selectedIds.includes(node.id);

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 rounded-lg cursor-pointer select-none transition-colors',
          isSelected
            ? 'bg-[hsl(var(--primary)/0.08)] hover:bg-[hsl(var(--primary)/0.12)]'
            : 'hover:bg-[hsl(var(--muted)/0.5)]'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px`, paddingRight: '8px' }}
        onClick={() => onToggle(node.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="w-5 h-5 flex items-center justify-center flex-shrink-0 rounded hover:bg-[hsl(var(--muted))] transition-colors"
          >
            {expanded
              ? <ChevronDown className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              : <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />}
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}
        <span className={cn(
          'w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors',
          isSelected
            ? 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))]'
            : 'border-[hsl(var(--border))] bg-[hsl(var(--background))]'
        )}>
          {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        </span>
        <span className="text-sm text-[hsl(var(--foreground))] truncate flex-1">{node.name}</span>
        {'type' in node && node.type && (
          <span className="text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded flex-shrink-0 capitalize">
            {node.type}
          </span>
        )}
      </div>
      {hasChildren && expanded &&
        (node.children as Array<Location | Classification>).map((child) => (
          <TreePickerNode
            key={child.id}
            node={child}
            selectedIds={selectedIds}
            onToggle={onToggle}
            depth={depth + 1}
          />
        ))}
    </div>
  );
};

export const DepartmentDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const canEditDepartment = isSuperAdmin || hasPermission(PERMISSIONS.DEPARTMENTS_UPDATE);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'details' | 'users'>('details');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [editingLocations, setEditingLocations] = useState(false);
  const [editingClassifications, setEditingClassifications] = useState(false);
  const [editingRoles, setEditingRoles] = useState(false);
  const [editingUsers, setEditingUsers] = useState(false);
  const [tempLocationIds, setTempLocationIds] = useState<string[]>([]);
  const [tempClassificationIds, setTempClassificationIds] = useState<string[]>([]);
  const [tempRoleIds, setTempRoleIds] = useState<string[]>([]);
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '',
    code: '',
    description: '',
    type: 'internal',
    location_ids: [],
    classification_ids: [],
    role_ids: [],
  });

  const { data: departmentData, isLoading: isLoadingDepartment } = useQuery({
    queryKey: ['admin', 'departments', id],
    queryFn: () => departmentApi.getById(id!),
    enabled: !!id,
  });

  const { data: deptUsersData, isLoading: isLoadingUsers2 } = useQuery({
    queryKey: ['admin', 'dept-users', id],
    queryFn: () => userApi.list(1, 500, '', [], [id!]),
    enabled: !!id,
  });

  const { data: userSearchData, isFetching: userSearchFetching } = useQuery({
    queryKey: ['admin', 'user-search-dept', userSearchTerm],
    queryFn: () => userApi.list(1, 20, userSearchTerm),
    enabled: userSearchTerm.trim().length >= 2,
  });

  const currentDeptUserIds = new Set(
    (deptUsersData?.data as unknown as User[] ?? []).map((u: User) => u.id)
  );
  const userSearchResults = (userSearchData?.data as unknown as User[] ?? []).filter(
    (u: User) => !currentDeptUserIds.has(u.id)
  );

  const addUserMutation = useMutation({
    mutationFn: ({ user }: { user: User }) => {
      const currentDeptIds = (user.departments ?? []).map((d) => d.id);
      const newDeptIds = [...new Set([...currentDeptIds, id!])];
      return userApi.update(user.id, {
        username: user.username,
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        phone: user.phone ?? '',
        department_ids: newDeptIds,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'dept-users', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-search-dept', userSearchTerm] });
      toast.success('User added to department');
    },
    onError: () => toast.error('Failed to add user'),
  });

  const removeUserMutation = useMutation({
    mutationFn: ({ user }: { user: User }) => {
      const newDeptIds = (user.departments ?? [])
        .filter((d) => d.id !== id)
        .map((d) => d.id);
      return userApi.update(user.id, {
        username: user.username,
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        phone: user.phone ?? '',
        department_ids: newDeptIds,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'dept-users', id] });
      toast.success('User removed from department');
    },
    onError: () => toast.error('Failed to remove user'),
  });

  const { data: locationsData } = useQuery({
    queryKey: ['admin', 'locations', 'tree'],
    queryFn: () => locationApi.getTree(),
    enabled: isEditModalOpen || editingLocations,
  });

  const { data: classificationsData } = useQuery({
    queryKey: ['admin', 'classifications', 'tree'],
    queryFn: () => classificationApi.getTree(),
    enabled: isEditModalOpen || editingClassifications,
  });

  const { data: rolesData } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => roleApi.list(),
    enabled: isEditModalOpen || editingRoles,
  });

  const updateMutation = useMutation({
    mutationFn: (data: DepartmentUpdateRequest) => departmentApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
      toast.success(t('departments.departmentUpdated'));
      setIsEditModalOpen(false);
    },
    onError: () => toast.error(t('departments.failedToUpdate')),
  });

  const saveLocationsMutation = useMutation({
    mutationFn: (locationIds: string[]) =>
      departmentApi.update(id!, {
        name: departmentData?.data?.name ?? '',
        code: departmentData?.data?.code ?? '',
        description: departmentData?.data?.description ?? '',
        type: (departmentData?.data?.type as 'internal' | 'external') ?? 'internal',
        location_ids: locationIds,
        classification_ids: departmentData?.data?.classifications?.map((c) => c.id) ?? [],
        role_ids: departmentData?.data?.roles?.map((r) => r.id) ?? [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
      toast.success(t('departments.departmentUpdated'));
      setEditingLocations(false);
    },
    onError: () => toast.error(t('departments.failedToUpdate')),
  });

  const saveClassificationsMutation = useMutation({
    mutationFn: (classificationIds: string[]) =>
      departmentApi.update(id!, {
        name: departmentData?.data?.name ?? '',
        code: departmentData?.data?.code ?? '',
        description: departmentData?.data?.description ?? '',
        type: (departmentData?.data?.type as 'internal' | 'external') ?? 'internal',
        location_ids: departmentData?.data?.locations?.map((l) => l.id) ?? [],
        classification_ids: classificationIds,
        role_ids: departmentData?.data?.roles?.map((r) => r.id) ?? [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
      toast.success(t('departments.departmentUpdated'));
      setEditingClassifications(false);
    },
    onError: () => toast.error(t('departments.failedToUpdate')),
  });

  const saveRolesMutation = useMutation({
    mutationFn: (roleIds: string[]) =>
      departmentApi.update(id!, {
        name: departmentData?.data?.name ?? '',
        code: departmentData?.data?.code ?? '',
        description: departmentData?.data?.description ?? '',
        type: (departmentData?.data?.type as 'internal' | 'external') ?? 'internal',
        location_ids: departmentData?.data?.locations?.map((l) => l.id) ?? [],
        classification_ids: departmentData?.data?.classifications?.map((c) => c.id) ?? [],
        role_ids: roleIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
      toast.success(t('departments.departmentUpdated'));
      setEditingRoles(false);
    },
    onError: () => toast.error(t('departments.failedToUpdate')),
  });

  const department = departmentData?.data;
  const departmentUsers = (deptUsersData?.data as unknown as User[]) || [];

  const openEditModal = () => {
    if (!department) return;
    setEditForm({
      name: department.name,
      code: department.code,
      description: department.description || '',
      type: (department.type as 'internal' | 'external') || 'internal',
      location_ids: department.locations?.map((l) => l.id) || [],
      classification_ids: department.classifications?.map((c) => c.id) || [],
      role_ids: department.roles?.map((r) => r.id) || [],
    });
    setModalTab('details');
    setUserSearchTerm('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      name: editForm.name,
      code: editForm.code,
      description: editForm.description,
      type: editForm.type,
      location_ids: editForm.location_ids,
      classification_ids: editForm.classification_ids,
      role_ids: editForm.role_ids,
    });
  };

  const toggleItem = (field: 'location_ids' | 'classification_ids' | 'role_ids', itemId: string) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(itemId)
        ? prev[field].filter((i) => i !== itemId)
        : [...prev[field], itemId],
    }));
  };

  if (isLoadingDepartment) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[hsl(var(--muted-foreground))]">{t('departments.loadingDepartment')}</p>
        </div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-[hsl(var(--destructive)/0.1)] rounded-2xl flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-[hsl(var(--destructive))]" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{t('departments.departmentNotFound')}</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6 text-center max-w-sm">
            {t('departments.departmentNotFoundDesc')}
          </p>
          <Button onClick={() => navigate('/admin/departments')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            {t('departments.backToDepartments')}
          </Button>
        </div>
      </div>
    );
  }

  const deptType = department.type || 'internal';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin/departments')}
            className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('departments.backToDepartments')}
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-2xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.25)]">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">{department.name}</h1>
                <span
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-full",
                    department.is_active
                      ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                      : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                  )}
                >
                  {department.is_active ? t('departments.active') : t('departments.inactive')}
                </span>
                <span
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-full",
                    deptType === 'internal'
                      ? 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
                      : 'bg-amber-100 text-amber-700'
                  )}
                >
                  {deptType === 'internal' ? t('departments.typeInternal') : t('departments.typeExternal')}
                </span>
              </div>
              <p className="text-[hsl(var(--muted-foreground))] mt-1 font-mono text-sm">{department.code}</p>
            </div>
          </div>
          {department.description && (
            <p className="text-[hsl(var(--muted-foreground))] mt-3 ml-[4.5rem] max-w-xl">
              {department.description}
            </p>
          )}
        </div>
        {canEditDepartment && (
          <Button
            variant="outline"
            onClick={openEditModal}
            leftIcon={<Edit2 className="w-4 h-4" />}
          >
            {t('departments.editDepartment')}
          </Button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[hsl(var(--primary)/0.1)] rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{department.locations?.length || 0}</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.locations')}</p>
            </div>
          </div>
        </div>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[hsl(var(--accent)/0.1)] rounded-xl flex items-center justify-center">
              <FolderTree className="w-5 h-5 text-[hsl(var(--accent))]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{department.classifications?.length || 0}</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.classifications')}</p>
            </div>
          </div>
        </div>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[hsl(var(--success)/0.1)] rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-[hsl(var(--success))]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{department.roles?.length || 0}</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.roles')}</p>
            </div>
          </div>
        </div>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[hsl(var(--warning)/0.1)] rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-[hsl(var(--warning))]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{departmentUsers.length}</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.users')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Locations */}
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[hsl(var(--primary)/0.1)] rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-[hsl(var(--primary))]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">{t('departments.locations')}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {editingLocations ? tempLocationIds.length : (department.locations?.length || 0)} {t('departments.assigned')}
                  </p>
                </div>
              </div>
              {canEditDepartment && (
                <button
                  onClick={() => {
                    if (!editingLocations) {
                      setTempLocationIds(department.locations?.map((l) => l.id) || []);
                    }
                    setEditingLocations((v) => !v);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  {editingLocations ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
          <div className="p-4">
            {editingLocations ? (
              <>
                <div className="border border-[hsl(var(--border))] rounded-xl max-h-64 overflow-y-auto p-1 mb-3">
                  {(locationsData?.data as Location[] | undefined)?.map((loc) => (
                    <TreePickerNode
                      key={loc.id}
                      node={loc}
                      selectedIds={tempLocationIds}
                      onToggle={(itemId) =>
                        setTempLocationIds((prev) =>
                          prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId]
                        )
                      }
                      depth={0}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {tempLocationIds.length} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" type="button" onClick={() => setEditingLocations(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => saveLocationsMutation.mutate(tempLocationIds)}
                      disabled={saveLocationsMutation.isPending}
                    >
                      {saveLocationsMutation.isPending ? t('departments.saving') : t('departments.saveChanges')}
                    </Button>
                  </div>
                </div>
              </>
            ) : department.locations && department.locations.length > 0 ? (
              <div className="space-y-2">
                {[...department.locations].sort((a, b) => (a.level ?? 0) - (b.level ?? 0)).map((location: Location) => (
                  <div
                    key={location.id}
                    className="flex items-center justify-between p-3 bg-[hsl(var(--muted)/0.5)] rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                    style={{ paddingLeft: `${((location.level ?? 0) * 12) + 12}px` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[hsl(var(--primary)/0.1)] rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-[hsl(var(--primary))]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">{location.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {location.type && (
                            <span className="text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.5 rounded capitalize">
                              {location.type}
                            </span>
                          )}
                          {location.code && (
                            <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{location.code}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded-md flex-shrink-0",
                        location.is_active
                          ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                          : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                      )}
                    >
                      {location.is_active ? t('departments.active') : t('departments.inactive')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="w-10 h-10 text-[hsl(var(--muted-foreground)/0.5)] mx-auto mb-2" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.noLocationsAssigned')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Classifications */}
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[hsl(var(--accent)/0.1)] rounded-lg flex items-center justify-center">
                  <FolderTree className="w-4 h-4 text-[hsl(var(--accent))]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">{t('departments.classifications')}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {editingClassifications ? tempClassificationIds.length : (department.classifications?.length || 0)} {t('departments.assigned')}
                  </p>
                </div>
              </div>
              {canEditDepartment && (
                <button
                  onClick={() => {
                    if (!editingClassifications) {
                      setTempClassificationIds(department.classifications?.map((c) => c.id) || []);
                    }
                    setEditingClassifications((v) => !v);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  {editingClassifications ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
          <div className="p-4">
            {editingClassifications ? (
              <>
                <div className="border border-[hsl(var(--border))] rounded-xl max-h-64 overflow-y-auto p-1 mb-3">
                  {(classificationsData?.data as Classification[] | undefined)?.map((cls) => (
                    <TreePickerNode
                      key={cls.id}
                      node={cls}
                      selectedIds={tempClassificationIds}
                      onToggle={(itemId) =>
                        setTempClassificationIds((prev) =>
                          prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId]
                        )
                      }
                      depth={0}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {tempClassificationIds.length} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" type="button" onClick={() => setEditingClassifications(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => saveClassificationsMutation.mutate(tempClassificationIds)}
                      disabled={saveClassificationsMutation.isPending}
                    >
                      {saveClassificationsMutation.isPending ? t('departments.saving') : t('departments.saveChanges')}
                    </Button>
                  </div>
                </div>
              </>
            ) : department.classifications && department.classifications.length > 0 ? (
              <div className="space-y-2">
                {[...department.classifications].sort((a, b) => (a.level ?? 0) - (b.level ?? 0)).map((classification: Classification) => (
                  <div
                    key={classification.id}
                    className="flex items-center justify-between p-3 bg-[hsl(var(--muted)/0.5)] rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                    style={{ paddingLeft: `${((classification.level ?? 0) * 12) + 12}px` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[hsl(var(--accent)/0.1)] rounded-lg flex items-center justify-center flex-shrink-0">
                        <FolderTree className="w-4 h-4 text-[hsl(var(--accent))]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">{classification.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {classification.type && classification.type !== 'both' && classification.type !== 'all' && (
                            <span className="text-xs font-medium bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] px-1.5 py-0.5 rounded capitalize">
                              {classification.type}
                            </span>
                          )}
                          {classification.description && (
                            <p className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-[180px]">
                              {classification.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded-md flex-shrink-0",
                        classification.is_active
                          ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                          : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                      )}
                    >
                      {classification.is_active ? t('departments.active') : t('departments.inactive')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FolderTree className="w-10 h-10 text-[hsl(var(--muted-foreground)/0.5)] mx-auto mb-2" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.noClassificationsAssigned')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Roles */}
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[hsl(var(--success)/0.1)] rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[hsl(var(--success))]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">{t('departments.roles')}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {editingRoles ? tempRoleIds.length : (department.roles?.length || 0)} {t('departments.assigned')}
                  </p>
                </div>
              </div>
              {canEditDepartment && (
                <button
                  onClick={() => {
                    if (!editingRoles) {
                      setTempRoleIds(department.roles?.map((r) => r.id) || []);
                    }
                    setEditingRoles((v) => !v);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  {editingRoles ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
          <div className="p-4">
            {editingRoles ? (
              <>
                <div className="border border-[hsl(var(--border))] rounded-xl max-h-64 overflow-y-auto p-1 mb-3">
                  {(rolesData?.data as Role[] | undefined)?.map((role) => {
                    const isSelected = tempRoleIds.includes(role.id);
                    return (
                      <div
                        key={role.id}
                        onClick={() => setTempRoleIds((prev) =>
                          prev.includes(role.id) ? prev.filter((x) => x !== role.id) : [...prev, role.id]
                        )}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer select-none transition-colors',
                          isSelected
                            ? 'bg-[hsl(var(--primary)/0.08)] hover:bg-[hsl(var(--primary)/0.12)]'
                            : 'hover:bg-[hsl(var(--muted)/0.5)]'
                        )}
                      >
                        <span className={cn(
                          'w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors',
                          isSelected
                            ? 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))]'
                            : 'border-[hsl(var(--border))] bg-[hsl(var(--background))]'
                        )}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{role.name}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono">{role.code}</p>
                        </div>
                        <span className="text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded flex-shrink-0">
                          {role.permissions?.length || 0} perms
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {tempRoleIds.length} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" type="button" onClick={() => setEditingRoles(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => saveRolesMutation.mutate(tempRoleIds)}
                      disabled={saveRolesMutation.isPending}
                    >
                      {saveRolesMutation.isPending ? t('departments.saving') : t('departments.saveChanges')}
                    </Button>
                  </div>
                </div>
              </>
            ) : department.roles && department.roles.length > 0 ? (
              <div className="space-y-2">
                {department.roles.map((role: Role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-3 bg-[hsl(var(--muted)/0.5)] rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[hsl(var(--success)/0.1)] rounded-lg flex items-center justify-center">
                        <Shield className="w-4 h-4 text-[hsl(var(--success))]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">{role.name}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono">{role.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-md">
                        {role.permissions?.length || 0} {t('departments.permissions')}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 text-xs font-medium rounded-md",
                          role.is_active
                            ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                            : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                        )}
                      >
                        {role.is_active ? t('departments.active') : t('departments.inactive')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="w-10 h-10 text-[hsl(var(--muted-foreground)/0.5)] mx-auto mb-2" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.noRolesAssigned')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Users */}
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[hsl(var(--warning)/0.1)] rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-[hsl(var(--warning))]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">{t('departments.users')}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{departmentUsers.length} {t('departments.members')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!editingUsers && (
                  <button
                    onClick={() => navigate('/admin/users')}
                    className="flex items-center gap-1 text-xs text-[hsl(var(--primary))] hover:underline"
                  >
                    {t('departments.viewAll')} <ExternalLink className="w-3 h-3" />
                  </button>
                )}
                {canEditDepartment && (
                  <button
                    onClick={() => {
                      setUserSearchTerm('');
                      setEditingUsers((v) => !v);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                  >
                    {editingUsers ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="p-4">
            {isLoadingUsers2 ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.loadingUsers')}</p>
              </div>
            ) : editingUsers ? (
              <div className="space-y-3">
                {/* Search to add */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  <input
                    type="text"
                    placeholder="Search users to add..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                  />
                  {userSearchFetching && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                {userSearchTerm.trim().length >= 2 && (
                  <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                    {!userSearchFetching && userSearchResults.length === 0 ? (
                      <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">No users found</p>
                    ) : (
                      userSearchResults.map((user: User) => (
                        <div key={user.id} className="flex items-center gap-3 px-3 py-2 border-b border-[hsl(var(--border))] last:border-b-0 hover:bg-[hsl(var(--muted)/0.4)] transition-colors">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.username} className="w-7 h-7 rounded-lg object-cover ring-1 ring-[hsl(var(--border))] flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-white">{user.first_name?.[0] || user.username[0]}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                              {user.first_name || user.last_name ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() : user.username}
                            </p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{user.email}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addUserMutation.mutate({ user })}
                            disabled={addUserMutation.isPending}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-colors disabled:opacity-50 flex-shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {/* Members list with remove */}
                {departmentUsers.length > 0 ? (
                  <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    {departmentUsers.map((user: User) => (
                      <div key={user.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-[hsl(var(--border))] last:border-b-0 hover:bg-[hsl(var(--muted)/0.4)] transition-colors group">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-lg object-cover ring-1 ring-[hsl(var(--border))] flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-white">{user.first_name?.[0] || user.username[0]}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                            {user.first_name || user.last_name ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() : user.username}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] truncate">
                            <Mail className="w-3 h-3 flex-shrink-0" />{user.email}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeUserMutation.mutate({ user })}
                          disabled={removeUserMutation.isPending}
                          title="Remove from department"
                          className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 disabled:opacity-50"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Users className="w-8 h-8 text-[hsl(var(--muted-foreground)/0.5)] mx-auto mb-2" />
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.noUsersInDepartment')}</p>
                  </div>
                )}
              </div>
            ) : departmentUsers.length > 0 ? (
              <div className="space-y-2">
                {departmentUsers.slice(0, 5).map((user: User) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-[hsl(var(--muted)/0.5)] rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="w-8 h-8 rounded-lg object-cover ring-1 ring-[hsl(var(--border))]"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {user.first_name?.[0] || user.username[0]}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                          {user.first_name} {user.last_name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md",
                        user.is_active
                          ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                          : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                      )}
                    >
                      {user.is_active ? (
                        <><CheckCircle2 className="w-3 h-3" /> {t('departments.active')}</>
                      ) : (
                        <><XCircle className="w-3 h-3" /> {t('departments.inactive')}</>
                      )}
                    </span>
                  </div>
                ))}
                {departmentUsers.length > 5 && (
                  <button
                    onClick={() => navigate('/admin/users')}
                    className="w-full text-center py-2 text-sm text-[hsl(var(--primary))] hover:underline"
                  >
                    {t('departments.moreUsers', { count: departmentUsers.length - 5 })}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-[hsl(var(--muted-foreground)/0.5)] mx-auto mb-2" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.noUsersInDepartment')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[hsl(var(--primary)/0.1)] rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[hsl(var(--primary))]" />
                </div>
                <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">{t('departments.editDepartment')}</h2>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Bar */}
            <div className="flex border-b border-[hsl(var(--border))] px-6">
              <button
                type="button"
                onClick={() => setModalTab('details')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  modalTab === 'details'
                    ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                    : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                )}
              >
                <Building2 className="w-4 h-4" />
                Details
              </button>
              <button
                type="button"
                onClick={() => setModalTab('users')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  modalTab === 'users'
                    ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                    : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                )}
              >
                <UsersIcon className="w-4 h-4" />
                Users
                <span className="px-1.5 py-0.5 text-xs font-semibold bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded">
                  {(deptUsersData?.data as unknown as User[] ?? []).length}
                </span>
              </button>
            </div>

            {/* Users Tab */}
            {modalTab === 'users' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Search to add */}
                <div>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <input
                      type="text"
                      placeholder="Search users to add..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    />
                    {userSearchFetching && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  {userSearchTerm.trim().length >= 2 && (
                    <div className="mt-2 border border-[hsl(var(--border))] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                      {!userSearchFetching && userSearchResults.length === 0 ? (
                        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-5">No users found</p>
                      ) : (
                        userSearchResults.map((user: User) => (
                          <div key={user.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[hsl(var(--border))] last:border-b-0 hover:bg-[hsl(var(--muted)/0.4)] transition-colors">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-lg object-cover ring-1 ring-[hsl(var(--border))] flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-semibold text-white">{user.first_name?.[0] || user.username[0]}</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                                {user.first_name || user.last_name ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() : user.username}
                              </p>
                              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{user.email}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addUserMutation.mutate({ user })}
                              disabled={addUserMutation.isPending}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-colors disabled:opacity-50 flex-shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                  <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    Current members ({(deptUsersData?.data as unknown as User[] ?? []).length})
                  </span>
                  <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                </div>

                {/* Members list */}
                {isLoadingUsers2 ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[hsl(var(--border))] animate-pulse">
                        <div className="w-9 h-9 rounded-lg bg-[hsl(var(--muted))]" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 bg-[hsl(var(--muted))] rounded w-1/3" />
                          <div className="h-3 bg-[hsl(var(--muted))] rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : departmentUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-10 h-10 rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center mb-2">
                      <UsersIcon className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                    </div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">No users assigned yet</p>
                  </div>
                ) : (
                  <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {departmentUsers.map((user: User) => (
                      <div key={user.id} className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))] last:border-b-0 hover:bg-[hsl(var(--muted)/0.4)] transition-colors group">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.username} className="w-9 h-9 rounded-lg object-cover ring-1 ring-[hsl(var(--border))] flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-white">{user.first_name?.[0] || user.username[0]}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                            {user.first_name || user.last_name ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() : user.username}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] truncate">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            {user.email}
                          </div>
                        </div>
                        <span className={cn(
                          "hidden sm:inline-flex px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0",
                          user.is_active
                            ? "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]"
                            : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                        )}>
                          {user.is_active ? t('departments.active') : t('departments.inactive')}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeUserMutation.mutate({ user })}
                          disabled={removeUserMutation.isPending}
                          title="Remove from department"
                          className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 disabled:opacity-50"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Details Tab */}
            {modalTab === 'details' && (
            <>
            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Name & Code */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('departments.name')}</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('departments.code')}</label>
                  <input
                    type="text"
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    required
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('departments.type')}</label>
                <div className="flex gap-3">
                  {(['internal', 'external'] as const).map((typeOpt) => (
                    <button
                      key={typeOpt}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, type: typeOpt })}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                        editForm.type === typeOpt
                          ? typeOpt === 'internal'
                            ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]'
                            : 'bg-amber-500 text-white border-amber-500'
                          : 'bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]'
                      }`}
                    >
                      {typeOpt === 'internal' ? t('departments.typeInternal') : t('departments.typeExternal')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('departments.description')}</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all resize-none"
                />
              </div>

              {/* Locations */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  <label className="text-sm font-medium text-[hsl(var(--foreground))]">{t('departments.locations')}</label>
                  <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-md">
                    {editForm.location_ids.length} selected
                  </span>
                </div>
                <div className="border border-[hsl(var(--border))] rounded-xl max-h-48 overflow-y-auto p-1">
                  {(locationsData?.data as Location[] | undefined)?.map((loc) => (
                    <TreePickerNode
                      key={loc.id}
                      node={loc}
                      selectedIds={editForm.location_ids}
                      onToggle={(id) => toggleItem('location_ids', id)}
                      depth={0}
                    />
                  ))}
                </div>
              </div>

              {/* Classifications */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FolderTree className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  <label className="text-sm font-medium text-[hsl(var(--foreground))]">{t('departments.classifications')}</label>
                  <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-md">
                    {editForm.classification_ids.length} selected
                  </span>
                </div>
                <div className="border border-[hsl(var(--border))] rounded-xl max-h-48 overflow-y-auto p-1">
                  {(classificationsData?.data as Classification[] | undefined)?.map((cls) => (
                    <TreePickerNode
                      key={cls.id}
                      node={cls}
                      selectedIds={editForm.classification_ids}
                      onToggle={(id) => toggleItem('classification_ids', id)}
                      depth={0}
                    />
                  ))}
                </div>
              </div>

              {/* Roles */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  <label className="text-sm font-medium text-[hsl(var(--foreground))]">{t('departments.roles')}</label>
                  <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-md">
                    {editForm.role_ids.length} selected
                  </span>
                </div>
                <div className="border border-[hsl(var(--border))] rounded-xl max-h-32 overflow-y-auto p-3 flex flex-wrap gap-2">
                  {(rolesData?.data as Role[] | undefined)?.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleItem('role_ids', role.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                        editForm.role_ids.includes(role.id)
                          ? 'bg-[hsl(var(--success))] text-white border-[hsl(var(--success))]'
                          : 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:border-[hsl(var(--success))]'
                      }`}
                    >
                      {role.name}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))]">
              <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                onClick={handleEditSubmit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? t('departments.saving') : t('departments.saveChanges')}
              </Button>
            </div>
            </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
