import React, { useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  X,
  Upload,
  FileUp,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  MinusCircle,
  ArrowRight,
} from "lucide-react";
import { useImportMetrics, useGoals } from "../../hooks/useGoals";
import { metricImportApi } from "../../api/goals";
import type {
  MetricImportDryRunResponse,
  MetricImportBatch,
} from "../../types/goal";

interface MetricImportModalProps {
  onClose: () => void;
}

export const MetricImportModal: React.FC<MetricImportModalProps> = ({
  onClose,
}) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "review" | "done">("upload");
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [primaryGoalId, setPrimaryGoalId] = useState("");
  const [goalSearch, setGoalSearch] = useState("");
  const [goalDropdownOpen, setGoalDropdownOpen] = useState(false);
  const [validationResult, setValidationResult] =
    useState<MetricImportDryRunResponse | null>(null);
  const [commitResult, setCommitResult] = useState<MetricImportBatch | null>(
    null,
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const goalDropdownRef = useRef<HTMLDivElement>(null);

  const importMetrics = useImportMetrics();
  const { data: goalsData } = useGoals({ limit: 200 });

  const goals = goalsData?.data ?? [];

  const filteredGoals = useMemo(() => {
    if (!goalSearch.trim()) return goals;
    const search = goalSearch.toLowerCase();
    return goals.filter((g) => g.title.toLowerCase().includes(search));
  }, [goals, goalSearch]);

  const selectedGoal = useMemo(
    () => goals.find((g) => g.id === primaryGoalId),
    [goals, primaryGoalId],
  );

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const blob = await metricImportApi.exportTemplate({}, "csv");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "metric_import_template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const ext = selected.name.toLowerCase();
      if (!ext.endsWith(".csv") && !ext.endsWith(".xlsx")) {
        return;
      }
      setFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      const ext = dropped.name.toLowerCase();
      if (ext.endsWith(".csv") || ext.endsWith(".xlsx")) {
        setFile(dropped);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleValidate = () => {
    if (!file) return;
    importMetrics.mutate(
      { file, dryRun: true },
      {
        onSuccess: (data) => {
          setValidationResult(data.data as MetricImportDryRunResponse);
          setStep("review");
        },
      },
    );
  };

  const handleConfirmImport = () => {
    if (!file || !title.trim() || !primaryGoalId) return;
    importMetrics.mutate(
      {
        file,
        dryRun: false,
        title: title.trim(),
        comment: comment.trim() || undefined,
        primaryGoalId,
      },
      {
        onSuccess: (data) => {
          setCommitResult(data.data as MetricImportBatch);
          setStep("done");
        },
      },
    );
  };

  const handleReupload = () => {
    setStep("upload");
    setFile(null);
    setValidationResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "skipped":
        return <MinusCircle className="w-4 h-4 text-slate-400" />;
      default:
        return null;
    }
  };

  const rowBorderClass = (status: string) => {
    switch (status) {
      case "valid":
        return "border-l-2 border-l-green-500";
      case "warning":
        return "border-l-2 border-l-amber-500";
      case "error":
        return "border-l-2 border-l-red-500";
      case "skipped":
        return "border-l-2 border-l-slate-300 dark:border-l-slate-600";
      default:
        return "";
    }
  };

  const canCommit =
    !!title.trim() &&
    !!primaryGoalId &&
    !!file &&
    (validationResult?.error_count ?? 0) === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("goals.components.metric.importModal.title")}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {step === "upload" && (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t("goals.components.metric.importModal.intro")}
              </p>

              <button
                onClick={handleDownloadTemplate}
                disabled={isDownloading}
                className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {t("goals.components.metric.importModal.downloadTemplate")}
              </button>

              {/* File drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
              >
                <FileUp className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                {file ? (
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {t("goals.components.metric.importModal.selectFile")}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {t("goals.components.metric.importModal.supports")}
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("goals.components.metric.importModal.titleLabel")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t(
                    "goals.components.metric.importModal.titlePlaceholder",
                  )}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("goals.components.metric.importModal.commentLabel")}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  placeholder={t(
                    "goals.components.metric.importModal.commentPlaceholder",
                  )}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Primary Goal dropdown */}
              <div className="relative" ref={goalDropdownRef}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("goals.components.metric.importModal.primaryGoalLabel")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() => setGoalDropdownOpen(!goalDropdownOpen)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white cursor-pointer flex items-center justify-between"
                >
                  <span
                    className={
                      selectedGoal
                        ? ""
                        : "text-slate-400"
                    }
                  >
                    {selectedGoal
                      ? selectedGoal.title
                      : t(
                          "goals.components.metric.importModal.primaryGoalPlaceholder",
                        )}
                  </span>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${goalDropdownOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
                {goalDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-lg max-h-48 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-slate-200 dark:border-slate-600">
                      <input
                        type="text"
                        value={goalSearch}
                        onChange={(e) => setGoalSearch(e.target.value)}
                        placeholder={t(
                          "goals.components.metric.importModal.searchGoalsPlaceholder",
                        )}
                        className="w-full rounded border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600 px-2 py-1 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="overflow-y-auto max-h-36">
                      {filteredGoals.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">
                          {t(
                            "goals.components.metric.importModal.noGoalsFound",
                          )}
                        </div>
                      ) : (
                        filteredGoals.map((goal) => (
                          <button
                            key={goal.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrimaryGoalId(goal.id);
                              setGoalDropdownOpen(false);
                              setGoalSearch("");
                            }}
                            className={`w-full ltr:text-left rtl:text-right px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors ${
                              primaryGoalId === goal.id
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {goal.title}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {step === "review" && validationResult && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {validationResult.total_rows}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t("goals.components.metric.importModal.summaryTotalRows")}
                  </p>
                </div>
                <div className="rounded-xl border border-green-200 dark:border-green-800/60 bg-green-50 dark:bg-green-900/20 p-3 text-center">
                  <p className="text-2xl font-bold text-green-600 tabular-nums">
                    {validationResult.valid_count}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t("goals.components.metric.importModal.summaryValid")}
                  </p>
                </div>
                <div className="rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 p-3 text-center">
                  <p className="text-2xl font-bold text-red-600 tabular-nums">
                    {validationResult.error_count}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t("goals.components.metric.importModal.summaryErrors")}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {validationResult.goal_count}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t(
                      "goals.components.metric.importModal.summaryGoalsAffected",
                    )}
                  </p>
                </div>
              </div>

              {/* Skipped / Warnings supplementary */}
              {(validationResult.skipped_count > 0 ||
                validationResult.warning_count > 0) && (
                <div className="flex items-center gap-4 text-sm">
                  {validationResult.skipped_count > 0 && (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <MinusCircle className="w-4 h-4" />
                      <span className="tabular-nums">
                        {validationResult.skipped_count}
                      </span>{" "}
                      {t("goals.components.metric.importModal.skippedLabel")}
                    </span>
                  )}
                  {validationResult.warning_count > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="tabular-nums">
                        {validationResult.warning_count}
                      </span>{" "}
                      {t("goals.components.metric.importModal.warningsLabel")}
                    </span>
                  )}
                </div>
              )}

              {/* Row results table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 w-12">
                        {t("goals.components.metric.importModal.tableRow")}
                      </th>
                      <th className="px-3 py-2 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 w-10">
                        {t("goals.components.metric.importModal.tableStatus")}
                      </th>
                      <th className="px-3 py-2 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500">
                        {t(
                          "goals.components.metric.importModal.tableGoalTitle",
                        )}
                      </th>
                      <th className="px-3 py-2 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500">
                        {t("goals.components.metric.importModal.tableMetric")}
                      </th>
                      <th className="px-3 py-2 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500">
                        {t(
                          "goals.components.metric.importModal.tableValueChange",
                        )}
                      </th>
                      <th className="px-3 py-2 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500">
                        {t("goals.components.metric.importModal.tableDetails")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResult.items.map((item) => (
                      <tr
                        key={item.row_number}
                        className={`border-t border-slate-100 dark:border-slate-700/30 ${rowBorderClass(item.status)}`}
                      >
                        <td className="px-3 py-2 text-slate-500 tabular-nums">
                          {item.row_number}
                        </td>
                        <td className="px-3 py-2">
                          {statusIcon(item.status)}
                        </td>
                        <td className="px-3 py-2 text-slate-900 dark:text-white font-medium truncate max-w-[140px]">
                          {item.goal_title}
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                          {item.metric_name}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 tabular-nums">
                            <span>{item.current_value}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400 rtl:-rotate-180" />
                            <span className="font-medium">
                              {item.new_value}
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {item.errors?.map((e, i) => (
                            <p key={i} className="text-red-600 text-xs">
                              {e}
                            </p>
                          ))}
                          {item.warnings?.map((w, i) => (
                            <p key={i} className="text-amber-600 text-xs">
                              {w}
                            </p>
                          ))}
                          {item.status === "valid" && (
                            <span className="text-green-600 text-xs">
                              {t("goals.components.metric.importModal.ok")}
                            </span>
                          )}
                          {item.status === "skipped" && (
                            <span className="text-slate-400 text-xs">
                              {t(
                                "goals.components.metric.importModal.skipped",
                              )}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {validationResult.error_count > 0 && (
                <p className="text-sm text-red-600">
                  {t("goals.components.metric.importModal.fixErrors", {
                    count: validationResult.error_count,
                  })}
                </p>
              )}
            </>
          )}

          {step === "done" && commitResult && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t("goals.components.metric.importModal.batchCreatedHeading")}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                {t("goals.components.metric.importModal.batchIdLabel")}{" "}
                <span className="font-mono text-slate-900 dark:text-white">
                  {commitResult.id}
                </span>
              </p>
              <Link
                to={`/goals/metric-batches/${commitResult.id}`}
                className="inline-flex items-center gap-1 mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {t("goals.components.metric.importModal.viewBatch")}
                <ArrowRight className="w-4 h-4 rtl:-rotate-180" />
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          {step === "upload" && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleValidate}
                disabled={!file || importMetrics.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {importMetrics.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {t("goals.components.metric.importModal.validate")}
              </button>
            </>
          )}

          {step === "review" && (
            <>
              <button
                onClick={handleReupload}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {t("goals.components.metric.importModal.reupload")}
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={!canCommit || importMetrics.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {importMetrics.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {t("goals.components.metric.importModal.createBatch")}
              </button>
            </>
          )}

          {step === "done" && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {t("common.close")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
