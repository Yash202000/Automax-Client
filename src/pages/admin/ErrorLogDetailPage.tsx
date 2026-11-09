import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../components/ui";
import { errorLogApi } from "../../api/errorLogs";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";
import type { ErrorLogStatus } from "../../types";
import {
  FormatDateTime,
  SeverityColors,
  StatusColors,
  STATUSES,
} from "../../constants/errorLog";

const RelatedLink = (
  type?: string,
  id?: string,
  label?: string,
): React.ReactNode => {
  const text = label || id || "-";
  if (type === "incident" && id) {
    return (
      <Link
        to={`/incidents/${id}`}
        className="text-[hsl(var(--primary))] hover:underline"
      >
        {text}
      </Link>
    );
  }
  return text;
};

export const ErrorLogDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [newStatus, setNewStatus] = useState<ErrorLogStatus | "">("");
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["error-log", id],
    queryFn: () => errorLogApi.GetById(id),
    enabled: Boolean(id),
  });
  const log = data?.data;

  const updateMutation = useMutation({
    mutationFn: () =>
      errorLogApi.UpdateStatus(id, newStatus as ErrorLogStatus, note),
    onSuccess: () => {
      toast.success(t("errorLogs.statusUpdated", "Status updated"));
      setNewStatus("");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["error-log", id] });
      queryClient.invalidateQueries({ queryKey: ["error-logs"] });
    },
    onError: () =>
      toast.error(t("errorLogs.statusUpdateFailed", "Failed to update status")),
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center text-[hsl(var(--muted-foreground))]">
        {t("errorLogs.loading", "Loading error logs...")}
      </div>
    );
  }
  if (!log) {
    return (
      <div className="p-12 text-center text-[hsl(var(--muted-foreground))]">
        {t("errorLogs.notFound", "Error log not found")}
      </div>
    );
  }

  const Field = (label: string, value: React.ReactNode) => (
    <div>
      <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
        {label}
      </p>
      <div className="text-sm text-[hsl(var(--foreground))] break-words">
        {value}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4 rtl:rotate-180" />}
          onClick={() => navigate("/admin/error-logs")}
        >
          {t("common.back", "Back")}
        </Button>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
          {log.error_code}
        </h1>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${StatusColors[log.status] || ""}`}
        >
          {t(`errorLogs.statuses.${log.status}`, log.status)}
        </span>
      </div>

      {/* Details */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        {Field(
          t("errorLogs.dateTime", "Date/Time"),
          <span dir="ltr">{FormatDateTime(log.occurred_at)}</span>,
        )}
        {Field(
          t("errorLogs.module", "Module"),
          t(`errorLogs.modules.${log.module}`, log.module),
        )}
        {Field(t("errorLogs.action", "Action"), log.action)}
        {Field(t("errorLogs.errorType", "Error Type"), log.error_type)}
        {Field(
          t("errorLogs.severity", "Severity"),
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${SeverityColors[log.severity] || ""}`}
          >
            {t(`errorLogs.severities.${log.severity}`, log.severity)}
          </span>,
        )}
        {Field(t("errorLogs.user", "User"), log.user)}
        {Field(
          t("errorLogs.relatedRecord", "Related Record"),
          RelatedLink(log.related_type, log.related_id, log.related_label),
        )}
        {Field(t("errorLogs.retryCount", "Retry Count"), log.retry_count)}
        <div className="md:col-span-3">
          {Field(t("errorLogs.message", "Error Message"), log.message)}
        </div>
        {hasPermission(PERMISSIONS.ERROR_LOGS_VIEW_TECHNICAL) &&
          log.technical_details && (
            <div className="md:col-span-3">
              {Field(
                t("errorLogs.technicalDetails", "Technical Details"),
                <pre
                  dir="ltr"
                  className="whitespace-pre-wrap text-xs bg-[hsl(var(--muted))] rounded-lg p-3"
                >
                  {log.technical_details}
                </pre>,
              )}
            </div>
          )}
      </div>

      {/* Status update */}
      {hasPermission(PERMISSIONS.ERROR_LOGS_UPDATE) && (
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            {t("errorLogs.updateStatus", "Update Status")}
          </h2>
          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as ErrorLogStatus)}
              className="px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))]"
            >
              <option value="">
                {t("errorLogs.selectStatus", "Select status")}
              </option>
              {STATUSES.filter((s) => s !== log.status).map((s) => (
                <option key={s} value={s}>
                  {t(`errorLogs.statuses.${s}`, s)}
                </option>
              ))}
            </select>
            <input
              type="text"
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t(
                "errorLogs.notePlaceholder",
                "Add a note (optional)",
              )}
              className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))]"
            />
            <Button
              size="sm"
              disabled={!newStatus || updateMutation.isPending}
              isLoading={updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
            >
              {t("common.save", "Save")}
            </Button>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">
          {t("errorLogs.history", "Status History")}
        </h2>
        {log.history && log.history.length > 0 ? (
          <ul className="space-y-3">
            {log.history.map((h, i) => (
              <li
                key={i}
                className="text-sm border-s-2 border-[hsl(var(--border))] ps-3"
              >
                <p className="text-[hsl(var(--foreground))]">
                  {t(`errorLogs.statuses.${h.from_status}`, h.from_status)} →{" "}
                  {t(`errorLogs.statuses.${h.to_status}`, h.to_status)}
                </p>
                {h.note && (
                  <p className="text-[hsl(var(--muted-foreground))]">
                    {h.note}
                  </p>
                )}
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {h.changed_by} ·{" "}
                  <span dir="ltr">{FormatDateTime(h.changed_at)}</span>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {t("errorLogs.noHistory", "No status changes yet")}
          </p>
        )}
      </div>
    </div>
  );
};

export default ErrorLogDetailPage;
