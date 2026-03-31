import React, { useState } from "react";
import {
  FileText,
  Image,
  Award,
  Receipt,
  File,
  Calendar,
  User,
  Paperclip,
  Download,
  Trash2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import type {
  Evidence,
  EvidenceType,
  AvailableTransition,
} from "../../types/goal";
import {
  useEvidenceTransitions,
  useEvidenceTransitionHistory,
} from "../../hooks/useGoals";
import { evidenceApi } from "../../api/goals";
import { EvidenceTransitionModal } from "./EvidenceTransitionModal";

interface EvidenceCardProps {
  evidence: Evidence;
  onDelete?: (evidenceId: string) => void;
  canEdit?: boolean;
}

const EVIDENCE_TYPE_ICONS: Record<EvidenceType, React.ReactNode> = {
  Report: <FileText className="w-4 h-4" />,
  Photo: <Image className="w-4 h-4" />,
  Certificate: <Award className="w-4 h-4" />,
  Invoice: <Receipt className="w-4 h-4" />,
  Other: <File className="w-4 h-4" />,
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  evidence,
  onDelete,
  canEdit,
}) => {
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const { data: transitionsData } = useEvidenceTransitions(evidence.id);
  const { data: historyData } = useEvidenceTransitionHistory(
    historyExpanded ? evidence.id : "",
  );

  const transitions: AvailableTransition[] = transitionsData?.data ?? [];
  const executableTransitions = transitions.filter((t) => t.can_execute);
  const historyItems = historyData?.data ?? [];

  const uploadedByName = evidence.uploaded_by
    ? `${evidence.uploaded_by.first_name} ${evidence.uploaded_by.last_name}`.trim()
    : "Unknown";

  const assignedToName = evidence.assigned_to
    ? `${evidence.assigned_to.first_name} ${evidence.assigned_to.last_name}`.trim()
    : null;

  const formattedDate = new Date(evidence.created_at).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );

  const stateName = evidence.current_state?.name ?? "Unknown";
  const stateColor = evidence.current_state?.color ?? "#94a3b8";
  const stateType = evidence.current_state?.state_type ?? "";
  const isDraft = stateType === "initial";

  const handleDownload = async () => {
    try {
      const blob = await evidenceApi.download(evidence.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = evidence.file_name;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // Error handled by API layer
    }
  };

  return (
    <>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 flex-shrink-0">
              {EVIDENCE_TYPE_ICONS[evidence.evidence_type]}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {evidence.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${stateColor}20`,
                    color: stateColor,
                    border: `1px solid ${stateColor}40`,
                  }}
                >
                  {stateName}
                </span>
                {assignedToName && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {assignedToName}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300 flex-shrink-0">
            {evidence.evidence_type}
          </span>
        </div>

        {/* Comment */}
        {evidence.comment && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
            {evidence.comment}
          </p>
        )}

        {/* File info */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/30 mb-3">
          <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
            {evidence.file_name}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
            ({formatFileSize(evidence.file_size)})
          </span>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3">
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            {uploadedByName}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formattedDate}
          </span>
        </div>

        {/* Actions Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Download */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Download file"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>

          {/* Transition buttons */}
          {executableTransitions.length === 1 ? (
            <button
              onClick={() => setTransitionModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              {executableTransitions[0].transition.name}
            </button>
          ) : executableTransitions.length > 1 ? (
            <button
              onClick={() => setTransitionModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Actions ({executableTransitions.length})
            </button>
          ) : null}

          {/* Delete (draft only) */}
          {canEdit && isDraft && onDelete && (
            <button
              onClick={() => onDelete(evidence.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto"
              title="Delete evidence"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>

        {/* Transition History Toggle */}
        <button
          onClick={() => setHistoryExpanded(!historyExpanded)}
          className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <Clock className="w-3.5 h-3.5" />
          History
          {historyExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Transition History */}
        {historyExpanded && historyItems.length > 0 && (
          <div className="mt-2 space-y-2">
            {historyItems
              .filter((h) => !h.is_system_action)
              .map((h) => {
                const performerName = h.performed_by
                  ? `${h.performed_by.first_name} ${h.performed_by.last_name}`.trim()
                  : "System";
                const transDate = new Date(
                  h.transitioned_at,
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div
                    key={h.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: `${h.from_state_color}20`,
                            color: h.from_state_color,
                          }}
                        >
                          {h.from_state_name}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span
                          className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: `${h.to_state_color}20`,
                            color: h.to_state_color,
                          }}
                        >
                          {h.to_state_name}
                        </span>
                      </div>
                      {h.comment && (
                        <p className="text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {h.comment}
                        </p>
                      )}
                      <p className="text-slate-400 dark:text-slate-500 mt-0.5">
                        {performerName} &middot; {transDate}
                      </p>
                    </div>
                  </div>
                );
              })}
            {historyItems.filter((h) => !h.is_system_action).length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-2">
                No transition history yet.
              </p>
            )}
          </div>
        )}
        {historyExpanded && historyItems.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 py-2">
            No transition history yet.
          </p>
        )}
      </div>

      {/* Transition Modal */}
      <EvidenceTransitionModal
        evidenceId={evidence.id}
        evidenceTitle={evidence.title}
        evidenceVersion={evidence.version}
        transitions={transitions}
        isOpen={transitionModalOpen}
        onClose={() => setTransitionModalOpen(false)}
      />
    </>
  );
};

export default EvidenceCard;
