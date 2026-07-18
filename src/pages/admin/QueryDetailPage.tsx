import React, { useState, useMemo } from "react";
import { publicUrl } from "../../utils/publicUrl";
import { toast } from "sonner";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
  ChevronDown,
  CheckCircle2,
  XCircle,
  Play,
  Download,
  X,
  History,
  Tags,
  ExternalLink,
  Mail,
  ThumbsUp,
  AlertTriangle,
  MapPin,
  FileText,
  Upload,
  Radio,
  Search,
} from "lucide-react";
import { Button } from "../../components/ui";
import { TreeSelect } from "../../components/ui/TreeSelect";
import { MiniWorkflowView } from "../../components/workflow";
import { RevisionHistory } from "../../components/incidents";
import CallablePhone from "../../components/common/CallablePhone";
import {
  queryApi,
  userApi,
  departmentApi,
  locationApi,
  classificationApi,
  commentTemplateApi,
  feedbackTemplateApi,
} from "../../api/admin";
import { API_URL } from "../../api/client";
import type {
  AvailableTransition,
  DepartmentMatchResponse,
  UserMatchResponse,
  Department,
  User as UserType,
} from "../../types";
import { getNodePath, type TreeSelectNode } from "../../utils/treeUtils";
import { cn } from "@/lib/utils";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon - using local images
const defaultIcon = new Icon({
  iconUrl: publicUrl("images/leaflet/marker-icon.png"),
  iconRetinaUrl: publicUrl("images/leaflet/marker-icon-2x.png"),
  shadowUrl: publicUrl("images/leaflet/marker-shadow.png"),
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
  const [transitionFeedbackComment, setTransitionFeedbackComment] =
    useState("");
  const [transitionFieldValues, setTransitionFieldValues] = useState<
    Record<string, string>
  >({});
  const [transitionErrors, setTransitionErrors] = useState<
    Record<string, string>
  >({});
  const [transitionStep, setTransitionStep] = useState(0);

  // Assignment matching state
  const [matchLoading, setMatchLoading] = useState(false);
  const [departmentMatchResult, setDepartmentMatchResult] =
    useState<DepartmentMatchResponse | null>(null);
  const [userMatchResult, setUserMatchResult] =
    useState<UserMatchResponse | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [deptSearchQuery, setDeptSearchQuery] = useState("");
  const [collapsedDeptIds, setCollapsedDeptIds] = useState<Set<string>>(
    new Set(),
  );
  const [collapsedUserGroups, setCollapsedUserGroups] = useState<Set<string>>(
    new Set(),
  );

  // Image lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Queries
  const {
    data: queryData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["query", id],
    queryFn: () => queryApi.getById(id!),
    enabled: !!id,
  });

  const { data: transitionsData, refetch: refetchTransitions } = useQuery({
    queryKey: ["query", id, "transitions"],
    queryFn: () => queryApi.getAvailableTransitions(id!),
    enabled: !!id,
  });

  const { data: historyData } = useQuery({
    queryKey: ["query", id, "history"],
    queryFn: () => queryApi.getHistory(id!),
    enabled: !!id,
  });

  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ["query", id, "comments"],
    queryFn: () => queryApi.listComments(id!),
    enabled: !!id,
  });

  const { data: attachmentsData } = useQuery({
    queryKey: ["query", id, "attachments"],
    queryFn: () => queryApi.listAttachments(id!),
    enabled: !!id,
  });

  useQuery({
    queryKey: ["admin", "users", 1, 100],
    queryFn: () => userApi.list(1, 100),
  });

  const query = queryData?.data;
  const availableTransitions = transitionsData?.data || [];
  const history = historyData?.data || [];
  const comments = commentsData?.data || [];
  const attachments = attachmentsData?.data || [];

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

  // Recursively filter department tree by type ('internal' | 'external')
  const filterDeptTree = (nodes: Department[], type: string): Department[] =>
    nodes
      .map((node) => ({
        ...node,
        children: node.children ? filterDeptTree(node.children, type) : [],
      }))
      .filter(
        (node) =>
          node.type === type || (node.children && node.children.length > 0),
      );

  // Comment and feedback templates for transitions
  const { data: commentTemplatesData } = useQuery({
    queryKey: ["comment-templates", selectedTransition?.transition.id],
    queryFn: () =>
      commentTemplateApi.listByTransition(selectedTransition!.transition.id),
    enabled: !!selectedTransition?.transition.id,
  });

  const { data: feedbackTemplatesData } = useQuery({
    queryKey: ["feedback-templates", selectedTransition?.transition.id],
    queryFn: () =>
      feedbackTemplateApi.listByTransition(selectedTransition!.transition.id),
    enabled: !!selectedTransition?.transition.id,
  });

  const commentTemplates = commentTemplatesData?.data || [];
  const feedbackTemplates = feedbackTemplatesData?.data || [];

  const classificationPath = React.useMemo(() => {
    if (!query?.classification?.id || !fcClassificationsData?.data) return [];
    return getNodePath(
      fcClassificationsData.data as unknown as TreeSelectNode[],
      query.classification.id,
    );
  }, [query?.classification?.id, fcClassificationsData?.data]);

  const locationPath = React.useMemo(() => {
    if (!query?.location?.id || !fcLocationsData?.data) return [];
    return getNodePath(
      fcLocationsData.data as unknown as TreeSelectNode[],
      query.location.id,
    );
  }, [query?.location?.id, fcLocationsData?.data]);

  const departmentPath = React.useMemo(() => {
    if (!query?.department?.id || !fcDepartmentsData?.data) return [];
    return getNodePath(
      fcDepartmentsData.data as unknown as TreeSelectNode[],
      query.department.id,
    );
  }, [query?.department?.id, fcDepartmentsData?.data]);

  // Check if query is closed (terminal state)
  const isClosed = query?.current_state?.state_type === "terminal";

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
      // eslint-disable-next-line no-console
      console.error("Error downloading attachment:", error);
      toast.error("Failed to download attachment");
    }
  };

  // Helper function to get authenticated attachment URL for audio/video
  const getAuthenticatedAttachmentUrl = (attachmentId: string): string => {
    const token = localStorage.getItem("token");
    return `${API_URL}/attachments/${attachmentId}?token=${token}`;
  };

  // Mutations
  const transitionMutation = useMutation({
    mutationFn: ({
      transitionId,
      comment,
      attachments,
      feedback,
      department_id,
      user_ids,
      field_changes,
    }: {
      transitionId: string;
      comment?: string;
      attachments?: string[];
      feedback?: { rating: number; comment?: string };
      department_id?: string;
      user_ids?: string[];
      field_changes?: Record<string, string>;
    }) =>
      queryApi.transition(id!, {
        transition_id: transitionId,
        comment,
        attachments,
        feedback: {
          rating: 5,
          comment: feedback?.comment,
        },
        department_id,
        user_ids,
        field_changes,
        version: query?.version || 1,
      }),
    onSuccess: () => {
      refetch();
      refetchTransitions();
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["query", id, "history"] });
      queryClient.invalidateQueries({ queryKey: ["queries", "stats"] });
      setTransitionModalOpen(false);
      setSelectedTransition(null);
      setTransitionComment("");
      setTransitionAttachment(null);
      setTransitionFeedbackComment("");
      setTransitionFieldValues({});
      setDepartmentMatchResult(null);
      setUserMatchResult(null);
      setSelectedDepartmentId("");
      setSelectedUserIds([]);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to execute transition";

      if (
        errorMessage.includes("conflict") ||
        errorMessage.includes("modified by another user")
      ) {
        toast.error("Conflict Detected", {
          description: "This query was modified by another user. Refreshing...",
          duration: 5000,
        });
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["query", id] });
          refetchTransitions();
        }, 1000);
      } else {
        toast.error("Transition Failed", {
          description: errorMessage,
        });
      }
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: () =>
      queryApi.addComment(id!, {
        content: commentText,
        is_internal: isInternalComment,
      }),
    onSuccess: () => {
      refetchComments();
      setCommentText("");
    },
  });

  const evaluateMutation = useMutation({
    mutationFn: () => queryApi.incrementEvaluation(id!),
    onSuccess: () => {
      refetch();
    },
  });

  type TransitionStepKey =
    | "department"
    | "user"
    | "field_changes"
    | "attachment"
    | "feedback"
    | "comment";

  // Compute ordered step list from the selected transition config
  const transitionSteps = useMemo((): TransitionStepKey[] => {
    if (!selectedTransition) return [];
    const trans = selectedTransition.transition;
    const steps: TransitionStepKey[] = [];
    if (trans.assign_department_id || trans.auto_detect_department)
      steps.push("department");
    if (
      trans.assign_user_id ||
      ((trans.auto_match_user || trans.manual_select_user) &&
        trans.assignment_roles &&
        trans.assignment_roles.length > 0)
    )
      steps.push("user");
    if (trans.field_changes && trans.field_changes.length > 0)
      steps.push("field_changes");
    if (
      selectedTransition.requirements?.some(
        (r) => r.requirement_type === "attachment",
      )
    )
      steps.push("attachment");
    if (
      selectedTransition.requirements?.some(
        (r) => r.requirement_type === "feedback",
      )
    )
      steps.push("feedback");
    steps.push("comment");
    return steps;
  }, [selectedTransition]);

  const closeTransitionModal = () => {
    setTransitionModalOpen(false);
    setSelectedTransition(null);
    setTransitionComment("");
    setTransitionAttachment(null);
    setTransitionFeedbackComment("");
    setTransitionFieldValues({});
    setTransitionErrors({});
    setTransitionStep(0);
  };

  const validateCurrentStep = (): boolean => {
    if (!selectedTransition || transitionSteps.length === 0) return true;
    const stepKey = transitionSteps[transitionStep];
    const trans = selectedTransition.transition;
    const newErrors: Record<string, string> = {};

    if (stepKey === "department") {
      if (
        trans.auto_detect_department &&
        !trans.assign_department_id &&
        !selectedDepartmentId
      )
        newErrors.department = t(
          "incidents.departmentSelectionRequired",
          "Please select a department",
        );
    } else if (stepKey === "user") {
      if (
        trans.manual_select_user &&
        trans.assignment_roles &&
        trans.assignment_roles.length > 0 &&
        !trans.assign_user_id &&
        selectedUserIds.length === 0
      )
        newErrors.user = t(
          "incidents.userSelectionRequired",
          "Please select a user to assign",
        );
    } else if (stepKey === "field_changes") {
      const required = trans.field_changes?.filter((f) => f.is_required) || [];
      for (const fc of required) {
        if (!transitionFieldValues[fc.field_name])
          newErrors[fc.field_name] = t(
            "incidents.fieldRequired",
            "{{field}} is required",
            { field: fc.label || fc.field_name },
          );
      }
    } else if (stepKey === "attachment") {
      if (
        selectedTransition.requirements?.some(
          (r) => r.requirement_type === "attachment" && r.is_mandatory,
        ) &&
        !transitionAttachment
      )
        newErrors.attachment = t(
          "incidents.attachmentRequired",
          "Attachment is required",
        );
    } else if (stepKey === "feedback") {
      if (
        selectedTransition.requirements?.some(
          (r) => r.requirement_type === "feedback" && r.is_mandatory,
        ) &&
        transitionFeedbackComment === ""
      )
        newErrors.feedback = t(
          "incidents.feedbackRequired",
          "Please provide feedback",
        );
    } else if (stepKey === "comment") {
      if (
        selectedTransition.requirements?.some(
          (r) => r.requirement_type === "comment" && r.is_mandatory,
        ) &&
        !transitionComment.trim()
      )
        newErrors.comment = t(
          "incidents.commentRequired",
          "Comment is required",
        );
    }

    setTransitionErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStepNext = () => {
    if (!validateCurrentStep()) return;
    setTransitionErrors({});
    if (transitionStep < transitionSteps.length - 1) {
      setTransitionStep((prev) => prev + 1);
    } else {
      executeTransition();
    }
  };

  const handleStepBack = () => {
    setTransitionErrors({});
    setTransitionStep((prev) => Math.max(0, prev - 1));
  };

  const handleTransitionClick = async (transition: AvailableTransition) => {
    setSelectedTransition(transition);
    setTransitionModalOpen(true);
    setTransitionStep(0);
    setDepartmentMatchResult(null);
    setUserMatchResult(null);
    setSelectedDepartmentId("");
    setSelectedUserIds([]);
    setUserSearchQuery("");
    setDeptSearchQuery("");
    setCollapsedDeptIds(new Set());
    setCollapsedUserGroups(new Set());

    // Check if we need to fetch assignment matches
    const trans = transition.transition;
    const needsDeptMatch =
      trans.auto_detect_department && !trans.assign_department_id;
    const needsUserMatch =
      (trans.auto_match_user || trans.manual_select_user) &&
      trans.assignment_roles &&
      trans.assignment_roles.length > 0 &&
      !trans.assign_user_id;

    if ((needsDeptMatch || needsUserMatch) && query) {
      setMatchLoading(true);
      try {
        if (needsDeptMatch) {
          const deptResult = await departmentApi.match({
            classification_id: query.classification?.id,
            location_id: query.location?.id,
            ...(trans.department_type_filter
              ? {
                  department_type: trans.department_type_filter as
                    | "internal"
                    | "external",
                }
              : {}),
          });
          if (deptResult.success && deptResult.data) {
            setDepartmentMatchResult(deptResult.data);
            if (
              deptResult.data.single_match &&
              deptResult.data.matched_department_id
            ) {
              setSelectedDepartmentId(deptResult.data.matched_department_id);
            }
          }
        }

        if (needsUserMatch) {
          const userResult = await userApi.match({
            role_ids: trans.assignment_roles?.map((r) => r.id),
            classification_id: query.classification?.id,
            location_id: query.location?.id,
            department_id: query.department?.id,
          });
          if (userResult.success && userResult.data) {
            setUserMatchResult(userResult.data);
            if (
              userResult.data.single_match &&
              userResult.data.matched_user_id
            ) {
              setSelectedUserIds([userResult.data.matched_user_id]);
            }
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch assignment matches:", error);
      } finally {
        setMatchLoading(false);
      }
    }
  };

  const executeTransition = async () => {
    if (!selectedTransition) return;

    const trans = selectedTransition.transition;
    const newTransitionErrors: Record<string, string> = {};

    // Validate comment
    const requiresComment = selectedTransition.requirements?.some(
      (r) => r.requirement_type === "comment" && r.is_mandatory,
    );
    if (requiresComment && !transitionComment.trim())
      newTransitionErrors.comment = t(
        "incidents.commentRequired",
        "Comment is required",
      );

    // Validate attachment
    const requiresAttachment = selectedTransition.requirements?.some(
      (r) => r.requirement_type === "attachment" && r.is_mandatory,
    );
    if (requiresAttachment && !transitionAttachment)
      newTransitionErrors.attachment = t(
        "incidents.attachmentRequired",
        "Attachment is required",
      );

    // Validate required field changes
    const requiredFieldChanges =
      trans.field_changes?.filter((f) => f.is_required) || [];
    for (const fc of requiredFieldChanges) {
      if (!transitionFieldValues[fc.field_name])
        newTransitionErrors[fc.field_name] = t(
          "incidents.fieldRequired",
          "{{field}} is required",
          { field: fc.label || fc.field_name },
        );
    }

    // Validate department selection
    if (
      trans.auto_detect_department &&
      !trans.assign_department_id &&
      !selectedDepartmentId
    ) {
      const noDeptAvailable =
        departmentMatchResult && departmentMatchResult.departments.length === 0;
      newTransitionErrors.department = noDeptAvailable
        ? t(
            "incidents.noDepartmentAssigned",
            "No department assigned - Contact administrator for this",
          )
        : t(
            "incidents.departmentSelectionRequired",
            "Please select a department",
          );
    }

    // Validate user selection
    if (
      trans.manual_select_user &&
      trans.assignment_roles &&
      trans.assignment_roles.length > 0 &&
      !trans.assign_user_id &&
      selectedUserIds.length === 0
    ) {
      newTransitionErrors.user = t(
        "incidents.userSelectionRequired",
        "Please select a user to assign",
      );
    }

    if (Object.keys(newTransitionErrors).length > 0) {
      setTransitionErrors(newTransitionErrors);
      return;
    }
    setTransitionErrors({});

    try {
      let attachmentIds: string[] | undefined;

      if (transitionAttachment) {
        setTransitionUploading(true);
        const uploadResult = await queryApi.uploadAttachment(
          id!,
          transitionAttachment,
        );
        if (uploadResult.data?.id) {
          attachmentIds = [uploadResult.data.id];
        }
        setTransitionUploading(false);
      }

      // Determine assignment IDs
      let departmentId: string | undefined;
      if (trans.assign_department_id) {
        departmentId = trans.assign_department_id;
      } else if (trans.auto_detect_department && selectedDepartmentId) {
        departmentId = selectedDepartmentId;
      }

      const userIds =
        (trans.manual_select_user || trans.auto_match_user) &&
        selectedUserIds.length > 0
          ? selectedUserIds
          : undefined;

      transitionMutation.mutate({
        transitionId: selectedTransition.transition.id,
        comment: transitionComment || undefined,
        attachments: attachmentIds,
        feedback: transitionFeedbackComment
          ? {
              rating: 0,
              comment: transitionFeedbackComment || undefined,
            }
          : undefined,
        department_id: departmentId,
        user_ids: userIds,
        field_changes:
          Object.keys(transitionFieldValues).length > 0
            ? transitionFieldValues
            : undefined,
      });
    } catch {
      setTransitionUploading(false);
      toast.error(
        t(
          "incidents.attachmentUploadFailed",
          "Failed to upload attachment. Please try again.",
        ),
      );
    }
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

  // Helper to check if attachment is an image
  const isImageFile = (mimeType: string) => {
    return mimeType && mimeType.startsWith("image/");
  };

  // Helper to check if attachment is audio
  const isAudioFile = (mimeType: string, fileName: string) => {
    // Check mime type first
    if (mimeType && mimeType.startsWith("audio/")) {
      return true;
    }
    // Fallback to file extension check
    const audioExtensions = /\.(mp3|wav|m4a|aac|ogg|webm|flac)$/i;
    return audioExtensions.test(fileName);
  };

  // Categorize attachments
  const imageAttachments =
    attachments?.filter((att) => isImageFile(att.mime_type)) || [];
  const audioAttachments =
    attachments?.filter((att) => isAudioFile(att.mime_type, att.file_name)) ||
    [];
  const otherAttachments =
    attachments?.filter(
      (att) =>
        !isImageFile(att.mime_type) &&
        !isAudioFile(att.mime_type, att.file_name),
    ) || [];

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
          <p className="text-[hsl(var(--muted-foreground))]">
            {t("queries.loading")}
          </p>
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
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
            {t("queries.notFound")}
          </h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">
            {t("queries.notFoundDesc")}
          </p>
          <Button
            onClick={() => navigate("/queries")}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            {t("common.backToList")}
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
            onClick={() => navigate("/queries")}
            className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("common.backToQueries")}
          </button>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-[hsl(var(--primary))]">
              {query.incident_number}
            </span>
            {query.current_state && (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: query.current_state.color
                    ? `${query.current_state.color}20`
                    : "hsl(var(--muted))",
                  color: query.current_state.color || "hsl(var(--foreground))",
                }}
              >
                {query.current_state.name}
              </span>
            )}
            {query.sla_breached && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-600">
                <AlertTriangle className="w-3 h-3" />
                {t("queries.slaBreached")}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
            {query.title}
          </h1>
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
              {t("queries.evaluate")} ({query.evaluation_count || 0})
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            isLoading={isRefetching}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            {t("common.refresh")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
              {t("common.description")}
            </h2>
            <p className="text-[hsl(var(--foreground))] whitespace-pre-wrap">
              {query.description || t("common.noDescription")}
            </p>
          </div>

          {/* Tabs: Activity, Comments, Attachments, Revisions */}
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-sm overflow-x-auto scrollbar-hide">
            <div className="flex border-b border-[hsl(var(--border))]">
              {(
                ["activity", "comments", "attachments", "revisions"] as const
              ).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 min-w-fit px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap",
                    activeTab === tab
                      ? "text-violet-500"
                      : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    {tab === "activity" && <History className="w-4 h-4" />}
                    {tab === "comments" && (
                      <MessageSquare className="w-4 h-4" />
                    )}
                    {tab === "attachments" && <Paperclip className="w-4 h-4" />}
                    {tab === "revisions" && <Tags className="w-4 h-4" />}
                    <span className="capitalize">{t(`tabs.${tab}`, tab)}</span>
                    {tab === "comments" && comments.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-violet-500/10 text-violet-500 rounded-full">
                        {comments.length}
                      </span>
                    )}
                    {tab === "attachments" && attachments.length > 0 && (
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
              {activeTab === "activity" && (
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <p className="text-center text-[hsl(var(--muted-foreground))] py-8">
                      {t("common.noActivity")}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="flex gap-4 pb-4 border-b border-[hsl(var(--border))] last:border-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                            <ChevronRight className="w-4 h-4 text-violet-500" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-[hsl(var(--foreground))]">
                                {item.performed_by?.first_name ||
                                  item.performed_by?.username ||
                                  "System"}
                              </span>
                              <span className="text-[hsl(var(--muted-foreground))]">
                                {t("common.transitionedTo")}
                              </span>
                              <span
                                className="px-2 py-0.5 rounded text-xs font-medium"
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
              {activeTab === "comments" && (
                <div className="space-y-4">
                  {/* Add Comment Form */}
                  <div className="flex gap-3">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={t("common.addComment")}
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
                      {t("common.send")}
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
                    <label
                      htmlFor="internal"
                      className="text-[hsl(var(--muted-foreground))]"
                    >
                      {t("common.internalComment")}
                    </label>
                  </div>

                  {/* Comments List */}
                  {comments.length === 0 ? (
                    <p className="text-center text-[hsl(var(--muted-foreground))] py-8">
                      {t("common.noComments")}
                    </p>
                  ) : (
                    <div className="space-y-4 mt-6">
                      {comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="flex gap-3 pb-4 border-b border-[hsl(var(--border))] last:border-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-semibold">
                              {comment.author?.first_name?.[0] ||
                                comment.author?.username?.[0] ||
                                "U"}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[hsl(var(--foreground))]">
                                {comment.author?.first_name ||
                                  comment.author?.username}
                              </span>
                              {comment.is_internal && (
                                <span className="px-1.5 py-0.5 text-xs bg-yellow-500/10 text-yellow-600 rounded">
                                  {t("common.internal")}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-[hsl(var(--foreground))]">
                              {comment.content}
                            </p>
                            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                              {formatDate(comment.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Attachments Tab */}
              {activeTab === "attachments" && (
                <div className="space-y-4">
                  {attachments.length === 0 ? (
                    <p className="text-center text-[hsl(var(--muted-foreground))] py-8">
                      {t("common.noAttachments")}
                    </p>
                  ) : (
                    <>
                      {/* Image Gallery */}
                      {imageAttachments.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">
                            {t("common.images")}
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {imageAttachments.map((attachment, index) => (
                              <div
                                key={attachment.id}
                                className="relative group rounded-lg overflow-hidden border-2 border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] transition-all cursor-pointer"
                                onClick={() => openLightbox(index)}
                              >
                                <img
                                  src={getAuthenticatedAttachmentUrl(
                                    attachment.id,
                                  )}
                                  alt={attachment.file_name}
                                  className="w-full h-32 object-cover transition-opacity hover:opacity-90"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <button className="p-2 bg-white/90 rounded-full text-gray-700 hover:bg-white transition-colors">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="w-5 h-5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                                      />
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
                          <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">
                            {t("common.audio")}
                          </h3>
                          {audioAttachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="p-3 bg-[hsl(var(--muted)/0.3)] rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-[hsl(var(--background))] rounded-lg">
                                    <svg
                                      className="w-5 h-5 text-[hsl(var(--primary))]"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                                      />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                                      {attachment.file_name}
                                    </p>
                                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                      {(attachment.file_size / 1024).toFixed(1)}{" "}
                                      KB
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    downloadAttachment(
                                      attachment.id,
                                      attachment.file_name,
                                    )
                                  }
                                  className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                              <audio
                                controls
                                className="w-full h-10"
                                src={getAuthenticatedAttachmentUrl(
                                  attachment.id,
                                )}
                                preload="metadata"
                              >
                                {t("queries.yourBrowserDoesNotSupportTheAudio")}
                              </audio>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Other Files */}
                      {otherAttachments.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">
                            {t("common.files")}
                          </h3>
                          <div className="space-y-2">
                            {otherAttachments.map((attachment) => (
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
                                      {(attachment.file_size / 1024).toFixed(1)}{" "}
                                      KB
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    downloadAttachment(
                                      attachment.id,
                                      attachment.file_name,
                                    )
                                  }
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
              {activeTab === "revisions" && (
                <RevisionHistory incidentId={id!} />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Query Info */}
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
              {t("queries.details")}
            </h2>
            <div className="space-y-4">
              {/* Channel */}
              {query.channel && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {t("common.channel")}
                    </p>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] capitalize">
                      {query.channel}
                    </p>
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
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {t("queries.sourceIncident")}
                    </p>
                    <Link
                      to={`/incidents/${query.source_incident_id}`}
                      className="text-sm font-medium text-violet-500 hover:underline flex items-center gap-1"
                    >
                      {query.source_incident?.incident_number ||
                        t("queries.viewIncident")}
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
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {t("common.classification")}
                    </p>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5 text-sm text-[hsl(var(--foreground))]">
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
                        query.classification.name
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Assignee */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-violet-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {t("common.assignee")}
                  </p>
                  {query.assignee ? (
                    <div className="flex items-center gap-2 mt-1">
                      {query.assignee.avatar ? (
                        <img
                          src={query.assignee.avatar}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {query.assignee.first_name?.[0] ||
                              query.assignee.username[0]}
                          </span>
                        </div>
                      )}
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {query.assignee.first_name || query.assignee.username}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {t("common.unassigned")}
                    </p>
                  )}
                </div>
              </div>

              {/* Department */}
              {query.department && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-violet-500" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {t("common.department")}
                    </p>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5 text-sm text-[hsl(var(--foreground))]">
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
                        query.department.name
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Location */}
              {query.location && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-violet-500" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {t("common.location")}
                    </p>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5 text-sm text-[hsl(var(--foreground))]">
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
                        query.location.name
                      )}
                    </div>
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
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {t("queries.source")}
                    </p>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] capitalize">
                      {query.source.replace("_", " ")}
                    </p>
                  </div>
                </div>
              )}

              {/* Created By */}
              {query?.reporter && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {t("queries.createdBy")}
                    </p>
                    {query.reporter?.first_name && (
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {query.reporter.first_name} {query.reporter.last_name}
                      </p>
                    )}
                    {query.reporter?.email && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1 mt-0.5 break-all">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        {query.reporter.email}
                      </p>
                    )}
                    {query.reporter?.phone && (
                      <p className="mt-0.5">
                        <CallablePhone
                          number={query.reporter.phone}
                          className="text-xs"
                        />
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Created Date */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {t("common.created")}
                  </p>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {formatDate(query.created_at)}
                  </p>
                </div>
              </div>

              {/* Closed Date */}
              {query.closed_at && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {t("common.closed")}
                    </p>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {formatDate(query.closed_at)}
                    </p>
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
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {t("queries.evaluations")}
                    </p>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {query.evaluation_count || 0}
                    </p>
                  </div>
                </div>
              )}

              {/* Geolocation - only show if has coordinates */}
              {query.latitude !== undefined &&
                query.longitude !== undefined && (
                  <div className="pt-4 border-t border-[hsl(var(--border))]">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-violet-500" />
                      <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {t("queries.geolocation")}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {/* Map - compact height */}
                      <div className="h-32 rounded-lg overflow-hidden border border-[hsl(var(--border))]">
                        <MapContainer
                          center={[query.latitude, query.longitude]}
                          zoom={15}
                          className="h-full w-full"
                          style={{ height: "100%", width: "100%" }}
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
                            {query.latitude?.toFixed(6)},{" "}
                            {query.longitude?.toFixed(6)}
                          </span>
                        </div>
                        {query.address && (
                          <p className="break-words">{query.address}</p>
                        )}
                        {(query.city || query.state || query.country) && (
                          <p>
                            {[
                              query.city,
                              query.state,
                              query.country,
                              query.postal_code,
                            ]
                              .filter(Boolean)
                              .join(", ")}
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
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
                {t("queries.workflow")}
              </h3>
              <p className="text-sm text-[hsl(var(--foreground))]">
                {query.workflow.name}
              </p>
              {query.workflow.description && (
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 mb-4">
                  {query.workflow.description}
                </p>
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

      {/* Transition Modal — Multi-step wizard */}
      {transitionModalOpen &&
        selectedTransition &&
        (() => {
          const isLastStep = transitionStep === transitionSteps.length - 1;
          const trans = selectedTransition.transition;
          const currentStepKey = transitionSteps[transitionStep];
          const stepTitles: Record<string, string> = {
            department: t("incidents.departmentAssignment"),
            user: t("incidents.userAssignment"),
            field_changes: "Field Changes",
            attachment: t("incidents.attachment"),
            feedback: t("incidents.feedback"),
            comment: t("incidents.comment"),
          };
          const isMandatory =
            (currentStepKey === "comment" &&
              selectedTransition.requirements?.some(
                (r) => r.requirement_type === "comment" && r.is_mandatory,
              )) ||
            (currentStepKey === "attachment" &&
              selectedTransition.requirements?.some(
                (r) => r.requirement_type === "attachment" && r.is_mandatory,
              )) ||
            (currentStepKey === "feedback" &&
              selectedTransition.requirements?.some(
                (r) => r.requirement_type === "feedback" && r.is_mandatory,
              )) ||
            (currentStepKey === "department" &&
              trans.auto_detect_department &&
              !trans.assign_department_id) ||
            (currentStepKey === "user" &&
              trans.manual_select_user &&
              !trans.assign_user_id);

          return (
            <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full animate-scale-in flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
                  <div>
                    <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                      {t("incidents.executeTransition")}
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      {t("incidents.stepOf", {
                        current: transitionStep + 1,
                        total: transitionSteps.length,
                      })}
                    </p>
                  </div>
                  <button
                    onClick={closeTransitionModal}
                    className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-lg transition-colors mt-0.5"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Fixed info: from→to state + step progress dots */}
                <div className="px-6 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <div className="flex items-center justify-center gap-3 text-sm">
                    <span
                      className="px-3 py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: trans.from_state?.color
                          ? `${trans.from_state.color}20`
                          : "hsl(var(--muted))",
                        color:
                          trans.from_state?.color || "hsl(var(--foreground))",
                      }}
                    >
                      {trans.from_state?.name || t("incidents.current")}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] rtl:-rotate-180" />
                    <span
                      className="px-3 py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: trans.to_state?.color
                          ? `${trans.to_state.color}20`
                          : "hsl(var(--muted))",
                        color:
                          trans.to_state?.color || "hsl(var(--foreground))",
                      }}
                    >
                      {trans.to_state?.name || t("incidents.next")}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    {transitionSteps.map((_, idx) => (
                      <div
                        key={idx}
                        className={`rounded-full transition-all duration-200 ${
                          idx === transitionStep
                            ? "w-4 h-2 bg-[hsl(var(--primary))]"
                            : idx < transitionStep
                              ? "w-2 h-2 bg-[hsl(var(--primary)/0.4)]"
                              : "w-2 h-2 bg-[hsl(var(--border))]"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Step content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Step label */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        {stepTitles[currentStepKey]}
                      </span>

                      {isMandatory ? (
                        <span className="text-red-500 font-bold">*</span>
                      ) : (
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          ({t("incidents.optional")})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── DEPARTMENT STEP ── */}
                  {currentStepKey === "department" &&
                    (matchLoading ? (
                      <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                        <div className="w-4 h-4 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
                        {t("incidents.loadingAssignmentOptions")}
                      </div>
                    ) : trans.assign_department_id ? (
                      <p className="text-sm text-[hsl(var(--foreground))]">
                        {t("incidents.willAssignTo")}{" "}
                        <span className="font-medium">
                          {trans.assign_department?.name ||
                            t("incidents.department")}
                        </span>
                      </p>
                    ) : departmentMatchResult ? (
                      departmentMatchResult.departments.length === 0 ? (
                        <p className="text-sm text-red-600 font-medium">
                          {t(
                            "incidents.noDepartmentAssigned",
                            "No department assigned - Contact administrator for this",
                          )}
                        </p>
                      ) : departmentMatchResult.single_match ? (
                        <p className="text-sm text-[hsl(var(--foreground))]">
                          {t("incidents.willAssignTo")}{" "}
                          <span className="font-medium">
                            {departmentMatchResult.departments[0]?.name}
                          </span>
                        </p>
                      ) : (
                        (() => {
                          const allDepts = departmentMatchResult.departments;
                          const deptIdSet = new Set(allDepts.map((d) => d.id));
                          const parentIds = new Set(
                            allDepts
                              .map((d) => d.parent_id)
                              .filter(
                                (pid): pid is string =>
                                  pid !== null && deptIdSet.has(pid),
                              ),
                          );
                          const isLeaf = (id: string) => !parentIds.has(id);
                          const childrenMap = new Map<
                            string | null,
                            Department[]
                          >();
                          allDepts.forEach((d) => {
                            const key =
                              d.parent_id && deptIdSet.has(d.parent_id)
                                ? d.parent_id
                                : null;
                            if (!childrenMap.has(key)) childrenMap.set(key, []);
                            childrenMap.get(key)!.push(d);
                          });
                          const searchActive =
                            deptSearchQuery.trim().length > 0;
                          const filteredFlat = searchActive
                            ? allDepts.filter((d) =>
                                d.name
                                  .toLowerCase()
                                  .includes(deptSearchQuery.toLowerCase()),
                              )
                            : [];
                          const toggleDept = (id: string) =>
                            setCollapsedDeptIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(id)) next.delete(id);
                              else next.add(id);
                              return next;
                            });
                          const renderDeptRow = (
                            dept: Department,
                            indent = 0,
                          ): React.ReactNode => {
                            const hasChildren = childrenMap.has(dept.id);
                            const isCollapsed = collapsedDeptIds.has(dept.id);
                            const isSelected = selectedDepartmentId === dept.id;
                            const isSelectableLeaf = isLeaf(dept.id);
                            return (
                              <React.Fragment key={dept.id}>
                                <div
                                  className={`flex items-center gap-1 px-3 py-2 transition-colors ${isSelectableLeaf ? "cursor-pointer hover:bg-[hsl(var(--muted)/0.5)]" : "cursor-default"} ${isSelected ? "bg-[hsl(var(--primary)/0.1)]" : ""}`}
                                  style={{
                                    paddingLeft: `${12 + indent * 16}px`,
                                  }}
                                  onClick={() => {
                                    if (!isSelectableLeaf) return;
                                    setSelectedDepartmentId(dept.id);
                                    if (transitionErrors.department)
                                      setTransitionErrors((prev) => ({
                                        ...prev,
                                        department: "",
                                      }));
                                  }}
                                >
                                  {hasChildren ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleDept(dept.id);
                                      }}
                                      className="p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                                    >
                                      <ChevronDown
                                        className={`w-3 h-3 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                                      />
                                    </button>
                                  ) : (
                                    <span className="w-4" />
                                  )}
                                  <span
                                    className={`text-sm flex-1 truncate ${isSelected ? "text-[hsl(var(--primary))] font-medium" : "text-[hsl(var(--foreground))]"} ${!isSelectableLeaf ? "opacity-60" : ""}`}
                                  >
                                    {dept.name}
                                  </span>
                                  {isSelected && (
                                    <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))] flex-shrink-0" />
                                  )}
                                </div>
                                {hasChildren &&
                                  !isCollapsed &&
                                  (childrenMap.get(dept.id) || []).map(
                                    (child) => renderDeptRow(child, indent + 1),
                                  )}
                              </React.Fragment>
                            );
                          };
                          return (
                            <>
                              <div className="relative mb-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                                <input
                                  type="text"
                                  value={deptSearchQuery}
                                  onChange={(e) =>
                                    setDeptSearchQuery(e.target.value)
                                  }
                                  placeholder={t("incidents.searchDepartments")}
                                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-md text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                                />
                              </div>
                              <div
                                className={`border rounded-md overflow-y-auto max-h-52 bg-[hsl(var(--background))] ${transitionErrors.department ? "border-red-500" : "border-[hsl(var(--border))]"}`}
                              >
                                {searchActive ? (
                                  filteredFlat.length === 0 ? (
                                    <p className="text-sm text-[hsl(var(--muted-foreground))] px-3 py-2">
                                      {t("common.noResults")}
                                    </p>
                                  ) : (
                                    filteredFlat
                                      .filter((d) => isLeaf(d.id))
                                      .map((dept) => {
                                        const isSel =
                                          selectedDepartmentId === dept.id;
                                        return (
                                          <div
                                            key={dept.id}
                                            className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[hsl(var(--muted)/0.5)] transition-colors ${isSel ? "bg-[hsl(var(--primary)/0.1)]" : ""}`}
                                            onClick={() => {
                                              setSelectedDepartmentId(dept.id);
                                              if (transitionErrors.department)
                                                setTransitionErrors((prev) => ({
                                                  ...prev,
                                                  department: "",
                                                }));
                                            }}
                                          >
                                            <span
                                              className={`text-sm flex-1 truncate ${isSel ? "text-[hsl(var(--primary))] font-medium" : "text-[hsl(var(--foreground))]"}`}
                                            >
                                              {dept.name}
                                            </span>
                                            {isSel && (
                                              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))] flex-shrink-0" />
                                            )}
                                          </div>
                                        );
                                      })
                                  )
                                ) : (
                                  (childrenMap.get(null) || []).map((dept) =>
                                    renderDeptRow(dept, 0),
                                  )
                                )}
                              </div>
                              {transitionErrors.department && (
                                <p className="text-xs text-red-500 mt-1">
                                  {transitionErrors.department}
                                </p>
                              )}
                            </>
                          );
                        })()
                      )
                    ) : (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {t("incidents.loadingDepartments")}
                      </p>
                    ))}

                  {/* ── USER STEP ── */}
                  {currentStepKey === "user" &&
                    (matchLoading ? (
                      <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                        <div className="w-4 h-4 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
                        {t("incidents.loadingAssignmentOptions")}
                      </div>
                    ) : trans.assign_user_id ? (
                      <p className="text-sm text-[hsl(var(--foreground))]">
                        {t("incidents.willAssignTo")}{" "}
                        <span className="font-medium">
                          {trans.assign_user?.first_name ||
                            trans.assign_user?.username ||
                            t("incidents.assignee")}
                        </span>
                      </p>
                    ) : trans.manual_select_user ? (
                      userMatchResult ? (
                        userMatchResult.users.length === 0 ? (
                          <>
                            <p className="text-sm text-amber-600">
                              {t("incidents.noUsersWithRole")}
                            </p>
                            {transitionErrors.user && (
                              <p className="text-xs text-red-500 mt-1">
                                {transitionErrors.user}
                              </p>
                            )}
                          </>
                        ) : userMatchResult.single_match ? (
                          <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.2)] rounded-md">
                            <User className="w-4 h-4 text-[hsl(var(--primary))]" />
                            <span className="text-sm text-[hsl(var(--foreground))] font-medium">
                              {userMatchResult.users[0].first_name
                                ? `${userMatchResult.users[0].first_name} ${userMatchResult.users[0].last_name || ""}`
                                : userMatchResult.users[0].username}
                            </span>
                            <span className="text-xs text-[hsl(var(--muted-foreground))] ml-auto">
                              {t("incidents.autoSelected")}
                            </span>
                          </div>
                        ) : (
                          (() => {
                            const allUsers = userMatchResult.users;
                            const assignmentRoles =
                              selectedTransition.transition.assignment_roles ??
                              [];
                            const searchActive =
                              userSearchQuery.trim().length > 0;
                            const filteredUsers = searchActive
                              ? allUsers.filter((u) =>
                                  `${u.first_name || ""} ${u.last_name || ""} ${u.username} ${u.email}`
                                    .toLowerCase()
                                    .includes(userSearchQuery.toLowerCase()),
                                )
                              : allUsers;
                            const roleGroups: Array<{
                              role: (typeof assignmentRoles)[0];
                              users: typeof allUsers;
                            }> = assignmentRoles.map((role) => ({
                              role,
                              users: allUsers.filter((u) =>
                                u.roles?.some((r) => r.id === role.id),
                              ),
                            }));
                            const allGroupKeys = roleGroups.map(
                              (g) => g.role.id,
                            );
                            const allCollapsed =
                              allGroupKeys.length > 0 &&
                              allGroupKeys.every((k) =>
                                collapsedUserGroups.has(k),
                              );
                            const allUsersSelected =
                              allUsers.length > 0 &&
                              allUsers.every((u) =>
                                selectedUserIds.includes(u.id),
                              );
                            const someSelected = selectedUserIds.length > 0;
                            const allFilteredSelected =
                              filteredUsers.length > 0 &&
                              filteredUsers.every((u) =>
                                selectedUserIds.includes(u.id),
                              );
                            const someFilteredSelected = filteredUsers.some(
                              (u) => selectedUserIds.includes(u.id),
                            );
                            const toggleSelectUser = (
                              userId: string,
                              isChecked: boolean,
                            ) => {
                              setSelectedUserIds((prev) =>
                                isChecked
                                  ? prev.filter((id) => id !== userId)
                                  : [...prev, userId],
                              );
                              if (transitionErrors.user)
                                setTransitionErrors((prev) => ({
                                  ...prev,
                                  user: "",
                                }));
                            };
                            const renderUserRow = (
                              user: UserType,
                              indent = false,
                            ) => {
                              const isChecked = selectedUserIds.includes(
                                user.id,
                              );
                              return (
                                <label
                                  key={user.id}
                                  className={`flex items-center gap-2 py-2 pr-3 cursor-pointer hover:bg-[hsl(var(--muted)/0.5)] select-none border-b border-[hsl(var(--border))] last:border-0 ${isChecked ? "bg-[hsl(var(--primary)/0.04)]" : ""}`}
                                  style={{
                                    paddingLeft: indent ? "28px" : "12px",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() =>
                                      toggleSelectUser(user.id, isChecked)
                                    }
                                    className="rounded flex-shrink-0"
                                  />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-sm text-[hsl(var(--foreground))] font-medium truncate">
                                      {user.first_name
                                        ? `${user.first_name} ${user.last_name || ""}`.trim()
                                        : user.username}
                                    </span>
                                    <span className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                                      {user.email}
                                    </span>
                                  </div>
                                </label>
                              );
                            };
                            return (
                              <>
                                {selectedUserIds.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {selectedUserIds.map((uid) => {
                                      const u = allUsers.find(
                                        (x) => x.id === uid,
                                      );
                                      if (!u) return null;
                                      return (
                                        <span
                                          key={uid}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]"
                                        >
                                          {u.first_name
                                            ? `${u.first_name} ${u.last_name || ""}`.trim()
                                            : u.username}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setSelectedUserIds((prev) =>
                                                prev.filter((x) => x !== uid),
                                              )
                                            }
                                            className="hover:text-red-500 leading-none"
                                          >
                                            ×
                                          </button>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                                    <input
                                      type="text"
                                      value={userSearchQuery}
                                      onChange={(e) =>
                                        setUserSearchQuery(e.target.value)
                                      }
                                      placeholder={t("incidents.searchUsers")}
                                      className="w-full pl-8 pr-3 py-1.5 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-md text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                                    />
                                  </div>
                                  {!searchActive && roleGroups.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCollapsedUserGroups(
                                          allCollapsed
                                            ? new Set()
                                            : new Set(allGroupKeys),
                                        )
                                      }
                                      className="flex-shrink-0 text-xs text-[hsl(var(--primary))] hover:underline whitespace-nowrap"
                                    >
                                      {allCollapsed
                                        ? t("common.expandAll")
                                        : t("common.collapseAll")}
                                    </button>
                                  )}
                                </div>
                                <div
                                  className={`border rounded-md overflow-y-auto max-h-52 bg-[hsl(var(--background))] ${transitionErrors.user ? "border-red-500" : "border-[hsl(var(--border))]"}`}
                                >
                                  <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] select-none sticky top-0 bg-[hsl(var(--background))] z-10">
                                    <input
                                      type="checkbox"
                                      checked={
                                        searchActive
                                          ? allFilteredSelected
                                          : allUsersSelected
                                      }
                                      ref={(el) => {
                                        if (el)
                                          el.indeterminate = searchActive
                                            ? !allFilteredSelected &&
                                              someFilteredSelected
                                            : !allUsersSelected && someSelected;
                                      }}
                                      onChange={() => {
                                        const targets = searchActive
                                          ? filteredUsers
                                          : allUsers;
                                        const allSel = targets.every((u) =>
                                          selectedUserIds.includes(u.id),
                                        );
                                        if (allSel) {
                                          setSelectedUserIds((prev) =>
                                            prev.filter(
                                              (sid) =>
                                                !targets.some(
                                                  (u) => u.id === sid,
                                                ),
                                            ),
                                          );
                                        } else {
                                          setSelectedUserIds((prev) => [
                                            ...prev,
                                            ...targets
                                              .filter(
                                                (u) => !prev.includes(u.id),
                                              )
                                              .map((u) => u.id),
                                          ]);
                                        }
                                        if (transitionErrors.user)
                                          setTransitionErrors((prev) => ({
                                            ...prev,
                                            user: "",
                                          }));
                                      }}
                                      className="rounded"
                                    />
                                    <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                                      {searchActive
                                        ? t("common.selectAllFiltered")
                                        : t("common.selectAll")}
                                    </span>
                                    <span className="ml-auto text-xs text-[hsl(var(--muted-foreground))]">
                                      {selectedUserIds.length}/{allUsers.length}{" "}
                                      {t("common.selected")}
                                    </span>
                                  </label>
                                  {searchActive ? (
                                    filteredUsers.length === 0 ? (
                                      <p className="px-3 py-3 text-sm text-[hsl(var(--muted-foreground))] text-center">
                                        {t("common.noResults")}
                                      </p>
                                    ) : (
                                      filteredUsers.map((u) =>
                                        renderUserRow(u, false),
                                      )
                                    )
                                  ) : (
                                    roleGroups.map(({ role, users }) => {
                                      const isCollapsed =
                                        collapsedUserGroups.has(role.id);
                                      const groupAllSelected =
                                        users.length > 0 &&
                                        users.every((u) =>
                                          selectedUserIds.includes(u.id),
                                        );
                                      const groupSomeSelected = users.some(
                                        (u) => selectedUserIds.includes(u.id),
                                      );
                                      return (
                                        <React.Fragment key={role.id}>
                                          <div className="flex items-center border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setCollapsedUserGroups(
                                                  (prev) => {
                                                    const next = new Set(prev);
                                                    if (next.has(role.id))
                                                      next.delete(role.id);
                                                    else next.add(role.id);
                                                    return next;
                                                  },
                                                )
                                              }
                                              className="flex items-center gap-1.5 px-3 py-1.5 flex-1 hover:bg-[hsl(var(--muted)/0.5)] transition-colors min-w-0"
                                            >
                                              {isCollapsed ? (
                                                <ChevronRight className="w-3 h-3 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
                                              ) : (
                                                <ChevronDown className="w-3 h-3 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
                                              )}
                                              <span className="text-xs font-semibold text-[hsl(var(--foreground))] truncate">
                                                {role.name}
                                              </span>
                                              <span className="text-xs text-[hsl(var(--muted-foreground))] ml-1 flex-shrink-0">
                                                ({users.length})
                                              </span>
                                            </button>
                                            <label className="flex items-center pr-3 cursor-pointer select-none flex-shrink-0">
                                              <input
                                                type="checkbox"
                                                checked={groupAllSelected}
                                                disabled={users.length === 0}
                                                ref={(el) => {
                                                  if (el)
                                                    el.indeterminate =
                                                      !groupAllSelected &&
                                                      groupSomeSelected;
                                                }}
                                                onChange={() => {
                                                  if (groupAllSelected) {
                                                    setSelectedUserIds((prev) =>
                                                      prev.filter(
                                                        (sid) =>
                                                          !users.some(
                                                            (u) => u.id === sid,
                                                          ),
                                                      ),
                                                    );
                                                  } else {
                                                    setSelectedUserIds(
                                                      (prev) => [
                                                        ...prev,
                                                        ...users
                                                          .filter(
                                                            (u) =>
                                                              !prev.includes(
                                                                u.id,
                                                              ),
                                                          )
                                                          .map((u) => u.id),
                                                      ],
                                                    );
                                                  }
                                                  if (transitionErrors.user)
                                                    setTransitionErrors(
                                                      (prev) => ({
                                                        ...prev,
                                                        user: "",
                                                      }),
                                                    );
                                                }}
                                                className="rounded"
                                              />
                                            </label>
                                          </div>
                                          {!isCollapsed &&
                                            (users.length === 0 ? (
                                              <p className="px-6 py-2 text-xs text-[hsl(var(--muted-foreground))]">
                                                {t("incidents.noUsersWithRole")}
                                              </p>
                                            ) : (
                                              users.map((u) =>
                                                renderUserRow(u, true),
                                              )
                                            ))}
                                        </React.Fragment>
                                      );
                                    })
                                  )}
                                </div>
                                {transitionErrors.user && (
                                  <p className="text-xs text-red-500 mt-1">
                                    {transitionErrors.user}
                                  </p>
                                )}
                              </>
                            );
                          })()
                        )
                      ) : (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {t("incidents.loadingUsers")}
                        </p>
                      )
                    ) : trans.auto_match_user ? (
                      userMatchResult ? (
                        userMatchResult.users.length === 0 ? (
                          <p className="text-sm text-amber-600">
                            {t("incidents.noMatchingUsers")}
                          </p>
                        ) : (
                          <div>
                            <p className="text-sm text-[hsl(var(--foreground))] mb-2">
                              {t("incidents.willAssignToUsers", {
                                count: userMatchResult.users.length,
                              })}
                            </p>
                            <div className="border border-[hsl(var(--border))] rounded-md overflow-y-auto max-h-40 divide-y divide-[hsl(var(--border))]">
                              {userMatchResult.users.map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center gap-2 px-3 py-2"
                                >
                                  <User className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-sm text-[hsl(var(--foreground))] font-medium truncate">
                                      {user.first_name
                                        ? `${user.first_name} ${user.last_name || ""}`.trim()
                                        : user.username}
                                    </span>
                                    <span className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                                      {user.email}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      ) : (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {t("incidents.autoAssignRoleCriteria")}
                        </p>
                      )
                    ) : (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {t("incidents.noAssignmentConfigured")}
                      </p>
                    ))}

                  {/* ── ATTACHMENT STEP ── */}
                  {currentStepKey === "attachment" && (
                    <div>
                      {transitionAttachment ? (
                        <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary rounded-lg">
                          <div className="flex items-center gap-2">
                            <Paperclip className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                            <span className="text-sm text-[hsl(var(--foreground))] truncate max-w-[200px]">
                              {transitionAttachment.name}
                            </span>
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">
                              ({(transitionAttachment.size / 1024).toFixed(1)}{" "}
                              {t("common.kb")})
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
                        <label
                          className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--muted)/0.3)] transition-colors ${transitionErrors.attachment ? "border-red-500" : "border-[hsl(var(--border))]"}`}
                        >
                          <Upload className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                          <span className="text-sm text-[hsl(var(--muted-foreground))]">
                            {t("incidents.clickToUpload")}
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setTransitionAttachment(file);
                                if (transitionErrors.attachment)
                                  setTransitionErrors((prev) => ({
                                    ...prev,
                                    attachment: "",
                                  }));
                              }
                            }}
                          />
                        </label>
                      )}
                      {transitionErrors.attachment && (
                        <p className="text-xs text-red-500 mt-1">
                          {transitionErrors.attachment}
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── FEEDBACK STEP ── */}
                  {currentStepKey === "feedback" && (
                    <div>
                      <div className="p-2 bg-[hsl(var(--muted)/0.5)] rounded-lg space-y-3">
                        <div className="space-y-3">
                          {feedbackTemplates?.length ? (
                            <select
                              value={
                                feedbackTemplates.some(
                                  (tpl: any) =>
                                    tpl.feedback_text ===
                                    transitionFeedbackComment,
                                )
                                  ? transitionFeedbackComment
                                  : ""
                              }
                              onChange={(e) => {
                                setTransitionFeedbackComment(e.target.value);
                                if (transitionErrors.feedback) {
                                  setTransitionErrors((prev) => ({
                                    ...prev,
                                    feedback: "",
                                  }));
                                }
                              }}
                              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                            >
                              <option value="">
                                {t("common.selectFeedback")}
                              </option>
                              {feedbackTemplates.map((tpl: any) => (
                                <option key={tpl.id} value={tpl.feedback_text}>
                                  {tpl.feedback_text}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <textarea
                              value={transitionFeedbackComment}
                              onChange={(e) => {
                                setTransitionFeedbackComment(e.target.value);
                                if (transitionErrors.feedback) {
                                  setTransitionErrors((prev) => ({
                                    ...prev,
                                    feedback: "",
                                  }));
                                }
                              }}
                              placeholder={t(
                                "incidents.feedbackCommentPlaceholder",
                              )}
                              rows={3}
                              className={`w-full px-3 py-2 bg-[hsl(var(--background))] border rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] resize-none ${
                                transitionErrors.feedback
                                  ? "border-red-500"
                                  : "border-[hsl(var(--border))]"
                              }`}
                            />
                          )}
                          {transitionErrors.feedback && (
                            <p className="text-xs text-red-500 ">
                              {transitionErrors.feedback}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── FIELD CHANGES STEP ── */}
                  {currentStepKey === "field_changes" &&
                    trans.field_changes &&
                    trans.field_changes.length > 0 && (
                      <div className="space-y-3">
                        {trans.field_changes!.map((fc) => (
                          <div key={fc.id}>
                            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                              {fc.label || fc.field_name}
                              {fc.is_required && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </label>
                            {fc.field_name === "priority" && (
                              <>
                                <select
                                  value={
                                    transitionFieldValues[fc.field_name] || ""
                                  }
                                  onChange={(e) => {
                                    setTransitionFieldValues((prev) => ({
                                      ...prev,
                                      [fc.field_name]: e.target.value,
                                    }));
                                    if (transitionErrors[fc.field_name])
                                      setTransitionErrors((prev) => ({
                                        ...prev,
                                        [fc.field_name]: "",
                                      }));
                                  }}
                                  className={`w-full px-3 py-2 text-sm bg-[hsl(var(--background))] border rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] ${transitionErrors[fc.field_name] ? "border-red-500" : "border-[hsl(var(--border))]"}`}
                                >
                                  <option value="">
                                    {t("incidents.selectPriority")}
                                  </option>
                                  <option value="1">
                                    {t("priorities.low")}
                                  </option>
                                  <option value="2">
                                    {t("priorities.medium")}
                                  </option>
                                  <option value="3">
                                    {t("priorities.high")}
                                  </option>
                                  <option value="4">
                                    {t("priorities.urgent")}
                                  </option>
                                  <option value="5">
                                    {t("priorities.critical")}
                                  </option>
                                </select>
                                {transitionErrors[fc.field_name] && (
                                  <p className="text-xs text-red-500 mt-1">
                                    {transitionErrors[fc.field_name]}
                                  </p>
                                )}
                              </>
                            )}
                            {fc.field_name === "department_id" && (
                              <TreeSelect
                                data={(() => {
                                  const allDepts =
                                    (fcDepartmentsData?.data as unknown as Department[]) ||
                                    [];
                                  const filtered = fc.department_type_filter
                                    ? filterDeptTree(
                                        allDepts,
                                        fc.department_type_filter,
                                      )
                                    : allDepts;
                                  return filtered as unknown as TreeSelectNode[];
                                })()}
                                value={
                                  transitionFieldValues[fc.field_name] || ""
                                }
                                onChange={(id) => {
                                  setTransitionFieldValues((prev) => ({
                                    ...prev,
                                    [fc.field_name]: id,
                                  }));
                                  if (transitionErrors[fc.field_name])
                                    setTransitionErrors((prev) => ({
                                      ...prev,
                                      [fc.field_name]: "",
                                    }));
                                }}
                                placeholder={t(
                                  "incidents.selectDepartmentPlaceholder",
                                  {
                                    type: fc.department_type_filter || "",
                                  },
                                )}
                                leafOnly={false}
                                error={transitionErrors[fc.field_name]}
                                maxHeight="240px"
                              />
                            )}
                            {fc.field_name === "location_id" && (
                              <TreeSelect
                                data={
                                  (fcLocationsData?.data as unknown as TreeSelectNode[]) ||
                                  []
                                }
                                value={
                                  transitionFieldValues[fc.field_name] || ""
                                }
                                onChange={(id) => {
                                  setTransitionFieldValues((prev) => ({
                                    ...prev,
                                    [fc.field_name]: id,
                                  }));
                                  if (transitionErrors[fc.field_name])
                                    setTransitionErrors((prev) => ({
                                      ...prev,
                                      [fc.field_name]: "",
                                    }));
                                }}
                                placeholder={t("incidents.selectLocation")}
                                leafOnly={false}
                                maxHeight="240px"
                                error={transitionErrors[fc.field_name]}
                              />
                            )}
                            {fc.field_name === "classification_id" && (
                              <TreeSelect
                                data={
                                  (fcClassificationsData?.data as unknown as TreeSelectNode[]) ||
                                  []
                                }
                                value={
                                  transitionFieldValues[fc.field_name] || ""
                                }
                                onChange={(id) => {
                                  setTransitionFieldValues((prev) => ({
                                    ...prev,
                                    [fc.field_name]: id,
                                  }));
                                  if (transitionErrors[fc.field_name])
                                    setTransitionErrors((prev) => ({
                                      ...prev,
                                      [fc.field_name]: "",
                                    }));
                                }}
                                placeholder={t(
                                  "incidents.selectClassification",
                                )}
                                leafOnly={false}
                                maxHeight="240px"
                                error={transitionErrors[fc.field_name]}
                              />
                            )}
                            {fc.field_name === "title" && (
                              <>
                                <input
                                  type="text"
                                  value={
                                    transitionFieldValues[fc.field_name] || ""
                                  }
                                  onChange={(e) => {
                                    setTransitionFieldValues((prev) => ({
                                      ...prev,
                                      [fc.field_name]: e.target.value,
                                    }));
                                    if (transitionErrors[fc.field_name])
                                      setTransitionErrors((prev) => ({
                                        ...prev,
                                        [fc.field_name]: "",
                                      }));
                                  }}
                                  placeholder={t("incidents.enterTitle")}
                                  className={`w-full px-3 py-2 text-sm bg-[hsl(var(--background))] border rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] ${transitionErrors[fc.field_name] ? "border-red-500" : "border-[hsl(var(--border))]"}`}
                                />
                                {transitionErrors[fc.field_name] && (
                                  <p className="text-xs text-red-500 mt-1">
                                    {transitionErrors[fc.field_name]}
                                  </p>
                                )}
                              </>
                            )}
                            {fc.field_name === "description" && (
                              <>
                                <textarea
                                  value={
                                    transitionFieldValues[fc.field_name] || ""
                                  }
                                  onChange={(e) => {
                                    setTransitionFieldValues((prev) => ({
                                      ...prev,
                                      [fc.field_name]: e.target.value,
                                    }));
                                    if (transitionErrors[fc.field_name])
                                      setTransitionErrors((prev) => ({
                                        ...prev,
                                        [fc.field_name]: "",
                                      }));
                                  }}
                                  placeholder={t("incidents.enterDescription")}
                                  rows={3}
                                  className={`w-full px-3 py-2 text-sm bg-[hsl(var(--background))] border rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] resize-none ${transitionErrors[fc.field_name] ? "border-red-500" : "border-[hsl(var(--border))]"}`}
                                />
                                {transitionErrors[fc.field_name] && (
                                  <p className="text-xs text-red-500 mt-1">
                                    {transitionErrors[fc.field_name]}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  {/* ── COMMENT STEP ── */}
                  {currentStepKey === "comment" && (
                    <>
                      {!!commentTemplates?.length && (
                        <div className="mb-3">
                          <select
                            value={transitionComment}
                            onChange={(e) => {
                              setTransitionComment(e.target.value);
                              if (transitionErrors.comment)
                                setTransitionErrors((prev) => ({
                                  ...prev,
                                  comment: "",
                                }));
                            }}
                            className="w-full px-4 py-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                          >
                            <option value="">
                              {t("common.selectComment")}
                            </option>
                            {commentTemplates.map((tpl: any) => (
                              <option key={tpl.id} value={tpl.comment_text}>
                                {tpl.comment_text}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <textarea
                        value={transitionComment}
                        onChange={(e) => {
                          setTransitionComment(e.target.value);
                          if (transitionErrors.comment)
                            setTransitionErrors((prev) => ({
                              ...prev,
                              comment: "",
                            }));
                        }}
                        placeholder={t("incidents.addCommentForTransition")}
                        rows={3}
                        className={`w-full px-4 py-3 bg-[hsl(var(--background))] border rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] resize-none ${
                          transitionErrors.comment
                            ? "border-red-500"
                            : "border-[hsl(var(--border))]"
                        }`}
                      />

                      {transitionErrors.comment && (
                        <p className="text-xs text-red-500">
                          {transitionErrors.comment}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Wizard footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="ghost" onClick={closeTransitionModal}>
                    {t("incidents.cancel")}
                  </Button>
                  <div className="flex gap-2">
                    {transitionStep > 0 && (
                      <Button variant="outline" onClick={handleStepBack}>
                        {t("common.back")}
                      </Button>
                    )}
                    <Button
                      onClick={handleStepNext}
                      isLoading={
                        isLastStep &&
                        (transitionMutation.isPending || transitionUploading)
                      }
                      leftIcon={
                        isLastStep &&
                        !(
                          transitionMutation.isPending || transitionUploading
                        ) ? (
                          <Play className="w-4 h-4" />
                        ) : undefined
                      }
                    >
                      {isLastStep
                        ? transitionUploading
                          ? t("incidents.uploading")
                          : t("incidents.execute")
                        : t("common.next")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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
            href={getAuthenticatedAttachmentUrl(
              imageAttachments[lightboxIndex]?.id,
            )}
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
                  setLightboxIndex((prev) =>
                    prev > 0 ? prev - 1 : imageAttachments.length - 1,
                  );
                }}
                className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <ChevronRight className="w-6 h-6 rotate-180" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) =>
                    prev < imageAttachments.length - 1 ? prev + 1 : 0,
                  );
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
            src={getAuthenticatedAttachmentUrl(
              imageAttachments[lightboxIndex]?.id,
            )}
            alt={imageAttachments[lightboxIndex]?.file_name}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
