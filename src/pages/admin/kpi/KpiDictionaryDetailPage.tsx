import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  ChevronDown,
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
  Download,
  List,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import {
  useStrategicKPIDetail,
  useOperationalKPIDetail,
  useAwardKPIDetail,
  useKpiStatusTransition,
  useKpiMetrics,
  useCreateKpiMetric,
  useDeleteKpiMetric,
  useKpiEngagementEvidence,
  useCreateKpiEvidence,
  useKpiCollaborators,
  useKpiCheckIns,
  useCreateKpiCheckIn,
  useDeleteKpiCheckIn,
  useKpiComments,
  useAddKpiComment,
  useDeleteKpiComment,
  useKpiActivity,
  useKpiTargets,
  useUploadKpiAttachment,
  useDownloadKpiEvidence,
} from "../../../hooks/useKpi";
import { usePermissions } from "../../../hooks/usePermissions";
import { useAuthStore } from "../../../stores/authStore";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { Input, Select, Textarea } from "../../../components/ui/Input";
import { AddEntryModal } from "../../../components/kpi/AddEntryModal";
import { ViewEntriesModal } from "../../../components/kpi/ViewEntriesModal";
import { CollaboratorsTab } from "../../../components/kpi/CollaboratorsTab";
import type {
  KpiCheckInStatus,
  KpiEvidenceType,
  KpiCalculationType,
  KpiDirection,
  KpiAggregationMethod,
} from "../../../types/kpi";

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
  add: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  remove: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  approve:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  reject: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  submit: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  target_set:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  entry_create:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

