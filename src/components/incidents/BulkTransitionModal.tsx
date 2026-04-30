import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  ChevronLeft,
  Paperclip,
  Upload,
  User,
  Building2,
  Tags,
  Search,
} from "lucide-react";
import { Button, Select, TreeSelect, type TreeSelectNode } from "../ui";
import {
  incidentApi,
  departmentApi,
  userApi,
  locationApi,
  classificationApi,
} from "../../api/admin";
import type { Incident, AvailableTransition } from "../../types";
import { cn } from "@/lib/utils";

interface BulkTransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIncidents: Incident[];
  onSuccess: () => void;
}

type TransitionStepKey =
  | "select"
  | "department"
  | "user"
  | "field_changes"
  | "duration"
  | "attachment"
  | "feedback"
  | "comment"
  | "executing";

export const BulkTransitionModal: React.FC<BulkTransitionModalProps> = ({
  isOpen,
  onClose,
  selectedIncidents,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // --- Modal State ---
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedTransition, setSelectedTransition] =
    useState<AvailableTransition | null>(null);

  // --- Form State ---
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [readyToCloseDuration, setReadyToCloseDuration] = useState("");
  const [comment, setComment] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState(
    t("incidents.missingIncidentInformation"),
  );

  // --- Execution State ---
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<
    { id: string; success: boolean; error?: string }[]
  >([]);

  // --- Data Queries ---
  const firstIncident = selectedIncidents[0];

  const { data: transitionsData, isLoading: isLoadingTransitions } = useQuery({
    queryKey: ["incident", firstIncident?.id, "transitions"],
    queryFn: () => incidentApi.getAvailableTransitions(firstIncident.id),
    enabled: isOpen && !!firstIncident,
  });

  const availableTransitions = (transitionsData?.data || []).filter(
    (t) => t.can_execute,
  );

  const transition = selectedTransition?.transition;

  const transitionSteps = useMemo((): TransitionStepKey[] => {
    if (!selectedTransition) return ["select"];

    const steps: TransitionStepKey[] = ["select"];
    const trans = selectedTransition.transition;

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
    if (trans.to_state?.is_ready_to_close) steps.push("duration");
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

  const currentStep =
    isExecuting || results.length > 0
      ? "executing"
      : transitionSteps[currentStepIndex];

  // --- Matching Data ---
  const { data: deptMatchData, isLoading: isMatchLoading } = useQuery({
    queryKey: [
      "department-match",
      firstIncident?.classification?.id,
      firstIncident?.location?.id,
      transition?.department_type_filter,
    ],
    queryFn: () =>
      departmentApi.match({
        classification_id: firstIncident?.classification?.id,
        location_id: firstIncident?.location?.id,
        department_type:
          (transition?.department_type_filter as "internal" | "external") ||
          undefined,
      }),
    enabled:
      isOpen &&
      currentStep === "department" &&
      !!transition?.auto_detect_department &&
      !transition?.assign_department_id,
  });

  const { data: userMatchData, isLoading: isUserMatchLoading } = useQuery({
    queryKey: [
      "user-match",
      transition?.assignment_roles,
      firstIncident?.classification?.id,
      firstIncident?.location?.id,
      selectedDepartmentId || firstIncident?.department?.id,
    ],
    queryFn: () =>
      userApi.match({
        role_ids: transition?.assignment_roles?.map((r) => r.id),
        classification_id: firstIncident?.classification?.id,
        location_id: firstIncident?.location?.id,
        department_id: selectedDepartmentId || firstIncident?.department?.id,
        exclude_user_id: firstIncident?.assignee?.id,
      }),
    enabled:
      isOpen &&
      currentStep === "user" &&
      !!(transition?.auto_match_user || transition?.manual_select_user) &&
      !transition?.assign_user_id,
  });

  const roleIds = transition?.assignment_roles?.map((r) => r.id) || [];
  const { data: usersByRolesData, isLoading: isUsersByRolesLoading } = useQuery(
    {
      queryKey: ["admin", "users", "by-roles", roleIds],
      queryFn: () => userApi.list(1, 100, "", roleIds),
      enabled:
        isOpen &&
        currentStep === "user" &&
        !!transition?.manual_select_user &&
        roleIds.length > 0,
    },
  );

  const { data: durationOptionsData } = useQuery({
    queryKey: ["duration-options"],
    queryFn: () => incidentApi.getReadyToCloseDurationOptions(),
    enabled: isOpen && currentStep === "duration",
  });

  // --- Field Change Data ---
  const needsDepts = transition?.field_changes?.some(
    (f) => f.field_name === "department_id",
  );
  const { data: deptsTreeData } = useQuery({
    queryKey: ["admin", "departments", "tree"],
    queryFn: () => departmentApi.getTree(),
    enabled: !!needsDepts && currentStep === "field_changes",
  });

  const needsLocs = transition?.field_changes?.some(
    (f) => f.field_name === "location_id",
  );
  const { data: locsTreeData } = useQuery({
    queryKey: ["admin", "locations", "tree"],
    queryFn: () => locationApi.getTree(),
    enabled: !!needsLocs && currentStep === "field_changes",
  });

  const needsClassifications = transition?.field_changes?.some(
    (f) => f.field_name === "classification_id",
  );
  const { data: classTreeData } = useQuery({
    queryKey: ["admin", "classifications", "tree"],
    queryFn: () => classificationApi.getTree(),
    enabled: !!needsClassifications && currentStep === "field_changes",
  });
  const { data: allDeptsData } = useQuery({
    queryKey: ["admin", "departments", "tree", "all"],
    queryFn: () => departmentApi.getTree(),
    enabled: isOpen && currentStep === "department",
  });

  // Logic to handle auto-selection
  useEffect(() => {
    if (
      currentStep === "department" &&
      deptMatchData?.success &&
      deptMatchData.data
    ) {
      const matchId = deptMatchData.data.matched_department_id;
      if (
        deptMatchData.data.single_match &&
        matchId &&
        selectedDepartmentId !== matchId
      ) {
        // Use timeout to avoid synchronous cascading renders warning
        const timer = setTimeout(() => {
          setSelectedDepartmentId(matchId);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [currentStep, deptMatchData, selectedDepartmentId]);

  useEffect(() => {
    if (
      currentStep === "user" &&
      userMatchData?.success &&
      userMatchData.data
    ) {
      const matchId = userMatchData.data.matched_user_id;
      if (
        userMatchData.data.single_match &&
        matchId &&
        !selectedUserIds.includes(matchId)
      ) {
        // Use timeout to avoid synchronous cascading renders warning
        const timer = setTimeout(() => {
          setSelectedUserIds([matchId]);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [currentStep, userMatchData, selectedUserIds]);

  // --- Navigation ---
  const handleNext = () => {
    if (currentStepIndex < transitionSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      handleExecute();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleExecute = async () => {
    if (!selectedTransition) return;

    setIsExecuting(true);

    let uploadedAttachments: string[] | undefined = undefined;
    if (attachment) {
      try {
        // Bulk attachment upload is tricky, usually we upload once and reuse the ID if backend allows,
        // but here we might need to upload for each? Actually, let's upload for the first and reuse if possible.
        // Most backends for this app seem to take a string[] of attachment IDs.
        const uploadRes = await incidentApi.uploadAttachment(
          firstIncident.id,
          attachment,
        );
        if (uploadRes.success && uploadRes.data?.id) {
          uploadedAttachments = [uploadRes.data.id];
        }
      } catch {
        toast.error(t("incidents.failedToUploadAttachment"));
      }
    }

    const total = selectedIncidents.length;
    setProgress({ current: 0, total });
    const newResults: { id: string; success: boolean; error?: string }[] = [];
    for (let i = 0; i < selectedIncidents.length; i++) {
      const incident = selectedIncidents[i];
      try {
        // Follow the exact logic from IncidentDetailPage for assignments
        const trans = selectedTransition.transition;
        let departmentId: string | undefined = undefined;
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

        await incidentApi.transition(incident.id, {
          transition_id: trans.id,
          comment: comment || undefined,
          attachments: uploadedAttachments,
          department_id: departmentId,
          user_ids: userIds,
          field_changes:
            Object.keys(fieldValues).length > 0 ? fieldValues : undefined,
          ready_to_close_duration: readyToCloseDuration || undefined,
          feedback: selectedTransition.requirements?.some(
            (r) => r.requirement_type === "feedback",
          )
            ? { rating: feedbackRating, comment: feedbackComment }
            : undefined,
          version: incident.version,
        });
        newResults.push({ id: incident.id, success: true });
      } catch (err: unknown) {
        const errorMessage =
          (err as any)?.response?.data?.error ||
          (err as Error).message ||
          "Unknown error";
        newResults.push({
          id: incident.id,
          success: false,
          error: errorMessage,
        });
      }
      setProgress({ current: i + 1, total });
    }

    setResults(newResults);
    setIsExecuting(false);

    const successCount = newResults.filter((r) => r.success).length;

    // Invalidate sidebar stats so counts update immediately
    if (successCount > 0) {
      const recordType = firstIncident?.record_type || "incident";
      if (recordType === "request") {
        queryClient.invalidateQueries({ queryKey: ["requests", "stats"] });
      } else if (recordType === "complaint") {
        queryClient.invalidateQueries({ queryKey: ["complaints", "stats"] });
      } else if (recordType === "query") {
        queryClient.invalidateQueries({ queryKey: ["queries", "stats"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["incidents", "stats"] });
      }
    }
    if (successCount === total) {
      toast.success(t("incidents.bulkTransitionSuccess", { count: total }));
      onSuccess();
      onClose();
    } else if (successCount > 0) {
      toast.error(
        t("incidents.bulkTransitionPartialSuccess", {
          success: successCount,
          total: total,
        }),
      );
    } else {
      toast.error(t("incidents.bulkTransitionFailed"));
    }
  };

  const handleClose = () => {
    if (isExecuting) return;
    setSelectedTransition(null);
    setCurrentStepIndex(0);
    setComment("");
    setSelectedDepartmentId("");
    setSelectedUserIds([]);
    setFieldValues({});
    setReadyToCloseDuration("");
    setAttachment(null);
    setFeedbackRating(0);
    setResults([]);
    setProgress({ current: 0, total: 0 });
    onClose();
  };

  const isMandatory = useMemo(() => {
    if (!selectedTransition) return false;
    const trans = selectedTransition.transition;
    const reqs = selectedTransition.requirements || [];
    switch (currentStep) {
      case "comment":
        return reqs.some(
          (r) => r.requirement_type === "comment" && r.is_mandatory,
        );
      case "attachment":
        return reqs.some(
          (r) => r.requirement_type === "attachment" && r.is_mandatory,
        );
      case "feedback":
        return reqs.some(
          (r) => r.requirement_type === "feedback" && r.is_mandatory,
        );
      case "department":
        return !!trans?.auto_detect_department && !trans?.assign_department_id;
      case "user":
        return (
          !!(trans?.manual_select_user || trans?.auto_match_user) &&
          !trans?.assign_user_id
        );
      case "duration":
        return true;
      case "field_changes":
        return trans?.field_changes?.some((f) => f.is_required) || false;
      default:
        return false;
    }
  }, [currentStep, selectedTransition]);

  const canGoNext = useMemo(() => {
    if (currentStep === "select") return !!selectedTransition;
    if (!isMandatory) return true;
    switch (currentStep) {
      case "department":
        return !!selectedDepartmentId;
      case "user":
        return true;
      case "duration":
        return !!readyToCloseDuration;
      case "feedback":
        return feedbackRating > 0;
      case "attachment":
        return !!attachment;
      case "comment":
        return !!comment.trim();
      case "field_changes":
        return (
          transition?.field_changes?.every(
            (f) => !f.is_required || fieldValues[f.field_name],
          ) || false
        );
      default:
        return true;
    }
  }, [
    currentStep,
    selectedTransition,
    isMandatory,
    selectedDepartmentId,
    selectedUserIds,
    readyToCloseDuration,
    feedbackRating,
    attachment,
    comment,
    fieldValues,
    transition,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-2xl w-full animate-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <div>
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              {t("incidents.bulkTransition")}
            </h3>
            {selectedTransition && currentStep !== "executing" && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                {t("incidents.stepOf", {
                  current: currentStepIndex + 1,
                  total: transitionSteps.length,
                })}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            disabled={isExecuting}
            className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Dots */}
        {selectedTransition && currentStep !== "executing" && (
          <div className="px-6 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] flex justify-center gap-1.5">
            {transitionSteps.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-full transition-all duration-200",
                  idx === currentStepIndex
                    ? "w-4 h-2 bg-[hsl(var(--primary))]"
                    : idx < currentStepIndex
                      ? "w-2 h-2 bg-[hsl(var(--primary)/0.4)]"
                      : "w-2 h-2 bg-[hsl(var(--border))]",
                )}
              />
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === "executing" ? (
            <div className="space-y-6 py-4">
              {isExecuting ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="w-full max-w-md bg-[hsl(var(--muted))] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[hsl(var(--primary))] h-full transition-all duration-300"
                      style={{
                        width: `${(progress.current / progress.total) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm font-medium">
                    {t("common.processing")} {progress.current} /{" "}
                    {progress.total}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-[hsl(var(--muted)/0.5)] rounded-lg">
                    <h4 className="text-sm font-semibold mb-2">
                      {t("common.results")}
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {results.map((res, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs py-1 border-b border-[hsl(var(--border))] last:border-0"
                        >
                          <span className="text-[hsl(var(--muted-foreground))]">
                            {
                              selectedIncidents.find((i) => i.id === res.id)
                                ?.incident_number
                            }
                          </span>
                          {res.success ? (
                            <span className="text-green-600 flex items-center gap-1 font-medium">
                              <CheckCircle2 className="w-3 h-3" />{" "}
                              {t("common.success")}
                            </span>
                          ) : (
                            <span
                              className="text-destructive flex items-center gap-1 font-medium"
                              title={res.error}
                            >
                              <AlertTriangle className="w-3 h-3" />{" "}
                              {res.error?.substring(0, 30)}...
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : currentStep === "select" ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-[hsl(var(--foreground))]">
                {t("incidents.selectTransition")}
              </label>
              {isLoadingTransitions ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-3 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {t("incidents.loadingTransitions")}
                  </p>
                </div>
              ) : availableTransitions.length === 0 ? (
                <div className="p-8 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-amber-700 font-medium">
                    {t("incidents.noTransitionsAvailable")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {availableTransitions.map((at) => (
                    <button
                      key={at.transition.id}
                      onClick={() => setSelectedTransition(at)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left group",
                        selectedTransition?.transition.id === at.transition.id
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)] shadow-sm"
                          : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.3)] hover:bg-[hsl(var(--muted)/0.3)]",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            selectedTransition?.transition.id ===
                              at.transition.id
                              ? "bg-[hsl(var(--primary)/0.1)]"
                              : "bg-[hsl(var(--muted))]",
                          )}
                        >
                          <Play
                            className={cn(
                              "w-4 h-4",
                              selectedTransition?.transition.id ===
                                at.transition.id
                                ? "text-[hsl(var(--primary))]"
                                : "text-[hsl(var(--muted-foreground))]",
                            )}
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-[hsl(var(--foreground))]">
                            {at.transition.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                            <span className="px-1.5 py-0.5 bg-[hsl(var(--muted))] rounded">
                              {at.transition.from_state?.name}
                            </span>
                            <ChevronRight className="w-3 h-3" />
                            <span className="px-1.5 py-0.5 bg-[hsl(var(--muted))] rounded">
                              {at.transition.to_state?.name}
                            </span>
                          </div>
                        </div>
                      </div>
                      {selectedTransition?.transition.id ===
                        at.transition.id && (
                        <div className="bg-[hsl(var(--primary))] rounded-full p-1">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : currentStep === "department" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-[hsl(var(--primary))]" />
                <h4 className="font-semibold">
                  {t("incidents.departmentAssignment")}
                  {isMandatory && (
                    <span className="text-[hsl(var(--destructive))] ml-1">
                      *
                    </span>
                  )}
                </h4>
              </div>

              {transition?.assign_department_id ? (
                <div className="p-4 bg-[hsl(var(--muted)/0.3)] rounded-lg border border-[hsl(var(--border))]">
                  <p className="text-sm">
                    {t("incidents.willAssignTo")}{" "}
                    <span className="font-bold text-[hsl(var(--primary))]">
                      {transition.assign_department?.name}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {t("incidents.selectDepartmentForBulk")}
                  </p>
                  {isMatchLoading ? (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-4 h-4 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
                      {t("incidents.loadingAssignmentOptions")}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deptMatchData?.data?.departments &&
                      deptMatchData.data.departments.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                          {deptMatchData.data.departments.map((dept) => (
                            <button
                              key={dept.id}
                              onClick={() => setSelectedDepartmentId(dept.id)}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg border transition-all text-left text-sm",
                                selectedDepartmentId === dept.id
                                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)] ring-1 ring-[hsl(var(--primary))]"
                                  : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.3)]",
                              )}
                            >
                              <span>{dept.name}</span>
                              {selectedDepartmentId === dept.id && (
                                <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))]" />
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {t("incidents.chooseFromHierarchy")}
                          </p>
                          <TreeSelect
                            data={
                              (allDeptsData?.data as unknown as TreeSelectNode[]) ||
                              []
                            }
                            value={selectedDepartmentId}
                            onChange={(val) => setSelectedDepartmentId(val)}
                            placeholder={t("incidents.selectDepartment")}
                            leafOnly={false}
                            maxHeight="240px"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : currentStep === "user" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-[hsl(var(--primary))]" />
                <h4 className="font-semibold">
                  {t("incidents.userAssignment")}
                  {/* {isMandatory && (
                    <span className="text-[hsl(var(--destructive))] ml-1">
                      *
                    </span>
                  )} */}
                </h4>
              </div>

              {transition?.assign_user_id ? (
                <div className="p-4 bg-[hsl(var(--muted)/0.3)] rounded-lg border border-[hsl(var(--border))]">
                  <p className="text-sm">
                    {t("incidents.willAssignTo")}{" "}
                    <span className="font-bold text-[hsl(var(--primary))]">
                      {transition.assign_user?.first_name ||
                        transition.assign_user?.username}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {t("incidents.selectUserForBulk")}
                  </p>
                  <div className="space-y-3">
                    {isUserMatchLoading || isUsersByRolesLoading ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <div className="w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {t("incidents.searchingUsers")}
                        </p>
                      </div>
                    ) : (
                      <>
                        {userMatchData?.data?.users &&
                        userMatchData.data.users.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                            {userMatchData.data.users.map((u) => (
                              <button
                                key={u.id}
                                onClick={() => setSelectedUserIds([u.id])}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-lg border transition-all text-left text-sm",
                                  selectedUserIds.includes(u.id)
                                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)] ring-1 ring-[hsl(var(--primary))]"
                                    : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.3)]",
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                                  <span>
                                    {u.first_name
                                      ? `${u.first_name} ${u.last_name || ""}`
                                      : u.username}
                                  </span>
                                </div>
                                {selectedUserIds.includes(u.id) && (
                                  <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))]" />
                                )}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {transition?.manual_select_user && (
                          <div className="space-y-2">
                            <p className="text-xs text-[hsl(var(--muted-foreground))] font-medium mt-4">
                              {t("incidents.allEligibleUsers")}
                            </p>
                            <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1 border border-[hsl(var(--border))] rounded-lg p-2 bg-[hsl(var(--muted)/0.1)]">
                              {usersByRolesData?.data &&
                              usersByRolesData.data.length > 0 ? (
                                usersByRolesData.data.map((u) => (
                                  <button
                                    key={u.id}
                                    onClick={() => setSelectedUserIds([u.id])}
                                    className={cn(
                                      "flex items-center justify-between p-2 rounded-md transition-all text-left text-xs",
                                      selectedUserIds.includes(u.id)
                                        ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                                        : "hover:bg-[hsl(var(--muted))]",
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <User className="w-3.5 h-3.5" />
                                      <span>
                                        {u.first_name
                                          ? `${u.first_name} ${u.last_name || ""}`
                                          : u.username}
                                      </span>
                                    </div>
                                    {selectedUserIds.includes(u.id) && (
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                ))
                              ) : (
                                <p className="text-xs text-[hsl(var(--muted-foreground))] p-4 text-center italic">
                                  {t("incidents.noEligibleUsersFound")}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* No user exists fallback */}
                        {(!userMatchData?.data?.users ||
                          userMatchData.data.users.length === 0) &&
                          (!transition?.manual_select_user ||
                            !usersByRolesData?.data ||
                            usersByRolesData.data.length === 0) && (
                            <div className="p-6 rounded-xl text-center border-2 border-dashed flex flex-col items-center gap-2 bg-muted/30 border-border text-muted-foreground">
                              <User className="w-8 h-8 opacity-50" />
                              <div className="space-y-1">
                                <p className="font-semibold text-sm">
                                  {t("incidents.noUserExists")}
                                </p>
                                <p className="text-xs opacity-80">
                                  {t("incidents.noUserExistsDesc")}
                                </p>
                              </div>
                            </div>
                          )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : currentStep === "field_changes" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Tags className="w-5 h-5 text-[hsl(var(--primary))]" />
                <h4 className="font-semibold">
                  {t("incidents.fieldChanges")}
                  {isMandatory && (
                    <span className="text-[hsl(var(--destructive))] ml-1">
                      *
                    </span>
                  )}
                </h4>
              </div>
              <div className="space-y-4">
                {transition?.field_changes?.map((fc) => (
                  <div key={fc.field_name} className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      {fc.label || fc.field_name}
                      {fc.is_required && (
                        <span className="text-[hsl(var(--destructive))] ml-1">
                          *
                        </span>
                      )}
                    </label>

                    {fc.field_name === "department_id" ? (
                      <TreeSelect
                        data={
                          (deptsTreeData?.data as unknown as TreeSelectNode[]) ||
                          []
                        }
                        value={fieldValues[fc.field_name]}
                        onChange={(val) =>
                          setFieldValues((prev) => ({
                            ...prev,
                            [fc.field_name]: val,
                          }))
                        }
                        placeholder={t("incidents.selectValue", {
                          field: fc.label || t("common.department"),
                        })}
                        leafOnly={false}
                        maxHeight="240px"
                      />
                    ) : fc.field_name === "location_id" ? (
                      <TreeSelect
                        data={
                          (locsTreeData?.data as unknown as TreeSelectNode[]) ||
                          []
                        }
                        value={fieldValues[fc.field_name]}
                        onChange={(val) =>
                          setFieldValues((prev) => ({
                            ...prev,
                            [fc.field_name]: val,
                          }))
                        }
                        placeholder={t("incidents.selectValue", {
                          field: fc.label || t("common.location"),
                        })}
                        leafOnly={false}
                        maxHeight="240px"
                      />
                    ) : fc.field_name === "classification_id" ? (
                      <TreeSelect
                        data={
                          (classTreeData?.data as unknown as TreeSelectNode[]) ||
                          []
                        }
                        value={fieldValues[fc.field_name]}
                        onChange={(val) =>
                          setFieldValues((prev) => ({
                            ...prev,
                            [fc.field_name]: val,
                          }))
                        }
                        placeholder={t("incidents.selectValue", {
                          field: fc.label || t("common.classification"),
                        })}
                        leafOnly={false}
                        maxHeight="240px"
                      />
                    ) : (
                      <input
                        type="text"
                        value={fieldValues[fc.field_name] || ""}
                        onChange={(e) =>
                          setFieldValues((prev) => ({
                            ...prev,
                            [fc.field_name]: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : currentStep === "duration" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-[hsl(var(--primary))]" />
                <h4 className="font-semibold">
                  {t("incidents.readyToCloseDuration")}
                  {isMandatory && (
                    <span className="text-[hsl(var(--destructive))] ml-1">
                      *
                    </span>
                  )}
                </h4>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {t("incidents.readyToCloseDesc")}
                </p>
                <Select
                  options={(durationOptionsData?.data || []).map((opt) => ({
                    label: opt,
                    value: opt,
                  }))}
                  value={readyToCloseDuration}
                  onChange={(val) => setReadyToCloseDuration(val.target.value)}
                  placeholder={t("incidents.selectDurationPlaceholder")}
                />
              </div>
            </div>
          ) : currentStep === "feedback" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-[hsl(var(--primary))]" />
                <h4 className="font-semibold">
                  {t("incidents.feedback")}
                  {isMandatory && (
                    <span className="text-[hsl(var(--destructive))] ml-1">
                      *
                    </span>
                  )}
                </h4>
              </div>
              <div className="space-y-6">
                <div className="flex justify-center gap-4 py-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className={cn(
                        "transition-transform hover:scale-110",
                        feedbackRating >= star
                          ? "text-yellow-400"
                          : "text-[hsl(var(--muted))]",
                      )}
                    >
                      <svg
                        className="w-10 h-10 fill-current"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
                <textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder={t("incidents.additionalFeedbackPlaceholder")}
                  className="w-full px-4 py-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] resize-none"
                  rows={3}
                />
              </div>
            </div>
          ) : currentStep === "attachment" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="w-5 h-5 text-[hsl(var(--primary))]" />
                <h4 className="font-semibold">
                  {t("incidents.attachment")}
                  {isMandatory && (
                    <span className="text-[hsl(var(--destructive))] ml-1">
                      *
                    </span>
                  )}
                </h4>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {t("incidents.uploadAttachmentDesc")}
                </p>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-[hsl(var(--border))] border-dashed rounded-lg hover:border-[hsl(var(--primary)/0.5)] transition-colors cursor-pointer group relative">
                  <input
                    type="file"
                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1 text-center">
                    {attachment ? (
                      <div className="flex flex-col items-center">
                        <Paperclip className="mx-auto h-8 w-8 text-[hsl(var(--primary))]" />
                        <p className="text-sm font-medium mt-2">
                          {attachment.name}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setAttachment(null);
                          }}
                          className="text-xs text-destructive hover:underline mt-1"
                        >
                          {t("common.remove")}
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-8 w-8 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))]" />
                        <div className="flex text-sm text-[hsl(var(--muted-foreground))]">
                          <span className="relative cursor-pointer bg-[hsl(var(--background))] rounded-md font-medium text-[hsl(var(--primary))] hover:text-[hsl(var(--primary)/0.8)] focus-within:outline-none">
                            {t("incidents.uploadAFile")}
                          </span>
                          <p className="pl-1">{t("incidents.orDragAndDrop")}</p>
                        </div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {t("incidents.uploadLimits")}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : currentStep === "comment" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-5 h-5 text-[hsl(var(--primary))]" />
                <h4 className="font-semibold">
                  {t("incidents.comment")}
                  {isMandatory && (
                    <span className="text-[hsl(var(--destructive))] ml-1">
                      *
                    </span>
                  )}
                </h4>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {t("common.comment")}
                    {isMandatory && (
                      <span className="text-[hsl(var(--destructive))] ml-1">
                        *
                      </span>
                    )}
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t("incidents.enterTransitionComment")}
                    rows={4}
                    className="w-full px-4 py-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] resize-none"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex items-center justify-between gap-3 bg-[hsl(var(--muted)/0.1)]">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={
                currentStepIndex === 0 || isExecuting || results.length > 0
              }
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              {t("common.back")}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {results.length === 0 && !isExecuting && (
              <Button variant="outline" onClick={handleClose}>
                {t("common.cancel")}
              </Button>
            )}

            {results.length > 0 ? (
              <Button onClick={handleClose} className="min-w-[120px]">
                {t("common.close")}
              </Button>
            ) : (
              <Button
                disabled={!canGoNext || isExecuting}
                onClick={handleNext}
                rightIcon={
                  currentStepIndex === transitionSteps.length - 1 ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )
                }
                className="min-w-[120px]"
              >
                {currentStepIndex === transitionSteps.length - 1
                  ? t("incidents.execute")
                  : t("common.next")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
