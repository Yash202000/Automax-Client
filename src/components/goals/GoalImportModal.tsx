import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  FileUp,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useImportGoals } from "../../hooks/useGoals";
import type { GoalImportResponse } from "../../types/goal";

interface GoalImportModalProps {
  onClose: () => void;
}

const IMPORT_TEMPLATE_HEADERS = [
  "ID",
  "Title",
  "Description",
  "Category",
  "Priority",
  "Status",
  "Owner",
  "Department",
  "Start Date",
  "Target Date",
  "Review Date",
  "Progress",
  "Metric Name",
  "Metric Type",
  "Metric Unit",
  "Baseline Value",
  "Current Value",
  "Target Value",
  "Weight",
];

function downloadTemplate() {
  const csvContent = IMPORT_TEMPLATE_HEADERS.join(",") + "\n";
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "goals_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export const GoalImportModal: React.FC<GoalImportModalProps> = ({
  onClose,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "review" | "done">("upload");
  const [validationResult, setValidationResult] =
    useState<GoalImportResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importGoals = useImportGoals();

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

  const handleValidate = () => {
    if (!file) return;
    importGoals.mutate(
      { file, dryRun: true },
      {
        onSuccess: (data) => {
          setValidationResult(data.data!);
          setStep("review");
        },
      },
    );
  };

  const handleConfirmImport = () => {
    if (!file) return;
    importGoals.mutate(
      { file, dryRun: false },
      {
        onSuccess: (data) => {
          setValidationResult(data.data!);
          setStep("done");
        },
      },
    );
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Import Goals
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {step === "upload" && (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Upload a CSV or XLSX file to import goals and metrics. The file
                format should match the export format.
              </p>

              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Download className="w-4 h-4" />
                Download CSV template
              </button>

              <div
                onClick={() => fileInputRef.current?.click()}
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
                      Click to select a file
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports CSV and XLSX files
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
            </>
          )}

          {step === "review" && validationResult && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {validationResult.goals_count}
                  </p>
                  <p className="text-xs text-slate-500">Goals</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {validationResult.metrics_count}
                  </p>
                  <p className="text-xs text-slate-500">Metrics</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600 tabular-nums">
                    {validationResult.valid_count}
                  </p>
                  <p className="text-xs text-slate-500">Valid</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-600 tabular-nums">
                    {validationResult.error_count}
                  </p>
                  <p className="text-xs text-slate-500">Errors</p>
                </div>
              </div>

              {/* Row results */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 w-12">
                        Row
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 w-10">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                        Goal
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResult.rows.map((row) => (
                      <tr
                        key={row.row_number}
                        className="border-t border-slate-100 dark:border-slate-700/30"
                      >
                        <td className="px-3 py-2 text-slate-500 tabular-nums">
                          {row.row_number}
                        </td>
                        <td className="px-3 py-2">{statusIcon(row.status)}</td>
                        <td className="px-3 py-2 text-slate-900 dark:text-white font-medium truncate max-w-[180px]">
                          {row.goal_title}
                        </td>
                        <td className="px-3 py-2">
                          {row.errors?.map((e, i) => (
                            <p key={i} className="text-red-600 text-xs">
                              {e}
                            </p>
                          ))}
                          {row.warnings?.map((w, i) => (
                            <p key={i} className="text-amber-600 text-xs">
                              {w}
                            </p>
                          ))}
                          {row.status === "valid" && (
                            <span className="text-green-600 text-xs">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {validationResult.error_count > 0 && (
                <p className="text-sm text-red-600">
                  Fix {validationResult.error_count} error(s) in your file and
                  re-upload.
                </p>
              )}
            </>
          )}

          {step === "done" && validationResult && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Import Complete
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Created {validationResult.goals_count} goals with{" "}
                {validationResult.metrics_count} metrics.
              </p>
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
                Cancel
              </button>
              <button
                onClick={handleValidate}
                disabled={!file || importGoals.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {importGoals.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Validate
              </button>
            </>
          )}

          {step === "review" && (
            <>
              <button
                onClick={() => {
                  setStep("upload");
                  setFile(null);
                  setValidationResult(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Re-upload
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={
                  (validationResult?.error_count ?? 0) > 0 ||
                  importGoals.isPending
                }
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {importGoals.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Confirm Import
              </button>
            </>
          )}

          {step === "done" && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
