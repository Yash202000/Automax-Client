import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  AlertCircle,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  RotateCcw,
  Ban,
} from "lucide-react";
import {
  useStrategicKPIDetail,
  useOperationalKPIDetail,
  useAwardKPIDetail,
  useKpiStatusTransition,
} from "../../../hooks/useKpi";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";

const statusColorMap: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
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
      color: "bg-green-600 hover:bg-green-700",
    },
  ],
  active: [
    {
      action: "deactivate",
      label: "Deactivate",
      icon: <Ban className="w-4 h-4" />,
      color: "bg-red-600 hover:bg-red-700",
    },
  ],
  inactive: [
    {
      action: "reactivate",
      label: "Reactivate",
      icon: <RotateCcw className="w-4 h-4" />,
      color: "bg-blue-600 hover:bg-blue-700",
    },
  ],
};

export const KpiDictionaryDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { type, id } = useParams<{ type: string; id: string }>();

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
  const kpi = data?.data;
  const status = (kpi as any)?.activation_status ?? "";

  const [transitionModal, setTransitionModal] = useState<{
    open: boolean;
    action: string;
  }>({ open: false, action: "" });
  const [comment, setComment] = useState("");
  const transition = useKpiStatusTransition();

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !kpi) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Link
          to="/goals/kpi/dictionary"
          className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("kpi.dictionary.backToDictionary")}
        </Link>
        <div className="rounded-xl border border-red-300 dark:border-red-700/60 bg-red-50 dark:bg-red-900/20 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              {t("kpi.dictionary.notFound")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const fields = [
    { label: t("kpi.dictionary.fieldCode"), value: kpi.code },
    { label: t("kpi.dictionary.fieldNameEn"), value: kpi.name_en },
    { label: t("kpi.dictionary.fieldNameAr"), value: kpi.name_ar },
    {
      label: t("kpi.dictionary.fieldDescriptionEn"),
      value: kpi.description_en,
    },
    {
      label: t("kpi.dictionary.fieldDescriptionAr"),
      value: kpi.description_ar,
    },
    { label: t("kpi.dictionary.fieldFormula"), value: kpi.formula },
    { label: t("kpi.dictionary.fieldBaseline"), value: String(kpi.baseline) },
    {
      label: t("kpi.dictionary.fieldFrequency"),
      value: kpi.reporting_frequency,
    },
    { label: t("kpi.dictionary.fieldPolarity"), value: kpi.polarity },
    { label: t("kpi.dictionary.fieldDataSource"), value: kpi.data_source },
    {
      label: t("kpi.dictionary.fieldLifecycle"),
      value: (kpi as any).lifecycle,
    },
    {
      label: t("kpi.dictionary.fieldSegmentation"),
      value: (kpi as any).segmentation_axes,
    },
    {
      label: t("kpi.dictionary.fieldRelatedUnits"),
      value: (kpi as any).related_units,
    },
    { label: t("kpi.dictionary.fieldNotes"), value: kpi.notes },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        to="/goals/kpi/dictionary"
        className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("kpi.dictionary.backToDictionary")}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {kpi.code} - {kpi.name_en}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t("kpi.dictionary.detailSubtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusColorMap[status] || ""}`}
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
          {transitions.map((tr) => (
            <Button
              key={tr.action}
              onClick={() =>
                setTransitionModal({ open: true, action: tr.action })
              }
              size="sm"
              className={tr.color}
            >
              {tr.icon}
              <span className="ml-1.5">{tr.label}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-700/30">
          {fields.map((field, i) => (
            <div
              key={i}
              className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-2"
            >
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {field.label}
              </dt>
              <dd className="text-sm text-slate-900 dark:text-white md:col-span-2">
                {field.value || "-"}
              </dd>
            </div>
          ))}
        </div>
      </div>

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
