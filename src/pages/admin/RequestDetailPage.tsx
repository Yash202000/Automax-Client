import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  Calendar,
  Building2,
  MapPin,
  Edit2,
  MessageSquare,
  Paperclip,
  Send,
  RefreshCw,
  ChevronRight,
  XCircle,
  Play,
  FileText,
  Download,
  X,
  Upload,
  History,
  Tags,
  ExternalLink,
  Radio,
  Trash2,
} from "lucide-react";
import { Button } from "../../components/ui";
import { MiniWorkflowView } from "../../components/workflow";
import { RevisionHistory } from "../../components/incidents";
import { AudioPlayer } from "../../components/common/AudioPlayer";
import { CreateRequestModal } from "../../components/requests";
import {
  incidentApi,
  requestApi,
  userApi,
  commentTemplateApi,
  feedbackTemplateApi,
  departmentApi,
  locationApi,
  classificationApi,
} from "../../api/admin";
import { API_URL } from "../../api/client";
import type {
  AvailableTransition,
  LookupValue,
  TransitionHistory,
  User as UserType,
} from "../../types";
import { getNodePath, type TreeSelectNode } from "../../utils/treeUtils";
import { cn } from "@/lib/utils";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";

export const RequestDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const canEditRequest =
    isSuperAdmin || hasPermission(PERMISSIONS.REQUESTS_UPDATE);

  const canDeleteRequest =
    isSuperAdmin || hasPermission(PERMISSIONS.REQUESTS_DELETE);

  const [activeTab, setActiveTab] = useState<
    "activity" | "comments" | "attachments" | "revisions"
  >("activity");
  const [commentText, setCommentText] = useState("");
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [selectedTransition, setSelectedTransition] =
    useState<AvailableTransition | null>(null);
  const [transitionComment, setTransitionComment] = useState("");
  const [transitionAttachment, setTransitionAttachment] = useState<File | null>(
    null,
  );
  const [transitionUploading, setTransitionUploading] = useState(false);
  const [transitionFeedbackRating, setTransitionFeedbackRating] =
    useState<number>(0);
  const [transitionFeedbackComment, setTransitionFeedbackComment] =
    useState("");
  const [commentTemplates, setCommentTemplates] = useState<any[]>([]);
  const [feedbackTemplates, setFeedbackTemplates] = useState<any[]>([]);
  const [selectedCommentTemplate, setSelectedCommentTemplate] = useState("");
  const [selectedFeedbackTemplate, setSelectedFeedbackTemplate] = useState("");
  const [showCommentTextarea, setShowCommentTextarea] = useState(false);
  const [showFeedbackTextarea, setShowFeedbackTextarea] = useState(false);
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>(
    {},
  );
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);

  // Queries
  const {
    data: requestData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["request", id],
    queryFn: () => incidentApi.getById(id!),
    enabled: !!id,
  });

  const { data: transitionsData, refetch: refetchTransitions } = useQuery({
    queryKey: ["request", id, "transitions"],
    queryFn: () => incidentApi.getAvailableTransitions(id!),
    enabled: !!id,
  });

  const { data: historyData } = useQuery({
    queryKey: ["request", id, "history"],
    queryFn: () => incidentApi.getHistory(id!),
    enabled: !!id,
  });

  const { data: combinedCommentData, refetch: refetchComments } = useQuery({
    queryKey: ["complaint", id, "activity"],
    queryFn: async () => {
      const [commentsRes, feedbacksRes] = await Promise.all([
        incidentApi.listComments(id!),
        incidentApi.listFeedbacks(id!),
      ]);

      const feedbacks = (feedbacksRes?.data || []).map((item: any) => ({
        ...item,
        author: item?.created_by,
        content: item?.comment,
        type: "feedback",
      }));

      return [...(commentsRes?.data || []), ...feedbacks].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    },
    enabled: !!id,
  });

  const { data: attachmentsData } = useQuery({
    queryKey: ["request", id, "attachments"],
    queryFn: () => incidentApi.listAttachments(id!),
    enabled: !!id,
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin", "users", 1, 100],
    queryFn: () => userApi.list(1, 100),
  });

  const { data: fcDepartmentsData } = useQuery({
    queryKey: ["admin", "departments", "tree"],
    queryFn: () => departmentApi.getTree(),
  });

  const { data: fcLocationsData } = useQuery({
    queryKey: ["admin", "locations", "tree"],
    queryFn: () => locationApi.getTree(),
  });

  const { data: fcClassificationsData } = useQuery({
    queryKey: ["admin", "classifications", "tree"],
    queryFn: () => classificationApi.getTree(),
  });
  const request = requestData?.data;
  const availableTransitions = transitionsData?.data || [];
  const history = historyData?.data || [];
  const comments = combinedCommentData || [];
  const attachments = attachmentsData?.data || [];
  const users = usersData?.data || [];

  const classificationPath = useMemo(() => {
    if (!request?.classification?.id || !fcClassificationsData?.data) return [];
    return getNodePath(
      fcClassificationsData.data as unknown as TreeSelectNode[],
      request.classification.id,
    );
  }, [request?.classification?.id, fcClassificationsData?.data]);

  const locationPath = useMemo(() => {
    if (!request?.location?.id || !fcLocationsData?.data) return [];
    return getNodePath(
      fcLocationsData.data as unknown as TreeSelectNode[],
      request.location.id,
    );
  }, [request?.location?.id, fcLocationsData?.data]);

  const departmentPath = useMemo(() => {
    if (!request?.department?.id || !fcDepartmentsData?.data) return [];
    return getNodePath(
      fcDepartmentsData.data as unknown as TreeSelectNode[],
      request.department.id,
    );
  }, [request?.department?.id, fcDepartmentsData?.data]);

  // Helper function to download attachment with authentication
  const downloadAttachment = async (attachmentId: string, fileName: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/attachments/${attachmentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download attachment");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      toast.error("Failed to download attachment");
    }
  };

  // Helper function to get authenticated attachment URL for audio/video
  const getAuthenticatedAttachmentUrl = (attachmentId: string): string => {
    const token = localStorage.getItem("token");
    return `${API_URL}/attachments/${attachmentId}/preview?token=${token}`;
  };

  // Helper function to check if file is audio
  const isAudioFile = (mimeType: string, fileName: string) => {
    // Check mime type first
    if (mimeType && mimeType.startsWith("audio/")) {
      return true;
    }
    // Fallback to file extension check
    const audioExtensions = /\.(mp3|wav|m4a|aac|ogg|webm|flac)$/i;
    return audioExtensions.test(fileName);
  };

  // Mutations
  const handleCloseTransitionModal = () => {
    setTransitionModalOpen(false);
    setSelectedTransition(null);
    setTransitionComment("");
    setTransitionAttachment(null);
    setTransitionFeedbackRating(0);
    setTransitionFeedbackComment("");
    setSelectedCommentTemplate("");
    setSelectedFeedbackTemplate("");
    setShowCommentTextarea(false);
    setShowFeedbackTextarea(false);
    setCommentErrors({});
    setCommentTemplates([]);
    setFeedbackTemplates([]);
  };

  const transitionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTransition) return;

      let attachmentIds: string[] | undefined;
      if (transitionAttachment) {
        setTransitionUploading(true);
        const uploadResult = await incidentApi.uploadAttachment(
          id!,
          transitionAttachment,
        );
        setTransitionUploading(false);
        if (uploadResult.data?.id) {
          attachmentIds = [uploadResult.data.id];
        }
      }

      return incidentApi.transition(id!, {
        transition_id: selectedTransition.transition.id,
        comment: transitionComment || undefined,
        attachments: attachmentIds,
        feedback: transitionFeedbackComment
          ? {
              rating: transitionFeedbackRating || 1,
              comment: transitionFeedbackComment || undefined,
            }
          : undefined,
        version: request?.version || 1,
      });
    },
    onSuccess: () => {
      refetch();
      refetchTransitions();
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["request", id, "history"] });
      queryClient.invalidateQueries({ queryKey: ["requests", "stats"] });
      handleCloseTransitionModal();
    },
  });

  const validateTransition = (): boolean => {
    const errors: Record<string, string> = {};
    if (
      selectedTransition?.requirements?.some(
        (r) => r.requirement_type === "comment",
      ) &&
      !transitionComment?.trim()
    ) {
      errors.comment = t("complaints.fieldRequired", {
        field: t("common.comment", "Comment"),
      });
    }
    if (
      selectedTransition?.requirements?.some(
        (r) => r.requirement_type === "feedback",
      ) &&
      !transitionFeedbackComment?.trim()
    ) {
      errors.feedback = t("complaints.fieldRequired", {
        field: t("common.feedback", "Feedback"),
      });
    }
    if (Object.keys(errors).length > 0) {
      setCommentErrors(errors);
      return false;
    }
    return true;
  };

  const handleConfirmTransition = () => {
    if (validateTransition()) {
      transitionMutation.mutate();
    }
  };

  const fetchTemplates = async (transitionId: string) => {
    try {
      const [commentRes, feedbackRes] = await Promise.all([
        commentTemplateApi.listByTransition(transitionId),
        feedbackTemplateApi.listByTransition(transitionId),
      ]);
      setCommentTemplates(commentRes.data || []);
      setFeedbackTemplates(feedbackRes.data || []);
      setSelectedCommentTemplate("");
      setSelectedFeedbackTemplate("");
      setShowCommentTextarea(false);
      setShowFeedbackTextarea(false);
      setTransitionComment("");
      setTransitionFeedbackComment("");
      setCommentErrors({});
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const addCommentMutation = useMutation({
    mutationFn: () =>
      incidentApi.addComment(id!, {
        content: commentText,
        is_internal: isInternalComment,
      }),
    onSuccess: () => {
      refetchComments();
      setCommentText("");
    },
  });

  const assignMutation = useMutation({
    mutationFn: (assigneeId: string) =>
      incidentApi.update(id!, {
        assignee_id: assigneeId,
        version: request?.version || 1,
      }),
    onSuccess: () => {
      refetch();
      setAssignModalOpen(false);
      setSelectedAssignee("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => requestApi.delete(id!),
    onSuccess: () => {
      setDeleteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success(t("requests.requestDeleted"));
      navigate("/requests");
    },
    onError: (deleteError: any) => {
      const message =
        deleteError?.response?.data?.error || t("requests.deleteFailed");
      toast.error(message);
    },
  });
  const handleTransitionClick = (transition: AvailableTransition) => {
    setSelectedTransition(transition);
    setTransitionModalOpen(true);
    fetchTemplates(transition.transition.id);
  };

  const handleCommentTemplateChange = (templateId: string) => {
    setSelectedCommentTemplate(templateId);
    if (templateId === "other") {
      setShowCommentTextarea(true);
      setTransitionComment("");
    } else if (templateId) {
      const template = commentTemplates.find((t) => t.id === templateId);
      if (template) {
        setTransitionComment(template.comment_text);
        setShowCommentTextarea(false);
      }
    }
  };

  const handleFeedbackTemplateChange = (templateId: string) => {
    setSelectedFeedbackTemplate(templateId);
    if (templateId === "other") {
      setShowFeedbackTextarea(true);
      setTransitionFeedbackComment("");
    } else if (templateId) {
      const template = feedbackTemplates.find((t) => t.id === templateId);
      if (template) {
        setTransitionFeedbackComment(template.feedback_text);
        setShowFeedbackTextarea(false);
      }
    }
  };

  const getLookupLabel = (value?: LookupValue) => {
    if (!value) return null;
    return i18n.language === "ar" && value.name_ar ? value.name_ar : value.name;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
          <p className="text-[hsl(var(--muted-foreground))]">
            {t("requests.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-[hsl(var(--destructive)/0.1)] rounded-2xl flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-[hsl(var(--destructive))]" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
            {t("requests.requestNotFound")}
          </h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">
            {t("requests.requestNotFoundDesc")}
          </p>
          <Button
            onClick={() => navigate("/requests")}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            {t("requests.backToRequests")}
          </Button>
        </div>
      </div>
    );
  }

  const priority = request.lookup_values?.find(
    (lv) => lv.category?.code === "PRIORITY",
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate("/requests")}
            className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("requests.backToRequests")}
          </button>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-emerald-600">
              {request.incident_number}
            </span>
            {request.current_state && (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: request.current_state.color
                    ? `${request.current_state.color}20`
                    : "hsl(var(--muted))",
                  color:
                    request.current_state.color || "hsl(var(--foreground))",
                }}
              >
                {request.current_state.name}
              </span>
            )}
            {request.sla_breached && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-600">
                <AlertTriangle className="w-3 h-3" />
                {t("requests.slaBreached")}
              </span>
            )}
            <span className="px-2 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700">
              {t("requests.request")}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
            {request.title}
          </h1>

          {/* Source Incident Link */}
          {request.source_incidents && request.source_incidents.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                {t("requests.convertedFrom")}:
              </span>

              {request.source_incidents.map((incident: any) => (
                <div>
                  <Link
                    key={incident.id}
                    to={`/incidents/${incident.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {incident.incident_number}
                  </Link>
                </div>
              ))}
            </div>
          ) : request.source_incident_id ? (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                {t("requests.convertedFrom")}:
              </span>
              <Link
                to={`/incidents/${request.source_incident_id}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {request.source_incident?.incident_number ||
                  t("requests.viewSourceIncident")}
              </Link>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {availableTransitions
            .filter((t) => t.can_execute)
            .map((transition) => (
              <Button
                key={transition.transition.id}
                variant="outline"
                size="sm"
                onClick={() => handleTransitionClick(transition)}
                leftIcon={<Play className="w-4 h-4" />}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                {transition.transition.name}
              </Button>
            ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            isLoading={isRefetching}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            {t("common.refresh")}
          </Button>
          {canEditRequest && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Edit2 className="w-4 h-4" />}
              onClick={() => setEditModalOpen(true)}
            >
              {t("common.edit")}
            </Button>
          )}
          {canDeleteRequest && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => setDeleteModalOpen(true)}
            >
              {t("common.delete")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
              {t("requests.description")}
            </h3>
            <p className="text-[hsl(var(--foreground))] whitespace-pre-wrap">
              {request.description || t("requests.noDescription")}
            </p>
          </div>

          {/* Tabs */}
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-sm overflow-hidden">
            <div className="flex border-b border-[hsl(var(--border))] overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab("activity")}
                className={cn(
                  "flex-1 min-w-fit px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                  activeTab === "activity"
                    ? "text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                )}
              >
                <span className="flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t("requests.activity")}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("comments")}
                className={cn(
                  "flex-1 min-w-fit px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                  activeTab === "comments"
                    ? "text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                )}
              >
                <span className="flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {t("requests.comments")} ({comments.length})
                </span>
              </button>
              <button
                onClick={() => setActiveTab("attachments")}
                className={cn(
                  "flex-1 min-w-fit px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                  activeTab === "attachments"
                    ? "text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                )}
              >
                <span className="flex items-center justify-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  {t("requests.attachments")} ({attachments.length})
                </span>
              </button>
              <button
                onClick={() => setActiveTab("revisions")}
                className={cn(
                  "flex-1 min-w-fit px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                  activeTab === "revisions"
                    ? "text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                )}
              >
                <span className="flex items-center justify-center gap-2">
                  <History className="w-4 h-4" />
                  {t("requests.revisions")}
                </span>
              </button>
            </div>

            <div className="p-6">
              {/* Activity Tab */}
              {activeTab === "activity" && (
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <p className="text-center text-[hsl(var(--muted-foreground))] py-8">
                      {t("requests.noActivity")}
                    </p>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-px bg-[hsl(var(--border))]" />
                      <div className="space-y-6">
                        {history.map((item: TransitionHistory) => (
                          <div key={item.id} className="relative pl-10">
                            <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-[hsl(var(--card))]" />
                            <div className="bg-[hsl(var(--muted)/0.5)] rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                                  {item.transition?.name || "State Change"}
                                </span>
                                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                  {formatDate(item.transitioned_at)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span
                                  className="px-2 py-0.5 rounded text-xs"
                                  style={{
                                    backgroundColor: item.from_state?.color
                                      ? `${item.from_state.color}20`
                                      : "hsl(var(--muted))",
                                    color:
                                      item.from_state?.color ||
                                      "hsl(var(--foreground))",
                                  }}
                                >
                                  {item.from_state?.name || "Initial"}
                                </span>
                                <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                                <span
                                  className="px-2 py-0.5 rounded text-xs"
                                  style={{
                                    backgroundColor: item.to_state?.color
                                      ? `${item.to_state.color}20`
                                      : "hsl(var(--muted))",
                                    color:
                                      item.to_state?.color ||
                                      "hsl(var(--foreground))",
                                  }}
                                >
                                  {item.to_state?.name}
                                </span>
                              </div>
                              {item.performed_by && (
                                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                                  {t("incidents.by")}{" "}
                                  {item.performed_by.first_name ||
                                    item.performed_by.username}
                                </p>
                              )}
                              {item.comment && (
                                <p className="text-sm text-[hsl(var(--foreground))] mt-2 italic">
                                  "{item.comment}"
                                </p>
                              )}
                              {item.feedbacks?.comment && (
                                <p className="mt-2 text-sm text-[hsl(var(--foreground))] italic">
                                  "{item.feedbacks.comment}"
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Comments Tab */}
              {activeTab === "comments" && (
                <div className="space-y-4">
                  {/* Add Comment Form */}
                  <div className="space-y-3">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={t("requests.writeComment")}
                      rows={3}
                      className="w-full px-4 py-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                        <input
                          type="checkbox"
                          checked={isInternalComment}
                          onChange={(e) =>
                            setIsInternalComment(e.target.checked)
                          }
                          className="w-4 h-4 rounded border-[hsl(var(--border))] text-emerald-500 focus:ring-emerald-500/20"
                        />
                        {t("requests.internalComment")}
                      </label>
                      <Button
                        size="sm"
                        onClick={() => addCommentMutation.mutate()}
                        disabled={
                          !commentText.trim() || addCommentMutation.isPending
                        }
                        isLoading={addCommentMutation.isPending}
                        leftIcon={
                          !addCommentMutation.isPending ? (
                            <Send className="w-4 h-4" />
                          ) : undefined
                        }
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {t("requests.addComment")}
                      </Button>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-4 mt-6">
                    {comments.length === 0 ? (
                      <p className="text-center text-[hsl(var(--muted-foreground))] py-8">
                        {t("requests.noComments")}
                      </p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          {comment.author?.avatar ? (
                            <img
                              src={comment.author.avatar}
                              alt={comment.author.username}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-bold">
                                {comment.author?.first_name?.[0] ||
                                  comment.author?.username?.[0] ||
                                  "U"}
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="bg-[hsl(var(--muted)/0.5)] rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                                  {comment.author?.first_name ||
                                    comment.author?.username}
                                </span>
                                <div className="flex items-center gap-2">
                                  {comment.is_internal && (
                                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                      {t("requests.internal")}
                                    </span>
                                  )}
                                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                    {formatDate(comment.created_at)}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-[hsl(var(--foreground))]">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Attachments Tab */}
              {activeTab === "attachments" && (
                <div className="space-y-4">
                  {attachments.length === 0 ? (
                    <p className="text-center text-[hsl(var(--muted-foreground))] py-8">
                      {t("requests.noAttachments")}
                    </p>
                  ) : (
                    <>
                      {/* Audio Attachments */}
                      {attachments
                        .filter((att) =>
                          isAudioFile(att.mime_type, att.file_name),
                        )
                        .map((attachment) => (
                          <div
                            key={attachment.id}
                            className="p-4 bg-[hsl(var(--muted)/0.3)] rounded-lg"
                          >
                            <AudioPlayer
                              src={getAuthenticatedAttachmentUrl(attachment.id)}
                              fileName={attachment.file_name}
                            />
                          </div>
                        ))}

                      {/* Image and Other Attachments */}
                      {attachments.filter(
                        (att) => !isAudioFile(att.mime_type, att.file_name),
                      ).length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {attachments
                            .filter(
                              (att) =>
                                !isAudioFile(att.mime_type, att.file_name),
                            )
                            .map((attachment) => (
                              <div
                                key={attachment.id}
                                className="border border-[hsl(var(--border))] rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                              >
                                {attachment.mime_type?.startsWith("image/") ? (
                                  <div className="aspect-video bg-[hsl(var(--muted))] relative">
                                    <img
                                      src={getAuthenticatedAttachmentUrl(
                                        attachment.id,
                                      )}
                                      alt={attachment.file_name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="aspect-video bg-[hsl(var(--muted))] flex items-center justify-center">
                                    <FileText className="w-12 h-12 text-[hsl(var(--muted-foreground))]" />
                                  </div>
                                )}
                                <div className="p-3">
                                  <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                                    {attachment.file_name}
                                  </p>
                                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                    {(attachment.file_size / 1024).toFixed(1)}{" "}
                                    KB
                                  </p>
                                  <button
                                    onClick={() =>
                                      downloadAttachment(
                                        attachment.id,
                                        attachment.file_name,
                                      )
                                    }
                                    className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                                  >
                                    <Download className="w-3 h-3" />
                                    {t("common.download")}
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Revisions Tab */}
              {activeTab === "revisions" && (
                <RevisionHistory incidentId={id!} />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
              {t("requests.details")}
            </h3>
            <div className="space-y-4">
              {/* Priority */}
              {priority && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    {t("requests.priority")}
                  </span>
                  <span
                    className="px-2.5 py-1 rounded-md text-xs font-medium text-white"
                    style={{ backgroundColor: priority.color || "#6b7280" }}
                  >
                    {getLookupLabel(priority)}
                  </span>
                </div>
              )}

              {/* Assignee */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  {t("requests.assignee")}
                </span>
                {request.assignee ? (
                  <div className="flex items-center gap-2">
                    {request.assignee.avatar ? (
                      <img
                        src={request.assignee.avatar}
                        alt={request.assignee.username}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {request.assignee.first_name?.[0] ||
                            request.assignee.username[0]}
                        </span>
                      </div>
                    )}
                    <span className="text-sm text-[hsl(var(--foreground))]">
                      {request.assignee.first_name || request.assignee.username}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => setAssignModalOpen(true)}
                    className="text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    {t("requests.assign")}
                  </button>
                )}
              </div>

              {/* Department */}
              {request.department && (
                <div className="flex flex-col gap-1 py-1">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    {t("requests.department")}
                  </span>
                  <div className="flex flex-wrap items-center gap-1 text-sm text-[hsl(var(--foreground))]">
                    <Building2 className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] shrink-0" />
                    {departmentPath.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {departmentPath.map((part, idx) => (
                          <React.Fragment key={idx}>
                            <span
                              className={cn(
                                idx === departmentPath.length - 1
                                  ? "font-semibold"
                                  : "text-[hsl(var(--muted-foreground))]",
                              )}
                            >
                              {part}
                            </span>
                            {idx < departmentPath.length - 1 && (
                              <ChevronRight className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    ) : (
                      request.department.name
                    )}
                  </div>
                </div>
              )}

              {/* Location */}
              {request.location && (
                <div className="flex flex-col gap-1 py-1">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    {t("requests.location")}
                  </span>
                  <div className="flex flex-wrap items-center gap-1 text-sm text-[hsl(var(--foreground))]">
                    <MapPin className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] shrink-0" />
                    {locationPath.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {locationPath.map((part, idx) => (
                          <React.Fragment key={idx}>
                            <span
                              className={cn(
                                idx === locationPath.length - 1
                                  ? "font-semibold"
                                  : "text-[hsl(var(--muted-foreground))]",
                              )}
                            >
                              {part}
                            </span>
                            {idx < locationPath.length - 1 && (
                              <ChevronRight className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    ) : (
                      request.location.name
                    )}
                  </div>
                </div>
              )}

              {/* Classification */}
              {request.classification && (
                <div className="flex flex-col gap-1 py-1">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    {t("requests.classification")}
                  </span>
                  <div className="flex flex-wrap items-center gap-1 text-sm text-[hsl(var(--foreground))]">
                    <Tags className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] shrink-0" />
                    {classificationPath.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {classificationPath.map((part, idx) => (
                          <React.Fragment key={idx}>
                            <span
                              className={cn(
                                idx === classificationPath.length - 1
                                  ? "font-semibold"
                                  : "text-[hsl(var(--muted-foreground))]",
                              )}
                            >
                              {part}
                            </span>
                            {idx < classificationPath.length - 1 && (
                              <ChevronRight className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    ) : (
                      request.classification.name
                    )}
                  </div>
                </div>
              )}

              {/* Source */}
              {request.source && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    {t("requests.source")}
                  </span>
                  <span className="text-sm text-[hsl(var(--foreground))] flex items-center gap-1 capitalize">
                    <Radio className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    {request.source.replace("_", " ")}
                  </span>
                </div>
              )}

              {/* Due Date */}
              {request.due_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    {t("requests.dueDate")}
                  </span>
                  <span className="text-sm text-[hsl(var(--foreground))] flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    {formatDate(request.due_date)}
                  </span>
                </div>
              )}

              {/* Created At */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  {t("requests.created")}
                </span>
                <span className="text-sm text-[hsl(var(--foreground))]">
                  {formatDate(request.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Workflow View */}
          {request.workflow && (
            <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
                {t("requests.workflow")}
              </h3>
              <MiniWorkflowView
                workflow={request.workflow}
                currentStateId={request.current_state?.id}
              />
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
                {selectedTransition.transition.name}
              </h3>
              <button
                onClick={handleCloseTransitionModal}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* State change preview */}
              <div className="flex items-center justify-center gap-4 p-4 bg-[hsl(var(--muted)/0.5)] rounded-lg">
                <span
                  className="px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: selectedTransition.transition.from_state
                      ?.color
                      ? `${selectedTransition.transition.from_state.color}20`
                      : "hsl(var(--muted))",
                    color:
                      selectedTransition.transition.from_state?.color ||
                      "hsl(var(--foreground))",
                  }}
                >
                  {selectedTransition.transition.from_state?.name}
                </span>
                <ChevronRight className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                <span
                  className="px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: selectedTransition.transition.to_state
                      ?.color
                      ? `${selectedTransition.transition.to_state.color}20`
                      : "hsl(var(--muted))",
                    color:
                      selectedTransition.transition.to_state?.color ||
                      "hsl(var(--foreground))",
                  }}
                >
                  {selectedTransition.transition.to_state?.name}
                </span>
              </div>

              {/* Feedback Requirement */}
              {selectedTransition.requirements?.some(
                (r) => r.requirement_type === "feedback",
              ) && (
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t("requests.feedback")}
                    {selectedTransition.requirements.some(
                      (r) =>
                        r.requirement_type === "feedback" && r.is_mandatory,
                    ) && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {feedbackTemplates.length > 0 && (
                    <select
                      value={selectedFeedbackTemplate}
                      onChange={(e) =>
                        handleFeedbackTemplateChange(e.target.value)
                      }
                      className="w-full mb-3 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">
                        {t("common.selectFeedback", "Select template...")}
                      </option>
                      {feedbackTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.feedback_text}
                        </option>
                      ))}
                      <option value="other">
                        {t("common.other", "Other")}
                      </option>
                    </select>
                  )}
                  {(showFeedbackTextarea || feedbackTemplates.length === 0) && (
                    <textarea
                      value={transitionFeedbackComment}
                      onChange={(e) => {
                        setTransitionFeedbackComment(e.target.value);
                        if (commentErrors.feedback) {
                          setCommentErrors((prev) => ({
                            ...prev,
                            feedback: "",
                          }));
                        }
                      }}
                      placeholder={t("requests.feedbackComment")}
                      rows={3}
                      className={cn(
                        "w-full px-3 py-2 bg-[hsl(var(--background))] border rounded-lg text-sm resize-none",
                        commentErrors.feedback
                          ? "border-red-500"
                          : "border-[hsl(var(--border))]",
                      )}
                    />
                  )}
                  {commentErrors.feedback && (
                    <p className="text-xs text-red-500">
                      {commentErrors.feedback}
                    </p>
                  )}
                </div>
              )}

              {/* Comment Requirement */}
              {selectedTransition.requirements?.some(
                (r) => r.requirement_type === "comment",
              ) && (
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t("requests.comment")}
                    {selectedTransition.requirements.some(
                      (r) => r.requirement_type === "comment" && r.is_mandatory,
                    ) && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {commentTemplates.length > 0 && (
                    <select
                      value={selectedCommentTemplate}
                      onChange={(e) =>
                        handleCommentTemplateChange(e.target.value)
                      }
                      className="w-full mb-3 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">
                        {t("common.selectComment", "Select template...")}
                      </option>
                      {commentTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.comment_text}
                        </option>
                      ))}
                      <option value="other">
                        {t("common.other", "Other")}
                      </option>
                    </select>
                  )}
                  {(showCommentTextarea || commentTemplates.length === 0) && (
                    <textarea
                      value={transitionComment}
                      onChange={(e) => {
                        setTransitionComment(e.target.value);
                        if (commentErrors.comment) {
                          setCommentErrors((prev) => ({
                            ...prev,
                            comment: "",
                          }));
                        }
                      }}
                      placeholder={t("requests.addComment")}
                      rows={3}
                      className={cn(
                        "w-full px-4 py-3 bg-[hsl(var(--background))] border rounded-lg text-sm resize-none",
                        commentErrors.comment
                          ? "border-red-500"
                          : "border-[hsl(var(--border))]",
                      )}
                    />
                  )}
                  {commentErrors.comment && (
                    <p className="text-xs text-red-500">
                      {commentErrors.comment}
                    </p>
                  )}
                </div>
              )}

              {/* Attachment Requirement */}
              {selectedTransition.requirements?.some(
                (r) => r.requirement_type === "attachment",
              ) && (
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t("requests.attachment")}
                    {selectedTransition.requirements.some(
                      (r) =>
                        r.requirement_type === "attachment" && r.is_mandatory,
                    ) && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {transitionAttachment ? (
                    <div className="flex items-center justify-between p-3 bg-[hsl(var(--muted)/0.5)] rounded-lg">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        <span className="text-sm truncate max-w-[200px]">
                          {transitionAttachment.name}
                        </span>
                      </div>
                      <button
                        onClick={() => setTransitionAttachment(null)}
                        className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-[hsl(var(--border))] rounded-lg cursor-pointer hover:border-emerald-500 transition-colors">
                      <Upload className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-sm text-[hsl(var(--muted-foreground))]">
                        {t("requests.clickToUpload")}
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

              <div className="flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border))]">
                <Button variant="ghost" onClick={handleCloseTransitionModal}>
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleConfirmTransition}
                  isLoading={
                    transitionMutation.isPending || transitionUploading
                  }
                  disabled={transitionMutation.isPending || transitionUploading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {t("requests.executeTransition")}
                </Button>
              </div>
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
                {t("requests.assignRequest")}
              </h3>
              <button
                onClick={() => {
                  setAssignModalOpen(false);
                  setSelectedAssignee("");
                }}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  {t("requests.selectAssignee")}
                </label>
                <select
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                >
                  <option value="">{t("requests.selectUser")}</option>
                  {users.map((user: UserType) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name
                        ? `${user.first_name} ${user.last_name || ""}`
                        : user.username}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border))]">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAssignModalOpen(false);
                    setSelectedAssignee("");
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={() => assignMutation.mutate(selectedAssignee)}
                  disabled={!selectedAssignee || assignMutation.isPending}
                  isLoading={assignMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {t("requests.assign")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground)/0.6)] p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-request-title"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !deleteMutation.isPending
            ) {
              setDeleteModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] px-6 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--destructive)/0.1)]">
                <AlertTriangle className="h-5 w-5 text-[hsl(var(--destructive))]" />
              </div>
              <h3
                id="delete-request-title"
                className="text-lg font-semibold text-[hsl(var(--foreground))]"
              >
                {t("requests.deleteRequest")}
              </h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                {t("requests.deleteRequestConfirm", {
                  number: request.incident_number,
                })}
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-[hsl(var(--border))] px-6 py-4">
              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteMutation.isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                isLoading={deleteMutation.isPending}
                disabled={deleteMutation.isPending}
                leftIcon={
                  !deleteMutation.isPending ? (
                    <Trash2 className="h-4 w-4" />
                  ) : undefined
                }
              >
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
      <CreateRequestModal
        isOpen={editModalOpen}
        initialRequest={request}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          setEditModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
};
