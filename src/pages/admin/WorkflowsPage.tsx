import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { workflowApi, classificationApi } from '../../api/admin';
import type { Workflow, Classification, WorkflowCreateRequest, WorkflowUpdateRequest } from '../../types';
import { cn } from '@/lib/utils';
import { Button } from '../../components/ui';

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [formData, setFormData] = useState<WorkflowFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: workflowsData, isLoading } = useQuery({
    queryKey: ['admin', 'workflows'],
    queryFn: () => workflowApi.list(),
  });

  const { data: classificationsData } = useQuery({
    queryKey: ['admin', 'classifications', 'tree'],
    queryFn: classificationApi.getTree,
  });

  const createMutation = useMutation({
    mutationFn: (data: WorkflowCreateRequest) => workflowApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: WorkflowUpdateRequest }) => workflowApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workflowApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
      setDeleteConfirm(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => workflowApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
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
      createMutation.mutate({
        name: formData.name,
        code: formData.code,
        description: formData.description,
        classification_ids: formData.classification_ids,
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
            <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">Workflows</h2>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">Design and manage incident workflows</p>
        </div>
        <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          Add Workflow
        </Button>
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
                        title="Design Workflow"
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(workflow)}
                        className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => duplicateMutation.mutate(workflow.id)}
                        className="p-2 text-[hsl(var(--muted-foreground))] hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(workflow.id)}
                        className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2 mb-4">
                    {workflow.description || 'No description provided'}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Circle className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-sm text-[hsl(var(--muted-foreground))]">
                        {workflow.states_count || 0} states
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-sm text-[hsl(var(--muted-foreground))]">
                        {workflow.transitions_count || 0} transitions
                      </span>
                    </div>
                  </div>

                  {/* Classifications */}
                  <div className="pt-4 border-t border-[hsl(var(--border))]">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                        {workflow.classifications?.length || 0} classifications
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
                          +{workflow.classifications!.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 mt-4">
                    {workflow.is_default && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg shadow-sm">
                        <Sparkles className="w-3 h-3" />
                        Default
                      </span>
                    )}
                    {!workflow.is_active && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-lg">
                        Inactive
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
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">No workflows yet</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">Create your first workflow to manage incident states</p>
          <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            Create Workflow
          </Button>
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
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Delete Workflow</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    Are you sure you want to delete this workflow? All states and transitions will be permanently removed.
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
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Workflow'}
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
                    {editingWorkflow ? 'Edit Workflow' : 'Create Workflow'}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {editingWorkflow ? 'Update workflow details' : 'Add a new workflow template'}
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
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Workflow Name</label>
                  <input
                    type="text"
                    placeholder="e.g., IT Support Workflow"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Workflow Code</label>
                  <input
                    type="text"
                    placeholder="e.g., it_support"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all"
                    required
                  />
                  <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">Unique identifier (lowercase, underscores allowed)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">Description</label>
                  <textarea
                    placeholder="Describe what this workflow is for..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all resize-none"
                  />
                </div>

                {editingWorkflow && (
                  <div className="flex items-center gap-3 p-4 bg-[hsl(var(--muted)/0.5)] rounded-xl">
                    <input
                      type="checkbox"
                      id="is_default"
                      checked={formData.is_default}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                      className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded focus:ring-[hsl(var(--primary))]"
                    />
                    <label htmlFor="is_default" className="text-sm font-medium text-[hsl(var(--foreground))]">
                      Set as default workflow
                    </label>
                  </div>
                )}

                {/* Classifications Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">Classifications</label>
                    <span className="px-2.5 py-1 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-lg">
                      {formData.classification_ids.length} selected
                    </span>
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                    Assign this workflow to incident classifications
                  </p>

                  <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {flatClassifications.length === 0 ? (
                      <div className="p-6 text-center text-[hsl(var(--muted-foreground))] text-sm">
                        No classifications available
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
                    : editingWorkflow
                    ? 'Update Workflow'
                    : 'Create Workflow'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
