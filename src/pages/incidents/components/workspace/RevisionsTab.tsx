import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  Paperclip,
  RefreshCw,
  Smartphone,
  Upload,
} from "lucide-react";
import { cn, getLocalizedName } from "@/lib/utils";
import CallablePhone from "../../../../components/common/CallablePhone";
import { incidentApi } from "../../../../api/admin";
import type {
  IncidentAttachment,
  IncidentRevision,
  IncidentRevisionActionType,
} from "../../../../types";
import { stateTone } from "@/utils/incidentTone";
import { saveAs } from "file-saver";

const PAGE_LIMIT = 10;

function revisionDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function revisionTime(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function actorInitials(rev: IncidentRevision): string {
  const u = rev.performed_by;
  const initials = `${u?.first_name?.[0] || ""}${u?.last_name?.[0] || ""}`;
  if (initials) return initials.toUpperCase();
  return (u?.username?.slice(0, 2) || "S").toUpperCase();
}

function actorDisplayName(rev: IncidentRevision): string {
  const u = rev.performed_by;
  if (!u) return "";
  return (
    `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username || ""
  );
}

/* Revisions tab — same /incidents/{id}/revisions data as RevisionHistory:
   action-type filter, Excel export, audit table with actor/department
   cells, showing-range footer, deterministic in-page ordering. */
export function RevisionsTab({
  incidentId,
  attachments,
  onPreviewAttachment,
}: {
  incidentId: string;
  attachments: IncidentAttachment[];
  onPreviewAttachment: (attachmentId: string) => void;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<IncidentRevisionActionType | "">(
    "",
  );
  const [exporting, setExporting] = useState(false);

  const actionTypeLabels: Record<IncidentRevisionActionType, string> = useMemo(
    () => ({
      field_change: t("revisionHistory.actionTypes.fieldChange"),
      comment_added: t("revisionHistory.actionTypes.commentAdded"),
      comment_modified: t("revisionHistory.actionTypes.commentModified"),
      comment_deleted: t("revisionHistory.actionTypes.commentDeleted"),
      attachment_added: t("revisionHistory.actionTypes.attachmentAdded"),
      attachment_removed: t("revisionHistory.actionTypes.attachmentRemoved"),
      assignee_changed: t("revisionHistory.actionTypes.assigneeChanged"),
      status_changed: t("revisionHistory.actionTypes.statusChanged"),
      created: t("revisionHistory.actionTypes.created"),
    }),
    [t],
  );

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      "incidents",
      "v2-list",
      "revisions",
      incidentId,
      page,
      filterType,
    ],
    queryFn: () =>
      incidentApi.getRevisions(incidentId, {
        page,
        limit: PAGE_LIMIT,
        action_type: filterType || undefined,
      }),
    enabled: !!incidentId,
    staleTime: 30_000,
  });

  const revisions: IncidentRevision[] = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;
  const totalItems = data?.total_items ?? 0;

  const handleExport = async () => {
    // Same client-side export as RevisionHistory: the API caps a page at
    // 100 rows (a larger limit silently falls back to 20), so page through.
    // ExcelJS loads on demand (export click only).
    try {
      setExporting(true);
      const excelNamespace = (await import("exceljs")) as unknown as {
        default?: typeof import("exceljs");
      } & typeof import("exceljs");
      const ExcelJS = excelNamespace.default ?? excelNamespace;
      const PAGE_SIZE = 100;
      const fetchPage = (p: number) =>
        incidentApi.getRevisions(incidentId, {
          page: p,
          limit: PAGE_SIZE,
          action_type: filterType || undefined,
        });
      const first = await fetchPage(1);
      const allRevisions = [...(first.data ?? [])];
      for (let p = 2; p <= (first.total_pages ?? 1); p++) {
        allRevisions.push(...((await fetchPage(p)).data ?? []));
      }

      const rows = allRevisions.map((rev) => ({
        "#": rev.revision_number,
        Timestamp: `${revisionDate(rev.created_at)} ${revisionTime(rev.created_at)}`,
        Action: rev.action_description,
        "Action Taken By": rev.performed_by
          ? `${rev.performed_by.first_name || ""} ${rev.performed_by.last_name || ""}`.trim() ||
            rev.performed_by.username
          : t("revisionHistory.system"),
        Department:
          rev.performed_by?.department?.name ||
          rev.performed_by?.departments?.[0]?.name ||
          "-",
        Role:
          rev.performed_by?.roles?.map((role) => role.name)?.join(", ") || "",
        Mobile: rev.performed_by_phone || rev.performed_by?.phone || "",
      }));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Revisions");
      const columnWidths: Record<string, number> = {
        "#": 6,
        Timestamp: 24,
        Action: 60,
        "Action Taken By": 26,
        Department: 24,
        Role: 26,
        Mobile: 18,
      };
      worksheet.columns = Object.entries(columnWidths).map(
        ([header, width]) => ({ header, key: header, width }),
      );
      rows.forEach((row) => {
        worksheet.addRow(row);
      });

      const excelBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(
        blob,
        `incident-revisions-${incidentId}-${new Date().toISOString().split("T")[0]}.xlsx`,
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to export revisions:", error);
      toast.error(t("incidents.exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const titleFor = (rev: IncidentRevision): string => {
    switch (rev.action_type) {
      case "status_changed":
        return t("incidents.statusUpdated");
      case "attachment_added":
        return t("incidents.fileUploaded");
      case "attachment_removed":
        return t("incidents.fileRemoved");
      default:
        return actionTypeLabels[rev.action_type] ?? rev.action_type;
    }
  };

  const pageList = useMemo(() => {
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const windowed = new Set([1, totalPages, page - 1, page, page + 1]);
    return [...windowed].filter((p) => p >= 1 && p <= totalPages).sort();
  }, [totalPages, page]);

  const rangeFrom = totalItems === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1;
  const rangeTo = Math.min(page * PAGE_LIMIT, totalItems);

  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-sm">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(
                    e.target.value as IncidentRevisionActionType | "",
                  );
                  setPage(1);
                }}
                className="appearance-none bg-[hsl(var(--muted)/0.5)] border border-primary/30 hover:border-primary/60 rounded-lg ps-8 pe-7 py-1.5 text-xs text-[hsl(var(--foreground))] shadow-sm transition-all focus:outline-none cursor-pointer"
                aria-label={t("revisionHistory.allActions")}
              >
                <option value="">{t("revisionHistory.allActions")}</option>
                {(
                  Object.entries(actionTypeLabels) as Array<
                    [IncidentRevisionActionType, string]
                  >
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <Filter className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary pointer-events-none" />
              <ChevronDown className="absolute end-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] pointer-events-none rtl:rotate-180" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {t("incidents.revisionsTotal", { count: totalItems })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--muted)/0.5)] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] hover:border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-lg text-xs font-medium transition-all shadow-sm disabled:opacity-60"
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5 text-primary",
                  isFetching && "animate-spin",
                )}
              />
              {t("incidents.refresh")}
            </button>
            <button
              type="button"
              onClick={() => {
                void handleExport();
              }}
              disabled={exporting || revisions.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-linear-to-r rtl:bg-linear-to-l from-primary to-accent text-primary-foreground rounded-lg text-xs font-semibold shadow-lg shadow-primary/0.25 hover:shadow-xl hover:shadow-[hsl(var(--primary)/0.3)] transition-all disabled:opacity-60"
            >
              {exporting ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {t("incidents.exportHistory")}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[hsl(var(--border))] border-t-transparent" />
            {t("incidents.updating")}
          </div>
        ) : revisions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 text-[hsl(var(--muted-foreground))] mx-auto mb-2" />
            <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
              {t("revisionHistory.noRevisionsFound")}
            </p>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">
              {t("revisionHistory.noRevisionsDesc")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.4)]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[hsl(var(--card))] text-[10px] text-[hsl(var(--muted-foreground))] font-semibold tracking-wider uppercase font-mono border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">#</th>
                  <th className="py-2.5 px-3.5 w-[140px]">
                    {t("revisionHistory.timestamp")}
                  </th>
                  <th className="py-2.5 px-3.5">
                    {t("revisionHistory.action")}
                  </th>
                  <th className="py-2.5 px-3.5 w-[220px]">
                    {t("revisionHistory.actionTakenBy")}
                  </th>
                  <th className="py-2.5 px-3.5 w-[180px]">
                    {t("common.department")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {revisions.map((rev) => {
                  const statusChange =
                    rev.action_type === "status_changed"
                      ? rev.changes?.find(
                          (c) => c.field_name === "current_state_id",
                        )
                      : undefined;
                  const fromTone = stateTone(statusChange?.old_value);
                  const toTone = stateTone(statusChange?.new_value);
                  const attachedFile = rev.attachment_id
                    ? attachments.find((a) => a.id === rev.attachment_id)
                    : undefined;
                  const roleName = rev.performed_by?.roles?.[0]?.name || "";
                  const roleTone = /contractor|field/i.test(roleName)
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-primary/10 border-primary/30 text-primary";
                  const phone =
                    rev.performed_by_phone || rev.performed_by?.phone || "";
                  const departments = rev.performed_by?.departments ?? [];
                  return (
                    <tr
                      key={rev.id}
                      className="hover:bg-[hsl(var(--muted)/0.5)]/70 transition-colors group align-top"
                    >
                      <td className="py-2.5 px-3 text-center align-top">
                        <span className="w-6 h-6 rounded-full bg-[hsl(var(--muted)/0.8)] border border-[hsl(var(--border))] inline-flex items-center justify-center text-[hsl(var(--muted-foreground))] font-mono text-[10px]">
                          {rev.revision_number}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 align-top whitespace-nowrap">
                        <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                          <div className="w-6 h-6 rounded bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 text-primary">
                            <Clock className="h-3 w-3" />
                          </div>
                          <div>
                            <div className="font-mono font-semibold text-[hsl(var(--foreground))] text-xs tracking-tight">
                              {revisionDate(rev.created_at)}
                            </div>
                            <div className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono">
                              {revisionTime(rev.created_at)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 align-top">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {rev.action_type === "attachment_added" ||
                            rev.action_type === "attachment_removed" ? (
                              <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary text-[10px] font-semibold flex items-center gap-1">
                                <Paperclip className="h-2.5 w-2.5" />
                                {titleFor(rev)}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-[hsl(var(--foreground))]">
                                {titleFor(rev)}
                              </span>
                            )}
                            {statusChange ? (
                              <div className="inline-flex items-center gap-1.5 bg-[hsl(var(--card))] border border-[hsl(var(--border))] px-1.5 py-0.5 rounded">
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1",
                                    fromTone.pill,
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "w-1.5 h-1.5 rounded-full",
                                      fromTone.dot,
                                    )}
                                  />
                                  {statusChange.old_value || "—"}
                                </span>
                                <ArrowRight className="h-3 w-3 text-[hsl(var(--muted-foreground))] rtl:rotate-180" />
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1",
                                    toTone.pill,
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "w-1.5 h-1.5 rounded-full",
                                      toTone.dot,
                                    )}
                                  />
                                  {statusChange.new_value || "—"}
                                </span>
                              </div>
                            ) : null}
                          </div>
                          {attachedFile ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium">
                                {attachedFile.file_name}
                              </span>
                              <div className="inline-flex items-center gap-2 px-2 py-1 rounded bg-[hsl(var(--card))] border border-primary/30 hover:border-primary/60 transition-colors">
                                <FileText className="h-3.5 w-3.5 text-primary" />
                                <span className="font-mono font-semibold text-primary text-xs">
                                  {attachedFile.file_name}
                                </span>
                                <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono">
                                  {(
                                    attachedFile.file_size /
                                    1024 /
                                    1024
                                  ).toFixed(1)}{" "}
                                  MB
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onPreviewAttachment(attachedFile.id)
                                  }
                                  className="text-primary hover:text-[hsl(var(--foreground))] text-[10px] font-semibold transition-colors ml-1"
                                >
                                  <Upload className="h-2.5 w-2.5 inline me-0.5" />
                                  {t("common.view")}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 align-top">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-linear-to-br from-primary to-accent text-primary-foreground flex items-center justify-center font-bold text-[11px] shadow-sm shrink-0 border border-primary/40 font-mono">
                            {actorInitials(rev)}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-[hsl(var(--foreground))] text-xs truncate">
                                {actorDisplayName(rev) ||
                                  t("revisionHistory.system")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {roleName ? (
                                <span
                                  className={cn(
                                    "inline-flex items-center px-1.5 py-0.2 rounded border text-[9px] font-medium",
                                    roleTone,
                                  )}
                                >
                                  {roleName}
                                </span>
                              ) : null}
                              {phone ? (
                                <span className="text-[hsl(var(--muted-foreground))] font-mono text-[10px] flex items-center gap-1">
                                  <Smartphone className="h-2.5 w-2.5 text-primary" />
                                  <CallablePhone
                                    number={phone}
                                    className="text-[hsl(var(--muted-foreground))] hover:text-primary font-mono text-[10px]"
                                  />
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 align-top">
                        <div className="space-y-0.5">
                          <span className="text-[hsl(var(--foreground))] font-semibold text-xs block truncate">
                            {departments[0]
                              ? getLocalizedName(departments[0])
                              : "—"}
                          </span>
                          {departments[1] ? (
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))] block truncate">
                              {getLocalizedName(departments[1])}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))] pt-2 px-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                {t("incidents.showingRevisions", {
                  from: rangeFrom,
                  to: rangeTo,
                  total: totalItems,
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--border))] disabled:opacity-40 transition-colors"
                aria-label={t("common.previous", "Previous")}
              >
                <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
              </button>
              {pageList.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-lg font-mono text-xs transition-colors",
                    p === page
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
                      : "border border-transparent hover:border-[hsl(var(--muted-foreground)/0.3)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]",
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--border))] disabled:opacity-40 transition-colors"
                aria-label={t("common.next", "Next")}
              >
                <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
