import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Shield,
  Key,
  AlertTriangle,
  Search,
  Sparkles,
  Download,
  Upload,
  Info,
} from 'lucide-react';
import { roleApi, permissionApi } from '../../api/admin';
import type { Role, Permission, RoleCreateRequest, RoleUpdateRequest } from '../../types';
import { cn } from '@/lib/utils';
import { Button } from '../../components/ui';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../constants/permissions';

interface RoleFormData {
  name: string;
  code: string;
  description: string;
  permission_ids: string[];
}

const initialFormData: RoleFormData = {
  name: '',
  code: '',
  description: '',
  permission_ids: [],
};

export const RolesPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<RoleFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  const canCreateRole = isSuperAdmin || hasPermission(PERMISSIONS.ROLES_CREATE);

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: () => roleApi.list(),
  });

  const { data: permissionsData } = useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: () => permissionApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: RoleCreateRequest) => roleApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RoleUpdateRequest }) => roleApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => roleApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      setDeleteConfirm(null);
    },
  });

  const openCreateModal = () => {
    setEditingRole(null);
    setFormData(initialFormData);
    setPermissionSearch('');
    setIsModalOpen(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      code: role.code,
      description: role.description,
      permission_ids: role.permissions?.map((p) => p.id) || [],
    });
    setPermissionSearch('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
    setFormData(initialFormData);
    setPermissionSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRole) {
      updateMutation.mutate({
        id: editingRole.id,
        data: {
          name: formData.name,
          description: formData.description,
          permission_ids: formData.permission_ids,
        },
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        code: formData.code,
        description: formData.description,
        permission_ids: formData.permission_ids,
      });
    }
  };

  const togglePermission = (permId: string) => {
    setFormData((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permId)
        ? prev.permission_ids.filter((id) => id !== permId)
        : [...prev.permission_ids, permId],
    }));
  };

  const selectAllInModule = (modulePerms: Permission[]) => {
    const modulePermIds = modulePerms.map((p) => p.id);
    const allSelected = modulePermIds.every((id) => formData.permission_ids.includes(id));

    if (allSelected) {
      setFormData((prev) => ({
        ...prev,
        permission_ids: prev.permission_ids.filter((id) => !modulePermIds.includes(id)),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        permission_ids: [...new Set([...prev.permission_ids, ...modulePermIds])],
      }));
    }
  };

  const groupedPermissions = permissionsData?.data?.reduce(
    (acc: Record<string, Permission[]>, perm: Permission) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push(perm);
      return acc;
    },
    {} as Record<string, Permission[]>
  ) || {};

  const filteredGroupedPermissions = Object.entries(groupedPermissions).reduce(
    (acc: Record<string, Permission[]>, [module, perms]) => {
      const filtered = perms.filter(
        (p) =>
          p.name.toLowerCase().includes(permissionSearch.toLowerCase()) ||
          p.code.toLowerCase().includes(permissionSearch.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[module] = filtered;
      }
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await roleApi.export();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `roles_export_${new Date().toISOString().split('T')[0]}.json`;
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
      const result = await roleApi.import(file);
      if (result.data) {
        setImportResult(result.data);
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        imported: 0,
        skipped: 0,
        errors: ['Import failed. Please check the file format.'],
      });
    } finally {
      setIsImporting(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  const getRoleGradient = (role: Role) => {
    if (role.is_system) return 'from-amber-500 to-orange-500';
    const gradients = [
      'from-[hsl(var(--primary))] to-[hsl(var(--accent))]',
      'from-blue-500 to-cyan-500',
      'from-emerald-500 to-teal-500',
      'from-rose-500 to-pink-500',
      'from-indigo-500 to-blue-500',
    ];
    const index = role.name.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <Shield className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">{t('roles.title')}</h2>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">{t('roles.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
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
          {canCreateRole && (
            <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
              {t('roles.addRole')}
            </Button>
          )}
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[hsl(var(--muted))] rounded-xl" />
                  <div className="flex-1">
                    <div className="h-5 bg-[hsl(var(--muted))] rounded w-1/2 mb-2" />
                    <div className="h-4 bg-[hsl(var(--muted))] rounded w-3/4" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 bg-[hsl(var(--muted))] rounded w-full" />
                  <div className="h-3 bg-[hsl(var(--muted))] rounded w-2/3" />
                </div>
              </div>
            ))
          : rolesData?.data?.map((role: Role) => (
              <div
                key={role.id}
                className="group relative bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 hover:shadow-xl hover:shadow-[hsl(var(--foreground)/0.05)] hover:border-[hsl(var(--border))] transition-all duration-300"
              >
                {/* Gradient decoration */}
                <div className={cn(
                  "absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity",
                  getRoleGradient(role)
                )} />

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-lg",
                        getRoleGradient(role)
                      )}>
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">{role.name}</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] font-mono">{role.code}</p>
                      </div>
                    </div>

                    {!role.is_system && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(role)}
                          className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(role.id)}
                          className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2 mb-4">
                    {role.description || t('roles.noDescriptionProvided')}
                  </p>

                  <div className="pt-4 border-t border-[hsl(var(--border))]">
                    <div className="flex items-center gap-2 mb-3">
                      <Key className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                        {role.permissions?.length || 0} {t('roles.permissionsCount')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {role.permissions?.slice(0, 4).map((perm) => (
                        <span
                          key={perm.id}
                          className="px-2.5 py-1 text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-lg"
                        >
                          {perm.code}
                        </span>
                      ))}
                      {(role.permissions?.length || 0) > 4 && (
                        <span className="px-2.5 py-1 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-lg">
                          +{role.permissions!.length - 4} {t('roles.more')}
                        </span>
                      )}
                    </div>
                  </div>

                  {role.is_system && (
                    <div className="mt-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg shadow-sm">
                        <Sparkles className="w-3 h-3" />
                        {t('roles.systemRole')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
      </div>

      {/* Empty state */}
      {!isLoading && rolesData?.data?.length === 0 && (
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[hsl(var(--primary)/0.25)]">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{t('roles.noRolesYet')}</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">{t('roles.createFirstRole')}</p>
          {canCreateRole && (
            <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
              {t('roles.createRole')}
            </Button>
          )}
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
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">{t('roles.deleteConfirmTitle')}</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    {t('roles.deleteConfirmMessage')}
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
                  {deleteMutation.isPending ? t('roles.deleting') : t('roles.deleteRole')}
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
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {editingRole ? t('roles.editRole') : t('roles.createRole')}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {editingRole ? t('roles.updateRoleDetails') : t('roles.addNewRole')}
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
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('roles.roleName')}</label>
                  <input
                    type="text"
                    placeholder="e.g., Content Manager"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    required
                  />
                </div>

                {!editingRole && (
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('roles.roleCode')}</label>
                    <input
                      type="text"
                      placeholder="e.g., content_manager"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                      required
                    />
                    <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">{t('roles.roleCodeHint')}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('common.description')}</label>
                  <textarea
                    placeholder="Describe what this role is for..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all resize-none"
                  />
                </div>

                {/* Permissions Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">{t('roles.permissions')}</label>
                    <span className="px-2.5 py-1 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-lg">
                      {formData.permission_ids.length} selected
                    </span>
                  </div>

                  {/* Permission Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <input
                      type="text"
                      placeholder={t('roles.searchPermissions')}
                      value={permissionSearch}
                      onChange={(e) => setPermissionSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    />
                  </div>

                  {/* Permission Groups */}
                  <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {Object.keys(filteredGroupedPermissions).length === 0 ? (
                      <div className="p-6 text-center text-[hsl(var(--muted-foreground))] text-sm">
                        {t('roles.noPermissionsFound')}
                      </div>
                    ) : (
                      Object.entries(filteredGroupedPermissions).map(([module, perms]) => {
                        const allSelected = perms.every((p) =>
                          formData.permission_ids.includes(p.id)
                        );
                        const someSelected = perms.some((p) =>
                          formData.permission_ids.includes(p.id)
                        );

                        return (
                          <div key={module} className="border-b border-[hsl(var(--border))] last:border-b-0">
                            <div className="flex items-center justify-between px-4 py-3 bg-[hsl(var(--muted)/0.5)]">
                              <span className="text-sm font-semibold text-[hsl(var(--foreground))] capitalize">
                                {module}
                              </span>
                              <button
                                type="button"
                                onClick={() => selectAllInModule(perms)}
                                className={cn(
                                  "text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
                                  allSelected
                                    ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                                    : someSelected
                                    ? "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                                    : "bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                                )}
                              >
                                {allSelected ? t('roles.deselectAll') : t('roles.selectAll')}
                              </button>
                            </div>
                            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {perms.map((perm: Permission) => (
                                <label
                                  key={perm.id}
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                                    formData.permission_ids.includes(perm.id)
                                      ? "bg-[hsl(var(--primary)/0.05)] border-2 border-[hsl(var(--primary)/0.3)]"
                                      : "bg-[hsl(var(--background))] border-2 border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground)/0.3)]"
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={formData.permission_ids.includes(perm.id)}
                                    onChange={() => togglePermission(perm.id)}
                                    className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded focus:ring-[hsl(var(--primary))]"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium text-[hsl(var(--foreground))] block truncate">
                                      {perm.name}
                                    </span>
                                    <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">{perm.code}</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
                <Button variant="ghost" type="button" onClick={closeModal}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  isLoading={createMutation.isPending || updateMutation.isPending}
                  leftIcon={!(createMutation.isPending || updateMutation.isPending) ? <Check className="w-4 h-4" /> : undefined}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? t('common.loading')
                    : editingRole
                    ? t('roles.updateRole')
                    : t('roles.createRole')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">Import Complete</h3>
                  <div className="space-y-1">
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      <span className="font-medium text-[hsl(var(--success))]">{importResult.imported}</span> roles imported successfully
                    </p>
                    {importResult.skipped > 0 && (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        <span className="font-medium text-[hsl(var(--warning))]">{importResult.skipped}</span> roles skipped
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
    </div>
  );
};
