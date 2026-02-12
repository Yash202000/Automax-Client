import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  GitBranch,
  Copy,
  Settings2,
  AlertTriangle,
  Circle,
  ArrowRight,
  Tag,
  Sparkles,
  RotateCcw,
  Archive,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
} from 'lucide-react';
import { workflowApi, classificationApi } from '../../api/admin';
import type { Workflow, Classification, WorkflowCreateRequest, WorkflowUpdateRequest } from '../../types';
import { cn } from '@/lib/utils';
import { Button } from '../../components/ui';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../constants/permissions';

interface WorkflowFormData {
  name: string;
  code: string;
  description: string;
  is_default: boolean;
  classification_ids: string[];
}

const initialFormData: WorkflowFormData = {
  name: '',
  code: '',
  description: '',
  is_default: false,
  classification_ids: [],
};

export const WorkflowsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

  const canCreateWorkflow = isSuperAdmin || hasPermission(PERMISSIONS.WORKFLOWS_CREATE);
  const [formData, setFormData] = useState<WorkflowFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [permanentDeleteConfirm, setPermanentDeleteConfirm] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  const { data: workflowsData, isLoading } = useQuery({
    queryKey: ['admin', 'workflows'],
    queryFn: () => workflowApi.list(),
  });

  const { data: classificationsData } = useQuery({
    queryKey: ['admin', 'classifications', 'tree'],
    queryFn: () => classificationApi.getTree(),
  });

  const { data: deletedWorkflowsData, isLoading: isLoadingDeleted } = useQuery({
    queryKey: ['admin', 'workflows', 'deleted'],
    queryFn: () => workflowApi.listDeleted(),
    enabled: showDeleted,
  });

  const createMutation = useMutation({
    mutationFn: (data: WorkflowCreateRequest) => workflowApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
      toast.success('Workflow created successfully');
      closeModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to create workflow';
      toast.error('Failed to create workflow', {
        description: errorMessage,
        duration: 5000,
      });
      console.error('Create workflow error:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: WorkflowUpdateRequest }) => workflowApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
      toast.success('Workflow updated successfully');
      closeModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to update workflow';
      toast.error('Failed to update workflow', {
        description: errorMessage,
        duration: 5000,
      });
      console.error('Update workflow error:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workflowApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
      toast.success('Workflow deleted successfully');
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete workflow';
      toast.error('Failed to delete workflow', { description: errorMessage });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => workflowApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
      toast.success('Workflow duplicated successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to duplicate workflow';
      toast.error('Failed to duplicate workflow', { description: errorMessage });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => workflowApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows', 'deleted'] });
      toast.success('Workflow restored successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to restore workflow';
      toast.error('Failed to restore workflow', { description: errorMessage });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => workflowApi.permanentDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows', 'deleted'] });
      toast.success('Workflow permanently deleted');
      setPermanentDeleteConfirm(null);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to permanently delete workflow';
      toast.error('Failed to permanently delete workflow', { description: errorMessage });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (id: string) => {
      const blob = await workflowApi.export(id);
      const workflow = workflowsData?.data?.find(w => w.id === id);
      const filename = `workflow_${workflow?.code}_${Date.now()}.json`;

      // Trigger browser download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => workflowApi.import(file),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
      setIsImportModalOpen(false);
      setImportFile(null);

      if (response.data?.warnings && response.data.warnings.length > 0) {
        setImportWarnings(response.data.warnings);
      }
    },
  });

  const openCreateModal = () => {
    setEditingWorkflow(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setFormData({
      name: workflow.name,
      code: workflow.code,
      description: workflow.description,
      is_default: workflow.is_default,
      classification_ids: workflow.classifications?.map((c) => c.id) || [],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingWorkflow(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWorkflow) {
      updateMutation.mutate({
        id: editingWorkflow.id,
        data: {
          name: formData.name,
          code: formData.code,
          description: formData.description,
          is_default: formData.is_default,
          classification_ids: formData.classification_ids,
        },
      });
    } else {
      // When creating, only send basic info. Classifications/locations are configured later in the designer.
      createMutation.mutate({
        name: formData.name,
        code: formData.code,
        description: formData.description,
      });
    }
  };

  const toggleClassification = (classId: string) => {
    setFormData((prev) => ({
      ...prev,
      classification_ids: prev.classification_ids.includes(classId)
        ? prev.classification_ids.filter((id) => id !== classId)
        : [...prev.classification_ids, classId],
    }));
  };

  const flattenClassifications = (classifications: Classification[]): Classification[] => {
    const result: Classification[] = [];
    const flatten = (items: Classification[], level = 0) => {
      for (const item of items) {
        result.push({ ...item, level });
        if (item.children && item.children.length > 0) {
          flatten(item.children, level + 1);
        }
      }
    };
    flatten(classifications);
    return result;
  };

  const flatClassifications = classificationsData?.data ? flattenClassifications(classificationsData.data) : [];

  const getWorkflowGradient = (workflow: Workflow) => {
    if (workflow.is_default) return 'from-amber-500 to-orange-500';
    const gradients = [
      'from-violet-500 to-purple-500',
      'from-blue-500 to-cyan-500',
      'from-emerald-500 to-teal-500',
      'from-rose-500 to-pink-500',
      'from-indigo-500 to-blue-500',
    ];
    const index = workflow.name.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <GitBranch className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">{t('workflows.title')}</h2>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">{t('workflows.subtitle')}</p>
        </div>
        {canCreateWorkflow && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImportModalOpen(true)} leftIcon={<Upload className="w-4 h-4" />}>
              Import
            </Button>
            <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
              {t('workflows.addWorkflow')}
            </Button>
          </div>
        )}
      </div>

      {/* Workflows Grid */}
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
          : workflowsData?.data?.map((workflow: Workflow) => (
              <div
                key={workflow.id}
                className="group relative bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 hover:shadow-xl hover:shadow-[hsl(var(--foreground)/0.05)] hover:border-[hsl(var(--border))] transition-all duration-300"
              >
                {/* Gradient decoration */}
                <div className={cn(
                  "absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity",
                  getWorkflowGradient(workflow)
                )} />

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-lg",
                        getWorkflowGradient(workflow)
                      )}>
                        <GitBranch className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">{workflow.name}</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] font-mono">{workflow.code}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => navigate(`/workflows/${workflow.id}`)}
                        className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                        title={t('workflows.designWorkflow')}
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(workflow)}
                        className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                        title={t('common.edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => duplicateMutation.mutate(workflow.id)}
                        className="p-2 text-[hsl(var(--muted-foreground))] hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title={t('workflows.duplicateWorkflow')}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportMutation.mutate(workflow.id);
                        }}
                        className="p-2 text-[hsl(var(--muted-foreground))] hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                        title="Export Workflow"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(workflow.id)}
                        className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2 mb-4">
                    {workflow.description || t('workflows.noDescription')}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Circle className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-sm text-[hsl(var(--muted-foreground))]">
                        {workflow.states_count || 0} {t('workflows.states')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-sm text-[hsl(var(--muted-foreground))]">
                        {workflow.transitions_count || 0} {t('workflows.transitions')}
                      </span>
                    </div>
                  </div>

                  {/* Classifications */}
                  <div className="pt-4 border-t border-[hsl(var(--border))]">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                        {workflow.classifications?.length || 0} {t('workflows.classifications')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {workflow.classifications?.slice(0, 3).map((classification) => (
                        <span
                          key={classification.id}
                          className="px-2.5 py-1 text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-lg"
                        >
                          {classification.name}
                        </span>
                      ))}
                      {(workflow.classifications?.length || 0) > 3 && (
                        <span className="px-2.5 py-1 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-lg">
                          {t('workflows.moreClassifications', { count: workflow.classifications!.length - 3 })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 mt-4">
                    {workflow.is_default && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg shadow-sm">
                        <Sparkles className="w-3 h-3" />
                        {t('workflows.default')}
                      </span>
                    )}
                    {!workflow.is_active && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-lg">
                        {t('workflows.inactive')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* Empty state */}
      {!isLoading && workflowsData?.data?.length === 0 && (
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[hsl(var(--primary)/0.25)]">
            <GitBranch className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{t('workflows.noWorkflows')}</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">{t('workflows.noWorkflowsDesc')}</p>
          {canCreateWorkflow && (
            <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
              {t('workflows.createWorkflow')}
            </Button>
          )}
        </div>
      )}

      {/* Deleted Workflows Section */}
      <div className="mt-8">
        <button
          onClick={() => setShowDeleted(!showDeleted)}
          className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          <Archive className="w-4 h-4" />
          {t('workflows.deletedWorkflows', 'Deleted Workflows')}
          {showDeleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {deletedWorkflowsData?.data && deletedWorkflowsData.data.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-[hsl(var(--muted))] rounded-full">
              {deletedWorkflowsData.data.length}
            </span>
          )}
        </button>

        {showDeleted && (
          <div className="mt-4">
            {isLoadingDeleted ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : deletedWorkflowsData?.data?.length === 0 ? (
              <div className="bg-[hsl(var(--muted)/0.3)] rounded-xl p-6 text-center">
                <Archive className="w-8 h-8 text-[hsl(var(--muted-foreground))] mx-auto mb-2" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {t('workflows.noDeletedWorkflows', 'No deleted workflows')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {deletedWorkflowsData?.data?.map((workflow: Workflow) => (
                  <div
                    key={workflow.id}
                    className="relative bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 opacity-75"
                  >
                    <div className="absolute top-3 right-3 px-2 py-1 text-xs font-medium bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] rounded-lg">
                      {t('workflows.deleted', 'Deleted')}
                    </div>

                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 bg-[hsl(var(--muted))] rounded-xl flex items-center justify-center">
                        <GitBranch className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">{workflow.name}</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] font-mono">{workflow.code}</p>
                      </div>
                    </div>

                    <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2 mb-4">
                      {workflow.description || t('workflows.noDescription')}
                    </p>

                    <div className="flex items-center gap-2 pt-4 border-t border-[hsl(var(--border))]">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => restoreMutation.mutate(workflow.id)}
                        isLoading={restoreMutation.isPending}
                        leftIcon={<RotateCcw className="w-4 h-4" />}
                        className="flex-1"
                      >
                        {t('workflows.restore', 'Restore')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setPermanentDeleteConfirm(workflow.id)}
                        leftIcon={<Trash2 className="w-4 h-4" />}
                        className="flex-1"
                      >
                        {t('workflows.permanentDelete', 'Delete Forever')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (Soft Delete) */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Archive className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">{t('workflows.deleteWorkflow')}</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    {t('workflows.softDeleteMessage', 'This workflow will be moved to the deleted section. You can restore it later or permanently delete it.')}
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
                  {deleteMutation.isPending ? t('workflows.deleting') : t('workflows.deleteWorkflow')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {permanentDeleteConfirm && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-[hsl(var(--destructive)/0.1)] rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-[hsl(var(--destructive))]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {t('workflows.permanentDeleteTitle', 'Permanently Delete Workflow')}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    {t('workflows.permanentDeleteMessage', 'This action cannot be undone. The workflow and all its states, transitions, and configurations will be permanently removed from the database.')}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setPermanentDeleteConfirm(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => permanentDeleteMutation.mutate(permanentDeleteConfirm)}
                  isLoading={permanentDeleteMutation.isPending}
                >
                  {permanentDeleteMutation.isPending ? t('workflows.deleting') : t('workflows.permanentDelete', 'Delete Forever')}
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
                  <GitBranch className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {editingWorkflow ? t('workflows.editWorkflow') : t('workflows.createWorkflow')}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {editingWorkflow ? t('workflows.updateDetails') : t('workflows.addTemplate')}
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
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('workflows.workflowName')}</label>
                  <input
                    type="text"
                    placeholder={t('workflows.workflowNamePlaceholder')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('workflows.workflowCode')}</label>
                  <input
                    type="text"
                    placeholder={t('workflows.workflowCodePlaceholder')}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    required
                  />
                  <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">{t('workflows.codeHint')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">{t('workflows.description')}</label>
                  <textarea
                    placeholder={t('workflows.descriptionPlaceholder')}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all resize-none"
                  />
                </div>

                {/* Info message for create mode */}
                {!editingWorkflow && (
                  <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <Settings2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                        Configure Later
                      </p>
                      <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                        After creating the workflow, you can configure matching rules (classifications, locations), states, transitions, and required fields in the Workflow Designer.
                      </p>
                    </div>
                  </div>
                )}

                {editingWorkflow && (
                  <>
                    <div className="flex items-center gap-3 p-4 bg-[hsl(var(--muted)/0.5)] rounded-xl">
                      <input
                        type="checkbox"
                        id="is_default"
                        checked={formData.is_default}
                        onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                        className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded focus:ring-[hsl(var(--primary))]"
                      />
                      <label htmlFor="is_default" className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {t('workflows.setAsDefault')}
                      </label>
                    </div>

                    {/* Classifications Section - Only shown in edit mode */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-[hsl(var(--foreground))]">{t('workflows.classificationsLabel')}</label>
                        <span className="px-2.5 py-1 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-lg">
                          {formData.classification_ids.length} {t('workflows.selected')}
                        </span>
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                        {t('workflows.assignClassifications')}
                      </p>

                      <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                        {flatClassifications.length === 0 ? (
                          <div className="p-6 text-center text-[hsl(var(--muted-foreground))] text-sm">
                            {t('workflows.noClassifications')}
                          </div>
                        ) : (
                          <div className="p-3 space-y-2">
                            {flatClassifications.map((classification) => (
                              <label
                                key={classification.id}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                                  formData.classification_ids.includes(classification.id)
                                    ? "bg-[hsl(var(--primary)/0.05)] border-2 border-[hsl(var(--primary)/0.3)]"
                                    : "bg-[hsl(var(--background))] border-2 border-[hsl(var(--border))] hover:border-[hsl(var(--muted-foreground)/0.3)]"
                                )}
                                style={{ paddingLeft: `${(classification.level || 0) * 16 + 12}px` }}
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.classification_ids.includes(classification.id)}
                                  onChange={() => toggleClassification(classification.id)}
                                  className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded focus:ring-[hsl(var(--primary))]"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-[hsl(var(--foreground))] block truncate">
                                    {classification.name}
                                  </span>
                                  {classification.description && (
                                    <span className="text-xs text-[hsl(var(--muted-foreground))]">{classification.description}</span>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
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
                    ? t('workflows.saving')
                    : editingWorkflow
                    ? t('workflows.updateWorkflow')
                    : t('workflows.createWorkflow')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl border border-[hsl(var(--border))] max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
                    <Upload className="w-5 h-5 text-[hsl(var(--primary))]" />
                  </div>
                  <h3 className="text-xl font-bold text-[hsl(var(--foreground))]">
                    Import Workflow
                  </h3>
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 ml-11">
                  Upload a JSON file to import workflow
                </p>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                }}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  Select JSON File
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[hsl(var(--primary))] file:text-white hover:file:bg-[hsl(var(--primary))]/90 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                />
                {importFile && (
                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                    Selected: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              <div className="p-4 bg-[hsl(var(--muted)/0.5)] rounded-xl">
                <div className="flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">
                    <p className="font-medium text-[hsl(var(--foreground))] mb-1">Import Notes:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>File must be a valid JSON workflow export</li>
                      <li>Max file size: 10MB</li>
                      <li>Duplicate workflow codes will be renamed automatically</li>
                      <li>Missing roles or classifications will show warnings</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (importFile) {
                    importMutation.mutate(importFile);
                  }
                }}
                disabled={!importFile}
                isLoading={importMutation.isPending}
                leftIcon={!importMutation.isPending ? <Upload className="w-4 h-4" /> : undefined}
              >
                {importMutation.isPending ? 'Importing...' : 'Import Workflow'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import Warnings Modal */}
      {importWarnings.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl border border-[hsl(var(--border))] max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold text-[hsl(var(--foreground))]">
                    Import Warnings
                  </h3>
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 ml-11">
                  Workflow imported with warnings
                </p>
              </div>
              <button
                onClick={() => setImportWarnings([])}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {importWarnings.map((warning, index) => (
                <div key={index} className="flex gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[hsl(var(--foreground))]">{warning}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <Button onClick={() => setImportWarnings([])}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
