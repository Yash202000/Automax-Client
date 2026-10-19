import { Fragment, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Play,
  Search,
  Star,
  Upload,
  User,
  X,
} from "lucide-react";
import { cn, getLocalizedName } from "@/lib/utils";
import {
  classificationApi,
  commentTemplateApi,
  departmentApi,
  feedbackTemplateApi,
  incidentApi,
  locationApi,
  lookupApi,
  userApi,
} from "../../api/admin";
import { TreeSelect } from "../ui/TreeSelect";
import type { TreeSelectNode } from "../../utils/treeUtils";
import { IncidentMentionTextarea } from "../common/IncidentMentionTextarea";
import { RejectedAttachmentsList } from "./RejectedAttachmentsList";
import { useImageValidation } from "../../hooks/useImageValidation";
import { capFilesByCount } from "../../utils/attachmentLimits";
import type {
  AvailableTransition,
  Department,
  DepartmentMatchResponse,
  Incident,
  User as UserType,
  UserMatchResponse,
} from "../../types";

export interface IncidentTransitionDialogProps {
  incident: Incident;
  transition: AvailableTransition | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Drops external-type departments not in the incident's MOMRA EEList;
// internal departments and non-restricted cases pass through unchanged.
function isDepartmentMomraAllowed(
  dept: Pick<Department, "type" | "code" | "name" | "name_ar">,
  allowed: { codes: Set<string>; names: Set<string> } | null,
): boolean {
  if (dept.type !== "external" || !allowed) return true;
  const code = dept.code?.trim().toLowerCase();
  const name = dept.name?.trim().toLowerCase();
  const nameAr = dept.name_ar?.trim().toLowerCase();
  return (
    (!!code && allowed.codes.has(code)) ||
    (!!name && allowed.names.has(name)) ||
    (!!nameAr && allowed.names.has(nameAr))
  );
}

function filterDeptTreeForMomraEE(
  nodes: Department[],
  allowed: { codes: Set<string>; names: Set<string> } | null,
): Department[] {
  if (!allowed) return nodes;
  return nodes
    .map((node) => ({
      ...node,
      children: node.children
        ? filterDeptTreeForMomraEE(node.children, allowed)
        : [],
    }))
    .filter(
      (node) =>
        (node.children && node.children.length > 0) ||
        isDepartmentMomraAllowed(node, allowed),
    );
}

function filterDeptTree(nodes: Department[], type: string): Department[] {
  return nodes
    .map((node) => ({
      ...node,
      children: node.children ? filterDeptTree(node.children, type) : [],
    }))
    .filter(
      (node) =>
        node.type === type || (node.children && node.children.length > 0),
    );
}

/**
 * Shared incident-transition wizard. Same steps, validation, API calls and
 * toasts as the transition flow on IncidentDetailPage — only the caller
 * (old details page vs. the new /incidents/list workspace) differs.
 */
export function IncidentTransitionDialog({
  incident,
  transition: selectedTransition,
  isOpen,
  onClose,
  onSuccess,
}: IncidentTransitionDialogProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const [transitionStep, setTransitionStep] = useState(0);
  const [transitionComment, setTransitionComment] = useState("");
  const [transitionAttachment, setTransitionAttachment] = useState<File[]>([]);
  const [transitionUploading, setTransitionUploading] = useState(false);
  const transitionImageValidation = useImageValidation();
  const validatingTransitionAttachments =
    transitionImageValidation.isValidating;
  const [transitionFeedbackComment, setTransitionFeedbackComment] =
    useState("");
  const [transitionFieldValues, setTransitionFieldValues] = useState<
    Record<string, string>
  >({});
  const [transitionErrors, setTransitionErrors] = useState<
    Record<string, string>
  >({});
  const [readyToCloseDuration, setReadyToCloseDuration] = useState<string>("");
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
  const [feedbackRating, setFeedbackRating] = useState<number>(5);

  const trans = selectedTransition?.transition;

  /* lookups for attachment limits */
  const { data: lookupCategoriesData } = useQuery({
    queryKey: ["admin", "lookups", "categories"],
    queryFn: () => lookupApi.listCategories(),
    enabled: isOpen,
  });
  const lookupCategories = useMemo(
    () => lookupCategoriesData?.data || [],
    [lookupCategoriesData?.data],
  );
  const envConfigCategory = useMemo(
    () => lookupCategories.find((cat) => cat.code === "ENV_CONFIGURATION"),
    [lookupCategories],
  );
  const MAX_TRANSITION_ATTACHMENTS = Number(
    envConfigCategory?.values?.find(
      (v) => v.code === "INTERNAL_ATTACHMENT_LIMIT",
    )?.name ?? "5",
  );
  const MAX_TRANSITION_ATTACHMENT_SIZE_MB = Number(
    envConfigCategory?.values?.find(
      (v) => v.code === "INTERNAL_ATTACHMENT_SIZE_LIMIT",
    )?.name ?? "5",
  );

  /* comment + feedback templates for this transition */
  const { data: commentTemplatesData } = useQuery({
    queryKey: ["comment-templates", trans?.id],
    queryFn: () => commentTemplateApi.listByTransition(trans!.id),
    enabled: isOpen && !!trans?.id,
  });
  const { data: feedbackTemplatesData } = useQuery({
    queryKey: ["feedback-templates", trans?.id],
    queryFn: () => feedbackTemplateApi.listByTransition(trans!.id),
    enabled: isOpen && !!trans?.id,
  });
  const commentTemplates = (commentTemplatesData?.data || []) as Array<{
    id: string;
    comment_text?: string;
  }>;
  const feedbackTemplates = (feedbackTemplatesData?.data || []) as Array<{
    id: string;
    feedback_text?: string;
  }>;

  /* duration options for partial-close transitions */
  const isPartialCloseTransition = trans?.to_state?.is_partial_close === true;
  const { data: rtcDurationOptionsData } = useQuery({
    queryKey: ["incidents", "ready-to-close", "duration-options"],
    queryFn: () => incidentApi.getReadyToCloseDurationOptions(),
    enabled: isOpen && isPartialCloseTransition,
    staleTime: 5 * 60 * 1000,
  });
  const readyToCloseDurationOptions: string[] = isPartialCloseTransition
    ? trans?.to_state?.duration_options?.length
      ? trans.to_state.duration_options
      : (rtcDurationOptionsData?.data ?? [])
    : [];

  /* trees for field-change selectors */
  const { data: fcDepartmentsData } = useQuery({
    queryKey: ["admin", "departments", "tree"],
    queryFn: () => departmentApi.getTree(),
    enabled: isOpen,
  });
  const { data: fcLocationsData } = useQuery({
    queryKey: ["admin", "locations", "tree"],
    queryFn: () => locationApi.getTree(),
    enabled: isOpen,
  });
  const { data: fcClassificationsData } = useQuery({
    queryKey: ["admin", "classifications", "tree"],
    queryFn: () => classificationApi.getTree(),
    enabled: isOpen,
  });

  /* MOMRA EEList restriction (same as the details page) */
  const momraAllowedEEList = useMemo((): {
    codes: Set<string>;
    names: Set<string>;
  } | null => {
    if (incident?.source !== "MOMRA" || !incident?.available_ee_list)
      return null;
    const codes = new Set<string>();
    const names = new Set<string>();
    for (const entry of incident.available_ee_list) {
      const code = String(entry?.EntityID || entry?.EECode || "")
        .trim()
        .toLowerCase();
      if (code) codes.add(code);
      const name = String(entry?.EEName || "")
        .trim()
        .toLowerCase();
      if (name) names.add(name);
    }
    return { codes, names };
  }, [incident?.source, incident?.available_ee_list]);

  /* assignment matches (fetched on open, like handleTransitionClick) */
  const needsDeptMatch =
    !!trans?.auto_detect_department && !trans?.assign_department_id;
  const needsUserMatch =
    (!!trans?.auto_match_user || !!trans?.manual_select_user) &&
    !!trans?.assignment_roles?.length &&
    !trans?.assign_user_id;
  const { data: deptMatchRaw, isLoading: deptMatchLoading } = useQuery({
    queryKey: ["incident-transition", "dept-match", incident.id, trans?.id],
    queryFn: async (): Promise<DepartmentMatchResponse | null> => {
      const res = await departmentApi.match({
        classification_id: incident.classification?.id,
        location_id: incident.location?.id,
        incident_id: incident.id,
        ...(trans?.department_type_filter
          ? {
              department_type: trans.department_type_filter as
                | "internal"
                | "external",
            }
          : {}),
      });
      return res.success && res.data ? res.data : null;
    },
    enabled: isOpen && !!trans && needsDeptMatch,
    staleTime: 60_000,
  });
  const { data: userMatchRaw, isLoading: userMatchLoading } = useQuery({
    queryKey: ["incident-transition", "user-match", incident.id, trans?.id],
    queryFn: async (): Promise<UserMatchResponse | null> => {
      const res = await userApi.match({
        role_ids: trans?.assignment_roles?.map((r) => r.id),
        classification_id: incident.classification?.id,
        location_id: incident.location?.id,
        department_id: incident.department?.id,
      });
      return res.success && res.data ? res.data : null;
    },
    enabled: isOpen && !!trans && needsUserMatch,
    staleTime: 60_000,
  });
  const matchLoading =
    (needsDeptMatch && deptMatchLoading) ||
    (needsUserMatch && userMatchLoading);

  const momraFilteredDepartmentMatch =
    useMemo((): DepartmentMatchResponse | null => {
      if (!deptMatchRaw) return null;
      if (!momraAllowedEEList) return deptMatchRaw;
      const filtered = deptMatchRaw.departments.filter((d) =>
        isDepartmentMomraAllowed(d, momraAllowedEEList),
      );
      return {
        departments: filtered,
        single_match: filtered.length === 1,
        matched_department_id:
          filtered.length === 1 ? filtered[0].id : undefined,
      };
    }, [deptMatchRaw, momraAllowedEEList]);

  const userMatchResult: UserMatchResponse | null = userMatchRaw ?? null;

  /* effective (auto-selected-aware) assignment values */
  const effectiveDepartmentId =
    selectedDepartmentId ||
    (momraFilteredDepartmentMatch?.single_match
      ? (momraFilteredDepartmentMatch.matched_department_id ?? "")
      : "");
  const effectiveUserIds =
    selectedUserIds.length > 0
      ? selectedUserIds
      : userMatchResult?.single_match && userMatchResult.matched_user_id
        ? [userMatchResult.matched_user_id]
        : [];

  /* ordered steps from the transition config (same as the details page) */
  const transitionSteps = useMemo((): Array<
    | "department"
    | "user"
    | "field_changes"
    | "duration"
    | "attachment"
    | "feedback"
    | "comment"
  > => {
    if (!selectedTransition) return [];
    const tr = selectedTransition.transition;
    const steps: Array<
      | "department"
      | "user"
      | "field_changes"
      | "duration"
      | "attachment"
      | "feedback"
      | "comment"
    > = [];
    if (tr.assign_department_id || tr.auto_detect_department)
      steps.push("department");
    if (
      tr.assign_user_id ||
      ((tr.auto_match_user || tr.manual_select_user) &&
        tr.assignment_roles &&
        tr.assignment_roles.length > 0 &&
        tr.view_assigne_user_list)
    )
      steps.push("user");
    if (tr.field_changes && tr.field_changes.length > 0)
      steps.push("field_changes");
    if (tr.to_state?.is_partial_close) steps.push("duration");
    if (
      selectedTransition.requirements?.some(
        (r) => r.requirement_type === "comment",
      )
    )
      steps.push("comment");
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
    return steps;
  }, [selectedTransition]);

  const transitionAttachmentAllowsMultiple =
    selectedTransition?.requirements?.some(
      (r) => r.requirement_type === "attachment" && r.is_multiple,
    ) ?? false;

  const isTransitionAttachmentOversized = (file: File) =>
    file.size > MAX_TRANSITION_ATTACHMENT_SIZE_MB * 1024 * 1024;

  const transitionAttachmentLimitReached =
    transitionAttachment.length >= MAX_TRANSITION_ATTACHMENTS;

  const validateTransitionAttachments = (files: File[]): string => {
    if (files.length > MAX_TRANSITION_ATTACHMENTS) {
      return t("incidents.attachmentLimitExceeded", {
        max: MAX_TRANSITION_ATTACHMENTS,
        defaultValue: `Maximum ${MAX_TRANSITION_ATTACHMENTS} attachments allowed`,
      });
    }
    const oversized = files.find(isTransitionAttachmentOversized);
    if (oversized) {
      return t("incidents.attachmentTooLarge", {
        name: oversized.name,
        max: MAX_TRANSITION_ATTACHMENT_SIZE_MB,
        defaultValue: `${oversized.name} exceeds the maximum size of ${MAX_TRANSITION_ATTACHMENT_SIZE_MB}MB`,
      });
    }
    return "";
  };

  const addTransitionAttachmentFiles = async (
    newFiles: File[],
    replace = false,
  ) => {
    const base = replace ? [] : transitionAttachment;
    const { accepted, skippedForLimit } = capFilesByCount(
      replace ? newFiles.slice(0, 1) : newFiles,
      base.length,
      MAX_TRANSITION_ATTACHMENTS,
    );
    const { valid } = await transitionImageValidation.validate(accepted);
    const next = [...base, ...valid];
    setTransitionAttachment(next);
    setTransitionErrors((prev) => ({
      ...prev,
      attachment:
        skippedForLimit > 0
          ? t("incidents.attachmentLimitExceeded", {
              max: MAX_TRANSITION_ATTACHMENTS,
              defaultValue: `Maximum ${MAX_TRANSITION_ATTACHMENTS} attachments allowed`,
            })
          : validateTransitionAttachments(next),
    }));
  };

  const resetAndClose = () => {
    setTransitionStep(0);
    setTransitionComment("");
    setTransitionAttachment([]);
    transitionImageValidation.clearRejected();
    setTransitionFeedbackComment("");
    setTransitionFieldValues({});
    setTransitionErrors({});
    setReadyToCloseDuration("");
    setSelectedDepartmentId("");
    setSelectedUserIds([]);
    setUserSearchQuery("");
    setDeptSearchQuery("");
    setCollapsedDeptIds(new Set());
    setCollapsedUserGroups(new Set());
    setFeedbackRating(5);
    onClose();
  };

  /* close if someone else moved the incident meanwhile (same as details page) */
  useEffect(() => {
    if (
      isOpen &&
      incident?.current_state?.id &&
      selectedTransition &&
      incident.current_state.id !== selectedTransition.transition.from_state_id
    ) {
      resetAndClose();
      toast.info(t("incidents.incidentUpdated", "Incident Updated"), {
        description: t(
          "incidents.incidentUpdatedDescription",
          "This incident was updated by another user. Please review the changes.",
        ),
        duration: 5000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident?.current_state?.id, incident?.version, isOpen]);

  const transitionMutation = useMutation({
    mutationFn: ({
      transitionId,
      comment,
      attachments,
      feedback,
      department_id,
      user_ids,
      field_changes,
      ready_to_close_duration,
    }: {
      transitionId: string;
      comment?: string;
      attachments?: string[];
      feedback?: { rating: number; comment?: string };
      department_id?: string;
      user_ids?: string[];
      field_changes?: Record<string, string>;
      ready_to_close_duration?: string;
    }) =>
      incidentApi.transition(incident.id, {
        transition_id: transitionId,
        comment,
        attachments,
        feedback: feedback ?? undefined,
        department_id,
        user_ids,
        field_changes,
        ready_to_close_duration,
        version: incident?.version || 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incident", incident.id] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success(t("incidents.transitionSuccess"));
      resetAndClose();
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const err = error as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        "Failed to execute transition";
      if (
        errorMessage.includes("conflict") ||
        errorMessage.includes("modified by another user")
      ) {
        toast.error(t("incidents.conflictDetected", "Conflict Detected"), {
          description: t(
            "incidents.incidentModifiedByAnotherUser",
            "This incident was modified by another user. Refreshing...",
          ),
          duration: 5000,
        });
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: ["incident", incident.id],
          });
          queryClient.invalidateQueries({ queryKey: ["incidents"] });
        }, 1000);
      } else {
        toast.error(t("incidents.transitionFailed", "Transition Failed"), {
          description: errorMessage,
        });
      }
    },
  });

  const validateCurrentStep = (): boolean => {
    if (!selectedTransition || transitionSteps.length === 0) return true;
    const stepKey = transitionSteps[transitionStep];
    const tr = selectedTransition.transition;
    const newErrors: Record<string, string> = {};

    if (stepKey === "department") {
      if (
        tr.auto_detect_department &&
        !tr.assign_department_id &&
        !effectiveDepartmentId
      )
        newErrors.department = t(
          "incidents.departmentSelectionRequired",
          "Please select a department",
        );
    } else if (stepKey === "user") {
      if (
        tr.manual_select_user &&
        tr.assignment_roles &&
        tr.assignment_roles.length > 0 &&
        !tr.assign_user_id &&
        effectiveUserIds.length === 0
      )
        newErrors.user = t(
          "incidents.userSelectionRequired",
          "Please select a user to assign",
        );
    } else if (stepKey === "field_changes") {
      const required = tr.field_changes?.filter((f) => f.is_required) || [];
      for (const fc of required) {
        if (!transitionFieldValues[fc.field_name])
          newErrors[fc.field_name] = t(
            "incidents.fieldRequired",
            "{{field}} is required",
            {
              field: fc.label || fc.field_name,
            },
          );
      }
    } else if (stepKey === "duration") {
      if (!readyToCloseDuration)
        newErrors.duration = t(
          "incidents.durationRequired",
          "Please select a duration",
        );
    } else if (stepKey === "attachment") {
      if (
        selectedTransition.requirements?.some(
          (r) => r.requirement_type === "attachment" && r.is_mandatory,
        ) &&
        transitionAttachment.length === 0
      ) {
        newErrors.attachment = t(
          "incidents.attachmentRequired",
          "Attachment is required",
        );
      } else if (transitionAttachment.length > 0) {
        const attachmentError =
          validateTransitionAttachments(transitionAttachment);
        if (attachmentError) newErrors.attachment = attachmentError;
      }
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
    if (!validateCurrentStep()) {
      toast.error(
        t(
          "incidents.fixErrorsBeforeSubmit",
          "Please fix the errors before continuing",
        ),
      );
      return;
    }
    setTransitionErrors({});
    if (transitionStep < transitionSteps.length - 1) {
      setTransitionStep((prev) => prev + 1);
    } else {
      void executeTransition();
    }
  };

  const handleStepBack = () => {
    setTransitionErrors({});
    setTransitionStep((prev) => Math.max(0, prev - 1));
  };

  const executeTransition = async () => {
    if (!selectedTransition) return;
    if (transitionMutation.isPending || transitionUploading) return;

    const requiresComment = selectedTransition.requirements?.some(
      (r) => r.requirement_type === "comment" && r.is_mandatory,
    );
    const requiresAttachment = selectedTransition.requirements?.some(
      (r) => r.requirement_type === "attachment" && r.is_mandatory,
    );
    const newTransitionErrors: Record<string, string> = {};

    if (requiresComment && !transitionComment.trim())
      newTransitionErrors.comment = t(
        "incidents.commentRequired",
        "Comment is required",
      );
    if (requiresAttachment && transitionAttachment.length === 0)
      newTransitionErrors.attachment = t(
        "incidents.attachmentRequired",
        "Attachment is required",
      );

    if (isPartialCloseTransition && !readyToCloseDuration)
      newTransitionErrors.duration = t(
        "incidents.durationRequired",
        "Please select a duration",
      );

    const requiredFieldChanges =
      selectedTransition.transition.field_changes?.filter(
        (f) => f.is_required,
      ) || [];
    for (const fc of requiredFieldChanges) {
      if (!transitionFieldValues[fc.field_name])
        newTransitionErrors[fc.field_name] = t(
          "incidents.fieldRequired",
          "{{field}} is required",
          {
            field: fc.label || fc.field_name,
          },
        );
    }

    const tr = selectedTransition.transition;
    if (
      tr.auto_detect_department &&
      !tr.assign_department_id &&
      !effectiveDepartmentId
    ) {
      const noDeptAvailable =
        momraFilteredDepartmentMatch &&
        momraFilteredDepartmentMatch.departments.length === 0;
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

    if (
      tr.manual_select_user &&
      tr.assignment_roles &&
      tr.assignment_roles.length > 0 &&
      !tr.assign_user_id &&
      effectiveUserIds.length === 0
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
      if (transitionAttachment.length > 0) {
        setTransitionUploading(true);
        const uploadResults = await Promise.all(
          transitionAttachment.map((file) =>
            incidentApi.uploadAttachment(incident.id, file),
          ),
        );
        setTransitionUploading(false);
        attachmentIds = uploadResults
          .map((uploadResult) => uploadResult.data?.id)
          .filter((id): id is string => Boolean(id));
      }

      let departmentId: string | undefined;
      if (tr.assign_department_id) {
        departmentId = tr.assign_department_id;
      } else if (tr.auto_detect_department && effectiveDepartmentId) {
        departmentId = effectiveDepartmentId;
      }

      const hasFeedbackRequirement =
        selectedTransition.requirements?.some(
          (r) => r.requirement_type === "feedback",
        ) || false;

      const userIds =
        (tr.manual_select_user || tr.auto_match_user) &&
        effectiveUserIds.length > 0
          ? effectiveUserIds
          : undefined;

      transitionMutation.mutate({
        transitionId: selectedTransition.transition.id,
        comment: transitionComment || undefined,
        attachments: attachmentIds,
        feedback:
          transitionFeedbackComment || hasFeedbackRequirement
            ? {
                rating: feedbackRating,
                comment: transitionFeedbackComment || undefined,
              }
            : undefined,
        department_id: departmentId,
        user_ids: userIds,
        field_changes:
          Object.keys(transitionFieldValues).length > 0
            ? transitionFieldValues
            : undefined,
        ready_to_close_duration: readyToCloseDuration || undefined,
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

  if (!isOpen || !selectedTransition) return null;

  const tr = selectedTransition.transition;
  const isLastStep = transitionStep === transitionSteps.length - 1;
  const currentStepKey = transitionSteps[transitionStep];
  const stepTitles: Record<string, string> = {
    department: t("incidents.departmentAssignment"),
    user: t("incidents.userAssignment"),
    field_changes: t("incidents.fieldChanges"),
    duration: t("incidents.closingDuration", "Duration"),
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
      !!tr.auto_detect_department &&
      !tr.assign_department_id) ||
    (currentStepKey === "user" &&
      !!tr.manual_select_user &&
      !tr.assign_user_id) ||
    currentStepKey === "duration";

  const setFieldValue = (name: string, value: string) => {
    setTransitionFieldValues((prev) => ({ ...prev, [name]: value }));
    setTransitionErrors((prev) =>
      prev[name] ? { ...prev, [name]: "" } : prev,
    );
  };

  /* department tree rows (leaf-selectable) are rendered by DepartmentStep below */

  return (
    <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full animate-scale-in flex flex-col max-h-[90vh]">
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
            onClick={resetAndClose}
            className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-lg transition-colors mt-0.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="flex items-center justify-center gap-3 text-sm">
            <span
              className="px-3 py-1 rounded-full font-medium"
              style={{
                backgroundColor: tr.from_state?.color
                  ? `${tr.from_state.color}20`
                  : "hsl(var(--muted))",
                color: tr.from_state?.color || "hsl(var(--foreground))",
              }}
            >
              {getLocalizedName(tr.from_state) || t("incidents.current")}
            </span>
            <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] rtl:-rotate-180" />
            <span
              className="px-3 py-1 rounded-full font-medium"
              style={{
                backgroundColor: tr.to_state?.color
                  ? `${tr.to_state.color}20`
                  : "hsl(var(--muted))",
                color: tr.to_state?.color || "hsl(var(--foreground))",
              }}
            >
              {getLocalizedName(tr.to_state) || t("incidents.next")}
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

        <div
          key={currentStepKey}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          <div
            className={`flex items-center justify-between ${currentStepKey === "field_changes" ? "hidden" : ""}`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                {stepTitles[currentStepKey]}
              </span>
              {transitionSteps.length >= 1 && (
                <>
                  {isMandatory ? (
                    <span className="text-red-500 font-bold">*</span>
                  ) : (
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      ({t("incidents.optional")})
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {currentStepKey === "department" && (
            <DepartmentStep
              t={t}
              trans={tr}
              matchLoading={matchLoading}
              match={momraFilteredDepartmentMatch}
              selectedId={effectiveDepartmentId}
              searchQuery={deptSearchQuery}
              setSearchQuery={setDeptSearchQuery}
              collapsedIds={collapsedDeptIds}
              setCollapsedIds={setCollapsedDeptIds}
              onSelect={(id) => {
                setSelectedDepartmentId(id);
                setTransitionErrors((prev) =>
                  prev.department ? { ...prev, department: "" } : prev,
                );
              }}
              error={transitionErrors.department}
            />
          )}

          {currentStepKey === "user" && (
            <UserStep
              t={t}
              trans={tr}
              matchLoading={matchLoading}
              match={userMatchResult}
              selectedIds={effectiveUserIds}
              searchQuery={userSearchQuery}
              setSearchQuery={setUserSearchQuery}
              collapsedGroups={collapsedUserGroups}
              setCollapsedGroups={setCollapsedUserGroups}
              onToggleOne={(userId, isChecked) => {
                setSelectedUserIds((prev) =>
                  isChecked
                    ? prev.filter((id) => id !== userId)
                    : [...prev, userId],
                );
                setTransitionErrors((prev) =>
                  prev.user ? { ...prev, user: "" } : prev,
                );
              }}
              onSetMany={(ids) => {
                setSelectedUserIds(ids);
                setTransitionErrors((prev) =>
                  prev.user ? { ...prev, user: "" } : prev,
                );
              }}
              error={transitionErrors.user}
            />
          )}

          {currentStepKey === "field_changes" &&
            tr.field_changes &&
            tr.field_changes.length > 0 && (
              <div className="space-y-3">
                {tr.field_changes.map((fc) => (
                  <FieldChangeInput
                    key={fc.id}
                    t={t}
                    i18nLang={i18n.language}
                    fc={fc}
                    value={transitionFieldValues[fc.field_name] || ""}
                    error={transitionErrors[fc.field_name]}
                    onChange={(v) => setFieldValue(fc.field_name, v)}
                    incident={incident}
                    lookupCategories={lookupCategories}
                    fcDepartments={fcDepartmentsData?.data}
                    fcLocations={fcLocationsData?.data}
                    fcClassifications={fcClassificationsData?.data}
                    momraAllowedEEList={momraAllowedEEList}
                  />
                ))}
              </div>
            )}

          {currentStepKey === "duration" && (
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">
                {t(
                  "incidents.closingDurationHint",
                  "The incident will automatically revert if not closed within the selected period.",
                )}
              </p>
              <select
                value={readyToCloseDuration}
                onChange={(e) => {
                  setReadyToCloseDuration(e.target.value);
                  if (transitionErrors.duration)
                    setTransitionErrors((prev) => ({ ...prev, duration: "" }));
                }}
                className={`w-full px-3 py-2 text-sm bg-[hsl(var(--background))] border rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] ${transitionErrors.duration ? "border-red-500" : "border-[hsl(var(--border))]"}`}
              >
                <option value="">{t("incidents.selectDuration")}</option>
                {readyToCloseDurationOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {transitionErrors.duration && (
                <p className="text-xs text-red-500 mt-1">
                  {transitionErrors.duration}
                </p>
              )}
            </div>
          )}

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
                    <option value="">{t("common.selectComment")}</option>
                    {commentTemplates.map((tpl) => (
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
                    setTransitionErrors((prev) => ({ ...prev, comment: "" }));
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

          {currentStepKey === "attachment" && (
            <div>
              {transitionAttachment.length > 0 ? (
                <div className="space-y-3">
                  {transitionAttachment.map((file, index) => {
                    const invalid =
                      file.size >
                      MAX_TRANSITION_ATTACHMENT_SIZE_MB * 1024 * 1024;
                    return (
                      <div
                        key={`${file.name}-${file.size}-${index}`}
                        className={cn(
                          "flex items-center justify-between p-3 border rounded-lg",
                          invalid
                            ? "bg-red-50 border-red-400"
                            : "bg-primary/10 border-primary",
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm truncate max-w-[200px] text-[hsl(var(--foreground))]">
                            {file.name}
                          </span>
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">
                            ({(file.size / 1024).toFixed(1)} {t("common.kb")})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTransitionAttachment((prev) => {
                              const next = prev.filter((_, i) => i !== index);
                              setTransitionErrors((errPrev) => ({
                                ...errPrev,
                                attachment: validateTransitionAttachments(next),
                              }));
                              return next;
                            });
                          }}
                          className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  <div className="flex flex-wrap items-center gap-3">
                    {transitionAttachmentAllowsMultiple ? (
                      <label
                        className={cn(
                          "inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg transition-opacity",
                          transitionAttachmentLimitReached
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer hover:opacity-90",
                        )}
                      >
                        <Upload className="w-4 h-4" />
                        {validatingTransitionAttachments
                          ? t(
                              "incidents.validatingImages",
                              "Checking photos...",
                            )
                          : transitionAttachmentLimitReached
                            ? t("incidents.attachmentLimit", {
                                max: MAX_TRANSITION_ATTACHMENTS,
                                defaultValue: `Max ${MAX_TRANSITION_ATTACHMENTS} attachments`,
                              })
                            : t(
                                "incidents.addMoreAttachments",
                                "Add more attachments",
                              )}
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          disabled={
                            transitionAttachmentLimitReached ||
                            validatingTransitionAttachments
                          }
                          onChange={(e) => {
                            const files = e.target.files;
                            if (!files) return;
                            void addTransitionAttachmentFiles(
                              Array.from(files),
                            );
                            e.target.value = "";
                          }}
                        />
                      </label>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setTransitionAttachment([]);
                        setTransitionErrors((prev) => ({
                          ...prev,
                          attachment: "",
                        }));
                      }}
                      className="text-sm text-[hsl(var(--foreground))] underline"
                    >
                      {t(
                        "incidents.removeAllAttachments",
                        "Remove all attachments",
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--muted)/0.3)] transition-colors ${transitionErrors.attachment ? "border-red-500" : "border-[hsl(var(--border))]"}`}
                >
                  <Upload className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    {validatingTransitionAttachments
                      ? t("incidents.validatingImages", "Checking photos...")
                      : t("incidents.clickToUpload")}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    multiple={transitionAttachmentAllowsMultiple}
                    disabled={validatingTransitionAttachments}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;
                      const selectedFiles = Array.from(files);
                      if (selectedFiles.length > 0) {
                        void addTransitionAttachmentFiles(
                          selectedFiles,
                          !transitionAttachmentAllowsMultiple,
                        );
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                {t("citizen.maxSize", "Max")}{" "}
                {MAX_TRANSITION_ATTACHMENT_SIZE_MB} MB ·{" "}
                {t("incidents.attachmentLimit", {
                  max: MAX_TRANSITION_ATTACHMENTS,
                  defaultValue: `Max ${MAX_TRANSITION_ATTACHMENTS} attachments`,
                })}
              </p>
              {transitionErrors.attachment && (
                <p className="text-xs text-red-500 mt-1">
                  {transitionErrors.attachment}
                </p>
              )}
              <div className="mt-2">
                <RejectedAttachmentsList
                  items={transitionImageValidation.rejected}
                  onDismiss={transitionImageValidation.clearRejected}
                />
              </div>
            </div>
          )}

          {currentStepKey === "feedback" && (
            <div>
              <div className="p-2 bg-[hsl(var(--muted)/0.5)] rounded-lg space-y-3">
                {selectedTransition.requirements?.find(
                  (x) => x.requirement_type === "rating",
                ) && (
                  <div className="flex flex-col gap-2 w-full p-2 bg-background/35 rounded-lg">
                    <span className="text-sm text-[hsl(var(--muted-foreground))] mb-2 flex flex-row gap-1">
                      {t(
                        "incidents.rateYourExperience",
                        "Rate your experience with this resolution",
                      )}
                      {selectedTransition.requirements?.find(
                        (x) => x.requirement_type === "rating",
                      )?.is_mandatory && (
                        <span className="text-red-500">*</span>
                      )}
                    </span>
                    <div className="flex flex-col justify-center items-center gap-2">
                      <div className="flex flex-row">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div
                            key={star}
                            onClick={() => setFeedbackRating(star)}
                          >
                            <Star
                              fill={star <= feedbackRating ? "#FFD700" : "#CCC"}
                              size={40}
                              color={
                                star <= feedbackRating ? "#FFD700" : "#CCC"
                              }
                            />
                          </div>
                        ))}
                      </div>
                      {feedbackRating > 0 && (
                        <span className="text-sm">
                          {feedbackRating === 1 && t("incidents.ratingPoor")}
                          {feedbackRating === 2 && t("incidents.ratingFair")}
                          {feedbackRating === 3 && t("incidents.ratingGood")}
                          {feedbackRating === 4 &&
                            t("incidents.ratingVeryGood")}
                          {feedbackRating === 5 &&
                            t("incidents.ratingExcellent")}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  {feedbackTemplates?.length ? (
                    <select
                      value={
                        feedbackTemplates.some(
                          (tpl) =>
                            tpl.feedback_text === transitionFeedbackComment,
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
                      <option value="">{t("common.selectFeedback")}</option>
                      {feedbackTemplates.map((tpl) => (
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
                      placeholder={t("incidents.feedbackCommentPlaceholder")}
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
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <button
            type="button"
            onClick={resetAndClose}
            className="px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            {t("incidents.cancel")}
          </button>
          <div className="flex gap-2">
            {transitionStep > 0 && (
              <button
                type="button"
                onClick={handleStepBack}
                className="px-4 py-2 text-sm font-medium border-2 border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                {t("common.back")}
              </button>
            )}
            <button
              type="button"
              onClick={handleStepNext}
              disabled={
                (currentStepKey === "attachment" &&
                  (validatingTransitionAttachments ||
                    transitionAttachment.some(
                      (f) =>
                        f.size >
                        MAX_TRANSITION_ATTACHMENT_SIZE_MB * 1024 * 1024,
                    ))) ||
                transitionMutation.isPending ||
                transitionUploading
              }
              className="px-4 py-2 text-sm font-semibold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {isLastStep &&
              (transitionMutation.isPending || transitionUploading) ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                isLastStep && <Play className="w-4 h-4" />
              )}
              {isLastStep
                ? transitionUploading
                  ? t("incidents.uploading")
                  : t("incidents.execute")
                : t("common.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* step subcomponents (same UI + behaviour as the details page)        */
/* ------------------------------------------------------------------ */

function DepartmentStep({
  t,
  trans,
  matchLoading,
  match,
  selectedId,
  searchQuery,
  setSearchQuery,
  collapsedIds,
  setCollapsedIds,
  onSelect,
  error,
}: {
  t: TFunction;
  trans: AvailableTransition["transition"];
  matchLoading: boolean;
  match: DepartmentMatchResponse | null;
  selectedId: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  collapsedIds: Set<string>;
  setCollapsedIds: (next: Set<string>) => void;
  onSelect: (id: string) => void;
  error?: string;
}) {
  if (matchLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
        <div className="w-4 h-4 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
        {t("incidents.loadingAssignmentOptions")}
      </div>
    );
  }
  if (trans.assign_department_id) {
    return (
      <p className="text-sm text-[hsl(var(--foreground))]">
        {t("incidents.willAssignTo")}{" "}
        <span className="font-medium">
          {getLocalizedName(trans.assign_department) ||
            t("incidents.department")}
        </span>
      </p>
    );
  }
  if (!match) {
    return (
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        {t("incidents.loadingDepartments")}
      </p>
    );
  }
  if (match.departments.length === 0) {
    return (
      <p className="text-sm text-red-600 font-medium">
        {t(
          "incidents.noDepartmentAssigned",
          "No department assigned - Contact administrator for this",
        )}
      </p>
    );
  }
  if (match.single_match) {
    return (
      <p className="text-sm text-[hsl(var(--foreground))]">
        {t("incidents.willAssignTo")}{" "}
        <span className="font-medium">
          {getLocalizedName(match.departments[0])}
        </span>
      </p>
    );
  }

  const allDepts = match.departments;
  const deptIdSet = new Set(allDepts.map((d) => d.id));
  const parentIds = new Set(
    allDepts
      .map((d) => d.parent_id)
      .filter((pid): pid is string => pid !== null && deptIdSet.has(pid)),
  );
  const isLeaf = (id: string) => !parentIds.has(id);
  const childrenMap = new Map<string | null, Department[]>();
  allDepts.forEach((d) => {
    const key = d.parent_id && deptIdSet.has(d.parent_id) ? d.parent_id : null;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(d);
  });
  const searchActive = searchQuery.trim().length > 0;
  const filteredFlat = searchActive
    ? allDepts.filter((d) =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];
  const toggleDept = (id: string) => {
    const next = new Set(collapsedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsedIds(next);
  };
  const renderDeptRow = (dept: Department, indent = 0): ReactNode => {
    const hasChildren = childrenMap.has(dept.id);
    const isCollapsed = collapsedIds.has(dept.id);
    const isSelected = selectedId === dept.id;
    const isSelectableLeaf = isLeaf(dept.id);
    return (
      <Fragment key={dept.id}>
        <div
          className={`flex items-center gap-1 px-3 py-2 transition-colors ${isSelectableLeaf ? "cursor-pointer hover:bg-[hsl(var(--muted)/0.5)]" : "cursor-default"} ${isSelected ? "bg-[hsl(var(--primary)/0.1)]" : ""}`}
          style={{ paddingLeft: `${12 + indent * 16}px` }}
          onClick={() => {
            if (!isSelectableLeaf) return;
            onSelect(dept.id);
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
            {getLocalizedName(dept)}
          </span>
          {isSelected && (
            <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))] flex-shrink-0" />
          )}
        </div>
        {hasChildren &&
          !isCollapsed &&
          (childrenMap.get(dept.id) || []).map((child) =>
            renderDeptRow(child, indent + 1),
          )}
      </Fragment>
    );
  };

  return (
    <>
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("incidents.searchDepartments")}
          className="w-full pl-8 pr-3 py-1.5 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-md text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
        />
      </div>
      <div
        className={`border rounded-md overflow-y-auto max-h-52 bg-[hsl(var(--background))] ${error ? "border-red-500" : "border-[hsl(var(--border))]"}`}
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
                const isSel = selectedId === dept.id;
                return (
                  <div
                    key={dept.id}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[hsl(var(--muted)/0.5)] transition-colors ${isSel ? "bg-[hsl(var(--primary)/0.1)]" : ""}`}
                    onClick={() => onSelect(dept.id)}
                  >
                    <span
                      className={`text-sm flex-1 truncate ${isSel ? "text-[hsl(var(--primary))] font-medium" : "text-[hsl(var(--foreground))]"}`}
                    >
                      {getLocalizedName(dept)}
                    </span>
                    {isSel && (
                      <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))] flex-shrink-0" />
                    )}
                  </div>
                );
              })
          )
        ) : (
          (childrenMap.get(null) || []).map((dept) => renderDeptRow(dept, 0))
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </>
  );
}

function UserStep({
  t,
  trans,
  matchLoading,
  match,
  selectedIds,
  searchQuery,
  setSearchQuery,
  collapsedGroups,
  setCollapsedGroups,
  onToggleOne,
  onSetMany,
  error,
}: {
  t: TFunction;
  trans: AvailableTransition["transition"];
  matchLoading: boolean;
  match: UserMatchResponse | null;
  selectedIds: string[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  collapsedGroups: Set<string>;
  setCollapsedGroups: (next: Set<string>) => void;
  onToggleOne: (userId: string, isChecked: boolean) => void;
  onSetMany: (ids: string[]) => void;
  error?: string;
}) {
  if (matchLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
        <div className="w-4 h-4 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
        {t("incidents.loadingAssignmentOptions")}
      </div>
    );
  }
  if (trans.assign_user_id) {
    return (
      <p className="text-sm text-[hsl(var(--foreground))]">
        {t("incidents.willAssignTo")}{" "}
        <span className="font-medium">
          {trans.assign_user?.first_name ||
            trans.assign_user?.username ||
            t("incidents.assignee")}
        </span>
      </p>
    );
  }
  if (trans.manual_select_user) {
    if (!match) {
      return (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {t("incidents.loadingUsers")}
        </p>
      );
    }
    if (match.users.length === 0) {
      return (
        <>
          <p className="text-sm text-amber-600">
            {t("incidents.noUsersWithRole")}
          </p>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </>
      );
    }
    if (match.single_match) {
      const u = match.users[0];
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.2)] rounded-md">
          <User className="w-4 h-4 text-[hsl(var(--primary))]" />
          <span className="text-sm text-[hsl(var(--foreground))] font-medium">
            {u.first_name ? `${u.first_name} ${u.last_name || ""}` : u.username}
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))] ml-auto">
            {t("incidents.autoSelected")}
          </span>
        </div>
      );
    }

    const allUsers = match.users;
    const assignmentRoles = trans.assignment_roles ?? [];
    const searchActive = searchQuery.trim().length > 0;
    const filteredUsers = searchActive
      ? allUsers.filter((u) =>
          `${u.first_name || ""} ${u.last_name || ""} ${u.username} ${u.email}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
        )
      : allUsers;
    const roleGroups = assignmentRoles.map((role) => ({
      role,
      users: allUsers.filter((u) => u.roles?.some((r) => r.id === role.id)),
    }));
    const allGroupKeys = roleGroups.map((g) => g.role.id);
    const allCollapsed =
      allGroupKeys.length > 0 &&
      allGroupKeys.every((k) => collapsedGroups.has(k));
    const allUsersSelected =
      allUsers.length > 0 && allUsers.every((u) => selectedIds.includes(u.id));
    const someSelected = selectedIds.length > 0;
    const allFilteredSelected =
      filteredUsers.length > 0 &&
      filteredUsers.every((u) => selectedIds.includes(u.id));
    const someFilteredSelected = filteredUsers.some((u) =>
      selectedIds.includes(u.id),
    );

    const renderUserRow = (user: UserType, indent = false) => {
      const isChecked = selectedIds.includes(user.id);
      return (
        <label
          key={user.id}
          className={`flex items-center gap-2 py-2 pr-3 cursor-pointer hover:bg-[hsl(var(--muted)/0.5)] select-none border-b border-[hsl(var(--border))] last:border-0 ${isChecked ? "bg-[hsl(var(--primary)/0.04)]" : ""}`}
          style={{ paddingLeft: indent ? "28px" : "12px" }}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => onToggleOne(user.id, isChecked)}
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
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {selectedIds.map((id) => {
              const u = allUsers.find((x) => x.id === id);
              if (!u) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]"
                >
                  {u.first_name
                    ? `${u.first_name} ${u.last_name || ""}`.trim()
                    : u.username}
                  <button
                    type="button"
                    onClick={() =>
                      onSetMany(selectedIds.filter((x) => x !== id))
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("incidents.searchUsers")}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-md text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
            />
          </div>
          {!searchActive && roleGroups.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setCollapsedGroups(
                  allCollapsed ? new Set() : new Set(allGroupKeys),
                )
              }
              className="flex-shrink-0 text-xs text-[hsl(var(--primary))] hover:underline whitespace-nowrap"
            >
              {allCollapsed ? t("common.expandAll") : t("common.collapseAll")}
            </button>
          )}
        </div>
        <div
          className={`border rounded-md overflow-y-auto max-h-52 bg-[hsl(var(--background))] ${error ? "border-red-500" : "border-[hsl(var(--border))]"}`}
        >
          <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] select-none sticky top-0 bg-[hsl(var(--background))] z-10">
            <input
              type="checkbox"
              checked={searchActive ? allFilteredSelected : allUsersSelected}
              ref={(el) => {
                if (el)
                  el.indeterminate = searchActive
                    ? !allFilteredSelected && someFilteredSelected
                    : !allUsersSelected && someSelected;
              }}
              onChange={() => {
                const targets = searchActive ? filteredUsers : allUsers;
                const allSel = targets.every((u) => selectedIds.includes(u.id));
                if (allSel) {
                  onSetMany(
                    selectedIds.filter(
                      (id) => !targets.some((u) => u.id === id),
                    ),
                  );
                } else {
                  onSetMany([
                    ...selectedIds,
                    ...targets
                      .filter((u) => !selectedIds.includes(u.id))
                      .map((u) => u.id),
                  ]);
                }
              }}
              className="rounded"
            />
            <span className="text-sm font-medium text-[hsl(var(--foreground))]">
              {searchActive
                ? t("common.selectAllFiltered")
                : t("common.selectAll")}
            </span>
            <span className="ml-auto text-xs text-[hsl(var(--muted-foreground))]">
              {selectedIds.length}/{allUsers.length} {t("common.selected")}
            </span>
          </label>
          {searchActive ? (
            filteredUsers.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[hsl(var(--muted-foreground))] text-center">
                {t("common.noResults")}
              </p>
            ) : (
              filteredUsers.map((u) => renderUserRow(u, false))
            )
          ) : (
            roleGroups.map(({ role, users }) => {
              const isCollapsed = collapsedGroups.has(role.id);
              const groupAllSelected =
                users.length > 0 &&
                users.every((u) => selectedIds.includes(u.id));
              const groupSomeSelected = users.some((u) =>
                selectedIds.includes(u.id),
              );
              return (
                <Fragment key={role.id}>
                  <div className="flex items-center border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Set(collapsedGroups);
                        if (next.has(role.id)) next.delete(role.id);
                        else next.add(role.id);
                        setCollapsedGroups(next);
                      }}
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
                              !groupAllSelected && groupSomeSelected;
                        }}
                        onChange={() => {
                          if (groupAllSelected) {
                            onSetMany(
                              selectedIds.filter(
                                (id) => !users.some((u) => u.id === id),
                              ),
                            );
                          } else {
                            onSetMany([
                              ...selectedIds,
                              ...users
                                .filter((u) => !selectedIds.includes(u.id))
                                .map((u) => u.id),
                            ]);
                          }
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
                      users.map((u) => renderUserRow(u, true))
                    ))}
                </Fragment>
              );
            })
          )}
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </>
    );
  }
  if (trans.auto_match_user) {
    if (!match) {
      return (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {t("incidents.autoAssignRoleCriteria")}
        </p>
      );
    }
    if (match.users.length === 0) {
      return (
        <p className="text-sm text-amber-600">
          {t("incidents.noMatchingUsers")}
        </p>
      );
    }
    return (
      <div>
        <p className="text-sm text-[hsl(var(--foreground))] mb-2">
          {t("incidents.willAssignToUsers", { count: match.users.length })}
        </p>
        <div className="border border-[hsl(var(--border))] rounded-md overflow-y-auto max-h-40 divide-y divide-[hsl(var(--border))]">
          {match.users.map((user) => (
            <div key={user.id} className="flex items-center gap-2 px-3 py-2">
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
    );
  }
  return (
    <p className="text-sm text-[hsl(var(--muted-foreground))]">
      {t("incidents.noAssignmentConfigured")}
    </p>
  );
}

function FieldChangeInput({
  t,
  i18nLang,
  fc,
  value,
  error,
  onChange,
  incident,
  lookupCategories,
  fcDepartments,
  fcLocations,
  fcClassifications,
  momraAllowedEEList,
}: {
  t: TFunction;
  i18nLang: string;
  fc: {
    id: string;
    field_name: string;
    label: string;
    is_required: boolean;
    department_type_filter?: string;
  };
  value: string;
  error?: string;
  onChange: (value: string) => void;
  incident: Incident;
  lookupCategories: Array<{
    code: string;
    field_type?: string;
    values?: Array<{
      id: string;
      code: string;
      name: string;
      is_active?: boolean;
      sort_order?: number;
    }>;
  }>;
  fcDepartments?: Department[];
  fcLocations?: Array<{ id: string; name: string }>;
  fcClassifications?: Array<{ id: string; name: string }>;
  momraAllowedEEList: { codes: Set<string>; names: Set<string> } | null;
}) {
  const inputClass = `w-full px-3 py-2 text-sm bg-[hsl(var(--background))] border rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] ${error ? "border-red-500" : "border-[hsl(var(--border))]"}`;
  return (
    <div>
      <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
        {fc.label || fc.field_name}
        {fc.is_required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {fc.field_name === "priority" && (
        <>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          >
            <option value="">{t("incidents.selectPriority")}</option>
            <option value="1">{t("priorities.low")}</option>
            <option value="2">{t("priorities.medium")}</option>
            <option value="3">{t("priorities.high")}</option>
            <option value="4">{t("priorities.urgent")}</option>
            <option value="5">{t("priorities.critical")}</option>
          </select>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </>
      )}
      {fc.field_name === "department_id" && (
        <TreeSelect
          data={(() => {
            const allDepts = fcDepartments || [];
            let filtered = fc.department_type_filter
              ? filterDeptTree(allDepts, fc.department_type_filter)
              : allDepts;
            filtered = filterDeptTreeForMomraEE(filtered, momraAllowedEEList);
            return filtered as unknown as TreeSelectNode[];
          })()}
          value={value}
          onChange={onChange}
          placeholder={t("incidents.selectDepartmentPlaceholder", {
            type: fc.department_type_filter || "",
          })}
          leafOnly={false}
          error={error}
          maxHeight="240px"
        />
      )}
      {fc.field_name === "location_id" && (
        <TreeSelect
          data={(fcLocations as unknown as TreeSelectNode[]) || []}
          value={value}
          onChange={onChange}
          placeholder={t("incidents.selectLocation")}
          leafOnly={false}
          maxHeight="240px"
          error={error}
        />
      )}
      {fc.field_name === "classification_id" && (
        <TreeSelect
          data={(fcClassifications as unknown as TreeSelectNode[]) || []}
          value={value}
          onChange={onChange}
          placeholder={t("incidents.selectClassification")}
          leafOnly={false}
          maxHeight="240px"
          error={error}
        />
      )}
      {fc.field_name === "title" && (
        <>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t("incidents.enterTitle")}
            className={inputClass}
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </>
      )}
      {fc.field_name === "description" && (
        <>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t("incidents.enterDescription")}
            rows={3}
            className={`${inputClass} resize-none`}
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </>
      )}
      {fc.field_name.startsWith("lookup:") &&
        (() => {
          const code = fc.field_name.replace("lookup:", "");
          const cat = lookupCategories.find((c) => c.code === code);
          const fieldType = cat?.field_type || "text";
          const handleChange = (val: string) => onChange(val);
          return (
            <>
              {fieldType === "textarea" ? (
                <IncidentMentionTextarea
                  value={value}
                  onChange={(e) => handleChange(e.target.value)}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  filters={{
                    classification_ids: incident.classification?.id
                      ? [incident.classification?.id]
                      : [],
                    location_ids: incident.location?.id
                      ? [incident.location?.id]
                      : [],
                    currentIncident_ids: [incident.id],
                  }}
                />
              ) : (fieldType === "select" || fieldType === "multiselect") &&
                cat?.values?.length ? (
                <select
                  value={value}
                  onChange={(e) => handleChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="">{t("common.select")}</option>
                  {cat.values
                    .filter((v) => v.is_active)
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                    .map((v) => (
                      <option key={v.id} value={v.code}>
                        {i18nLang === "ar" &&
                        (v as { name_ar?: string }).name_ar
                          ? (v as { name_ar?: string }).name_ar
                          : v.name}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleChange(e.target.value)}
                  className={inputClass}
                />
              )}
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </>
          );
        })()}
    </div>
  );
}
