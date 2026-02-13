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
  Download,
  X,
  History,
  Tags,
  Star,
  ExternalLink,
  Phone,
  ThumbsUp,
  AlertTriangle,
  MapPin,
  FileText,
  Upload,
  Radio,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { MiniWorkflowView } from '../../components/workflow';
import { RevisionHistory } from '../../components/incidents';
import { queryApi, userApi } from '../../api/admin';
import { API_URL } from '../../api/client';
import type {
  AvailableTransition,
} from '../../types';
import { cn } from '@/lib/utils';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon - using local images
const defaultIcon = new Icon({
  iconUrl: '/images/leaflet/marker-icon.png',
  iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
  shadowUrl: '/images/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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

  // Image lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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
        version: query?.version || 1,
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

  const executeTransition = () => {
    if (!selectedTransition) return;

    // Check if comment is required
    const requiresComment = selectedTransition.requirements?.some(
      r => r.requirement_type === 'comment' && r.is_mandatory
    );

    // Check if attachment is required
    const requiresAttachment = selectedTransition.requirements?.some(
      r => r.requirement_type === 'attachment' && r.is_mandatory
    );

    // Check if feedback is required
    const requiresFeedback = selectedTransition.requirements?.some(
      r => r.requirement_type === 'feedback' && r.is_mandatory
    );

    if (requiresComment && !transitionComment.trim()) {
      alert('A comment is required for this transition');
      return;
    }

    if (requiresAttachment && !transitionAttachment) {
      alert('An attachment is required for this transition');
      return;
    }

    if (requiresFeedback && transitionFeedbackRating === 0) {
      alert('Feedback rating is required for this transition');
      return;
    }

    // All validations passed, execute the transition
    transitionMutation.mutate();
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

  // Helper to check if attachment is an image
  const isImageFile = (mimeType: string) => {
    return mimeType && mimeType.startsWith('image/');
  };

  // Helper to check if attachment is audio
  const isAudioFile = (mimeType: string, fileName: string) => {
    // Check mime type first
    if (mimeType && mimeType.startsWith('audio/')) {
      return true;
    }
    // Fallback to file extension check
    const audioExtensions = /\.(mp3|wav|m4a|aac|ogg|webm|flac)$/i;
    return audioExtensions.test(fileName);
  };

  // Categorize attachments
  const imageAttachments = attachments?.filter(att => isImageFile(att.mime_type)) || [];
  const audioAttachments = attachments?.filter(att => isAudioFile(att.mime_type, att.file_name)) || [];
  const otherAttachments = attachments?.filter(att => !isImageFile(att.mime_type) && !isAudioFile(att.mime_type, att.file_name)) || [];

  // Open image in lightbox
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (isLoading) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
            className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.backToQueries', 'Back to Queries')}
          </button>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-[hsl(var(--primary))]">{query.incident_number}</span>
            {query.current_state && (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: query.current_state.color ? `${query.current_state.color}20` : 'hsl(var(--muted))',
                  color: query.current_state.color || 'hsl(var(--foreground))',
                }}
              >
                {query.current_state.name}
              </span>
            )}
            {query.sla_breached && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-600">
                <AlertTriangle className="w-3 h-3" />
                {t('queries.slaBreached')}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">{query.title}</h1>
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
          {isClosed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => evaluateMutation.mutate()}
              isLoading={evaluateMutation.isPending}
              leftIcon={<ThumbsUp className="w-4 h-4" />}
            >
              {t('queries.evaluate', 'Evaluate')} ({query.evaluation_count || 0})
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            {t('common.refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
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
                    <>
                      {/* Image Gallery */}
                      {imageAttachments.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">{t('common.images', 'Images')}</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {imageAttachments.map((attachment, index) => (
                              <div
                                key={attachment.id}
                                className="relative group rounded-lg overflow-hidden border-2 border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] transition-all cursor-pointer"
                                onClick={() => openLightbox(index)}
                              >
                                <img
                                  src={getAuthenticatedAttachmentUrl(attachment.id)}
                                  alt={attachment.file_name}
                                  className="w-full h-32 object-cover transition-opacity hover:opacity-90"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <button className="p-2 bg-white/90 rounded-full text-gray-700 hover:bg-white transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                    </svg>
                                  </button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate">
                                  {attachment.file_name}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Audio Files */}
                      {audioAttachments.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">{t('common.audio', 'Audio')}</h3>
                          {audioAttachments.map((attachment) => (
                            <div key={attachment.id} className="p-3 bg-[hsl(var(--muted)/0.3)] rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-[hsl(var(--background))] rounded-lg">
                                    <svg className="w-5 h-5 text-[hsl(var(--primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">{attachment.file_name}</p>
                                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                      {(attachment.file_size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => downloadAttachment(attachment.id, attachment.file_name)}
                                  className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                              <audio
                                controls
                                className="w-full h-10"
                                src={getAuthenticatedAttachmentUrl(attachment.id)}
                                preload="metadata"
                              >
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Other Files */}
                      {otherAttachments.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">{t('common.files', 'Files')}</h3>
                          <div className="space-y-2">
                            {otherAttachments.map((attachment) => (
                              <div key={attachment.id} className="flex items-center justify-between p-3 bg-[hsl(var(--muted)/0.3)] rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-[hsl(var(--background))] rounded-lg">
                                    <FileText className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                                  </div>
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
                            ))}
                          </div>
                        </div>
                      )}
                    </>
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

              {/* Source */}
              {query.source && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <Radio className="w-4 h-4 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('queries.source', 'Source')}</p>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] capitalize">{query.source.replace('_', ' ')}</p>
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

              {/* Geolocation - only show if has coordinates */}
              {(query.latitude !== undefined && query.longitude !== undefined) && (
                <div className="pt-4 border-t border-[hsl(var(--border))]">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-violet-500" />
                    <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">{t('queries.geolocation', 'Geolocation')}</h3>
                  </div>
                  <div className="space-y-2">
                    {/* Map - compact height */}
                    <div className="h-32 rounded-lg overflow-hidden border border-[hsl(var(--border))]">
                      <MapContainer
                        center={[query.latitude, query.longitude]}
                        zoom={15}
                        className="h-full w-full"
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={false}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker
                          position={[query.latitude, query.longitude]}
                          icon={defaultIcon}
                        />
                      </MapContainer>
                    </div>
                    {/* Compact location info */}
                    <div className="text-xs text-[hsl(var(--muted-foreground))] space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          {query.latitude?.toFixed(6)}, {query.longitude?.toFixed(6)}
                        </span>
                      </div>
                      {query.address && (
                        <p className="break-words">{query.address}</p>
                      )}
                      {(query.city || query.state || query.country) && (
                        <p>
                          {[query.city, query.state, query.country, query.postal_code].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Workflow Info */}
          {query.workflow && (
            <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">{t('queries.workflow', 'Workflow')}</h3>
              <p className="text-sm text-[hsl(var(--foreground))]">{query.workflow.name}</p>
              {query.workflow.description && (
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 mb-4">{query.workflow.description}</p>
              )}
              {query.workflow && (
                <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
                  <MiniWorkflowView
                    workflow={query.workflow}
                    currentStateId={query.current_state?.id}
                  />
                </div>
              )}
            </div>
          )}
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
                  {selectedTransition.requirements?.some(r => r.requirement_type === 'comment' && r.is_mandatory) && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                <textarea
                  value={transitionComment}
                  onChange={(e) => setTransitionComment(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  placeholder={t('common.addOptionalComment', 'Add an optional comment...')}
                />
              </div>

              {/* Attachment */}
              {selectedTransition.requirements?.some(r => r.requirement_type === 'attachment') && (
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                    {t('common.attachment', 'Attachment')}
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
                    <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-[hsl(var(--border))] rounded-lg cursor-pointer hover:border-violet-500 hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
                      <Upload className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-sm text-[hsl(var(--muted-foreground))]">{t('common.clickToUpload', 'Click to upload')}</span>
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
                onClick={executeTransition}
                isLoading={transitionMutation.isPending || transitionUploading}
                className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
              >
                {transitionUploading ? t('common.uploading', 'Uploading...') : t('common.confirm', 'Confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxOpen && imageAttachments.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Image Name */}
          <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1.5 rounded-lg">
            {imageAttachments[lightboxIndex]?.file_name}
          </div>

          {/* Download Button */}
          <a
            href={getAuthenticatedAttachmentUrl(imageAttachments[lightboxIndex]?.id)}
            download={imageAttachments[lightboxIndex]?.file_name}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <Download className="w-6 h-6" />
          </a>

          {/* Navigation Arrows */}
          {imageAttachments.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev > 0 ? prev - 1 : imageAttachments.length - 1));
                }}
                className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <ChevronRight className="w-6 h-6 rotate-180" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev < imageAttachments.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Image Counter */}
          {imageAttachments.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1.5 rounded-lg">
              {lightboxIndex + 1} / {imageAttachments.length}
            </div>
          )}

          {/* Image */}
          <img
            src={getAuthenticatedAttachmentUrl(imageAttachments[lightboxIndex]?.id)}
            alt={imageAttachments[lightboxIndex]?.file_name}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
