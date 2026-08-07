import React, { useState, useRef } from "react";
import { X, Upload, FileUp, Paperclip } from "lucide-react";
import { toast } from "sonner";
import type { KpiEvidenceType, KpiMetric } from "../../types/kpi";
import { KPI_EVIDENCE_TYPE_OPTIONS } from "../../types/kpi";
import {
  useUploadKpiAttachment,
  useCreateKpiEvidence,
} from "../../hooks/useKpi";

interface KpiEvidenceUploadModalProps {
  kpiType: string;
  kpiId: string;
  isOpen: boolean;
  onClose: () => void;
  metrics?: KpiMetric[];
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const KpiEvidenceUploadModal: React.FC<KpiEvidenceUploadModalProps> = ({
  kpiType,
  kpiId,
  isOpen,
  onClose,
  metrics,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<KpiEvidenceType>("Report");
  const [comment, setComment] = useState("");
  const [metricId, setMetricId] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAttachment = useUploadKpiAttachment(kpiType, kpiId);
  const createEvidence = useCreateKpiEvidence(kpiType, kpiId);
  const isPending = uploadAttachment.isPending || createEvidence.isPending;

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

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error("Please select a file");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!comment.trim()) {
      toast.error("Comment is required");
      return;
    }

    const uploaded = await uploadAttachment.mutateAsync(file);
    if (!uploaded.data) return;

    await createEvidence.mutateAsync({
      title: title.trim(),
      evidence_type: evidenceType,
      description: comment.trim(),
      metric_id: metricId || undefined,
      file_url: uploaded.data.file_url,
      file_name: uploaded.data.file_name,
      file_size: uploaded.data.file_size,
      mime_type: uploaded.data.mime_type,
    });
    handleClose();
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
                Upload Evidence
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Attach supporting evidence to this KPI
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* File Picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              File <span className="text-red-500">*</span>
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
                  aria-label="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="kpi-evidence-file-input"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDraggingOver
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                }`}
              >
                <Upload className="w-8 h-8 text-slate-400" />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {isDraggingOver ? "Drop to select" : "Click to select a file"}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  or drag and drop
                </span>
              </label>
            )}
            <input
              ref={fileInputRef}
              id="kpi-evidence-file-input"
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="kpi-evidence-title"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="kpi-evidence-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="e.g. Baseline Survey"
            />
          </div>

          {/* Evidence Type */}
          <div>
            <label
              htmlFor="kpi-evidence-type-select"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Evidence Type
            </label>
            <select
              id="kpi-evidence-type-select"
              value={evidenceType}
              onChange={(e) =>
                setEvidenceType(e.target.value as KpiEvidenceType)
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {KPI_EVIDENCE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Comment */}
          <div>
            <label
              htmlFor="kpi-evidence-comment"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Comment <span className="text-red-500">*</span>
            </label>
            <textarea
              id="kpi-evidence-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder="Describe this evidence..."
            />
          </div>

          {/* Metric (optional) */}
          {metrics && metrics.length > 0 && (
            <div>
              <label
                htmlFor="kpi-evidence-metric-select"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Metric{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <select
                id="kpi-evidence-metric-select"
                value={metricId}
                onChange={(e) => setMetricId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">No specific metric</option>
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
              disabled={isPending}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending
                ? uploadAttachment.isPending
                  ? "Uploading..."
                  : "Saving..."
                : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KpiEvidenceUploadModal;
