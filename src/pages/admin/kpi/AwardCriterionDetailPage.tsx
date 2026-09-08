import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Award as AwardIcon,
  BarChart3,
  Users,
  Paperclip,
  FileText,
  Hash,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  useAwardCriteria,
  useAwardCriterionKpis,
  useAwardCriterionCollaborators,
  useAwardCriterionEvidence,
  useViewKpiEvidence,
  useDownloadKpiEvidence,
} from "../../../hooks/useKpi";
import {
  StatTiles,
  RelatedKpisTable,
  RelatedCollaboratorsTable,
  RelatedEvidenceTable,
} from "../../../components/kpi/AwardEntityRelatedTabs";
import { statusColorMap } from "../../../utils/awardEntityRelated";

type TabType = "overview" | "kpis" | "collaborators" | "evidence";

export const AwardCriterionDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const { data: criteriaData, isLoading: criteriaLoading } = useAwardCriteria();
  const criterion = (criteriaData ?? []).find((c) => c.id === id);

  const { data: kpisData, isLoading: kpisLoading } = useAwardCriterionKpis(id);
  const { data: collaboratorsData, isLoading: collaboratorsLoading } =
    useAwardCriterionCollaborators(id);
  const { data: evidenceData, isLoading: evidenceLoading } =
    useAwardCriterionEvidence(id);
  const viewEvidence = useViewKpiEvidence();
  const downloadEvidence = useDownloadKpiEvidence();

  const kpis = kpisData ?? [];
  const collaborators = collaboratorsData ?? [];
  const evidence = evidenceData ?? [];

  // "Last Updated" for the Overview stat tile: the most recent of the Award
  // Criterion's own updated_at and every related KPI's updated_at — whichever
  // changed most recently is what a user checking "what's new here" wants.
  const lastUpdated = [criterion?.updated_at, ...kpis.map((k) => k.updated_at)]
    .filter((d): d is string => !!d)
    .sort()
    .pop();

  const tabs: {
    key: TabType;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }[] = [
    {
      key: "overview",
      label: t("kpi.dictionary.overview", "Overview"),
      icon: <FileText className="w-4 h-4" />,
    },
    {
      key: "kpis",
      label: "Related KPIs",
      icon: <BarChart3 className="w-4 h-4" />,
      count: kpis.length,
    },
    {
      key: "collaborators",
      label: "Collaborators",
      icon: <Users className="w-4 h-4" />,
      count: collaborators.length,
    },
    {
      key: "evidence",
      label: "Related Files / Evidence",
      icon: <Paperclip className="w-4 h-4" />,
      count: evidence.length,
    },
  ];

  const backLink = (
    <Link
      to="/goals/kpi/master-data"
      className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
    >
      <ArrowLeft className="w-4 h-4 rtl:-rotate-180" />
      {t("kpi.masterData.title", "Master Data")}
    </Link>
  );

  if (criteriaLoading) {
    return (
      <div className="space-y-4">
        {backLink}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("common.loading")}
        </p>
      </div>
    );
  }

  if (!criterion) {
    return (
      <div className="space-y-4">
        {backLink}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("kpi.masterData.noAwardCriteria")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {backLink}

      {/* ── Header ────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 rounded-lg bg-amber-500/10 shrink-0">
              <AwardIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                  {criterion.name_en}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    criterion.is_active
                      ? statusColorMap.active
                      : statusColorMap.inactive
                  }`}
                >
                  {criterion.is_active ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  {criterion.is_active
                    ? t("common.active")
                    : t("common.inactive")}
                </span>
              </div>
              {criterion.name_ar && (
                <p
                  className="text-sm text-slate-500 dark:text-slate-400"
                  dir="rtl"
                >
                  {criterion.name_ar}
                </p>
              )}
              <p className="flex items-center gap-1 text-xs font-mono text-slate-400 dark:text-slate-500 mt-1">
                <Hash className="w-3 h-3" />
                {t("kpi.masterData.criterionNo")} {criterion.criterion_no}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────── */}
      <div className="border-b border-slate-200 dark:border-slate-700/60">
        <nav
          className="flex gap-1 -mb-px overflow-x-auto"
          aria-label="Award Criteria tabs"
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

      {/* ── Overview ──────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <StatTiles
            totalKpis={kpis.length}
            totalCollaborators={collaborators.length}
            totalEvidence={evidence.length}
            lastUpdated={lastUpdated}
          />

          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-4">
              {t("kpi.masterData.awardInformation")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("kpi.masterData.criterionNo")}
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {criterion.criterion_no}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("kpi.masterData.nameEn")}
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {criterion.name_en}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("kpi.masterData.nameAr")}
                </p>
                <p
                  className="text-sm font-medium text-slate-900 dark:text-white"
                  dir="rtl"
                >
                  {criterion.name_ar || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("kpi.masterData.evidenceStatus")}
                </p>
                <span
                  className={`inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    criterion.is_active
                      ? statusColorMap.active
                      : statusColorMap.inactive
                  }`}
                >
                  {criterion.is_active
                    ? t("common.active")
                    : t("common.inactive")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "kpis" && (
        <RelatedKpisTable kpis={kpis} loading={kpisLoading} />
      )}

      {activeTab === "collaborators" && (
        <RelatedCollaboratorsTable
          collaborators={collaborators}
          loading={collaboratorsLoading}
        />
      )}

      {activeTab === "evidence" && (
        <RelatedEvidenceTable
          evidence={evidence}
          loading={evidenceLoading}
          onView={(evidenceId) => viewEvidence.mutate(evidenceId)}
          viewPending={viewEvidence.isPending}
          onDownload={(args) => downloadEvidence.mutate(args)}
          downloadPending={downloadEvidence.isPending}
        />
      )}
    </div>
  );
};
