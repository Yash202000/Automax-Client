import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, Upload, FileUp, Paperclip } from "lucide-react";
import { toast } from "sonner";
import type { GoalMetric, EvidenceType } from "../../types/goal";
import { EVIDENCE_TYPE_OPTIONS } from "../../types/goal";
import { useUploadEvidence } from "../../hooks/useGoals";

interface EvidenceUploadModalProps {
  goalId: string;
  isOpen: boolean;
  onClose: () => void;
  metrics?: GoalMetric[];
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const EvidenceUploadModal: React.FC<EvidenceUploadModalProps> = ({
  goalId,
  isOpen,
  onClose,
  metrics,
}) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("Report");
  const [comment, setComment] = useState("");
  const [metricId, setMetricId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadEvidence = useUploadEvidence();

  if (!isOpen) return null;

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setEvidenceType("Report");
    setComment("");
    setMetricId("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error(
        t("goals.components.evidence.uploadModal.errorSelectFile"),
      );
      return;
    }

    if (!title.trim()) {
      toast.error(
        t("goals.components.evidence.uploadModal.errorTitleRequired"),
      );
      return;
    }

    if (!comment.trim()) {
      toast.error(
        t("goals.components.evidence.uploadModal.errorCommentRequired"),
      );
      return;
    }

    uploadEvidence.mutate(
      {
        goalId,
        file,
        data: {
          title: title.trim(),
          evidence_type: evidenceType,
          comment: comment.trim(),
          metric_id: metricId || undefined,
        },
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t("goals.components.evidence.uploadModal.title")}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("goals.components.evidence.uploadModal.subtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* File Picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("goals.components.evidence.uploadModal.fileLabel")}{" "}
              <span className="text-red-500">*</span>
            </label>
            {file ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-700/30">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
                    {file.name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                  aria-label={t("common.remove")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="evidence-file-input"
                className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
              >
                <Upload className="w-8 h-8 text-slate-400" />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {t("goals.components.evidence.uploadModal.selectFile")}
                </span>
              </label>
            )}
            <input
              ref={fileInputRef}
              id="evidence-file-input"
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="evidence-title"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              {t("goals.components.evidence.uploadModal.titleLabel")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              id="evidence-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder={t(
                "goals.components.evidence.uploadModal.titlePlaceholder",
              )}
            />
          </div>

          {/* Evidence Type */}
          <div>
            <label
              htmlFor="evidence-type-select"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              {t("goals.components.evidence.uploadModal.typeLabel")}
            </label>
            <select
              id="evidence-type-select"
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {EVIDENCE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(`goals.components.evidenceType.${opt.value}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Comment */}
          <div>
            <label
              htmlFor="evidence-comment"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              {t("goals.components.evidence.uploadModal.commentLabel")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              id="evidence-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder={t(
                "goals.components.evidence.uploadModal.commentPlaceholder",
              )}
            />
          </div>

          {/* Metric (optional) */}
          {metrics && metrics.length > 0 && (
            <div>
              <label
                htmlFor="evidence-metric-select"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                {t("goals.components.evidence.uploadModal.metricLabel")}{" "}
                <span className="text-slate-400 font-normal">
                  {t("goals.components.evidence.uploadModal.optional")}
                </span>
              </label>
              <select
                id="evidence-metric-select"
                value={metricId}
                onChange={(e) => setMetricId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">
                  {t("goals.components.evidence.uploadModal.noSpecificMetric")}
                </option>
                {metrics.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploadEvidence.isPending}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={uploadEvidence.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadEvidence.isPending
                ? t("goals.components.evidence.uploadModal.uploading")
                : t("goals.components.evidence.uploadModal.upload")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EvidenceUploadModal;
