import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Calendar,
  User,
  Building2,
  MessageSquare,
  Paperclip,
  Send,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Play,
  HelpCircle,
  Download,
  X,
  History,
  Tags,
  Star,
  ExternalLink,
  Phone,
  ThumbsUp,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { MiniWorkflowView } from '../../components/workflow';
import { RevisionHistory } from '../../components/incidents';
import { queryApi, userApi } from '../../api/admin';
import { API_URL } from '../../api/client';
import { AudioPlayer } from '../../components/common/AudioPlayer';
import type {
  AvailableTransition,
} from '../../types';
import { cn } from '@/lib/utils';

export const QueryDetailPage: React.FC = () => {
  const { t } = useTranslation();
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
  const [transitionFeedbackRating, setTransitionFeedbackRating] = useState<number>(0);
  const [transitionFeedbackComment, setTransitionFeedbackComment] = useState('');

  // Queries
  const { data: queryData, isLoading, error, refetch } = useQuery({
    queryKey: ['query', id],
    queryFn: () => queryApi.getById(id!),
    enabled: !!id,
  });

  const { data: transitionsData, refetch: refetchTransitions } = useQuery({
    queryKey: ['query', id, 'transitions'],
    queryFn: () => queryApi.getAvailableTransitions(id!),
    enabled: !!id,
  });

  const { data: historyData } = useQuery({
    queryKey: ['query', id, 'history'],
    queryFn: () => queryApi.getHistory(id!),
    enabled: !!id,
  });

  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ['query', id, 'comments'],
    queryFn: () => queryApi.listComments(id!),
    enabled: !!id,
  });

  const { data: attachmentsData } = useQuery({
    queryKey: ['query', id, 'attachments'],
    queryFn: () => queryApi.listAttachments(id!),
    enabled: !!id,
  });

  useQuery({
    queryKey: ['admin', 'users', 1, 100],
    queryFn: () => userApi.list(1, 100),
  });

  const query = queryData?.data;
  const availableTransitions = transitionsData?.data || [];
  const history = historyData?.data || [];
  const comments = commentsData?.data || [];
  const attachments = attachmentsData?.data || [];

  // Check if query is closed (terminal state)
  const isClosed = query?.current_state?.state_type === 'terminal';

  // Helper function to download attachment with authentication
  const downloadAttachment = async (attachmentId: string, fileName: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/attachments/${attachmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download attachment');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Failed to download attachment');
    }
  };

  // Helper function to get authenticated attachment URL for audio/video
  const getAuthenticatedAttachmentUrl = (attachmentId: string): string => {
    const token = localStorage.getItem('token');
    return `${API_URL}/attachments/${attachmentId}?token=${token}`;
  };

  // Mutations
  const transitionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTransition) return;

      let attachmentIds: string[] | undefined;
      if (transitionAttachment) {
        setTransitionUploading(true);
        const uploadResult = await queryApi.uploadAttachment(id!, transitionAttachment);
        setTransitionUploading(false);
        if (uploadResult.data?.id) {
          attachmentIds = [uploadResult.data.id];
        }
      }

      return queryApi.transition(id!, {
        transition_id: selectedTransition.transition.id,
        comment: transitionComment || undefined,
        attachments: attachmentIds,
        feedback: transitionFeedbackRating > 0 ? {
          rating: transitionFeedbackRating,
          comment: transitionFeedbackComment || undefined,
        } : undefined,
      });
    },
    onSuccess: () => {
      refetch();
      refetchTransitions();
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['query', id, 'history'] });
      setTransitionModalOpen(false);
      setSelectedTransition(null);
      setTransitionComment('');
      setTransitionAttachment(null);
      setTransitionFeedbackRating(0);
      setTransitionFeedbackComment('');
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: () => queryApi.addComment(id!, {
      content: commentText,
      is_internal: isInternalComment,
    }),
    onSuccess: () => {
      refetchComments();
      setCommentText('');
    },
  });

  const evaluateMutation = useMutation({
    mutationFn: () => queryApi.incrementEvaluation(id!),
    onSuccess: () => {
      refetch();
    },
  });

  const handleTransitionClick = (transition: AvailableTransition) => {
    setSelectedTransition(transition);
    setTransitionModalOpen(true);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isAudioFile = (mimeType: string, fileName: string) => {
    // Check mime type first
    if (mimeType && mimeType.startsWith('audio/')) {
      return true;
    }
    // Fallback to file extension check
    const audioExtensions = /\.(mp3|wav|m4a|aac|ogg|webm|flac)$/i;
    return audioExtensions.test(fileName);
  };

  if (isLoading) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="w-14 h-14 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-4">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-[hsl(var(--muted-foreground))]">{t('queries.loading', 'Loading query...')}</p>
        </div>
      </div>
    );
  }

  if (error || !query) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-[hsl(var(--destructive)/0.1)] rounded-2xl flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-[hsl(var(--destructive))]" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{t('queries.notFound', 'Query Not Found')}</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">{t('queries.notFoundDesc', 'The query you are looking for does not exist.')}</p>
          <Button onClick={() => navigate('/queries')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            {t('common.backToList', 'Back to List')}
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
            onClick={() => navigate('/queries')}
            className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] text-sm mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.backToQueries', 'Back to Queries')}
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <HelpCircle className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-violet-500 mb-0.5">{query.incident_number}</p>
              <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">{query.title}</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            {t('common.refresh', 'Refresh')}
          </Button>
          {isClosed && (
            <Button
              size="sm"
              onClick={() => evaluateMutation.mutate()}
              isLoading={evaluateMutation.isPending}
              leftIcon={<ThumbsUp className="w-4 h-4" />}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {t('queries.evaluate', 'Evaluate')} ({query.evaluation_count || 0})
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Workflow */}
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">{t('common.status', 'Status')}</h2>
              {query.current_state && (
                <span
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: query.current_state.color ? `${query.current_state.color}20` : 'hsl(var(--muted))',
                    color: query.current_state.color || 'hsl(var(--foreground))',
                  }}
                >
                  {query.current_state.name}
                </span>
              )}
            </div>

            {/* Available Transitions */}
            {availableTransitions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
                <p className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-3">{t('common.availableActions', 'Available Actions')}</p>
                <div className="flex flex-wrap gap-2">
                  {availableTransitions.map((transition) => (
                    <Button
                      key={transition.transition.id}
                      size="sm"
                      variant={transition.can_execute ? 'default' : 'outline'}
                      disabled={!transition.can_execute}
                      onClick={() => handleTransitionClick(transition)}
                      leftIcon={<Play className="w-4 h-4" />}
                      className={transition.can_execute ? 'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600' : ''}
                    >
                      {transition.transition.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Mini Workflow View */}
            {query.workflow && (
              <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
                <MiniWorkflowView
                  workflow={query.workflow}
                  currentStateId={query.current_state?.id}
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">{t('common.description', 'Description')}</h2>
            <p className="text-[hsl(var(--foreground))] whitespace-pre-wrap">
              {query.description || t('common.noDescription', 'No description provided.')}
            </p>
          </div>

          {/* Tabs: Activity, Comments, Attachments, Revisions */}
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-sm">
            <div className="flex border-b border-[hsl(var(--border))]">
              {(['activity', 'comments', 'attachments', 'revisions'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 px-4 py-3 text-sm font-medium transition-colors relative",
                    activeTab === tab
                      ? "text-violet-500"
                      : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    {tab === 'activity' && <History className="w-4 h-4" />}
                    {tab === 'comments' && <MessageSquare className="w-4 h-4" />}
                    {tab === 'attachments' && <Paperclip className="w-4 h-4" />}
                    {tab === 'revisions' && <Tags className="w-4 h-4" />}
                    <span className="capitalize">{t(`tabs.${tab}`, tab)}</span>
                    {tab === 'comments' && comments.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-violet-500/10 text-violet-500 rounded-full">
                        {comments.length}
                      </span>
                    )}
                    {tab === 'attachments' && attachments.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-violet-500/10 text-violet-500 rounded-full">
                        {attachments.length}
                      </span>
                    )}
                  </div>
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <p className="text-center text-[hsl(var(--muted-foreground))] py-8">{t('common.noActivity', 'No activity yet.')}</p>
                  ) : (
                    <div className="space-y-4">
                      {history.map((item) => (
                        <div key={item.id} className="flex gap-4 pb-4 border-b border-[hsl(var(--border))] last:border-0">
                          <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                            <ChevronRight className="w-4 h-4 text-violet-500" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-[hsl(var(--foreground))]">
                                {item.performed_by?.first_name || item.performed_by?.username || 'System'}
                              </span>
                              <span className="text-[hsl(var(--muted-foreground))]">
                                {t('common.transitionedTo', 'transitioned to')}
                              </span>
                              <span
                                className="px-2 py-0.5 rounded text-xs font-medium"
                                style={{
                                  backgroundColor: item.to_state?.color ? `${item.to_state.color}20` : 'hsl(var(--muted))',
                                  color: item.to_state?.color || 'hsl(var(--foreground))',
                                }}
                              >
                                {item.to_state?.name}
                              </span>
                            </div>
                            {item.comment && (
                              <p className="mt-2 text-sm text-[hsl(var(--foreground))] bg-[hsl(var(--muted)/0.3)] p-3 rounded-lg">
                                {item.comment}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                              {formatDate(item.transitioned_at)}
                            </p>
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
                      placeholder={t('common.addComment', 'Add a comment...')}
                      className="flex-1 px-4 py-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                      rows={2}
                    />
                    <Button
                      onClick={() => addCommentMutation.mutate()}
                      isLoading={addCommentMutation.isPending}
                      disabled={!commentText.trim()}
                      leftIcon={<Send className="w-4 h-4" />}
                      className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
                    >
                      {t('common.send', 'Send')}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      id="internal"
                      checked={isInternalComment}
                      onChange={(e) => setIsInternalComment(e.target.checked)}
                      className="rounded border-[hsl(var(--border))]"
                    />
                    <label htmlFor="internal" className="text-[hsl(var(--muted-foreground))]">
                      {t('common.internalComment', 'Internal comment (not visible to reporter)')}
                    </label>
                  </div>

                  {/* Comments List */}
                  {comments.length === 0 ? (
                    <p className="text-center text-[hsl(var(--muted-foreground))] py-8">{t('common.noComments', 'No comments yet.')}</p>
                  ) : (
                    <div className="space-y-4 mt-6">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 pb-4 border-b border-[hsl(var(--border))] last:border-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-semibold">
                              {comment.author?.first_name?.[0] || comment.author?.username?.[0] || 'U'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[hsl(var(--foreground))]">
                                {comment.author?.first_name || comment.author?.username}
                              </span>
                              {comment.is_internal && (
                                <span className="px-1.5 py-0.5 text-xs bg-yellow-500/10 text-yellow-600 rounded">
                                  {t('common.internal', 'Internal')}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-[hsl(var(--foreground))]">{comment.content}</p>
                            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{formatDate(comment.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Attachments Tab */}
              {activeTab === 'attachments' && (
                <div className="space-y-4">
                  {attachments.length === 0 ? (
                    <p className="text-center text-[hsl(var(--muted-foreground))] py-8">{t('common.noAttachments', 'No attachments yet.')}</p>
                  ) : (
                    <div className="space-y-3">
                      {attachments.map((attachment) => (
                        <div key={attachment.id} className="p-4 bg-[hsl(var(--muted)/0.3)] rounded-lg">
                          {isAudioFile(attachment.mime_type, attachment.file_name) ? (
                            <AudioPlayer
                              src={getAuthenticatedAttachmentUrl(attachment.id)}
                              fileName={attachment.file_name}
                            />
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Paperclip className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                                <div>
                                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">{attachment.file_name}</p>
                                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                    {(attachment.file_size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => downloadAttachment(attachment.id, attachment.file_name)}
                                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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
          {/* Query Info */}
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">{t('queries.details', 'Query Details')}</h2>
            <div className="space-y-4">
              {/* Channel */}
              {query.channel && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('common.channel', 'Channel')}</p>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] capitalize">{query.channel}</p>
                  </div>
                </div>
              )}

              {/* Created By */}
              {(query.created_by_name || query.created_by_mobile) && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('queries.createdBy', 'Created By')}</p>
                    {query.created_by_name && (
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">{query.created_by_name}</p>
                    )}
                    {query.created_by_mobile && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {query.created_by_mobile}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Source Incident */}
              {query.source_incident_id && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <ExternalLink className="w-4 h-4 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('queries.sourceIncident', 'Source Incident')}</p>
                    <Link
                      to={`/incidents/${query.source_incident_id}`}
                      className="text-sm font-medium text-violet-500 hover:underline flex items-center gap-1"
                    >
                      {query.source_incident?.incident_number || t('queries.viewIncident', 'View Incident')}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Classification */}
              {query.classification && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <Tags className="w-4 h-4 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('common.classification', 'Classification')}</p>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">{query.classification.name}</p>
                  </div>
                </div>
              )}

              {/* Assignee */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-violet-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('common.assignee', 'Assignee')}</p>
                  {query.assignee ? (
                    <div className="flex items-center gap-2 mt-1">
                      {query.assignee.avatar ? (
                        <img src={query.assignee.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {query.assignee.first_name?.[0] || query.assignee.username[0]}
                          </span>
                        </div>
                      )}
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {query.assignee.first_name || query.assignee.username}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('common.unassigned', 'Unassigned')}</p>
                  )}
                </div>
              </div>

              {/* Department */}
              {query.department && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('common.department', 'Department')}</p>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">{query.department.name}</p>
                  </div>
                </div>
              )}

              {/* Created Date */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('common.created', 'Created')}</p>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">{formatDate(query.created_at)}</p>
                </div>
              </div>

              {/* Closed Date */}
              {query.closed_at && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('common.closed', 'Closed')}</p>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">{formatDate(query.closed_at)}</p>
                  </div>
                </div>
              )}

              {/* Evaluations (for closed queries) */}
              {isClosed && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <ThumbsUp className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('queries.evaluations', 'Evaluations')}</p>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">{query.evaluation_count || 0}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transition Modal */}
      {transitionModalOpen && selectedTransition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]">
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                {selectedTransition.transition.name}
              </h3>
              <button
                onClick={() => setTransitionModalOpen(false)}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Requirements info */}
              {selectedTransition.requirements && selectedTransition.requirements.length > 0 && (
                <div className="p-3 bg-violet-500/10 rounded-lg text-sm">
                  <p className="font-medium text-violet-600 mb-2">{t('common.requirements', 'Requirements')}:</p>
                  <ul className="list-disc list-inside text-violet-700 space-y-1">
                    {selectedTransition.requirements.map((req) => (
                      <li key={req.id}>
                        {req.requirement_type === 'comment' && t('common.commentRequired', 'Comment is required')}
                        {req.requirement_type === 'attachment' && t('common.attachmentRequired', 'Attachment is required')}
                        {req.requirement_type === 'feedback' && t('common.feedbackRequired', 'Feedback is required')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                  {t('common.comment', 'Comment')}
                </label>
                <textarea
                  value={transitionComment}
                  onChange={(e) => setTransitionComment(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  placeholder={t('common.addOptionalComment', 'Add an optional comment...')}
                />
              </div>

              {/* Feedback (if required) */}
              {selectedTransition.requirements?.some(r => r.requirement_type === 'feedback') && (
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                    {t('common.rating', 'Rating')}
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setTransitionFeedbackRating(rating)}
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                          transitionFeedbackRating >= rating
                            ? "bg-violet-500 text-white"
                            : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-violet-500/20"
                        )}
                      >
                        <Star className={cn("w-5 h-5", transitionFeedbackRating >= rating && "fill-current")} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={transitionFeedbackComment}
                    onChange={(e) => setTransitionFeedbackComment(e.target.value)}
                    rows={2}
                    className="w-full mt-2 px-4 py-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    placeholder={t('common.feedbackComment', 'Add feedback comment...')}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-[hsl(var(--border))]">
              <Button variant="outline" onClick={() => setTransitionModalOpen(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={() => transitionMutation.mutate()}
                isLoading={transitionMutation.isPending || transitionUploading}
                className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
              >
                {t('common.confirm', 'Confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