const moduleLabelMap: Record<string, string> = {
  target: "Target",
  entry: "Entry",
  evidence: "Evidence",
  collaborator: "Collaborator",
  metric: "Metric",
  kpi: "KPI",
  check_in: "Check-in",
  comment: "Comment",
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

  // Latest annual target already set for this KPI (list is year DESC) — reused
  // to auto-fill a new metric's target instead of asking for it again.
  const { data: kpiTargets } = useKpiTargets(
    kpi?.code ? { kpi_code: kpi.code } : undefined,
  );
  const latestKpiTargetValue = kpiTargets?.[0]?.target_value;

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
    metric_code: "",
    metric_description: "",
    metric_status: "Active",
    display_order: 0,
    metric_type: "Numeric",
    unit: "",
    custom_unit_label: "",
    baseline_value: 0,
    target_value: 0,
    weight: 1,
    formula: "",
    calculation_type: "Direct Value",
    direction: "Higher is Better",
    decimal_precision: 2,
    aggregation_method: "Sum",
    reporting_frequency: "",
    numerator_label: "",
    numerator_variable_code: "",
    denominator_label: "",
    denominator_variable_code: "",
    direct_actual_label: "",
    allow_manual_actual_override: false,
    advanced_formula_enabled: false,
    formula_code: "",
    divide_by_zero_handling: "Block Submission",
    rounding_rule: "Standard Round",
    calculation_trace_required: true,
    metric_owner_id: "",
    data_source: "",
    evidence_required: false,
    start_date: "",
    due_date: "",
  };
  const [metricForm, setMetricForm] = useState(emptyMetricForm);
  const [metricAttachmentFile, setMetricAttachmentFile] = useState<File | null>(
    null,
  );
  const [metricEvidenceTitle, setMetricEvidenceTitle] = useState("");
  const [metricEvidenceType, setMetricEvidenceType] =
    useState<KpiEvidenceType>("Report");
  const [metricEvidenceComment, setMetricEvidenceComment] = useState("");
  const createMetric = useCreateKpiMetric(kpiType, kpiId);
  const uploadAttachment = useUploadKpiAttachment(kpiType, kpiId);
  const createEvidence = useCreateKpiEvidence(kpiType, kpiId);
  const downloadEvidence = useDownloadKpiEvidence();
  const deleteMetric = useDeleteKpiMetric(kpiType, kpiId);

  const [checkInStatus, setCheckInStatus] =
    useState<KpiCheckInStatus>("on_track");
  const [checkInContent, setCheckInContent] = useState("");
  const createCheckIn = useCreateKpiCheckIn(kpiType, kpiId);
  const deleteCheckIn = useDeleteKpiCheckIn(kpiType, kpiId);

  const [commentText, setCommentText] = useState("");
  const addComment = useAddKpiComment(kpiType, kpiId);
  const deleteComment = useDeleteKpiComment(kpiType, kpiId);

  const [entryMetric, setEntryMetric] = useState<any>(null);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showViewEntries, setShowViewEntries] = useState(false);
  const [showAllEntries, setShowAllEntries] = useState(false);

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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  const resetMetricAttachment = () => {
    setMetricAttachmentFile(null);
    setMetricEvidenceTitle("");
    setMetricEvidenceType("Report");
    setMetricEvidenceComment("");
  };

  const handleCreateMetric = async () => {
    if (!metricForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!metricForm.target_value) {
      toast.error("Target value is required and must be greater than 0");
      return;
    }
    if (metricAttachmentFile) {
      if (!metricEvidenceTitle.trim() || !metricEvidenceComment.trim()) {
        toast.error(
          "Evidence title and comment are required when attaching a file",
        );
        return;
      }
    }

    const created = await createMetric.mutateAsync({
      ...metricForm,
      calculation_type: metricForm.calculation_type as KpiCalculationType,
      direction: metricForm.direction as KpiDirection,
      aggregation_method: metricForm.aggregation_method as KpiAggregationMethod,
      start_date: metricForm.start_date
        ? `${metricForm.start_date}T00:00:00Z`
        : undefined,
      due_date: metricForm.due_date
        ? `${metricForm.due_date}T00:00:00Z`
        : undefined,
    });

    if (metricAttachmentFile && created.data) {
      const uploaded = await uploadAttachment.mutateAsync(metricAttachmentFile);
      if (uploaded.data) {
        await createEvidence.mutateAsync({
          title: metricEvidenceTitle.trim(),
          evidence_type: metricEvidenceType,
          description: metricEvidenceComment.trim(),
          metric_id: created.data.id,
          file_url: uploaded.data.file_url,
          file_name: uploaded.data.file_name,
          file_size: uploaded.data.file_size,
          mime_type: uploaded.data.mime_type,
        });
      }
    }

    setShowAddMetric(false);
    setMetricForm(emptyMetricForm);
    resetMetricAttachment();
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
            <button
              onClick={() => setShowAllEntries(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <List className="w-4 h-4" />
              Entries
            </button>
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
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  if (!showAddMetric && latestKpiTargetValue !== undefined) {
                    setMetricForm((p) => ({
                      ...p,
                      target_value: latestKpiTargetValue,
                    }));
                  }
                  setShowAddMetric(!showAddMetric);
                }}
              >
                Add Metric
              </Button>
            )}
          </div>

          {showAddMetric && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="Name *"
                  value={metricForm.name}
                  onChange={(e) =>
                    setMetricForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
                <Input
                  label="Metric Code"
                  value={metricForm.metric_code}
                  onChange={(e) =>
                    setMetricForm((p) => ({
                      ...p,
                      metric_code: e.target.value,
                    }))
                  }
                  placeholder="e.g. MET-CLEAN-EXEC"
                />
                <Select
                  label="Metric Type"
                  value={metricForm.metric_type}
                  onChange={(e) =>
                    setMetricForm((p) => ({
                      ...p,
                      metric_type: e.target.value,
                    }))
                  }
                  options={[
                    { value: "Numeric", label: "Numeric" },
                    { value: "Percentage", label: "Percentage" },
                    { value: "Currency", label: "Currency" },
                    { value: "Text", label: "Text" },
                  ]}
                />
                <Select
                  label="Status"
                  value={metricForm.metric_status}
                  onChange={(e) =>
                    setMetricForm((p) => ({
                      ...p,
                      metric_status: e.target.value,
                    }))
                  }
                  options={[
                    { value: "Draft", label: "Draft" },
                    { value: "Active", label: "Active" },
                    { value: "Inactive", label: "Inactive" },
                    { value: "Archived", label: "Archived" },
                  ]}
                />
                <Input
                  label="Display Order"
                  type="number"
                  value={metricForm.display_order}
                  onChange={(e) =>
                    setMetricForm((p) => ({
                      ...p,
                      display_order: Number(e.target.value),
                    }))
                  }
                />
                <Input
                  label="Unit"
                  value={metricForm.unit}
                  onChange={(e) =>
                    setMetricForm((p) => ({ ...p, unit: e.target.value }))
                  }
                />
                {metricForm.unit === "Custom" && (
                  <Input
                    label="Custom Unit Label"
                    value={metricForm.custom_unit_label}
                    onChange={(e) =>
                      setMetricForm((p) => ({
                        ...p,
                        custom_unit_label: e.target.value,
                      }))
                    }
                    placeholder="e.g. Inspection Points"
                  />
                )}
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
                <div>
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
                  {latestKpiTargetValue !== undefined && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Auto-filled from this KPI's current target (
                      {latestKpiTargetValue}). Adjust if this metric tracks a
                      different value.
                    </p>
                  )}
                </div>
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
                    setMetricForm((p) => ({ ...p, start_date: e.target.value }))
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
                label="Metric Description"
                value={metricForm.metric_description}
                onChange={(e) =>
                  setMetricForm((p) => ({
                    ...p,
                    metric_description: e.target.value,
                  }))
                }
                rows={2}
                placeholder="Define exactly what is measured and the business scope..."
              />

              <details className="group rounded-lg border border-slate-200 dark:border-slate-700/60">
                <summary className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-lg transition-colors">
                  <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                  Measurement Configuration
                </summary>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700/60 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Select
                      label="Calculation Type *"
                      value={metricForm.calculation_type}
                      onChange={(e) =>
                        setMetricForm((p) => ({
                          ...p,
                          calculation_type: e.target.value,
                        }))
                      }
                      options={[
                        { value: "Direct Value", label: "Direct Value" },
                        {
                          value: "Percentage - Ratio",
                          label: "Percentage - Ratio",
                        },
                        { value: "Ratio", label: "Ratio" },
                        { value: "Average", label: "Average" },
                        { value: "Sum", label: "Sum" },
                        { value: "Difference", label: "Difference" },
                        {
                          value: "Weighted Average",
                          label: "Weighted Average",
                        },
                        { value: "Formula", label: "Formula (Phase 2)" },
                      ]}
                    />
                    <Select
                      label="Direction *"
                      value={metricForm.direction}
                      onChange={(e) =>
                        setMetricForm((p) => ({
                          ...p,
                          direction: e.target.value,
                        }))
                      }
                      options={[
                        {
                          value: "Higher is Better",
                          label: "Higher is Better",
                        },
                        { value: "Lower is Better", label: "Lower is Better" },
                        { value: "Target Range", label: "Target Range" },
                        { value: "Exact Target", label: "Exact Target" },
                        { value: "Informational", label: "Informational" },
                      ]}
                    />
                    <Select
                      label="Unit"
                      value={metricForm.unit}
                      onChange={(e) =>
                        setMetricForm((p) => ({ ...p, unit: e.target.value }))
                      }
                      options={[
                        { value: "%", label: "%" },
                        { value: "Number", label: "Number" },
                        { value: "Seconds", label: "Seconds" },
                        { value: "Minutes", label: "Minutes" },
                        { value: "Hours", label: "Hours" },
                        { value: "Days", label: "Days" },
                        { value: "SAR", label: "SAR" },
                        { value: "Employees", label: "Employees" },
                        { value: "Requests", label: "Requests" },
                        { value: "Complaints", label: "Complaints" },
                        { value: "Tasks", label: "Tasks" },
                        { value: "Kilometers", label: "Kilometers" },
                        { value: "Square Meters", label: "Square Meters" },
                        { value: "Score", label: "Score" },
                        { value: "Custom", label: "Custom" },
                      ]}
                    />
                    <Select
                      label="Decimal Precision"
                      value={metricForm.decimal_precision}
                      onChange={(e) =>
                        setMetricForm((p) => ({
                          ...p,
                          decimal_precision: Number(e.target.value),
                        }))
                      }
                      options={[
                        { value: "0", label: "0" },
                        { value: "1", label: "1" },
                        { value: "2", label: "2" },
                        { value: "3", label: "3" },
                        { value: "4", label: "4" },
                      ]}
                    />
                    <Select
                      label="Aggregation Method *"
                      value={metricForm.aggregation_method}
                      onChange={(e) =>
                        setMetricForm((p) => ({
                          ...p,
                          aggregation_method: e.target.value,
                        }))
                      }
                      options={[
                        { value: "Sum", label: "Sum" },
                        { value: "Average", label: "Average" },
                        {
                          value: "Latest Approved Value",
                          label: "Latest Approved Value",
                        },
                        { value: "Minimum", label: "Minimum" },
                        { value: "Maximum", label: "Maximum" },
                        {
                          value: "Weighted Average",
                          label: "Weighted Average",
                        },
                        { value: "No Aggregation", label: "No Aggregation" },
                      ]}
                    />
                    <Select
                      label="Reporting Frequency"
                      value={metricForm.reporting_frequency}
                      onChange={(e) =>
                        setMetricForm((p) => ({
                          ...p,
                          reporting_frequency: e.target.value,
                        }))
                      }
                      options={[
                        { value: "", label: "Inherit from KPI" },
                        { value: "Monthly", label: "Monthly" },
                        { value: "Quarterly", label: "Quarterly" },
                        { value: "Semiannual", label: "Semiannual" },
                        { value: "Annual", label: "Annual" },
                        { value: "Ad Hoc", label: "Ad Hoc" },
                      ]}
                    />
                  </div>
                </div>
              </details>

              {(metricForm.calculation_type === "Percentage - Ratio" ||
                metricForm.calculation_type === "Ratio") && (
                <details className="group rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <summary className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-lg transition-colors">
                    <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                    Input Definition — Ratio
                  </summary>
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700/60 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Numerator Label"
                        value={metricForm.numerator_label}
                        onChange={(e) =>
                          setMetricForm((p) => ({
                            ...p,
                            numerator_label: e.target.value,
                          }))
                        }
                        placeholder="e.g. Completed tasks"
                      />
                      <Input
                        label="Numerator Variable Code"
                        value={metricForm.numerator_variable_code}
                        onChange={(e) =>
                          setMetricForm((p) => ({
                            ...p,
                            numerator_variable_code: e.target.value,
                          }))
                        }
                        placeholder="e.g. NUM_COMPLETED_TASKS"
                      />
                      <Input
                        label="Denominator Label"
                        value={metricForm.denominator_label}
                        onChange={(e) =>
                          setMetricForm((p) => ({
                            ...p,
                            denominator_label: e.target.value,
                          }))
                        }
                        placeholder="e.g. Planned tasks"
                      />
                      <Input
                        label="Denominator Variable Code"
                        value={metricForm.denominator_variable_code}
                        onChange={(e) =>
                          setMetricForm((p) => ({
                            ...p,
                            denominator_variable_code: e.target.value,
                          }))
                        }
                        placeholder="e.g. DEN_PLANNED_TASKS"
                      />
                    </div>
                  </div>
                </details>
              )}

              {metricForm.calculation_type === "Direct Value" && (
                <Input
                  label="Direct Actual Label"
                  value={metricForm.direct_actual_label}
                  onChange={(e) =>
                    setMetricForm((p) => ({
                      ...p,
                      direct_actual_label: e.target.value,
                    }))
                  }
                  placeholder="e.g. Average response time"
                />
              )}

              <details className="group rounded-lg border border-slate-200 dark:border-slate-700/60">
                <summary className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-lg transition-colors">
                  <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                  Formula Readiness (Phase 2)
                </summary>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700/60 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={metricForm.advanced_formula_enabled}
                        onChange={(e) =>
                          setMetricForm((p) => ({
                            ...p,
                            advanced_formula_enabled: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Advanced Formula Enabled
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={metricForm.calculation_trace_required}
                        onChange={(e) =>
                          setMetricForm((p) => ({
                            ...p,
                            calculation_trace_required: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Calculation Trace Required
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={metricForm.allow_manual_actual_override}
                        onChange={(e) =>
                          setMetricForm((p) => ({
                            ...p,
                            allow_manual_actual_override: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Allow Manual Override
                    </label>
                    <Input
                      label="Formula Code"
                      value={metricForm.formula_code}
                      onChange={(e) =>
                        setMetricForm((p) => ({
                          ...p,
                          formula_code: e.target.value,
                        }))
                      }
                      placeholder="e.g. FORM-CLEAN-001"
                    />
                    <Select
                      label="Divide by Zero Handling"
                      value={metricForm.divide_by_zero_handling}
                      onChange={(e) =>
                        setMetricForm((p) => ({
                          ...p,
                          divide_by_zero_handling: e.target.value,
                        }))
                      }
                      options={[
                        {
                          value: "Block Submission",
                          label: "Block Submission",
                        },
                        { value: "Return Null", label: "Return Null" },
                        { value: "Return Zero", label: "Return Zero" },
                        {
                          value: "Require Exception Approval",
                          label: "Require Exception Approval",
                        },
                      ]}
                    />
                    <Select
                      label="Rounding Rule"
                      value={metricForm.rounding_rule}
                      onChange={(e) =>
                        setMetricForm((p) => ({
                          ...p,
                          rounding_rule: e.target.value,
                        }))
                      }
                      options={[
                        { value: "Standard Round", label: "Standard Round" },
                        { value: "Round Up", label: "Round Up" },
                        { value: "Round Down", label: "Round Down" },
                        { value: "No Rounding", label: "No Rounding" },
                      ]}
                    />
                    <Textarea
                      label="Formula (optional)"
                      value={metricForm.formula}
                      onChange={(e) =>
                        setMetricForm((p) => ({
                          ...p,
                          formula: e.target.value,
                        }))
                      }
                      rows={2}
                      placeholder="e.g. (A / B) * 100"
                    />
                  </div>
                </div>
              </details>

              <details className="group rounded-lg border border-slate-200 dark:border-slate-700/60">
                <summary className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-lg transition-colors">
                  <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                  Governance
                </summary>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700/60 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Input
                      label="Metric Owner ID"
                      value={metricForm.metric_owner_id}
                      onChange={(e) =>
                        setMetricForm((p) => ({
                          ...p,
                          metric_owner_id: e.target.value,
                        }))
                      }
                      placeholder="User UUID"
                    />
                    <Input
                      label="Data Source"
                      value={metricForm.data_source}
                      onChange={(e) =>
                        setMetricForm((p) => ({
                          ...p,
                          data_source: e.target.value,
                        }))
                      }
                      placeholder="e.g. EcoCycle, Manual Entry"
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 pt-6">
                      <input
                        type="checkbox"
                        checked={metricForm.evidence_required}
                        onChange={(e) =>
                          setMetricForm((p) => ({
                            ...p,
                            evidence_required: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Evidence Required
                    </label>
                  </div>
                </div>
              </details>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddMetric(false);
                    resetMetricAttachment();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateMetric}
                  disabled={
                    createMetric.isPending || uploadAttachment.isPending
                  }
                >
                  {uploadAttachment.isPending
                    ? "Uploading..."
                    : createMetric.isPending
                      ? "Creating..."
                      : "Create"}
                </Button>
              </div>
            </div>
          )}

          {(metrics ?? []).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(metrics ?? []).map((m) => {
                const polarity = kpi?.polarity ?? "ascending";
                const targetVal = m.target_value || 1;
                const rawAchievement = (m.current_value / targetVal) * 100;
                const achievement = Math.min(
                  100,
                  Math.max(
                    0,
                    polarity === "descending"
                      ? 100 - rawAchievement
                      : rawAchievement,
                  ),
                );
                const progressColor =
                  achievement >= 80
                    ? "bg-green-500"
                    : achievement >= 50
                      ? "bg-amber-500"
                      : "bg-red-500";
                return (
                  <div
                    key={m.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {m.name}
                          </p>
                          {m.metric_status && m.metric_status !== "Active" && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                                m.metric_status === "Draft"
                                  ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                  : m.metric_status === "Inactive"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : m.metric_status === "Archived"
                                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              }`}
                            >
                              {m.metric_status}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {m.metric_type} · weight {m.weight} ·{" "}
                          {m.custom_unit_label || m.unit || "Number"}
                        </p>
                        {m.metric_code && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                            {m.metric_code}
                          </p>
                        )}
                      </div>
                      {canUpdateKpi() && (
                        <button
                          onClick={() => deleteMetric.mutate(m.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {m.metric_description && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {m.metric_description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.calculation_type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30">
                          {m.calculation_type}
                        </span>
                      )}
                      {m.direction && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 border border-purple-100 dark:border-purple-800/30">
                          {m.direction}
                        </span>
                      )}
                      {m.aggregation_method && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400 border border-teal-100 dark:border-teal-800/30">
                          {m.aggregation_method}
                        </span>
                      )}
                      {m.decimal_precision !== undefined &&
                        m.decimal_precision > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                            {m.decimal_precision} decimals
                          </span>
                        )}
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      <span>Baseline: {m.baseline_value}</span>
                      <span>Current: {m.current_value}</span>
                      <span>Target: {m.target_value}</span>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                        <span>{Math.round(achievement)}%</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {polarity === "descending"
                            ? "↓ Descending"
                            : "↑ Ascending"}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full ${progressColor} rounded-full transition-all duration-500`}
                          style={{ width: `${achievement}%` }}
                        />
                      </div>
                    </div>
                    {m.calculation_type === "Formula" && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-md px-2 py-1">
                        <HelpCircle className="w-3 h-3 shrink-0" />
                        <span className="italic">
                          Formula (Phase 2) — Not available yet
                        </span>
                      </div>
                    )}
                    {m.formula_code && (
                      <div className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        Formula code: {m.formula_code}
                      </div>
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
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                      {m.data_source && <span>Source: {m.data_source}</span>}
                      {m.evidence_required && (
                        <span className="text-amber-600 dark:text-amber-400">
                          Evidence required
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                        disabled={
                          m.metric_status === "Inactive" ||
                          m.metric_status === "Archived"
                        }
                        onClick={() => {
                          setEntryMetric(m);
                          setShowAddEntry(true);
                        }}
                      >
                        Add Entry
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setEntryMetric(m);
                          setShowViewEntries(true);
                        }}
                      >
                        View Entries
                      </Button>
                    </div>
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
              Evidence Summaries ({(evidenceList ?? []).length})
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Evidence is attached to Entries. Click a row to view the related
              Entry.
            </p>
          </div>

          {(evidenceList ?? []).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(evidenceList ?? []).map((e) => (
                <div
                  key={e.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer"
                  onClick={() => {
                    if (e.metric) {
                      setEntryMetric(e.metric);
                      setShowViewEntries(true);
                    }
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {e.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                          {e.evidence_type}
                        </span>
                        {e.metric && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            {e.metric.name}
                          </span>
                        )}
                      </div>
                      {e.description && (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                          {e.description}
                        </p>
                      )}
                      {e.file_name ? (
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            downloadEvidence.mutate({
                              evidenceId: e.id,
                              fileName: e.file_name!,
                            });
                          }}
                          disabled={downloadEvidence.isPending}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-50"
                        >
                          <Download className="w-3 h-3" />
                          {e.file_name}
                          {e.file_size !== undefined && (
                            <span className="text-slate-400">
                              ({formatFileSize(e.file_size)})
                            </span>
                          )}
                        </button>
                      ) : (
                        e.file_url && (
                          <a
                            href={e.file_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(ev) => ev.stopPropagation()}
                            className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            <Paperclip className="w-3 h-3" />
                            {e.file_url}
                          </a>
                        )
                      )}
                      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                        {e.uploaded_by
                          ? `${e.uploaded_by.first_name} ${e.uploaded_by.last_name}`
                          : ""}{" "}
                        · {formatDate(e.created_at)}
                      </p>
                    </div>
                    {e.metric && (
                      <ExternalLink className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                    )}
                  </div>
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
        <CollaboratorsTab
          type={type ?? ""}
          id={id ?? ""}
          canAssign={canAssignKpi()}
        />
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
                  leftIcon={<Send className="w-4 h-4" />}
                  onClick={handleCreateCheckIn}
                  disabled={createCheckIn.isPending}
                >
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
                  leftIcon={<Send className="w-4 h-4" />}
                  onClick={handleAddComment}
                  disabled={addComment.isPending || !commentText.trim()}
                >
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
                    const actionKey = entry.action?.toLowerCase();
                    const colorClass =
                      activityActionColors[actionKey] ??
                      activityActionColors.view;
                    const userName = entry.user
                      ? `${entry.user.first_name} ${entry.user.last_name}`.trim()
                      : "System";
                    const moduleLabel =
                      moduleLabelMap[entry.module?.toLowerCase()] ??
                      entry.module;
                    return (
                      <div key={entry.id} className="relative pl-10">
                        <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 bg-slate-400 dark:bg-slate-500 z-10" />
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${colorClass}`}
                          >
                            {entry.action}
                          </span>
                          {moduleLabel && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                              {moduleLabel}
                            </span>
                          )}
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

      <AddEntryModal
        kpiType={kpiType}
        kpiId={kpiId}
        metric={entryMetric}
        reportingFrequency={kpi?.reporting_frequency}
        kpiCode={kpi?.code}
        isOpen={showAddEntry}
        onClose={() => setShowAddEntry(false)}
      />

      <ViewEntriesModal
        kpiType={kpiType}
        kpiId={kpiId}
        metricId={entryMetric?.id ?? ""}
        metricName={entryMetric?.name ?? ""}
        isOpen={showViewEntries}
        onClose={() => setShowViewEntries(false)}
      />

      <ViewEntriesModal
        kpiType={kpiType}
        kpiId={kpiId}
        metricId=""
        metricName="All Metrics"
        isOpen={showAllEntries}
        onClose={() => setShowAllEntries(false)}
      />
    </div>
  );
};
