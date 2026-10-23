import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  Boxes,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Info,
  Layers,
  MapPin,
  MessageSquare,
  MessageSquareText,
  Minimize2,
  Maximize2,
  Mail,
  Paperclip,
  Pen,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Smartphone,
  Star,
  TriangleAlert,
  User,
  Users,
  UserX,
  X,
  XCircle,
  Bot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ZoomableImage } from "@/components/common/ZoomableImage";
import { useFullscreen } from "@/hooks/useFullscreen";
import { cn, getLocalizedName } from "@/lib/utils";
import {
  incidentApi,
  aiQualityApi,
  gisLocationApi,
  incidentMergeApi,
} from "../../../api/admin";
import { IncidentTransitionDialog } from "../../../components/incidents/IncidentTransitionDialog";
import {
  BulkUnmergeModal,
  ConvertToRequestModal,
  UnmergeIncidentsModal,
} from "../../../components/incidents";
import { useAuthStore } from "../../../stores/authStore";
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "../../../components/ui";
import { usePermissions } from "../../../hooks/usePermissions";
import { PERMISSIONS } from "../../../constants/permissions";
import type {
  AvailableTransition,
  Incident,
  IncidentDetail,
  WorkflowTransition,
} from "../../../types";
import { priorityTone, stateTone } from "@/utils/incidentTone";
import { useSourceLabel } from "../../../hooks/useIncidentDisplay";
import {
  useClassificationTree,
  useDepartmentTree,
  useNodePath,
} from "../../../hooks/useIncidentDisplay";
import {
  formatAgo,
  formatDay,
  getAttachmentPreviewUrl,
  getAttachmentUrl,
} from "./workspace/workspaceUtils";
import { DetailsTab } from "./workspace/DetailsTab";
import { ActivityTab } from "./workspace/ActivityTab";
import { CommentsTab } from "./workspace/CommentsTab";
import { CommunicationTab } from "./workspace/CommunicationTab";
import { AttachmentsTab } from "./workspace/AttachmentsTab";
import { QualityTab } from "./workspace/QualityTab";
import { RevisionsTab } from "./workspace/RevisionsTab";
import { RejectionHistoryTab } from "./workspace/RejectionHistoryTab";
import { LinkedSystemsTab } from "./workspace/LinkedSystemsTab";
import { NasaqTab } from "./workspace/NasaqTab";

interface Props {
  incident: Incident | null;
}

type TabKey =
  | "details"
  | "activity"
  | "comments"
  | "attachments"
  | "revisions"
  | "communication"
  | "rejectionHistory"
  | "linkedSystems"
  | "nasaq"
  | "quality";

const TAB_LABEL_KEYS: Record<TabKey, string> = {
  details: "incidents.details",
  activity: "incidents.activity",
  comments: "incidents.comments",
  attachments: "incidents.attachments",
  revisions: "incidents.revisions",
  communication: "incidents.communications",
  rejectionHistory: "incidents.rejectionHistory",
  linkedSystems: "incidents.linkedSystems",
  nasaq: "incidents.nasaqInformation",
  quality: "qualityAudit.title",
};
const TABS: TabKey[] = [
  "details",
  "activity",
  "comments",
  "attachments",
  "revisions",
  "communication",
  "rejectionHistory",
  "quality",
  "linkedSystems",
  "nasaq",
];

const TAB_ICONS: Record<TabKey, LucideIcon> = {
  details: FileText,
  activity: Clock,
  comments: MessageSquare,
  attachments: Paperclip,
  revisions: RotateCcw,
  communication: Mail,
  rejectionHistory: XCircle,
  linkedSystems: ArrowRightLeft,
  nasaq: ShieldCheck,
  quality: Bot,
};

function priorityName(incident: Incident): string | null {
  const pv = incident.lookup_values?.find(
    (lv) => lv.category?.code === "PRIORITY",
  );
  return getLocalizedName(pv) || null;
}

function transitionIcon(transition: WorkflowTransition) {
  const cls = "h-2.5 w-2.5 text-[hsl(var(--muted-foreground))]";
  const lowerName = transition.name.toLowerCase();
  if (transition.is_rejection || lowerName.includes("reject"))
    return <TriangleAlert className={cls} />;
  if (
    transition.is_reopen ||
    lowerName.includes("reopen") ||
    lowerName.includes("re-open")
  )
    return <RotateCcw className={cls} />;
  if (
    transition.is_missing_info ||
    lowerName.includes("missing") ||
    lowerName.includes("info")
  )
    return <Info className={cls} />;
  if (transition.is_not_belong || lowerName.includes("belong"))
    return <UserX className={cls} />;
  if (
    transition.is_final_close ||
    lowerName.includes("final") ||
    lowerName.includes("close")
  )
    return <Check className={cls} />;
  if (lowerName.includes("approv")) return <Check className={cls} />;
  if (lowerName.includes("repeat") || lowerName.includes("duplicat"))
    return <Copy className={cls} />;
  if (lowerName.includes("assign") || lowerName.includes("transfer"))
    return <User className={cls} />;
  return <ChevronRight className={cls} />;
}

