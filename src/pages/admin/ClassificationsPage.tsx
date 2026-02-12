import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  FolderTree,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Info,
  Layers,
  Download,
  Upload,
} from 'lucide-react';
import { classificationApi } from '../../api/admin';
import type { Classification, ClassificationCreateRequest, ClassificationUpdateRequest, ClassificationType } from '../../types';
import { cn } from '@/lib/utils';
import { Button } from '../../components/ui';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../constants/permissions';

interface ClassificationFormData {
  name: string;
  description: string;
  parent_id: string;
  parent_name: string;
  sort_order: number;
  type: ClassificationType;
}

const initialFormData: ClassificationFormData = {
  name: '',
  description: '',
  parent_id: '',
  parent_name: '',
  sort_order: 0,
  type: 'both',
};

const levelGradients = [
  'from-[hsl(var(--primary))] to-[hsl(var(--accent))]',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-blue-500 to-cyan-500',
  'from-rose-500 to-pink-500',
];

const levelBadgeColors = [
  'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]',
  'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
  'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]',
];

interface TreeNodeProps {
  classification: Classification;
  level: number;
  onAdd: (parentId: string, parentName: string) => void;
  onEdit: (cls: Classification) => void;
  onDelete: (id: string) => void;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  t: (key: string) => string;
}

