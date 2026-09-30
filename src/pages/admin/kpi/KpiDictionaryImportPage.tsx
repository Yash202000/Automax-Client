import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { kpiDictionaryImportApi } from "../../../api/kpi";
import { usePermissions } from "../../../hooks/usePermissions";
import type {
  KpiImportAction,
  KpiImportIssue,
  KpiImportOptions,
  KpiImportResult,
} from "../../../types/kpi";

// Record categories in the order the backend reports them.
const CATEGORIES = [
  "department",
  "pillar",
  "enabler",
  "strategic_goal",
  "operational_objective",
  "process",
  "domain",
  "award_criterion",
  "award_sub_criterion",
  "initiative",
  "kpi",
  "metric",
  "annual_target",
  "performance",
];

const ACTION_STYLES: Record<KpiImportAction, string> = {
  create:
    "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  skip: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  reject: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  rolled_back:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

const csvCell = (v: string | number) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Validation report: every error/warning with its worksheet, Excel row,
// record identifier and field, plus the rejected records. UTF-8 BOM so
// Excel shows the Arabic sheet names correctly.
const downloadReport = (result: KpiImportResult) => {
  const lines: string[][] = [
    ["Severity", "Worksheet", "Row", "Record", "Field", "Description"],
  ];
  const issues: KpiImportIssue[] = [...result.errors, ...result.warnings];
  for (const i of issues) {
    lines.push([
      i.severity,
      i.sheet,
      i.row ? String(i.row) : "",
      i.record_id,
      i.field,
      i.message,
    ]);
  }
  lines.push([]);
  lines.push([
    "Record status",
    "Worksheet",
    "Row",
    "Record",
    "Category",
    "Reason",
  ]);
  for (const it of result.items) {
    if (it.action === "reject" || it.action === "rolled_back") {
      lines.push([
        it.action,
        it.sheet,
        it.row ? String(it.row) : "",
        it.record_id,
        it.category,
        it.reason ?? "",
      ]);
    }
  }
  lines.push([]);
  const t = result.totals;
  lines.push(["Summary", "created", String(t.created)]);
  lines.push(["", "updated", String(t.updated)]);
  lines.push(["", "skipped", String(t.skipped)]);
  lines.push(["", "rejected", String(t.rejected)]);
  lines.push(["", "rolled back", String(t.rolled_back)]);

  const csv = lines.map((l) => l.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${result.file_name.replace(/\.[^.]+$/, "")}_validation_report.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const errorMessage = (err: unknown, fallback: string) => {
  const e = err as {
    response?: { data?: { message?: string; error?: string } };
  };
  return e?.response?.data?.message || e?.response?.data?.error || fallback;
};

export const KpiDictionaryImportPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canUpdateKpi } = usePermissions();
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<KpiImportOptions>({
    existing_mode: "skip",
    error_mode: "skip_invalid",
  });
  const [preview, setPreview] = useState<KpiImportResult | null>(null);
  const [completed, setCompleted] = useState<KpiImportResult | null>(null);
  const [busy, setBusy] = useState<"validate" | "commit" | null>(null);
  const [tab, setTab] = useState<"errors" | "warnings" | "records">("errors");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const reset = () => {
    setFile(null);
    setPreview(null);
    setCompleted(null);
    setActionFilter("");
    setCategoryFilter("");
    if (fileInput.current) fileInput.current.value = "";
  };

  const validate = async (f: File, opts: KpiImportOptions) => {
    setBusy("validate");
    try {
      const res = await kpiDictionaryImportApi.validate(f, opts);
      if (res.data) {
        setPreview(res.data);
        setTab(res.data.errors.length ? "errors" : "records");
      }
    } catch (err) {
      toast.error(errorMessage(err, t("kpi.dictionaryImport.validateFailed")));
    } finally {
      setBusy(null);
    }
  };

  // The preview reflects the chosen options (e.g. existing KPIs shown as
  // "update" vs "skip"), so changing one re-runs validation.
  const changeOption = (patch: Partial<KpiImportOptions>) => {
    const next = { ...options, ...patch };
    setOptions(next);
    if (file && preview) void validate(file, next);
  };

  const commit = async () => {
    if (!file || !preview?.can_commit) return;
    setBusy("commit");
    try {
      const res = await kpiDictionaryImportApi.commit(file, options);
      if (res.data) {
        setCompleted(res.data);
        if (res.data.committed) {
          toast.success(t("kpi.dictionaryImport.committed"));
          queryClient.invalidateQueries({ queryKey: ["kpi"] });
        } else {
          toast.error(
            res.data.commit_error || t("kpi.dictionaryImport.commitFailed"),
          );
        }
      }
    } catch (err) {
      toast.error(errorMessage(err, t("kpi.dictionaryImport.commitFailed")));
    } finally {
      setBusy(null);
    }
  };

  // After a commit the page shows the final outcome, otherwise the preview.
  const result = completed ?? preview;

  const filteredItems = useMemo(
    () =>
      (result?.items ?? []).filter(
        (it) =>
          (!actionFilter || it.action === actionFilter) &&
          (!categoryFilter || it.category === categoryFilter),
      ),
    [result, actionFilter, categoryFilter],
  );

  const catLabel = (c: string) => t(`kpi.dictionaryImport.categories.${c}`, c);
  const actionLabel = (a: string) => t(`kpi.dictionaryImport.actions.${a}`, a);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("kpi.dictionaryImport.title")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("kpi.dictionaryImport.subtitle")}
            </p>
          </div>
        </div>
        <Link
          to="/goals/kpi/dictionary"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {t("kpi.dictionaryImport.backToDictionary")}
        </Link>
      </div>

      {/* Step 1 — upload + options */}
      {!completed && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
          <div
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) {
                setFile(f);
                setPreview(null);
              }
            }}
            className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-500/5 transition-colors"
          >
            <Upload className="w-8 h-8 text-slate-400" />
            {file ? (
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {file.name}{" "}
                <span className="text-slate-500">
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
              </p>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {t("kpi.dictionaryImport.dropHint")}
              </p>
            )}
            <p className="text-xs text-slate-400">
              {t("kpi.dictionaryImport.formatHint")}
            </p>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xlsm"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setPreview(null);
              }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                {t("kpi.dictionaryImport.existingMode")}
              </legend>
              {(["skip", "update"] as const).map((m) => (
                <label
                  key={m}
                  className={`flex items-start gap-2 text-sm ${m === "update" && !canUpdateKpi() ? "opacity-50" : "cursor-pointer"}`}
                >
                  <input
                    type="radio"
                    name="existing_mode"
                    checked={options.existing_mode === m}
                    disabled={(m === "update" && !canUpdateKpi()) || !!busy}
                    onChange={() => changeOption({ existing_mode: m })}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {t(`kpi.dictionaryImport.existing_${m}`)}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {t(`kpi.dictionaryImport.existing_${m}_hint`)}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                {t("kpi.dictionaryImport.errorMode")}
              </legend>
              {(["skip_invalid", "abort"] as const).map((m) => (
                <label
                  key={m}
                  className="flex items-start gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="radio"
                    name="error_mode"
                    checked={options.error_mode === m}
                    disabled={!!busy}
                    onChange={() => changeOption({ error_mode: m })}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {t(`kpi.dictionaryImport.errors_${m}`)}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {t(`kpi.dictionaryImport.errors_${m}_hint`)}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          </div>

          {!preview && (
            <div className="flex justify-end">
              <button
                onClick={() => file && validate(file, options)}
                disabled={!file || !!busy}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {busy === "validate" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {t("kpi.dictionaryImport.validate")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3 — completion summary */}
      {completed && (
        <div
          className={`rounded-xl border p-5 flex items-start gap-3 ${
            completed.committed
              ? "border-green-200 bg-green-50 dark:border-green-500/30 dark:bg-green-500/10"
              : "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
          }`}
        >
          {completed.committed ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-semibold text-slate-900 dark:text-white">
              {completed.committed
                ? t("kpi.dictionaryImport.completedTitle")
                : t("kpi.dictionaryImport.rolledBackTitle")}
            </p>
            {completed.commit_error && (
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                {completed.commit_error}
              </p>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {completed.file_name}
            </p>
          </div>
        </div>
      )}

      {/* Step 2 — validation report + preview (also reused for the summary) */}
      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(
              [
                ["created", "text-green-600 dark:text-green-400"],
                ["updated", "text-blue-600 dark:text-blue-400"],
                ["skipped", "text-slate-600 dark:text-slate-300"],
                ["rejected", "text-red-600 dark:text-red-400"],
                ["rolled_back", "text-amber-600 dark:text-amber-400"],
              ] as const
            ).map(([k, color]) => (
              <div
                key={k}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {completed
                    ? t(`kpi.dictionaryImport.totals.${k}`)
                    : t(`kpi.dictionaryImport.totalsPreview.${k}`)}
                </p>
                <p className={`text-2xl font-bold ${color}`}>
                  {result.totals[k]}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-start">
                    {t("kpi.dictionaryImport.category")}
                  </th>
                  <th className="px-4 py-2 text-end">
                    {actionLabel("create")}
                  </th>
                  <th className="px-4 py-2 text-end">
                    {actionLabel("update")}
                  </th>
                  <th className="px-4 py-2 text-end">{actionLabel("skip")}</th>
                  <th className="px-4 py-2 text-end">
                    {actionLabel("reject")}
                  </th>
                  {completed && !completed.committed && (
                    <th className="px-4 py-2 text-end">
                      {actionLabel("rolled_back")}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {CATEGORIES.filter((c) => {
                  const n = result.categories[c];
                  return (
                    n &&
                    n.created +
                      n.updated +
                      n.skipped +
                      n.rejected +
                      n.rolled_back >
                      0
                  );
                }).map((c) => {
                  const n = result.categories[c];
                  return (
                    <tr key={c}>
                      <td className="px-4 py-2 text-slate-900 dark:text-white">
                        {catLabel(c)}
                      </td>
                      <td className="px-4 py-2 text-end">{n.created || "–"}</td>
                      <td className="px-4 py-2 text-end">{n.updated || "–"}</td>
                      <td className="px-4 py-2 text-end">{n.skipped || "–"}</td>
                      <td
                        className={`px-4 py-2 text-end ${n.rejected ? "text-red-600 font-medium" : ""}`}
                      >
                        {n.rejected || "–"}
                      </td>
                      {completed && !completed.committed && (
                        <td className="px-4 py-2 text-end">
                          {n.rolled_back || "–"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-200 dark:border-slate-700">
              {(
                [
                  ["errors", result.errors.length, AlertCircle],
                  ["warnings", result.warnings.length, AlertTriangle],
                  ["records", result.items.length, FileSpreadsheet],
                ] as const
              ).map(([k, count, Icon]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === k
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t(`kpi.dictionaryImport.tabs.${k}`)} ({count})
                </button>
              ))}
            </div>

            {tab !== "records" ? (
              <IssueTable
                issues={tab === "errors" ? result.errors : result.warnings}
                empty={t(`kpi.dictionaryImport.no_${tab}`)}
              />
            ) : (
              <div>
                <div className="flex gap-2 p-3 flex-wrap">
                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  >
                    <option value="">
                      {t("kpi.dictionaryImport.allActions")}
                    </option>
                    {(
                      [
                        "create",
                        "update",
                        "skip",
                        "reject",
                        "rolled_back",
                      ] as const
                    ).map((a) => (
                      <option key={a} value={a}>
                        {actionLabel(a)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  >
                    <option value="">
                      {t("kpi.dictionaryImport.allCategories")}
                    </option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {catLabel(c)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="max-h-[28rem] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-2 text-start">
                          {t("kpi.dictionaryImport.action")}
                        </th>
                        <th className="px-4 py-2 text-start">
                          {t("kpi.dictionaryImport.category")}
                        </th>
                        <th className="px-4 py-2 text-start">
                          {t("kpi.dictionaryImport.record")}
                        </th>
                        <th className="px-4 py-2 text-start">
                          {t("kpi.dictionaryImport.name")}
                        </th>
                        <th className="px-4 py-2 text-start">
                          {t("kpi.dictionaryImport.worksheet")}
                        </th>
                        <th className="px-4 py-2 text-end">
                          {t("kpi.dictionaryImport.row")}
                        </th>
                        <th className="px-4 py-2 text-start">
                          {t("kpi.dictionaryImport.reason")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredItems.map((it, i) => (
                        <tr key={i}>
                          <td className="px-4 py-1.5">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${ACTION_STYLES[it.action]}`}
                            >
                              {actionLabel(it.action)}
                            </span>
                          </td>
                          <td className="px-4 py-1.5 whitespace-nowrap">
                            {catLabel(it.category)}
                          </td>
                          <td className="px-4 py-1.5 font-mono text-xs whitespace-nowrap">
                            {it.record_id}
                          </td>
                          <td
                            className="px-4 py-1.5 max-w-xs truncate"
                            title={it.name}
                          >
                            {it.name}
                          </td>
                          <td className="px-4 py-1.5 whitespace-nowrap text-slate-500">
                            {it.sheet}
                          </td>
                          <td className="px-4 py-1.5 text-end text-slate-500">
                            {it.row || ""}
                          </td>
                          <td className="px-4 py-1.5 text-slate-500">
                            {it.reason}
                          </td>
                        </tr>
                      ))}
                      {filteredItems.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-6 text-center text-slate-400"
                          >
                            {t("kpi.dictionaryImport.noRecords")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={() => downloadReport(result)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t("kpi.dictionaryImport.downloadReport")}
            </button>
            {completed ? (
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {t("kpi.dictionaryImport.importAnother")}
                </button>
                <Link
                  to="/goals/kpi/dictionary"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {t("kpi.dictionaryImport.goToDictionary")}
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {!result.can_commit && (
                  <span className="text-xs text-red-600 dark:text-red-400">
                    {result.options.error_mode === "abort" &&
                    result.errors.length > 0
                      ? t("kpi.dictionaryImport.blockedByErrors")
                      : t("kpi.dictionaryImport.nothingToCommit")}
                  </span>
                )}
                <button
                  onClick={reset}
                  disabled={!!busy}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  {t("kpi.dictionaryImport.cancel")}
                </button>
                <button
                  onClick={commit}
                  disabled={!result.can_commit || !!busy}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {busy === "commit" || busy === "validate" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {t("kpi.dictionaryImport.commit")}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const IssueTable: React.FC<{ issues: KpiImportIssue[]; empty: string }> = ({
  issues,
  empty,
}) => {
  const { t } = useTranslation();
  if (issues.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-400">{empty}</p>
    );
  }
  return (
    <div className="max-h-[28rem] overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs uppercase">
          <tr>
            <th className="px-4 py-2 text-start">
              {t("kpi.dictionaryImport.worksheet")}
            </th>
            <th className="px-4 py-2 text-end">
              {t("kpi.dictionaryImport.row")}
            </th>
            <th className="px-4 py-2 text-start">
              {t("kpi.dictionaryImport.record")}
            </th>
            <th className="px-4 py-2 text-start">
              {t("kpi.dictionaryImport.field")}
            </th>
            <th className="px-4 py-2 text-start">
              {t("kpi.dictionaryImport.description")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {issues.map((i, idx) => (
            <tr key={idx}>
              <td className="px-4 py-1.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                {i.sheet}
              </td>
              <td className="px-4 py-1.5 text-end text-slate-500">
                {i.row || ""}
              </td>
              <td className="px-4 py-1.5 font-mono text-xs whitespace-nowrap">
                {i.record_id}
              </td>
              <td className="px-4 py-1.5 whitespace-nowrap">{i.field}</td>
              <td
                className={`px-4 py-1.5 ${i.severity === "error" ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`}
              >
                {i.message}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default KpiDictionaryImportPage;
