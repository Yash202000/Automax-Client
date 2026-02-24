import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Workflow,
  Tags,
  Star,
  Paperclip,
  Upload,
  ArrowRight,
} from 'lucide-react';
import { Button, TreeSelect } from '../ui';
import type { TreeSelectNode } from '../ui';
import { incidentApi, classificationApi, workflowApi } from '../../api/admin';
import type {
  IncidentDetail,
  AvailableTransition,
  Classification,
  ConvertToRequestRequest,
} from '../../types';
import { cn } from '@/lib/utils';

interface BulkConvertToRequestModalProps {
  incidents: IncidentDetail[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRequestId: string) => void;
}

type Step = 'transition' | 'classification' | 'workflow' | 'review';

export const BulkConvertToRequestModal: React.FC<BulkConvertToRequestModalProps> = ({
  incidents,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();

  // Step state
  const [currentStep, setCurrentStep] = useState<Step>('transition');

  // Transition state
  const [selectedTransition, setSelectedTransition] = useState<AvailableTransition | null>(null);
  const [transitionComment, setTransitionComment] = useState('');
  const [transitionAttachment, setTransitionAttachment] = useState<File | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Classification state
  const [classificationId, setClassificationId] = useState('');

  // Workflow state
  const [workflowId, setWorkflowId] = useState('');

  // Optional overrides
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Query for available transitions
  const { data: transitionsData } = useQuery({
    queryKey: ['incident', incidents?.[0]?.id, 'transitions'],
    queryFn: () => incidentApi.getAvailableTransitions(incidents?.[0]?.id),
    enabled: isOpen,
  });

  // Query for request classifications
  const { data: classificationsData, isLoading: classificationsLoading } = useQuery({
    queryKey: ['classifications', 'request'],
    queryFn: async () => {
      // Get both 'request' and 'both' types
      const [requestRes, bothRes] = await Promise.all([
        classificationApi.getTreeByType('request'),
        classificationApi.getTreeByType('both'),
      ]);
      const combined = [...(requestRes.data || []), ...(bothRes.data || [])];
      // Deduplicate by ID
      const unique = combined.filter((item, index, self) =>
        index === self.findIndex(t => t.id === item.id)
      );
      return { success: true, data: unique };
    },
    enabled: isOpen && currentStep === 'classification',
  });

  // Query for request workflows
  const { data: workflowsData, isLoading: workflowsLoading } = useQuery({
    queryKey: ['workflows', 'request'],
    queryFn: async () => {
      // Get both 'request' and 'both' types
      const [requestRes, bothRes] = await Promise.all([
        workflowApi.listByRecordType('request', true),
        workflowApi.listByRecordType('both', true),
      ]);
      const combined = [...(requestRes.data || []), ...(bothRes.data || [])];
      // Deduplicate by ID
      const unique = combined.filter((item, index, self) =>
        index === self.findIndex(t => t.id === item.id)
      );
      return { success: true, data: unique };
    },
    enabled: isOpen && currentStep === 'workflow',
  });

  const availableTransitions = transitionsData?.data?.filter(t => t.can_execute) || [];
  const classifications = classificationsData?.data || [];
  const workflows = workflowsData?.data || [];

  // Convert classifications to TreeSelectNode format
  const classificationTreeData: TreeSelectNode[] = useMemo(() => {
    const convertToTreeNode = (items: Classification[]): TreeSelectNode[] => {
      return items.map(item => ({
        id: item.id,
        name: item.name,
        children: item.children && item.children.length > 0
          ? convertToTreeNode(item.children)
          : undefined,
      }));
    };
    return convertToTreeNode(classifications);
  }, [classifications]);

  // Helper to find classification by ID
  const findClassificationById = (items: Classification[], id: string): Classification | undefined => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children && item.children.length > 0) {
        const found = findClassificationById(item.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const selectedClassification = classificationId ? findClassificationById(classifications, classificationId) : null;
  const selectedWorkflow = workflowId ? workflows.find(w => w.id === workflowId) : null;

  // Filter workflows based on selected classification
  const filteredWorkflows = useMemo(() => {
    const requestWorkflows = workflows.filter(w => w.is_active);

    if (!classificationId) {
      return requestWorkflows;
    }

    const matching = requestWorkflows.filter(w => {
      const hasNoClassificationRestriction = !w.classifications || w.classifications.length === 0;

      if (hasNoClassificationRestriction) return true;

      return w.classifications?.some(c => c.id === classificationId);
    });

    // If no workflows match the classification, show all workflows as fallback
    if (matching.length === 0) return requestWorkflows;
    return matching;
  }, [workflows, classificationId]);

  // Auto-select workflow when only one option available
  useEffect(() => {
    if (filteredWorkflows.length === 1 && !workflowId) {
      setWorkflowId(filteredWorkflows[0].id);
    } else if (workflowId && !filteredWorkflows.find(w => w.id === workflowId)) {
      // Clear workflow if it's no longer in the filtered list
      setWorkflowId('');
    }
  }, [filteredWorkflows, workflowId]);

  // Convert mutation
  const convertMutation = useMutation({
    mutationFn: async (data: ConvertToRequestRequest) => {
      // If attachment, upload first
      if (transitionAttachment && selectedTransition) {
        await incidentApi.uploadAttachment(incidents?.[0]?.id, transitionAttachment);
      }

      return incidentApi.convertToRequest(incidents?.[0]?.id, {
        ...data,
        feedback: feedbackRating > 0 ? {
          rating: feedbackRating,
          comment: feedbackComment || undefined,
        } : undefined,
      });
    },
    onSuccess: (result) => {
      if (result.data?.new_request?.id) {
        onSuccess(result.data.new_request.id);
      }
    },
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('transition');
      setSelectedTransition(null);
      setTransitionComment('');
      setTransitionAttachment(null);
      setFeedbackRating(0);
      setFeedbackComment('');
      setClassificationId('');
      setWorkflowId('');
      setTitle('');
      setDescription('');
    }
  }, [isOpen]);

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'transition', label: t('requests.stepTransition', 'Transition'), icon: <Play className="w-4 h-4" /> },
    { key: 'classification', label: t('requests.stepClassification', 'Classification'), icon: <Tags className="w-4 h-4" /> },
    { key: 'workflow', label: t('requests.stepWorkflow', 'Workflow'), icon: <Workflow className="w-4 h-4" /> },
    { key: 'review', label: t('requests.stepReview', 'Review'), icon: <FileText className="w-4 h-4" /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case 'transition':
        // Transition is optional, but if selected, validate requirements
        if (selectedTransition) {
          const requiresComment = selectedTransition.requirements?.some(
            r => r.requirement_type === 'comment' && r.is_mandatory
          );
          const requiresAttachment = selectedTransition.requirements?.some(
            r => r.requirement_type === 'attachment' && r.is_mandatory
          );
          const requiresFeedback = selectedTransition.requirements?.some(
            r => r.requirement_type === 'feedback' && r.is_mandatory
          );
          if (requiresComment && !transitionComment.trim()) return false;
          if (requiresAttachment && !transitionAttachment) return false;
          if (requiresFeedback && feedbackRating === 0) return false;
        }
        return true;
      case 'classification':
        return !!classificationId;
      case 'workflow':
        return !!workflowId;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].key);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key);
    }
  };

  const handleConvert = () => {
    if (!classificationId || !workflowId) return;

    const request: ConvertToRequestRequest = {
      classification_id: classificationId,
      workflow_id: workflowId,
      transition_id: selectedTransition?.transition.id,
      transition_comment: transitionComment || undefined,
      title: title || undefined,
      description: description || undefined,
      feedback: feedbackRating > 0 ? {
        rating: feedbackRating,
        comment: feedbackComment || undefined,
      } : undefined,
    };

    convertMutation.mutate(request);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-2xl w-full animate-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              {t('requests.convertToRequest', 'Convert to Request')}
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {/* {incident.incident_number} - {incident.title} */}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.key}>
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                    currentStep === step.key
                      ? "bg-[hsl(var(--primary))] text-white"
                      : index < currentStepIndex
                      ? "bg-green-100 text-green-700"
                      : "text-[hsl(var(--muted-foreground))]"
                  )}
                >
                  {index < currentStepIndex ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    step.icon
                  )}
                  <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Transition */}
          {currentStep === 'transition' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  {t('requests.selectTransition', 'Select Transition (Optional)')}
                </h4>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  {t('requests.transitionDescription', 'Optionally execute a transition before converting to request.')}
                </p>
              </div>

              {availableTransitions.length === 0 ? (
                <div className="p-4 bg-[hsl(var(--muted)/0.5)] rounded-lg text-center">
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {t('requests.noTransitionsAvailable', 'No transitions available. You can proceed without transitioning.')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* No transition option */}
                  <button
                    onClick={() => setSelectedTransition(null)}
                    className={cn(
                      "w-full p-4 rounded-lg border-2 text-left transition-colors",
                      !selectedTransition
                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                        : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        !selectedTransition ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]" : "border-[hsl(var(--muted-foreground))]"
                      )}>
                        {!selectedTransition && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="font-medium text-[hsl(var(--foreground))]">
                        {t('requests.skipTransition', 'Skip transition')}
                      </span>
                    </div>
                  </button>

                  {availableTransitions.map((transition) => (
                    <button
                      key={transition.transition.id}
                      onClick={() => setSelectedTransition(transition)}
                      className={cn(
                        "w-full p-4 rounded-lg border-2 text-left transition-colors",
                        selectedTransition?.transition.id === transition.transition.id
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                          : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            selectedTransition?.transition.id === transition.transition.id
                              ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]"
                              : "border-[hsl(var(--muted-foreground))]"
                          )}>
                            {selectedTransition?.transition.id === transition.transition.id && (
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className="font-medium text-[hsl(var(--foreground))]">
                            {transition.transition.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: transition.transition.from_state?.color ? `${transition.transition.from_state.color}20` : 'hsl(var(--muted))',
                              color: transition.transition.from_state?.color || 'hsl(var(--foreground))',
                            }}
                          >
                            {transition.transition.from_state?.name}
                          </span>
                          <ArrowRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: transition.transition.to_state?.color ? `${transition.transition.to_state.color}20` : 'hsl(var(--muted))',
                              color: transition.transition.to_state?.color || 'hsl(var(--foreground))',
                            }}
                          >
                            {transition.transition.to_state?.name}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Transition Requirements */}
              {selectedTransition && selectedTransition.requirements && selectedTransition.requirements.length > 0 && (
                <div className="space-y-4 mt-4 pt-4 border-t border-[hsl(var(--border))]">
                  {/* Feedback */}
                  {selectedTransition.requirements.some(r => r.requirement_type === 'feedback') && (
                    <div>
                      <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                        {t('incidents.feedback', 'Feedback')}
                        {selectedTransition.requirements.some(r => r.requirement_type === 'feedback' && r.is_mandatory) && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      <div className="p-4 bg-[hsl(var(--muted)/0.5)] rounded-lg space-y-3">
                        <div>
                          <span className="text-sm text-[hsl(var(--muted-foreground))] mb-2 block">
                            {t('incidents.rateExperience', 'Rate your experience')}
                          </span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setFeedbackRating(star)}
                                className={`p-1 transition-colors ${
                                  star <= feedbackRating
                                    ? 'text-yellow-400'
                                    : 'text-[hsl(var(--muted-foreground))] hover:text-yellow-300'
                                }`}
                              >
                                <Star
                                  className="w-6 h-6"
                                  fill={star <= feedbackRating ? 'currentColor' : 'none'}
                                />
                              </button>
                            ))}
                            {feedbackRating > 0 && (
                              <span className="ml-2 text-sm text-[hsl(var(--muted-foreground))] self-center">
                                {feedbackRating}/5
                              </span>
                            )}
                          </div>
                        </div>
                        <textarea
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          placeholder={t('incidents.feedbackCommentPlaceholder', 'Add optional feedback comments...')}
                          rows={2}
                          className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Attachment */}
                  {selectedTransition.requirements.some(r => r.requirement_type === 'attachment') && (
                    <div>
                      <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                        {t('incidents.attachment', 'Attachment')}
                        {selectedTransition.requirements.some(r => r.requirement_type === 'attachment' && r.is_mandatory) && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      {transitionAttachment ? (
                        <div className="flex items-center justify-between p-3 bg-[hsl(var(--muted)/0.5)] rounded-lg">
                          <div className="flex items-center gap-2">
                            <Paperclip className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                            <span className="text-sm text-[hsl(var(--foreground))] truncate max-w-[200px]">
                              {transitionAttachment.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTransitionAttachment(null)}
                            className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-[hsl(var(--border))] rounded-lg cursor-pointer hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
                          <Upload className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                          <span className="text-sm text-[hsl(var(--muted-foreground))]">
                            {t('incidents.clickToUpload', 'Click to upload')}
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setTransitionAttachment(file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {/* Comment */}
                  {selectedTransition.requirements.some(r => r.requirement_type === 'comment') && (
                    <div>
                      <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                        {t('incidents.comment', 'Comment')}
                        {selectedTransition.requirements.some(r => r.requirement_type === 'comment' && r.is_mandatory) && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      <textarea
                        value={transitionComment}
                        onChange={(e) => setTransitionComment(e.target.value)}
                        placeholder={t('incidents.addCommentForTransition', 'Add a comment for this transition...')}
                        rows={3}
                        className="w-full px-4 py-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] resize-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Classification */}
          {currentStep === 'classification' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  {t('requests.selectClassification', 'Select Request Classification')}
                </h4>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  {t('requests.classificationDescription', 'Choose a classification for the new request.')}
                </p>
              </div>

              {classificationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : classifications.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="w-5 h-5" />
                    <p className="text-sm">
                      {t('requests.noRequestClassifications', 'No request classifications found. Please create classifications with type "request" or "both".')}
                    </p>
                  </div>
                </div>
              ) : (
                <TreeSelect
                  data={classificationTreeData}
                  value={classificationId}
                  onChange={(id) => setClassificationId(id)}
                  placeholder={t('requests.selectClassificationPlaceholder', 'Select classification...')}
                  leafOnly={true}
                  emptyMessage={t('requests.noRequestClassifications', 'No request classifications found.')}
                  maxHeight="350px"
                />
              )}
            </div>
          )}

          {/* Step 3: Workflow */}
          {currentStep === 'workflow' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  {t('requests.selectWorkflow', 'Select Request Workflow')}
                </h4>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  {t('requests.workflowDescription', 'Choose a workflow for the new request.')}
                </p>
              </div>

              {workflowsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredWorkflows.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="w-5 h-5" />
                    <p className="text-sm">
                      {t('requests.noRequestWorkflows', 'No request workflows found. Please create workflows with record_type "request" or "both".')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredWorkflows.map((workflow) => (
                    <button
                      key={workflow.id}
                      onClick={() => setWorkflowId(workflow.id)}
                      className={cn(
                        "w-full p-4 rounded-lg border-2 text-left transition-colors",
                        workflowId === workflow.id
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                          : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                          workflowId === workflow.id
                            ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]"
                            : "border-[hsl(var(--muted-foreground))]"
                        )}>
                          {workflowId === workflow.id && (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[hsl(var(--foreground))]">
                              {workflow.name}
                            </span>
                            <span className="px-2 py-0.5 text-xs rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                              {workflow.code}
                            </span>
                            <span className="px-2 py-0.5 text-xs rounded bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                              {workflow.record_type}
                            </span>
                          </div>
                          {workflow.description && (
                            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                              {workflow.description}
                            </p>
                          )}
                          {workflow.states && workflow.states.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              {workflow.states.slice(0, 5).map((state, idx) => (
                                <React.Fragment key={state.id}>
                                  <span
                                    className="px-2 py-0.5 text-xs rounded"
                                    style={{
                                      backgroundColor: state.color ? `${state.color}20` : 'hsl(var(--muted))',
                                      color: state.color || 'hsl(var(--foreground))',
                                    }}
                                  >
                                    {state.name}
                                  </span>
                                  {idx < Math.min(workflow.states!.length, 5) - 1 && (
                                    <ChevronRight className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                                  )}
                                </React.Fragment>
                              ))}
                              {workflow.states.length > 5 && (
                                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                  +{workflow.states.length - 5} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  {t('requests.reviewConversion', 'Review Conversion')}
                </h4>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  {t('requests.reviewDescription', 'Review the details before creating the request.')}
                </p>
              </div>

              {/* Summary */}
              <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-4 space-y-4">
                <div>
                  <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase">
                    {t('requests.sourceIncidents', 'Source Incidents')}
                  </span>
                 {incidents.map((incident, idx) => (
                  <p key={idx} className="text-sm text-[hsl(var(--foreground))] font-medium">
                    {incident.incident_number} - {incident.title}
                  </p>))}
                </div>

                {selectedTransition && (
                  <div>
                    <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase">
                      {t('requests.transition', 'Transition')}
                    </span>
                    <p className="text-sm text-[hsl(var(--foreground))]">
                      {selectedTransition.transition.name}: {selectedTransition.transition.from_state?.name} → {selectedTransition.transition.to_state?.name}
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase">
                    {t('requests.classification', 'Classification')}
                  </span>
                  <p className="text-sm text-[hsl(var(--foreground))]">
                    {selectedClassification?.name}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase">
                    {t('requests.workflow', 'Workflow')}
                  </span>
                  <p className="text-sm text-[hsl(var(--foreground))]">
                    {selectedWorkflow?.name} ({selectedWorkflow?.code})
                  </p>
                </div>
              </div>

              {/* Optional Overrides */}
              <div className="space-y-4">
                <h5 className="text-sm font-medium text-[hsl(var(--foreground))]">
                  {t('requests.optionalOverrides', 'Optional Overrides')}
                </h5>

                <div>
                  <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">
                    {t('requests.newTitle', 'New Title')} ({t('common.optional', 'optional')})
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    // placeholder={incident?.title}
                    className="w-full px-4 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[hsl(var(--muted-foreground))] mb-1">
                    {t('requests.newDescription', 'New Description')} ({t('common.optional', 'optional')})
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    // placeholder={incident.description || t('requests.noDescription', 'No description')}
                    rows={3}
                    className="w-full px-4 py-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] resize-none"
                  />
                </div>
              </div>

              {/* Warning */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-700">
                    <p className="font-medium">{t('requests.conversionWarning', 'This action will create a new request record.')}</p>
                    <p className="mt-1">
                      {t('requests.conversionWarningDetails', 'The original incident will remain unchanged and will be linked to the new request.')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <Button
            variant="ghost"
            onClick={currentStepIndex === 0 ? onClose : handleBack}
            leftIcon={currentStepIndex > 0 ? <ChevronLeft className="w-4 h-4" /> : undefined}
          >
            {currentStepIndex === 0 ? t('common.cancel', 'Cancel') : t('common.back', 'Back')}
          </Button>

          {currentStep === 'review' ? (
            <Button
              onClick={handleConvert}
              disabled={!canProceed() || convertMutation.isPending}
              isLoading={convertMutation.isPending}
              leftIcon={!convertMutation.isPending ? <CheckCircle2 className="w-4 h-4" /> : undefined}
            >
              {t('requests.createRequest', 'Create Request')}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              {t('common.next', 'Next')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkConvertToRequestModal;
