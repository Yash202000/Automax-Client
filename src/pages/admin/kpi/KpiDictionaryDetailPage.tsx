import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  AlertTriangle,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  RotateCcw,
  Ban,
  Target,
  Building2,
  Layers,
  Tag,
  Calendar,
  GitBranch,
  ClipboardCheck,
  BarChart3,
  Paperclip,
  Users,
  MessageSquare,
  History,
  Plus,
  Trash2,
  Send,
  User,
  Pencil,
} from "lucide-react";
import {
  useStrategicKPIDetail,
  useOperationalKPIDetail,
  useAwardKPIDetail,
  useKpiStatusTransition,
  useKpiMetrics,
  useCreateKpiMetric,
  useUpdateKpiMetricValue,
  useDeleteKpiMetric,
  useKpiEngagementEvidence,
  useCreateKpiEvidence,
  useDeleteKpiEvidence,
  useKpiCollaborators,
  useAddKpiCollaborator,
  useRemoveKpiCollaborator,
  useKpiCheckIns,
  useCreateKpiCheckIn,
  useDeleteKpiCheckIn,
  useKpiComments,
  useAddKpiComment,
  useDeleteKpiComment,
  useKpiActivity,
} from "../../../hooks/useKpi";
import { usePermissions } from "../../../hooks/usePermissions";
import { useAuthStore } from "../../../stores/authStore";
import { userApi } from "../../../api/admin";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { Input, Select, Textarea } from "../../../components/ui/Input";
import type { KpiCheckInStatus, KpiCollaboratorRole } from "../../../types/kpi";

const statusColorMap: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};

