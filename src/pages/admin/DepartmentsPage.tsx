import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Building2,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  MapPin,
  Shield,
  FolderTree,
  Eye,
  Download,
  Upload,
  Info,
  Users as UsersIcon,
  UserMinus,
  Mail,
  Search,
} from 'lucide-react';
import { departmentApi, locationApi, classificationApi, roleApi, userApi } from '../../api/admin';
import type { Department, DepartmentCreateRequest, DepartmentUpdateRequest, Location, Classification, Role, User } from '../../types';
import { cn } from '@/lib/utils';
import { Button } from '../../components/ui';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../constants/permissions';
import { toast } from 'sonner';

interface DepartmentFormData {
  name: string;
  code: string;
  description: string;
  parent_id: string;
  parent_name: string;
  location_ids: string[];
  classification_ids: string[];
  role_ids: string[];
}

const initialFormData: DepartmentFormData = {
  name: '',
  code: '',
  description: '',
  parent_id: '',
  parent_name: '',
  location_ids: [],
  classification_ids: [],
  role_ids: [],
};

const levelGradients = [
  'from-[hsl(var(--primary))] to-[hsl(var(--accent))]',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-blue-500 to-cyan-500',
  'from-rose-500 to-pink-500',
];

interface TreeNodeProps {
  department: Department;
  level: number;
  onView: (id: string) => void;
  onAdd: (parentId: string, parentName: string) => void;
  onEdit: (dept: Department) => void;
  onDelete: (id: string) => void;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  t: (key: string) => string;
}

