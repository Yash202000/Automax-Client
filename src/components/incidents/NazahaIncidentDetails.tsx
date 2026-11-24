// Nazaha cards on the incident details page: report info and reporter details.
// A hidden (uncooperative) reporter can be revealed by users with permission.
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Info, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { Incident } from "../../types";
import { nazahaApi, type ReporterDetails } from "../../api/nazaha";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";
import { getLocalizedName } from "@/lib/utils";

const Field: React.FC<{
  label: string;
  value?: React.ReactNode;
  wide?: boolean;
}> = ({ label, value, wide }) =>
  value ? (
    <div className={wide ? "col-span-2" : undefined}>
      <span className="block text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      <div className="mt-0.5 text-sm text-[hsl(var(--foreground))] break-words whitespace-pre-wrap">
        {value}
      </div>
    </div>
  ) : null;

const cardClass =
  "bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm";

export const NazahaIncidentDetails: React.FC<{ incident: Incident }> = ({
  incident,
}) => {
  const { t } = useTranslation();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canReveal =
    isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_REVEAL_REPORTER);
  const [revealed, setRevealed] = useState<ReporterDetails | null>(null);
  const [revealing, setRevealing] = useState(false);

  const reveal = async () => {
    setRevealing(true);
    try {
      const res = await nazahaApi.revealReporter(incident.id);
      setRevealed(res.data ?? null);
    } catch {
      toast.error(t("nazaha.revealFailed"));
    } finally {
      setRevealing(false);
    }
  };

  const incidentLink = (ref: { id: string; incident_number: string }) => (
    <Link
      key={ref.id}
      to={`/incidents/${ref.id}`}
      className="text-[hsl(var(--primary))] hover:underline me-3"
    >
      {ref.incident_number}
    </Link>
  );

  // Reporter details come from the contact, or from the reveal call when hidden.
  // Older reports link the operator instead of a contact.
  const contact =
    incident.reporter && incident.reporter.id !== incident.created_by_id
      ? incident.reporter
      : undefined;
  const reporter: Partial<ReporterDetails> = incident.reporter_hidden
    ? (revealed ?? {})
    : {
        reporter_name: [
          contact?.first_name,
          contact?.middle_name,
          contact?.last_name,
        ]
          .filter(Boolean)
          .join(" "),
        reporter_phone: contact?.phone,
        // Skip generated login emails.
        reporter_email: contact?.email?.toLowerCase().endsWith("@automax.com")
          ? undefined
          : contact?.email,
        reporter_national_id: contact?.national_id,
        reporter_nationality: contact?.nationality,
        reporter_gender: contact?.gender,
        reporter_address: contact?.address,
      };
  // Skip placeholder national IDs.
  const nationalId = /^[12]\d{9}$/.test(reporter.reporter_national_id || "")
    ? reporter.reporter_national_id
    : undefined;
  const showReporter = !incident.reporter_hidden || revealed;

  const hasReportInfo = Boolean(
    incident.content ||
    incident.notes ||
    incident.caller_number ||
    incident.concerned_authority ||
    incident.linked_incident ||
    incident.previous_reports?.length ||
    incident.street,
  );
  // Name, phone and email are already shown elsewhere on the page.
  const hasReporterInfo = Boolean(
    incident.reporter_hidden ||
    nationalId ||
    contact?.nationality_id ||
    contact?.gender ||
    contact?.address,
  );
  if (!hasReportInfo && !hasReporterInfo) return null;

  return (
    <>
      {hasReportInfo && (
        <div className={cardClass}>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
            {t("nazaha.reportInfo")}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("nazaha.content")} value={incident.content} wide />
            <Field label={t("nazaha.notes")} value={incident.notes} wide />
            <Field
              label={t("nazaha.callerNumber")}
              value={incident.caller_number}
            />
            <Field
              label={t("nazaha.concernedAuthority")}
              value={getLocalizedName(incident.concerned_authority)}
            />
            <Field
              label={t("nazaha.linkedReport")}
              value={
                incident.linked_incident &&
                incidentLink(incident.linked_incident)
              }
            />
            <Field
              label={t("nazaha.previousReports")}
              value={
                incident.previous_reports?.length
                  ? incident.previous_reports.map(incidentLink)
                  : undefined
              }
            />
            <Field label={t("nazaha.city")} value={incident.city} />
            <Field label={t("nazaha.street")} value={incident.street} />
          </div>
        </div>
      )}

      {hasReporterInfo && (
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              {t("nazaha.sections.reporterData")}
            </h3>
            {incident.reporter_hidden && canReveal && (
              <button
                type="button"
                onClick={revealed ? () => setRevealed(null) : reveal}
                disabled={revealing}
                className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--primary))] hover:underline disabled:opacity-60"
              >
                {revealing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : revealed ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                {revealed ? t("nazaha.hideReporter") : t("nazaha.showReporter")}
              </button>
            )}
          </div>

          {incident.reporter_hidden && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{t("nazaha.reporterHidden")}</p>
                <p className="text-xs">{t("nazaha.reporterHiddenHint")}</p>
                {revealed && (
                  <p className="mt-1 text-xs flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    {t("nazaha.revealLogged")}
                  </p>
                )}
              </div>
            </div>
          )}

          {showReporter && (
            <div className="grid grid-cols-2 gap-4">
              <Field
                label={t("nazaha.reporterName")}
                value={reporter.reporter_name}
              />
              <Field
                label={t("nazaha.nationality")}
                value={getLocalizedName(reporter.reporter_nationality)}
              />
              <Field label={t("nazaha.nationalId")} value={nationalId} />
              <Field
                label={t("nazaha.mobile")}
                value={
                  reporter.reporter_phone && (
                    <span dir="ltr">{reporter.reporter_phone}</span>
                  )
                }
              />
              <Field
                label={t("nazaha.email")}
                value={reporter.reporter_email}
              />
              <Field
                label={t("nazaha.gender")}
                value={
                  reporter.reporter_gender &&
                  t(`nazaha.genders.${reporter.reporter_gender}`)
                }
              />
              <Field
                label={t("nazaha.reporterAddress")}
                value={reporter.reporter_address}
                wide
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};