const typeColorMap: Record<string, string> = {
  strategic: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  operational:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  award:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const checkInStatusColorMap: Record<string, string> = {
  on_track:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  at_risk:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  behind:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  blocked: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const activityActionColors: Record<string, string> = {
  create:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  transition:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  check_in:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  view: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400",
};

const transitionConfig: Record<
  string,
  { action: string; label: string; icon: React.ReactNode; color: string }[]
> = {
  draft: [
    {
      action: "activate",
      label: "Activate",
      icon: <Play className="w-4 h-4" />,
      color: "bg-green-600 hover:bg-green-700 text-white",
    },
  ],
  active: [
    {
      action: "deactivate",
      label: "Deactivate",
      icon: <Ban className="w-4 h-4" />,
      color: "bg-red-600 hover:bg-red-700 text-white",
    },
  ],
  inactive: [
    {
      action: "reactivate",
      label: "Reactivate",
      icon: <RotateCcw className="w-4 h-4" />,
      color: "bg-blue-600 hover:bg-blue-700 text-white",
    },
  ],
};

type TabType =
  | "overview"
  | "metrics"
  | "evidence"
  | "collaborators"
  | "check-ins"
  | "comments"
  | "activity";

export const KpiDictionaryDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { type, id } = useParams<{ type: string; id: string }>();
  const { canUpdateKpi, canAssignKpi } = usePermissions();
  const currentUser = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const strategicQuery = useStrategicKPIDetail(type === "strategic" ? id! : "");
  const operationalQuery = useOperationalKPIDetail(
    type === "operational" ? id! : "",
  );
  const awardQuery = useAwardKPIDetail(type === "award" ? id! : "");

  const queryMap = {
    strategic: strategicQuery,
    operational: operationalQuery,
    award: awardQuery,
  };
  const currentQuery =
    queryMap[type as keyof typeof queryMap] ?? strategicQuery;
  const { data, isLoading, error } = currentQuery;
  const kpi = data?.data as any;
  const status = kpi?.activation_status ?? "";

  // ── Engagement data ─────────────────────────────────
  const kpiType = type ?? "strategic";
  const kpiId = id ?? "";
  const { data: metrics } = useKpiMetrics(kpiType, kpiId);
  const { data: evidenceList } = useKpiEngagementEvidence(kpiType, kpiId);
  const { data: collaborators } = useKpiCollaborators(kpiType, kpiId);
  const [checkInPage, setCheckInPage] = useState(1);
  const { data: checkInData } = useKpiCheckIns(kpiType, kpiId, checkInPage);
  const [commentPage, setCommentPage] = useState(1);
  const { data: commentData } = useKpiComments(kpiType, kpiId, commentPage);
  const [activityPage, setActivityPage] = useState(1);
  const { data: activityData } = useKpiActivity(kpiType, kpiId, activityPage);

  const { data: usersData } = useQuery({
    queryKey: ["admin", "users", "all"],
    queryFn: () => userApi.list(1, 1000),
  });
  const users = (usersData as any)?.data ?? [];

  // ── Mutations ────────────────────────────────────────
  const [transitionModal, setTransitionModal] = useState<{
    open: boolean;
    action: string;
  }>({ open: false, action: "" });
  const [comment, setComment] = useState("");
  const transition = useKpiStatusTransition();

  const [showAddMetric, setShowAddMetric] = useState(false);
  const emptyMetricForm = {
    name: "",
    metric_type: "Numeric",
    unit: "",
    baseline_value: 0,
    target_value: 0,
    weight: 1,
    formula: "",
    start_date: "",
    due_date: "",
    attachment_title: "",
    attachment_file_url: "",
  };
  const [metricForm, setMetricForm] = useState(emptyMetricForm);
  const createMetric = useCreateKpiMetric(kpiType, kpiId);
  const updateMetricValue = useUpdateKpiMetricValue(kpiType, kpiId);
  const deleteMetric = useDeleteKpiMetric(kpiType, kpiId);
  const [metricValueDrafts, setMetricValueDrafts] = useState<
    Record<string, string>
  >({});

  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState({
    title: "",
    description: "",
    file_url: "",
  });
  const createEvidence = useCreateKpiEvidence(kpiType, kpiId);
  const deleteEvidence = useDeleteKpiEvidence(kpiType, kpiId);

  const [collabUserId, setCollabUserId] = useState("");
  const [collabRole, setCollabRole] =
    useState<KpiCollaboratorRole>("collaborator");
  const addCollaborator = useAddKpiCollaborator(kpiType, kpiId);
  const removeCollaborator = useRemoveKpiCollaborator(kpiType, kpiId);

  const [checkInStatus, setCheckInStatus] =
    useState<KpiCheckInStatus>("on_track");
  const [checkInContent, setCheckInContent] = useState("");
  const createCheckIn = useCreateKpiCheckIn(kpiType, kpiId);
  const deleteCheckIn = useDeleteKpiCheckIn(kpiType, kpiId);

  const [commentText, setCommentText] = useState("");
  const addComment = useAddKpiComment(kpiType, kpiId);
  const deleteComment = useDeleteKpiComment(kpiType, kpiId);

  const transitions = transitionConfig[status] ?? [];

  const handleTransition = async () => {
    if (!transitionModal.action) return;
    await transition.mutateAsync({
      type: type!,
      id: id!,
      action: transitionModal.action,
      comment: comment || undefined,
    });
    setTransitionModal({ open: false, action: "" });
    setComment("");
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleCreateMetric = async () => {
    if (!metricForm.name.trim() || !metricForm.target_value) {
      toast.error("Name and target value are required");
      return;
    }
    await createMetric.mutateAsync({
      ...metricForm,
      start_date: metricForm.start_date || undefined,
      due_date: metricForm.due_date || undefined,
      attachment_title: metricForm.attachment_title || undefined,
      attachment_file_url: metricForm.attachment_file_url || undefined,
    });
    setShowAddMetric(false);
    setMetricForm(emptyMetricForm);
  };

  const handleSaveMetricValue = async (metricId: string) => {
    const raw = metricValueDrafts[metricId];
    if (raw === undefined || raw === "") return;
    await updateMetricValue.mutateAsync({
      metricId,
      value: Number(raw),
    });
    setMetricValueDrafts((prev) => {
      const next = { ...prev };
      delete next[metricId];
      return next;
    });
  };

  const handleCreateEvidence = async () => {
    if (!evidenceForm.title.trim()) {
      toast.error("Title is required");
      return;
    }
    await createEvidence.mutateAsync(evidenceForm);
    setShowAddEvidence(false);
    setEvidenceForm({ title: "", description: "", file_url: "" });
  };

  const handleAddCollaborator = async () => {
    if (!collabUserId) {
      toast.error("Select a user");
      return;
    }
    await addCollaborator.mutateAsync({
      user_id: collabUserId,
      role: collabRole,
    });
    setCollabUserId("");
    setCollabRole("collaborator");
  };

  const handleCreateCheckIn = async () => {
    if (!checkInContent.trim()) {
      toast.error("Content is required");
      return;
    }
    await createCheckIn.mutateAsync({
      status: checkInStatus,
      content: checkInContent,
    });
    setCheckInContent("");
    setCheckInStatus("on_track");
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }
    await addComment.mutateAsync(commentText.trim());
    setCommentText("");
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (error || !kpi) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
          <AlertTriangle className="w-12 h-12 mb-4 text-red-400" />
          <p className="text-lg font-medium">{t("kpi.dictionary.notFound")}</p>
          <Link
            to="/goals/kpi/dictionary"
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {t("kpi.dictionary.backToDictionary")}
          </Link>
        </div>
      </div>
    );
  }

  // ── Info tiles (type-specific relations) ────────────
  const infoTiles: {
    icon: React.ReactNode;
    bg: string;
    label: string;
    value: string;
  }[] = [];

  if (kpi.goal) {
    infoTiles.push({
      icon: <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      bg: "bg-blue-50 dark:bg-blue-900/20",
      label: t("kpi.masterData.strategicGoal"),
      value: kpi.goal.title,
    });
  }
  if (kpi.owner_dept) {
    infoTiles.push({
      icon: (
        <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
      ),
      bg: "bg-purple-50 dark:bg-purple-900/20",
      label: t("kpi.masterData.department"),
      value: kpi.owner_dept.name,
    });
  }
  if (type === "strategic" && kpi.pillar) {
    infoTiles.push({
      icon: <Layers className="w-5 h-5 text-green-600 dark:text-green-400" />,
      bg: "bg-green-50 dark:bg-green-900/20",
      label: t("kpi.masterData.pillar"),
      value: kpi.pillar.name_en,
    });
  }
  if (type === "strategic" && kpi.domain) {
    infoTiles.push({
      icon: <Tag className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      bg: "bg-amber-50 dark:bg-amber-900/20",
      label: "Domain",
      value: kpi.domain.name_en,
    });
  }
  if (type === "operational" && kpi.process) {
    infoTiles.push({
      icon: (
        <GitBranch className="w-5 h-5 text-green-600 dark:text-green-400" />
      ),
      bg: "bg-green-50 dark:bg-green-900/20",
      label: t("kpi.masterData.processes"),
      value: kpi.process.name_en,
    });
  }
  if (type === "award" && kpi.award_sub_criterion) {
    infoTiles.push({
      icon: (
        <ClipboardCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
      ),
      bg: "bg-purple-50 dark:bg-purple-900/20",
      label: t("kpi.masterData.awardSubCriteria"),
      value: kpi.award_sub_criterion.name_en,
    });
  }
  if (kpi.reporting_frequency) {
    infoTiles.push({
      icon: <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-400" />,
      bg: "bg-slate-100 dark:bg-slate-700/40",
      label: t("kpi.dictionary.fieldFrequency"),
      value: kpi.reporting_frequency,
    });
  }

  const detailFields = [
    { label: t("kpi.dictionary.fieldBaseline"), value: String(kpi.baseline) },
    {
      label: t("kpi.dictionary.fieldUnitOfMeasure"),
      value: kpi.unit_of_measure,
    },
    { label: t("kpi.dictionary.fieldPolarity"), value: kpi.polarity },
    { label: t("kpi.dictionary.fieldDataSource"), value: kpi.data_source },
    ...(type === "strategic"
      ? [
          { label: t("kpi.dictionary.fieldLifecycle"), value: kpi.lifecycle },
          {
            label: t("kpi.dictionary.fieldSegmentation"),
            value: kpi.segmentation_axes,
          },
          {
            label: t("kpi.dictionary.fieldRelatedUnits"),
            value: kpi.related_units,
          },
        ]
      : []),
  ];

  const tabs: {
    key: TabType;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }[] = [
    {
      key: "overview",
      label: "Overview",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      key: "metrics",
      label: "Metrics",
      icon: <BarChart3 className="w-4 h-4" />,
      count: (metrics ?? []).length,
    },
    {
      key: "evidence",
      label: "Evidence",
      icon: <Paperclip className="w-4 h-4" />,
      count: (evidenceList ?? []).length,
    },
    {
      key: "collaborators",
      label: "Collaborators",
      icon: <Users className="w-4 h-4" />,
      count: (collaborators ?? []).length,
    },
    {
      key: "check-ins",
      label: "Check-ins",
      icon: <ClipboardCheck className="w-4 h-4" />,
      count: checkInData?.total ?? 0,
    },
    {
      key: "comments",
      label: "Comments",
      icon: <MessageSquare className="w-4 h-4" />,
      count: commentData?.total ?? 0,
    },
    {
      key: "activity",
      label: "Activity",
      icon: <History className="w-4 h-4" />,
      count: activityData?.total ?? 0,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Back Link ─────────────────────────────── */}
      <Link
        to="/goals/kpi/dictionary"
        className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 rtl:-rotate-180" />
        {t("kpi.dictionary.backToDictionary")}
      </Link>

      {/* ── Header ────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                  {kpi.code} - {kpi.name_en}
                </h1>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeColorMap[type ?? ""] ?? ""}`}
                >
                  {t(`kpi.dictionary.${type}`)}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColorMap[status] || ""}`}
                >
                  {status === "active" ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : status === "inactive" ? (
                    <XCircle className="w-3.5 h-3.5" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  {status}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("kpi.dictionary.detailSubtitle")}
              </p>
            </div>
          </div>

          {/* Status transitions + quick links */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              to={`/goals/kpi/targets?kpi_code=${encodeURIComponent(kpi.code)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Target className="w-4 h-4" />
              Targets
            </Link>
            {canUpdateKpi() && (
              <Link
                to={
                  type === "strategic"
                    ? `/goals/kpi/dictionary/${id}/edit`
                    : `/goals/kpi/dictionary/${type}/${id}/edit`
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </Link>
            )}
            {transitions.map((tr) => (
              <button
                key={tr.action}
                onClick={() =>
                  setTransitionModal({ open: true, action: tr.action })
                }
                disabled={transition.isPending}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${tr.color}`}
              >
                {tr.icon}
                {tr.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────── */}
      <div className="border-b border-slate-200 dark:border-slate-700/60">
        <nav
          className="flex gap-1 -mb-px overflow-x-auto"
          aria-label="KPI tabs"
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={`tabular-nums text-xs rounded-full px-1.5 min-w-[1.25rem] text-center ${
                    activeTab === tab.key
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Overview Tab ──────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Info Card */}
          {infoTiles.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {infoTiles.map((tile, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${tile.bg}`}
                    >
                      {tile.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {tile.label}
                      </p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {tile.value || "-"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t("kpi.dictionary.fieldDescriptionEn")} /{" "}
              {t("kpi.dictionary.fieldDescriptionAr")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                  {t("kpi.dictionary.fieldDescriptionEn")}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {kpi.description_en || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                  {t("kpi.dictionary.fieldDescriptionAr")}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {kpi.description_ar || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Formula */}
          {kpi.formula && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                {t("kpi.dictionary.fieldFormula")}
              </h2>
              <pre className="text-sm font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 rounded-lg p-4 whitespace-pre-wrap break-words">
                {kpi.formula}
              </pre>
            </div>
          )}

          {/* Details Grid */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {t("kpi.masterData.title")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
              {detailFields.map((field, i) => (
                <div key={i}>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    {field.label}
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {field.value || "-"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {kpi.notes && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                {t("kpi.dictionary.fieldNotes")}
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {kpi.notes}
              </p>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Timeline
            </h2>
            <div className="flex items-center gap-8 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Created {formatDate(kpi.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Updated {formatDate(kpi.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Metrics Tab ───────────────────────────── */}
      {activeTab === "metrics" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Metrics ({(metrics ?? []).length})
            </h2>
            {canUpdateKpi() && (
              <Button
                size="sm"
                onClick={() => setShowAddMetric(!showAddMetric)}
              >
                <Plus className="w-4 h-4 me-1" />
                Add Metric
              </Button>
            )}
          </div>

          {showAddMetric && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="Name *"
                  value={metricForm.name}
                  onChange={(e) =>
                    setMetricForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
                <Input
                  label="Unit"
                  value={metricForm.unit}
                  onChange={(e) =>
                    setMetricForm((p) => ({ ...p, unit: e.target.value }))
                  }
                />
                <Input
                  label="Baseline"
                  type="number"
                  value={metricForm.baseline_value}
                  onChange={(e) =>
                    setMetricForm((p) => ({
                      ...p,
                      baseline_value: Number(e.target.value),
                    }))
                  }
                />
                <Input
                  label="Target *"
                  type="number"
                  value={metricForm.target_value}
                  onChange={(e) =>
                    setMetricForm((p) => ({
                      ...p,
                      target_value: Number(e.target.value),
                    }))
                  }
                />
                <Input
                  label="Weight"
                  type="number"
                  step="0.1"
                  value={metricForm.weight}
                  onChange={(e) =>
                    setMetricForm((p) => ({
                      ...p,
                      weight: Number(e.target.value),
                    }))
                  }
                />
                <Input
                  label="Start Date"
                  type="date"
                  value={metricForm.start_date}
                  onChange={(e) =>
                    setMetricForm((p) => ({
                      ...p,
                      start_date: e.target.value,
                    }))
                  }
                />
                <Input
                  label="Due Date"
                  type="date"
                  value={metricForm.due_date}
                  onChange={(e) =>
                    setMetricForm((p) => ({ ...p, due_date: e.target.value }))
                  }
                />
              </div>
              <Textarea
                label="Formula (optional)"
                value={metricForm.formula}
                onChange={(e) =>
                  setMetricForm((p) => ({ ...p, formula: e.target.value }))
                }
                rows={2}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Attachment Title (optional)"
                  value={metricForm.attachment_title}
                  onChange={(e) =>
                    setMetricForm((p) => ({
                      ...p,
                      attachment_title: e.target.value,
                    }))
                  }
                  placeholder="e.g. Baseline Survey"
                />
                <Input
                  label="Attachment URL (optional)"
                  value={metricForm.attachment_file_url}
                  onChange={(e) =>
                    setMetricForm((p) => ({
                      ...p,
                      attachment_file_url: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Attachments also appear under the Evidence tab.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAddMetric(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateMetric}
                  disabled={createMetric.isPending}
                >
                  {createMetric.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          )}

          {(metrics ?? []).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(metrics ?? []).map((m) => {
                const progress =
                  m.target_value !== 0
                    ? Math.min(
                        100,
                        Math.round((m.current_value / m.target_value) * 100),
                      )
                    : 0;
                return (
                  <div
                    key={m.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {m.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {m.metric_type} · weight {m.weight}
                        </p>
                      </div>
                      {canUpdateKpi() && (
                        <button
                          onClick={() => deleteMetric.mutate(m.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      <span>Baseline: {m.baseline_value}</span>
                      <span>Current: {m.current_value}</span>
                      <span>Target: {m.target_value}</span>
                      {m.unit && <span>{m.unit}</span>}
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {m.formula && (
                      <p className="mt-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                        {m.formula}
                      </p>
                    )}
                    {(m.start_date || m.due_date) && (
                      <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                        {m.start_date && (
                          <span>Start: {formatDate(m.start_date)}</span>
                        )}
                        {m.due_date && (
                          <span>Due: {formatDate(m.due_date)}</span>
                        )}
                      </div>
                    )}
                    {canUpdateKpi() && (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Update value..."
                          value={metricValueDrafts[m.id] ?? ""}
                          onChange={(e) =>
                            setMetricValueDrafts((prev) => ({
                              ...prev,
                              [m.id]: e.target.value,
                            }))
                          }
                          className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSaveMetricValue(m.id)}
                          disabled={updateMetricValue.isPending}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-12 text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No metrics yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Evidence Tab ──────────────────────────── */}
      {activeTab === "evidence" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Evidence ({(evidenceList ?? []).length})
            </h2>
            {canUpdateKpi() && (
              <Button
                size="sm"
                onClick={() => setShowAddEvidence(!showAddEvidence)}
              >
                <Plus className="w-4 h-4 me-1" />
                Add Evidence
              </Button>
            )}
          </div>

          {showAddEvidence && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6 space-y-4">
              <Input
                label="Title *"
                value={evidenceForm.title}
                onChange={(e) =>
                  setEvidenceForm((p) => ({ ...p, title: e.target.value }))
                }
              />
              <Textarea
                label="Description"
                value={evidenceForm.description}
                onChange={(e) =>
                  setEvidenceForm((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
              <Input
                label="File URL"
                value={evidenceForm.file_url}
                onChange={(e) =>
                  setEvidenceForm((p) => ({
                    ...p,
                    file_url: e.target.value,
                  }))
                }
                placeholder="https://..."
              />
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAddEvidence(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateEvidence}
                  disabled={createEvidence.isPending}
                >
                  {createEvidence.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}

          {(evidenceList ?? []).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(evidenceList ?? []).map((e) => (
                <div
                  key={e.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {e.title}
                    </p>
                    {canUpdateKpi() && (
                      <button
                        onClick={() => deleteEvidence.mutate(e.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {e.description && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                      {e.description}
                    </p>
                  )}
                  {e.file_url && (
                    <a
                      href={e.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <Paperclip className="w-3 h-3" />
                      {e.file_url}
                    </a>
                  )}
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    {e.uploaded_by
                      ? `${e.uploaded_by.first_name} ${e.uploaded_by.last_name}`
                      : ""}{" "}
                    · {formatDate(e.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-12 text-center">
              <Paperclip className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No evidence yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Collaborators Tab ─────────────────────── */}
      {activeTab === "collaborators" && (
        <div className="space-y-6">
          {canAssignKpi() && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Add Collaborator
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <Select
                  label="User"
                  value={collabUserId}
                  onChange={(v) => setCollabUserId(v.target.value)}
                  options={users.map((u: any) => ({
                    value: u.id,
                    label: `${u.first_name} ${u.last_name} (${u.email})`,
                  }))}
                  placeholder="Select a user"
                />
                <Select
                  label="Role"
                  value={collabRole}
                  onChange={(v) =>
                    setCollabRole(v.target.value as KpiCollaboratorRole)
                  }
                  options={[
                    { value: "collaborator", label: "Collaborator" },
                    { value: "reviewer", label: "Reviewer" },
                  ]}
                />
                <Button
                  onClick={handleAddCollaborator}
                  disabled={addCollaborator.isPending}
                >
                  <Plus className="w-4 h-4 me-1" />
                  Add
                </Button>
              </div>
            </div>
          )}

          {(collaborators ?? []).length > 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 divide-y divide-slate-100 dark:divide-slate-700/30">
              {(collaborators ?? []).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {c.user
                          ? `${c.user.first_name} ${c.user.last_name}`
                          : c.user_id}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {c.user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300 capitalize">
                      {c.role}
                    </span>
                    {canAssignKpi() && (
                      <button
                        onClick={() => removeCollaborator.mutate(c.user_id)}
                        className="p-1 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No collaborators yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Check-ins Tab ─────────────────────────── */}
      {activeTab === "check-ins" && (
        <div className="space-y-6">
          {canUpdateKpi() && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-1">
                  <Select
                    label="Status"
                    value={checkInStatus}
                    onChange={(v) =>
                      setCheckInStatus(v.target.value as KpiCheckInStatus)
                    }
                    options={[
                      { value: "on_track", label: "On Track" },
                      { value: "at_risk", label: "At Risk" },
                      { value: "behind", label: "Behind" },
                      { value: "blocked", label: "Blocked" },
                    ]}
                  />
                </div>
                <div className="sm:col-span-3">
                  <Textarea
                    label="Update"
                    value={checkInContent}
                    onChange={(e) => setCheckInContent(e.target.value)}
                    rows={2}
                    placeholder="What's the status of this KPI?"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleCreateCheckIn}
                  disabled={createCheckIn.isPending}
                >
                  <Send className="w-4 h-4 me-1" />
                  {createCheckIn.isPending ? "Posting..." : "Post Check-in"}
                </Button>
              </div>
            </div>
          )}

          {(checkInData?.data ?? []).length > 0 ? (
            <div className="space-y-4">
              {(checkInData?.data ?? []).map((ci) => (
                <div
                  key={ci.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${checkInStatusColorMap[ci.status] ?? ""}`}
                      >
                        {ci.status.replace("_", " ")}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {ci.author
                          ? `${ci.author.first_name} ${ci.author.last_name}`
                          : ""}{" "}
                        · {formatDate(ci.created_at)}
                      </span>
                    </div>
                    {canUpdateKpi() && (
                      <button
                        onClick={() => {
                          if (window.confirm("Delete this check-in?")) {
                            deleteCheckIn.mutate(ci.id);
                          }
                        }}
                        className="p-1 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {ci.content}
                  </p>
                </div>
              ))}

              {checkInData && checkInData.total > 10 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setCheckInPage((p) => Math.max(1, p - 1))}
                    disabled={checkInPage <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {t("common.previous")}
                  </button>
                  <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                    Page {checkInPage} of {Math.ceil(checkInData.total / 10)}
                  </span>
                  <button
                    onClick={() => setCheckInPage((p) => p + 1)}
                    disabled={checkInPage >= Math.ceil(checkInData.total / 10)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {t("common.next")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-12 text-center">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No check-ins yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Comments Tab ──────────────────────────── */}
      {activeTab === "comments" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Add a Comment
            </h2>
            <div className="space-y-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleAddComment}
                  disabled={addComment.isPending || !commentText.trim()}
                >
                  <Send className="w-4 h-4 me-1" />
                  {addComment.isPending ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </div>

          {(commentData?.data ?? []).length > 0 ? (
            <div className="space-y-4">
              {(commentData?.data ?? []).map((c) => {
                const authorName = c.author
                  ? `${c.author.first_name} ${c.author.last_name}`.trim()
                  : "Unknown";
                const initial = authorName.charAt(0).toUpperCase();
                const isOwn = c.author_id === currentUser?.id;
                const relativeTime = formatDateTime(c.created_at);
                return (
                  <div
                    key={c.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {initial}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {authorName}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {relativeTime}
                            </span>
                          </div>
                          {isOwn && (
                            <button
                              onClick={() => {
                                if (window.confirm("Delete this comment?")) {
                                  deleteComment.mutate(c.id);
                                }
                              }}
                              className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                          {c.content}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {commentData && commentData.total > 20 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setCommentPage((p) => Math.max(1, p - 1))}
                    disabled={commentPage <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {t("common.previous")}
                  </button>
                  <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                    Page {commentPage} of {Math.ceil(commentData.total / 20)}
                  </span>
                  <button
                    onClick={() => setCommentPage((p) => p + 1)}
                    disabled={commentPage >= Math.ceil(commentData.total / 20)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {t("common.next")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No comments yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Activity Tab ──────────────────────────── */}
      {activeTab === "activity" && (
        <div className="space-y-6">
          {(activityData?.data ?? []).length > 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                Activity
              </h2>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700/60" />
                <div className="space-y-6">
                  {(activityData?.data ?? []).map((entry) => {
                    const colorClass =
                      activityActionColors[entry.action?.toLowerCase()] ??
                      activityActionColors.view;
                    const userName = entry.user
                      ? `${entry.user.first_name} ${entry.user.last_name}`.trim()
                      : "System";
                    return (
                      <div key={entry.id} className="relative pl-10">
                        <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 bg-slate-400 dark:bg-slate-500 z-10" />
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${colorClass}`}
                          >
                            {entry.action}
                          </span>
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {entry.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {userName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(entry.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {activityData && activityData.total > 20 && (
                <div className="flex items-center justify-center gap-2 pt-6 mt-6 border-t border-slate-200 dark:border-slate-700/60">
                  <button
                    onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                    disabled={activityPage <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {t("common.previous")}
                  </button>
                  <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                    Page {activityPage} of {Math.ceil(activityData.total / 20)}
                  </span>
                  <button
                    onClick={() => setActivityPage((p) => p + 1)}
                    disabled={
                      activityPage >= Math.ceil(activityData.total / 20)
                    }
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {t("common.next")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-12 text-center">
              <History className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No activity yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Transition Modal ──────────────────────── */}
      <Modal
        isOpen={transitionModal.open}
        onClose={() => setTransitionModal({ open: false, action: "" })}
      >
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {transitionModal.action === "activate"
              ? "Activate KPI"
              : transitionModal.action === "deactivate"
                ? "Deactivate KPI"
                : "Reactivate KPI"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {transitionModal.action === "activate"
              ? "This will activate the KPI and make it available for use."
              : transitionModal.action === "deactivate"
                ? "This will deactivate the KPI."
                : "This will reactivate the KPI."}
          </p>
          <Input
            label="Comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setTransitionModal({ open: false, action: "" })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransition}
              disabled={transition.isPending}
              className={
                transitionModal.action === "activate"
                  ? "bg-green-600 hover:bg-green-700"
                  : transitionModal.action === "deactivate"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
              }
            >
              {transition.isPending ? "Updating..." : "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
