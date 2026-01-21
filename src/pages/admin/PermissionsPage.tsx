import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Key,
  Filter,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { permissionApi } from '../../api/admin';
import type { Permission, PermissionCreateRequest, PermissionUpdateRequest } from '../../types';
import { cn } from '@/lib/utils';
import { Button } from '../../components/ui';

interface PermissionFormData {
  name: string;
  code: string;
  description: string;
  module: string;
  action: string;
}

const initialFormData: PermissionFormData = {
  name: '',
  code: '',
  description: '',
  module: '',
  action: '',
};

const actionColors: Record<string, string> = {
  create: 'from-[hsl(var(--success))] to-teal-500',
  view: 'from-blue-500 to-cyan-500',
  update: 'from-[hsl(var(--warning))] to-orange-500',
  delete: 'from-[hsl(var(--destructive))] to-pink-500',
  manage: 'from-[hsl(var(--primary))] to-[hsl(var(--accent))]',
};

const actionBadgeColors: Record<string, string> = {
  create: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
  view: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  update: 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]',
  delete: 'bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]',
  manage: 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]',
};

export const PermissionsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [formData, setFormData] = useState<PermissionFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: modulesData } = useQuery({
    queryKey: ['admin', 'permission-modules'],
    queryFn: () => permissionApi.getModules(),
  });

  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ['admin', 'permissions', selectedModule],
    queryFn: () => permissionApi.list(selectedModule || undefined),
  });

  const createMutation = useMutation({
    mutationFn: (data: PermissionCreateRequest) => permissionApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'permissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'permission-modules'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PermissionUpdateRequest }) =>
      permissionApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'permissions'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => permissionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'permissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'permission-modules'] });
      setDeleteConfirm(null);
    },
  });

  const openCreateModal = () => {
    setEditingPermission(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (permission: Permission) => {
    setEditingPermission(permission);
    setFormData({
      name: permission.name,
      code: permission.code,
      description: permission.description,
      module: permission.module,
      action: permission.action,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPermission(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPermission) {
      updateMutation.mutate({
        id: editingPermission.id,
        data: {
          name: formData.name,
          description: formData.description,
        },
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        code: formData.code,
        description: formData.description,
        module: formData.module,
        action: formData.action,
      });
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

  // Filter by search query
  const filteredGroupedPermissions = Object.entries(groupedPermissions).reduce(
    (acc: Record<string, Permission[]>, [module, perms]) => {
      if (!searchQuery) {
        acc[module] = perms;
        return acc;
      }
      const filtered = perms.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[module] = filtered;
      }
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <Key className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">{t('permissions.title')}</h2>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">{t('permissions.subtitle')}</p>
        </div>
        <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          {t('permissions.addPermission')}
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder={t('permissions.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
            />
          </div>

          {/* Module Filter */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="px-4 py-2.5 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
            >
              <option value="">{t('permissions.allModules')}</option>
              {modulesData?.data?.map((module: string) => (
                <option key={module} value={module}>
                  {module.charAt(0).toUpperCase() + module.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Permissions by module */}
      {isLoading ? (
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 text-center">
          <div className="w-10 h-10 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[hsl(var(--muted-foreground))]">{t('permissions.loadingPermissions')}</p>
        </div>
      ) : Object.keys(filteredGroupedPermissions).length === 0 ? (
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[hsl(var(--primary)/0.25)]">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{t('permissions.noPermissionsFound')}</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">
            {searchQuery ? t('permissions.adjustSearchQuery') : t('permissions.createFirstPermission')}
          </p>
          {!searchQuery && (
            <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
              {t('permissions.createPermission')}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(filteredGroupedPermissions).map(([module, perms]) => (
            <div key={module} className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden">
              {/* Module Header */}
              <div className="px-6 py-4 bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.2)]">
                    <Key className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] capitalize">{module}</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">{perms.length} {t('permissions.permissionsCount')}</p>
                  </div>
                </div>
              </div>

              {/* Permissions List */}
              <div className="divide-y divide-[hsl(var(--border))]">
                {perms.map((permission: Permission) => (
                  <div
                    key={permission.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-[hsl(var(--muted)/0.5)] transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-md",
                        actionColors[permission.action] || 'from-[hsl(var(--muted-foreground))] to-[hsl(var(--foreground))]'
                      )}>
                        <Key className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">{permission.name}</h4>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono">{permission.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-lg capitalize",
                        actionBadgeColors[permission.action] || 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                      )}>
                        {permission.action}
                      </span>
                      <span
                        className={cn(
                          "px-2.5 py-1 text-xs font-medium rounded-lg",
                          permission.is_active
                            ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                            : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                        )}
                      >
                        {permission.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(permission)}
                          className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(permission.id)}
                          className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">{t('permissions.deleteConfirmTitle')}</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    {t('permissions.deleteConfirmMessage')}
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
                  {deleteMutation.isPending ? t('permissions.deleting') : t('permissions.deletePermission')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.25)]">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {editingPermission ? t('permissions.editPermission') : t('permissions.createPermission')}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {editingPermission ? t('permissions.updatePermissionDetails') : t('permissions.addNewPermission')}
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
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('permissions.name')}</label>
                <input
                  type="text"
                  placeholder="e.g., Create Users"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                  required
                />
              </div>

              {!editingPermission && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('permissions.code')}</label>
                    <input
                      type="text"
                      placeholder="e.g., users:create"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('permissions.module')}</label>
                    <input
                      type="text"
                      placeholder="e.g., users"
                      value={formData.module}
                      onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('permissions.action')}</label>
                    <select
                      value={formData.action}
                      onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                      required
                    >
                      <option value="">{t('permissions.selectAction')}</option>
                      <option value="create">{t('permissions.actionCreate')}</option>
                      <option value="view">{t('permissions.actionView')}</option>
                      <option value="update">{t('permissions.actionUpdate')}</option>
                      <option value="delete">{t('permissions.actionDelete')}</option>
                      <option value="manage">{t('permissions.actionManage')}</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('common.description')}</label>
                <textarea
                  placeholder="Describe what this permission allows..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all resize-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border))]">
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
                    : editingPermission
                    ? t('common.update')
                    : t('common.create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
