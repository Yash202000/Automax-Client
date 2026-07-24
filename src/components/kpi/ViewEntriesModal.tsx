import React from "react";
import {
  X,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  FileText,
} from "lucide-react";
import { useKpiEntries } from "../../hooks/useKpi";
import type { KpiEntryStatus, KpiEntry } from "../../types/kpi";

interface ViewEntriesModalProps {
  kpiType: string;
  kpiId: string;
  metricId: string;
  metricName: string;
  isOpen: boolean;
  onClose: () => void;
}

const entryStatusColor: Record<KpiEntryStatus, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300",
  submitted: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  approved:
    "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
  rejected: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
};

const entryStatusIcon: Record<KpiEntryStatus, React.ReactNode> = {
  draft: <FileText className="w-3 h-3" />,
  submitted: <Send className="w-3 h-3" />,
  approved: <CheckCircle className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const ViewEntriesModal: React.FC<ViewEntriesModalProps> = ({
  kpiType,
  kpiId,
  metricId,
  metricName,
  isOpen,
  onClose,
}) => {
  const { data: entries, isLoading } = useKpiEntries(kpiType, kpiId, metricId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Entries — {metricName}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {metricId
                  ? `Entry history for "${metricName}"`
                  : "All entries for this KPI"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : entries && entries.length > 0 ? (
            <div className="space-y-3">
              {entries.map((entry: KpiEntry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium capitalize ${entryStatusColor[entry.status]}`}
                      >
                        {entryStatusIcon[entry.status]}
                        {entry.status}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {entry.period_code}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                      {entry.actual_value}
                    </span>
                  </div>
                  {entry.performance_commentary && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {entry.performance_commentary}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    {entry.submitted_by && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {entry.submitted_by.first_name}{" "}
                        {entry.submitted_by.last_name}
                      </span>
                    )}
                    <span>{formatDate(entry.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {metricId
                  ? "No entries yet for this metric."
                  : "No entries yet for this KPI."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewEntriesModal;
