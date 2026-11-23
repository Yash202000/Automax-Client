// Nazaha "Create Report" / "Edit Report" screens (CLIENT=NAZAHA). Replace the
// generic create and edit pages (/incidents/new, /incidents/:id/edit) for Nazaha
// only; both use the same form so the two never drift apart. Field order follows the client's
// mockup (sections 1-6). Every field follows the selected workflow's form
// config like the generic create page (hidden unless listed, required when in
// required_fields), including the Nazaha fields added to the workflow designer.
// Fixed: report date, classification, location and city.
// Workflow field names: the existing "reporter_phone" (Caller Phone Number) is
// the Caller Number here; the reporter's mobile is "reporter_mobile".
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  Info,
  Loader2,
  Save,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  Input,
  LocationPicker,
  LocationPickerModal,
  Modal,
  ModalBody,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  MultiSelect,
  PhoneNumberInput,
  Select,
  Textarea,
  TreeSelect,
} from "../../components/ui";
import type { LocationData, TreeSelectNode } from "../../components/ui";
import { DynamicLookupField } from "../../components/common/DynamicLookupField";
import { AttachmentPreview } from "@/components/common/AttachmentPreview";
import {
  AttachmentDropzone,
  AttachmentFileRow,
  RejectedFileRows,
} from "@/components/attachments/AttachmentUpload";
import {
  classificationApi,
  departmentApi,
  incidentApi,
  locationApi,
  lookupApi,
  userApi,
  workflowApi,
} from "../../api/admin";
import { nazahaApi } from "../../api/nazaha";
import type {
  Classification,
  IncidentAttachment,
  IncidentCreateRequest,
  IncidentUpdateRequest,
  Location,
  User,
  Workflow,
} from "../../types";
import { usePermissions } from "../../hooks/usePermissions";
import {
  Select as AppSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { Avatar, AvatarBadge, AvatarFallback } from "@/ui/avatar";
import { VirtualizedList } from "@/components/ui/virtualized-list";
import { getAvatarName } from "@/lib/utils";
import { PERMISSIONS } from "../../constants/permissions";
import { useAuthStore } from "../../stores/authStore";
import { useSoftphoneStore } from "@/stores/softphoneStore";
import { useAttachmentPolicy } from "@/hooks/useAttachmentPolicy";
import { useImageValidation } from "@/hooks/useImageValidation";
import { generateRecordTitle } from "@/utils/generateLocalizedTitle";
import { getLocalizedName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  getPhoneCountryName,
  getPhoneNumberCountryIssue,
  normalizePhoneNumber,
} from "@/utils/phoneCountries";
import {
  INCIDENT_CALLER_NUMBER_EDITABLE,
  INCIDENT_CONTENT_MAX_LENGTH,
  NAZAHA_GENDERS,
  CONCERNED_AUTHORITY_CATEGORY,
  NATIONALITY_CATEGORY,
  NAZAHA_LOOKUP_CATEGORIES,
} from "@/utils/nazaha";

type TreeNode = { id: string; children?: TreeNode[] };

// Keeps only the branches that contain one of the user's assigned nodes
// (same rule as the generic create page). No assignments = whole tree.
function filterTreeByAccess<T extends TreeNode>(
  nodes: T[],
  allowedIds: Set<string>,
): T[] {
  if (allowedIds.size === 0) return nodes;
  const hasAccess = (node: TreeNode): boolean =>
    allowedIds.has(node.id) || (node.children ?? []).some(hasAccess);
  return nodes.filter(hasAccess).map((node) => ({
    ...node,
    children: node.children?.length
      ? filterTreeByAccess(node.children as T[], allowedIds)
      : undefined,
  }));
}

// Returns the node and its ancestors, root first.
function findPath<T extends TreeNode>(nodes: T[], id: string): T[] {
  for (const node of nodes) {
    if (node.id === id) return [node];
    const sub = findPath((node.children ?? []) as T[], id);
    if (sub.length) return [node, ...sub];
  }
  return [];
}

// Report Location (2.2) offers the parent locations: every location that has
// children, plus top-level locations (e.g. "Default"). Their children are the
// City (6.1) values.
function parentLocations(nodes: Location[], isRoot = true): Location[] {
  return nodes
    .filter((n) => isRoot || (n.children?.length ?? 0) > 0)
    .map((n) => ({ ...n, children: parentLocations(n.children ?? [], false) }));
}

// Flattens a location tree into a list of all nodes.
function flattenLocations(nodes: Location[]): Location[] {
  return nodes.flatMap((n) => [n, ...flattenLocations(n.children ?? [])]);
}

// Looks a place name up on OpenStreetMap (same service the generic page uses)
// for a location that has no coordinates in the master data.
async function geocodeByName(
  name: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`,
    );
    const data = await res.json();
    return data.length
      ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      : null;
  } catch {
    return null;
  }
}

const DEFAULT_LOCATION_NAME = "Default";

// Read-only display fields (report date/time, city): muted like the map's
// read-only latitude/longitude, with no hover or focus highlight.
const READ_ONLY_INPUT_CLASS =
  "bg-[hsl(var(--muted))] cursor-default hover:border-[hsl(var(--border))] focus:border-[hsl(var(--border))] focus:ring-0";

// Assignee picker helpers (same as the generic edit page).
const statusBadgeColor: Record<string, string> = {
  online: "bg-green-500",
  connected: "bg-blue-500",
  offline: "bg-gray-400",
  disconnected: "bg-red-500",
};
const statusOrder: Record<string, number> = {
  online: 0,
  connected: 1,
  offline: 2,
  disconnected: 3,
};
const getUserLabel = (user: Partial<User>) =>
  [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  "";

// Reporter fields of the form, filled from the reporter's contact (edit mode).
// A generated login email and a placeholder national ID are not real details.
function reporterFromContact(contact?: User) {
  return {
    reporter_name: [
      contact?.first_name,
      contact?.middle_name,
      contact?.last_name,
    ]
      .filter(Boolean)
      .join(" "),
    reporter_phone: contact?.phone || "",
    reporter_email:
      contact?.email && !contact.email.toLowerCase().endsWith("@automax.com")
        ? contact.email
        : "",
    reporter_national_id: /^[12]\d{9}$/.test(contact?.national_id || "")
      ? contact!.national_id!
      : "",
    reporter_nationality: contact?.nationality_id || "",
    reporter_gender: contact?.gender || "",
    reporter_address: contact?.address || "",
  };
}

// "2026-11-23T10:30:00Z" → "2026-11-23T13:30" (local time, for datetime-local inputs).
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const NATIONAL_ID_PATTERN = /^[12]\d{9}$/;
// Caller number (1.2): digits only, optional leading "+" (no country picker).
// The backend saves it in one format and matches it in any format.
const CALLER_NUMBER_PATTERN = /^\+?\d{3,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormState {
  workflow_id: string;
  source: string;
  call_uuid: string;
  caller_number: string;
  previous_report_ids: string[];
  linked_incident_number: string;
  classification_id: string;
  // Report Location (a parent location). location_id is what is saved: the
  // selected City when there is one, else the report location.
  report_location_id: string;
  location_id: string;
  concerned_authority_id: string;
  cooperation_status: "" | "cooperative" | "uncooperative";
  reporter_name: string;
  reporter_nationality: string;
  reporter_national_id: string;
  reporter_phone: string;
  reporter_address: string;
  reporter_email: string;
  reporter_gender: string;
  content: string;
  notes: string;
  street: string;
  latitude?: number;
  longitude?: number;
  description: string;
  comment: string;
  caller_identity_text: string;
  assignee_id: string;
  department_id: string;
  due_date: string;
}

function NazahaIncidentForm({ incidentId }: { incidentId?: string }) {
  const isEdit = Boolean(incidentId);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const routerLocation = useLocation();
  const user = useAuthStore((state) => state.user);
  const softphone = useSoftphoneStore();
  // Call prefill applies to a new report only.
  const incomingCallNumber = isEdit ? "" : softphone.incomingCallNumber;
  const incomingCallName = isEdit ? "" : softphone.incomingCallName;

  // Opened from a call (CTI widget or softphone): caller number comes from the call.
  const ctiPrefill = isEdit
    ? undefined
    : (routerLocation.state as any)?.ctiPrefill;
  const callNumber: string =
    ctiPrefill?.reporter_phone || incomingCallNumber || "";

  const [form, setForm] = useState<FormState>(() => ({
    workflow_id: "",
    source: ctiPrefill?.source || "web",
    call_uuid: ctiPrefill?.call_uuid || "",
    caller_number: callNumber,
    previous_report_ids: [],
    linked_incident_number: "",
    classification_id: "",
    report_location_id: "",
    location_id: "",
    concerned_authority_id: "",
    cooperation_status: "",
    reporter_name: ctiPrefill?.reporter_name || incomingCallName || "",
    reporter_nationality: "",
    reporter_national_id: "",
    reporter_phone: "",
    reporter_address: "",
    reporter_email: "",
    reporter_gender: "",
    content: "",
    notes: "",
    street: "",
    description: "",
    comment: "",
    caller_identity_text: "",
    assignee_id: "",
    department_id: "",
    due_date: "",
  }));

  // A call that arrives while the form is open fills the caller number (and the
  // reporter name, when given), as on the generic create page.
  useEffect(() => {
    if (!incomingCallNumber) return;
    setForm((prev) => ({
      ...prev,
      caller_number: incomingCallNumber,
      reporter_name: incomingCallName || prev.reporter_name,
    }));
  }, [incomingCallNumber, incomingCallName]);
  const [lookupValues, setLookupValues] = useState<Record<string, any>>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isAutoMatched, setIsAutoMatched] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [coordinateError, setCoordinateError] = useState<string | undefined>();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [reportTime] = useState(() => new Date());

  const attachmentPolicy = useAttachmentPolicy("internal");
  const imageValidation = useImageValidation();

  const setField = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: workflowsData } = useQuery({
    queryKey: ["admin", "workflows", "active"],
    queryFn: () => workflowApi.list(true),
  });
  const { data: classificationsData } = useQuery({
    queryKey: ["admin", "classifications", "tree", "incident"],
    queryFn: async () => {
      const [incidentRes, allRes] = await Promise.all([
        classificationApi.getTree("incident"),
        classificationApi.getTree("all"),
      ]);
      const combined = [...(incidentRes.data || []), ...(allRes.data || [])];
      const unique = combined.filter(
        (item, index, self) =>
          index === self.findIndex((c) => c.id === item.id),
      );
      return { success: true, data: unique };
    },
  });
  const { data: locationsData } = useQuery({
    queryKey: ["admin", "locations", "tree"],
    queryFn: () => locationApi.getTree(),
  });
  const { data: lookupCategoriesData } = useQuery({
    queryKey: ["admin", "lookups", "categories"],
    queryFn: () => lookupApi.listCategories(),
  });
  const { data: authoritiesData } = useQuery({
    queryKey: ["lookups", CONCERNED_AUTHORITY_CATEGORY],
    queryFn: () => lookupApi.getValuesByCode(CONCERNED_AUTHORITY_CATEGORY),
  });
  const { data: nationalitiesData } = useQuery({
    queryKey: ["lookups", NATIONALITY_CATEGORY],
    queryFn: () => lookupApi.getValuesByCode(NATIONALITY_CATEGORY),
  });

  // ── Edit mode: the incident being edited ──────────────────────────────────
  const { data: incidentData } = useQuery({
    queryKey: ["incident", incidentId],
    queryFn: () => incidentApi.getById(incidentId!),
    enabled: isEdit,
  });
  const incident = incidentData?.data;
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canReveal =
    isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_REVEAL_REPORTER);
  // An uncooperative reporter's details are not sent; they can be edited only
  // after a (logged) reveal.
  const [reporterUnlocked, setReporterUnlocked] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const reporterLocked =
    isEdit && !!incident?.reporter_hidden && !reporterUnlocked;
  const [existingAttachments, setExistingAttachments] = useState<
    IncidentAttachment[]
  >([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<string[]>(
    [],
  );
  // Values as loaded, to send only what the user changed.
  const initialReporterRef = useRef<Record<string, string>>({});
  const initialPreviousRef = useRef<string[]>([]);
  const loadedRef = useRef(false);

  const workflows: Workflow[] = useMemo(
    () =>
      (workflowsData?.data || []).filter(
        (w) =>
          w.is_active &&
          (w.record_type === "incident" ||
            w.record_type === "both" ||
            w.record_type === "all"),
      ),
    [workflowsData?.data],
  );
  const classifications = useMemo(
    () =>
      user?.is_super_admin
        ? classificationsData?.data || []
        : filterTreeByAccess<Classification>(
            classificationsData?.data || [],
            new Set((user?.classifications || []).map((c) => c.id)),
          ),
    [classificationsData?.data, user],
  );
  const locations = useMemo(
    () =>
      user?.is_super_admin
        ? locationsData?.data || []
        : filterTreeByAccess<Location>(
            locationsData?.data || [],
            new Set((user?.locations || []).map((l) => l.id)),
          ),
    [locationsData?.data, user],
  );

  // ── Workflow form config ──────────────────────────────────────────────────
  const selectedWorkflow = workflows.find((w) => w.id === form.workflow_id);
  const requiredFields = (selectedWorkflow?.required_fields || []) as string[];
  const optionalFields = (selectedWorkflow?.optional_fields || []) as string[];
  const isRequired = (field: string) => requiredFields.includes(field);
  const isShown = (field: string) =>
    requiredFields.includes(field) || optionalFields.includes(field);
  // A call-originated report always shows the prefilled caller name/phone
  // (same rule as the generic create page).
  // A report opened from a call always shows the Caller Number it filled in.
  const callOriginated = Boolean(ctiPrefill) || Boolean(incomingCallNumber);
  const showCallerNumber = isShown("reporter_phone") || callOriginated;
  const showReporterName = isShown("reporter_name");
  const showReporterPhone = isShown("reporter_mobile");
  const reporterFields = [
    "reporter_name",
    "reporter_nationality",
    "reporter_national_id",
    "reporter_mobile",
    "reporter_address",
    "reporter_email",
    "reporter_gender",
  ];

  const lookupCategories = useMemo(
    () =>
      (lookupCategoriesData?.data || []).filter(
        (cat) =>
          cat.add_to_incident_form &&
          !NAZAHA_LOOKUP_CATEGORIES.includes(cat.code) &&
          isShown(`lookup:${cat.code}`),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lookupCategoriesData?.data, selectedWorkflow],
  );

  // Workflows whose classification/location restrictions fit the selection
  // (same rules as the generic create page); all of them when none fit.
  const filteredWorkflows = useMemo(() => {
    if (!form.classification_id && !form.location_id) return workflows;
    const locationMatters =
      (window.APP_CONFIG?.DISABLE_AUTO_LOCATION_RETRIEVAL ??
        import.meta.env.VITE_DISABLE_AUTO_LOCATION_RETRIEVAL) !== "false";
    const matching = workflows.filter((w) => {
      const classificationMatch =
        !w.classifications?.length ||
        (!!form.classification_id &&
          w.classifications.some((c) => c.id === form.classification_id));
      const locationMatch =
        !w.locations?.length ||
        (!!form.location_id &&
          w.locations.some((l) => l.id === form.location_id));
      return classificationMatch && (!locationMatters || locationMatch);
    });
    return matching.length ? matching : workflows;
  }, [workflows, form.classification_id, form.location_id]);

  // A selected workflow that no longer fits is replaced (like the generic page).
  useEffect(() => {
    if (isEdit || !form.workflow_id || !filteredWorkflows.length) return;
    if (!filteredWorkflows.some((w) => w.id === form.workflow_id)) {
      const replacement =
        filteredWorkflows.find((w) => w.is_default) || filteredWorkflows[0];
      setForm((prev) => ({ ...prev, workflow_id: replacement.id }));
      setIsAutoMatched(true);
    }
  }, [isEdit, filteredWorkflows, form.workflow_id]);

  // The selected priority (lookup PRIORITY) also drives the match.
  const priorityCategory = (lookupCategoriesData?.data || []).find(
    (c) => c.code === "PRIORITY",
  );
  const priorityValue = priorityCategory
    ? priorityCategory.values?.find(
        (v) => v.id === lookupValues[priorityCategory.id],
      )
    : undefined;

  // Auto-select the workflow from classification + location + priority (like
  // the generic page): the matched one, else the default, else the only one.
  useEffect(() => {
    if (isEdit || !workflows.length) return; // the workflow is fixed once created
    let cancelled = false;
    const pickFallback = () => {
      if (form.workflow_id && !isAutoMatched) return;
      const fallback =
        filteredWorkflows.find((w) => w.is_default) ||
        (filteredWorkflows.length === 1 ? filteredWorkflows[0] : undefined);
      if (fallback && fallback.id !== form.workflow_id) {
        setForm((prev) => ({ ...prev, workflow_id: fallback.id }));
        setIsAutoMatched(true);
      }
    };
    workflowApi
      .matchWorkflow({
        classification_id: form.classification_id || undefined,
        location_id: form.location_id || undefined,
        source: form.source || undefined,
        priority: priorityValue?.sort_order,
        record_type: "incident",
      })
      .then((res) => {
        if (cancelled) return;
        const matched = workflows.find((w) => w.id === res.data?.workflow_id);
        if (matched && (!form.workflow_id || isAutoMatched)) {
          setForm((prev) => ({ ...prev, workflow_id: matched.id }));
          setIsAutoMatched(true);
        } else if (!matched) {
          pickFallback();
        }
      })
      .catch(() => !cancelled && pickFallback());
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflows, form.classification_id, form.location_id, priorityValue?.id]);

  // ── Assignment (initial state of the workflow) ────────────────────────────
  const { data: initialStateData } = useQuery({
    queryKey: ["admin", "workflows", form.workflow_id, "initial-state"],
    queryFn: () => workflowApi.getInitialState(form.workflow_id),
    enabled: !!form.workflow_id,
  });
  const initialState = initialStateData?.data;
  const assignmentMode: "none" | "auto" | "manual" | "specific" = isEdit
    ? "none"
    : initialState?.assign_user_id
      ? "specific"
      : initialState?.auto_match_user
        ? "auto"
        : initialState?.manual_select_user
          ? "manual"
          : "none";
  const { data: matchingUsersData } = useQuery({
    queryKey: [
      "admin",
      "workflows",
      form.workflow_id,
      "initial-state",
      "matching-users",
      form.classification_id,
      form.location_id,
      form.department_id,
    ],
    queryFn: () =>
      workflowApi.getInitialStateMatchingUsers(form.workflow_id, {
        classification_id: form.classification_id || undefined,
        location_id: form.location_id || undefined,
        department_id: form.department_id || undefined,
      }),
    enabled: !!form.workflow_id && assignmentMode === "manual",
  });
  const showAssigneeFallback =
    !isEdit && assignmentMode === "none" && isShown("assignee_id");
  const { data: usersData } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => userApi.list(1, 100),
    enabled: showAssigneeFallback,
  });
  const { data: departmentsData } = useQuery({
    queryKey: ["admin", "departments", "all", "", ""],
    queryFn: () => departmentApi.list(),
    enabled: isEdit || isShown("department_id"),
  });

  // Edit: assignment works like the generic edit page — users with the current
  // state's assignment roles in the incident's location/classification, and a
  // locked assignee when the state has "lock assignee" on.
  const isAssigneeLocked =
    isEdit && !!incident?.current_state?.lock_assignee && !!incident?.assignee;
  const { data: editUsersData } = useQuery({
    queryKey: ["admin", "users", "assignment", incidentId],
    queryFn: () =>
      userApi.list(
        1,
        100,
        "",
        incident?.current_state?.assignment_roles?.map((r) => r.id) || [],
        [],
        incident?.location?.id ? [incident.location.id] : [],
        incident?.classification?.id ? [incident.classification.id] : [],
      ),
    enabled: isEdit && !!incident,
  });
  const assigneeOptions = useMemo(() => {
    const users: User[] = [...(editUsersData?.data || [])];
    // Keep the current assignee even if the filter does not return them.
    if (
      incident?.assignee &&
      !users.some((u) => u.id === incident.assignee!.id)
    ) {
      users.push(incident.assignee);
    }
    const options = users
      .map((u) => {
        const status = (u.call_status || "").toLowerCase();
        return {
          value: u.id,
          label: getUserLabel(u),
          status,
          order: statusOrder[status] ?? 99,
          avatar: getAvatarName(getUserLabel(u)),
        };
      })
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
    return [
      {
        value: "",
        label: t("incidents.unassigned"),
        status: "offline",
        order: -1,
        avatar: getAvatarName(t("incidents.unassigned")),
      },
      ...options,
    ];
  }, [editUsersData?.data, incident?.assignee, t]);

  // ── Link to Previous Report (1.4) ─────────────────────────────────────────
  // The typed number is looked up (debounced) with the incident details API,
  // which also accepts report numbers. It must exist and may not be this report.
  const linkedNumber = form.linked_incident_number.trim();
  const [debouncedLinked, setDebouncedLinked] = useState(linkedNumber);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedLinked(linkedNumber), 500);
    return () => clearTimeout(timer);
  }, [linkedNumber]);
  const {
    data: linkedData,
    error: linkedLookupError,
    isFetching: linkedFetching,
  } = useQuery({
    queryKey: ["incident-by-number", debouncedLinked],
    queryFn: () => incidentApi.getById(encodeURIComponent(debouncedLinked)),
    enabled: !!debouncedLinked && isShown("linked_incident_number"),
    retry: false,
    staleTime: 60_000,
  });
  const checkingLinked =
    !!linkedNumber && (linkedNumber !== debouncedLinked || linkedFetching);
  const linkedStatus = (linkedLookupError as any)?.response?.status;
  const linkedReport = linkedData?.data;
  let linkedIssue: string | undefined;
  if (linkedNumber && !checkingLinked) {
    if (linkedStatus === 404) linkedIssue = t("nazaha.linkedReportNotFound");
    else if (
      linkedReport &&
      isEdit &&
      (linkedReport.id === incidentId ||
        linkedReport.incident_number === incident?.incident_number)
    )
      linkedIssue = t("nazaha.linkedReportSelf");
  }
  // (A 403 means the report exists but this user can't open it: allowed.
  // Other failures are left to the backend, which checks the number again.)

  // ── Previous reports of the caller (1.3) ──────────────────────────────────
  // Same country-code format as the mobile number; looked up once it is a
  // complete number.
  const [debouncedCaller, setDebouncedCaller] = useState(form.caller_number);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCaller(form.caller_number), 400);
    return () => clearTimeout(timer);
  }, [form.caller_number]);
  const callerNumberValid = CALLER_NUMBER_PATTERN.test(debouncedCaller);
  const normalizedCaller = debouncedCaller;
  const { data: previousData, isFetching: loadingPrevious } = useQuery({
    queryKey: ["nazaha", "previous-reports", normalizedCaller],
    queryFn: () => nazahaApi.listPreviousReports(normalizedCaller),
    enabled: callerNumberValid,
  });
  const previousReports = useMemo(
    () =>
      callerNumberValid
        ? (previousData?.data || []).filter((r) => r.id !== incidentId)
        : [],
    [callerNumberValid, previousData?.data, incidentId],
  );
  // Drop selections that no longer belong to the caller (not while loading).
  // Reports already linked to the edited incident are always kept.
  useEffect(() => {
    if (callerNumberValid && !previousData) return;
    setForm((prev) => {
      const kept = prev.previous_report_ids.filter(
        (id) =>
          initialPreviousRef.current.includes(id) ||
          previousReports.some((r) => r.id === id),
      );
      return kept.length === prev.previous_report_ids.length
        ? prev
        : { ...prev, previous_report_ids: kept };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previousReports]);

  // ── Location → city (6.1) and map position ────────────────────────────────
  const locationPath = useMemo(
    () =>
      form.location_id ? findPath<Location>(locations, form.location_id) : [],
    [locations, form.location_id],
  );
  const selectedLocation = locationPath[locationPath.length - 1];
  const reportLocationOptions = useMemo(
    () => parentLocations(locations),
    [locations],
  );
  const reportLocationNode = useMemo(
    () =>
      form.report_location_id
        ? findPath<Location>(locations, form.report_location_id).pop()
        : undefined,
    [locations, form.report_location_id],
  );
  // City (6.1): the children of the report location.
  const cityOptions = reportLocationNode?.children ?? [];
  const cityNode =
    form.location_id && form.location_id !== form.report_location_id
      ? selectedLocation
      : undefined;

  const selectedClassification = useMemo(
    () =>
      form.classification_id
        ? findPath<Classification>(
            classifications,
            form.classification_id,
          ).pop()
        : undefined,
    [classifications, form.classification_id],
  );
  const generatedTitle = generateRecordTitle({
    classification: selectedClassification,
    location: selectedLocation,
    city: cityNode?.name,
  });

  // ── Attachments ───────────────────────────────────────────────────────────
  const maxSizeMB = attachmentPolicy.maxSizeMB;
  const isOversized = (file: File) => file.size > maxSizeMB * 1024 * 1024;
  const addAttachments = async (files: File[]) => {
    const accepted = await attachmentPolicy.filterFiles(
      files,
      attachments.length,
    );
    const { valid } = await imageValidation.validate(accepted);
    setAttachments((prev) => [...prev, ...valid]);
    setIsDirty(true);
    setErrors((prev) => ({ ...prev, attachments: "" }));
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const requiredMsg = (label: string) => t("nazaha.required", { field: label });

  const phoneError = (value: string) => {
    const issue = getPhoneNumberCountryIssue(value);
    if (!issue) return "";
    if (issue.type === "unsupportedCode") {
      return t(
        "incidents.phoneUnsupportedCountryCode",
        "This country code is not supported. Select a country from the list",
      );
    }
    return t("incidents.phoneInvalidForCountry", {
      defaultValue:
        "Enter a valid {{country}} number, e.g. +{{dialCode}} {{example}}",
      country: getPhoneCountryName(issue.country, i18n.language),
      dialCode: issue.country.dialCode,
      example: issue.country.example,
    });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const need = (key: keyof FormState, label: string) => {
      const value = form[key];
      if (typeof value === "string" ? !value.trim() : !value)
        e[key] = requiredMsg(label);
    };

    if (!form.workflow_id) e.workflow_id = t("incidents.workflowRequired");
    if (!generatedTitle.trim()) e.title = t("incidents.titleRequired");

    // Always required (fixed rules of this screen)
    need("classification_id", t("nazaha.classification"));
    need("location_id", t("nazaha.reportLocation"));
    if (form.report_location_id && cityOptions.length > 0 && !cityNode)
      e.city = requiredMsg(t("nazaha.city"));
    // Workflow-configured Nazaha fields
    // [form field, label, workflow field when its name differs]
    const nazahaRequired: [keyof FormState, string, string?][] = [
      ["caller_number", t("nazaha.callerNumber"), "reporter_phone"],
      ["previous_report_ids", t("nazaha.previousReports")],
      ["linked_incident_number", t("nazaha.linkedReport")],
      ["concerned_authority_id", t("nazaha.concernedAuthority")],
      ["reporter_nationality", t("nazaha.nationality")],
      ["reporter_national_id", t("nazaha.nationalId")],
      ["reporter_address", t("nazaha.reporterAddress")],
      ["reporter_gender", t("nazaha.gender")],
      ["content", t("nazaha.content")],
      ["notes", t("nazaha.notes")],
      ["street", t("nazaha.street")],
    ];
    for (const [field, label, workflowField = field] of nazahaRequired) {
      if (reporterLocked && field.startsWith("reporter_")) continue;
      const value = form[field];
      const empty = Array.isArray(value)
        ? value.length === 0
        : !String(value ?? "").trim();
      if (isRequired(workflowField) && empty) e[field] = requiredMsg(label);
    }

    // Workflow-configured
    if (isRequired("reporter_name") && !reporterLocked)
      need("reporter_name", t("nazaha.reporterName"));
    if (isRequired("reporter_mobile") && !reporterLocked)
      need("reporter_phone", t("nazaha.mobile"));
    if (isRequired("reporter_email") && !reporterLocked)
      need("reporter_email", t("nazaha.email"));
    if (isRequired("cooperation_status"))
      need("cooperation_status", t("nazaha.cooperation"));
    if (isRequired("caller_identity_text"))
      need(
        "caller_identity_text",
        t("incidents.callerIdentity", "Caller Identity"),
      );
    if (isRequired("description"))
      need("description", t("incidents.description"));
    if (isRequired("comment")) need("comment", t("incidents.comment"));
    if (isRequired("department_id"))
      need("department_id", t("incidents.department"));
    if (isRequired("due_date")) need("due_date", t("incidents.dueDate"));
    if (
      isRequired("geolocation") &&
      (form.latitude === undefined || form.longitude === undefined)
    )
      e.geolocation = requiredMsg(t("nazaha.map"));
    if (
      isRequired("attachments") &&
      attachments.length + existingAttachments.length === 0
    )
      e.attachments = requiredMsg(t("nazaha.attachments"));
    if (
      (assignmentMode === "manual" ||
        (showAssigneeFallback && isRequired("assignee_id"))) &&
      !form.assignee_id
    )
      e.assignee_id = requiredMsg(t("incidents.assignee"));
    for (const category of lookupCategories) {
      const key = `lookup:${category.code}`;
      const value = lookupValues[category.id];
      const empty = !value || (Array.isArray(value) && value.length === 0);
      if (isRequired(key) && empty) {
        e[key] = requiredMsg(
          (i18n.language === "ar" && category.name_ar) || category.name,
        );
      }
    }

    // Formats
    if (form.caller_number && !CALLER_NUMBER_PATTERN.test(form.caller_number))
      e.caller_number = t("nazaha.callerNumberInvalid");
    if (
      form.reporter_national_id &&
      !NATIONAL_ID_PATTERN.test(form.reporter_national_id)
    )
      e.reporter_national_id = t("nazaha.nationalIdInvalid");
    if (form.reporter_phone && phoneError(form.reporter_phone))
      e.reporter_phone = phoneError(form.reporter_phone);
    if (isShown("linked_incident_number") && linkedNumber) {
      if (checkingLinked)
        e.linked_incident_number = t("nazaha.checkingLinkedReport");
      else if (linkedIssue) e.linked_incident_number = linkedIssue;
    }
    if (form.reporter_email && !EMAIL_PATTERN.test(form.reporter_email))
      e.reporter_email = t("nazaha.emailInvalid");
    if (form.content.length > INCIDENT_CONTENT_MAX_LENGTH)
      e.content = t("nazaha.contentTooLong", {
        max: INCIDENT_CONTENT_MAX_LENGTH,
      });
    if (
      ENABLE_GIS === "true" &&
      form.latitude !== undefined &&
      !gisData?.isInsideBoundary
    )
      e.geolocation = t("incidents.gisError");
    if (coordinateError) e.geolocation = coordinateError;
    if (attachments.some(isOversized))
      e.attachments = t("incidents.attachmentTooLarge", {
        name: attachments.find(isOversized)?.name,
        max: maxSizeMB,
      });

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: IncidentCreateRequest) => {
      const response = await incidentApi.create(data);
      if (response.data && attachments.length > 0) {
        await Promise.all(
          attachments.map((file) =>
            incidentApi.uploadAttachment(response.data!.id, file),
          ),
        );
      }
      return response;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      if (response.data) {
        toast.success(
          t("nazaha.createdWithNumber", {
            number: response.data.incident_number,
          }),
        );
        navigate(`/incidents/${response.data.id}`);
      } else {
        navigate("/incidents");
      }
    },
    onError: (error: any) => showSaveError(error),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: IncidentUpdateRequest) => {
      const response = await incidentApi.update(incidentId!, data);
      await Promise.all(
        deletedAttachmentIds.map((attId) =>
          incidentApi.deleteAttachment(incidentId!, attId),
        ),
      );
      await Promise.all(
        attachments.map((file) =>
          incidentApi.uploadAttachment(incidentId!, file),
        ),
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      toast.success(
        t("nazaha.updatedWithNumber", { number: incident?.incident_number }),
      );
      navigate(`/incidents/${incidentId}`);
    },
    onError: (error: any) => showSaveError(error),
  });

  // Backend field errors: { errors: { ReporterNationalID: "..." } } → reporter_national_id
  function showSaveError(error: any) {
    {
      const fieldErrors: Record<string, string> = {};
      const backendErrors = error.response?.data?.errors;
      if (backendErrors && typeof backendErrors === "object") {
        for (const [key, msg] of Object.entries(backendErrors)) {
          const field = key
            .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
            .toLowerCase();
          // The nationality input is "reporter_nationality" in the form.
          fieldErrors[
            field === "reporter_nationality_id" ? "reporter_nationality" : field
          ] = String(msg);
        }
      }
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        (Object.keys(fieldErrors).length
          ? t("nazaha.fixErrors")
          : error.message);
      setErrors((prev) => ({ ...prev, ...fieldErrors, submit: message }));
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error(t("nazaha.fixErrors"));
      return;
    }

    // Edit sends every incident-form lookup the incident has (as the generic
    // edit page does): the backend replaces the whole set, so values of lookups
    // this workflow doesn't show must be sent too or they would be removed.
    const lookupIds: string[] = [];
    const customLookupFields: Record<string, any> = {};
    const lookupCategoriesToSend = isEdit
      ? (lookupCategoriesData?.data || []).filter(
          (cat) =>
            cat.add_to_incident_form &&
            !NAZAHA_LOOKUP_CATEGORIES.includes(cat.code),
        )
      : lookupCategories;
    for (const category of lookupCategoriesToSend) {
      const value = lookupValues[category.id];
      if (!value) continue;
      const fieldType = category.field_type || "select";
      if (fieldType === "select" || fieldType === "multiselect") {
        lookupIds.push(
          ...(Array.isArray(value) ? value.filter(Boolean) : [value]),
        );
      } else {
        customLookupFields[`lookup:${category.code}`] = {
          value,
          field_type: fieldType,
          category_id: category.id,
        };
      }
    }

    const opt = (value: string) => value.trim() || undefined;

    if (isEdit && incident) {
      // Send only fields this workflow shows: a hidden field must stay as it is.
      const shown = <T,>(field: string, value: T) =>
        isShown(field) ? value : undefined;
      const data: IncidentUpdateRequest = {
        version: incident.version,
        title: generatedTitle,
        classification_id: form.classification_id,
        location_id: form.location_id,
        latitude: form.latitude,
        longitude: form.longitude,
        city: cityNode?.name,
        description: shown("description", form.description.trim()),
        caller_identity_text: shown(
          "caller_identity_text",
          form.caller_identity_text.trim(),
        ),
        cooperation_status: shown(
          "cooperation_status",
          form.cooperation_status,
        ),
        // Assignment, as on the generic edit page: empty means "not changed".
        assignee_id: isAssigneeLocked
          ? undefined
          : form.assignee_id || undefined,
        department_id: form.department_id || undefined,
        due_date: form.due_date
          ? new Date(form.due_date).toISOString()
          : undefined,
        lookup_value_ids: lookupIds.length ? lookupIds : undefined,
        custom_lookup_fields: Object.keys(customLookupFields).length
          ? customLookupFields
          : undefined,
        caller_number: shown("reporter_phone", form.caller_number.trim()),
        linked_incident_number: shown(
          "linked_incident_number",
          form.linked_incident_number.trim(),
        ),
        concerned_authority_id: shown(
          "concerned_authority_id",
          form.concerned_authority_id,
        ),
        content: shown("content", form.content.trim()),
        notes: shown("notes", form.notes.trim()),
        street: shown("street", form.street.trim()),
      };
      const previousChanged =
        [...form.previous_report_ids].sort().join() !==
        [...initialPreviousRef.current].sort().join();
      if (isShown("previous_report_ids") && previousChanged) {
        data.previous_report_ids = form.previous_report_ids;
      }
      // Reporter (contact) fields: only when visible to this user and changed.
      if (!reporterLocked) {
        const reporterValues: Record<string, string> = {
          reporter_name: form.reporter_name.trim(),
          reporter_phone: normalizePhoneNumber(form.reporter_phone),
          reporter_email: form.reporter_email.trim(),
          reporter_national_id: form.reporter_national_id.trim(),
          reporter_nationality: form.reporter_nationality,
          reporter_gender: form.reporter_gender,
          reporter_address: form.reporter_address.trim(),
        };
        for (const [field, value] of Object.entries(reporterValues)) {
          // The mobile's workflow field is "reporter_mobile".
          const workflowField =
            field === "reporter_phone" ? "reporter_mobile" : field;
          if (
            isShown(workflowField) &&
            value &&
            value !== initialReporterRef.current[field]
          ) {
            // The nationality is sent as the master-data value's id.
            const requestField =
              field === "reporter_nationality"
                ? "reporter_nationality_id"
                : field;
            (data as any)[requestField] = value;
          }
        }
      }
      updateMutation.mutate(data);
      return;
    }

    createMutation.mutate({
      title: generatedTitle,
      workflow_id: form.workflow_id,
      source: form.source,
      caller_number: opt(form.caller_number),
      call_uuid: opt(form.call_uuid),
      previous_report_ids: form.previous_report_ids,
      linked_incident_number: opt(form.linked_incident_number),
      classification_id: form.classification_id,
      location_id: form.location_id,
      concerned_authority_id: opt(form.concerned_authority_id),
      cooperation_status: form.cooperation_status || undefined,
      reporter_name: opt(form.reporter_name),
      reporter_nationality_id: opt(form.reporter_nationality),
      reporter_national_id: form.reporter_national_id.trim(),
      reporter_phone: opt(normalizePhoneNumber(form.reporter_phone)),
      reporter_address: form.reporter_address.trim(),
      reporter_email: opt(form.reporter_email),
      reporter_gender: form.reporter_gender,
      content: form.content.trim(),
      notes: opt(form.notes),
      city: cityNode?.name,
      latitude: form.latitude,
      longitude: form.longitude,
      street: opt(form.street),
      description: opt(form.description),
      comment: opt(form.comment),
      caller_identity_text: opt(form.caller_identity_text),
      assignee_id: opt(form.assignee_id),
      department_id: opt(form.department_id),
      due_date: form.due_date
        ? new Date(form.due_date).toISOString()
        : undefined,
      lookup_value_ids: lookupIds.length ? lookupIds : undefined,
      custom_lookup_fields: Object.keys(customLookupFields).length
        ? customLookupFields
        : undefined,
    });
  };

  const leavePath = isEdit ? `/incidents/${incidentId}` : "/incidents";
  const handleCancel = () => {
    if (isDirty) setShowDiscard(true);
    else navigate(leavePath);
  };

  // ── Options ───────────────────────────────────────────────────────────────
  const isArabic = i18n.language === "ar";
  // Nationality master data; a contact's saved value that was since removed from
  // the list is still offered so editing doesn't drop it.
  const savedNationality = incident?.reporter?.nationality;
  const nationalityOptions = [
    ...(nationalitiesData?.data || []),
    ...(savedNationality &&
    !nationalitiesData?.data?.some((v) => v.id === savedNationality.id)
      ? [savedNationality]
      : []),
  ].map((v) => ({ value: v.id, label: (isArabic && v.name_ar) || v.name }));
  const workflowOptions = [
    { value: "", label: t("incidents.selectWorkflow") },
    // Edit keeps the incident's own workflow in the (disabled) list.
    ...(isEdit ? workflows : filteredWorkflows).map((w) => {
      const name = (isArabic && w.name_ar) || w.name;
      return {
        value: w.id,
        label: w.is_default
          ? `${name} (${t("common.default", "Default")})`
          : name,
      };
    }),
  ];
  const previousReportOptions = [
    ...previousReports.map((r) => ({
      value: r.id,
      label: [
        r.incident_number,
        new Date(r.created_at).toLocaleDateString(),
        (isArabic && r.classification_name_ar) || r.classification_name,
        (isArabic && r.status_name_ar) || r.status_name,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
    // Edit: reports already linked stay selectable even if the caller's list
    // doesn't return them (e.g. the caller number changed).
    ...(incident?.previous_reports || [])
      .filter((ref) => !previousReports.some((r) => r.id === ref.id))
      .map((ref) => ({ value: ref.id, label: ref.incident_number })),
  ];
  const previousReportsHint = !callerNumberValid
    ? t("nazaha.previousReportsEnterCaller")
    : loadingPrevious
      ? t("nazaha.loadingPreviousReports")
      : previousReportOptions.length === 0
        ? t("nazaha.noPreviousReports")
        : undefined;
  const mapValue: LocationData | undefined =
    form.latitude !== undefined && form.longitude !== undefined
      ? { latitude: form.latitude, longitude: form.longitude }
      : undefined;

  // ── Report Location ⇄ interactive map ─────────────────────────────────────
  // Map → dropdown: a picked point selects the matching location (same matching
  // as the generic create page, falling back to "Default").
  // Dropdown → map: a picked location moves the map to its coordinates.
  // The map fires onChange again whenever its coordinates change (reverse
  // geocoding); the last handled point is remembered so that echo is ignored
  // and the two never trigger each other in a loop.
  const lastGeoKeyRef = useRef<string | null>(null);
  const selectingLocationRef = useRef<string | null>(null);
  const flatLocations = useMemo(() => flattenLocations(locations), [locations]);
  const [isMatchingLocation, setIsMatchingLocation] = useState(false);
  const [gisData, setGisData] = useState<any>(null);
  const ENABLE_GIS =
    window.APP_CONFIG?.ENABLE_GIS ?? import.meta.env.VITE_ENABLE_GIS;
  const autoMatchFromMap =
    (window.APP_CONFIG?.DISABLE_AUTO_LOCATION_RETRIEVAL ??
      import.meta.env.VITE_DISABLE_AUTO_LOCATION_RETRIEVAL) !== "true";

  // Edit mode: split the saved location into Report Location and City once the
  // location tree has loaded.
  useEffect(() => {
    if (form.report_location_id || !form.location_id || !locations.length)
      return;
    setForm((prev) => ({ ...prev, ...splitLocation(prev.location_id) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations, form.location_id, form.report_location_id]);

  // Report Location picked: the city is cleared (the old one is not under it).
  const onReportLocationSelect = (id: string) => {
    setForm((prev) => ({ ...prev, report_location_id: id, location_id: id }));
    setIsDirty(true);
    if (errors.location_id) setErrors((prev) => ({ ...prev, location_id: "" }));
    void moveMapToLocation(id);
  };

  const onCitySelect = (id: string) => {
    const locationId = id || form.report_location_id;
    setForm((prev) => ({ ...prev, location_id: locationId }));
    setIsDirty(true);
    if (errors.city) setErrors((prev) => ({ ...prev, city: "" }));
    void moveMapToLocation(locationId);
  };

  // A saved/matched location → Report Location (its parent) and City (itself).
  const splitLocation = (id: string) => {
    const path = findPath<Location>(locations, id);
    const report = path.length >= 2 ? path[path.length - 2] : path[0];
    return { report_location_id: report?.id || id, location_id: id };
  };

  const moveMapToLocation = async (id: string) => {
    selectingLocationRef.current = id;
    const node = flatLocations.find((l) => l.id === id);
    if (!node) return;
    // Master-data coordinates first; otherwise look the place up by its full
    // path ("District, City, Region"), then by its own name.
    let point =
      node.latitude != null && node.longitude != null
        ? { lat: Number(node.latitude), lng: Number(node.longitude) }
        : null;
    if (!point) {
      const path = findPath<Location>(locations, id)
        .map((l) => l.name)
        .filter((name) => name && name !== DEFAULT_LOCATION_NAME)
        .reverse()
        .join(", ");
      point =
        (path && path !== node.name ? await geocodeByName(path) : null) ??
        (await geocodeByName(node.name));
    }
    // Ignore a slow lookup if another location was picked meanwhile.
    if (!point || selectingLocationRef.current !== id) return;
    lastGeoKeyRef.current = `${point.lat},${point.lng}`;
    setForm((prev) => ({ ...prev, latitude: point.lat, longitude: point.lng }));
  };

  // Finds the leaf location for a map point, else the root "Default" location
  // (created when missing). Returns its id, or undefined on failure.
  const matchLocation = async (
    location: LocationData,
  ): Promise<string | undefined> => {
    const gisName =
      ENABLE_GIS === "true"
        ? location.gis?.street_fullname || location.gis?.municipality_name
        : location.city || location.address;
    const searchName = (gisName || "").toLowerCase().trim();
    const city = location.city?.toLowerCase().trim();
    const matched = searchName
      ? flatLocations.find((loc) => {
          if (loc.children?.length) return false;
          const name = loc.name.toLowerCase().trim();
          return (
            name === searchName ||
            loc.address?.toLowerCase().trim() === searchName ||
            (ENABLE_GIS !== "true" && !!city && name === city)
          );
        })
      : undefined;
    if (matched) {
      toast.info(
        t("incidents.locationAutoMatched", {
          name: matched.name,
          defaultValue: `Location "${matched.name}" auto-selected from master`,
        }),
      );
      return matched.id;
    }

    const existingDefault = flatLocations.find(
      (loc) =>
        !loc.parent_id &&
        loc.name.toLowerCase().trim() === DEFAULT_LOCATION_NAME.toLowerCase(),
    );
    if (existingDefault) {
      toast.info(
        t("incidents.locationDefaultMapped", {
          defaultValue:
            'No matching location found. Mapped to "Default" location.',
        }),
      );
      return existingDefault.id;
    }
    const res = await locationApi.create({
      name: DEFAULT_LOCATION_NAME,
      type: "default",
    });
    if (!res.data) return undefined;
    queryClient.invalidateQueries({ queryKey: ["admin", "locations", "tree"] });
    toast.info(
      t("incidents.locationDefaultCreated", {
        defaultValue:
          'No matching location found. Created and mapped to "Default" location.',
      }),
    );
    return res.data.id;
  };

  const onMapChange = async (location: LocationData | undefined) => {
    setIsDirty(true);
    if (errors.geolocation) setErrors((prev) => ({ ...prev, geolocation: "" }));
    if (!location) {
      lastGeoKeyRef.current = null;
      setForm((prev) => ({
        ...prev,
        latitude: undefined,
        longitude: undefined,
      }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      latitude: location.latitude,
      longitude: location.longitude,
    }));
    if (location.gis) setGisData(location.gis);

    const geoKey = `${location.latitude},${location.longitude}`;
    if (lastGeoKeyRef.current === geoKey) return; // echo of a point already handled
    lastGeoKeyRef.current = geoKey;
    if (!autoMatchFromMap) return;

    setIsMatchingLocation(true);
    try {
      const id = await matchLocation(location);
      if (id) {
        selectingLocationRef.current = id;
        setForm((prev) => ({ ...prev, ...splitLocation(id) }));
        setErrors((prev) => ({ ...prev, location_id: "", city: "" }));
      }
    } catch {
      toast.error(
        t(
          "incidents.locationMatchError",
          "Failed to match or create location. Please select manually.",
        ),
      );
    } finally {
      setIsMatchingLocation(false);
    }
  };

  // Edit mode: fill the form once the incident (and lookup categories) loaded.
  useEffect(() => {
    if (!isEdit || !incident || !lookupCategoriesData || loadedRef.current)
      return;
    loadedRef.current = true;
    // Older reports link the creating operator instead of a reporter contact.
    const contact =
      !incident.reporter_hidden &&
      incident.reporter &&
      incident.reporter.id !== incident.created_by_id
        ? incident.reporter
        : undefined;
    const reporter = reporterFromContact(contact);
    initialReporterRef.current = reporter;
    initialPreviousRef.current = (incident.previous_reports || []).map(
      (r) => r.id,
    );
    setForm((prev) => ({
      ...prev,
      workflow_id: incident.workflow?.id || "",
      source: incident.source || "web",
      caller_number: incident.caller_number || "",
      previous_report_ids: initialPreviousRef.current,
      linked_incident_number: incident.linked_incident?.incident_number || "",
      classification_id: incident.classification?.id || "",
      location_id: incident.location?.id || "",
      concerned_authority_id: incident.concerned_authority?.id || "",
      cooperation_status: incident.cooperation_status || "",
      ...reporter,
      content: incident.content || "",
      notes: incident.notes || "",
      street: incident.street || "",
      latitude: incident.latitude ?? undefined,
      longitude: incident.longitude ?? undefined,
      description: incident.description || "",
      caller_identity_text: incident.caller_identity_text || "",
      assignee_id: incident.assignee?.id || "",
      department_id: incident.department?.id || "",
      due_date: incident.due_date ? toLocalInput(incident.due_date) : "",
    }));
    setDebouncedCaller(incident.caller_number || "");
    // The map echoes the loaded point; it must not re-match the location.
    if (incident.latitude != null && incident.longitude != null) {
      lastGeoKeyRef.current = `${incident.latitude},${incident.longitude}`;
    }
    selectingLocationRef.current = incident.location?.id || null;
    setExistingAttachments(incident.attachments || []);
    const values: Record<string, any> = {};
    for (const v of incident.lookup_values || []) {
      if (!v.category_id) continue;
      const category = (lookupCategoriesData.data || []).find(
        (c) => c.id === v.category_id,
      );
      values[v.category_id] =
        category?.field_type === "multiselect"
          ? [...(values[v.category_id] || []), v.id]
          : v.id;
    }
    setLookupValues(values);
  }, [isEdit, incident, lookupCategoriesData]);

  // Edit mode: load a hidden reporter's details (logged by the backend).
  const revealReporter = async () => {
    setRevealing(true);
    try {
      const res = await nazahaApi.revealReporter(incidentId!);
      const d = res.data;
      if (d) {
        const reporter = {
          reporter_name: d.reporter_name || "",
          reporter_phone: d.reporter_phone || "",
          reporter_email: d.reporter_email || "",
          reporter_national_id: d.reporter_national_id || "",
          reporter_nationality: d.reporter_nationality?.id || "",
          reporter_gender: d.reporter_gender || "",
          reporter_address: d.reporter_address || "",
        };
        initialReporterRef.current = reporter;
        setForm((prev) => ({ ...prev, ...reporter }));
      }
      setReporterUnlocked(true);
    } catch {
      toast.error(t("nazaha.revealFailed"));
    } finally {
      setRevealing(false);
    }
  };

  // Label with the required star, for controls without a `required` prop.
  const requiredLabel = (label: string, field: string) => (
    <>
      {label}
      {isRequired(field) && <span className="text-red-500 ms-1">*</span>}
    </>
  );

  const sectionTitle = (num: number, key: string) => (
    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
      <span className="text-[hsl(var(--muted-foreground))]">{num}</span>
      {t(`nazaha.sections.${key}`)}
    </h2>
  );

  if (isEdit && !incident) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit ? t("nazaha.editTitle") : t("nazaha.createTitle")}
          </h1>
          <p className="text-gray-600">
            {isEdit
              ? t("nazaha.editSubtitle", { number: incident?.incident_number })
              : t("nazaha.createSubtitle")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Report Data */}
            <Card className="p-6">
              {sectionTitle(1, "reportData")}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {showCallerNumber && (
                  <Input
                    label={t("nazaha.callerNumber")}
                    required={isRequired("reporter_phone")}
                    value={form.caller_number}
                    onChange={(e) =>
                      setField(
                        "caller_number",
                        e.target.value.replace(/[^\d+]/g, ""),
                      )
                    }
                    placeholder={t("nazaha.callerNumberPlaceholder")}
                    inputMode="tel"
                    dir="ltr"
                    readOnly={!INCIDENT_CALLER_NUMBER_EDITABLE}
                    className={
                      INCIDENT_CALLER_NUMBER_EDITABLE
                        ? undefined
                        : READ_ONLY_INPUT_CLASS
                    }
                    hint={
                      !INCIDENT_CALLER_NUMBER_EDITABLE
                        ? t("nazaha.callerNumberFromCall")
                        : undefined
                    }
                    error={errors.caller_number}
                  />
                )}
                <Input
                  label={t("nazaha.reportDateTime")}
                  value={(incident
                    ? new Date(incident.created_at)
                    : reportTime
                  ).toLocaleString()}
                  readOnly
                  className={READ_ONLY_INPUT_CLASS}
                  hint={t("nazaha.autoOnSave")}
                />
                {isShown("previous_report_ids") && (
                  <MultiSelect
                    label={requiredLabel(
                      t("nazaha.previousReports"),
                      "previous_report_ids",
                    )}
                    options={previousReportOptions}
                    value={form.previous_report_ids}
                    onChange={(ids) => setField("previous_report_ids", ids)}
                    placeholder={t("nazaha.previousReportsPlaceholder")}
                    disabled={previousReportOptions.length === 0}
                    helperText={previousReportsHint}
                    error={errors.previous_report_ids}
                    searchable
                  />
                )}
                {isShown("linked_incident_number") && (
                  <Input
                    label={t("nazaha.linkedReport")}
                    required={isRequired("linked_incident_number")}
                    value={form.linked_incident_number}
                    onChange={(e) =>
                      setField("linked_incident_number", e.target.value)
                    }
                    placeholder={t("nazaha.linkedReportPlaceholder")}
                    error={linkedIssue || errors.linked_incident_number}
                    hint={
                      checkingLinked
                        ? t("nazaha.checkingLinkedReport")
                        : linkedReport && !linkedIssue
                          ? t("nazaha.linkedReportFound")
                          : undefined
                    }
                  />
                )}
              </div>
            </Card>

            {/* 2. Processing */}
            <Card className="p-6">
              {sectionTitle(2, "processing")}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TreeSelect
                  label={t("nazaha.classification")}
                  data={classifications as unknown as TreeSelectNode[]}
                  value={form.classification_id}
                  onChange={(id) => setField("classification_id", id)}
                  placeholder={t("incidents.selectClassification")}
                  required
                  error={errors.classification_id}
                  leafOnly
                  emptyMessage={t("incidents.noClassifications")}
                />
                <TreeSelect
                  label={t("nazaha.reportLocation")}
                  data={reportLocationOptions as unknown as TreeSelectNode[]}
                  value={form.report_location_id}
                  onChange={onReportLocationSelect}
                  placeholder={
                    isMatchingLocation
                      ? t("incidents.matchingLocation", "Matching location...")
                      : t("nazaha.selectReportLocation")
                  }
                  required
                  error={errors.location_id}
                  emptyMessage={t("incidents.noLocations")}
                />
                {isMatchingLocation && (
                  <div className="flex items-center gap-1.5 text-xs text-blue-600 md:col-start-2 -mt-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>
                      {t(
                        "incidents.matchingLocationHint",
                        "Matching geolocation to location master...",
                      )}
                    </span>
                  </div>
                )}
                {isShown("concerned_authority_id") && (
                  <Select
                    label={t("nazaha.concernedAuthority")}
                    required={isRequired("concerned_authority_id")}
                    value={form.concerned_authority_id}
                    onChange={(e) =>
                      setField("concerned_authority_id", e.target.value)
                    }
                    options={[
                      {
                        value: "",
                        label: t("nazaha.selectConcernedAuthority"),
                      },
                      ...(authoritiesData?.data || []).map((v) => ({
                        value: v.id,
                        label: (isArabic && v.name_ar) || v.name,
                      })),
                    ]}
                    error={errors.concerned_authority_id}
                  />
                )}
              </div>
              {isShown("attachments") && (
                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium">
                    {t("nazaha.attachments")}
                    {isRequired("attachments") && (
                      <span className="text-red-500 ms-1">*</span>
                    )}
                  </label>
                  <AttachmentDropzone
                    policy={attachmentPolicy}
                    onFiles={(files) => void addAttachments(files)}
                    disabled={
                      !attachmentPolicy.enabled ||
                      attachments.length >= attachmentPolicy.maxFiles ||
                      imageValidation.isValidating
                    }
                    busyText={
                      imageValidation.isValidating
                        ? t("incidents.validatingImages", "Checking photos...")
                        : undefined
                    }
                    hasError={!!errors.attachments}
                  />
                  {errors.attachments && (
                    <p className="text-sm text-[hsl(var(--destructive))]">
                      {errors.attachments}
                    </p>
                  )}
                  {existingAttachments.map((att) => (
                    <AttachmentFileRow
                      key={att.id}
                      name={att.file_name}
                      size={att.file_size}
                      status="ready"
                      onRemove={() => {
                        setExistingAttachments((prev) =>
                          prev.filter((a) => a.id !== att.id),
                        );
                        setDeletedAttachmentIds((prev) => [...prev, att.id]);
                        setIsDirty(true);
                      }}
                    />
                  ))}
                  {attachments.map((file, index) => (
                    <AttachmentFileRow
                      key={`${file.name}-${index}`}
                      name={file.name}
                      size={file.size}
                      status={isOversized(file) ? "rejected" : "ready"}
                      message={t("attachments.tooLarge", {
                        size: (file.size / (1024 * 1024)).toFixed(1),
                        max: maxSizeMB,
                        defaultValue:
                          "File is {{size}} MB, the limit is {{max}} MB.",
                      })}
                      onNameClick={() => setPreviewIndex(index)}
                      onRemove={() =>
                        setAttachments((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                    />
                  ))}
                  <RejectedFileRows
                    items={attachmentPolicy.rejected}
                    onDismiss={attachmentPolicy.dismissRejected}
                  />
                  <RejectedFileRows
                    items={imageValidation.rejected}
                    onDismiss={imageValidation.dismissRejected}
                  />
                </div>
              )}
            </Card>

            {/* 3. Reporter Cooperation */}
            {isShown("cooperation_status") && (
              <Card className="p-6">
                {sectionTitle(3, "cooperation")}
                <Select
                  label={t("nazaha.cooperation")}
                  value={form.cooperation_status}
                  onChange={(e) =>
                    setField(
                      "cooperation_status",
                      e.target.value as FormState["cooperation_status"],
                    )
                  }
                  required={isRequired("cooperation_status")}
                  error={errors.cooperation_status}
                  options={[
                    { value: "", label: t("nazaha.selectCooperation") },
                    { value: "cooperative", label: t("nazaha.cooperative") },
                    {
                      value: "uncooperative",
                      label: t("nazaha.uncooperative"),
                    },
                  ]}
                />
                <p className="mt-2 flex items-start gap-1.5 text-xs text-blue-700">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {t("nazaha.uncooperativeHint")}
                </p>
              </Card>
            )}

            {/* 4. Reporter Data */}
            {reporterFields.some(isShown) && (
              <Card className="p-6">
                {sectionTitle(4, "reporterData")}
                {reporterLocked ? (
                  <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
                    <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">
                        {t("nazaha.reporterHidden")}
                      </p>
                      <p className="text-xs">
                        {canReveal
                          ? t("nazaha.revealToEdit")
                          : t("nazaha.reporterHiddenHint")}
                      </p>
                    </div>
                    {canReveal && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void revealReporter()}
                        isLoading={revealing}
                        leftIcon={<Eye className="w-4 h-4" />}
                      >
                        {t("nazaha.showReporter")}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {showReporterName && (
                      <Input
                        label={t("nazaha.reporterName")}
                        value={form.reporter_name}
                        onChange={(e) =>
                          setField("reporter_name", e.target.value)
                        }
                        placeholder={t("nazaha.reporterNamePlaceholder")}
                        required={isRequired("reporter_name")}
                        error={errors.reporter_name}
                      />
                    )}
                    {isShown("reporter_nationality") && (
                      <Select
                        label={t("nazaha.nationality")}
                        value={form.reporter_nationality}
                        onChange={(e) =>
                          setField("reporter_nationality", e.target.value)
                        }
                        options={[
                          { value: "", label: t("nazaha.selectNationality") },
                          ...nationalityOptions,
                        ]}
                        required={isRequired("reporter_nationality")}
                        error={errors.reporter_nationality}
                      />
                    )}
                    {isShown("reporter_national_id") && (
                      <Input
                        label={t("nazaha.nationalId")}
                        value={form.reporter_national_id}
                        onChange={(e) =>
                          setField(
                            "reporter_national_id",
                            e.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                        placeholder={t("nazaha.nationalIdPlaceholder")}
                        inputMode="numeric"
                        required={isRequired("reporter_national_id")}
                        error={errors.reporter_national_id}
                      />
                    )}
                    {showReporterPhone && (
                      <PhoneNumberInput
                        label={t("nazaha.mobile")}
                        value={form.reporter_phone}
                        onChange={(value) => setField("reporter_phone", value)}
                        onBlur={() =>
                          setErrors((prev) => ({
                            ...prev,
                            reporter_phone: form.reporter_phone
                              ? phoneError(form.reporter_phone)
                              : "",
                          }))
                        }
                        required={isRequired("reporter_mobile")}
                        error={errors.reporter_phone}
                      />
                    )}
                    {isShown("reporter_address") && (
                      <Input
                        label={t("nazaha.reporterAddress")}
                        value={form.reporter_address}
                        onChange={(e) =>
                          setField("reporter_address", e.target.value)
                        }
                        placeholder={t("nazaha.reporterAddressPlaceholder")}
                        required={isRequired("reporter_address")}
                        error={errors.reporter_address}
                      />
                    )}
                    {isShown("reporter_email") && (
                      <Input
                        label={t("nazaha.email")}
                        type="email"
                        value={form.reporter_email}
                        onChange={(e) =>
                          setField("reporter_email", e.target.value)
                        }
                        placeholder="name@example.com"
                        required={isRequired("reporter_email")}
                        error={errors.reporter_email}
                      />
                    )}
                    {isShown("reporter_gender") && (
                      <Select
                        label={t("nazaha.gender")}
                        value={form.reporter_gender}
                        onChange={(e) =>
                          setField("reporter_gender", e.target.value)
                        }
                        options={[
                          { value: "", label: t("nazaha.selectGender") },
                          ...NAZAHA_GENDERS.map((g) => ({
                            value: g,
                            label: t(`nazaha.genders.${g}`),
                          })),
                        ]}
                        required={isRequired("reporter_gender")}
                        error={errors.reporter_gender}
                      />
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* 5. Report Details */}
            {(isShown("content") || isShown("notes")) && (
              <Card className="p-6">
                {sectionTitle(5, "reportDetails")}
                <div className="space-y-4">
                  {isShown("content") && (
                    <div>
                      <Textarea
                        label={t("nazaha.content")}
                        value={form.content}
                        onChange={(e) => setField("content", e.target.value)}
                        placeholder={t("nazaha.contentPlaceholder")}
                        rows={5}
                        maxLength={INCIDENT_CONTENT_MAX_LENGTH}
                        required={isRequired("content")}
                        error={errors.content}
                      />
                      <div className="flex justify-end mt-1">
                        <span
                          className={cn(
                            "text-xs font-mono",
                            form.content.length >= INCIDENT_CONTENT_MAX_LENGTH
                              ? "text-[hsl(var(--destructive))] font-semibold"
                              : "text-[hsl(var(--muted-foreground))]",
                          )}
                        >
                          {form.content.length}/{INCIDENT_CONTENT_MAX_LENGTH}
                        </span>
                      </div>
                    </div>
                  )}
                  {isShown("notes") && (
                    <Textarea
                      label={t("nazaha.notes")}
                      required={isRequired("notes")}
                      value={form.notes}
                      onChange={(e) => setField("notes", e.target.value)}
                      placeholder={t("nazaha.notesPlaceholder")}
                      rows={3}
                      maxLength={2000}
                      error={errors.notes}
                    />
                  )}
                </div>
              </Card>
            )}

            {/* 6. Reporter Location */}
            <Card className="p-6">
              {sectionTitle(6, "reporterLocation")}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label={t("nazaha.city")}
                  value={cityNode?.id || ""}
                  onChange={(e) => onCitySelect(e.target.value)}
                  options={[
                    {
                      value: "",
                      label: form.report_location_id
                        ? t("nazaha.selectCity")
                        : t("nazaha.selectReportLocationFirst"),
                    },
                    ...cityOptions.map((l) => ({
                      value: l.id,
                      label: getLocalizedName(l),
                    })),
                  ]}
                  disabled={cityOptions.length === 0}
                  required={cityOptions.length > 0}
                  hint={t("nazaha.cityFromLocation")}
                  error={errors.city}
                />
                {isShown("street") && (
                  <Input
                    label={t("nazaha.street")}
                    required={isRequired("street")}
                    value={form.street}
                    onChange={(e) => setField("street", e.target.value)}
                    placeholder={t("nazaha.streetPlaceholder")}
                    error={errors.street}
                  />
                )}
                {isShown("geolocation") && (
                  <div className="md:col-span-2">
                    <LocationPicker
                      label={t("nazaha.map")}
                      value={mapValue}
                      onChange={onMapChange}
                      required={isRequired("geolocation")}
                      error={errors.geolocation}
                      onToggleExpand={() => setShowMapModal(true)}
                      showCoordinateInputs
                      coordinatesReadOnly
                      onCoordinateErrorChange={setCoordinateError}
                    />
                    <LocationPickerModal
                      isOpen={showMapModal}
                      onClose={() => setShowMapModal(false)}
                      value={mapValue}
                      onChange={onMapChange}
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* Other fields the workflow lists */}
            {(lookupCategories.length > 0 ||
              isShown("description") ||
              isShown("caller_identity_text") ||
              isShown("comment")) && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">
                  {t("incidents.additionalDetails")}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lookupCategories.map((category) => (
                    <DynamicLookupField
                      key={category.id}
                      category={category}
                      value={lookupValues[category.id]}
                      onChange={(categoryId, value) => {
                        setLookupValues((prev) => ({
                          ...prev,
                          [categoryId]: value,
                        }));
                        setIsDirty(true);
                      }}
                      required={isRequired(`lookup:${category.code}`)}
                      error={errors[`lookup:${category.code}`]}
                    />
                  ))}
                  {isShown("caller_identity_text") && (
                    <Input
                      label={t("incidents.callerIdentity", "Caller Identity")}
                      value={form.caller_identity_text}
                      onChange={(e) =>
                        setField("caller_identity_text", e.target.value)
                      }
                      maxLength={200}
                      required={isRequired("caller_identity_text")}
                      error={errors.caller_identity_text}
                    />
                  )}
                  {isShown("description") && (
                    <div className="md:col-span-2">
                      <Textarea
                        label={t("incidents.description")}
                        value={form.description}
                        onChange={(e) =>
                          setField("description", e.target.value)
                        }
                        rows={3}
                        maxLength={1000}
                        required={isRequired("description")}
                        error={errors.description}
                      />
                    </div>
                  )}
                  {isShown("comment") && (
                    <div className="md:col-span-2">
                      <Textarea
                        label={t("incidents.comment")}
                        value={form.comment}
                        onChange={(e) => setField("comment", e.target.value)}
                        placeholder={t("incidents.commentPlaceholder")}
                        rows={3}
                        required={isRequired("comment")}
                        error={errors.comment}
                      />
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold">
                  {t("incidents.workflow")}
                </h2>
              </div>
              <Select
                label={t("incidents.workflow")}
                value={form.workflow_id}
                onChange={(e) => {
                  setField("workflow_id", e.target.value);
                  setIsAutoMatched(false);
                }}
                options={workflowOptions}
                required
                disabled={isEdit}
                error={errors.workflow_id}
              />
              {isEdit && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                  <Info className="w-3 h-3" />
                  <span>{t("incidents.workflowCannotChange")}</span>
                </p>
              )}
              {!isEdit && isAutoMatched && form.workflow_id && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
                  <Info className="w-3 h-3" />
                  <span>{t("incidents.autoMatchedHint")}</span>
                </div>
              )}
              {errors.title && (
                <p className="mt-2 text-sm text-[hsl(var(--destructive))]">
                  {errors.title}
                </p>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                {t("incidents.assignment")}
              </h2>
              <div className="space-y-4">
                {isEdit && (
                  <>
                    <AppSelect
                      value={form.assignee_id}
                      onValueChange={(value) => setField("assignee_id", value)}
                      disabled={isAssigneeLocked}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("incidents.unassigned")}>
                          {assigneeOptions.find(
                            (o) => o.value === form.assignee_id,
                          )?.label || t("incidents.selectAssignee")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <VirtualizedList
                          items={assigneeOptions}
                          height="h-72"
                          estimateSize={48}
                          getKey={(option) => option.value}
                          renderItem={(option) => (
                            <SelectItem value={option.value}>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-7 w-7">
                                  <AvatarFallback className="text-xs">
                                    {option.avatar}
                                  </AvatarFallback>
                                  {option.value ? (
                                    <AvatarBadge
                                      className={
                                        statusBadgeColor[option.status] ??
                                        "bg-gray-400"
                                      }
                                    />
                                  ) : null}
                                </Avatar>
                                <span className="truncate">{option.label}</span>
                              </div>
                            </SelectItem>
                          )}
                        />
                      </SelectContent>
                    </AppSelect>
                    {isAssigneeLocked && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t(
                          "incidents.assigneeLocked",
                          "The assignee cannot be changed in the current state.",
                        )}
                      </p>
                    )}
                  </>
                )}
                {!isEdit &&
                  (assignmentMode === "auto" || assignmentMode === "none") && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>{t("incidents.autoAssignedOnCreation")}</span>
                    </div>
                  )}
                {assignmentMode === "specific" && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{t("incidents.specificUserWillBeAssigned")}</span>
                  </div>
                )}
                {(assignmentMode === "manual" || showAssigneeFallback) && (
                  <Select
                    label={t("incidents.assignee")}
                    value={form.assignee_id}
                    onChange={(e) => setField("assignee_id", e.target.value)}
                    options={[
                      { value: "", label: t("incidents.selectAssignee") },
                      ...(assignmentMode === "manual"
                        ? matchingUsersData?.data || []
                        : usersData?.data || []
                      ).map((u) => ({
                        value: u.id,
                        label:
                          [u.first_name, u.last_name]
                            .filter(Boolean)
                            .join(" ") || u.username,
                      })),
                    ]}
                    required={
                      assignmentMode === "manual" || isRequired("assignee_id")
                    }
                    error={errors.assignee_id}
                  />
                )}
                {(isEdit || isShown("department_id")) && (
                  <Select
                    label={t("incidents.department")}
                    value={form.department_id}
                    onChange={(e) => setField("department_id", e.target.value)}
                    options={[
                      { value: "", label: t("incidents.noDepartment") },
                      ...(departmentsData?.data || []).map((d) => ({
                        value: d.id,
                        label: (isArabic && d.name_ar) || d.name,
                      })),
                    ]}
                    required={isRequired("department_id")}
                    error={errors.department_id}
                  />
                )}
                {(isEdit || isShown("due_date")) && (
                  <Input
                    label={t("incidents.dueDate")}
                    type="datetime-local"
                    value={form.due_date}
                    onChange={(e) => setField("due_date", e.target.value)}
                    required={isRequired("due_date")}
                    error={errors.due_date}
                  />
                )}
              </div>
            </Card>

            <Card className="p-6">
              {errors.submit && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{errors.submit}</span>
                </div>
              )}
              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  leftIcon={<Save className="w-4 h-4" />}
                  isLoading={
                    createMutation.isPending || updateMutation.isPending
                  }
                  disabled={imageValidation.isValidating}
                >
                  {isEdit ? t("nazaha.saveChanges") : t("nazaha.createReport")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleCancel}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </form>

      <Modal isOpen={showDiscard} onClose={() => setShowDiscard(false)}>
        <ModalHeader>
          <ModalTitle>{t("nazaha.discardTitle")}</ModalTitle>
          <ModalDescription>{t("nazaha.discardMessage")}</ModalDescription>
        </ModalHeader>
        <ModalBody>{null}</ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowDiscard(false)}>
            {t("nazaha.keepEditing")}
          </Button>
          <Button variant="destructive" onClick={() => navigate(leavePath)}>
            {t("nazaha.discard")}
          </Button>
        </ModalFooter>
      </Modal>

      {previewIndex !== null && (
        <AttachmentPreview
          attachments={attachments}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </div>
  );
}

export function NazahaIncidentCreatePage() {
  return <NazahaIncidentForm />;
}

export function NazahaIncidentEditPage() {
  const { id } = useParams<{ id: string }>();
  return <NazahaIncidentForm key={id} incidentId={id} />;
}
