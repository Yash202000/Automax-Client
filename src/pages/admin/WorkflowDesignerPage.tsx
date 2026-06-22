import React, { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  CheckCircle2,
  GitBranch,
  Circle,
  ArrowRight,
  ArrowLeft,
  Shield,
  FileText,
  Zap,
  AlertTriangle,
  Loader2,
  Settings,
  Layout,
  Mail,
  ClipboardList,
  Download,
  PenLine,
} from "lucide-react";
import {
  workflowApi,
  roleApi,
  classificationApi,
  locationApi,
  departmentApi,
  userApi,
  lookupApi,
  escalationPolicyApi,
  feedbackTemplateApi,
  commentTemplateApi,
  notificationTemplateApi,
} from "../../api/admin";
import { HierarchicalCheckboxTree } from "../../components/workflow/HierarchicalCheckboxTree";
import type {
  WorkflowState,
  WorkflowTransition,
  WorkflowStateCreateRequest,
  WorkflowStateUpdateRequest,
  WorkflowTransitionCreateRequest,
  WorkflowTransitionUpdateRequest,
  WorkflowUpdateRequest,
  TransitionRequirementRequest,
  TransitionActionRequest,
  TransitionFieldChangeRequest,
  Classification,
  Location,
  Department,
  User,
  IncidentSource,
  IncidentFormField,
  LookupCategory,
  NotificationTemplate,
} from "../../types";
import {
  INCIDENT_SOURCES,
  EMAIL_RECIPIENTS,
  type EmailRecipientType,
  type TransitionEmailConfig,
  type TransitionSmsConfig,
} from "../../types";
import { cn } from "@/lib/utils";
import { Button } from "../../components/ui";
import { WorkflowCanvas } from "../../components/workflow";
import { IntegrationTriggersPanel } from "./components/IntegrationTriggersPanel";
import {
  validateRequired,
  validateName,
  validateCode,
} from "@/utils/validations";

type TabType = "visual" | "states" | "transitions" | "matching" | "fields";

const parseCommaSeparatedPhones = (value: string) =>
  value
    .split(",")
    .map((phone) => phone.trim())
    .filter(Boolean);

const parseCommaSeparatedEmails = (value: string) =>
  value
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

const sanitizeSmsPhoneInput = (value: string) => value.replace(/[^\d+,]/g, "");

interface StateFormData {
  name: string;
  name_ar: string;
  code: string;
  description: string;
  description_ar: string;
  state_type: "initial" | "normal" | "terminal";
  color: string;
  sla_hours: number | undefined;
  sla_unit: string;
  escalation_policy_id: string | undefined;
  is_mergable: boolean;
  is_ai_qa: boolean;
  is_ready_to_close: boolean;
  is_partial_close: boolean;
  duration_options: string; // comma-separated input string
  viewable_role_ids: string[];
  editable_role_ids: string[];
  // Creation-time assignment
  assign_user_id: string;
  assignment_role_ids: string[];
  auto_match_user: boolean;
  manual_select_user: boolean;
  // New incident notification templates (initial states only)
  new_incident_email_template_code: string;
  new_incident_sms_template_code: string;
}
type StateFormErrors = Partial<Record<"name" | "code", string>>;
interface TransitionFormData {
  name: string;
  name_ar: string;
  code: string;
  description: string;
  description_ar: string;
  from_state_id: string;
  to_state_id: string;
  role_ids: string[];
  // Department Assignment
  assign_department_id: string;
  auto_detect_department: boolean;
  department_type_filter: "" | "internal" | "external";
  // User Assignment
  assign_user_id: string;
  assignment_role_ids: string[];
  auto_match_user: boolean;
  manual_select_user: boolean;
  is_rejection: boolean;
  is_not_belong: boolean;
  is_missing_info: boolean;
  is_reopen: boolean;
  is_final_close: boolean;
  require_assignee: boolean;
}
type TransitionFormErrors = Partial<
  Record<"name" | "code" | "fromState" | "toState", string>
>;

const initialStateFormData: StateFormData = {
  name: "",
  name_ar: "",
  code: "",
  description: "",
  description_ar: "",
  state_type: "normal",
  color: "#6366f1",
  sla_hours: undefined,
  sla_unit: "hours",
  escalation_policy_id: undefined,
  is_mergable: false,
  is_ai_qa: false,
  is_ready_to_close: false,
  is_partial_close: false,
  duration_options: "",
  viewable_role_ids: [],
  editable_role_ids: [],
  // Creation-time assignment
  assign_user_id: "",
  assignment_role_ids: [],
  auto_match_user: false,
  manual_select_user: false,
  new_incident_email_template_code: "",
  new_incident_sms_template_code: "",
};

const initialTransitionFormData: TransitionFormData = {
  name: "",
  name_ar: "",
  code: "",
  description: "",
  description_ar: "",
  from_state_id: "",
  to_state_id: "",
  role_ids: [],
  // Department Assignment
  assign_department_id: "",
  auto_detect_department: false,
  department_type_filter: "",
  // User Assignment
  assign_user_id: "",
  assignment_role_ids: [],
  auto_match_user: false,
  manual_select_user: false,
  is_rejection: false,
  is_not_belong: false,
  is_missing_info: false,
  is_reopen: false,
  is_final_close: false,
  require_assignee: false,
};

const STATE_COLORS = [
  { name: "Purple", value: "#6366f1" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Green", value: "#10b981" },
  { name: "Yellow", value: "#f59e0b" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Gray", value: "#6b7280" },
];

// Static constant moved outside component to avoid unstable reference in useMemo deps
const baseFormFields: {
  field: IncidentFormField;
  label: string;
  description: string;
}[] = [
  {
    field: "description",
    label: "Description",
    description: "Detailed incident description",
  },
  {
    field: "classification_id",
    label: "Classification",
    description: "Incident category/type",
  },
  {
    field: "source",
    label: "Source",
    description: "Where the incident originated",
  },
  {
    field: "source_incident_id",
    label: "Source Incident Reference",
    description: "Link to related incident/complaint/query",
  },
  {
    field: "assignee_id",
    label: "Assignee",
    description: "User assigned to handle",
  },
  {
    field: "department_id",
    label: "Department",
    description: "Responsible department",
  },
  { field: "location_id", label: "Location", description: "Physical location" },
  {
    field: "geolocation",
    label: "Geolocation",
    description: "GPS coordinates (latitude & longitude)",
  },
  { field: "due_date", label: "Due Date", description: "Resolution deadline" },
  {
    field: "reporter_name",
    label: "Caller Name",
    description: "Name of caller",
  },
  {
    field: "reporter_email",
    label: "Caller Email",
    description: "Email of caller",
  },
  {
    field: "reporter_phone",
    label: "Caller Phone Number",
    description: "Phone number of caller",
  },
  {
    field: "attachments",
    label: "Attachments",
    description: "File attachments for the incident",
  },
  {
    field: "comment",
    label: "Comment",
    description: "Comment required when creating the incident",
  },
];

const TemplateModalBody: React.FC<{
  type: "comment" | "feedback";
  transitionId: string;
}> = ({ type, transitionId }) => {
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const isDuplicate = (text: string, excludeId?: string) => {
    const value = text.trim().toLowerCase();

    return templates.some((tpl) => {
      const existing =
        type === "feedback" ? tpl.feedback_text : tpl.comment_text;

      return existing?.trim().toLowerCase() === value && tpl.id !== excludeId;
    });
  };

  const queryKey =
    type === "feedback"
      ? ["feedback-templates", transitionId]
      : ["comment-templates", transitionId];

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey,
    queryFn: () =>
      type === "feedback"
        ? feedbackTemplateApi.listByTransition(transitionId)
        : commentTemplateApi.listByTransition(transitionId),
  });

  const templates: any[] = data?.data || [];

  const createMutation = useMutation({
    mutationFn: (text: string) => {
      const payload: any = {
        [type === "feedback" ? "feedback_text" : "comment_text"]: text,
        workflow_transition_id: transitionId,
      };
      return type === "feedback"
        ? feedbackTemplateApi.create(payload)
        : commentTemplateApi.create(payload);
    },
    onSuccess: () => {
      refetch();
      setNewText("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      type === "feedback"
        ? feedbackTemplateApi.update(id, {
            feedback_text: text,
          })
        : commentTemplateApi.update(id, {
            comment_text: text,
          }),
    onSuccess: () => {
      refetch();
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      setDeletingId(id);
      return type === "feedback"
        ? feedbackTemplateApi.delete(id)
        : commentTemplateApi.delete(id);
    },
    onSettled: () => setDeletingId(null),
    onSuccess: () => refetch(),
  });

  const label = type === "feedback" ? "feedback" : "comment";

  return (
    <div className="overflow-y-auto max-h-[calc(80vh-64px)] p-5 space-y-3">
      {isLoading || isRefetching ? (
        <div className="flex items-center justify-center gap-2 py-6">
          <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--muted-foreground))]" />
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            {t("common.loading")}
          </span>
        </div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))] italic text-center py-4">
          {type === "feedback"
            ? t("workflows.noFeedbackOptionsYet")
            : t("workflows.noCommentOptionsYet")}
        </p>
      ) : (
        templates.map((tpl) => (
          <div
            key={tpl.id}
            className="flex items-center gap-2 p-2.5 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg"
          >
            {editingId === tpl.id ? (
              <>
                <input
                  type="text"
                  value={editingText}
                  autoFocus
                  onChange={(e) => {
                    setEditingText(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const eText = editingText.trim();
                      if (!eText) return;

                      if (isDuplicate(eText, tpl.id)) {
                        setError(
                          t(
                            type === "feedback"
                              ? "workflows.feedbackMustBeUnique"
                              : "workflows.commentMustBeUnique",
                            type === "feedback"
                              ? "Feedback should be unique"
                              : "Comment should be unique",
                          ),
                        );
                        return;
                      }

                      setError(null);
                      updateMutation.mutate({ id: tpl.id, text: eText });
                    }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 px-2 py-1 bg-[hsl(var(--background))] border border-[hsl(var(--primary))] rounded-md text-sm focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const eText = editingText.trim();
                    if (!eText) return;

                    if (isDuplicate(eText, tpl.id)) {
                      setError(
                        t(
                          type === "feedback"
                            ? "workflows.feedbackMustBeUnique"
                            : "workflows.commentMustBeUnique",
                          type === "feedback"
                            ? "Feedback should be unique"
                            : "Comment should be unique",
                        ),
                      );
                      return;
                    }

                    setError(null);
                    updateMutation.mutate({ id: tpl.id, text: eText });
                  }}
                  className="p-1 text-emerald-600 hover:bg-emerald-500/10 rounded"
                >
                  {updateMutation?.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-[hsl(var(--foreground))]">
                  {type === "feedback" ? tpl.feedback_text : tpl.comment_text}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(tpl.id);
                    setEditingText(
                      type === "feedback"
                        ? tpl.feedback_text
                        : tpl.comment_text,
                    );
                  }}
                  className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(tpl.id)}
                  className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors disabled:opacity-40"
                >
                  {deletingId === tpl.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </>
            )}
          </div>
        ))
      )}
      {error && <p className="text-sm text-red-500 px-1">{error}</p>}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          placeholder={`New ${label} option...`}
          value={newText}
          onChange={(e) => {
            setNewText(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const value = newText.trim();
              if (!value) return;

              if (isDuplicate(value)) {
                setError(
                  t(
                    type === "feedback"
                      ? "workflows.feedbackMustBeUnique"
                      : "workflows.commentMustBeUnique",
                    type === "feedback"
                      ? "Feedback should be unique"
                      : "Comment should be unique",
                  ),
                );
                return;
              }

              setError(null);
              createMutation.mutate(value);
            }
          }}
          className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
        />
        <Button
          onClick={() => {
            const value = newText.trim();
            if (!value) return;

            if (isDuplicate(value)) {
              setError(
                t(
                  type === "feedback"
                    ? "workflows.feedbackMustBeUnique"
                    : "workflows.commentMustBeUnique",
                  type === "feedback"
                    ? "Feedback should be unique"
                    : "Comment should be unique",
                ),
              );
              return;
            }

            setError(null);
            createMutation.mutate(value);
          }}
          disabled={!newText.trim()}
          isLoading={createMutation.isPending}
          leftIcon={
            !createMutation.isPending ? <Plus className="w-4 h-4" /> : undefined
          }
        >
          {t("common.add")}
        </Button>
      </div>
    </div>
  );
};