export function IncidentDetailsWorkspace({ incident }: Props) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { hasPermission, isSuperAdmin, canViewAllIncidents } = usePermissions();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("details");
  const [selectedTransition, setSelectedTransition] =
    useState<AvailableTransition | null>(null);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [unmergeModalOpen, setUnmergeModalOpen] = useState(false);
  const [bulkUnmergeModalOpen, setBulkUnmergeModalOpen] = useState(false);
  const [disableApproveTransition, setDisableApproveTransition] =
    useState(false);
  const pendingIncidentRef = useRef<string | null>(null);

  /* GIS boundary check — same approve-gate as IncidentDetailPage. */
  useEffect(() => {
    const checkLocation = async () => {
      try {
        // Always update the identity before any early return, so a late
        // response from a superseded incident cannot overwrite the current
        // incident's approval gate.
        pendingIncidentRef.current = incident?.id ?? null;
        if (!incident?.latitude || !incident?.longitude) return;
        const response = (await gisLocationApi.identifyLocation({
          x: incident.longitude,
          y: incident.latitude,
        })) as { results?: unknown[] };
        if (pendingIncidentRef.current !== incident.id) return;
        const results = response?.results || [];
        if (Array.isArray(results) && results.length === 0) {
          setDisableApproveTransition(true);
        } else {
          setDisableApproveTransition(false);
        }
      } catch (error) {
        if (pendingIncidentRef.current !== incident?.id) return;
        // eslint-disable-next-line no-console
        console.error("GIS identify failed", error);
        setDisableApproveTransition(false);
      }
    };
    if (!incident) {
      setDisableApproveTransition(false);
      pendingIncidentRef.current = null;
      return;
    }
    setDisableApproveTransition(false);
    void checkLocation();
  }, [incident]);

  /* Request Info — same mutation as IncidentDetailPage. */
  const canRequestInfo =
    isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_REQUEST_INFO);
  const requestInfoMutation = useMutation({
    mutationFn: () => incidentApi.requestCitizenInfo(incident!.id),
    onSuccess: () => {
      toast.success(
        t("incidents.requestInfoSmsSent", "SMS sent successfully to citizen"),
      );
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(
        e.response?.data?.error ||
          t(
            "incidents.requestInfoFailed",
            "Failed to send request for information",
          ),
      );
    },
  });

  // Same report gating as IncidentDetailPage.
  const isEPM940 =
    window.APP_CONFIG?.CLIENT === "EPM940" ||
    import.meta.env.VITE_CLIENT === "EPM940";
  const canViewReports =
    isSuperAdmin || hasPermission(PERMISSIONS.REPORTS_VIEW);
  const canIncludeReportLogs =
    isSuperAdmin || hasPermission(PERMISSIONS.ACTION_LOGS_VIEW);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [includeReportLogs, setIncludeReportLogs] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const { data: transitionsData, isLoading: transitionsLoading } = useQuery({
    queryKey: ["incidents", "v2-list", "transitions", incident?.id ?? "none"],
    queryFn: () => incidentApi.getAvailableTransitions(incident!.id),
    enabled: !!incident?.id,
    staleTime: 30_000,
  });

  /* Auto-open reopen transition when navigated with ?action=reopen — mirrors IncidentDetailPage. */
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("action") !== "reopen") return;
    if (!incident?.id) return; // wait for incident to be selected
    if (transitionsLoading) return; // wait for transitions to load

    // Always consume the action after we've made our decision,
    // regardless of whether we open the dialog or not.
    const consumeAction = () => {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("action");
      setSearchParams(newParams, { replace: true });
    };

    if (!transitionsData?.data?.length) {
      consumeAction();
      return;
    }

    // Apply same visibility gates as the transition filter:
    // hide if location is "Default" or incident is merged non-master.
    const isLocationDefault = incident?.location?.name === "Default";
    const isMergedNonMaster =
      incident?.is_merged && incident?.master_incident_id !== incident?.id;
    if (isLocationDefault || isMergedNonMaster) {
      consumeAction();
      return;
    }

    const reopenTransition = transitionsData.data.find(
      (t) => t.transition.is_reopen && t.can_execute,
    );
    if (reopenTransition) {
      setSelectedTransition(reopenTransition);
    }
    consumeAction();
  }, [
    transitionsData?.data,
    transitionsLoading,
    searchParams,
    setSearchParams,
    incident?.id,
    incident?.location?.name,
    incident?.is_merged,
    incident?.master_incident_id,
  ]);

  const { data: attachmentsData } = useQuery({
    queryKey: ["incidents", "v2-list", "attachments", incident?.id ?? "none"],
    queryFn: () => incidentApi.listAttachments(incident!.id),
    enabled: !!incident?.id,
    staleTime: 60_000,
  });

  const { data: historyData } = useQuery({
    queryKey: ["incidents", "v2-list", "history", incident?.id ?? "none"],
    queryFn: () => incidentApi.getHistory(incident!.id),
    enabled: !!incident?.id,
    staleTime: 60_000,
  });

  /* Same AI quality feedback as IncidentDetailPage (absent until processed). */
  const { data: aiQualityData, isLoading: aiQualityLoading } = useQuery({
    queryKey: ["incidents", "v2-list", "ai-quality", incident?.id ?? "none"],
    queryFn: () => aiQualityApi.getByIncident(incident!.id),
    enabled: !!incident?.id,
    staleTime: 60_000,
    retry: false,
  });

  /* Combined comments + feedbacks — same source as IncidentDetailPage.
     Lives here (not only in the tab) so the tab badge shows the real
     count like the old page does with comments.length. */
  const { data: combinedCommentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ["incidents", "v2-list", "comments", incident?.id ?? "none"],
    queryFn: () => incidentApi.listCombinedComments(incident!.id),
    enabled: !!incident?.id,
    staleTime: 30_000,
  });
  const allComments = useMemo(
    () => combinedCommentsData ?? [],
    [combinedCommentsData],
  );
  const refreshComments = () => {
    if (!incident) return;
    void queryClient.invalidateQueries({
      queryKey: ["incidents", "v2-list", "comments", incident.id],
    });
    // Keep the tab badge + feed counts honest.
    void queryClient.invalidateQueries({ queryKey: ["incidents", "v2-list"] });
  };

  const { data: canConvertData } = useQuery({
    queryKey: ["incidents", "v2-list", "can-convert", incident?.id ?? "none"],
    queryFn: () => incidentApi.canConvertToRequest(incident!.id),
    enabled: !!incident?.id,
    staleTime: 60_000,
  });

  const { data: mergedIncidentsData } = useQuery({
    queryKey: ["incidents", "v2-list", "merged", incident?.id ?? "none"],
    queryFn: () => incidentMergeApi.getMergedIncidents(incident!.id),
    enabled: !!incident?.id,
    staleTime: 30_000,
  });

  const slaDeadline = incident?.sla_deadline;
  const slaDays = useMemo(() => {
    if (!slaDeadline) return null;
    // Overdue-day count is derived display data for the selected incident.
    const now = Date.now();
    return Math.floor((now - new Date(slaDeadline).getTime()) / 86_400_000);
  }, [slaDeadline]);

  const transitionHistory = useMemo(
    () =>
      [...(historyData?.data ?? [])].sort(
        (a, b) =>
          new Date(a.transitioned_at).getTime() -
          new Date(b.transitioned_at).getTime(),
      ),
    [historyData],
  );
  const approvals = useMemo(
    () =>
      transitionHistory.filter(
        (h) => h.transition && !h.transition.is_rejection,
      ),
    [transitionHistory],
  );
  const rejections = useMemo(
    () => transitionHistory.filter((h) => h.transition?.is_rejection),
    [transitionHistory],
  );
  const aiQuality = aiQualityData?.data ?? null;

  /* Image lightbox — same behaviour as IncidentDetailPage. */
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    downloadUrl: string;
    name: string;
  } | null>(null);
  const lightboxFullscreen = useFullscreen<HTMLDivElement>();

  const imageAttachments = useMemo(
    () =>
      (attachmentsData?.data ?? []).filter((a) =>
        a.mime_type.startsWith("image/"),
      ),
    [attachmentsData],
  );

  const showLightboxAttachmentAt = useCallback(
    (index: number) => {
      const attachment = imageAttachments[index];
      if (!attachment) return;
      setLightboxIndex(index);
      setLightboxImage({
        url: getAttachmentPreviewUrl(attachment.id),
        downloadUrl: getAttachmentUrl(attachment.id),
        name: attachment.file_name,
      });
    },
    [imageAttachments],
  );

  const openLightbox = (attachmentId: string) => {
    const index = imageAttachments.findIndex((a) => a.id === attachmentId);
    showLightboxAttachmentAt(index >= 0 ? index : 0);
    setLightboxOpen(true);
  };

  const goToPreviousAttachment = useCallback(() => {
    if (lightboxIndex > 0) showLightboxAttachmentAt(lightboxIndex - 1);
  }, [lightboxIndex, showLightboxAttachmentAt]);

  const goToNextAttachment = useCallback(() => {
    if (lightboxIndex < imageAttachments.length - 1) {
      showLightboxAttachmentAt(lightboxIndex + 1);
    }
  }, [lightboxIndex, imageAttachments.length, showLightboxAttachmentAt]);

  useEffect(() => {
    if (!lightboxOpen) return;
    lightboxFullscreen.enterFullscreen();
    return () => {
      lightboxFullscreen.exitFullscreen();
    };
  }, [lightboxOpen, lightboxFullscreen]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          lightboxFullscreen.exitFullscreen();
        } else {
          setLightboxOpen(false);
        }
      } else if (e.key === "ArrowLeft") {
        goToPreviousAttachment();
      } else if (e.key === "ArrowRight") {
        goToNextAttachment();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    lightboxOpen,
    lightboxIndex,
    imageAttachments,
    goToPreviousAttachment,
    goToNextAttachment,
    lightboxFullscreen,
  ]);

  // Nasaq tab is gated exactly like IncidentDetailPage: is_nasaq
  // classification plus the verify permission.
  const showNasaqTab =
    !!incident?.classification?.is_nasaq &&
    (isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_VERIFY_NASAQ));
  const visibleTabs = useMemo(
    () => TABS.filter((tabKey) => tabKey !== "nasaq" || showNasaqTab),
    [showNasaqTab],
  );
  const sourceLabel = useSourceLabel(incident?.source);

  // Hierarchy breadcrumbs — same trees (and query keys) as the feed
  // FilterDrawer, so no extra requests.
  const classificationPath = useNodePath(
    useClassificationTree(),
    incident?.classification?.id,
    i18n.language,
  );
  const departmentPath = useNodePath(
    useDepartmentTree(),
    incident?.department?.id,
    i18n.language,
  );

  // Momra reference from custom fields — same as IncidentDetailPage.
  let momraRef = "";
  try {
    const parsed =
      typeof incident?.custom_fields === "string"
        ? JSON.parse(incident.custom_fields)
        : (incident?.custom_fields ?? null);
    momraRef = parsed?.momra_incident_no || "";
  } catch {
    momraRef = "";
  }

  // Assignees — search rows carry only the singular assignee, so resolve
  // the full list from the detail endpoint (cached, same as other tabs).
  const { data: assigneeDetailData } = useQuery({
    queryKey: ["incidents", "v2-list", "assignees", incident?.id ?? "none"],
    queryFn: () => incidentApi.getById(incident!.id),
    enabled: !!incident?.id,
    staleTime: 60_000,
    retry: false,
  });
  const assigneeList =
    assigneeDetailData?.data?.assignees &&
    assigneeDetailData.data.assignees.length > 0
      ? assigneeDetailData.data.assignees
      : incident?.assignees && incident.assignees.length > 0
        ? incident.assignees
        : incident?.assignee
          ? [incident.assignee]
          : [];
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const assigneeBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!assigneeDropdownOpen) return;
    const onDown = (e: MouseEvent) => {
      if (
        assigneeBoxRef.current &&
        !assigneeBoxRef.current.contains(e.target as Node)
      ) {
        setAssigneeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [assigneeDropdownOpen]);

  /* Presence — who else is viewing, same as IncidentDetailPage. */
  const { data: presenceData } = useQuery({
    queryKey: ["incidents", "v2-list", "presence", incident?.id ?? "none"],
    queryFn: () => incidentApi.getPresence(incident!.id),
    enabled: !!incident?.id,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });
  const otherUsers = useMemo(
    () => presenceData?.data?.filter((u) => u.user_id !== user?.id) || [],
    [presenceData, user?.id],
  );

  if (!incident) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--muted)/0.6)] border border-[hsl(var(--border))]">
          <FileText className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-[hsl(var(--foreground))]">
          {t("incidents.selectIncidentTitle")}
        </h3>
        <p className="mt-1 max-w-xs text-xs text-[hsl(var(--muted-foreground))]">
          {t("incidents.selectIncidentHint")}
        </p>
      </div>
    );
  }

  const stateName = getLocalizedName(incident.current_state) || "—";
  const tone = stateTone(stateName);
  const prioName = priorityName(incident);
  const prio = priorityTone(prioName);
  const deptName = getLocalizedName(incident.department);
  const locName = getLocalizedName(incident.location);
  const classificationName = getLocalizedName(incident.classification);
  const attachments = attachmentsData?.data ?? [];
  const isLocationDefault = incident?.location?.name === "Default";
  const isMergedNonMaster =
    incident?.is_merged && incident?.master_incident_id !== incident?.id;
  const transitions = (transitionsData?.data || []).filter((tr) => {
    if (isLocationDefault) return false;
    if (isMergedNonMaster) return false;
    return tr.can_execute;
  });
  const canConvertToRequest = canConvertData?.data?.can_convert ?? false;
  const mergedIncidents = mergedIncidentsData?.data ?? [];

  /* same gates as IncidentDetailPage */
  const canMergeIncidents =
    isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_MERGE);
  const canCloneIncident =
    isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_CREATE);
  const canEditIncident = (() => {
    if (!hasPermission(PERMISSIONS.INCIDENTS_UPDATE)) return false;
    if (isSuperAdmin) return true;
    const editableRoles = incident?.current_state?.editable_roles;
    if (!editableRoles || editableRoles.length === 0) return true;
    return editableRoles.some((r) => user?.roles?.some((ur) => ur.id === r.id));
  })();
  const canEdit = (() => {
    if (!incident) return false;
    const roles = incident.current_state?.editable_roles ?? [];
    const userRoles = user?.roles?.map((role) => role?.id) ?? [];
    return roles.length === 0 || roles.some((r) => userRoles.includes(r.id));
  })();
  const canViewTransitions =
    canViewAllIncidents() ||
    assigneeList.some((assignee) => assignee.id === user?.id);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(incident.incident_number);
      toast.success(t("incidents.copied"));
    } catch {
      toast.error(t("incidents.copyFailed"));
    }
  };

  const copyUrl = async () => {
    try {
      const basePath =
        window.APP_CONFIG?.BASE_PATH ??
        import.meta.env.VITE_BASE_PATH ??
        import.meta.env.BASE_URL ??
        "/";
      const normalizedBase = basePath.replace(/\/$/, "");
      await navigator.clipboard.writeText(
        `${window.location.origin}${normalizedBase}/incidents/${incident.id}`,
      );
      toast.success(t("incidents.copied"));
    } catch {
      toast.error(t("incidents.copyFailed"));
    }
  };

  // Same download logic as IncidentDetailPage: server-generated PDF via
  // incidentApi.downloadReport, EPM940 goes through the include-logs modal.
  const handleDownloadReport = async () => {
    if (!incident) return;
    try {
      setGeneratingReport(true);
      const lang = i18n.language.startsWith("ar") ? "ar" : "en";
      const blob = await incidentApi.downloadReport(
        incident.id,
        "pdf",
        lang,
        isEPM940 ? canIncludeReportLogs && includeReportLogs : undefined,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incident_${incident.incident_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setReportModalOpen(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to download report:", err);
    } finally {
      setGeneratingReport(false);
    }
  };

  const badgeFor = (key: TabKey): number | null => {
    if (key === "comments") return allComments.length || null;
    if (key === "quality") return aiQuality ? 1 : null;
    if (key === "attachments")
      return (
        Math.max(incident.attachments_count ?? 0, attachments.length) || null
      );
    return null;
  };

  const tile =
    "bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg p-2 min-w-0";
  const tileLabel =
    "text-[10px] text-[hsl(var(--muted-foreground))] flex items-center gap-1 mb-1 font-medium truncate";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3.5">
        {/* presence — who else is viewing, same as IncidentDetailPage */}
        {otherUsers.length > 0 ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
                  <Users className="h-3.5 w-3.5" />
                </div>
                <span className="absolute -top-1.5 -end-1.5 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 items-center justify-center text-[9px] text-white font-bold">
                    {otherUsers.length}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                  {otherUsers.length === 1
                    ? t("incidents.alsoViewing")
                    : t("usersViewing", { count: otherUsers.length })}
                </p>
                {otherUsers.map((u, idx) => (
                  <div
                    key={u.user_id || idx}
                    className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full"
                  >
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
                      {u.user_name || u.user_email || t("unknownUser")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {/* top action row */}
        <div className="flex items-center justify-end gap-2 w-full">
          {canRequestInfo ? (
            <button
              type="button"
              onClick={() => requestInfoMutation.mutate()}
              disabled={requestInfoMutation.isPending}
              className="flex items-center px-3 py-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] bg-[hsl(var(--muted)/0.8)] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-md transition-all shadow-sm disabled:opacity-60"
            >
              {requestInfoMutation.isPending ? (
                <span className="h-3.5 w-3.5 me-1.5 animate-spin rounded-full border-2 border-[hsl(var(--muted-foreground))] border-t-transparent" />
              ) : (
                <MessageSquareText className="h-3.5 w-3.5 me-1.5" />
              )}
              {t("incidents.requestInfo")}
            </button>
          ) : null}
          {canViewReports ? (
            <button
              type="button"
              onClick={() =>
                isEPM940 ? setReportModalOpen(true) : handleDownloadReport()
              }
              disabled={!isEPM940 && generatingReport}
              className="flex items-center px-3 py-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] bg-[hsl(var(--muted)/0.8)] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-md transition-all shadow-sm disabled:opacity-60"
            >
              {!isEPM940 && generatingReport ? (
                <span className="h-3.5 w-3.5 me-1.5 animate-spin rounded-full border-2 border-[hsl(var(--muted-foreground))] border-t-transparent" />
              ) : (
                <Download className="h-3.5 w-3.5 me-1.5" />
              )}
              {!isEPM940 && generatingReport
                ? t("incidents.generating")
                : t("incidents.downloadReport")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={copyUrl}
            className="flex items-center px-3 py-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] bg-[hsl(var(--muted)/0.8)] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-md transition-all shadow-sm disabled:opacity-60"
            title={t("incidents.copyIncidentUrl")}
            aria-label={t("incidents.copyIncidentUrl")}
          >
            <Copy className="h-3.5 w-3.5 me-1.5" />
            {t("incidents.copyIncidentUrl")}
          </button>
        </div>

        {/* header banner */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-md shadow-black/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[hsl(var(--border))] pb-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5",
                  tone.pill,
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full animate-pulse",
                    tone.dot,
                  )}
                />
                {stateName}
              </span>
              {incident.sla_breached ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-[11px] font-bold border border-rose-600/40 shadow-sm">
                  <TriangleAlert className="h-2.5 w-2.5 text-rose-700 dark:text-rose-400" />
                  {t("incidents.slaBreached")}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 bg-[hsl(var(--muted)/0.7)] px-2.5 py-1 rounded-lg border border-[hsl(var(--border))]">
              <span className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium">
                {t("incidents.incident")}:
              </span>
              <span className="text-xs font-bold font-mono tracking-tight text-[hsl(var(--foreground))]">
                {incident.incident_number}
              </span>
              <button
                type="button"
                onClick={copyId}
                className="text-[hsl(var(--muted-foreground))] hover:text-cyan-700 dark:text-cyan-300 ms-0.5 transition-colors"
                title={t("incidents.copyIncidentId")}
                aria-label={t("incidents.copyIncidentId")}
              >
                <Copy className="h-3 w-3" />
              </button>
              {incident.converted_request_id ? (
                <Link
                  to={`/requests/${incident.converted_request_id}`}
                  className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-700 dark:text-emerald-300 hover:underline ms-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {incident.converted_request?.incident_number ||
                    t("incidents.viewRequest", "View Request")}
                </Link>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              {canEditIncident && canEdit ? (
                <button
                  type="button"
                  onClick={() => navigate(`/incidents/${incident.id}/edit`)}
                  className="px-2.5 py-1 bg-[hsl(var(--muted)/0.8)] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg text-xs font-semibold text-[hsl(var(--foreground))] transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {t("incidents.edit")}
                  <Pen className="h-2.5 w-2.5 text-cyan-700 dark:text-cyan-400" />
                </button>
              ) : null}
              {canCloneIncident ? (
                <button
                  type="button"
                  onClick={() => navigate(`/incidents/${incident.id}/clone`)}
                  className="px-2.5 py-1 bg-[hsl(var(--muted)/0.8)] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg text-xs font-semibold text-[hsl(var(--foreground))] transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {t("incidents.clone", "Clone")}
                  <Copy className="h-2.5 w-2.5 text-cyan-700 dark:text-cyan-400" />
                </button>
              ) : null}
              {canMergeIncidents && incident.is_merged ? (
                <button
                  type="button"
                  onClick={() => setUnmergeModalOpen(true)}
                  className="px-2.5 py-1 bg-[hsl(var(--muted)/0.8)] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg text-xs font-semibold text-[hsl(var(--foreground))] transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {t("incidents.merge.unmerge", "Unmerge")}
                  <ArrowRightLeft className="h-2.5 w-2.5 text-cyan-700 dark:text-cyan-400" />
                </button>
              ) : null}
              {canMergeIncidents && mergedIncidents.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setBulkUnmergeModalOpen(true)}
                  className="px-2.5 py-1 bg-[hsl(var(--muted)/0.8)] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg text-xs font-semibold text-[hsl(var(--foreground))] transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {t("incidents.merge.mergedIncidents", "Merged incidents")} (
                  {mergedIncidents.length})
                  <Users className="h-2.5 w-2.5 text-cyan-700 dark:text-cyan-400" />
                </button>
              ) : null}
            </div>
          </div>

          {/* meta tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 py-3 border-b border-[hsl(var(--border))]">
            <div className={tile}>
              <div className={tileLabel}>
                <Clock className="h-2.5 w-2.5 text-cyan-700 dark:text-cyan-400" />{" "}
                {t("incidents.created")}
              </div>
              <div className="text-xs font-semibold text-[hsl(var(--foreground))]">
                {formatDay(incident.created_at)}
              </div>
              <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
                {formatAgo(incident.created_at)}
              </div>
            </div>
            <div
              className={cn(
                "rounded-lg p-2 min-w-0",
                incident.sla_breached
                  ? "bg-rose-500/10 dark:bg-rose-950/20 border border-rose-500/30"
                  : tile,
              )}
            >
              <div
                className={cn(
                  "text-[10px] flex items-center gap-1 mb-1 font-medium truncate",
                  incident.sla_breached
                    ? "text-rose-700 dark:text-rose-300 font-semibold"
                    : "text-[hsl(var(--muted-foreground))]",
                )}
              >
                <TriangleAlert
                  className={cn(
                    "h-2.5 w-2.5",
                    incident.sla_breached
                      ? "text-rose-700 dark:text-rose-400"
                      : "text-cyan-700 dark:text-cyan-400",
                  )}
                />
                SLA Deadline
              </div>
              <div
                className={cn(
                  "text-xs truncate",
                  incident.sla_breached
                    ? "font-bold text-rose-800 dark:text-rose-200 font-mono"
                    : "font-semibold text-[hsl(var(--foreground))]",
                )}
              >
                {formatDay(incident.sla_deadline)}
              </div>
              <div
                className={cn(
                  "text-[10px] mt-0.5 truncate",
                  incident.sla_breached
                    ? "text-rose-700 dark:text-rose-400 font-medium"
                    : "text-[hsl(var(--muted-foreground))]",
                )}
              >
                {incident.sla_breached
                  ? "Breached"
                  : incident.sla_deadline
                    ? formatAgo(incident.sla_deadline)
                    : "—"}
              </div>
            </div>
            <div className={tile}>
              <div className={tileLabel}>
                <Star className="h-2.5 w-2.5 text-amber-700 dark:text-amber-400" />{" "}
                {t("incidents.priority")}
              </div>
              <div
                className={cn(
                  "text-xs font-semibold truncate",
                  prio ? prio.text : "text-[hsl(var(--foreground))]",
                )}
              >
                {prioName || "—"}
              </div>
              <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
                {incident.priority != null
                  ? t("incidents.priorityLevel", { level: incident.priority })
                  : "—"}
              </div>
            </div>
            <div className={tile}>
              <div className={tileLabel}>
                <Smartphone className="h-2.5 w-2.5 text-cyan-700 dark:text-cyan-400" />{" "}
                {t("incidents.source")}
              </div>
              <div className="text-xs font-semibold text-[hsl(var(--foreground))] truncate">
                {sourceLabel}
              </div>
              <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
                {incident.channel || "—"}
              </div>
            </div>
            <div className={tile}>
              <div className={tileLabel}>
                <Boxes className="h-2.5 w-2.5 text-cyan-700 dark:text-cyan-400" />{" "}
                {t("incidents.department")}
              </div>
              <div className="text-xs font-semibold text-[hsl(var(--foreground))] truncate">
                {deptName || "—"}
              </div>
              <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate capitalize">
                {departmentPath.length > 1
                  ? departmentPath.join(" / ")
                  : incident.department?.type || "—"}
              </div>
            </div>
            <div className={tile}>
              <div className={tileLabel}>
                <MapPin className="h-2.5 w-2.5 text-cyan-700 dark:text-cyan-400" />{" "}
                {t("incidents.location")}
              </div>
              <div className="text-xs font-semibold text-[hsl(var(--foreground))] truncate">
                {locName === "—" ? incident.city || "—" : locName}
              </div>
              <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
                {incident.city || "—"}
              </div>
            </div>
          </div>

          {/* classification */}
          <div className="pt-2.5 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                {t("incidents.classification")}:
              </span>
              <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--foreground))] bg-[hsl(var(--muted)/0.6)] px-2.5 py-1 rounded-md border border-[hsl(var(--border))] min-w-0">
                <Layers className="h-2.5 w-2.5 text-cyan-700 dark:text-cyan-400 shrink-0" />
                {classificationPath.length > 1 ? (
                  <span className="flex items-center gap-1 min-w-0">
                    {classificationPath.slice(0, -1).map((part, idx) => (
                      <span
                        key={idx}
                        className="flex items-center gap-1 shrink-0"
                      >
                        <span className="text-[hsl(var(--muted-foreground))] text-[11px] truncate max-w-[120px]">
                          {part}
                        </span>
                        <ChevronRight className="h-2.5 w-2.5 text-[hsl(var(--muted-foreground))] shrink-0 rtl:rotate-180" />
                      </span>
                    ))}
                    <span className="font-medium truncate">
                      {classificationPath[classificationPath.length - 1]}
                    </span>
                  </span>
                ) : (
                  <span className="font-medium truncate">
                    {classificationName || "—"}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap min-w-0">
              {assigneeList.length > 0 ? (
                <div ref={assigneeBoxRef} className="relative min-w-0">
                  <button
                    type="button"
                    onClick={() => setAssigneeDropdownOpen((v) => !v)}
                    aria-expanded={assigneeDropdownOpen}
                    className="flex items-center gap-1.5 min-w-0 rounded-md px-1.5 py-0.5 hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] shrink-0">
                      {assigneeList.length > 1
                        ? t("incidents.assignees")
                        : t("incidents.assignee")}
                      <span className="text-cyan-700 dark:text-cyan-400 font-mono">
                        {" "}
                        ({assigneeList.length})
                      </span>
                      :
                    </span>
                    {(() => {
                      const first = assigneeList[0];
                      return (
                        <span
                          className="flex items-center gap-1 text-xs text-[hsl(var(--foreground))] min-w-0"
                          title={first.email || first.username || undefined}
                        >
                          {first.avatar ? (
                            <img
                              src={first.avatar}
                              alt={first.username}
                              className="w-4 h-4 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <span className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-[8px] font-bold shrink-0">
                              {first.first_name?.[0] ||
                                first.username?.[0] ||
                                "?"}
                            </span>
                          )}
                          <span className="truncate max-w-[120px]">
                            {first.first_name
                              ? `${first.first_name} ${first.last_name || ""}`.trim()
                              : first.username}
                          </span>
                        </span>
                      );
                    })()}
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 text-[hsl(var(--muted-foreground))] shrink-0 transition-transform",
                        assigneeDropdownOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {assigneeDropdownOpen ? (
                    <div className="absolute start-0 top-full z-30 mt-1.5 w-64 max-w-[80vw] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl overflow-hidden">
                      <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
                        {assigneeList.map((assignee) => (
                          <div
                            key={assignee.id}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[hsl(var(--muted))] transition-colors min-w-0"
                            title={
                              assignee.email || assignee.username || undefined
                            }
                          >
                            {assignee.avatar ? (
                              <img
                                src={assignee.avatar}
                                alt={assignee.username}
                                className="w-6 h-6 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                {assignee.first_name?.[0] ||
                                  assignee.username?.[0] ||
                                  "?"}
                              </span>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-[hsl(var(--foreground))] truncate">
                                {assignee.first_name
                                  ? `${assignee.first_name} ${assignee.last_name || ""}`.trim()
                                  : assignee.username}
                              </div>
                              {assignee.email ? (
                                <div className="text-[10px] text-[hsl(var(--muted-foreground))] truncate font-mono">
                                  {assignee.email}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {incident.due_date ? (
                <span className="flex items-center gap-1.5 text-xs text-[hsl(var(--foreground))] shrink-0">
                  <Calendar className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    {t("incidents.dueDate")}:
                  </span>
                  <span className="font-mono">
                    {formatDay(incident.due_date)}
                  </span>
                </span>
              ) : null}
              {momraRef ? (
                <span className="flex items-center gap-1.5 text-xs text-[hsl(var(--foreground))] shrink-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    {t("incidents.momraIncidentNumber")}:
                  </span>
                  <span className="font-mono font-semibold text-cyan-700 dark:text-cyan-300">
                    {momraRef}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* actions + tabs */}
        <div className="space-y-2">
          {disableApproveTransition ? (
            <div className="w-full">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200">
                <TriangleAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium">
                    {t(
                      "incidents.outsideBoundaryTitle",
                      "Outside Location Boundary",
                    )}
                  </div>
                  <div className="mt-1 text-amber-800/80 dark:text-amber-800 dark:text-amber-200/80">
                    {t(
                      "incidents.outsideBoundary",
                      "Incident appears outside the defined location boundary — approvals disabled",
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {canViewTransitions &&
          (transitions.length > 0 ||
            ((!incident.record_type || incident.record_type === "incident") &&
              canConvertToRequest &&
              !isLocationDefault)) ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 px-0.5 flex-1 min-w-0 justify-end">
                {transitions.map((a) => {
                  const isApprove =
                    a.transition.name?.toLowerCase() === "approve";
                  const disabled =
                    !a.can_execute || (isApprove && disableApproveTransition);
                  return (
                    <button
                      key={a.transition.id}
                      type="button"
                      disabled={disabled}
                      title={
                        a.can_execute
                          ? a.transition.name
                          : a.reason || a.transition.name
                      }
                      onClick={() => setSelectedTransition(a)}
                      className="py-1 px-2.5 text-xs text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.7)] bg-[hsl(var(--muted)/0.7)] border border-[hsl(var(--border))] rounded-lg transition-colors flex items-center gap-1.5 font-medium shrink-0 whitespace-nowrap disabled:opacity-40"
                    >
                      {transitionIcon(a.transition)}
                      <span>
                        {getLocalizedName(a.transition) || a.transition.name}
                      </span>
                    </button>
                  );
                })}
                {(!incident.record_type ||
                  incident.record_type === "incident") &&
                canConvertToRequest &&
                incident?.location?.name !== "Default" ? (
                  <button
                    key="convert-to-request"
                    type="button"
                    onClick={() => setConvertModalOpen(true)}
                    className="py-1 px-2.5 text-xs text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.7)] bg-[hsl(var(--muted)/0.7)] border border-[hsl(var(--border))] rounded-lg transition-colors flex items-center gap-1.5 font-medium shrink-0 whitespace-nowrap"
                  >
                    <ArrowRightLeft className="h-2.5 w-2.5 text-[hsl(var(--muted-foreground))]" />
                    <span>
                      {t("incidents.convertToRequest", "Convert to Request")}
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="border-b border-[hsl(var(--border))]">
            <nav className="flex gap-1.5 overflow-x-auto text-xs font-medium pb-px">
              {visibleTabs.map((tabKey) => {
                const badge = badgeFor(tabKey);
                const active = tab === tabKey;
                const emerald = tabKey === "quality";
                const TabIcon = TAB_ICONS[tabKey];
                return (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => setTab(tabKey)}
                    className={cn(
                      "px-3 py-1.5 whitespace-nowrap flex items-center gap-1.5 transition-colors rounded-t",
                      active
                        ? emerald
                          ? "border-b-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/15"
                          : "border-b-2 border-cyan-400 text-cyan-700 dark:text-cyan-300 font-semibold bg-cyan-950/20"
                        : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.4)]",
                    )}
                  >
                    <TabIcon className="h-3.5 w-3.5" />
                    {t(TAB_LABEL_KEYS[tabKey])}
                    {badge != null ? (
                      <span
                        className={cn(
                          "inline-flex items-center justify-center min-w-4 h-4 pt-[2px] rounded-full text-[9px] font-mono leading-none border",
                          active
                            ? emerald
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40"
                            : "bg-[hsl(var(--muted))] border-[hsl(var(--border))]",
                        )}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {tab === "details" ? (
          <DetailsTab
            incident={incident}
            attachments={attachments}
            approvals={approvals}
            rejections={rejections}
            slaDays={slaDays}
            onPreviewAttachment={openLightbox}
            mergedIncidents={mergedIncidents}
          />
        ) : tab === "activity" ? (
          <ActivityTab transitionHistory={transitionHistory} />
        ) : tab === "comments" ? (
          <CommentsTab
            key={`comments-${incident.id}`}
            incidentId={incident.id}
            comments={allComments}
            loading={commentsLoading}
            onChanged={refreshComments}
          />
        ) : tab === "communication" ? (
          <CommunicationTab
            key={`communication-${incident.id}`}
            incidentId={incident.id}
          />
        ) : tab === "attachments" ? (
          <AttachmentsTab
            key={`attachments-${incident.id}`}
            incidentId={incident.id}
            attachments={attachments}
            transitionHistory={transitionHistory}
            onPreview={openLightbox}
          />
        ) : tab === "quality" ? (
          <QualityTab
            key={`quality-${incident.id}`}
            feedback={aiQuality}
            loading={aiQualityLoading}
          />
        ) : tab === "revisions" ? (
          <RevisionsTab
            key={`revisions-${incident.id}`}
            incidentId={incident.id}
            attachments={attachments}
            onPreviewAttachment={openLightbox}
          />
        ) : tab === "rejectionHistory" ? (
          <RejectionHistoryTab
            key={`rejections-${incident.id}`}
            incidentId={incident.id}
            transitionHistory={transitionHistory}
          />
        ) : tab === "linkedSystems" ? (
          <LinkedSystemsTab
            key={`linked-${incident.id}`}
            incidentId={incident.id}
          />
        ) : tab === "nasaq" ? (
          <NasaqTab key={`nasaq-${incident.id}`} incidentId={incident.id} />
        ) : (
          <section
            data-section={tab}
            aria-label={`${tab} (coming soon)`}
            className="bg-[hsl(var(--card))] border border-dashed border-[hsl(var(--border))] rounded-xl p-6 text-center"
          >
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] capitalize">
              {t(TAB_LABEL_KEYS[tab])}
            </h3>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              {t("incidents.moreComingSoon")}
            </p>
          </section>
        )}
      </div>

      {/* Image lightbox — same as IncidentDetailPage */}
      {lightboxOpen && lightboxImage && (
        <div
          ref={lightboxFullscreen.containerRef}
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 end-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[110]"
            aria-label={t("common.close", "Close")}
            title={t("common.close", "Close")}
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              lightboxFullscreen.toggleFullscreen();
            }}
            className="absolute top-4 end-16 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[110]"
            aria-label={
              lightboxFullscreen.isFullscreen
                ? t("common.exitFullScreen", "Exit Full Screen")
                : t("common.fullScreen", "Full Screen")
            }
            title={
              lightboxFullscreen.isFullscreen
                ? t("common.exitFullScreen", "Exit Full Screen")
                : t("common.fullScreen", "Full Screen")
            }
          >
            {lightboxFullscreen.isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>

          <div className="absolute top-4 start-4 z-[110] flex items-center gap-2 text-white text-sm bg-black/50 px-3 py-1.5 rounded-lg max-w-[60vw]">
            <span className="truncate">{lightboxImage.name}</span>
            {imageAttachments.length > 1 && (
              <span className="shrink-0 text-white/70">
                ({lightboxIndex + 1} {t("common.of", "of")}{" "}
                {imageAttachments.length})
              </span>
            )}
          </div>

          {imageAttachments.length > 1 && (
            <>
              {lightboxIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPreviousAttachment();
                  }}
                  className="absolute start-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[110]"
                  aria-label={t("common.previous", "Previous")}
                  title={t("common.previous", "Previous")}
                >
                  <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
                </button>
              )}
              {lightboxIndex < imageAttachments.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNextAttachment();
                  }}
                  className="absolute end-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[110]"
                  aria-label={t("common.next", "Next")}
                  title={t("common.next", "Next")}
                >
                  <ChevronRight className="w-6 h-6 rtl:rotate-180" />
                </button>
              )}
            </>
          )}

          <a
            href={lightboxImage.downloadUrl}
            download={lightboxImage.name}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 end-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[110]"
            aria-label={t("common.download", "Download")}
            title={t("common.download", "Download")}
          >
            <Download className="w-6 h-6" />
          </a>
          <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            <ZoomableImage src={lightboxImage.url} alt={lightboxImage.name} />
          </div>
        </div>
      )}

      {/* Shared transition wizard — same flow as IncidentDetailPage. */}
      {selectedTransition ? (
        <IncidentTransitionDialog
          key={`${incident.id}-${selectedTransition.transition.id}`}
          incident={incident}
          transition={selectedTransition}
          isOpen
          onClose={() => setSelectedTransition(null)}
        />
      ) : null}

      {/* Convert to Request — same modal + flow as IncidentDetailPage. */}
      {convertModalOpen ? (
        <ConvertToRequestModal
          incident={incident as IncidentDetail}
          isOpen={convertModalOpen}
          onClose={() => setConvertModalOpen(false)}
          onSuccess={(newRequestId) => {
            setConvertModalOpen(false);
            navigate(`/requests/${newRequestId}`);
          }}
        />
      ) : null}

      {/* Unmerge — same modal + flow as IncidentDetailPage. */}
      {unmergeModalOpen ? (
        <UnmergeIncidentsModal
          isOpen={unmergeModalOpen}
          onClose={() => setUnmergeModalOpen(false)}
          incident={incident}
          onUnmergeSuccess={() => {
            toast.success(t("incidents.merge.unmergeSuccess"));
            queryClient.invalidateQueries({ queryKey: ["incidents"] });
            queryClient.invalidateQueries({
              queryKey: ["incident", incident.id],
            });
          }}
        />
      ) : null}

      <BulkUnmergeModal
        isOpen={bulkUnmergeModalOpen}
        onClose={() => setBulkUnmergeModalOpen(false)}
        incidents={mergedIncidents}
        onUnmergeSuccess={() => {
          toast.success(t("incidents.merge.unmergeSuccess"));
          queryClient.invalidateQueries({ queryKey: ["incidents"] });
          queryClient.invalidateQueries({
            queryKey: ["incident", incident.id],
          });
        }}
      />

      {/* Same include-logs modal as IncidentDetailPage (EPM940 only). */}
      {canViewReports && isEPM940 ? (
        <Modal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          size="sm"
        >
          <ModalHeader>
            <ModalTitle>{t("incidents.downloadReport")}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            {canIncludeReportLogs ? (
              <label className="flex items-center gap-3 text-sm text-[hsl(var(--foreground))] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeReportLogs}
                  onChange={(event) =>
                    setIncludeReportLogs(event.target.checked)
                  }
                  disabled={generatingReport}
                  className="rounded border-[hsl(var(--border))] bg-[hsl(var(--muted))] accent-cyan-500"
                />
                {t("incidents.includeLogs")}
              </label>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              onClick={() => setReportModalOpen(false)}
              disabled={generatingReport}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleDownloadReport}
              isLoading={generatingReport}
              leftIcon={
                generatingReport ? undefined : <Download className="w-4 h-4" />
              }
            >
              {generatingReport
                ? t("incidents.generating")
                : t("incidents.downloadReport")}
            </Button>
          </ModalFooter>
        </Modal>
      ) : null}
    </div>
  );
}

export default IncidentDetailsWorkspace;
