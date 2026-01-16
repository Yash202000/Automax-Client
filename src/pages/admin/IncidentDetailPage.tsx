import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  Calendar,
  User,
  Building2,
  MapPin,
  Edit2,
  Trash2,
  MessageSquare,
  Paperclip,
  Send,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Play,
  FileText,
  Download,
  X,
  Upload,
  History,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { MiniWorkflowView } from '../../components/workflow';
import { RevisionHistory } from '../../components/incidents';
import { incidentApi, userApi, workflowApi, departmentApi } from '../../api/admin';
import type {
  IncidentDetail,
  AvailableTransition,
  IncidentComment,
  IncidentAttachment,
  TransitionHistory,
  User as UserType,
  DepartmentMatchResponse,
  UserMatchResponse,
} from '../../types';
import { cn } from '@/lib/utils';

const priorityLabels: Record<number, { label: string; color: string; bgColor: string }> = {
  1: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' },
  2: { label: 'High', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  3: { label: 'Medium', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  4: { label: 'Low', color: 'text-green-700', bgColor: 'bg-green-100' },
  5: { label: 'Minimal', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

const severityLabels: Record<number, { label: string; color: string; bgColor: string }> = {
  1: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' },
  2: { label: 'Major', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  3: { label: 'Moderate', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  4: { label: 'Minor', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  5: { label: 'Trivial', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'activity' | 'comments' | 'attachments' | 'revisions'>('activity');
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [selectedTransition, setSelectedTransition] = useState<AvailableTransition | null>(null);
  const [transitionComment, setTransitionComment] = useState('');
  const [transitionAttachment, setTransitionAttachment] = useState<File | null>(null);
  const [transitionUploading, setTransitionUploading] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');

  // Assignment matching state
  const [matchLoading, setMatchLoading] = useState(false);
  const [departmentMatchResult, setDepartmentMatchResult] = useState<DepartmentMatchResponse | null>(null);
  const [userMatchResult, setUserMatchResult] = useState<UserMatchResponse | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Queries
  const { data: incidentData, isLoading, error, refetch } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => incidentApi.getById(id!),
    enabled: !!id,
  });

  const { data: transitionsData, refetch: refetchTransitions } = useQuery({
    queryKey: ['incident', id, 'transitions'],
    queryFn: () => incidentApi.getAvailableTransitions(id!),
    enabled: !!id,
  });

  const { data: historyData } = useQuery({
    queryKey: ['incident', id, 'history'],
    queryFn: () => incidentApi.getHistory(id!),
    enabled: !!id,
  });

  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ['incident', id, 'comments'],
    queryFn: () => incidentApi.listComments(id!),
    enabled: !!id,
  });

  const { data: attachmentsData, refetch: refetchAttachments } = useQuery({
    queryKey: ['incident', id, 'attachments'],
    queryFn: () => incidentApi.listAttachments(id!),
    enabled: !!id,
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin', 'users', 1, 100],
    queryFn: () => userApi.list(1, 100),
  });

  const incident = incidentData?.data as IncidentDetail | undefined;

  // Fetch full workflow with states and transitions for visualization
  const { data: fullWorkflowData } = useQuery({
    queryKey: ['admin', 'workflow', incident?.workflow?.id],
    queryFn: () => workflowApi.getById(incident!.workflow!.id),
    enabled: !!incident?.workflow?.id,
  });

  // Mutations
  const transitionMutation = useMutation({
    mutationFn: ({ transitionId, comment, attachments, department_id, user_id }: {
      transitionId: string;
      comment?: string;
      attachments?: string[];
      department_id?: string;
      user_id?: string;
    }) =>
      incidentApi.transition(id!, { transition_id: transitionId, comment, attachments, department_id, user_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      refetchTransitions();
      refetchAttachments();
      setTransitionModalOpen(false);
      setSelectedTransition(null);
      setTransitionComment('');
      setTransitionAttachment(null);
      setDepartmentMatchResult(null);
      setUserMatchResult(null);
      setSelectedDepartmentId('');
      setSelectedUserId('');
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (data: { content: string; is_internal?: boolean }) =>
      incidentApi.addComment(id!, data),
    onSuccess: () => {
      refetchComments();
      setCommentText('');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => incidentApi.deleteComment(id!, commentId),
    onSuccess: () => refetchComments(),
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: (file: File) => incidentApi.uploadAttachment(id!, file),
    onSuccess: () => refetchAttachments(),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => incidentApi.deleteAttachment(id!, attachmentId),
    onSuccess: () => refetchAttachments(),
  });

  const assignMutation = useMutation({
    mutationFn: (assigneeId: string) => incidentApi.assign(id!, assigneeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      setAssignModalOpen(false);
      setSelectedAssignee('');
    },
  });

  const availableTransitions = transitionsData?.data || [];
  const history = historyData?.data || [];
  const comments = commentsData?.data || [];
  const attachments = attachmentsData?.data || [];
  const fullWorkflow = fullWorkflowData?.data;

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleTransitionClick = async (transition: AvailableTransition) => {
    setSelectedTransition(transition);
    setTransitionModalOpen(true);
    setDepartmentMatchResult(null);
    setUserMatchResult(null);
    setSelectedDepartmentId('');
    setSelectedUserId('');

    // Check if we need to fetch assignment matches
    const trans = transition.transition;
    const needsDeptMatch = trans.auto_detect_department && !trans.assign_department_id;
    const needsUserMatch = trans.auto_match_user && trans.assignment_role_id && !trans.assign_user_id;

    if ((needsDeptMatch || needsUserMatch) && incident) {
      setMatchLoading(true);
      try {
        // Fetch department matches if needed
        if (needsDeptMatch) {
          const deptResult = await departmentApi.match({
            classification_id: incident.classification?.id,
            location_id: incident.location?.id,
          });
          if (deptResult.success && deptResult.data) {
            setDepartmentMatchResult(deptResult.data);
            // Auto-select if single match
            if (deptResult.data.single_match && deptResult.data.matched_department_id) {
              setSelectedDepartmentId(deptResult.data.matched_department_id);
            }
          }
        }

        // Fetch user matches if needed
        if (needsUserMatch) {
          const userResult = await userApi.match({
            role_id: trans.assignment_role_id,
            classification_id: incident.classification?.id,
            location_id: incident.location?.id,
            department_id: incident.department?.id,
            exclude_user_id: incident.assignee?.id,
          });
          if (userResult.success && userResult.data) {
            setUserMatchResult(userResult.data);
            // Auto-select if single match
            if (userResult.data.single_match && userResult.data.matched_user_id) {
              setSelectedUserId(userResult.data.matched_user_id);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch assignment matches:', error);
      } finally {
        setMatchLoading(false);
      }
    }
  };

  const executeTransition = async () => {
    if (!selectedTransition) return;

    // Check if comment is required
    const requiresComment = selectedTransition.requirements?.some(
      r => r.requirement_type === 'comment' && r.is_mandatory
    );

    // Check if attachment is required
    const requiresAttachment = selectedTransition.requirements?.some(
      r => r.requirement_type === 'attachment' && r.is_mandatory
    );

    if (requiresComment && !transitionComment.trim()) {
      alert('A comment is required for this transition');
      return;
    }

    if (requiresAttachment && !transitionAttachment) {
      alert('An attachment is required for this transition');
      return;
    }

    try {
      let attachmentIds: string[] | undefined;

      // Upload attachment first if provided
      if (transitionAttachment) {
        setTransitionUploading(true);
        const uploadResult = await incidentApi.uploadAttachment(id!, transitionAttachment);
        if (uploadResult.data?.id) {
          attachmentIds = [uploadResult.data.id];
        }
        setTransitionUploading(false);
      }

      // Determine assignment IDs
      const trans = selectedTransition.transition;
      let departmentId: string | undefined;
      let userId: string | undefined;

      // Department assignment
      if (trans.assign_department_id) {
        // Static assignment
        departmentId = trans.assign_department_id;
      } else if (trans.auto_detect_department && selectedDepartmentId) {
        // Auto-detect with selection
        departmentId = selectedDepartmentId;
      }

      // User assignment
      if (trans.assign_user_id) {
        // Static assignment
        userId = trans.assign_user_id;
      } else if (trans.auto_match_user && selectedUserId) {
        // Auto-match with selection
        userId = selectedUserId;
      }

      transitionMutation.mutate({
        transitionId: selectedTransition.transition.id,
        comment: transitionComment || undefined,
        attachments: attachmentIds,
        department_id: departmentId,
        user_id: userId,
      });
    } catch (error) {
      setTransitionUploading(false);
      alert('Failed to upload attachment. Please try again.');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadAttachmentMutation.mutate(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[hsl(var(--primary)/0.1)] rounded-2xl mb-4">
            <div className="w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-[hsl(var(--muted-foreground))]">Loading incident...</p>
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-[hsl(var(--destructive)/0.1)] rounded-2xl flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-[hsl(var(--destructive))]" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">Incident Not Found</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">The incident you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => navigate('/incidents')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Incidents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/incidents')}
            className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Incidents
          </button>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-[hsl(var(--primary))]">{incident.incident_number}</span>
            {incident.current_state && (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: incident.current_state.color ? `${incident.current_state.color}20` : 'hsl(var(--muted))',
                  color: incident.current_state.color || 'hsl(var(--foreground))',
                }}
              >
                {incident.current_state.name}
              </span>
            )}
            {incident.sla_breached && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-600">
                <AlertTriangle className="w-3 h-3" />
                SLA Breached
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">{incident.title}</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {availableTransitions.filter(t => t.can_execute).map((transition) => (
            <Button
              key={transition.transition.id}
              variant="outline"
              size="sm"
              onClick={() => handleTransitionClick(transition)}
              leftIcon={<Play className="w-4 h-4" />}
            >
              {transition.transition.name}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <Button variant="ghost" size="sm" leftIcon={<Edit2 className="w-4 h-4" />}>
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">Description</h3>
            <p className="text-[hsl(var(--foreground))] whitespace-pre-wrap">
              {incident.description || 'No description provided.'}
            </p>
          </div>

          {/* Tabs */}
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-sm overflow-hidden">
            <div className="flex border-b border-[hsl(var(--border))]">
              <button
                onClick={() => setActiveTab('activity')}
                className={cn(
                  "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === 'activity'
                    ? 'text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                )}
              >
                <span className="flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  Activity
                </span>
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={cn(
                  "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === 'comments'
                    ? 'text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                )}
              >
                <span className="flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comments ({comments.length})
                </span>
              </button>
              <button
                onClick={() => setActiveTab('attachments')}
                className={cn(
                  "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === 'attachments'
                    ? 'text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                )}
              >
                <span className="flex items-center justify-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Attachments ({attachments.length})
                </span>
              </button>
              <button
                onClick={() => setActiveTab('revisions')}
                className={cn(
                  "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === 'revisions'
                    ? 'text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                )}
              >
                <span className="flex items-center justify-center gap-2">
                  <History className="w-4 h-4" />
                  Revisions
                </span>
              </button>
            </div>

            <div className="p-4">
              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <p className="text-center text-[hsl(var(--muted-foreground))] py-8">No activity yet.</p>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[hsl(var(--border))]" />
                      {history.map((item: TransitionHistory, index: number) => (
                        <div key={item.id} className="relative pl-10 pb-6">
                          <div className={cn(
                            "absolute left-2 w-5 h-5 rounded-full flex items-center justify-center",
                            index === 0 ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))]'
                          )}>
                            <ChevronRight className={cn(
                              "w-3 h-3",
                              index === 0 ? 'text-white' : 'text-[hsl(var(--muted-foreground))]'
                            )} />
                          </div>
                          <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <span className="font-medium text-[hsl(var(--foreground))]">
                                  {item.transition?.name || 'State Changed'}
                                </span>
                                <span className="text-[hsl(var(--muted-foreground))] mx-2">by</span>
                                <span className="font-medium text-[hsl(var(--foreground))]">
                                  {item.performed_by?.first_name || item.performed_by?.username || 'System'}
                                </span>
                              </div>
                              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                {formatDateTime(item.transitioned_at)}
                              </span>
                            </div>
                            {item.from_state && item.to_state && (
                              <div className="flex items-center gap-2 text-sm">
                                <span
                                  className="px-2 py-0.5 rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: item.from_state.color ? `${item.from_state.color}20` : 'hsl(var(--muted))',
                                    color: item.from_state.color || 'hsl(var(--foreground))',
                                  }}
                                >
                                  {item.from_state.name}
                                </span>
                                <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                                <span
                                  className="px-2 py-0.5 rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: item.to_state.color ? `${item.to_state.color}20` : 'hsl(var(--muted))',
                                    color: item.to_state.color || 'hsl(var(--foreground))',
                                  }}
                                >
                                  {item.to_state.name}
                                </span>
                              </div>
                            )}
                            {item.comment && (
                              <p className="mt-2 text-sm text-[hsl(var(--foreground))] italic">
                                "{item.comment}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Comments Tab */}
              {activeTab === 'comments' && (
                <div className="space-y-4">
                  {/* Add Comment Form */}
                  <div className="flex gap-3">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      rows={3}
                      className="flex-1 px-4 py-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                      <input
                        type="checkbox"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                        className="rounded border-[hsl(var(--border))]"
                      />
                      Internal comment (not visible to reporter)
                    </label>
                    <Button
                      size="sm"
                      onClick={() => addCommentMutation.mutate({ content: commentText, is_internal: isInternalComment })}
                      disabled={!commentText.trim() || addCommentMutation.isPending}
                      isLoading={addCommentMutation.isPending}
                      leftIcon={!addCommentMutation.isPending ? <Send className="w-4 h-4" /> : undefined}
                    >
                      Add Comment
                    </Button>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-4 mt-6">
                    {comments.length === 0 ? (
                      <p className="text-center text-[hsl(var(--muted-foreground))] py-8">No comments yet.</p>
                    ) : (
                      comments.map((comment: IncidentComment) => (
                        <div key={comment.id} className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {comment.author?.avatar ? (
                                <img
                                  src={comment.author.avatar}
                                  alt={comment.author.username}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center">
                                  <span className="text-white text-sm font-semibold">
                                    {comment.author?.first_name?.[0] || comment.author?.username?.[0] || '?'}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="font-medium text-[hsl(var(--foreground))]">
                                  {comment.author?.first_name || comment.author?.username || 'Unknown'}
                                </span>
                                {comment.is_internal && (
                                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                                    Internal
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                {formatDateTime(comment.created_at)}
                              </span>
                              <button
                                onClick={() => deleteCommentMutation.mutate(comment.id)}
                                className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-[hsl(var(--foreground))] whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Attachments Tab */}
              {activeTab === 'attachments' && (
                <div className="space-y-4">
                  {/* Upload Button */}
                  <div>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg cursor-pointer hover:opacity-90 transition-opacity">
                      <Upload className="w-4 h-4" />
                      Upload File
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploadAttachmentMutation.isPending}
                      />
                    </label>
                    {uploadAttachmentMutation.isPending && (
                      <span className="ml-2 text-sm text-[hsl(var(--muted-foreground))]">Uploading...</span>
                    )}
                  </div>

                  {/* Attachments List */}
                  <div className="space-y-2">
                    {attachments.length === 0 ? (
                      <p className="text-center text-[hsl(var(--muted-foreground))] py-8">No attachments.</p>
                    ) : (
                      attachments.map((attachment: IncidentAttachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-3 bg-[hsl(var(--muted)/0.3)] rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-[hsl(var(--background))] rounded-lg">
                              <FileText className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                                {attachment.file_name}
                              </p>
                              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                {formatFileSize(attachment.file_size)} • {formatDateTime(attachment.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteAttachmentMutation.mutate(attachment.id)}
                              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Revisions Tab */}
              {activeTab === 'revisions' && (
                <RevisionHistory incidentId={id!} />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details Card */}
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">Details</h3>
            <div className="space-y-4">
              {/* Priority */}
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Priority
                </label>
                <div className="mt-1">
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium",
                    priorityLabels[incident.priority]?.bgColor || 'bg-gray-100',
                    priorityLabels[incident.priority]?.color || 'text-gray-700'
                  )}>
                    {priorityLabels[incident.priority]?.label || `Priority ${incident.priority}`}
                  </span>
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Severity
                </label>
                <div className="mt-1">
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium",
                    severityLabels[incident.severity]?.bgColor || 'bg-gray-100',
                    severityLabels[incident.severity]?.color || 'text-gray-700'
                  )}>
                    {severityLabels[incident.severity]?.label || `Severity ${incident.severity}`}
                  </span>
                </div>
              </div>

              {/* Assignee */}
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Assignee
                </label>
                <div className="mt-1 flex items-center justify-between">
                  {incident.assignee ? (
                    <div className="flex items-center gap-2">
                      {incident.assignee.avatar ? (
                        <img
                          src={incident.assignee.avatar}
                          alt={incident.assignee.username}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {incident.assignee.first_name?.[0] || incident.assignee.username[0]}
                          </span>
                        </div>
                      )}
                      <span className="text-sm text-[hsl(var(--foreground))]">
                        {incident.assignee.first_name || incident.assignee.username}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Unassigned
                    </span>
                  )}
                  <button
                    onClick={() => setAssignModalOpen(true)}
                    className="text-xs text-[hsl(var(--primary))] hover:underline"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Department */}
              {incident.department && (
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    Department
                  </label>
                  <div className="mt-1 flex items-center gap-2 text-sm text-[hsl(var(--foreground))]">
                    <Building2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    {incident.department.name}
                  </div>
                </div>
              )}

              {/* Location */}
              {incident.location && (
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    Location
                  </label>
                  <div className="mt-1 flex items-center gap-2 text-sm text-[hsl(var(--foreground))]">
                    <MapPin className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    {incident.location.name}
                  </div>
                </div>
              )}

              {/* Due Date */}
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Due Date
                </label>
                <div className="mt-1 flex items-center gap-2 text-sm text-[hsl(var(--foreground))]">
                  <Calendar className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  {formatDate(incident.due_date)}
                </div>
              </div>

              {/* SLA Deadline */}
              {incident.sla_deadline && (
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    SLA Deadline
                  </label>
                  <div className={cn(
                    "mt-1 flex items-center gap-2 text-sm",
                    incident.sla_breached ? 'text-red-600' : 'text-[hsl(var(--foreground))]'
                  )}>
                    <Clock className="w-4 h-4" />
                    {formatDateTime(incident.sla_deadline)}
                    {incident.sla_breached && <AlertTriangle className="w-4 h-4" />}
                  </div>
                </div>
              )}

              {/* Created */}
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Created
                </label>
                <div className="mt-1 text-sm text-[hsl(var(--foreground))]">
                  {formatDateTime(incident.created_at)}
                </div>
              </div>

              {/* Reporter */}
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Reporter
                </label>
                <div className="mt-1 text-sm text-[hsl(var(--foreground))]">
                  {incident.reporter?.first_name || incident.reporter?.username || incident.reporter_name || incident.reporter_email || 'Unknown'}
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Info */}
          {incident.workflow && (
            <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">Workflow</h3>
              <p className="text-sm text-[hsl(var(--foreground))]">{incident.workflow.name}</p>
              {incident.workflow.description && (
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 mb-4">{incident.workflow.description}</p>
              )}
              {fullWorkflow && (
                <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
                  <MiniWorkflowView
                    workflow={fullWorkflow}
                    currentStateId={incident.current_state?.id}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transition Modal */}
      {transitionModalOpen && selectedTransition && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                Execute Transition
              </h3>
              <button
                onClick={() => {
                  setTransitionModalOpen(false);
                  setSelectedTransition(null);
                  setTransitionComment('');
                }}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-center gap-3 text-sm">
                <span
                  className="px-3 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: selectedTransition.transition.from_state?.color ? `${selectedTransition.transition.from_state.color}20` : 'hsl(var(--muted))',
                    color: selectedTransition.transition.from_state?.color || 'hsl(var(--foreground))',
                  }}
                >
                  {selectedTransition.transition.from_state?.name || 'Current'}
                </span>
                <ChevronRight className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                <span
                  className="px-3 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: selectedTransition.transition.to_state?.color ? `${selectedTransition.transition.to_state.color}20` : 'hsl(var(--muted))',
                    color: selectedTransition.transition.to_state?.color || 'hsl(var(--foreground))',
                  }}
                >
                  {selectedTransition.transition.to_state?.name || 'Next'}
                </span>
              </div>

              {/* Requirements */}
              {selectedTransition.requirements && selectedTransition.requirements.length > 0 && (
                <div className="bg-[hsl(var(--muted)/0.5)] rounded-lg p-3">
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase mb-2">Requirements</p>
                  <ul className="space-y-1">
                    {selectedTransition.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-[hsl(var(--foreground))]">
                        {req.is_mandatory ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                        {req.requirement_type === 'comment' && 'Comment'}
                        {req.requirement_type === 'attachment' && 'Attachment'}
                        {req.requirement_type === 'field_value' && 'Field value'}
                        {req.is_mandatory && <span className="text-xs text-amber-500">(required)</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Assignment Section */}
              {matchLoading ? (
                <div className="bg-[hsl(var(--muted)/0.5)] rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                    <div className="w-4 h-4 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
                    Loading assignment options...
                  </div>
                </div>
              ) : (
                <>
                  {/* Department Assignment */}
                  {(selectedTransition.transition.assign_department_id || selectedTransition.transition.auto_detect_department) && (
                    <div className="bg-[hsl(var(--muted)/0.5)] rounded-lg p-3">
                      <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase mb-2 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        Department Assignment
                      </p>
                      {selectedTransition.transition.assign_department_id ? (
                        <p className="text-sm text-[hsl(var(--foreground))]">
                          Will assign to: <span className="font-medium">{selectedTransition.transition.assign_department?.name || 'Selected Department'}</span>
                        </p>
                      ) : departmentMatchResult ? (
                        departmentMatchResult.departments.length === 0 ? (
                          <p className="text-sm text-amber-600">No matching departments found</p>
                        ) : departmentMatchResult.single_match ? (
                          <p className="text-sm text-[hsl(var(--foreground))]">
                            Will assign to: <span className="font-medium">{departmentMatchResult.departments[0]?.name}</span>
                          </p>
                        ) : (
                          <select
                            value={selectedDepartmentId}
                            onChange={(e) => setSelectedDepartmentId(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-md text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                          >
                            <option value="">Select department...</option>
                            {departmentMatchResult.departments.map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {dept.name}
                              </option>
                            ))}
                          </select>
                        )
                      ) : (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Auto-detect based on classification & location</p>
                      )}
                    </div>
                  )}

                  {/* User Assignment */}
                  {(selectedTransition.transition.assign_user_id || (selectedTransition.transition.auto_match_user && selectedTransition.transition.assignment_role_id)) && (
                    <div className="bg-[hsl(var(--muted)/0.5)] rounded-lg p-3">
                      <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase mb-2 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        User Assignment
                        {selectedTransition.transition.assignment_role && (
                          <span className="text-[hsl(var(--primary))]">({selectedTransition.transition.assignment_role.name})</span>
                        )}
                      </p>
                      {selectedTransition.transition.assign_user_id ? (
                        <p className="text-sm text-[hsl(var(--foreground))]">
                          Will assign to: <span className="font-medium">
                            {selectedTransition.transition.assign_user?.first_name || selectedTransition.transition.assign_user?.username || 'Selected User'}
                          </span>
                        </p>
                      ) : userMatchResult ? (
                        userMatchResult.users.length === 0 ? (
                          <p className="text-sm text-amber-600">No matching users found</p>
                        ) : userMatchResult.single_match ? (
                          <p className="text-sm text-[hsl(var(--foreground))]">
                            Will assign to: <span className="font-medium">
                              {userMatchResult.users[0]?.first_name
                                ? `${userMatchResult.users[0].first_name} ${userMatchResult.users[0].last_name || ''}`
                                : userMatchResult.users[0]?.username}
                            </span>
                          </p>
                        ) : (
                          <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-md text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                          >
                            <option value="">Select user...</option>
                            {userMatchResult.users.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.username} ({user.email})
                              </option>
                            ))}
                          </select>
                        )
                      ) : (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Auto-match based on role & criteria</p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Attachment */}
              {selectedTransition.requirements?.some(r => r.requirement_type === 'attachment') && (
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    Attachment
                    {selectedTransition.requirements?.some(r => r.requirement_type === 'attachment' && r.is_mandatory) && (
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
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          ({(transitionAttachment.size / 1024).toFixed(1)} KB)
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
                      <span className="text-sm text-[hsl(var(--muted-foreground))]">Click to upload file</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setTransitionAttachment(file);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  Comment
                  {selectedTransition.requirements?.some(r => r.requirement_type === 'comment' && r.is_mandatory) && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                <textarea
                  value={transitionComment}
                  onChange={(e) => setTransitionComment(e.target.value)}
                  placeholder="Add a comment for this transition..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
              <Button
                variant="ghost"
                onClick={() => {
                  setTransitionModalOpen(false);
                  setSelectedTransition(null);
                  setTransitionComment('');
                  setTransitionAttachment(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={executeTransition}
                isLoading={transitionMutation.isPending || transitionUploading}
                leftIcon={!(transitionMutation.isPending || transitionUploading) ? <Play className="w-4 h-4" /> : undefined}
              >
                {transitionUploading ? 'Uploading...' : 'Execute'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                Assign Incident
              </h3>
              <button
                onClick={() => {
                  setAssignModalOpen(false);
                  setSelectedAssignee('');
                }}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Select Assignee
              </label>
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="w-full px-4 py-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
              >
                <option value="">Select a user...</option>
                {usersData?.data?.map((user: UserType) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.username} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
              <Button
                variant="ghost"
                onClick={() => {
                  setAssignModalOpen(false);
                  setSelectedAssignee('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => assignMutation.mutate(selectedAssignee)}
                disabled={!selectedAssignee}
                isLoading={assignMutation.isPending}
                leftIcon={!assignMutation.isPending ? <User className="w-4 h-4" /> : undefined}
              >
                Assign
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