const TreeNode: React.FC<TreeNodeProps> = ({ classification, level, onAdd, onEdit, onDelete, canCreate, canEdit, canDelete, t }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = classification.children && classification.children.length > 0;
  const gradient = levelGradients[level % levelGradients.length];
  const badgeColor = levelBadgeColors[level % levelBadgeColors.length];

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
          <div className={cn("w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-md", gradient)}>
            <FolderTree className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">{classification.name}</h4>
            {classification.description && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-1">{classification.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("px-2.5 py-1 text-xs font-medium rounded-lg", badgeColor)}>
            {t('classifications.level')} {classification.level}
          </span>
          <span
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-lg",
              classification.type === 'incident'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : classification.type === 'request'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : classification.type === 'complaint'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : classification.type === 'all'
                ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
            )}
          >
            {classification.type === 'incident' ? t('classifications.incident') : classification.type === 'request' ? t('classifications.request') : classification.type === 'complaint' ? t('classifications.complaint') : classification.type === 'query' ? t('classifications.query') : classification.type === 'all' ? t('classifications.all') : t('classifications.both')}
          </span>
          <span
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-lg",
              classification.is_active
                ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
            )}
          >
            {classification.is_active ? t('classifications.active') : t('classifications.inactive')}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canCreate && (
              <button
                onClick={() => onAdd(classification.id, classification.name)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.1)] rounded-lg transition-colors"
                title={t('classifications.addChildClassification')}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => onEdit(classification)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                title={t('common.edit')}
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(classification.id)}
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
          {classification.children!.map((child) => (
            <TreeNode
              key={child.id}
              classification={child}
              level={level + 1}
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

export const ClassificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClassification, setEditingClassification] = useState<Classification | null>(null);
  const [formData, setFormData] = useState<ClassificationFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  const canCreateClassification = isSuperAdmin || hasPermission(PERMISSIONS.CLASSIFICATIONS_CREATE);
  const canEditClassification = isSuperAdmin || hasPermission(PERMISSIONS.CLASSIFICATIONS_UPDATE);
  const canDeleteClassification = isSuperAdmin || hasPermission(PERMISSIONS.CLASSIFICATIONS_DELETE);

  const { data: treeData, isLoading } = useQuery({
    queryKey: ['admin', 'classifications', 'tree'],
    queryFn: () => classificationApi.getTree(),
  });

  const { data: classificationsList } = useQuery({
    queryKey: ['admin', 'classifications', 'list'],
    queryFn: () => classificationApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: ClassificationCreateRequest) => classificationApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'classifications'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClassificationUpdateRequest }) =>
      classificationApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'classifications'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => classificationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'classifications'] });
      setDeleteConfirm(null);
    },
  });

  const openCreateModal = (parentId: string = '', parentName: string = '') => {
    setEditingClassification(null);
    setFormData({
      ...initialFormData,
      parent_id: parentId,
      parent_name: parentName,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (classification: Classification) => {
    const parentCls = classificationsList?.data?.find((c: Classification) => c.id === classification.parent_id);
    setEditingClassification(classification);
    setFormData({
      name: classification.name,
      description: classification.description,
      parent_id: classification.parent_id || '',
      parent_name: parentCls?.name || '',
      sort_order: classification.sort_order,
      type: classification.type || 'both',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClassification(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      description: formData.description,
      parent_id: formData.parent_id || undefined,
      sort_order: formData.sort_order,
      type: formData.type,
    };

    if (editingClassification) {
      updateMutation.mutate({ id: editingClassification.id, data: payload });
    } else {
      createMutation.mutate(payload as ClassificationCreateRequest);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await classificationApi.export();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `classifications_export_${new Date().toISOString().split('T')[0]}.json`;
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
      const result = await classificationApi.import(file);
      setImportResult(result.data || null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'classifications'] });
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
              <FolderTree className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">{t('classifications.title')}</h2>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">{t('classifications.subtitle')}</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-[hsl(var(--primary)/0.05)] to-[hsl(var(--accent)/0.05)] border border-[hsl(var(--primary)/0.2)] rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1">{t('classifications.aboutTitle')}</h4>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {t('classifications.aboutDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Classification Tree */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden">
        {/* Header with Add Root Button */}
        <div className="px-6 py-4 bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.2)]">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">{t('classifications.hierarchy')}</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {treeData?.data?.length || 0} {t('classifications.rootClassifications')}
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
            {canCreateClassification && (
              <button
                onClick={() => openCreateModal()}
                className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-colors text-sm font-medium shadow-md shadow-[hsl(var(--primary)/0.25)]"
              >
                <Plus className="w-4 h-4" />
                {t('classifications.addRootClassification')}
              </button>
            )}
          </div>
        </div>

        {/* Tree Content */}
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[hsl(var(--muted-foreground))]">{t('classifications.loading')}</p>
          </div>
        ) : treeData?.data?.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[hsl(var(--primary)/0.25)]">
              <FolderTree className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{t('classifications.noClassificationsYet')}</h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">{t('classifications.createFirstClassification')}</p>
            {canCreateClassification && (
              <Button onClick={() => openCreateModal()} leftIcon={<Plus className="w-4 h-4" />}>
                {t('classifications.createClassification')}
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {treeData?.data?.map((cls: Classification) => (
              <TreeNode
                key={cls.id}
                classification={cls}
                level={0}
                onAdd={openCreateModal}
                onEdit={openEditModal}
                onDelete={setDeleteConfirm}
                canCreate={canCreateClassification}
                canEdit={canEditClassification}
                canDelete={canDeleteClassification}
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
                      <span className="font-medium text-[hsl(var(--success))]">{importResult.imported}</span> classifications imported successfully
                    </p>
                    {importResult.skipped > 0 && (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        <span className="font-medium text-[hsl(var(--warning))]">{importResult.skipped}</span> classifications skipped
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
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">{t('classifications.deleteConfirmTitle')}</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    {t('classifications.deleteConfirmMessage')}
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
                  {deleteMutation.isPending ? t('classifications.deleting') : t('classifications.deleteClassification')}
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
                  <FolderTree className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {editingClassification ? t('classifications.editClassification') : t('classifications.createClassification')}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {editingClassification
                      ? t('classifications.updateDetails')
                      : formData.parent_name
                        ? `${t('classifications.addingUnder')} "${formData.parent_name}"`
                        : t('classifications.addNewRoot')
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
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Parent Info Banner (when adding child) */}
              {!editingClassification && formData.parent_name && (
                <div className="flex items-center gap-3 p-3 bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.2)] rounded-xl">
                  <FolderTree className="w-5 h-5 text-[hsl(var(--primary))]" />
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('classifications.parentClassification')}</p>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">{formData.parent_name}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('classifications.name')}</label>
                <input
                  type="text"
                  placeholder={t('classifications.namePlaceholder')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                  required
                />
              </div>

              {/* Only show parent selector when editing */}
              {editingClassification && (
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('classifications.parentClassification')}</label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                  >
                    <option value="">{t('locations.noneRootLevel')}</option>
                    {classificationsList?.data
                      ?.filter((c: Classification) => c.id !== editingClassification?.id)
                      .map((cls: Classification) => (
                        <option key={cls.id} value={cls.id}>
                          {'—'.repeat(cls.level)} {cls.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('classifications.description')}</label>
                <textarea
                  placeholder={t('classifications.descriptionPlaceholder')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('classifications.type')}</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ClassificationType })}
                  className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                >
                  <option value="all">{t('classifications.typeAll')}</option>
                  <option value="both">{t('classifications.typeBoth')}</option>
                  <option value="incident">{t('classifications.typeIncident')}</option>
                  <option value="request">{t('classifications.typeRequest')}</option>
                  <option value="complaint">{t('classifications.typeComplaint')}</option>
                  <option value="query">{t('classifications.typeQuery')}</option>
                </select>
                <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                  {t('classifications.typeHelp')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('classifications.sortOrder')}</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                  min={0}
                />
                <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">{t('classifications.sortOrderHelp')}</p>
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
                    ? t('classifications.saving')
                    : editingClassification
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
