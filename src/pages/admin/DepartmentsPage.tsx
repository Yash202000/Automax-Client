import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
} from 'lucide-react';
import { departmentApi, locationApi, classificationApi, roleApi } from '../../api/admin';
import type { Department, DepartmentCreateRequest, DepartmentUpdateRequest, Location, Classification, Role } from '../../types';
import { cn } from '@/lib/utils';
import { Button } from '../../components/ui';

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
}

const TreeNode: React.FC<TreeNodeProps> = ({ department, level, onView, onAdd, onEdit, onDelete }) => {
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
            {department.is_active ? 'Active' : 'Inactive'}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onAdd(department.id, department.name)}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.1)] rounded-lg transition-colors"
              title="Add Child Department"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => onView(department.id)}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(department)}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(department.id)}
              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DepartmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState<DepartmentFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const openCreateModal = (parentId: string = '', parentName: string = '') => {
    setEditingDepartment(null);
    setFormData({
      ...initialFormData,
      parent_id: parentId,
      parent_name: parentName,
    });
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
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDepartment(null);
    setFormData(initialFormData);
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <Building2 className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">Departments</h2>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">Manage organizational departments and hierarchy</p>
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
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Department Hierarchy</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {treeData?.data?.length || 0} root departments
              </p>
            </div>
          </div>
          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-colors text-sm font-medium shadow-md shadow-[hsl(var(--primary)/0.25)]"
          >
            <Plus className="w-4 h-4" />
            Add Root Department
          </button>
        </div>

        {/* Tree Content */}
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[hsl(var(--muted-foreground))]">Loading departments...</p>
          </div>
        ) : treeData?.data?.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[hsl(var(--primary)/0.25)]">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">No departments yet</h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">Create your first department to organize your team</p>
            <Button onClick={() => openCreateModal()} leftIcon={<Plus className="w-4 h-4" />}>
              Create Department
            </Button>
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
              />
            ))}
          </div>
        )}
      </div>

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
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Delete Department</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    Are you sure you want to delete this department? All child departments will also be deleted.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(deleteConfirm)}
                  isLoading={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Department'}
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
                    {editingDepartment ? 'Edit Department' : 'Create Department'}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {editingDepartment
                      ? 'Update department details'
                      : formData.parent_name
                        ? `Adding under "${formData.parent_name}"`
                        : 'Add a new root department'
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

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6 space-y-5">
                {/* Parent Info Banner (when adding child) */}
                {!editingDepartment && formData.parent_name && (
                  <div className="flex items-center gap-3 p-3 bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.2)] rounded-xl">
                    <Building2 className="w-5 h-5 text-[hsl(var(--primary))]" />
                    <div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Parent Department</p>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">{formData.parent_name}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Engineering"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Code</label>
                    <input
                      type="text"
                      placeholder="e.g., ENG"
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
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Parent Department</label>
                    <select
                      value={formData.parent_id}
                      onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    >
                      <option value="">None (Root Level)</option>
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
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Description</label>
                  <textarea
                    placeholder="Describe this department..."
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
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">Locations</label>
                    <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-md">
                      {formData.location_ids.length} selected
                    </span>
                  </div>
                  <div className="border border-[hsl(var(--border))] rounded-xl max-h-32 overflow-y-auto p-3">
                    <div className="flex flex-wrap gap-2">
                      {locationsData?.data?.length === 0 ? (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">No locations available</p>
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
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">Classifications</label>
                    <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] rounded-md">
                      {formData.classification_ids.length} selected
                    </span>
                  </div>
                  <div className="border border-[hsl(var(--border))] rounded-xl max-h-32 overflow-y-auto p-3">
                    <div className="flex flex-wrap gap-2">
                      {classificationsData?.data?.length === 0 ? (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">No classifications available</p>
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
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">Default Roles</label>
                    <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] rounded-md">
                      {formData.role_ids.length} selected
                    </span>
                  </div>
                  <div className="border border-[hsl(var(--border))] rounded-xl max-h-32 overflow-y-auto p-3">
                    <div className="flex flex-wrap gap-2">
                      {rolesData?.data?.length === 0 ? (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">No roles available</p>
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

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
                <Button variant="ghost" type="button" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={createMutation.isPending || updateMutation.isPending}
                  leftIcon={!(createMutation.isPending || updateMutation.isPending) ? <Check className="w-4 h-4" /> : undefined}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingDepartment
                    ? 'Update'
                    : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