export const WorkflowDesignerPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>("visual");
  const [isStateModalOpen, setIsStateModalOpen] = useState(false);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingState, setEditingState] = useState<WorkflowState | null>(null);
  const [editingTransition, setEditingTransition] =
    useState<WorkflowTransition | null>(null);
  const [configuringTransition, setConfiguringTransition] =
    useState<WorkflowTransition | null>(null);
  const [stateFormData, setStateFormData] =
    useState<StateFormData>(initialStateFormData);
  const [transitionFormData, setTransitionFormData] =
    useState<TransitionFormData>(initialTransitionFormData);
  const [deleteStateConfirm, setDeleteStateConfirm] = useState<string | null>(
    null,
  );
  const [deleteTransitionConfirm, setDeleteTransitionConfirm] = useState<
    string | null
  >(null);

  // Requirements, Actions & Field Changes config
  const [requirements, setRequirements] = useState<
    TransitionRequirementRequest[]
  >([]);
  const [actions, setActions] = useState<TransitionActionRequest[]>([]);
  const [customEmailInputs, setCustomEmailInputs] = useState<
    Record<number, string>
  >({});
  const [smsPhoneInputs, setSmsPhoneInputs] = useState<Record<number, string>>(
    {},
  );
  const [fieldChanges, setFieldChanges] = useState<
    TransitionFieldChangeRequest[]
  >([]);

  // Matching configuration
  const [matchingConfig, setMatchingConfig] = useState<{
    classification_ids: string[];
    location_ids: string[];
    sources: IncidentSource[];
    priorities: number[];
    record_type:
      | "incident"
      | "request"
      | "complaint"
      | "query"
      | "both"
      | "all";
  }>({
    classification_ids: [],
    location_ids: [],
    sources: [],
    priorities: [],
    record_type: "incident",
  });

  // Required fields configuration
  const [requiredFields, setRequiredFields] = useState<IncidentFormField[]>([]);
  const [optionalFields, setOptionalFields] = useState<IncidentFormField[]>([]);

  // Convert to request role IDs
  const [convertToRequestRoleIds, setConvertToRequestRoleIds] = useState<
    string[]
  >([]);

  // Merge allowed role IDs
  const [mergeAllowedRoleIds, setMergeAllowedRoleIds] = useState<string[]>([]);

  const [templateModal, setTemplateModal] = React.useState<{
    type: "comment" | "feedback";
    transitionId: string;
    transitionName: string;
  } | null>(null);

  // Inline test panel state per action index: {recipient, isOpen, result}
  const [actionTestState, setActionTestState] = useState<
    Record<
      number,
      {
        open: boolean;
        recipient: string;
        status: string | null;
        error: string | null;
      }
    >
  >({});

  const [stateDuplicateErrors, setStateDuplicateErrors] = useState({
    name: "",
    code: "",
  });

  const [transitionDuplicateErrors, setTransitionDuplicateErrors] = useState({
    name: "",
    code: "",
  });

  const [stateErrors, setStateErrors] = useState<StateFormErrors>({});
  const [transitionErrors, setTransitionErrors] =
    useState<TransitionFormErrors>({});

  const sendTestMutation = useMutation({
    mutationFn: notificationTemplateApi.sendTest,
    onSuccess: (data, variables) => {
      const status = data?.data?.status ?? "sent";
      toast.success(
        `Test ${variables.channel.toUpperCase()} sent — status: ${status}`,
      );
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? "Test send failed");
    },
  });

  const { data: workflowData, isLoading } = useQuery({
    queryKey: ["admin", "workflow", id],
    queryFn: () => workflowApi.getById(id!),
    enabled: !!id,
  });

  const { data: statesData } = useQuery({
    queryKey: ["admin", "workflow", id, "states"],
    queryFn: () => workflowApi.listStates(id!),
    enabled: !!id,
  });

  const { data: transitionsData } = useQuery({
    queryKey: ["admin", "workflow", id, "transitions"],
    queryFn: () => workflowApi.listTransitions(id!),
    enabled: !!id,
  });

  const { data: rolesData } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => roleApi.list(),
  });

  // Fetch classifications based on selected record type
  const { data: classificationsData } = useQuery({
    queryKey: ["admin", "classifications", "tree", matchingConfig.record_type],
    queryFn: () => classificationApi.getTree(matchingConfig.record_type),
    enabled: !!matchingConfig.record_type,
  });

  const { data: locationsData } = useQuery({
    queryKey: ["admin", "locations", "tree"],
    queryFn: () => locationApi.getTree(),
  });

  const { data: departmentsData } = useQuery({
    queryKey: ["admin", "departments"],
    queryFn: () => departmentApi.list(),
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => userApi.list(1, 1000), // Get all users
  });

  const { data: lookupCategoriesData } = useQuery({
    queryKey: ["admin", "lookups", "categories"],
    queryFn: () => lookupApi.listCategories(),
  });

  const { data: escalationPoliciesData } = useQuery({
    queryKey: ["escalation-policies"],
    queryFn: () => escalationPolicyApi.list(),
  });

  const { data: emailTemplatesData } = useQuery({
    queryKey: ["admin", "notification-templates", "email"],
    queryFn: () =>
      notificationTemplateApi.list({
        channel: "email",
        is_active: true,
        limit: 200,
      }),
  });

  const { data: smsTemplatesData } = useQuery({
    queryKey: ["admin", "notification-templates", "sms"],
    queryFn: () =>
      notificationTemplateApi.list({
        channel: "sms",
        is_active: true,
        limit: 200,
      }),
  });

  const workflow = workflowData?.data;
  const classifications: Classification[] = classificationsData?.data || [];
  const locations: Location[] = locationsData?.data || [];
  const departments: Department[] = departmentsData?.data || [];
  const users: User[] = usersData?.data || [];
  const states = statesData?.data || [];
  const transitions = transitionsData?.data || [];
  const roles = rolesData?.data || [];
  const lookupCategories: LookupCategory[] = (
    lookupCategoriesData?.data || []
  ).filter((cat) => cat.add_to_incident_form);
  const escalationPolicies = escalationPoliciesData?.data || [];
  const emailTemplates: NotificationTemplate[] = emailTemplatesData?.data || [];
  const smsTemplates: NotificationTemplate[] = smsTemplatesData?.data || [];

  // Get Priority and Severity categories for matching rules
  const allLookupCategories: LookupCategory[] =
    lookupCategoriesData?.data || [];
  const priorityCategory = allLookupCategories.find(
    (c) => c.code === "PRIORITY",
  );
  const priorityValues = (priorityCategory?.values || []).sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  // Available form fields including dynamic lookup categories
  const availableFormFields = React.useMemo(() => {
    const lookupFields = lookupCategories.map((cat) => ({
      field: `lookup:${cat.code}` as IncidentFormField,
      label: cat.name,
      description: cat.description || `${cat.name} lookup value`,
    }));
    return [...baseFormFields, ...lookupFields];
  }, [lookupCategories]);

  // Initialize matching config and required fields from workflow data
  useEffect(() => {
    if (workflow) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMatchingConfig({
        classification_ids: workflow.classifications?.map((c) => c.id) || [],
        location_ids: workflow.locations?.map((l) => l.id) || [],
        sources: workflow.sources || [],
        priorities: workflow.priorities || [],
        record_type:
          (workflow.record_type as
            | "incident"
            | "request"
            | "complaint"
            | "query"
            | "both"
            | "all") || "incident",
      });

      setRequiredFields(workflow.required_fields || []);
      setOptionalFields(workflow.optional_fields || []);

      setConvertToRequestRoleIds(
        workflow.convert_to_request_roles?.map((r) => r.id) || [],
      );

      setMergeAllowedRoleIds(
        workflow.merge_allowed_roles?.map((r) => r.id) || [],
      );
    }
  }, [workflow]);

  // Matching config mutation
  const updateMatchingMutation = useMutation({
    mutationFn: (config: typeof matchingConfig) =>
      workflowApi.update(id!, {
        classification_ids: config.classification_ids,
        location_ids: config.location_ids,
        sources: config.sources,
        priorities: config.priorities,
        record_type: config.record_type,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "workflow", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "workflows"] });
      toast.success("Matching rules updated successfully");
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to update matching rules";

      // Check if it's a duplicate workflow conflict
      if (errorMessage.includes("workflow rules conflict")) {
        toast.error("Duplicate Workflow Rules", {
          description: errorMessage,
          duration: 6000,
        });
      } else {
        toast.error("Failed to update matching rules", {
          description: errorMessage,
          duration: 5000,
        });
      }
      console.error("Update matching rules error:", error);
    },
  });

  // Required/optional fields mutation
  const updateRequiredFieldsMutation = useMutation({
    mutationFn: ({
      required,
      optional,
    }: {
      required: IncidentFormField[];
      optional: IncidentFormField[];
    }) =>
      workflowApi.update(id!, {
        required_fields: required,
        optional_fields: optional,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "workflow", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "workflows"] });
    },
  });

  // Convert to request roles mutation
  const updateConvertToRequestRolesMutation = useMutation({
    mutationFn: (roleIds: string[]) =>
      workflowApi.update(id!, {
        convert_to_request_role_ids: roleIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "workflow", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "workflows"] });
    },
  });

  // Merge allowed roles mutation
  const updateMergeAllowedRolesMutation = useMutation({
    mutationFn: (roleIds: string[]) =>
      workflowApi.update(id!, {
        merge_allowed_role_ids: roleIds,
      }),
    onSuccess: (data) => {
      // Update local state with saved roles
      if (data.data) {
        setMergeAllowedRoleIds(
          data.data.merge_allowed_roles?.map((r) => r.id) || [],
        );
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "workflow", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "workflows"] });
      toast.success("Merge permissions updated successfully");
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to update merge permissions";
      toast.error("Failed to update merge permissions", {
        description: errorMessage,
        duration: 5000,
      });
      console.error("Update merge permissions error:", error);
    },
  });

  // Canvas layout mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id: workflowId,
      data,
    }: {
      id: string;
      data: WorkflowUpdateRequest;
    }) => workflowApi.update(workflowId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "workflow", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "workflows"] });
    },
  });

  // State mutations
  const createStateMutation = useMutation({
    mutationFn: (data: WorkflowStateCreateRequest) =>
      workflowApi.createState(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "workflow", id] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "workflow", id, "states"],
      });
      closeStateModal();
    },
  });

  const updateStateMutation = useMutation({
    mutationFn: ({
      workflowId,
      stateId,
      data,
    }: {
      workflowId?: string;
      stateId: string;
      data: WorkflowStateUpdateRequest;
    }) => workflowApi.updateState(workflowId || id!, stateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "workflow", id] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "workflow", id, "states"],
      });
      closeStateModal();
    },
  });

  const deleteStateMutation = useMutation({
    mutationFn: (stateId: string) => workflowApi.deleteState(id!, stateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "workflow", id] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "workflow", id, "states"],
      });
      setDeleteStateConfirm(null);
    },
  });

  // Transition mutations
  const createTransitionMutation = useMutation({
    mutationFn: (data: WorkflowTransitionCreateRequest) =>
      workflowApi.createTransition(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "workflow", id] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "workflow", id, "transitions"],
      });
      closeTransitionModal();
    },
  });

  const updateTransitionMutation = useMutation({
    mutationFn: ({
      transitionId,
      data,
    }: {
      transitionId: string;
      data: WorkflowTransitionUpdateRequest;
    }) => workflowApi.updateTransition(id!, transitionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "workflow", id] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "workflow", id, "transitions"],
      });
      closeTransitionModal();
    },
  });

  const deleteTransitionMutation = useMutation({
    mutationFn: (transitionId: string) =>
      workflowApi.deleteTransition(id!, transitionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "workflow", id] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "workflow", id, "transitions"],
      });
      setDeleteTransitionConfirm(null);
    },
  });

  // Config mutations
  const setRequirementsMutation = useMutation({
    mutationFn: ({
      transitionId,
      reqs,
    }: {
      transitionId: string;
      reqs: TransitionRequirementRequest[];
    }) => workflowApi.setTransitionRequirements(transitionId, reqs),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "workflow", id, "transitions"],
      });
    },
  });

  const setActionsMutation = useMutation({
    mutationFn: ({
      transitionId,
      acts,
    }: {
      transitionId: string;
      acts: TransitionActionRequest[];
    }) => workflowApi.setTransitionActions(transitionId, acts),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "workflow", id, "transitions"],
      });
    },
  });

  const setFieldChangesMutation = useMutation({
    mutationFn: ({
      transitionId,
      changes,
    }: {
      transitionId: string;
      changes: TransitionFieldChangeRequest[];
    }) => workflowApi.setTransitionFieldChanges(transitionId, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "workflow", id, "transitions"],
      });
    },
  });

  // State modal handlers
  const openCreateStateModal = () => {
    setStateDuplicateErrors({
      name: "",
      code: "",
    });
    setStateErrors({});
    setEditingState(null);
    setStateFormData(initialStateFormData);
    setIsStateModalOpen(true);
  };

  const openEditStateModal = (state: WorkflowState) => {
    setEditingState(state);
    setStateFormData({
      name: state.name,
      name_ar: state.name_ar || "",
      code: state.code,
      description: state.description,
      description_ar: state.description_ar || "",
      state_type: state.state_type as "initial" | "normal" | "terminal",
      color: state.color,
      sla_hours: state.sla_hours || undefined,
      sla_unit: state.sla_unit || "hours",
      escalation_policy_id: state.escalation_policy_id || "",
      is_mergable: state.is_mergable || false,
      is_ai_qa: state.is_ai_qa || false,
      is_ready_to_close: state.is_ready_to_close || false,
      is_partial_close: state.is_partial_close || false,
      duration_options: (state.duration_options || []).join(", "),
      viewable_role_ids: state.viewable_roles?.map((r) => r.id) || [],
      editable_role_ids: state.editable_roles?.map((r) => r.id) || [],
      // Creation-time assignment
      assign_user_id: state.assign_user_id || "",
      assignment_role_ids: state.assignment_roles?.map((r) => r.id) || [],
      auto_match_user: state.auto_match_user || false,
      manual_select_user: state.manual_select_user || false,
      new_incident_email_template_code:
        state.new_incident_email_template_code || "",
      new_incident_sms_template_code:
        state.new_incident_sms_template_code || "",
    });
    setIsStateModalOpen(true);
  };

  const closeStateModal = () => {
    setIsStateModalOpen(false);
    setEditingState(null);
    setStateFormData(initialStateFormData);
  };

  // Transition modal handlers
  const openCreateTransitionModal = () => {
    setTransitionDuplicateErrors({
      name: "",
      code: "",
    });
    setTransitionErrors({});
    setEditingTransition(null);
    setTransitionFormData(initialTransitionFormData);
    setIsTransitionModalOpen(true);
  };

  const openEditTransitionModal = (transition: WorkflowTransition) => {
    setEditingTransition(transition);
    setTransitionFormData({
      name: transition.name,
      name_ar: transition.name_ar || "",
      code: transition.code,
      description: transition.description,
      description_ar: transition.description_ar || "",
      from_state_id: transition.from_state_id,
      to_state_id: transition.to_state_id,
      role_ids: transition.allowed_roles?.map((r) => r.id) || [],
      // Department Assignment
      assign_department_id: transition.assign_department_id || "",
      auto_detect_department: transition.auto_detect_department || false,
      department_type_filter:
        (transition.department_type_filter as "" | "internal" | "external") ||
        "",
      // User Assignment
      assign_user_id: transition.assign_user_id || "",
      assignment_role_ids: transition.assignment_roles?.map((r) => r.id) || [],
      auto_match_user: transition.auto_match_user || false,
      manual_select_user: transition.manual_select_user || false,
      is_rejection: transition.is_rejection || false,
      is_not_belong: transition.is_not_belong || false,
      is_missing_info: transition.is_missing_info || false,
      is_reopen: transition.is_reopen || false,
      is_final_close: transition.is_final_close || false,
      require_assignee: transition.require_assignee || false,
    });
    setIsTransitionModalOpen(true);
  };

  const closeTransitionModal = () => {
    setIsTransitionModalOpen(false);
    setEditingTransition(null);
    setTransitionFormData(initialTransitionFormData);
  };

  // Config modal handlers
  const openConfigModal = (transition: WorkflowTransition) => {
    setConfiguringTransition(transition);
    const transitionActions =
      transition.actions?.map((a) => ({
        action_type: a.action_type,
        name: a.name,
        description: a.description,
        config: a.config,
        execution_order: a.execution_order,
        is_async: a.is_async,
        is_active: a.is_active,
      })) || [];

    setRequirements(
      transition.requirements?.map((r) => ({
        requirement_type: r.requirement_type,
        field_name: r.field_name,
        field_value: r.field_value,
        is_mandatory: r.is_mandatory,
        error_message: r.error_message,
      })) || [],
    );
    setActions(transitionActions);
    setCustomEmailInputs(
      transitionActions.reduce<Record<number, string>>((acc, action, index) => {
        const actionType = action.action_type as string;
        if (actionType !== "email" || !action.config) return acc;

        try {
          const parsed = JSON.parse(action.config as string);
          acc[index] = (parsed.custom_emails || []).join(", ");
        } catch {
          acc[index] = "";
        }

        return acc;
      }, {}),
    );
    setSmsPhoneInputs(
      transitionActions.reduce<Record<number, string>>((acc, action, index) => {
        const actionType = action.action_type as string;
        if (actionType !== "sms" || !action.config) return acc;

        try {
          const parsed = JSON.parse(action.config as string);
          acc[index] = (parsed.custom_phones || []).join(", ");
        } catch {
          acc[index] = "";
        }

        return acc;
      }, {}),
    );
    setFieldChanges(
      transition.field_changes?.map((f) => ({
        field_name: f.field_name,
        label: f.label,
        is_required: f.is_required,
        department_type_filter: f.department_type_filter || "",
        sort_order: f.sort_order,
      })) || [],
    );
    setIsConfigModalOpen(true);
  };

  const closeConfigModal = () => {
    setIsConfigModalOpen(false);
    setConfiguringTransition(null);
    setRequirements([]);
    setActions([]);
    setCustomEmailInputs({});
    setSmsPhoneInputs({});
    setFieldChanges([]);
  };

  // error p tag
  const renderFieldError = (message?: string) =>
    message ? (
      <p className="mt-1 text-xs font-medium text-[hsl(var(--destructive))]">
        {message}
      </p>
    ) : null;

  const handleStateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors: StateFormErrors = {};

    const name = stateFormData.name.trim();
    const code = stateFormData.code.trim();

    if (!validateRequired(name)) {
      validationErrors.name = t("validation.nameRequired", {
        field: t("workflows.states"),
      });
    } else if (!validateName(name)) {
      validationErrors.name = t("validation.invalidName", {
        field: t("workflows.states"),
      });

      // "State name can only contain letters, numbers, spaces, and basic punctuation (- ' . , & ( ) /)";
    }

    if (!validateRequired(code)) {
      validationErrors.code = t("validation.codeRequired", {
        field: t("workflows.states"),
      });
    } else if (!validateCode(code)) {
      validationErrors.code = t("validation.invalidCode", {
        field: t("workflows.states"),
      });
    }

    if (Object.keys(validationErrors).length > 0) {
      setStateErrors(validationErrors);
      setStateDuplicateErrors({
        name: "",
        code: "",
      });
      toast.error(t("errors.validationError"));
      return;
    }

    setStateErrors({});

    // preventing duplicate states
    const duplicateName = states.some(
      (state) =>
        state.id !== editingState?.id &&
        state.name.trim().toLowerCase() ===
          stateFormData.name.trim().toLowerCase(),
    );

    const duplicateCode = states.some(
      (state) =>
        state.id !== editingState?.id &&
        state.code.trim().toLowerCase() ===
          stateFormData.code.trim().toLowerCase(),
    );

    if (duplicateName || duplicateCode) {
      setStateDuplicateErrors({
        name: duplicateName ? t("workflows.stateAlreadyExists") : "",
        code: duplicateCode ? t("workflows.stateCodeAlreadyExists") : "",
      });

      toast.error(
        duplicateName
          ? t("workflows.stateAlreadyExists")
          : t("workflows.stateCodeAlreadyExists"),
      );

      return;
    }

    setStateDuplicateErrors({
      name: "",
      code: "",
    });

    const data = {
      name: stateFormData.name,
      name_ar: stateFormData.name_ar,
      code: stateFormData.code,
      description: stateFormData.description,
      description_ar: stateFormData.description_ar,
      state_type: stateFormData.state_type,
      color: stateFormData.color,
      sla_hours: stateFormData.sla_hours,
      sla_unit: stateFormData.sla_unit || "hours",
      escalation_policy_id: stateFormData.escalation_policy_id || "",
      is_mergable: stateFormData.is_mergable,
      is_ai_qa: stateFormData.is_ai_qa,
      is_ready_to_close: stateFormData.is_ready_to_close,
      is_partial_close: stateFormData.is_partial_close,
      duration_options: stateFormData.duration_options
        ? stateFormData.duration_options
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      viewable_role_ids: stateFormData.viewable_role_ids,
      editable_role_ids: stateFormData.editable_role_ids,
      // Creation-time assignment
      assign_user_id: stateFormData.assign_user_id || null,
      assignment_role_ids: stateFormData.assignment_role_ids,
      auto_match_user: stateFormData.auto_match_user,
      manual_select_user: stateFormData.manual_select_user,
      // New incident notification templates
      new_incident_email_template_code:
        stateFormData.new_incident_email_template_code || "",
      new_incident_sms_template_code:
        stateFormData.new_incident_sms_template_code || "",
    };

    if (editingState) {
      updateStateMutation.mutate({ stateId: editingState.id, data });
    } else {
      createStateMutation.mutate(data);
    }
  };

  const handleTransitionSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors: TransitionFormErrors = {};

    const name = transitionFormData.name.trim();
    const code = transitionFormData.code.trim();
    const fromState = transitionFormData.from_state_id;
    const toState = transitionFormData.to_state_id;

    if (!validateRequired(name)) {
      validationErrors.name = t("validation.nameRequired", {
        field: t("workflows.transitions"),
      });
    } else if (!validateName(name)) {
      validationErrors.name = t("validation.invalidName", {
        field: t("workflows.transitions"),
      });
    }

    if (!validateRequired(code)) {
      validationErrors.code = t("validation.codeRequired", {
        field: t("workflows.transitions"),
      });
    } else if (!validateCode(code)) {
      validationErrors.code = t("validation.invalidCode", {
        field: t("workflows.transitions"),
      });
    }

    if (!validateRequired(fromState)) {
      validationErrors.fromState = t("validation.fromStateRequired", {
        field: t("workflows.transitions"),
      });
    }

    if (!validateRequired(toState)) {
      validationErrors.toState = t("validation.fromStateRequired", {
        field: t("workflows.transitions"),
      });
    }

    if (Object.keys(validationErrors).length > 0) {
      setTransitionErrors(validationErrors);
      setTransitionDuplicateErrors({
        name: "",
        code: "",
      });
      toast.error(t("errors.validationError"));
      return;
    }

    setTransitionErrors({});

    // preventing duplicate transitions
    const duplicateName = transitions.some(
      (transition) =>
        transition.id !== editingTransition?.id &&
        transition.name.trim().toLowerCase() ===
          transitionFormData.name.trim().toLowerCase(),
    );

    const duplicateCode = transitions.some(
      (transition) =>
        transition.id !== editingTransition?.id &&
        transition.code.trim().toLowerCase() ===
          transitionFormData.code.trim().toLowerCase(),
    );

    if (duplicateName || duplicateCode) {
      setTransitionDuplicateErrors({
        name: duplicateName ? t("workflows.transitionAlreadyExists") : "",
        code: duplicateCode ? t("workflows.transitionCodeAlreadyExists") : "",
      });

      toast.error(
        duplicateName
          ? t("workflows.transitionAlreadyExists")
          : t("workflows.transitionCodeAlreadyExists"),
      );

      return;
    }

    setTransitionDuplicateErrors({
      name: "",
      code: "",
    });
    const data = {
      name: transitionFormData.name,
      name_ar: transitionFormData.name_ar,
      code: transitionFormData.code,
      description: transitionFormData.description,
      description_ar: transitionFormData.description_ar,
      from_state_id: transitionFormData.from_state_id,
      to_state_id: transitionFormData.to_state_id,
      role_ids: transitionFormData.role_ids,
      // Department Assignment
      assign_department_id: transitionFormData.assign_department_id || "",
      auto_detect_department: transitionFormData.auto_detect_department,
      department_type_filter:
        transitionFormData.department_type_filter || undefined,
      // User Assignment
      assign_user_id: transitionFormData.assign_user_id || undefined,
      assignment_role_ids: transitionFormData.assignment_role_ids,
      auto_match_user: transitionFormData.auto_match_user,
      manual_select_user: transitionFormData.manual_select_user,
      is_rejection: transitionFormData.is_rejection,
      is_not_belong: transitionFormData.is_not_belong,
      is_missing_info: transitionFormData.is_missing_info,
      is_reopen: transitionFormData.is_reopen,
      is_final_close: transitionFormData.is_final_close,
      require_assignee: transitionFormData.require_assignee,
    };

    if (editingTransition) {
      updateTransitionMutation.mutate({
        transitionId: editingTransition.id,
        data,
      });
    } else {
      createTransitionMutation.mutate(data);
    }
  };

  const handleSaveConfig = async () => {
    if (!configuringTransition) return;

    await setRequirementsMutation.mutateAsync({
      transitionId: configuringTransition.id,
      reqs: requirements,
    });
    await setActionsMutation.mutateAsync({
      transitionId: configuringTransition.id,
      acts: actions,
    });
    await setFieldChangesMutation.mutateAsync({
      transitionId: configuringTransition.id,
      changes: fieldChanges,
    });
    closeConfigModal();
  };

  const addFieldChange = () => {
    setFieldChanges([
      ...fieldChanges,
      {
        field_name: "priority",
        label: "",
        is_required: false,
        sort_order: fieldChanges.length,
      },
    ]);
  };

  const removeFieldChange = (index: number) => {
    setFieldChanges(fieldChanges.filter((_, i) => i !== index));
  };

  const updateFieldChange = (index: number, field: string, value: any) => {
    const updated = [...fieldChanges];
    updated[index] = { ...updated[index], [field]: value };
    setFieldChanges(updated);
  };

  const addRequirement = () => {
    setRequirements([
      ...requirements,
      { requirement_type: "comment", is_mandatory: true },
    ]);
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const updateRequirement = (index: number, field: string, value: any) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], [field]: value };
    setRequirements(updated);
  };

  const addAction = () => {
    setActions([
      ...actions,
      {
        action_type: "notification",
        name: "",
        is_async: false,
        is_active: true,
        execution_order: actions.length + 1,
      },
    ]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
    setCustomEmailInputs((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const numericKey = Number(key);
        if (numericKey < index) next[numericKey] = value;
        if (numericKey > index) next[numericKey - 1] = value;
      });
      return next;
    });
    setSmsPhoneInputs((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const numericKey = Number(key);
        if (numericKey < index) next[numericKey] = value;
        if (numericKey > index) next[numericKey - 1] = value;
      });
      return next;
    });
  };

  const updateAction = (index: number, field: string, value: any) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    setActions(updated);
  };

  const toggleRole = (roleId: string) => {
    setTransitionFormData((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter((id) => id !== roleId)
        : [...prev.role_ids, roleId],
    }));
  };

  const toggleStateRole = (roleId: string) => {
    setStateFormData((prev) => ({
      ...prev,
      viewable_role_ids: prev.viewable_role_ids.includes(roleId)
        ? prev.viewable_role_ids.filter((id) => id !== roleId)
        : [...prev.viewable_role_ids, roleId],
    }));
  };

  const toggleEditableStateRole = (roleId: string) => {
    setStateFormData((prev) => ({
      ...prev,
      editable_role_ids: prev.editable_role_ids.includes(roleId)
        ? prev.editable_role_ids.filter((id) => id !== roleId)
        : [...prev.editable_role_ids, roleId],
    }));
  };

  const toggleStateAssignmentRole = (roleId: string) => {
    setStateFormData((prev) => ({
      ...prev,
      assignment_role_ids: prev.assignment_role_ids.includes(roleId)
        ? prev.assignment_role_ids.filter((id) => id !== roleId)
        : [...prev.assignment_role_ids, roleId],
    }));
  };

  const getStateName = (stateId: string) => {
    const state = states.find((s) => s.id === stateId);
    if (!state) return "Unknown";
    return i18n.language === "ar" && state.name_ar ? state.name_ar : state.name;
  };

  const getStateColor = (stateId: string) => {
    const state = states.find((s) => s.id === stateId);
    return state?.color || "#6b7280";
  };

  const getStateTypeIcon = (stateType: string) => {
    switch (stateType) {
      case "initial":
        return <Circle className="w-4 h-4 fill-emerald-500 text-emerald-500" />;
      case "terminal":
        return <Circle className="w-4 h-4 fill-rose-500 text-rose-500" />;
      default:
        return <Circle className="w-4 h-4 fill-blue-500 text-blue-500" />;
    }
  };

  const getStateTypeLabel = (stateType: string) => {
    switch (stateType) {
      case "initial":
        return t("workflows.initialStartingState", "Initial (Starting state)");

      case "terminal":
        return t("workflows.terminalEndState", "Terminal (End state)");

      case "normal":
        return t("common.normal", "Normal");

      default:
        return stateType;
    }
  };

  // Canvas handlers
  const handleCanvasTransitionAdd = useCallback(
    (fromStateId: string, toStateId: string) => {
      setTransitionFormData({
        ...initialTransitionFormData,
        from_state_id: fromStateId,
        to_state_id: toStateId,
      });
      setIsTransitionModalOpen(true);
    },
    [],
  );

  const handleCanvasStateDelete = useCallback((stateId: string) => {
    setDeleteStateConfirm(stateId);
  }, []);

  const handleCanvasTransitionDelete = useCallback((transitionId: string) => {
    setDeleteTransitionConfirm(transitionId);
  }, []);

  const handleCanvasLayoutSave = useCallback(
    async (layout: string) => {
      if (!workflow) return;

      try {
        await updateMutation.mutateAsync({
          id: workflow.id,
          data: { canvas_layout: layout },
        });
      } catch (error) {
        console.error("Failed to save layout:", error);
      }
    },
    [workflow, updateMutation],
  );

  const handleExport = async () => {
    if (!workflow) return;

    try {
      const blob = await workflowApi.export(workflow.id);
      const filename = `workflow_${workflow.code}_${Date.now()}.json`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 text-center">
        <AlertTriangle className="w-12 h-12 text-[hsl(var(--destructive))] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
          {t("errors.notFound")}
        </h3>
        <p className="text-[hsl(var(--muted-foreground))] mb-6">
          {t("workflows.noWorkflowsDesc")}
        </p>
        <Button
          onClick={() => navigate("/workflows")}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          {t("workflows.allWorkflows")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate("/workflows")}
              className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            </button>
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)]">
              <GitBranch className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">
                {i18n.language === "ar" && workflow.name_ar
                  ? workflow.name_ar
                  : workflow.name}
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] font-mono">
                {workflow.code}
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          leftIcon={<Download className="w-4 h-4" />}
        >
          {t("workflows.exportWorkflow")}
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden">
        <div className="flex border-b border-[hsl(var(--border))]">
          <button
            onClick={() => setActiveTab("visual")}
            className={cn(
              "flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
              activeTab === "visual"
                ? "text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]",
            )}
          >
            <Layout className="w-4 h-4" />
            {t("workflows.visualDesigner")}
          </button>
          <button
            onClick={() => setActiveTab("states")}
            className={cn(
              "flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
              activeTab === "states"
                ? "text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]",
            )}
          >
            <Circle className="w-4 h-4" />
            {t("workflows.statesTab")} ({states.length})
          </button>
          <button
            onClick={() => setActiveTab("transitions")}
            className={cn(
              "flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
              activeTab === "transitions"
                ? "text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]",
            )}
          >
            <ArrowRight className="w-4 h-4" />
            {t("workflows.transitionsTab")} ({transitions.length})
          </button>
          <button
            onClick={() => setActiveTab("matching")}
            className={cn(
              "flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
              activeTab === "matching"
                ? "text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]",
            )}
          >
            <Settings className="w-4 h-4" />
            {t("workflows.matchingRules")}
          </button>
          <button
            onClick={() => setActiveTab("fields")}
            className={cn(
              "flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
              activeTab === "fields"
                ? "text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]",
            )}
          >
            <ClipboardList className="w-4 h-4" />
            {t("workflows.requiredFields")}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Visual Designer Tab */}
          {activeTab === "visual" && (
            <WorkflowCanvas
              workflowId={id!}
              states={states}
              transitions={transitions}
              canvasLayout={workflow.canvas_layout}
              onStateAdd={openCreateStateModal}
              onStateEdit={openEditStateModal}
              onStateDelete={handleCanvasStateDelete}
              onTransitionAdd={handleCanvasTransitionAdd}
              onTransitionEdit={openEditTransitionModal}
              onTransitionDelete={handleCanvasTransitionDelete}
              onTransitionConfigure={openConfigModal}
              onLayoutSave={handleCanvasLayoutSave}
            />
          )}

          {activeTab === "states" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={openCreateStateModal}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  {t("workflows.addState")}
                </Button>
              </div>

              {states.length === 0 ? (
                <div className="text-center py-12">
                  <Circle className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
                    {t("workflows.noStates")}
                  </h3>
                  <p className="text-[hsl(var(--muted-foreground))] mb-4">
                    {t("workflows.noStatesDesc")}
                  </p>
                  <Button
                    onClick={openCreateStateModal}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    {t("workflows.addState")}
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[hsl(var(--border))]">
                        <th className="text-start py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                          {t("common.state")}
                        </th>
                        <th className="text-start py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                          {t("departments.code")}
                        </th>
                        <th className="text-start py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                          {t("common.type")}
                        </th>
                        <th className="text-start py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                          {t("workflows.slaHours")}
                        </th>
                        <th className="text-start py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                          {t("workflows.mergable")}
                        </th>
                        <th className="text-start py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                          {t("workflows.aiQualityAudit")}
                        </th>
                        <th className="text-start py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                          {t("workflows.viewableRoles")}
                        </th>
                        <th className="text-start py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                          {t("workflows.editableRoles")}
                        </th>
                        <th className="text-end py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                          {t("workflows.actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {states.map((state) => (
                        <tr
                          key={state.id}
                          className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: state.color }}
                              />
                              <span className="font-medium text-[hsl(var(--foreground))]">
                                {i18n.language === "ar" && state.name_ar
                                  ? state.name_ar
                                  : state.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-mono text-[hsl(var(--muted-foreground))]">
                              {state.code}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {getStateTypeIcon(state.state_type)}
                              <span className="text-sm text-[hsl(var(--foreground))] capitalize">
                                {/* {state.state_type} */}
                                {getStateTypeLabel(state.state_type)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-[hsl(var(--muted-foreground))]">
                              {state.sla_hours
                                ? `${state.sla_hours} ${state.sla_unit || "h"}`
                                : "-"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {state.is_mergable ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {t("workflows.mergable")}
                                </span>
                              ) : (
                                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                  -
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {state.is_ai_qa ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {t("workflows.aiQualityAudit")}
                                </span>
                              ) : (
                                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                  -
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {!state.viewable_roles ||
                              state.viewable_roles.length === 0 ? (
                                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                  {t("workflows.allRoles")}
                                </span>
                              ) : (
                                <>
                                  {state.viewable_roles
                                    .slice(0, 2)
                                    .map((role) => (
                                      <span
                                        key={role.id}
                                        className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded"
                                      >
                                        {role.name}
                                      </span>
                                    ))}
                                  {state.viewable_roles.length > 2 && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded">
                                      +{state.viewable_roles.length - 2}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {!state.editable_roles ||
                              state.editable_roles.length === 0 ? (
                                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                  {t("workflows.allRoles")}
                                </span>
                              ) : (
                                <>
                                  {state.editable_roles
                                    .slice(0, 2)
                                    .map((role) => (
                                      <span
                                        key={role.id}
                                        className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded"
                                      >
                                        {role.name}
                                      </span>
                                    ))}
                                  {state.editable_roles.length > 2 && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded">
                                      +{state.editable_roles.length - 2}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditStateModal(state)}
                                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteStateConfirm(state.id)}
                                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "transitions" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={openCreateTransitionModal}
                  leftIcon={<Plus className="w-4 h-4" />}
                  disabled={states.length < 2}
                >
                  {t("workflows.addTransition")}
                </Button>
              </div>

              {states.length < 2 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-600">
                  {t("workflows.noStatesDesc")}
                </div>
              )}

              {transitions.length === 0 ? (
                <div className="text-center py-12">
                  <ArrowRight className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
                    {t("workflows.noTransitions")}
                  </h3>
                  <p className="text-[hsl(var(--muted-foreground))] mb-4">
                    {t("workflows.noTransitionsDesc")}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[hsl(var(--border))]">
                        <th className="text-start py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                          {t("incidents.transition")}
                        </th>
                        <th className="text-start py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                          {t("workflows.fromTo")}
                        </th>
                        <th className="text-start py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                          {t("incidents.roles")}
                        </th>
                        <th className="text-start py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                          {t("workflows.config")}
                        </th>
                        <th className="text-end py-3 px-4 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                          {t("workflows.actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transitions.map((transition) => (
                        <tr
                          key={transition.id}
                          className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <span className="font-medium text-[hsl(var(--foreground))]">
                                {i18n.language === "ar" && transition.name_ar
                                  ? transition.name_ar
                                  : transition.name}
                              </span>
                              <p className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
                                {transition.code}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="px-2 py-1 text-xs font-medium rounded-lg text-white"
                                style={{
                                  backgroundColor: getStateColor(
                                    transition.from_state_id,
                                  ),
                                }}
                              >
                                {getStateName(transition.from_state_id)}
                              </span>
                              <ArrowRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] rtl:-rotate-180" />
                              <span
                                className="px-2 py-1 text-xs font-medium rounded-lg text-white"
                                style={{
                                  backgroundColor: getStateColor(
                                    transition.to_state_id,
                                  ),
                                }}
                              >
                                {getStateName(transition.to_state_id)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {transition.allowed_roles?.length === 0 && (
                                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                  {t("workflows.allRoles")}
                                </span>
                              )}
                              {transition.allowed_roles
                                ?.slice(0, 2)
                                .map((role) => (
                                  <span
                                    key={role.id}
                                    className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded"
                                  >
                                    {role.name}
                                  </span>
                                ))}
                              {(transition.allowed_roles?.length || 0) > 2 && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded">
                                  +{transition.allowed_roles!.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {(transition.requirements?.length || 0) > 0 && (
                                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-600 rounded">
                                  <FileText className="w-3 h-3" />
                                  {transition.requirements?.length}
                                </span>
                              )}
                              {(transition.actions?.length || 0) > 0 && (
                                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-600 rounded">
                                  <Zap className="w-3 h-3" />
                                  {transition.actions?.length}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openConfigModal(transition)}
                                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                title={t(
                                  "workflows.configureRequirementsActions",
                                )}
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  openEditTransitionModal(transition)
                                }
                                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteTransitionConfirm(transition.id)
                                }
                                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Matching Rules Tab */}
          {activeTab === "matching" && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-1">
                  {t("workflows.autoWorkflowMatchingRules")}
                </h3>
                <p className="text-xs text-blue-700 mb-2">
                  {t(
                    "workflows.configureWhichIncidentsShouldAutomaticallyUseThis",
                  )}
                </p>
                <p className="text-xs text-blue-700">
                  <strong>{t("workflows.tip")}</strong>
                  {t("workflows.leaveACategoryEmptyToMatchAll")}
                </p>
              </div>

              {/* Record Type Selection */}
              <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-5">
                <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">
                  {t("workflows.recordType")}
                </h4>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                  {t("workflows.specifyWhichRecordTypesThisWorkflowApplies")}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <label
                    className={cn(
                      "flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      matchingConfig.record_type === "incident"
                        ? "border-blue-500 bg-blue-500/20"
                        : "border-[hsl(var(--border))] hover:border-blue-300",
                    )}
                  >
                    <input
                      type="radio"
                      name="record_type"
                      value="incident"
                      checked={matchingConfig.record_type === "incident"}
                      onChange={(e) =>
                        setMatchingConfig((prev) => ({
                          ...prev,
                          record_type: e.target.value as
                            | "incident"
                            | "request"
                            | "complaint"
                            | "query"
                            | "both"
                            | "all",
                          classification_ids: [], // Clear classifications when record type changes
                        }))
                      }
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        matchingConfig.record_type === "incident"
                          ? "border-blue-500 bg-blue-500"
                          : "border-[hsl(var(--muted-foreground))]",
                      )}
                    >
                      {matchingConfig.record_type === "incident" && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {t("workflows.recordTypeIncident")}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t("workflows.recordTypeIncidentDesc")}
                      </p>
                    </div>
                  </label>
                  <label
                    className={cn(
                      "flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      matchingConfig.record_type === "request"
                        ? "border-emerald-500 bg-emerald-500/20"
                        : "border-[hsl(var(--border))] hover:border-emerald-300",
                    )}
                  >
                    <input
                      type="radio"
                      name="record_type"
                      value="request"
                      checked={matchingConfig.record_type === "request"}
                      onChange={(e) =>
                        setMatchingConfig((prev) => ({
                          ...prev,
                          record_type: e.target.value as
                            | "incident"
                            | "request"
                            | "complaint"
                            | "query"
                            | "both"
                            | "all",
                          classification_ids: [], // Clear classifications when record type changes
                        }))
                      }
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        matchingConfig.record_type === "request"
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-[hsl(var(--muted-foreground))]",
                      )}
                    >
                      {matchingConfig.record_type === "request" && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {t("workflows.recordTypeRequest")}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t("workflows.recordTypeRequestDesc")}
                      </p>
                    </div>
                  </label>
                  <label
                    className={cn(
                      "flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      matchingConfig.record_type === "both"
                        ? "border-purple-500 bg-purple-500/20"
                        : "border-[hsl(var(--border))] hover:border-purple-300",
                    )}
                  >
                    <input
                      type="radio"
                      name="record_type"
                      value="both"
                      checked={matchingConfig.record_type === "both"}
                      onChange={(e) =>
                        setMatchingConfig((prev) => ({
                          ...prev,
                          record_type: e.target.value as
                            | "incident"
                            | "request"
                            | "complaint"
                            | "query"
                            | "both"
                            | "all",
                          classification_ids: [], // Clear classifications when record type changes
                        }))
                      }
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        matchingConfig.record_type === "both"
                          ? "border-purple-500 bg-purple-500"
                          : "border-[hsl(var(--muted-foreground))]",
                      )}
                    >
                      {matchingConfig.record_type === "both" && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {t("workflows.recordTypeBoth")}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t("workflows.recordTypeBothDesc")}
                      </p>
                    </div>
                  </label>
                  <label
                    className={cn(
                      "flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      matchingConfig.record_type === "complaint"
                        ? "border-amber-500 bg-amber-500/20"
                        : "border-[hsl(var(--border))] hover:border-amber-300",
                    )}
                  >
                    <input
                      type="radio"
                      name="record_type"
                      value="complaint"
                      checked={matchingConfig.record_type === "complaint"}
                      onChange={(e) =>
                        setMatchingConfig((prev) => ({
                          ...prev,
                          record_type: e.target.value as
                            | "incident"
                            | "request"
                            | "complaint"
                            | "query"
                            | "both"
                            | "all",
                          classification_ids: [], // Clear classifications when record type changes
                        }))
                      }
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        matchingConfig.record_type === "complaint"
                          ? "border-amber-500 bg-amber-500"
                          : "border-[hsl(var(--muted-foreground))]",
                      )}
                    >
                      {matchingConfig.record_type === "complaint" && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {t("workflows.recordTypeComplaint")}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t("workflows.recordTypeComplaintDesc")}
                      </p>
                    </div>
                  </label>
                  <label
                    className={cn(
                      "flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      matchingConfig.record_type === "query"
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-[hsl(var(--border))] hover:border-indigo-300",
                    )}
                  >
                    <input
                      type="radio"
                      name="record_type"
                      value="query"
                      checked={matchingConfig.record_type === "query"}
                      onChange={(e) =>
                        setMatchingConfig((prev) => ({
                          ...prev,
                          record_type: e.target.value as
                            | "incident"
                            | "request"
                            | "complaint"
                            | "query"
                            | "both"
                            | "all",
                          classification_ids: [], // Clear classifications when record type changes
                        }))
                      }
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        matchingConfig.record_type === "query"
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-[hsl(var(--muted-foreground))]",
                      )}
                    >
                      {matchingConfig.record_type === "query" && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {t("workflows.recordTypeQuery")}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t("workflows.recordTypeQueryDesc")}
                      </p>
                    </div>
                  </label>
                  <label
                    className={cn(
                      "flex-1 flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      matchingConfig.record_type === "all"
                        ? "border-gray-500 bg-gray-500/20"
                        : "border-[hsl(var(--border))] hover:border-gray-300",
                    )}
                  >
                    <input
                      type="radio"
                      name="record_type"
                      value="all"
                      checked={matchingConfig.record_type === "all"}
                      onChange={(e) =>
                        setMatchingConfig((prev) => ({
                          ...prev,
                          record_type: e.target.value as
                            | "incident"
                            | "request"
                            | "complaint"
                            | "query"
                            | "both"
                            | "all",
                          classification_ids: [], // Clear classifications when record type changes
                        }))
                      }
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        matchingConfig.record_type === "all"
                          ? "border-gray-500 bg-gray-500"
                          : "border-[hsl(var(--muted-foreground))]",
                      )}
                    >
                      {matchingConfig.record_type === "all" && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {t("workflows.recordTypeAll")}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t("workflows.recordTypeAllDesc")}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Classifications */}
                <div>
                  <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">
                    {t("workflows.classificationsLabel")}
                  </h4>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                    {t(
                      "workflows.selectWhichClassificationsThisWorkflowAppliesTo",
                    )}
                  </p>
                  <HierarchicalCheckboxTree
                    data={classifications as any}
                    selectedIds={matchingConfig.classification_ids}
                    onSelectionChange={(selectedIds) => {
                      setMatchingConfig((prev) => ({
                        ...prev,
                        classification_ids: selectedIds,
                      }));
                    }}
                    emptyMessage="No classifications available"
                    showSelectAll={true}
                  />
                </div>

                {/* Locations */}
                <div>
                  <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">
                    {t("users.locations")}
                  </h4>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                    {t("workflows.selectWhichLocationsThisWorkflowAppliesTo")}
                  </p>
                  <HierarchicalCheckboxTree
                    data={locations as any}
                    selectedIds={matchingConfig.location_ids}
                    onSelectionChange={(selectedIds) => {
                      setMatchingConfig((prev) => ({
                        ...prev,
                        location_ids: selectedIds,
                      }));
                    }}
                    emptyMessage="No locations available"
                    showSelectAll={true}
                  />
                </div>

                {/* Sources */}
                <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4">
                  <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">
                    {t("workflows.sources")}
                  </h4>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                    {t(
                      "workflows.selectWhichIncidentSourcesThisWorkflowApplies",
                    )}
                  </p>
                  <div className="space-y-2">
                    {INCIDENT_SOURCES.map((source) => (
                      <label
                        key={source.value}
                        className="flex items-center gap-2 p-2 hover:bg-[hsl(var(--muted)/0.5)] rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={matchingConfig.sources.includes(
                            source.value,
                          )}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMatchingConfig((prev) => ({
                                ...prev,
                                sources: [...prev.sources, source.value],
                              }));
                            } else {
                              setMatchingConfig((prev) => ({
                                ...prev,
                                sources: prev.sources.filter(
                                  (s) => s !== source.value,
                                ),
                              }));
                            }
                          }}
                          className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                        />
                        <span className="text-sm text-[hsl(var(--foreground))]">
                          {/* {t(
                            `workflows.incidentSources.${source.value}`,
                            source.label,
                          )} */}
                          {i18n.language === "ar"
                            ? source.label_ar
                            : source.label}
                        </span>
                      </label>
                    ))}

                    {matchingConfig.sources.length === 0 && (
                      <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
                        <strong>{t("common.noSelection")}</strong>
                        {t("workflows.thisWorkflowWillMatch")}{" "}
                        <strong>{t("workflows.allSources")}</strong>
                        {t("workflows.genericFallbackBehavior")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Priorities */}
                <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4">
                  <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">
                    {t("workflows.priorities")}
                  </h4>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                    {t("workflows.selectWhichPrioritiesThisWorkflowAppliesTo")}
                  </p>
                  <div className="space-y-2">
                    {priorityValues.map((priority) => (
                      <label
                        key={priority.id}
                        className="flex items-center gap-2 p-2 hover:bg-[hsl(var(--muted)/0.5)] rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={matchingConfig.priorities.includes(
                            priority.sort_order,
                          )}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMatchingConfig((prev) => ({
                                ...prev,
                                priorities: [
                                  ...prev.priorities,
                                  priority.sort_order,
                                ],
                              }));
                            } else {
                              setMatchingConfig((prev) => ({
                                ...prev,
                                priorities: prev.priorities.filter(
                                  (p) => p !== priority.sort_order,
                                ),
                              }));
                            }
                          }}
                          className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                        />
                        <span className="text-sm text-[hsl(var(--foreground))]">
                          {i18n.language === "ar"
                            ? priority.name_ar?.trim() || priority.name
                            : priority.name}
                        </span>
                      </label>
                    ))}
                    {priorityValues.length === 0 && (
                      <>
                        {[
                          { value: 1, label: "1 - Critical" },
                          { value: 2, label: "2 - High" },
                          { value: 3, label: "3 - Medium" },
                          { value: 4, label: "4 - Low" },
                          { value: 5, label: "5 - Very Low" },
                        ].map((priority) => (
                          <label
                            key={priority.value}
                            className="flex items-center gap-2 p-2 hover:bg-[hsl(var(--muted)/0.5)] rounded-lg cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={matchingConfig.priorities.includes(
                                priority.value,
                              )}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setMatchingConfig((prev) => ({
                                    ...prev,
                                    priorities: [
                                      ...prev.priorities,
                                      priority.value,
                                    ],
                                  }));
                                } else {
                                  setMatchingConfig((prev) => ({
                                    ...prev,
                                    priorities: prev.priorities.filter(
                                      (p) => p !== priority.value,
                                    ),
                                  }));
                                }
                              }}
                              className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                            />
                            <span className="text-sm text-[hsl(var(--foreground))]">
                              {priority.label}
                            </span>
                          </label>
                        ))}
                      </>
                    )}

                    {matchingConfig.priorities.length === 0 && (
                      <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
                        <strong>{t("common.noSelection")}</strong>
                        {t("workflows.thisWorkflowWillMatch")}{" "}
                        <strong>{t("workflows.allPriorities")}</strong>
                        {t("workflows.genericFallbackBehavior")}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Generic Workflow Warning */}
              {matchingConfig.sources.length === 0 &&
                matchingConfig.priorities.length === 0 &&
                matchingConfig.classification_ids.length === 0 &&
                matchingConfig.location_ids.length === 0 && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-amber-900 mb-1 flex items-center gap-2">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {t("workflows.fullyGenericWorkflow")}
                    </h3>
                    <p className="text-xs text-amber-800">
                      {t("workflows.thisWorkflowHasNoMatchingRulesConfigured")}
                      <strong>{t("workflows.allIncidents")}</strong>
                      {t("workflows.andMayConflictWithOtherWorkflowsConsider")}
                    </p>
                  </div>
                )}

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => updateMatchingMutation.mutate(matchingConfig)}
                  isLoading={updateMatchingMutation.isPending}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  {t("workflows.saveMatchingRules")}
                </Button>
              </div>
            </div>
          )}

          {/* Form Fields Tab */}
          {activeTab === "fields" && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-amber-800 mb-1">
                  {t("workflows.requiredFormFields")}
                </h3>
                <p className="text-xs text-amber-700">
                  {t("workflows.configureWhichFieldsAreMandatoryWhenCreating")}
                </p>
              </div>

              <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6">
                <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1">
                  {t("workflows.selectRequiredFields")}
                </h4>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
                  {t("workflows.fieldStateHidden")} →{" "}
                  {t("workflows.fieldStateOptional")} →{" "}
                  {t("workflows.fieldStateRequired")}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableFormFields.map((item) => {
                    const isRequired = requiredFields.includes(item.field);
                    const isOptional =
                      !isRequired && optionalFields.includes(item.field);

                    const cycleState = () => {
                      if (!isRequired && !isOptional) {
                        // hidden → optional
                        setOptionalFields((prev) => [...prev, item.field]);
                      } else if (isOptional) {
                        // optional → required
                        setOptionalFields((prev) =>
                          prev.filter((f) => f !== item.field),
                        );
                        setRequiredFields((prev) => [...prev, item.field]);
                      } else {
                        // required → hidden
                        setRequiredFields((prev) =>
                          prev.filter((f) => f !== item.field),
                        );
                      }
                    };

                    return (
                      <button
                        key={item.field}
                        type="button"
                        onClick={cycleState}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg transition-colors border text-start w-full",
                          isRequired
                            ? "bg-amber-50 border-amber-400"
                            : isOptional
                              ? "bg-blue-50 border-blue-400"
                              : "bg-[hsl(var(--background))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]",
                        )}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {isRequired ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">
                              !
                            </span>
                          ) : isOptional ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
                              ?
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border-2 border-[hsl(var(--border))]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                              {item.label}
                            </span>
                            {isRequired && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                                {t("workflows.fieldStateRequired")}
                              </span>
                            )}
                            {isOptional && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                {t("workflows.fieldStateOptional")}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-[hsl(var(--muted)/0.5)] rounded-xl p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">
                    {t("workflows.requiredFieldsSummary")}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                      {t("workflows.titleAlways")}
                    </span>
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                      {t("workflows.workflowAlways")}
                    </span>
                    {requiredFields.map((field) => {
                      const fieldConfig = availableFormFields.find(
                        (f) => f.field === field,
                      );
                      return (
                        <span
                          key={field}
                          className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded"
                        >
                          {fieldConfig?.label || field}
                        </span>
                      );
                    })}
                    {requiredFields.length === 0 && (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t("common.noAdditionalRequiredFields")}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">
                    {t("workflows.optionalFieldsSummary")}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {optionalFields.map((field) => {
                      const fieldConfig = availableFormFields.find(
                        (f) => f.field === field,
                      );
                      return (
                        <span
                          key={field}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded"
                        >
                          {fieldConfig?.label || field}
                        </span>
                      );
                    })}
                    {optionalFields.length === 0 && (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t("workflows.noOptionalFields")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  onClick={() =>
                    updateRequiredFieldsMutation.mutate({
                      required: requiredFields,
                      optional: optionalFields,
                    })
                  }
                  isLoading={updateRequiredFieldsMutation.isPending}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  {t("workflows.saveRequiredFields")}
                </Button>
              </div>

              {/* Convert to Request Permissions Section */}
              <div className="mt-8 pt-8 border-t border-[hsl(var(--border))]">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {t("workflows.convertToRequestPermissions")}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    {t("workflows.configureWhichRolesCanConvertIncidentsTo")}
                  </p>
                </div>

                <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6">
                  <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">
                    {t("workflows.allowedRoles")}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border",
                          convertToRequestRoleIds.includes(role.id)
                            ? "bg-[hsl(var(--primary)/0.1)] border-[hsl(var(--primary))]"
                            : "bg-[hsl(var(--background))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={convertToRequestRoleIds.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConvertToRequestRoleIds((prev) => [
                                ...prev,
                                role.id,
                              ]);
                            } else {
                              setConvertToRequestRoleIds((prev) =>
                                prev.filter((id) => id !== role.id),
                              );
                            }
                          }}
                          className="mt-0.5 w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                        />
                        <div>
                          <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                            {role.name}
                          </span>
                          {role.description && (
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-[hsl(var(--muted)/0.5)] rounded-xl p-4 mt-4">
                  <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">
                    {t("workflows.selectedRoles")}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {convertToRequestRoleIds.length === 0 ? (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t("common.noRolesSelectedAllUsersCanConvert")}
                      </span>
                    ) : (
                      convertToRequestRoleIds.map((roleId) => {
                        const role = roles.find((r) => r.id === roleId);
                        return (
                          <span
                            key={roleId}
                            className="px-2 py-1 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-xs font-medium rounded"
                          >
                            {role?.name || roleId}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={() =>
                      updateConvertToRequestRolesMutation.mutate(
                        convertToRequestRoleIds,
                      )
                    }
                    isLoading={updateConvertToRequestRolesMutation.isPending}
                    leftIcon={<Check className="w-4 h-4" />}
                  >
                    {t("workflows.saveConvertToRequestPermissions")}
                  </Button>
                </div>
              </div>

              {/* Merge Permissions Section */}
              <div className="mt-8 pt-8 border-t border-[hsl(var(--border))]">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {t("workflows.mergeIncidentPermissions")}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    {t("workflows.configureWhichRolesCanMergeIncidentsIf")}
                  </p>
                </div>

                <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6">
                  <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">
                    {t("workflows.allowedRoles")}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border",
                          mergeAllowedRoleIds.includes(role.id)
                            ? "bg-[hsl(var(--primary)/0.1)] border-[hsl(var(--primary))]"
                            : "bg-[hsl(var(--background))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={mergeAllowedRoleIds.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMergeAllowedRoleIds((prev) => [
                                ...prev,
                                role.id,
                              ]);
                            } else {
                              setMergeAllowedRoleIds((prev) =>
                                prev.filter((id) => id !== role.id),
                              );
                            }
                          }}
                          className="mt-0.5 w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                        />
                        <div>
                          <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                            {role.name}
                          </span>
                          {role.description && (
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-[hsl(var(--muted)/0.5)] rounded-xl p-4 mt-4">
                  <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">
                    {t("workflows.selectedRoles")}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {mergeAllowedRoleIds.length === 0 ? (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t("common.noRolesSelectedAllUsersCanMerge")}
                      </span>
                    ) : (
                      mergeAllowedRoleIds.map((roleId) => {
                        const role = roles.find((r) => r.id === roleId);
                        return (
                          <span
                            key={roleId}
                            className="px-2 py-1 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-xs font-medium rounded"
                          >
                            {role?.name || roleId}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={() =>
                      updateMergeAllowedRolesMutation.mutate(
                        mergeAllowedRoleIds,
                      )
                    }
                    isLoading={updateMergeAllowedRolesMutation.isPending}
                    leftIcon={<Check className="w-4 h-4" />}
                  >
                    {t("workflows.saveMergePermissions")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* State Modal */}
      {isStateModalOpen && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center">
                  <Circle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {editingState
                      ? t("workflows.editState")
                      : t("workflows.addState")}
                  </h3>
                </div>
              </div>
              <button
                onClick={closeStateModal}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleStateSubmit}
              className="overflow-y-auto max-h-[calc(90vh-140px)]"
              noValidate
            >
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("common.name")}
                      <span className="text-[hsl(var(--destructive))] ml-1">
                        *
                      </span>
                    </label>
                    <input
                      type="text"
                      value={stateFormData.name}
                      onChange={(e) => {
                        setStateFormData({
                          ...stateFormData,
                          name: e.target.value,
                        });

                        if (stateErrors.name) {
                          setStateErrors((prev) => ({
                            ...prev,
                            name: "",
                          }));
                        }
                        if (stateDuplicateErrors.name) {
                          setStateDuplicateErrors((prev) => ({
                            ...prev,
                            name: "",
                          }));
                        }
                      }}
                      className={`w-full px-4 py-2.5 bg-[hsl(var(--background))] rounded-xl text-sm focus:outline-none ${
                        stateDuplicateErrors.name || stateErrors.name
                          ? "border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                          : "border border-[hsl(var(--border))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                      }`}

                      // required
                    />
                    {renderFieldError(
                      stateErrors.name || stateDuplicateErrors.name,
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("common.nameAr")}
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={stateFormData.name_ar}
                      onChange={(e) =>
                        setStateFormData({
                          ...stateFormData,
                          name_ar: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t("departments.code")}
                    <span className="text-[hsl(var(--destructive))] ml-1">
                      *
                    </span>
                  </label>
                  <input
                    type="text"
                    value={stateFormData.code}
                    onChange={(e) => {
                      setStateFormData({
                        ...stateFormData,
                        code: e.target.value,
                      });
                      if (stateErrors.code) {
                        setStateErrors((prev) => ({
                          ...prev,
                          code: "",
                        }));
                      }
                      if (stateDuplicateErrors.code) {
                        setStateDuplicateErrors((prev) => ({
                          ...prev,
                          code: "",
                        }));
                      }
                    }}
                    // className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                    className={`w-full px-4 py-2.5 bg-[hsl(var(--background))] rounded-xl text-sm focus:outline-none ${
                      stateDuplicateErrors.code || stateErrors.code
                        ? "border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                        : "border border-[hsl(var(--border))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                    }`}
                    // required
                  />
                  {renderFieldError(
                    stateDuplicateErrors.code || stateErrors.code,
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("workflows.description")}
                    </label>
                    <textarea
                      value={stateFormData.description}
                      onChange={(e) =>
                        setStateFormData({
                          ...stateFormData,
                          description: e.target.value,
                        })
                      }
                      rows={2}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("common.descriptionAr")}
                    </label>
                    <textarea
                      dir="rtl"
                      value={stateFormData.description_ar}
                      onChange={(e) =>
                        setStateFormData({
                          ...stateFormData,
                          description_ar: e.target.value,
                        })
                      }
                      rows={2}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] resize-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t("common.stateType")}
                  </label>
                  <select
                    value={stateFormData.state_type}
                    onChange={(e) =>
                      setStateFormData({
                        ...stateFormData,
                        state_type: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                  >
                    <option value="initial">
                      {t("workflows.initialStartingState")}
                    </option>
                    <option value="normal">{t("common.normal")}</option>
                    <option value="terminal">
                      {t("workflows.terminalEndState")}
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t("workflows.stateColor")}
                  </label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {STATE_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() =>
                          setStateFormData({
                            ...stateFormData,
                            color: color.value,
                          })
                        }
                        className={cn(
                          "w-8 h-8 rounded-lg transition-all cursor-pointer",
                          stateFormData.color === color.value
                            ? "ring-2 ring-offset-2 ring-[hsl(var(--primary))]"
                            : "hover:scale-110 cursor-pointer",
                        )}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                    <input
                      className={cn(
                        "w-10 h-10 rounded-lg transition-all cursor-pointer",
                        !STATE_COLORS.some(
                          (color) => color.value === stateFormData.color,
                        )
                          ? "ring-2 ring-offset-2 ring-[hsl(var(--primary))]"
                          : "hover:scale-110 cursor-pointer",
                      )}
                      type="color"
                      value={stateFormData.color}
                      onChange={(e) =>
                        setStateFormData({
                          ...stateFormData,
                          color: e.target.value,
                        })
                      }
                      title={t("common.customColor")}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t("workflows.slaDurationOptional")}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={stateFormData.sla_hours || ""}
                      onChange={(e) =>
                        setStateFormData({
                          ...stateFormData,
                          sla_hours: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      className="flex-1 px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                      min="1"
                      placeholder={t("workflows.escalationHoursExample")}
                    />
                    <select
                      value={stateFormData.sla_unit}
                      onChange={(e) =>
                        setStateFormData({
                          ...stateFormData,
                          sla_unit: e.target.value,
                        })
                      }
                      className="px-3 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                    >
                      <option value="minutes">
                        {t("classifications.minutes")}
                      </option>
                      <option value="hours">
                        {t("classifications.hours")}
                      </option>
                      <option value="days">{t("workflows.days")}</option>
                      <option value="months">{t("workflows.months")}</option>
                    </select>
                  </div>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    {t("workflows.maximumTimeAnIncidentShouldRemainIn")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t("workflows.escalationPolicyOptional")}
                  </label>
                  <select
                    value={stateFormData.escalation_policy_id || ""}
                    onChange={(e) =>
                      setStateFormData({
                        ...stateFormData,
                        escalation_policy_id: e.target.value || "",
                      })
                    }
                    className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                  >
                    <option value="">{t("common.none")}</option>
                    {escalationPolicies
                      .filter((p) => p.is_active)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    {t("workflows.policyToFireWhenThisStateS")}
                  </p>
                </div>
                <div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={stateFormData.is_mergable}
                      onChange={(e) =>
                        setStateFormData({
                          ...stateFormData,
                          is_mergable: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                    />
                    <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {t("workflows.mergableStatus")}
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] ml-7">
                    {t("workflows.allowIncidentsInThisStatusToBe")}
                  </p>
                </div>
                <div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={stateFormData.is_ai_qa}
                      onChange={(e) =>
                        setStateFormData({
                          ...stateFormData,
                          is_ai_qa: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                    />
                    <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {t("workflows.aiQualityAuditStatus")}
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] ml-7">
                    {t("workflows.aiQualityAuditDesc")}
                  </p>
                </div>
                {/* Closing Duration (Partial Close) */}
                <div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={stateFormData.is_partial_close}
                      onChange={(e) =>
                        setStateFormData({
                          ...stateFormData,
                          is_partial_close: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
                    />
                    <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {t("workflows.closingDuration", "Closing Duration")}
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] ml-7">
                    {t(
                      "workflows.closingDurationDesc",
                      "Requires a duration selection when entering this state. The incident automatically reverts if not closed within the selected period.",
                    )}
                  </p>
                </div>
                {stateFormData.is_partial_close && (
                  <div className="ml-7 space-y-2">
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                      {t("workflows.durationOptions", "Duration Options")}
                      <span className="text-xs font-normal text-[hsl(var(--muted-foreground))] ml-2">
                        {t("workflows.commaSeparatedLeaveEmptyToUseGlobal")}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={stateFormData.duration_options}
                      onChange={(e) =>
                        setStateFormData({
                          ...stateFormData,
                          duration_options: e.target.value,
                        })
                      }
                      placeholder={t(
                        "workflows.durationExample",
                        "e.g. 1 Day, 2 Days, 1 Week, 1 Month",
                      )}
                      className="w-full px-3 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                    />
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {t(
                        "workflows.closingDurationHint",
                        "Leave empty to use the global defaults configured in system settings.",
                      )}
                    </p>
                  </div>
                )}
                {/* Viewable Roles */}
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t("workflows.viewableRoles")}
                    <span className="text-xs font-normal text-[hsl(var(--muted-foreground))] ml-2">
                      {t("workflows.leaveEmptyToShowToAllRoles")}
                    </span>
                  </label>
                  <div className="border border-[hsl(var(--border))] rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all",
                          stateFormData.viewable_role_ids.includes(role.id)
                            ? "bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.3)]"
                            : "hover:bg-[hsl(var(--muted)/0.5)]",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={stateFormData.viewable_role_ids.includes(
                            role.id,
                          )}
                          onChange={() => toggleStateRole(role.id)}
                          className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                        />
                        <Shield className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        <span className="text-sm text-[hsl(var(--foreground))]">
                          {role.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Editable Roles */}
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t("workflows.editableRoles")}
                    <span className="text-xs font-normal text-[hsl(var(--muted-foreground))] ml-2">
                      {t("workflows.leaveEmptyToAllowAllRolesTo")}
                    </span>
                  </label>
                  <div className="border border-[hsl(var(--border))] rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all",
                          stateFormData.editable_role_ids.includes(role.id)
                            ? "bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.3)]"
                            : "hover:bg-[hsl(var(--muted)/0.5)]",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={stateFormData.editable_role_ids.includes(
                            role.id,
                          )}
                          onChange={() => toggleEditableStateRole(role.id)}
                          className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                        />
                        <Shield className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        <span className="text-sm text-[hsl(var(--foreground))]">
                          {role.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Creation-time Assignment — only for initial states */}
                {stateFormData.state_type === "initial" && (
                  <div className="border-t border-[hsl(var(--border))] pt-5">
                    <label className="block text-sm font-semibold text-[hsl(var(--foreground))] mb-1">
                      {t("incidents.userAssignment")}
                    </label>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                      {t("workflows.appliedWhenIncidentIsCreated")}
                    </p>
                    <div className="space-y-3">
                      {/* No allocation */}
                      <label className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] cursor-pointer">
                        <input
                          type="radio"
                          name="state_user_assignment_mode"
                          checked={
                            !stateFormData.auto_match_user &&
                            !stateFormData.manual_select_user &&
                            !stateFormData.assign_user_id
                          }
                          onChange={() =>
                            setStateFormData({
                              ...stateFormData,
                              auto_match_user: false,
                              manual_select_user: false,
                              assign_user_id: "",
                              assignment_role_ids: [],
                            })
                          }
                          className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))]"
                        />
                        <div>
                          <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                            {t("common.noUserAssignment")}
                          </span>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {t("workflows.donTChangeTheIncidentAssignee")}
                          </p>
                        </div>
                      </label>

                      {/* Auto-match */}
                      <label className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] cursor-pointer">
                        <input
                          type="radio"
                          name="state_user_assignment_mode"
                          checked={
                            stateFormData.auto_match_user &&
                            !stateFormData.manual_select_user
                          }
                          onChange={() =>
                            setStateFormData({
                              ...stateFormData,
                              auto_match_user: true,
                              manual_select_user: false,
                              assign_user_id: "",
                            })
                          }
                          className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))]"
                        />
                        <div>
                          <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                            {t("workflows.autoAssignAllMatchingUsers")}
                          </span>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {t(
                              "workflows.automaticallyAssignsAllUsersMatchingRoleIncident",
                            )}
                          </p>
                        </div>
                      </label>

                      {/* Manual selection */}
                      <label className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] cursor-pointer">
                        <input
                          type="radio"
                          name="state_user_assignment_mode"
                          checked={stateFormData.manual_select_user}
                          onChange={() =>
                            setStateFormData({
                              ...stateFormData,
                              auto_match_user: false,
                              manual_select_user: true,
                              assign_user_id: "",
                            })
                          }
                          className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))]"
                        />
                        <div>
                          <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                            {t("workflows.manualSelectionDuringTransition")}
                          </span>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {t(
                              "workflows.performerSelectsFromMatchingUsersWhenExecuting",
                            )}
                          </p>
                        </div>
                      </label>

                      {/* Assign specific user */}
                      <label className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] cursor-pointer">
                        <input
                          type="radio"
                          name="state_user_assignment_mode"
                          checked={
                            !stateFormData.auto_match_user &&
                            !stateFormData.manual_select_user &&
                            !!stateFormData.assign_user_id
                          }
                          onChange={() =>
                            setStateFormData({
                              ...stateFormData,
                              auto_match_user: false,
                              manual_select_user: false,
                              assignment_role_ids: [],
                            })
                          }
                          className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))]"
                        />
                        <div>
                          <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                            {t("workflows.assignSpecificUser")}
                          </span>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {t("workflows.alwaysAssignToASpecificUser")}
                          </p>
                        </div>
                      </label>

                      {/* Role selector for auto-match or manual */}
                      {(stateFormData.auto_match_user ||
                        stateFormData.manual_select_user) && (
                        <div className="ml-7">
                          <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                            {t("incidents.rolesToMatchSelectOneOrMore")}
                          </label>
                          <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden bg-[hsl(var(--background))]">
                            {roles.map((role) => {
                              const isSelected =
                                stateFormData.assignment_role_ids.includes(
                                  role.id,
                                );
                              return (
                                <label
                                  key={role.id}
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-[hsl(var(--muted)/0.4)] cursor-pointer border-b border-[hsl(var(--border))] last:border-b-0"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() =>
                                      toggleStateAssignmentRole(role.id)
                                    }
                                    className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                                  />
                                  <span className="text-sm text-[hsl(var(--foreground))]">
                                    {role.name}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Specific user dropdown */}
                      {!stateFormData.auto_match_user &&
                        !stateFormData.manual_select_user && (
                          <div className="ml-7">
                            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                              {t("incidents.selectUser")}
                            </label>
                            <select
                              value={stateFormData.assign_user_id}
                              onChange={(e) =>
                                setStateFormData({
                                  ...stateFormData,
                                  assign_user_id: e.target.value,
                                })
                              }
                              className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
                            >
                              <option value="">
                                {t("common.none")} (
                                {t("common.noUserAssignment")})
                              </option>
                              {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.first_name} {user.last_name}
                                  {user.email ? ` (${user.email})` : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {editingState && (
                  <div className="pt-2 border-t border-[hsl(var(--border))]">
                    <IntegrationTriggersPanel
                      triggerId={editingState.id}
                      type="state"
                    />
                  </div>
                )}

                <div className="border-t border-[hsl(var(--border))] pt-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <label className="text-sm font-semibold text-[hsl(var(--foreground))]">
                      {t("nav.notifications")}
                    </label>
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                    {t("workflows.notificationTemplatesDesc")}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                        {t("workflows.emailTemplate")}
                      </label>
                      <select
                        value={stateFormData.new_incident_email_template_code}
                        onChange={(e) =>
                          setStateFormData({
                            ...stateFormData,
                            new_incident_email_template_code: e.target.value,
                          })
                        }
                        className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
                      >
                        <option value="">{t("workflows.none")}</option>
                        {emailTemplates.map((tpl) => (
                          <option key={tpl.id} value={tpl.code}>
                            {tpl.name} ({tpl.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                        {t("workflows.smsTemplate")}
                      </label>
                      <select
                        value={stateFormData.new_incident_sms_template_code}
                        onChange={(e) =>
                          setStateFormData({
                            ...stateFormData,
                            new_incident_sms_template_code: e.target.value,
                          })
                        }
                        className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
                      >
                        <option value="">
                          {/* {t("goals.create.fields.noneCategory")} */}
                          {t("workflows.none")}
                        </option>
                        {smsTemplates.map((tpl) => (
                          <option key={tpl.id} value={tpl.code}>
                            {tpl.name} ({tpl.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
                <Button variant="ghost" type="button" onClick={closeStateModal}>
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  isLoading={
                    createStateMutation.isPending ||
                    updateStateMutation.isPending
                  }
                  leftIcon={
                    !(
                      createStateMutation.isPending ||
                      updateStateMutation.isPending
                    ) ? (
                      <Check className="w-4 h-4" />
                    ) : undefined
                  }
                >
                  {editingState
                    ? t("workflows.updateState")
                    : t("workflows.addState")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transition Modal */}
      {isTransitionModalOpen && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-xl flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {editingTransition
                      ? t("workflows.editTransition")
                      : t("workflows.addTransition")}
                  </h3>
                </div>
              </div>
              <button
                onClick={closeTransitionModal}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleTransitionSubmit}
              className="overflow-y-auto max-h-[calc(90vh-140px)]"
              noValidate
            >
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("common.name")}
                      <span className="text-[hsl(var(--destructive))] ml-1">
                        *
                      </span>
                    </label>
                    <input
                      type="text"
                      value={transitionFormData.name}
                      onChange={(e) => {
                        setTransitionFormData({
                          ...transitionFormData,
                          name: e.target.value,
                        });

                        if (transitionErrors.name) {
                          setTransitionErrors((prev) => ({
                            ...prev,
                            name: "",
                          }));
                        }

                        if (transitionDuplicateErrors.name) {
                          setTransitionDuplicateErrors((prev) => ({
                            ...prev,
                            name: "",
                          }));
                        }
                      }}
                      // className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                      className={`w-full px-4 py-2.5 bg-[hsl(var(--background))] rounded-xl text-sm focus:outline-none ${
                        transitionDuplicateErrors.name || transitionErrors.name
                          ? "border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                          : "border border-[hsl(var(--border))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                      }`}
                      placeholder={t("workflows.eGStartWorking")}
                      // required
                    />
                    {renderFieldError(
                      transitionDuplicateErrors.name || transitionErrors.name,
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("common.nameAr")}
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={transitionFormData.name_ar}
                      onChange={(e) =>
                        setTransitionFormData({
                          ...transitionFormData,
                          name_ar: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t("departments.code")}
                    <span className="text-[hsl(var(--destructive))] ml-1">
                      *
                    </span>
                  </label>
                  <input
                    type="text"
                    value={transitionFormData.code}
                    onChange={(e) => {
                      setTransitionFormData({
                        ...transitionFormData,
                        code: e.target.value,
                      });

                      if (transitionErrors.code) {
                        setTransitionErrors((prev) => ({
                          ...prev,
                          code: "",
                        }));
                      }
                      if (transitionDuplicateErrors.code) {
                        setTransitionDuplicateErrors((prev) => ({
                          ...prev,
                          code: "",
                        }));
                      }
                    }}
                    // className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                    className={`w-full px-4 py-2.5 bg-[hsl(var(--background))] rounded-xl text-sm focus:outline-none ${
                      transitionDuplicateErrors.name || transitionErrors.name
                        ? "border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                        : "border border-[hsl(var(--border))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                    }`}
                    placeholder={t("workflows.stateKeyExample")}
                    // required
                  />
                  {/* {transitionDuplicateErrors.code && (
                    <p className="mt-1 text-sm text-red-500">
                      {transitionDuplicateErrors.code}
                    </p>
                  )} */}
                  {renderFieldError(
                    transitionDuplicateErrors.code || transitionErrors.code,
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("common.description")}
                    </label>
                    <textarea
                      value={transitionFormData.description}
                      onChange={(e) =>
                        setTransitionFormData({
                          ...transitionFormData,
                          description: e.target.value,
                        })
                      }
                      rows={2}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("common.descriptionAr")}
                    </label>
                    <textarea
                      dir="rtl"
                      value={transitionFormData.description_ar}
                      onChange={(e) =>
                        setTransitionFormData({
                          ...transitionFormData,
                          description_ar: e.target.value,
                        })
                      }
                      rows={2}
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("workflows.fromState")}
                      <span className="text-[hsl(var(--destructive))] ml-1">
                        *
                      </span>
                    </label>
                    <select
                      value={transitionFormData.from_state_id}
                      onChange={(e) => {
                        setTransitionFormData({
                          ...transitionFormData,
                          from_state_id: e.target.value,
                        });

                        if (transitionErrors.fromState) {
                          setTransitionErrors((prev) => ({
                            ...prev,
                            fromState: "",
                          }));
                        }
                      }}
                      className={`w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] ${
                        transitionErrors.fromState
                          ? "border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                          : "border border-[hsl(var(--border))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                      }`}
                      required
                    >
                      <option value="">{t("workflows.selectState")}</option>
                      {states.map((state) => (
                        <option key={state.id} value={state.id}>
                          {i18n.language === "ar" && state.name_ar
                            ? state.name_ar
                            : state.name}
                        </option>
                      ))}
                    </select>
                    {renderFieldError(transitionErrors.fromState)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                      {t("workflows.toState")}
                      <span className="text-[hsl(var(--destructive))] ml-1">
                        *
                      </span>
                    </label>
                    <select
                      value={transitionFormData.to_state_id}
                      onChange={(e) => {
                        setTransitionFormData({
                          ...transitionFormData,
                          to_state_id: e.target.value,
                        });

                        if (transitionErrors.toState) {
                          setTransitionErrors((prev) => ({
                            ...prev,
                            toState: "",
                          }));
                        }
                      }}
                      className={`w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] ${
                        transitionErrors.toState
                          ? "border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                          : "border border-[hsl(var(--border))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                      }`}
                      required
                    >
                      <option value="">{t("workflows.selectState")}</option>
                      {states.map((state) => (
                        <option key={state.id} value={state.id}>
                          {i18n.language === "ar" && state.name_ar
                            ? state.name_ar
                            : state.name}
                        </option>
                      ))}
                    </select>
                    {renderFieldError(transitionErrors.toState)}
                  </div>
                </div>

                {/* Allowed Roles */}
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    {t("workflows.allowedRoles")}
                    <span className="text-xs font-normal text-[hsl(var(--muted-foreground))] ml-2">
                      {t("workflows.leaveEmptyToAllowAllRoles")}
                    </span>
                  </label>
                  <div className="border border-[hsl(var(--border))] rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all",
                          transitionFormData.role_ids.includes(role.id)
                            ? "bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.3)]"
                            : "hover:bg-[hsl(var(--muted)/0.5)]",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={transitionFormData.role_ids.includes(
                            role.id,
                          )}
                          onChange={() => toggleRole(role.id)}
                          className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                        />
                        <Shield className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        <span className="text-sm text-[hsl(var(--foreground))]">
                          {role.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Department Assignment */}
                <div className="border-t border-[hsl(var(--border))] pt-5">
                  <label className="block text-sm font-semibold text-[hsl(var(--foreground))] mb-3">
                    {t("incidents.departmentAssignment")}
                  </label>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={transitionFormData.auto_detect_department}
                        onChange={(e) => {
                          setTransitionFormData({
                            ...transitionFormData,
                            auto_detect_department: e.target.checked,
                            assign_department_id: e.target.checked
                              ? ""
                              : transitionFormData.assign_department_id,
                          });
                        }}
                        className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                      />
                      <div>
                        <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                          {t("incidents.autoDetectDeptLocation")}
                        </span>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {t("workflows.ifOneMatchAutoAssignIfMultiple")}
                        </p>
                      </div>
                    </label>

                    {transitionFormData.auto_detect_department && (
                      <div>
                        <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                          {t("workflows.departmentTypeToShow")}
                        </label>
                        <div className="flex gap-2">
                          {(
                            [
                              ["", "All Types"],
                              ["internal", "Internal Only"],
                              ["external", "External Only"],
                            ] as const
                          ).map(([val, label]) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() =>
                                setTransitionFormData({
                                  ...transitionFormData,
                                  department_type_filter: val,
                                })
                              }
                              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                transitionFormData.department_type_filter ===
                                val
                                  ? val === "external"
                                    ? "bg-amber-500 text-white border-amber-500"
                                    : "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]"
                                  : "bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!transitionFormData.auto_detect_department && (
                      <div>
                        <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                          {t("workflows.orSelectSpecificDepartment")}
                        </label>
                        <select
                          value={transitionFormData.assign_department_id}
                          onChange={(e) =>
                            setTransitionFormData({
                              ...transitionFormData,
                              assign_department_id: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                        >
                          <option value="">
                            {t("common.noDepartmentAssignment")}
                          </option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name} ({dept.type || "internal"})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Assignment */}
                <div className="border-t border-[hsl(var(--border))] pt-5">
                  <label className="block text-sm font-semibold text-[hsl(var(--foreground))] mb-3">
                    {t("incidents.userAssignment")}
                  </label>

                  <div className="space-y-3">
                    {/* Option 1: No assignment */}
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] cursor-pointer">
                      <input
                        type="radio"
                        name="user_assignment_mode"
                        checked={
                          !transitionFormData.auto_match_user &&
                          !transitionFormData.manual_select_user &&
                          !transitionFormData.assign_user_id
                        }
                        onChange={() => {
                          setTransitionFormData({
                            ...transitionFormData,
                            auto_match_user: false,
                            manual_select_user: false,
                            assign_user_id: "",
                            assignment_role_ids: [],
                          });
                        }}
                        className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))]"
                      />
                      <div>
                        <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                          {t("common.noUserAssignment")}
                        </span>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {t("workflows.donTChangeTheIncidentAssignee")}
                        </p>
                      </div>
                    </label>

                    {/* Option 2: Auto-assign all matching users */}
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] cursor-pointer">
                      <input
                        type="radio"
                        name="user_assignment_mode"
                        checked={
                          transitionFormData.auto_match_user &&
                          !transitionFormData.manual_select_user
                        }
                        onChange={() => {
                          setTransitionFormData({
                            ...transitionFormData,
                            auto_match_user: true,
                            manual_select_user: false,
                            assign_user_id: "",
                          });
                        }}
                        className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))]"
                      />
                      <div>
                        <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                          {t("workflows.autoAssignAllMatchingUsers")}
                        </span>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {t(
                            "workflows.automaticallyAssignsAllUsersMatchingRoleIncident",
                          )}
                        </p>
                      </div>
                    </label>

                    {/* Option 3: Manual selection */}
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] cursor-pointer">
                      <input
                        type="radio"
                        name="user_assignment_mode"
                        checked={transitionFormData.manual_select_user}
                        onChange={() => {
                          setTransitionFormData({
                            ...transitionFormData,
                            auto_match_user: false,
                            manual_select_user: true,
                            assign_user_id: "",
                          });
                        }}
                        className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))]"
                      />
                      <div>
                        <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                          {t("workflows.manualSelectionDuringTransition")}
                        </span>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {t(
                            "workflows.performerSelectsFromMatchingUsersWhenExecuting",
                          )}
                        </p>
                      </div>
                    </label>

                    {/* Option 4: Assign specific user */}
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] cursor-pointer">
                      <input
                        type="radio"
                        name="user_assignment_mode"
                        checked={
                          !transitionFormData.auto_match_user &&
                          !transitionFormData.manual_select_user &&
                          !!transitionFormData.assign_user_id
                        }
                        onChange={() => {
                          setTransitionFormData({
                            ...transitionFormData,
                            auto_match_user: false,
                            manual_select_user: false,
                            assignment_role_ids: [],
                          });
                        }}
                        className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))]"
                      />
                      <div>
                        <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                          {t("workflows.assignSpecificUser")}
                        </span>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {t("workflows.alwaysAssignToASpecificUser")}
                        </p>
                      </div>
                    </label>

                    {/* Role selector for auto-match or manual selection */}
                    {(transitionFormData.auto_match_user ||
                      transitionFormData.manual_select_user) && (
                      <div className="ml-7">
                        <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                          {t("incidents.rolesToMatchSelectOneOrMore")}
                        </label>
                        <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden bg-[hsl(var(--background))]">
                          {roles.map((role) => {
                            const isSelected =
                              transitionFormData.assignment_role_ids.includes(
                                role.id,
                              );
                            return (
                              <label
                                key={role.id}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-[hsl(var(--muted)/0.4)] cursor-pointer border-b border-[hsl(var(--border))] last:border-b-0"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const updated = isSelected
                                      ? transitionFormData.assignment_role_ids.filter(
                                          (id) => id !== role.id,
                                        )
                                      : [
                                          ...transitionFormData.assignment_role_ids,
                                          role.id,
                                        ];
                                    setTransitionFormData({
                                      ...transitionFormData,
                                      assignment_role_ids: updated,
                                    });
                                  }}
                                  className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                                />
                                <span className="text-sm text-[hsl(var(--foreground))]">
                                  {role.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        {transitionFormData.assignment_role_ids.length > 0 && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                            {transitionFormData.assignment_role_ids.length}
                            {t("workflows.role")}
                            {transitionFormData.assignment_role_ids.length > 1
                              ? "s"
                              : ""}{" "}
                            {t("workflows.selected")}
                          </p>
                        )}
                      </div>
                    )}

                    {/* User selector for specific user assignment */}
                    {!transitionFormData.auto_match_user &&
                      !transitionFormData.manual_select_user && (
                        <div className="ml-7">
                          <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                            {t("workflows.selectUser")}
                          </label>
                          <select
                            value={transitionFormData.assign_user_id}
                            onChange={(e) =>
                              setTransitionFormData({
                                ...transitionFormData,
                                assign_user_id: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                          >
                            <option value="">
                              {t("common.noUserAssignment")}
                            </option>
                            {users.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.first_name} {user.last_name} ({user.email}
                                )
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Rejection Tracking */}
              <div className="px-6 py-4 border-t border-[hsl(var(--border))]">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 rounded border-[hsl(var(--border))] text-destructive focus:ring-destructive"
                    checked={transitionFormData.is_rejection}
                    onChange={(e) =>
                      setTransitionFormData((prev) => ({
                        ...prev,
                        is_rejection: e.target.checked,
                      }))
                    }
                  />
                  <div>
                    <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {t("workflows.markAsRejectionTransition")}
                    </span>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      {t(
                        "workflows.whenEnabledExecutingThisTransitionWillCreate",
                      )}
                    </p>
                  </div>
                </label>
              </div>

              {/* Not Belong */}
              <div className="px-6 py-4 border-t border-[hsl(var(--border))]">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 rounded border-[hsl(var(--border))] text-warning focus:ring-warning"
                    checked={transitionFormData.is_not_belong}
                    onChange={(e) =>
                      setTransitionFormData((prev) => ({
                        ...prev,
                        is_not_belong: e.target.checked,
                      }))
                    }
                  />
                  <div>
                    <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {t("workflows.markAsNotBelongTransition")}
                    </span>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      {t("workflows.whenEnabledNotBelongWillSendSMS")}
                    </p>
                  </div>
                </label>
              </div>

              {/* Missing Incident Information */}
              <div className="px-6 py-4 border-t border-[hsl(var(--border))]">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 rounded border-[hsl(var(--border))] text-orange-500 focus:ring-orange-500"
                    checked={transitionFormData.is_missing_info}
                    onChange={(e) =>
                      setTransitionFormData((prev) => ({
                        ...prev,
                        is_missing_info: e.target.checked,
                      }))
                    }
                  />
                  <div>
                    <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {t("workflows.markAsMissingInfoTransition")}
                    </span>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      {t("workflows.whenEnabledMissingInfoWillSendSMS")}
                    </p>
                  </div>
                </label>
              </div>

              {/* Reopen Transition */}
              <div className="px-6 py-4 border-t border-[hsl(var(--border))]">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 rounded border-[hsl(var(--border))] text-emerald-600 focus:ring-emerald-500"
                    checked={transitionFormData.is_reopen}
                    onChange={(e) =>
                      setTransitionFormData((prev) => ({
                        ...prev,
                        is_reopen: e.target.checked,
                      }))
                    }
                  />
                  <div>
                    <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {t("workflows.markAsReopenTransition")}
                    </span>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      {t("workflows.whenEnabledReopenDesc")}
                    </p>
                  </div>
                </label>
              </div>

              {/* Final Close Transition */}
              <div className="px-6 py-4 border-t border-[hsl(var(--border))]">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 rounded border-[hsl(var(--border))] text-blue-600 focus:ring-blue-500"
                    checked={transitionFormData.is_final_close}
                    onChange={(e) =>
                      setTransitionFormData((prev) => ({
                        ...prev,
                        is_final_close: e.target.checked,
                      }))
                    }
                  />
                  <div>
                    <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {t("workflows.markAsFinalCloseTransition")}
                    </span>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      {t("workflows.whenEnabledFinalCloseDesc")}
                    </p>
                  </div>
                </label>
              </div>

              {/* Require Assignee */}
              <div className="px-6 py-4 border-t border-[hsl(var(--border))]">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 rounded border-[hsl(var(--border))] text-emerald-600 focus:ring-emerald-500"
                    checked={transitionFormData.require_assignee}
                    onChange={(e) =>
                      setTransitionFormData((prev) => ({
                        ...prev,
                        require_assignee: e.target.checked,
                      }))
                    }
                  />
                  <div>
                    <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                      Require Assignee
                    </span>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      When enabled, only the assigned user(s) can execute this
                      transition. Other users with the allowed role can view the
                      incident but cannot act on it.
                    </p>
                  </div>
                </label>
              </div>

              {editingTransition && (
                <div className="px-6 py-4 border-t border-[hsl(var(--border))]">
                  <IntegrationTriggersPanel
                    triggerId={editingTransition.id}
                    type="transition"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={closeTransitionModal}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  isLoading={
                    createTransitionMutation.isPending ||
                    updateTransitionMutation.isPending
                  }
                  leftIcon={
                    !(
                      createTransitionMutation.isPending ||
                      updateTransitionMutation.isPending
                    ) ? (
                      <Check className="w-4 h-4" />
                    ) : undefined
                  }
                >
                  {editingTransition
                    ? t("workflows.updateTransition")
                    : t("workflows.addTransition")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {isConfigModalOpen && configuringTransition && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {t("workflows.configureTransition")}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {i18n.language === "ar" && configuringTransition.name_ar
                      ? configuringTransition.name_ar
                      : configuringTransition.name}
                  </p>
                </div>
              </div>
              <button
                onClick={closeConfigModal}
                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6 space-y-6">
                {/* Requirements Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {t("workflows.requirements")}
                      </label>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={addRequirement}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      {t("common.add")}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {requirements.length === 0 ? (
                      <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
                        {t("common.noRequirementsConfigured")}
                      </p>
                    ) : (
                      requirements.map((req, index) => (
                        <div
                          key={index}
                          className="p-4 bg-[hsl(var(--muted)/0.5)] rounded-xl space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <select
                              value={req.requirement_type}
                              onChange={(e) =>
                                updateRequirement(
                                  index,
                                  "requirement_type",
                                  e.target.value,
                                )
                              }
                              className="px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                            >
                              <option value="comment">
                                {t("workflows.commentRequired")}
                              </option>
                              <option value="attachment">
                                {t("workflows.attachmentRequired")}
                              </option>
                              <option value="feedback">
                                {t("workflows.feedbackRequired")}
                              </option>
                              <option value="rating">
                                {t("workflows.ratingRequired")}
                              </option>
                              <option value="field_value">
                                {t("workflows.fieldValueRequired")}
                              </option>
                            </select>
                            <button
                              onClick={() => removeRequirement(index)}
                              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={req.is_mandatory}
                                onChange={(e) =>
                                  updateRequirement(
                                    index,
                                    "is_mandatory",
                                    e.target.checked,
                                  )
                                }
                                className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                              />
                              <span className="text-sm text-[hsl(var(--foreground))]">
                                {t("workflows.mandatory")}
                              </span>
                            </label>
                          </div>
                          <input
                            type="text"
                            placeholder={t("workflows.errorMessageOptional")}
                            value={req.error_message || ""}
                            onChange={(e) =>
                              updateRequirement(
                                index,
                                "error_message",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                          />
                          {(req.requirement_type === "comment" ||
                            req.requirement_type === "feedback") && (
                            <>
                              <hr className="border-[hsl(var(--border))]" />
                              <button
                                type="button"
                                disabled={!configuringTransition?.id}
                                onClick={() =>
                                  setTemplateModal({
                                    type: req.requirement_type as
                                      | "comment"
                                      | "feedback",
                                    transitionId: configuringTransition!.id,
                                    transitionName: configuringTransition!.name,
                                  })
                                }
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--background))] hover:bg-[hsl(var(--muted)/0.5)] transition-colors disabled:opacity-40"
                              >
                                <Settings className="w-3.5 h-3.5" />
                                {t("workflows.configure")}{" "}
                                {req.requirement_type === "feedback"
                                  ? "feedback"
                                  : "comments"}
                              </button>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Field Changes Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <PenLine className="w-5 h-5 text-violet-500" />
                      <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {t("incidents.fieldChanges")}
                      </label>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t("workflows.fieldsTheUserCanEditDuringThis")}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={addFieldChange}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      {t("common.add")}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {fieldChanges.length === 0 ? (
                      <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
                        {t("common.noFieldChangesConfigured")}
                      </p>
                    ) : (
                      fieldChanges.map((fc, index) => (
                        <div
                          key={index}
                          className="p-4 bg-[hsl(var(--muted)/0.5)] rounded-xl space-y-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <select
                              value={fc.field_name}
                              onChange={(e) => {
                                const field = e.target.value;
                                const defaultLabels: Record<string, string> = {
                                  priority: "Priority",
                                  department_id: "Department",
                                  location_id: "Location",
                                  classification_id: "Classification",
                                  title: "Title",
                                  description: "Description",
                                  ...Object.fromEntries(
                                    allLookupCategories.map((cat) => [
                                      `lookup:${cat.code}`,
                                      cat.name,
                                    ]),
                                  ),
                                };
                                // Update both field_name and auto-label in one atomic state write
                                // to avoid the second setFieldChanges overwriting the first.
                                const updated = [...fieldChanges];
                                updated[index] = {
                                  ...updated[index],
                                  field_name: field,
                                  label:
                                    updated[index].label ||
                                    defaultLabels[field] ||
                                    field,
                                };
                                setFieldChanges(updated);
                              }}
                              className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                            >
                              <optgroup
                                label={t("IncidentFields") || "Incident Fields"}
                              >
                                <option value="priority">
                                  {t("common.priority")}
                                </option>
                                <option value="department_id">
                                  {t("common.department")}
                                </option>
                                <option value="location_id">
                                  {t("common.location")}
                                </option>
                                <option value="classification_id">
                                  {t("common.classification")}
                                </option>
                                <option value="title">
                                  {t("incidents.incidentTitle")}
                                </option>
                                <option value="description">
                                  {t("common.description")}
                                </option>
                              </optgroup>
                              {allLookupCategories.filter(
                                (cat) => cat.is_active,
                              ).length > 0 && (
                                <optgroup
                                  label={
                                    t("MasterDataFields") ||
                                    "Master Data Fields"
                                  }
                                >
                                  {allLookupCategories
                                    .filter((cat) => cat.is_active)
                                    .map((cat) => (
                                      <option
                                        key={cat.id}
                                        value={`lookup:${cat.code}`}
                                      >
                                        {cat.name}
                                      </option>
                                    ))}
                                </optgroup>
                              )}
                            </select>
                            <button
                              onClick={() => removeFieldChange(index)}
                              className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder={t("workflows.labelEGSelectDepartment")}
                            value={fc.label || ""}
                            onChange={(e) =>
                              updateFieldChange(index, "label", e.target.value)
                            }
                            className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                          />
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={fc.is_required}
                              onChange={(e) =>
                                updateFieldChange(
                                  index,
                                  "is_required",
                                  e.target.checked,
                                )
                              }
                              className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                            />
                            <span className="text-sm text-[hsl(var(--foreground))]">
                              {t("common.required")}
                            </span>
                          </label>
                          {fc.field_name === "department_id" && (
                            <div>
                              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                                {t("workflows.departmentTypeToShow")}
                              </label>
                              <div className="flex gap-2">
                                {(
                                  [
                                    ["", "All Types"],
                                    ["internal", "Internal Only"],
                                    ["external", "External Only"],
                                  ] as const
                                ).map(([val, label]) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() =>
                                      updateFieldChange(
                                        index,
                                        "department_type_filter",
                                        val,
                                      )
                                    }
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                      (fc.department_type_filter || "") === val
                                        ? val === "external"
                                          ? "bg-amber-500 text-white border-amber-500"
                                          : "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]"
                                        : "bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]"
                                    }`}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Actions Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-emerald-500" />
                      <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                        {t("workflows.automationActions")}
                      </label>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={addAction}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      {t("common.add")}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {actions.length === 0 ? (
                      <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
                        {t("common.noActionsConfigured")}
                      </p>
                    ) : (
                      actions.map((action, index) => {
                        // Parse email config if action type is email
                        const getEmailConfig = (): TransitionEmailConfig => {
                          try {
                            return action.config
                              ? JSON.parse(action.config)
                              : {
                                  enabled: true,
                                  recipients: [],
                                  custom_emails: [],
                                  subject_template: "",
                                  body_template: "",
                                  include_incident_details: true,
                                  include_transition_info: true,
                                  include_comments: false,
                                };
                          } catch {
                            return {
                              enabled: true,
                              recipients: [],
                              custom_emails: [],
                              subject_template: "",
                              body_template: "",
                              include_incident_details: true,
                              include_transition_info: true,
                              include_comments: false,
                            };
                          }
                        };

                        const updateEmailConfig = (
                          updates: Partial<TransitionEmailConfig>,
                        ) => {
                          const current = getEmailConfig();
                          const updated = { ...current, ...updates };
                          updateAction(
                            index,
                            "config",
                            JSON.stringify(updated),
                          );
                        };

                        const toggleRecipient = (
                          recipient: EmailRecipientType,
                        ) => {
                          const config = getEmailConfig();
                          const recipients = config.recipients || [];
                          if (recipients.includes(recipient)) {
                            updateEmailConfig({
                              recipients: recipients.filter(
                                (r) => r !== recipient,
                              ),
                            });
                          } else {
                            updateEmailConfig({
                              recipients: [...recipients, recipient],
                            });
                          }
                        };

                        const emailConfig = getEmailConfig();

                        // SMS config helpers — always derived from action.config
                        const getSmsConfig = (): TransitionSmsConfig => {
                          try {
                            const parsed = action.config
                              ? JSON.parse(action.config)
                              : {};
                            return {
                              recipients: parsed.recipients || [],
                              custom_phones: parsed.custom_phones || [],
                              template_code: parsed.template_code || "",
                              message_template: parsed.message_template || "",
                            };
                          } catch {
                            return {
                              recipients: [],
                              custom_phones: [],
                              message_template: "",
                            };
                          }
                        };
                        const updateSmsConfig = (
                          updates: Partial<TransitionSmsConfig>,
                        ) => {
                          const current = getSmsConfig();
                          updateAction(
                            index,
                            "config",
                            JSON.stringify({ ...current, ...updates }),
                          );
                        };
                        const smsConfig = getSmsConfig();

                        return (
                          <div
                            key={index}
                            className="p-4 bg-[hsl(var(--muted)/0.5)] rounded-xl space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <select
                                value={action.action_type}
                                onChange={(e) => {
                                  const newType = e.target.value;
                                  const updated = [...actions];
                                  updated[index] = {
                                    ...updated[index],
                                    action_type:
                                      newType as TransitionActionRequest["action_type"],
                                    config: "",
                                  };
                                  setActions(updated);
                                  if (newType !== "email") {
                                    setCustomEmailInputs((prev) => {
                                      const next = { ...prev };
                                      delete next[index];
                                      return next;
                                    });
                                  }
                                  if (newType !== "sms") {
                                    setSmsPhoneInputs((prev) => {
                                      const next = { ...prev };
                                      delete next[index];
                                      return next;
                                    });
                                  }
                                }}
                                className="px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                              >
                                <option value="notification">
                                  {t("workflows.sendNotification")}
                                </option>
                                <option value="email">
                                  {t("workflows.sendEmail")}
                                </option>
                                <option value="sms">Send SMS</option>
                                <option value="webhook">
                                  {t("workflows.callWebhook")}
                                </option>
                                <option value="field_update">
                                  {t("workflows.updateField")}
                                </option>
                              </select>
                              <button
                                onClick={() => removeAction(index)}
                                className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder={t("workflows.actionName")}
                              value={action.name}
                              onChange={(e) =>
                                updateAction(index, "name", e.target.value)
                              }
                              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                            />

                            {/* Email-specific configuration */}
                            {action.action_type === "email" ? (
                              <div className="space-y-4 pt-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                                  <Mail className="w-4 h-4" />
                                  {t("workflows.emailNotificationSettings")}
                                </div>

                                {/* Recipients */}
                                <div>
                                  <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2">
                                    {t("workflows.emailRecipients")}
                                  </label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {EMAIL_RECIPIENTS.map((recipient) => (
                                      <label
                                        key={recipient.value}
                                        className={cn(
                                          "flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all border",
                                          emailConfig.recipients?.includes(
                                            recipient.value,
                                          )
                                            ? "bg-blue-50 border-blue-200"
                                            : "bg-[hsl(var(--background))] border-[hsl(var(--border))] hover:border-blue-200",
                                        )}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={
                                            emailConfig.recipients?.includes(
                                              recipient.value,
                                            ) || false
                                          }
                                          onChange={() =>
                                            toggleRecipient(recipient.value)
                                          }
                                          className="w-4 h-4 mt-0.5 text-blue-600 border-[hsl(var(--border))] rounded"
                                        />
                                        <div>
                                          <span className="text-xs font-medium text-[hsl(var(--foreground))]">
                                            {recipient.label}
                                          </span>
                                          <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-tight">
                                            {recipient.description}
                                          </p>
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                {/* Custom emails input (shown when 'custom' is selected) */}
                                {emailConfig.recipients?.includes("custom") && (
                                  <div>
                                    <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                                      {t("workflows.customEmailAddresses")}
                                    </label>
                                    <input
                                      type="text"
                                      placeholder={t(
                                        "workflows.email1ExampleComEmail2ExampleCom",
                                      )}
                                      value={
                                        customEmailInputs[index] ??
                                        emailConfig.custom_emails?.join(", ") ??
                                        ""
                                      }
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        setCustomEmailInputs((prev) => ({
                                          ...prev,
                                          [index]: value,
                                        }));
                                        updateEmailConfig({
                                          custom_emails:
                                            parseCommaSeparatedEmails(value),
                                        });
                                      }}
                                      className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                                    />
                                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                                      {t(
                                        "workflows.separateMultipleEmailsWithCommas",
                                      )}
                                    </p>
                                  </div>
                                )}

                                {/* Email Notification Template */}
                                {(() => {
                                  const testEntry = actionTestState[index];
                                  return (
                                    <div className="space-y-2">
                                      <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                                        Email Template
                                      </label>
                                      <div className="flex gap-2">
                                        <select
                                          value={
                                            emailConfig.template_code || ""
                                          }
                                          onChange={(e) =>
                                            updateEmailConfig({
                                              template_code: e.target.value,
                                            })
                                          }
                                          className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                                        >
                                          <option value="">
                                            — Select a template —
                                          </option>
                                          {emailTemplates.map((tpl) => (
                                            <option
                                              key={tpl.id}
                                              value={tpl.code}
                                            >
                                              [{tpl.action_type}] {tpl.name} (
                                              {tpl.code})
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          type="button"
                                          disabled={!emailConfig.template_code}
                                          onClick={() =>
                                            setActionTestState((prev) => ({
                                              ...prev,
                                              [index]: {
                                                open: !prev[index]?.open,
                                                recipient:
                                                  prev[index]?.recipient ?? "",
                                                status: null,
                                                error: null,
                                              },
                                            }))
                                          }
                                          className="px-3 py-2 text-xs font-medium rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                        >
                                          Send Test
                                        </button>
                                      </div>

                                      {/* Inline test panel */}
                                      {testEntry?.open &&
                                        emailConfig.template_code && (
                                          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-2">
                                            <p className="text-xs font-semibold text-blue-700">
                                              Send test email using &quot;
                                              {emailConfig.template_code}&quot;
                                            </p>
                                            <div className="flex gap-2">
                                              <input
                                                type="email"
                                                placeholder="recipient@example.com"
                                                value={testEntry.recipient}
                                                onChange={(e) =>
                                                  setActionTestState(
                                                    (prev) => ({
                                                      ...prev,
                                                      [index]: {
                                                        ...prev[index],
                                                        recipient:
                                                          e.target.value,
                                                      },
                                                    }),
                                                  )
                                                }
                                                className="flex-1 px-2 py-1.5 text-xs bg-white border border-blue-300 rounded-lg"
                                              />
                                              <button
                                                type="button"
                                                disabled={
                                                  !testEntry.recipient ||
                                                  sendTestMutation.isPending
                                                }
                                                onClick={() => {
                                                  sendTestMutation.mutate(
                                                    {
                                                      channel: "email",
                                                      templateCode:
                                                        emailConfig.template_code!,
                                                      to: testEntry.recipient,
                                                    },
                                                    {
                                                      onSuccess: (data) => {
                                                        setActionTestState(
                                                          (prev) => ({
                                                            ...prev,
                                                            [index]: {
                                                              ...prev[index],
                                                              status:
                                                                data?.data
                                                                  ?.status ??
                                                                "sent",
                                                              error: null,
                                                            },
                                                          }),
                                                        );
                                                      },
                                                      onError: (err: any) => {
                                                        setActionTestState(
                                                          (prev) => ({
                                                            ...prev,
                                                            [index]: {
                                                              ...prev[index],
                                                              status: null,
                                                              error:
                                                                err?.response
                                                                  ?.data
                                                                  ?.error ??
                                                                "Send failed",
                                                            },
                                                          }),
                                                        );
                                                      },
                                                    },
                                                  );
                                                }}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
                                              >
                                                {sendTestMutation.isPending
                                                  ? "Sending…"
                                                  : "Send"}
                                              </button>
                                            </div>
                                            {testEntry.status && (
                                              <p className="text-[10px] text-green-700 font-medium">
                                                ✓ Delivered — status:{" "}
                                                {testEntry.status}
                                              </p>
                                            )}
                                            {testEntry.error && (
                                              <p className="text-[10px] text-red-600">
                                                ✗ {testEntry.error}
                                              </p>
                                            )}
                                          </div>
                                        )}
                                    </div>
                                  );
                                })()}

                                {/* Include options */}
                                <div>
                                  <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2">
                                    {t("workflows.includeInEmail")}
                                  </label>
                                  <div className="flex flex-wrap gap-3">
                                    <label className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={
                                          emailConfig.include_incident_details ??
                                          true
                                        }
                                        onChange={(e) =>
                                          updateEmailConfig({
                                            include_incident_details:
                                              e.target.checked,
                                          })
                                        }
                                        className="w-4 h-4 text-blue-600 border-[hsl(var(--border))] rounded"
                                      />
                                      <span className="text-xs text-[hsl(var(--foreground))]">
                                        {t("workflows.incidentDetails")}
                                      </span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={
                                          emailConfig.include_transition_info ??
                                          true
                                        }
                                        onChange={(e) =>
                                          updateEmailConfig({
                                            include_transition_info:
                                              e.target.checked,
                                          })
                                        }
                                        className="w-4 h-4 text-blue-600 border-[hsl(var(--border))] rounded"
                                      />
                                      <span className="text-xs text-[hsl(var(--foreground))]">
                                        {t("incidents.transitionInfo")}
                                      </span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={
                                          emailConfig.include_comments ?? false
                                        }
                                        onChange={(e) =>
                                          updateEmailConfig({
                                            include_comments: e.target.checked,
                                          })
                                        }
                                        className="w-4 h-4 text-blue-600 border-[hsl(var(--border))] rounded"
                                      />
                                      <span className="text-xs text-[hsl(var(--foreground))]">
                                        {t("incidents.comments")}
                                      </span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            ) : /* SMS-specific configuration */
                            action.action_type === "sms" ? (
                              <div className="space-y-3 pt-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                                  <span>📱</span>
                                  SMS Settings
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2">
                                    Recipients
                                  </label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {(
                                      [
                                        "assignee",
                                        "reporter",
                                        "creator",
                                        "caller",
                                        "custom",
                                      ] as const
                                    ).map((r) => (
                                      <label
                                        key={r}
                                        className="flex items-center gap-2 p-2 rounded-lg border border-[hsl(var(--border))] cursor-pointer hover:bg-[hsl(var(--muted)/0.5)]"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={smsConfig.recipients.includes(
                                            r,
                                          )}
                                          onChange={() => {
                                            const list = smsConfig.recipients;
                                            updateSmsConfig({
                                              recipients: list.includes(r)
                                                ? list.filter((x) => x !== r)
                                                : [...list, r],
                                            });
                                          }}
                                          className="w-4 h-4"
                                        />
                                        <span className="text-sm capitalize">
                                          {r.replace("_", " ")}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                {smsConfig.recipients.includes("custom") && (
                                  <div>
                                    <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                                      Custom Phone Numbers (comma-separated)
                                    </label>
                                    <input
                                      type="text"
                                      inputMode="tel"
                                      value={
                                        smsPhoneInputs[index] ??
                                        smsConfig.custom_phones.join(", ")
                                      }
                                      onChange={(e) => {
                                        const value = sanitizeSmsPhoneInput(
                                          e.target.value,
                                        );
                                        setSmsPhoneInputs((prev) => ({
                                          ...prev,
                                          [index]: value,
                                        }));
                                        updateSmsConfig({
                                          custom_phones:
                                            parseCommaSeparatedPhones(value),
                                        });
                                      }}
                                      placeholder="+1234567890,+0987654321"
                                      className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                                    />
                                  </div>
                                )}
                                <div>
                                  <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                                    SMS Template
                                  </label>
                                  <select
                                    value={smsConfig.template_code || ""}
                                    onChange={(e) =>
                                      updateSmsConfig({
                                        template_code: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm"
                                  >
                                    <option value="">
                                      — Select a template —
                                    </option>
                                    {smsTemplates.map((tpl) => (
                                      <option key={tpl.id} value={tpl.code}>
                                        {tpl.name} ({tpl.code})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            ) : (
                              /* Generic config textarea for webhook / field_update / notification */
                              <textarea
                                placeholder={t("workflows.configurationJson")}
                                value={action.config || ""}
                                onChange={(e) =>
                                  updateAction(index, "config", e.target.value)
                                }
                                rows={2}
                                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm font-mono resize-none"
                              />
                            )}

                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={action.is_async}
                                  onChange={(e) =>
                                    updateAction(
                                      index,
                                      "is_async",
                                      e.target.checked,
                                    )
                                  }
                                  className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                                />
                                <span className="text-sm text-[hsl(var(--foreground))]">
                                  {t("workflows.runAsync")}
                                </span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={action.is_active}
                                  onChange={(e) =>
                                    updateAction(
                                      index,
                                      "is_active",
                                      e.target.checked,
                                    )
                                  }
                                  className="w-4 h-4 text-[hsl(var(--primary))] border-[hsl(var(--border))] rounded"
                                />
                                <span className="text-sm text-[hsl(var(--foreground))]">
                                  {t("workflows.active")}
                                </span>
                              </label>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={closeConfigModal}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleSaveConfig}
                  isLoading={
                    setRequirementsMutation.isPending ||
                    setActionsMutation.isPending ||
                    setFieldChangesMutation.isPending
                  }
                  leftIcon={
                    !(
                      setRequirementsMutation.isPending ||
                      setActionsMutation.isPending ||
                      setFieldChangesMutation.isPending
                    ) ? (
                      <Check className="w-4 h-4" />
                    ) : undefined
                  }
                >
                  {t("workflows.saveConfiguration")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete State Confirmation */}
      {deleteStateConfirm && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-[hsl(var(--destructive)/0.1)] rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-[hsl(var(--destructive))]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {t("workflows.deleteState")}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    {t("workflows.thisWillAlsoDeleteAllTransitionsConnected")}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteStateConfirm(null)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteStateMutation.mutate(deleteStateConfirm)}
                  isLoading={deleteStateMutation.isPending}
                >
                  {t("workflows.deleteState")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Transition Confirmation */}
      {deleteTransitionConfirm && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-[hsl(var(--destructive)/0.1)] rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-[hsl(var(--destructive))]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                    {t("workflows.deleteTransition")}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    {t("workflows.areYouSureYouWantToDelete")}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteTransitionConfirm(null)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() =>
                    deleteTransitionMutation.mutate(deleteTransitionConfirm)
                  }
                  isLoading={deleteTransitionMutation.isPending}
                >
                  {t("workflows.deleteTransition")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {templateModal && (
        <div className="fixed inset-0 bg-[hsl(var(--foreground)/0.6)] backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[hsl(var(--primary))]" />
                <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                  {t("workflows.configure")}{" "}
                  {templateModal.type === "feedback" ? "feedback" : "comment"}{" "}
                  {t("workflows.options")}
                </h3>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  · {templateModal.transitionName}
                </span>
              </div>
              <button
                onClick={() => setTemplateModal(null)}
                className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <TemplateModalBody
              type={templateModal.type}
              transitionId={templateModal.transitionId}
            />
          </div>
        </div>
      )}
    </div>
  );
};