const TreeNode: React.FC<TreeNodeProps> = ({ department, level, onView, onAdd, onEdit, onDelete, canCreate, canEdit, canDelete, t }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = department.children && department.children.length > 0;
  const gradient = levelGradients[level % levelGradients.length];

  return (
    <div>
      <div
        className="flex items-center justify-between py-3.5 px-4 hover:bg-[hsl(var(--muted)/0.5)] transition-colors group"
        style={{ paddingLeft: `${level * 28 + 20}px` }}
      >
        <div className="flex items-center gap-3">
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              )}
            </button>
          ) : (
            <span className="w-7" />
          )}
          <button
            onClick={() => onView(department.id)}
            className={cn("w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-md hover:scale-105 transition-transform", gradient)}
          >
            <Building2 className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => onView(department.id)}
            className="text-left hover:opacity-80 transition-opacity"
          >
            <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors">{department.name}</h4>
            <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono">{department.code}</p>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-lg",
              department.is_active
                ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
            )}
          >
            {department.is_active ? t('departments.active') : t('departments.inactive')}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canCreate && (
              <button
                onClick={() => onAdd(department.id, department.name)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.1)] rounded-lg transition-colors"
                title={t('departments.addChildDepartment')}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onView(department.id)}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
              title={t('departments.viewDetails')}
            >
              <Eye className="w-4 h-4" />
            </button>
            {canEdit && (
              <button
                onClick={() => onEdit(department)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                title={t('common.edit')}
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(department.id)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
                title={t('common.delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {department.children!.map((child) => (
            <TreeNode
              key={child.id}
              department={child}
              level={level + 1}
              onView={onView}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
              canCreate={canCreate}
              canEdit={canEdit}
              canDelete={canDelete}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DepartmentsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState<DepartmentFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [modalTab, setModalTab] = useState<'details' | 'users'>('details');
  const [userSearchTerm, setUserSearchTerm] = useState('');

  const canCreateDepartment = isSuperAdmin || hasPermission(PERMISSIONS.DEPARTMENTS_CREATE);
  const canEditDepartment = isSuperAdmin || hasPermission(PERMISSIONS.DEPARTMENTS_UPDATE);
  const canDeleteDepartment = isSuperAdmin || hasPermission(PERMISSIONS.DEPARTMENTS_DELETE);

  // Handle edit state from navigation (e.g., from DepartmentDetailPage)
  useEffect(() => {
    const state = location.state as { editDepartment?: Department } | null;
    if (state?.editDepartment) {
      const dept = state.editDepartment;
      setEditingDepartment(dept);
      setFormData({
        name: dept.name,
        code: dept.code,
        description: dept.description || '',
        parent_id: dept.parent_id || '',
        parent_name: '', // Parent name will be resolved from tree data if needed
        location_ids: dept.locations?.map((l) => l.id) || [],
        classification_ids: dept.classifications?.map((c) => c.id) || [],
        role_ids: dept.roles?.map((r) => r.id) || [],
      });
      setIsModalOpen(true);
      // Clear the state to prevent reopening on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const handleViewDepartment = (id: string) => {
    navigate(`/admin/departments/${id}`);
  };

  const { data: treeData, isLoading } = useQuery({
    queryKey: ['admin', 'departments', 'tree'],
    queryFn: () => departmentApi.getTree(),
  });

  const { data: departmentsList } = useQuery({
    queryKey: ['admin', 'departments', 'list'],
    queryFn: () => departmentApi.list(),
  });

  const { data: locationsData } = useQuery({
    queryKey: ['admin', 'locations'],
    queryFn: () => locationApi.list(),
  });

  const { data: classificationsData } = useQuery({
    queryKey: ['admin', 'classifications'],
    queryFn: () => classificationApi.list(),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => roleApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: DepartmentCreateRequest) => departmentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DepartmentUpdateRequest }) =>
      departmentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
      setDeleteConfirm(null);
    },
  });

  const { data: deptUsersData, isLoading: deptUsersLoading } = useQuery({
    queryKey: ['admin', 'dept-users', editingDepartment?.id],
    queryFn: () => userApi.list(1, 500, '', [], [editingDepartment!.id]),
    enabled: !!editingDepartment,
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

  const addUserToDeptMutation = useMutation({
    mutationFn: ({ user }: { user: User }) => {
      const currentDeptIds = (user.departments ?? []).map((d) => d.id);
      const newDeptIds = [...new Set([...currentDeptIds, editingDepartment!.id])];
      return userApi.update(user.id, {
        username: user.username,
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        phone: user.phone ?? '',
        department_ids: newDeptIds,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'dept-users', editingDepartment?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-search-dept', userSearchTerm] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User added to department');
    },
    onError: () => toast.error('Failed to add user to department'),
  });

  const removeUserFromDeptMutation = useMutation({
    mutationFn: ({ user }: { user: User }) => {
      const newDeptIds = (user.departments ?? [])
        .filter((d) => d.id !== editingDepartment!.id)
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'dept-users', editingDepartment?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User removed from department');
    },
    onError: () => toast.error('Failed to remove user from department'),
  });

  const openCreateModal = (parentId: string = '', parentName: string = '') => {
    setEditingDepartment(null);
    setFormData({ ...initialFormData, parent_id: parentId, parent_name: parentName });
    setModalTab('details');
    setUserSearchTerm('');
    setIsModalOpen(true);
  };

  const openEditModal = (department: Department) => {
    const parentDept = departmentsList?.data?.find((d: Department) => d.id === department.parent_id);
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      code: department.code,
      description: department.description,
      parent_id: department.parent_id || '',
      parent_name: parentDept?.name || '',
      location_ids: department.locations?.map((l) => l.id) || [],
      classification_ids: department.classifications?.map((c) => c.id) || [],
      role_ids: department.roles?.map((r) => r.id) || [],
    });
    setModalTab('details');
    setUserSearchTerm('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDepartment(null);
    setFormData(initialFormData);
    setModalTab('details');
    setUserSearchTerm('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      code: formData.code,
      description: formData.description,
      parent_id: formData.parent_id || undefined,
      location_ids: formData.location_ids,
      classification_ids: formData.classification_ids,
      role_ids: formData.role_ids,
    };

    if (editingDepartment) {
      updateMutation.mutate({ id: editingDepartment.id, data: payload });
    } else {
      createMutation.mutate(payload as DepartmentCreateRequest);
    }
  };

  const toggleItem = (field: 'location_ids' | 'classification_ids' | 'role_ids', id: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter((i) => i !== id)
        : [...prev[field], id],
    }));
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await departmentApi.export();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `departments_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const result = await departmentApi.import(file);
      setImportResult(result.data || null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <Building2 className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">{t('departments.title')}</h2>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">{t('departments.subtitle')}</p>
        </div>
      </div>

      {/* Department Tree */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden">
        {/* Header with Add Root Button */}
        <div className="px-6 py-4 bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.2)]">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">{t('departments.hierarchy')}</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {treeData?.data?.length || 0} {t('departments.rootDepartments')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--success))] text-white rounded-lg hover:bg-[hsl(var(--success)/0.9)] transition-colors text-sm font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] rounded-lg hover:bg-[hsl(var(--accent)/0.9)] transition-colors text-sm font-medium shadow-md cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{isImporting ? 'Importing...' : 'Import'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={isImporting}
                className="hidden"
              />
            </label>
            {canCreateDepartment && (
              <button
                onClick={() => openCreateModal()}
                className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-colors text-sm font-medium shadow-md shadow-[hsl(var(--primary)/0.25)]"
              >
                <Plus className="w-4 h-4" />
                {t('departments.addRootDepartment')}
              </button>
            )}
          </div>
        </div>

        {/* Tree Content */}
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[hsl(var(--muted-foreground))]">{t('departments.loading')}</p>
          </div>
        ) : treeData?.data?.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[hsl(var(--primary)/0.25)]">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{t('departments.noDepartmentsYet')}</h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">{t('departments.createFirstDepartment')}</p>
            {canCreateDepartment && (
              <Button onClick={() => openCreateModal()} leftIcon={<Plus className="w-4 h-4" />}>
                {t('departments.createDepartment')}
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {treeData?.data?.map((dept: Department) => (
              <TreeNode
                key={dept.id}
                department={dept}
                level={0}
                onView={handleViewDepartment}
                onAdd={openCreateModal}
                onEdit={openEditModal}
                onDelete={setDeleteConfirm}
                canCreate={canCreateDepartment}
                canEdit={canEditDepartment}
                canDelete={canDeleteDepartment}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* Import Result Modal */}
      {importResult && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                  importResult.skipped > 0
                    ? "bg-[hsl(var(--warning)/0.1)]"
                    : "bg-[hsl(var(--success)/0.1)]"
                )}>
                  <Info className={cn(
                    "w-6 h-6",
                    importResult.skipped > 0
                      ? "text-[hsl(var(--warning))]"
                      : "text-[hsl(var(--success))]"
                  )} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Import Complete</h3>
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      <span className="font-medium text-[hsl(var(--success))]">{importResult.imported}</span> departments imported successfully
                    </p>
                    {importResult.skipped > 0 && (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        <span className="font-medium text-[hsl(var(--warning))]">{importResult.skipped}</span> departments skipped
                      </p>
                    )}
                    {importResult.errors.length > 0 && (
                      <div className="mt-3 max-h-40 overflow-y-auto">
                        <p className="text-xs font-medium text-[hsl(var(--destructive))] mb-2">Errors:</p>
                        <ul className="space-y-1">
                          {importResult.errors.map((error, index) => (
                            <li key={index} className="text-xs text-[hsl(var(--muted-foreground))] pl-3">
                              • {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setImportResult(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-[hsl(var(--destructive)/0.1)] rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-[hsl(var(--destructive))]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">{t('departments.deleteConfirmTitle')}</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    {t('departments.deleteConfirmMessage')}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(deleteConfirm)}
                  isLoading={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? t('departments.deleting') : t('departments.deleteDepartment')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.25)]">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {editingDepartment ? t('departments.editDepartment') : t('departments.createDepartment')}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {editingDepartment
                      ? t('departments.updateDetails')
                      : formData.parent_name
                        ? `${t('departments.addingUnder')} "${formData.parent_name}"`
                        : t('departments.addNewRoot')
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab bar — edit mode only */}
            {editingDepartment && (
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
                  {deptUsersData?.data && (
                    <span className="px-1.5 py-0.5 text-xs font-semibold bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded">
                      {(deptUsersData.data as unknown as User[]).length}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* ── Users tab ── */}
              {modalTab === 'users' && editingDepartment && (
                <div className="p-6 space-y-4">
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
                                onClick={() => addUserToDeptMutation.mutate({ user })}
                                disabled={addUserToDeptMutation.isPending}
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
                  {deptUsersLoading ? (
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
                  ) : !(deptUsersData?.data as unknown as User[] ?? []).length ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-10 h-10 rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center mb-2">
                        <UsersIcon className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                      </div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">No users assigned yet</p>
                    </div>
                  ) : (
                    <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                      {(deptUsersData!.data as unknown as User[]).map((user: User) => (
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
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeUserFromDeptMutation.mutate({ user })}
                            disabled={removeUserFromDeptMutation.isPending}
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

              {/* ── Details tab (and create mode) ── */}
              {(modalTab === 'details' || !editingDepartment) && (
              <div className="p-6 space-y-5">
                {/* Parent Info Banner (when adding child) */}
                {!editingDepartment && formData.parent_name && (
                  <div className="flex items-center gap-3 p-3 bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.2)] rounded-xl">
                    <Building2 className="w-5 h-5 text-[hsl(var(--primary))]" />
                    <div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('departments.parentDepartment')}</p>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">{formData.parent_name}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('departments.name')}</label>
                    <input
                      type="text"
                      placeholder={t('departments.namePlaceholder')}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('departments.code')}</label>
                    <input
                      type="text"
                      placeholder={t('departments.codePlaceholder')}
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Only show parent selector when editing */}
                {editingDepartment && (
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('departments.parentDepartment')}</label>
                    <select
                      value={formData.parent_id}
                      onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    >
                      <option value="">{t('departments.noneRootLevel')}</option>
                      {departmentsList?.data
                        ?.filter((d: Department) => d.id !== editingDepartment?.id)
                        .map((dept: Department) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('departments.description')}</label>
                  <textarea
                    placeholder={t('departments.descriptionPlaceholder')}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all resize-none"
                  />
                </div>

                {/* Locations */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">{t('departments.locations')}</label>
                    <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-md">
                      {formData.location_ids.length} {t('common.selected').toLowerCase()}
                    </span>
                  </div>
                  <div className="border border-[hsl(var(--border))] rounded-xl max-h-32 overflow-y-auto p-3">
                    <div className="flex flex-wrap gap-2">
                      {locationsData?.data?.length === 0 ? (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.noLocationsAvailable')}</p>
                      ) : (
                        locationsData?.data?.map((loc: Location) => (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() => toggleItem('location_ids', loc.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                              formData.location_ids.includes(loc.id)
                                ? 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary)/0.2)]'
                                : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
                            )}
                          >
                            {loc.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Classifications */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FolderTree className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">{t('departments.classifications')}</label>
                    <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] rounded-md">
                      {formData.classification_ids.length} {t('common.selected').toLowerCase()}
                    </span>
                  </div>
                  <div className="border border-[hsl(var(--border))] rounded-xl max-h-32 overflow-y-auto p-3">
                    <div className="flex flex-wrap gap-2">
                      {classificationsData?.data?.length === 0 ? (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.noClassificationsAvailable')}</p>
                      ) : (
                        classificationsData?.data?.map((cls: Classification) => (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => toggleItem('classification_ids', cls.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                              formData.classification_ids.includes(cls.id)
                                ? 'bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] ring-2 ring-[hsl(var(--accent)/0.2)]'
                                : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
                            )}
                          >
                            {cls.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Roles */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">{t('departments.defaultRoles')}</label>
                    <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] rounded-md">
                      {formData.role_ids.length} {t('common.selected').toLowerCase()}
                    </span>
                  </div>
                  <div className="border border-[hsl(var(--border))] rounded-xl max-h-32 overflow-y-auto p-3">
                    <div className="flex flex-wrap gap-2">
                      {rolesData?.data?.length === 0 ? (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.noRolesAvailable')}</p>
                      ) : (
                        rolesData?.data?.map((role: Role) => (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => toggleItem('role_ids', role.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                              formData.role_ids.includes(role.id)
                                ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] ring-2 ring-[hsl(var(--success)/0.2)]'
                                : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
                            )}
                          >
                            {role.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
              )} {/* end details tab */}

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
                <Button variant="ghost" type="button" onClick={closeModal}>
                  {t('common.cancel')}
                </Button>
                {(modalTab === 'details' || !editingDepartment) && (
                  <Button
                    type="submit"
                    isLoading={createMutation.isPending || updateMutation.isPending}
                    leftIcon={!(createMutation.isPending || updateMutation.isPending) ? <Check className="w-4 h-4" /> : undefined}
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? t('departments.saving')
                      : editingDepartment
                      ? t('common.update')
                      : t('common.create')}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
