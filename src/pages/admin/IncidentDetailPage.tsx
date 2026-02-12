import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  Calendar,
  User,
  Users,
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
  Tags,
  Star,
  ArrowRightLeft,
  ExternalLink,
  Radio,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { MiniWorkflowView } from '../../components/workflow';
import { RevisionHistory, ConvertToRequestModal } from '../../components/incidents';
import { incidentApi, userApi, workflowApi, departmentApi, lookupApi } from '../../api/admin';
import { API_URL } from '../../api/client';
import type {
  IncidentDetail,
  AvailableTransition,
  IncidentComment,
  IncidentAttachment,
  TransitionHistory,
  User as UserType,
  DepartmentMatchResponse,
  UserMatchResponse,
  LookupValue,
} from '../../types';
import { cn } from '@/lib/utils';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../constants/permissions';
import { useAuthStore } from '../../stores/authStore';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { parseCustomLookupFields, formatCustomLookupValue } from '../../utils/customFields';
import { useIncidentWebSocket } from '../../lib/services/incidentWebSocket';

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

export const IncidentDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const canEditIncident = isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_UPDATE);
  const canViewReports = isSuperAdmin || hasPermission(PERMISSIONS.REPORTS_VIEW);

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
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [convertModalOpen, setConvertModalOpen] = useState(false);

  // Assignment matching state
  const [matchLoading, setMatchLoading] = useState(false);
  const [departmentMatchResult, setDepartmentMatchResult] = useState<DepartmentMatchResponse | null>(null);
  const [userMatchResult, setUserMatchResult] = useState<UserMatchResponse | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Image lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  // Image comparison state
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<IncidentAttachment[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareSliderPosition, setCompareSliderPosition] = useState(50);

  // Report download state
  const [downloadingReport, setDownloadingReport] = useState(false);

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

  const { data: lookupCategoriesData } = useQuery({
    queryKey: ['admin', 'lookups', 'categories'],
    queryFn: () => lookupApi.listCategories(),
  });

  // Check if user can convert incident to request
  const { data: canConvertData } = useQuery({
    queryKey: ['incident', id, 'can-convert'],
    queryFn: () => incidentApi.canConvertToRequest(id!),
    enabled: !!id && incidentData?.data?.record_type === 'incident',
  });

  const incident = incidentData?.data as IncidentDetail | undefined;
  const canConvertToRequest = canConvertData?.data?.can_convert ?? false;
  const lookupCategories = lookupCategoriesData?.data || [];
  const user = useAuthStore((state) => state.user);

  // WebSocket real-time connection - replaces polling!
  // Automatically handles presence, updates, and notifications
  useIncidentWebSocket(id, user?.id);

  // Presence tracking - get active users viewing this incident
  // Now only fetches initially and when WebSocket pushes updates
  const { data: presenceData } = useQuery({
    queryKey: ['incident-presence', id],
    queryFn: () => incidentApi.getPresence(id!),
    enabled: !!id,
    refetchInterval: 60000, // Only poll every 60 seconds as backup (WebSocket is primary)
    refetchOnWindowFocus: false,
  });

  // Mark presence on mount and periodically as backup
  // (WebSocket connection is primary presence indicator)
  useEffect(() => {
    if (!id) return;

    // Mark initial presence
    incidentApi.markPresence(id).catch((err) => {
      console.error('Failed to mark presence:', err);
    });

    // Update presence every 3 minutes as backup (WebSocket is primary)
    const presenceInterval = setInterval(() => {
      incidentApi.markPresence(id).catch((err) => {
        console.error('Failed to mark presence:', err);
      });
    }, 180000); // 3 minutes (increased from 2 min since WebSocket handles this)

    // Cleanup on unmount
    return () => {
      clearInterval(presenceInterval);
      incidentApi.removePresence(id).catch((err) => {
        console.error('Failed to remove presence:', err);
      });
    };
  }, [id]);

  // Calculate other users (exclude current user)
  const otherUsers = useMemo(() => {
    return presenceData?.data?.filter(u => u.user_id !== user?.id) || [];
  }, [presenceData, user?.id]);

  const groupedLookupValues = useMemo(() => {
    if (!incident?.lookup_values) return {};
    return incident.lookup_values.reduce((acc, value) => {
      const categoryName = value.category?.name || 'Other';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(value);
      return acc;
    }, {} as Record<string, LookupValue[]>);
  }, [incident?.lookup_values]);

  // Parse custom lookup fields from custom_fields JSON
  const customLookupFields = useMemo(() => {
    return parseCustomLookupFields(incident?.custom_fields, lookupCategories);
  }, [incident?.custom_fields, lookupCategories]);

  // Fetch full workflow with states and transitions for visualization
  const { data: fullWorkflowData } = useQuery({
    queryKey: ['admin', 'workflow', incident?.workflow?.id],
    queryFn: () => workflowApi.getById(incident!.workflow!.id),
    enabled: !!incident?.workflow?.id,
  });

  // Mutations
  const transitionMutation = useMutation({
    mutationFn: ({ transitionId, comment, attachments, feedback, department_id, user_id }: {
      transitionId: string;
      comment?: string;
      attachments?: string[];
      feedback?: { rating: number; comment?: string };
      department_id?: string;
      user_id?: string;
    }) =>
      incidentApi.transition(id!, {
        transition_id: transitionId,
        comment,
        attachments,
        feedback,
        department_id,
        user_id,
        version: incident?.version || 1, // Include current version for optimistic locking
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      refetchTransitions();
      refetchAttachments();
      setTransitionModalOpen(false);
      setSelectedTransition(null);
      setTransitionComment('');
      setTransitionAttachment(null);
      setTransitionFeedbackRating(0);
      setTransitionFeedbackComment('');
      setDepartmentMatchResult(null);
      setUserMatchResult(null);
      setSelectedDepartmentId('');
      setSelectedUserId('');
      toast.success('Transition completed successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to execute transition';

      // Check for version conflict
      if (errorMessage.includes('conflict') || errorMessage.includes('modified by another user')) {
        toast.error('Conflict Detected', {
          description: 'This incident was modified by another user. Refreshing...',
          duration: 5000,
        });

        // Auto-refresh after short delay
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['incident', id] });
          refetchTransitions();
        }, 1000);
      } else {
        toast.error('Transition Failed', {
          description: errorMessage,
        });
      }
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

  // Helper to check if attachment is an image
  const isImageAttachment = (mimeType: string) => {
    return mimeType.startsWith('image/');
  };

  // Helper to check if attachment is audio
  const isAudioAttachment = (mimeType: string) => {
    return mimeType.startsWith('audio/');
  };

  // Get attachment URL with auth token
  const getAttachmentUrl = (attachmentId: string) => {
    const token = localStorage.getItem('token');
    return `${API_URL}/attachments/${attachmentId}?token=${token}`;
  };

  // Open image in lightbox
  const openLightbox = (attachment: IncidentAttachment) => {
    setLightboxImage({
      url: getAttachmentUrl(attachment.id),
      name: attachment.file_name,
    });
    setLightboxOpen(true);
  };

  // Toggle image selection for comparison
  const toggleCompareSelection = (attachment: IncidentAttachment) => {
    setSelectedForCompare(prev => {
      const isSelected = prev.some(a => a.id === attachment.id);
      if (isSelected) {
        return prev.filter(a => a.id !== attachment.id);
      } else if (prev.length < 2) {
        return [...prev, attachment];
      }
      return prev;
    });
  };

  // Check if attachment is selected for comparison
  const isSelectedForCompare = (attachmentId: string) => {
    return selectedForCompare.some(a => a.id === attachmentId);
  };

  // Open comparison modal
  const openCompareModal = () => {
    if (selectedForCompare.length === 2) {
      setCompareSliderPosition(50);
      setCompareModalOpen(true);
    }
  };

  // Exit compare mode
  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedForCompare([]);
    setCompareModalOpen(false);
  };

  const handleDownloadReport = async (format: 'pdf' | 'json' | 'txt' = 'pdf') => {
    if (!incident || !id) return;

    try {
      setDownloadingReport(true);
      const blob = await incidentApi.downloadReport(id, format);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `incident_${incident.incident_number}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
      alert('Failed to download report. Please try again.');
    } finally {
      setDownloadingReport(false);
    }
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
    // Fetch users for both auto_match_user AND manual_select_user
    const needsUserMatch = (trans.auto_match_user || trans.manual_select_user) && trans.assignment_role_id && !trans.assign_user_id;

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
            // For auto_match_user, backend handles multi-assign, no need to select here
            // For manual_select_user, user must always pick from dropdown (don't auto-select)
            // Only auto-select for auto_match_user with single match (for display purposes)
            if (trans.auto_match_user && !trans.manual_select_user && userResult.data.single_match && userResult.data.matched_user_id) {
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
        feedback: transitionFeedbackRating > 0 ? {
          rating: transitionFeedbackRating,
          comment: transitionFeedbackComment || undefined,
        } : undefined,
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
          <p className="text-[hsl(var(--muted-foreground))]">{t('incidents.loadingIncident')}</p>
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
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{t('incidents.incidentNotFound')}</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">{t('incidents.incidentNotFoundDesc')}</p>
          <Button onClick={() => navigate('/incidents')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            {t('incidents.backToIncidents')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Presence Indicator - Show who else is viewing this incident */}
      {otherUsers.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Users className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                Currently viewing: {otherUsers.map(u => u.user_name).join(', ')}
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                {otherUsers.length === 1
                  ? 'Another user is viewing this incident. Changes may occur.'
                  : `${otherUsers.length} other users are viewing this incident. Changes may occur.`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/incidents')}
            className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('incidents.backToIncidents')}
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
                {t('incidents.slaBreached')}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">{incident.title}</h1>

          {/* Converted Request Link */}
          {incident.converted_request_id && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-[hsl(var(--muted-foreground))]">{t('incidents.convertedTo', 'Converted to')}:</span>
              <Link
                to={`/requests/${incident.converted_request_id}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {incident.converted_request?.incident_number || t('incidents.viewRequest', 'View Request')}
              </Link>
            </div>
          )}
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
          {(!incident.record_type || incident.record_type === 'incident') && canConvertToRequest && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConvertModalOpen(true)}
              leftIcon={<ArrowRightLeft className="w-4 h-4" />}
            >
              {t('incidents.convertToRequest', 'Convert to Request')}
            </Button>
          )}
          {canViewReports && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadReport('pdf')}
              leftIcon={downloadingReport ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              disabled={downloadingReport}
            >
              {downloadingReport ? t('incidents.downloading', 'Downloading...') : t('incidents.downloadReport', 'Download PDF Report')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            {t('incidents.refresh')}
          </Button>
          {canEditIncident && (
            <Button variant="ghost" size="sm" leftIcon={<Edit2 className="w-4 h-4" />}>
              {t('incidents.edit')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">{t('incidents.description')}</h3>
            <p className="text-[hsl(var(--foreground))] whitespace-pre-wrap">
              {incident.description || t('incidents.noDescription')}
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
                  {t('incidents.activity')}
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
                  {t('incidents.comments')} ({comments.length})
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
                  {t('incidents.attachments')} ({attachments.length})
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
                  {t('incidents.revisions')}
                </span>
              </button>
            </div>

            <div className="p-4">
              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <p className="text-center text-[hsl(var(--muted-foreground))] py-8">{t('incidents.noActivity')}</p>
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
                                  {item.transition?.name || t('incidents.stateChanged')}
                                </span>
                                <span className="text-[hsl(var(--muted-foreground))] mx-2">{t('incidents.by')}</span>
                                <span className="font-medium text-[hsl(var(--foreground))]">
                                  {item.performed_by?.first_name || item.performed_by?.username || t('incidents.system')}
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
                      placeholder={t('incidents.addCommentPlaceholder')}
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
                      {t('incidents.internalComment')}
                    </label>
                    <Button
                      size="sm"
                      onClick={() => addCommentMutation.mutate({ content: commentText, is_internal: isInternalComment })}
                      disabled={!commentText.trim() || addCommentMutation.isPending}
                      isLoading={addCommentMutation.isPending}
                      leftIcon={!addCommentMutation.isPending ? <Send className="w-4 h-4" /> : undefined}
                    >
                      {t('incidents.addComment')}
                    </Button>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-4 mt-6">
                    {comments.length === 0 ? (
                      <p className="text-center text-[hsl(var(--muted-foreground))] py-8">{t('incidents.noCommentsYet')}</p>
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
                                    {t('incidents.internal')}
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
                      {t('incidents.uploadFile')}
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploadAttachmentMutation.isPending}
                      />
                    </label>
                    {uploadAttachmentMutation.isPending && (
                      <span className="ml-2 text-sm text-[hsl(var(--muted-foreground))]">{t('incidents.uploading')}</span>
                    )}
                  </div>

                  {/* Attachments List */}
                  <div className="space-y-3">
                    {attachments.length === 0 ? (
                      <p className="text-center text-[hsl(var(--muted-foreground))] py-8">{t('incidents.noAttachmentsYet')}</p>
                    ) : (
                      <>
                        {/* Image Grid */}
                        {attachments.filter((a: IncidentAttachment) => isImageAttachment(a.mime_type)).length > 0 && (
                          <>
                            {/* Compare Mode Controls */}
                            {attachments.filter((a: IncidentAttachment) => isImageAttachment(a.mime_type)).length >= 2 && (
                              <div className="flex items-center justify-between mb-3 p-3 bg-[hsl(var(--muted)/0.3)] rounded-lg">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => {
                                      if (compareMode) {
                                        exitCompareMode();
                                      } else {
                                        setCompareMode(true);
                                      }
                                    }}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                      compareMode
                                        ? "bg-[hsl(var(--primary))] text-white"
                                        : "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                                    )}
                                  >
                                    {compareMode ? t('incidents.exitCompare') : t('incidents.compareImages')}
                                  </button>
                                  {compareMode && (
                                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                                      {t('incidents.selectImagesToCompare')} ({selectedForCompare.length}/2)
                                    </span>
                                  )}
                                </div>
                                {compareMode && selectedForCompare.length === 2 && (
                                  <button
                                    onClick={openCompareModal}
                                    className="px-4 py-1.5 bg-[hsl(var(--primary))] text-white rounded-lg text-sm font-medium hover:bg-[hsl(var(--primary)/0.9)] transition-colors"
                                  >
                                    {t('incidents.compareNow')}
                                  </button>
                                )}
                              </div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                              {attachments
                                .filter((a: IncidentAttachment) => isImageAttachment(a.mime_type))
                                .map((attachment: IncidentAttachment) => (
                                  <div
                                    key={attachment.id}
                                    className={cn(
                                      "relative group rounded-lg overflow-hidden border-2 bg-[hsl(var(--muted)/0.3)] transition-all",
                                      compareMode && isSelectedForCompare(attachment.id)
                                        ? "border-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary)/0.3)]"
                                        : "border-[hsl(var(--border))]"
                                    )}
                                  >
                                    {/* Selection checkbox for compare mode */}
                                    {compareMode && (
                                      <div
                                        className="absolute top-2 left-2 z-10 cursor-pointer"
                                        onClick={() => toggleCompareSelection(attachment)}
                                      >
                                        <div
                                          className={cn(
                                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                            isSelectedForCompare(attachment.id)
                                              ? "bg-[hsl(var(--primary))] border-[hsl(var(--primary))]"
                                              : "bg-white/90 border-gray-400 hover:border-[hsl(var(--primary))]"
                                          )}
                                        >
                                          {isSelectedForCompare(attachment.id) && (
                                            <CheckCircle2 className="w-4 h-4 text-white" />
                                          )}
                                          {!isSelectedForCompare(attachment.id) && selectedForCompare.length < 2 && (
                                            <span className="text-xs text-gray-500">
                                              {selectedForCompare.length + 1}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    <img
                                      src={getAttachmentUrl(attachment.id)}
                                      alt={attachment.file_name}
                                      className={cn(
                                        "w-full h-32 object-cover transition-opacity",
                                        compareMode
                                          ? "cursor-pointer"
                                          : "cursor-pointer hover:opacity-90"
                                      )}
                                      onClick={() => {
                                        if (compareMode) {
                                          toggleCompareSelection(attachment);
                                        } else {
                                          openLightbox(attachment);
                                        }
                                      }}
                                    />
                                    {!compareMode && (
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <button
                                          onClick={() => openLightbox(attachment)}
                                          className="p-2 bg-white/90 rounded-full text-gray-700 hover:bg-white transition-colors mr-2"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                          </svg>
                                        </button>
                                        <a
                                          href={getAttachmentUrl(attachment.id)}
                                          download={attachment.file_name}
                                          className="p-2 bg-white/90 rounded-full text-gray-700 hover:bg-white transition-colors mr-2"
                                        >
                                          <Download className="w-5 h-5" />
                                        </a>
                                        <button
                                          onClick={() => deleteAttachmentMutation.mutate(attachment.id)}
                                          className="p-2 bg-white/90 rounded-full text-red-600 hover:bg-white transition-colors"
                                        >
                                          <Trash2 className="w-5 h-5" />
                                        </button>
                                      </div>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate">
                                      {attachment.file_name}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </>
                        )}

                        {/* Audio Files */}
                        {attachments.filter((a: IncidentAttachment) => isAudioAttachment(a.mime_type)).length > 0 && (
                          <div className="space-y-2 mb-4">
                            {attachments
                              .filter((a: IncidentAttachment) => isAudioAttachment(a.mime_type))
                              .map((attachment: IncidentAttachment) => (
                                <div
                                  key={attachment.id}
                                  className="p-3 bg-[hsl(var(--muted)/0.3)] rounded-lg"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-[hsl(var(--background))] rounded-lg">
                                        <svg className="w-5 h-5 text-[hsl(var(--primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                        </svg>
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
                                      <a
                                        href={getAttachmentUrl(attachment.id)}
                                        download={attachment.file_name}
                                        className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                                      >
                                        <Download className="w-4 h-4" />
                                      </a>
                                      <button
                                        onClick={() => deleteAttachmentMutation.mutate(attachment.id)}
                                        className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                  <audio
                                    controls
                                    className="w-full h-10"
                                    src={getAttachmentUrl(attachment.id)}
                                    preload="metadata"
                                  >
                                    Your browser does not support the audio element.
                                  </audio>
                                </div>
                              ))}
                          </div>
                        )}

                        {/* Other Non-Image Files List */}
                        {attachments.filter((a: IncidentAttachment) => !isImageAttachment(a.mime_type) && !isAudioAttachment(a.mime_type)).length > 0 && (
                          <div className="space-y-2">
                            {attachments
                              .filter((a: IncidentAttachment) => !isImageAttachment(a.mime_type) && !isAudioAttachment(a.mime_type))
                              .map((attachment: IncidentAttachment) => (
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
                                    <a
                                      href={getAttachmentUrl(attachment.id)}
                                      download={attachment.file_name}
                                      className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                    <button
                                      onClick={() => deleteAttachmentMutation.mutate(attachment.id)}
                                      className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </>
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
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-3">{t('incidents.details')}</h3>
            <div className="space-y-3">
              {/* Two-column grid for compact display */}
              <div className="grid grid-cols-2 gap-3">
                {/* Classification */}
                {incident.classification && (
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      {t('incidents.classification')}
                    </label>
                    <div className="mt-0.5 flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                      <Tags className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                      {incident.classification.name}
                    </div>
                  </div>
                )}

                {/* Department */}
                {incident.department && (
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      {t('incidents.department')}
                    </label>
                    <div className="mt-0.5 flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                      <Building2 className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                      {incident.department.name}
                    </div>
                  </div>
                )}

                {/* Location */}
                {incident.location && (
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      {t('incidents.location')}
                    </label>
                    <div className="mt-0.5 flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                      <MapPin className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                      {incident.location.name}
                    </div>
                  </div>
                )}

                {/* Source */}
                {incident.source && (
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      {t('incidents.source')}
                    </label>
                    <div className="mt-0.5 flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                      <Radio className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                      <span className="capitalize">{incident.source.replace('_', ' ')}</span>
                    </div>
                  </div>
                )}

                {/* Due Date - only show if set */}
                {incident.due_date && (
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      {t('incidents.dueDate')}
                    </label>
                    <div className="mt-0.5 flex items-center gap-1.5 text-sm text-[hsl(var(--foreground))]">
                      <Calendar className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                      {formatDate(incident.due_date)}
                    </div>
                  </div>
                )}

                {/* SLA Deadline */}
                {incident.sla_deadline && (
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      {t('incidents.slaDeadline')}
                    </label>
                    <div className={cn(
                      "mt-0.5 flex items-center gap-1.5 text-sm",
                      incident.sla_breached ? 'text-red-600' : 'text-[hsl(var(--foreground))]'
                    )}>
                      <Clock className="w-3.5 h-3.5" />
                      {formatDateTime(incident.sla_deadline)}
                      {incident.sla_breached && <AlertTriangle className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                )}

                {/* Created */}
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    {t('incidents.created')}
                  </label>
                  <div className="mt-0.5 text-sm text-[hsl(var(--foreground))]">
                    {formatDateTime(incident.created_at)}
                  </div>
                </div>

                {/* Dynamic Lookups - in 2-column grid */}
                {Object.entries(groupedLookupValues).map(([category, values]) => (
                  <div key={category}>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      {i18n.language === 'ar' ? (values[0]?.category?.name_ar || category) : category}
                    </label>
                    <div className="mt-0.5 flex flex-wrap gap-1.5">
                      {(values as LookupValue[]).map(value => (
                        <span
                          key={value.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: value.color ? `${value.color}20` : 'hsl(var(--muted))',
                            color: value.color || 'hsl(var(--foreground))',
                          }}
                        >
                          {i18n.language === 'ar' && value.name_ar ? value.name_ar : value.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Custom Lookup Fields (text, number, date, checkbox, textarea) - inside main grid */}
                {Object.entries(customLookupFields).map(([key, field]) => {
                  const categoryName = i18n.language === 'ar' && field.category_name_ar
                    ? field.category_name_ar
                    : field.category_name || key.replace('lookup:', '');

                  const displayValue = formatCustomLookupValue(field, i18n.language, (key: string, defaultValue?: string) => t(key, { defaultValue }));

                  return (
                    <div key={key}>
                      <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {categoryName}
                      </label>
                      <div className="mt-0.5 text-sm text-[hsl(var(--foreground))]">
                        {displayValue}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Assignees - full width */}
              <div className="pt-2 border-t border-[hsl(var(--border))]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    {incident.assignees && incident.assignees.length > 1 ? t('incidents.assignees') : t('incidents.assignee')}
                    {incident.assignees && incident.assignees.length > 0 && (
                      <span className="ml-1 text-[hsl(var(--primary))]">({incident.assignees.length})</span>
                    )}
                  </label>
                  <button
                    onClick={() => setAssignModalOpen(true)}
                    className="text-xs text-[hsl(var(--primary))] hover:underline"
                  >
                    {t('incidents.change')}
                  </button>
                </div>
                <div className="mt-1">
                  {incident.assignees && incident.assignees.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {incident.assignees.map((assignee, index) => (
                        <div key={assignee.id} className="inline-flex items-center gap-1.5 bg-[hsl(var(--muted)/0.5)] px-2 py-1 rounded-md">
                          {assignee.avatar ? (
                            <img src={assignee.avatar} alt={assignee.username} className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center">
                              <span className="text-white text-[10px] font-semibold">{assignee.first_name?.[0] || assignee.username[0]}</span>
                            </div>
                          )}
                          <span className="text-xs text-[hsl(var(--foreground))]">
                            {assignee.first_name || assignee.username}
                            {index === 0 && incident.assignees!.length > 1 && <span className="text-[hsl(var(--muted-foreground))]"> (P)</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : incident.assignee ? (
                    <div className="inline-flex items-center gap-1.5 bg-[hsl(var(--muted)/0.5)] px-2 py-1 rounded-md">
                      {incident.assignee.avatar ? (
                        <img src={incident.assignee.avatar} alt={incident.assignee.username} className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center">
                          <span className="text-white text-[10px] font-semibold">{incident.assignee.first_name?.[0] || incident.assignee.username[0]}</span>
                        </div>
                      )}
                      <span className="text-xs text-[hsl(var(--foreground))]">{incident.assignee.first_name || incident.assignee.username}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {t('incidents.unassigned')}
                    </span>
                  )}
                </div>
              </div>

              {/* Reporter - compact */}
              <div className="pt-2 border-t border-[hsl(var(--border))]">
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  {t('incidents.reporter')}
                </label>
                <div className="mt-1 flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-[hsl(var(--foreground))] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                    {incident.reporter?.first_name
                      ? `${incident.reporter.first_name} ${incident.reporter.last_name || ''}`
                      : incident.reporter?.username || incident.reporter_name || 'Unknown'}
                  </span>
                  {(incident.reporter_email || incident.reporter?.email) && (
                    <a
                      href={`mailto:${incident.reporter_email || incident.reporter?.email}`}
                      className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {incident.reporter_email || incident.reporter?.email}
                    </a>
                  )}
                  {incident.reporter?.phone && (
                    <a
                      href={`tel:${incident.reporter.phone}`}
                      className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {incident.reporter.phone}
                    </a>
                  )}
                </div>
              </div>

              {/* Geolocation - only show if has coordinates */}
              {(incident.latitude !== undefined && incident.longitude !== undefined) && (
                <div className="pt-2 border-t border-[hsl(var(--border))]">
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    {t('incidents.geolocation', 'Geolocation')}
                  </label>
                  <div className="mt-1.5 space-y-1.5">
                    {/* Map - smaller height */}
                    <div className="h-32 rounded-lg overflow-hidden border border-[hsl(var(--border))]">
                      <MapContainer
                        center={[incident.latitude, incident.longitude]}
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
                          position={[incident.latitude, incident.longitude]}
                          icon={defaultIcon}
                        />
                      </MapContainer>
                    </div>
                    {/* Compact location info */}
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                        <span className="font-medium text-[hsl(var(--foreground))]">
                          {incident.latitude?.toFixed(6)}, {incident.longitude?.toFixed(6)}
                        </span>
                      </div>
                      {incident.address && (
                        <p className="mt-0.5 pl-5 break-words">{incident.address}</p>
                      )}
                      {(incident.city || incident.state || incident.country) && (
                        <p className="pl-5">
                          {[incident.city, incident.state, incident.country, incident.postal_code].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Workflow Info */}
          {incident.workflow && (
            <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">{t('incidents.workflow')}</h3>
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
                {t('incidents.executeTransition')}
              </h3>
              <button
                onClick={() => {
                  setTransitionModalOpen(false);
                  setSelectedTransition(null);
                  setTransitionComment('');
                  setTransitionFeedbackRating(0);
                  setTransitionFeedbackComment('');
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
                  {selectedTransition.transition.from_state?.name || t('incidents.current')}
                </span>
                <ChevronRight className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                <span
                  className="px-3 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: selectedTransition.transition.to_state?.color ? `${selectedTransition.transition.to_state.color}20` : 'hsl(var(--muted))',
                    color: selectedTransition.transition.to_state?.color || 'hsl(var(--foreground))',
                  }}
                >
                  {selectedTransition.transition.to_state?.name || t('incidents.next')}
                </span>
              </div>

              {/* Requirements */}
              {selectedTransition.requirements && selectedTransition.requirements.length > 0 && (
                <div className="bg-[hsl(var(--muted)/0.5)] rounded-lg p-3">
                  <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase mb-2">{t('incidents.requirements')}</p>
                  <ul className="space-y-1">
                    {selectedTransition.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-[hsl(var(--foreground))]">
                        {req.is_mandatory ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                        {req.requirement_type === 'comment' && t('incidents.comment')}
                        {req.requirement_type === 'attachment' && t('incidents.attachment')}
                        {req.requirement_type === 'field_value' && t('incidents.fieldValue')}
                        {req.is_mandatory && <span className="text-xs text-amber-500">({t('incidents.required')})</span>}
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
                    {t('incidents.loadingAssignmentOptions')}
                  </div>
                </div>
              ) : (
                <>
                  {/* Department Assignment */}
                  {(selectedTransition.transition.assign_department_id || selectedTransition.transition.auto_detect_department) && (
                    <div className="bg-[hsl(var(--muted)/0.5)] rounded-lg p-3">
                      <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase mb-2 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {t('incidents.departmentAssignment')}
                      </p>
                      {selectedTransition.transition.assign_department_id ? (
                        <p className="text-sm text-[hsl(var(--foreground))]">
                          {t('incidents.willAssignTo')} <span className="font-medium">{selectedTransition.transition.assign_department?.name || t('incidents.department')}</span>
                        </p>
                      ) : departmentMatchResult ? (
                        departmentMatchResult.departments.length === 0 ? (
                          <p className="text-sm text-amber-600">{t('incidents.noMatchingDepartments')}</p>
                        ) : departmentMatchResult.single_match ? (
                          <p className="text-sm text-[hsl(var(--foreground))]">
                            {t('incidents.willAssignTo')} <span className="font-medium">{departmentMatchResult.departments[0]?.name}</span>
                          </p>
                        ) : (
                          <select
                            value={selectedDepartmentId}
                            onChange={(e) => setSelectedDepartmentId(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-md text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                          >
                            <option value="">{t('incidents.selectDepartment')}</option>
                            {departmentMatchResult.departments.map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {dept.name}
                              </option>
                            ))}
                          </select>
                        )
                      ) : (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('incidents.autoDetectDeptLocation')}</p>
                      )}
                    </div>
                  )}

                  {/* User Assignment */}
                  {(selectedTransition.transition.assign_user_id ||
                    ((selectedTransition.transition.auto_match_user || selectedTransition.transition.manual_select_user) && selectedTransition.transition.assignment_role_id)) && (
                    <div className="bg-[hsl(var(--muted)/0.5)] rounded-lg p-3">
                      <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase mb-2 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {t('incidents.userAssignment')}
                        {selectedTransition.transition.manual_select_user && (
                          <span className="text-amber-500">({t('incidents.manualSelectionRequired')})</span>
                        )}
                        {selectedTransition.transition.auto_match_user && !selectedTransition.transition.manual_select_user && (
                          <span className="text-green-500">({t('incidents.autoAssignAllMatched')})</span>
                        )}
                        {selectedTransition.transition.assignment_role && (
                          <span className="text-[hsl(var(--primary))] ml-1">{t('incidents.role')}: {selectedTransition.transition.assignment_role.name}</span>
                        )}
                      </p>
                      {selectedTransition.transition.assign_user_id ? (
                        <p className="text-sm text-[hsl(var(--foreground))]">
                          {t('incidents.willAssignTo')} <span className="font-medium">
                            {selectedTransition.transition.assign_user?.first_name || selectedTransition.transition.assign_user?.username || t('incidents.assignee')}
                          </span>
                        </p>
                      ) : selectedTransition.transition.manual_select_user ? (
                        // Manual select mode - always show dropdown
                        userMatchResult ? (
                          userMatchResult.users.length === 0 ? (
                            <p className="text-sm text-amber-600">{t('incidents.noUsersWithRole')}</p>
                          ) : (
                            <select
                              value={selectedUserId}
                              onChange={(e) => setSelectedUserId(e.target.value)}
                              className="w-full px-3 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-md text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                            >
                              <option value="">{t('incidents.selectAssignee')}</option>
                              {userMatchResult.users.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.username} ({user.email})
                                </option>
                              ))}
                            </select>
                          )
                        ) : (
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('incidents.loadingUsers')}</p>
                        )
                      ) : selectedTransition.transition.auto_match_user ? (
                        // Auto-match mode - assign to ALL matched users
                        userMatchResult ? (
                          userMatchResult.users.length === 0 ? (
                            <p className="text-sm text-amber-600">{t('incidents.noMatchingUsers')}</p>
                          ) : (
                            <div>
                              <p className="text-sm text-[hsl(var(--foreground))] mb-2">
                                {t('incidents.willAssignToUsers', { count: userMatchResult.users.length })}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {userMatchResult.users.map((user) => (
                                  <span
                                    key={user.id}
                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                                  >
                                    {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.username}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )
                        ) : (
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('incidents.autoAssignRoleCriteria')}</p>
                        )
                      ) : (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('incidents.noAssignmentConfigured')}</p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Attachment */}
              {selectedTransition.requirements?.some(r => r.requirement_type === 'attachment') && (
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t('incidents.attachment')}
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
                      <span className="text-sm text-[hsl(var(--muted-foreground))]">{t('incidents.clickToUpload')}</span>
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

              {/* Feedback */}
              {selectedTransition.requirements?.some(r => r.requirement_type === 'feedback') && (
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t('incidents.feedback', 'Feedback')}
                    {selectedTransition.requirements?.some(r => r.requirement_type === 'feedback' && r.is_mandatory) && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  <div className="p-4 bg-[hsl(var(--muted)/0.5)] rounded-lg space-y-3">
                    {/* Star Rating */}
                    <div>
                      <span className="text-sm text-[hsl(var(--muted-foreground))] mb-2 block">
                        {t('incidents.rateExperience', 'Rate your experience')}
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setTransitionFeedbackRating(star)}
                            className={`p-1 transition-colors ${
                              star <= transitionFeedbackRating
                                ? 'text-yellow-400'
                                : 'text-[hsl(var(--muted-foreground))] hover:text-yellow-300'
                            }`}
                          >
                            <Star
                              className="w-6 h-6"
                              fill={star <= transitionFeedbackRating ? 'currentColor' : 'none'}
                            />
                          </button>
                        ))}
                        {transitionFeedbackRating > 0 && (
                          <span className="ml-2 text-sm text-[hsl(var(--muted-foreground))] self-center">
                            {transitionFeedbackRating}/5
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Feedback Comment */}
                    <div>
                      <textarea
                        value={transitionFeedbackComment}
                        onChange={(e) => setTransitionFeedbackComment(e.target.value)}
                        placeholder={t('incidents.feedbackCommentPlaceholder', 'Add optional feedback comments...')}
                        rows={2}
                        className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  {t('incidents.comment')}
                  {selectedTransition.requirements?.some(r => r.requirement_type === 'comment' && r.is_mandatory) && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                <textarea
                  value={transitionComment}
                  onChange={(e) => setTransitionComment(e.target.value)}
                  placeholder={t('incidents.addCommentForTransition')}
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
                  setTransitionFeedbackRating(0);
                  setTransitionFeedbackComment('');
                }}
              >
                {t('incidents.cancel')}
              </Button>
              <Button
                onClick={executeTransition}
                isLoading={transitionMutation.isPending || transitionUploading}
                leftIcon={!(transitionMutation.isPending || transitionUploading) ? <Play className="w-4 h-4" /> : undefined}
              >
                {transitionUploading ? t('incidents.uploading') : t('incidents.execute')}
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
                {t('incidents.assignIncident')}
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
                {t('incidents.selectAssignee')}
              </label>
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="w-full px-4 py-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
              >
                <option value="">{t('incidents.selectUser')}</option>
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
                {t('incidents.cancel')}
              </Button>
              <Button
                onClick={() => assignMutation.mutate(selectedAssignee)}
                disabled={!selectedAssignee}
                isLoading={assignMutation.isPending}
                leftIcon={!assignMutation.isPending ? <User className="w-4 h-4" /> : undefined}
              >
                {t('incidents.assign')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxOpen && lightboxImage && (
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
            {lightboxImage.name}
          </div>

          {/* Download Button */}
          <a
            href={lightboxImage.url}
            download={lightboxImage.name}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <Download className="w-6 h-6" />
          </a>

          {/* Image */}
          <img
            src={lightboxImage.url}
            alt={lightboxImage.name}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Image Comparison Modal */}
      {compareModalOpen && selectedForCompare.length === 2 && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
          onClick={() => setCompareModalOpen(false)}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">{t('incidents.imageComparison')}</h3>
              <span className="text-sm text-gray-400">{t('incidents.dragSliderToCompare')}</span>
            </div>
            <button
              onClick={() => setCompareModalOpen(false)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Comparison Container */}
          <div className="flex-1 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full max-w-5xl h-[70vh] overflow-hidden rounded-lg">
              {/* Image 2 (Right/Bottom layer) */}
              <img
                src={getAttachmentUrl(selectedForCompare[1].id)}
                alt={selectedForCompare[1].file_name}
                className="absolute inset-0 w-full h-full object-contain"
              />

              {/* Image 1 (Left/Top layer with clip) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - compareSliderPosition}% 0 0)` }}
              >
                <img
                  src={getAttachmentUrl(selectedForCompare[0].id)}
                  alt={selectedForCompare[0].file_name}
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>

              {/* Slider Line */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10"
                style={{ left: `${compareSliderPosition}%`, transform: 'translateX(-50%)' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  const container = e.currentTarget.parentElement;
                  if (!container) return;

                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const rect = container.getBoundingClientRect();
                    const x = moveEvent.clientX - rect.left;
                    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                    setCompareSliderPosition(percentage);
                  };

                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };

                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              >
                {/* Slider Handle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <div className="flex items-center gap-0.5">
                    <ChevronRight className="w-4 h-4 text-gray-600 rotate-180" />
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
              </div>

              {/* Image Labels */}
              <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/70 text-white text-sm rounded-lg">
                {selectedForCompare[0].file_name}
              </div>
              <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/70 text-white text-sm rounded-lg">
                {selectedForCompare[1].file_name}
              </div>
            </div>
          </div>

          {/* Footer - View Mode Toggle */}
          <div className="flex items-center justify-center gap-4 p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm text-gray-400">{t('incidents.sliderPosition')}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={compareSliderPosition}
              onChange={(e) => setCompareSliderPosition(Number(e.target.value))}
              className="w-48 accent-white"
            />
            <span className="text-sm w-12">{Math.round(compareSliderPosition)}%</span>
          </div>
        </div>
      )}

      {/* Convert to Request Modal */}
      {incident && (
        <ConvertToRequestModal
          incident={incident}
          isOpen={convertModalOpen}
          onClose={() => setConvertModalOpen(false)}
          onSuccess={(newRequestId) => {
            setConvertModalOpen(false);
            navigate(`/requests/${newRequestId}`);
          }}
        />
      )}
    </div>
  );
};
