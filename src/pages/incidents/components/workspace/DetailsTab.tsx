import { lazy, Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  GitMerge,
  MapPin,
  Maximize2,
  Paperclip,
  Pen,
  Phone,
  Smartphone,
  TriangleAlert,
  User,
  X,
  ZoomIn,
} from "lucide-react";
import { cn, getLocalizedName } from "@/lib/utils";
import RenderWithIncidentMentions from "@/components/common/RenderWithIncidentMentions";
// Lazy-loaded: map vendor code only downloads with this component.
const NearbyIncidents = lazy(
  () => import("../../../../components/incidents/NearbyIncidents"),
);
import { incidentApi } from "../../../../api/admin";
import { usePermissions } from "../../../../hooks/usePermissions";
import { PERMISSIONS } from "../../../../constants/permissions";
// Lazy-loaded: Leaflet only downloads when a map is viewed.
const SingleLocationMap = lazy(
  () => import("../../../../components/maps/SingleLocationMap"),
);

function MapLoadingFallback() {
  return (
    <div className="absolute inset-0 animate-pulse bg-[hsl(var(--muted)/0.6)]" />
  );
}
import {
  Modal,
  ModalBody,
  ModalHeader,
  ModalTitle,
} from "../../../../components/ui";
import type {
  Incident,
  IncidentAttachment,
  LookupValue,
  TransitionHistory,
  ValidationRules,
} from "../../../../types";
import {
  actorName,
  actorRole,
  copyText,
  expiryCountdown,
  formatActivityDateTime,
  getAttachmentPreviewUrl,
  getAttachmentUrl,
} from "./workspaceUtils";

function PersonRow({
  label,
  entry,
  tone,
}: {
  label: string;
  entry?: TransitionHistory;
  tone: "emerald" | "cyan" | "rose";
}) {
  const actorDisplayName = actorName(entry);
  const role = actorRole(entry);
  const avatar =
    tone === "emerald"
      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
      : tone === "cyan"
        ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-700 dark:text-cyan-400"
        : "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300";
  return (
    <div>
      <span className="text-[10px] text-[hsl(var(--muted-foreground))] block leading-tight">
        {label}
      </span>
      <div className="flex items-center gap-1.5 mt-0.5">
        <div
          className={cn(
            "w-5 h-5 rounded border font-mono text-[9px] font-bold flex items-center justify-center shrink-0",
            avatar,
          )}
        >
          {(actorDisplayName.trim()[0] || "?").toUpperCase()}
        </div>
        <span className="text-xs font-semibold text-[hsl(var(--foreground))] leading-tight truncate">
          {actorDisplayName}
        </span>
        {role ? (
          <span className="text-[9px] text-[hsl(var(--muted-foreground))] font-mono ms-auto shrink-0">
            {role}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function parseAllowMultiple(validationRules?: string): boolean {
  if (!validationRules) return false;
  try {
    const rules = JSON.parse(validationRules) as ValidationRules;
    return !!rules.allowMultiple;
  } catch {
    return false;
  }
}

function formatVisitDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// "Allow multiple values" lookup categories (e.g. Visit Number): latest
// value as a chip, older ones behind "+N more", hover shows the visit date
// and incident status at recording time — same as IncidentDetailPage.
function VisitNumberChipGroup({
  categoryLabel,
  values,
  visitInfo,
}: {
  categoryLabel: string;
  values: LookupValue[];
  visitInfo: Record<string, { date: string; status: string }>;
}) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(
    () =>
      [...values].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [values],
  );
  const [latest, ...rest] = sorted;

  const displayName = (value: LookupValue) =>
    i18n.language === "ar" && value.name_ar ? value.name_ar : value.name;

  const chipTooltip = (value: LookupValue) => {
    const info = visitInfo[`lookup:${value.category?.code}:${value.name}`];
    if (!info) return undefined;
    return `${formatVisitDateTime(info.date)} · ${info.status}`;
  };

  if (!latest) return null;
  return (
    <div>
      <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
        {categoryLabel}{" "}
        <span className="text-primary normal-case">({values.length})</span>
      </span>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <span
          title={chipTooltip(latest)}
          className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-mono font-bold border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
        >
          {displayName(latest)}
        </span>
        {rest.length > 0 ? (
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
            ({t("incidents.latest", "latest")})
          </span>
        ) : null}
        {rest.length > 0 &&
          (expanded ? (
            <>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {rest.map((value, i) => (
                  <span key={value.id}>
                    {i > 0 && ", "}
                    <span title={chipTooltip(value)}>{displayName(value)}</span>
                  </span>
                ))}
              </span>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-[11px] text-[hsl(var(--muted-foreground))] hover:underline"
              >
                {t("common.showLess", "Show less")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-[11px] text-primary hover:underline"
            >
              +{rest.length} {t("common.more", "more")}
            </button>
          ))}
      </div>
    </div>
  );
}

/* Details tab — description + attachments, GIS map, caller & reporter,
   approval history. Same data and flows as IncidentDetailPage. */
export function DetailsTab({
  incident,
  attachments,
  approvals,
  rejections,
  slaDays,
  onPreviewAttachment,
  mergedIncidents,
}: {
  incident: Incident;
  attachments: IncidentAttachment[];
  approvals: TransitionHistory[];
  rejections: TransitionHistory[];
  slaDays: number | null;
  onPreviewAttachment: (attachmentId: string) => void;
  mergedIncidents: Incident[];
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [locationMapModalOpen, setLocationMapModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  // Description-only edit on terminal states — same narrow permission as
  // IncidentDetailPage (incidents:edit-closed).
  const canEditClosedDescription =
    incident.current_state?.state_type === "terminal" &&
    hasPermission(PERMISSIONS.INCIDENTS_EDIT_CLOSED);

  const updateClosedSummaryMutation = useMutation({
    mutationFn: (description: string) =>
      incidentApi.updateClosedSummary(incident.id, {
        description,
        reason: "Updated via IMS interface",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["incidents", "v2-list"],
      });
      toast.success(t("incidents.summaryUpdatedSuccessfully"));
      setIsEditingDescription(false);
      setIsSavingDescription(false);
    },
    onError: () => {
      toast.error(t("incidents.saveFailed"));
      setIsSavingDescription(false);
    },
  });

  const locName = getLocalizedName(incident.location);
  const coords =
    incident.latitude != null && incident.longitude != null
      ? `${Number(incident.latitude).toFixed(4)}° N, ${Number(incident.longitude).toFixed(4)}° E`
      : "GIS —";
  const hasCoords = incident.latitude != null && incident.longitude != null;
  // Reporter display mirrors IncidentDetailPage: user object first
  // (full name → username), flat snapshot fields as fallback.
  const address =
    incident.address || locName !== "—"
      ? incident.address || locName
      : incident.city || "—";
  const reporterName =
    [
      incident.reporter?.first_name,
      incident.reporter?.middle_name,
      incident.reporter?.last_name,
    ]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ") ||
    incident.reporter?.username ||
    incident.reporter_name ||
    t("common.unknown", "Unknown");
  const reporterEmail =
    incident.reporter?.email || incident.reporter_email || "";
  const reporterPhone =
    incident.reporter?.phone || incident.reporter_phone || "";
  const reporterAltPhone = incident.reporter?.alternate_mobile || "";

  // Dynamic lookup values grouped by category — same as IncidentDetailPage.
  const groupedLookupValues = useMemo(() => {
    if (!incident?.lookup_values) return {} as Record<string, LookupValue[]>;
    return incident.lookup_values.reduce(
      (acc, value) => {
        const categoryName = value.category?.name || "Other";
        if (!acc[categoryName]) acc[categoryName] = [];
        acc[categoryName].push(value);
        return acc;
      },
      {} as Record<string, LookupValue[]>,
    );
  }, [incident?.lookup_values]);

  // Correlate each lookup value back to the status_changed revision that
  // recorded it (visit date + status for hover tooltips).
  const { data: statusChangeRevisionsData } = useQuery({
    queryKey: ["incidents", "v2-list", "lookup-revisions", incident.id],
    queryFn: () =>
      incidentApi.getRevisions(incident.id, {
        action_type: "status_changed",
        limit: 200,
      }),
    enabled: !!incident.id,
    staleTime: 120_000,
  });

  const lookupValueVisitInfo = useMemo(() => {
    const map: Record<string, { date: string; status: string }> = {};
    const revs = statusChangeRevisionsData?.data ?? [];
    for (const rev of revs) {
      const statusChange = rev.changes?.find(
        (c) => c.field_name === "current_state_id",
      );
      const status = statusChange?.new_value || "";
      for (const change of rev.changes ?? []) {
        if (!change.field_name.startsWith("lookup:") || !change.new_value) {
          continue;
        }
        const key = `${change.field_name}:${change.new_value}`;
        if (!map[key] || new Date(rev.created_at) > new Date(map[key].date)) {
          map[key] = { date: rev.created_at, status };
        }
      }
    }
    return map;
  }, [statusChangeRevisionsData]);

  // Caller Information visibility — same gate as IncidentDetailPage:
  // hidden on EPM940 except for web source, and only with contact data.
  const lookupGroups = Object.entries(groupedLookupValues);
  const isEPM940Client =
    window.APP_CONFIG?.CLIENT === "EPM940" ||
    import.meta.env.VITE_CLIENT === "EPM940";
  const showCallerInfo =
    (!isEPM940Client || incident.source?.toLowerCase() === "web") &&
    !!(
      incident.reporter_name ||
      incident.reporter_email ||
      incident.reporter_phone
    );

  // Location recurrence — same searchNearby source as IncidentDetailPage.
  const configuredRadius =
    window.APP_CONFIG?.NEARBY_INCIDENT_RADIUS_METERS ||
    import.meta.env.VITE_NEARBY_INCIDENT_RADIUS_METERS;
  const recurrenceEnabled = !!configuredRadius;
  const recurrenceRadius = Number(configuredRadius || 500);
  const [recurrencePage, setRecurrencePage] = useState(1);
  const {
    data: recurrenceData,
    isLoading: recurrenceLoading,
    isError: recurrenceError,
  } = useQuery({
    queryKey: [
      "incidents",
      "v2-list",
      "recurrence",
      incident.id,
      recurrencePage,
    ],
    queryFn: () =>
      incidentApi.searchNearby({
        incidentId: incident.id,
        limit: 20,
        page: recurrencePage,
        radius: recurrenceRadius,
        recurrence_of_incident_id: incident.id,
      }),
    enabled:
      recurrenceEnabled &&
      typeof incident.latitude === "number" &&
      typeof incident.longitude === "number",
    staleTime: 60_000,
  });
  const recurrenceTotal = recurrenceData?.total_items ?? 0;
  const recurrenceItems = recurrenceData?.data ?? [];

  // Nearby = separate card under the description; hide it entirely when the
  // feature is not configured or the incident has no coordinates/classification.
  const showNearbyCard =
    recurrenceEnabled &&
    incident.latitude != null &&
    incident.longitude != null &&
    !!incident.classification?.id;

  // Pre-expiry warning banners — same conditions as IncidentDetailPage:
  // shown only while 0 < hours left <= 24.
  const rtcExpiry = expiryCountdown(
    incident.ready_to_close_expires_at,
    incident.current_state?.is_ready_to_close,
  );
  const partialExpiry = expiryCountdown(
    incident.partial_close_expires_at,
    incident.current_state?.is_partial_close,
  );

  return (
    <>
      {rtcExpiry ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5 shadow-sm">
          <TriangleAlert className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              {t("incidents.readyToCloseExpiringIn")} {rtcExpiry.label}
            </p>
            <p className="text-xs text-amber-800/70 dark:text-amber-800 dark:text-amber-200/70 mt-0.5">
              {t("incidents.thisIncidentWillAutomaticallyRevertIfNot")}{" "}
              <strong>{rtcExpiry.at}</strong>.
              {incident.ready_to_close_duration &&
                ` Duration selected: ${incident.ready_to_close_duration}.`}
            </p>
          </div>
        </div>
      ) : null}
      {partialExpiry ? (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 flex items-start gap-2.5 shadow-sm">
          <TriangleAlert className="h-4 w-4 text-orange-700 dark:text-orange-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-orange-800 dark:text-orange-200">
              {t(
                "incidents.partialCloseExpiringIn",
                "Partial Close — Expiring in",
              )}{" "}
              {partialExpiry.label}
            </p>
            <p className="text-xs text-orange-800/70 dark:text-orange-800 dark:text-orange-200/70 mt-0.5">
              {t("incidents.thisIncidentWillAutomaticallyRevertIfNot")}{" "}
              <strong>{partialExpiry.at}</strong>.
              {incident.partial_close_duration &&
                ` Duration selected: ${incident.partial_close_duration}.`}
            </p>
          </div>
        </div>
      ) : null}
      {/* description + nearby + map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-3">
          <div
            className={cn(
              "bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3 flex flex-col shadow-sm min-w-0",
              attachments.length > 4 && "max-h-[20rem] overflow-y-auto",
            )}
          >
            <div className="flex justify-between items-center mb-1.5">
              <h3 className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <FileText className="h-2.5 w-2.5 text-primary" />{" "}
                {t("incidents.incidentDescription")}
              </h3>
              <div className="flex items-center gap-1.5">
                {canEditClosedDescription && !isEditingDescription ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditedDescription(incident.description || "");
                      setIsEditingDescription(true);
                    }}
                    className="p-1 text-[hsl(var(--muted-foreground))] hover:text-primary transition-colors"
                    title={t("incidents.editDescription")}
                    disabled={isSavingDescription}
                  >
                    <Pen className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            </div>
            {isEditingDescription ? (
              <>
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  onBlur={() => {
                    if (editedDescription !== incident.description) {
                      setIsSavingDescription(true);
                      updateClosedSummaryMutation.mutate(editedDescription);
                    } else {
                      setIsEditingDescription(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setEditedDescription(incident.description || "");
                      setIsEditingDescription(false);
                    }
                  }}
                  autoFocus
                  disabled={isSavingDescription}
                  rows={4}
                  className="text-[hsl(var(--muted-foreground))] text-xs leading-relaxed bg-[hsl(var(--muted)/0.5)] p-2.5 rounded-lg border border-[hsl(var(--border))] focus:border-primary/60 focus:outline-none mb-2.5 whitespace-pre-wrap w-full resize-none"
                  placeholder={t("incidents.enterDescription")}
                />
                {isSavingDescription ? (
                  <div className="flex items-center gap-1.5 mb-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-[hsl(var(--border))] border-t-transparent" />
                    {t("users.saving")}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-[hsl(var(--muted-foreground))] text-xs leading-relaxed bg-[hsl(var(--muted)/0.5)] p-2.5 rounded-lg border border-[hsl(var(--border))] mb-2.5 whitespace-pre-wrap">
                {incident.description ? (
                  <RenderWithIncidentMentions text={incident.description} />
                ) : (
                  incident.title || "—"
                )}
              </p>
            )}
            <div className="mb-2.5 border-b border-[hsl(var(--border))]" />
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <Paperclip className="h-2.5 w-2.5 text-primary" />{" "}
                {t("incidents.attachments")}{" "}
                <span className="text-[hsl(var(--muted-foreground))] font-normal text-[11px]">
                  (
                  {t("incidents.attachmentFiles", {
                    count: attachments.length,
                  })}
                  )
                </span>
              </h4>
            </div>
            {attachments.length === 0 ? (
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                {t("incidents.noAttachments")}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {attachments.map((att) => {
                  const preview = getAttachmentPreviewUrl(att.id);
                  const isImg = att.mime_type.startsWith("image/");
                  return (
                    <div
                      key={att.id}
                      className="bg-[hsl(var(--muted)/0.7)] rounded-lg border border-[hsl(var(--border))] overflow-hidden hover:border-primary/40 transition-all group"
                    >
                      <div
                        className={cn(
                          "h-10 bg-[hsl(var(--muted)/0.5)] relative overflow-hidden",
                          isImg && "cursor-pointer",
                        )}
                        onClick={() => {
                          if (isImg) onPreviewAttachment(att.id);
                        }}
                      >
                        {isImg ? (
                          <div
                            className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-300 opacity-80"
                            style={{ backgroundImage: `url('${preview}')` }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        {isImg ? (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="p-1 bg-white/90 rounded-full text-gray-700">
                              <ZoomIn className="h-3 w-3" />
                            </span>
                          </div>
                        ) : null}
                        {/* Download hits the attachment endpoint (not /preview)
                          with the download attr — same as IncidentDetailPage. */}
                        <a
                          href={getAttachmentUrl(att.id)}
                          download={att.file_name}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute bottom-1 end-1 bg-[hsl(var(--muted)/0.9)] hover:bg-primary text-[hsl(var(--muted-foreground))] hover:text-primary-foreground w-4 h-4 rounded flex items-center justify-center transition-colors shadow"
                          title={t("common.download")}
                        >
                          <Download className="h-2 w-2" />
                        </a>
                      </div>
                      <div className="p-1 text-xs leading-tight">
                        <div className="font-semibold text-[hsl(var(--foreground))] truncate text-[10px]">
                          {att.file_name}
                        </div>
                        <div className="text-[hsl(var(--muted-foreground))] text-[9px] mt-0.5 truncate">
                          {(att.file_size / 1024 / 1024).toFixed(1)} MB ·{" "}
                          {att.uploaded_by?.first_name ||
                            att.uploaded_by?.username ||
                            "—"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {showNearbyCard ? (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3 shadow-sm">
              <Suspense fallback={null}>
                <NearbyIncidents
                  incidentId={incident.id}
                  latitude={incident.latitude}
                  longitude={incident.longitude}
                  classificationId={incident.classification?.id}
                  incidentNumber={incident.incident_number}
                  fullWidthPanel
                  fullWidthButton
                />
              </Suspense>
            </div>
          ) : null}
        </div>

        {/* map / GIS — same SingleLocationMap view as IncidentDetailPage,
          constrained to this panel's dimensions */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden flex flex-col shadow-sm min-h-[220px] min-w-0">
          <div className="relative bg-[hsl(var(--muted)/0.5)] overflow-hidden flex-1 min-h-[140px]">
            {hasCoords ? (
              <Suspense fallback={<MapLoadingFallback />}>
                <SingleLocationMap
                  key={`${incident.id}-${incident.latitude}-${incident.longitude}`}
                  latitude={Number(incident.latitude)}
                  longitude={Number(incident.longitude)}
                />
              </Suspense>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-4 text-center">
                <MapPin className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                  {t("incidents.noCoordinates")}
                </p>
              </div>
            )}
            <div className="absolute bottom-1 end-2 bg-[hsl(var(--muted)/0.9)] border border-[hsl(var(--border))] rounded px-1.5 py-0.5 text-[9px] font-mono text-primary shadow z-10 pointer-events-none">
              GIS {coords}
            </div>
            {hasCoords ? (
              <button
                type="button"
                onClick={() => setLocationMapModalOpen(true)}
                className="absolute top-2 end-2 z-10 p-1 bg-[hsl(var(--muted)/0.9)] border border-[hsl(var(--border))] rounded-md shadow hover:bg-[hsl(var(--muted))] transition-all text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                title={t("locationPicker.expandMap", "Expand map")}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <div className="p-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)]">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5 text-primary">
                <MapPin className="h-2.5 w-2.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block leading-none">
                  {t("incidents.fullAddress")}
                </span>
                <p className="text-xs text-[hsl(var(--foreground))] leading-snug font-medium mt-0.5">
                  {address}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* caller & reporter + approval history */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Card 1: Caller & Reporter */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 flex flex-col shadow-sm justify-start min-w-0">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[hsl(var(--border))]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <Phone className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-xs font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider leading-none">
                {t("incidents.callerAndReporter")}
              </h3>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-xs w-full">
            <div className="bg-[hsl(var(--muted)/0.6)] border border-[hsl(var(--border))] rounded-lg p-2.5 flex flex-col space-y-2 hover:border-[hsl(var(--border))] transition-all justify-start w-full">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono font-semibold text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded">
                  <Phone className="h-2 w-2" /> {t("incidents.caller")}
                </span>
              </div>
              {/* caller = form-entered contact snapshot, same flat
                        fields as the old Caller Information section */}
              <div className="space-y-1.5">
                <div>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] block leading-tight">
                    {t("common.name")}
                  </span>
                  <span className="text-xs font-bold text-[hsl(var(--foreground))] leading-tight">
                    {showCallerInfo && incident.reporter_name
                      ? incident.reporter_name
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] block leading-tight">
                    {t("incidents.phoneLabel")}
                  </span>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    {showCallerInfo && incident.reporter_phone ? (
                      <a
                        className="text-primary font-mono text-xs font-medium hover:underline flex items-center gap-1 truncate"
                        href={`tel:${incident.reporter_phone}`}
                      >
                        <Smartphone className="h-2.5 w-2.5 text-[hsl(var(--muted-foreground))] shrink-0" />
                        <span className="truncate">
                          {incident.reporter_phone}
                        </span>
                      </a>
                    ) : (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        —
                      </span>
                    )}
                    {showCallerInfo && incident.reporter_phone ? (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!incident.reporter_phone) return;
                          if (await copyText(incident.reporter_phone)) {
                            toast.success(t("incidents.copied"));
                          } else {
                            toast.error(t("incidents.copyFailed"));
                          }
                        }}
                        className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--muted-foreground))] p-0.5 transition-colors shrink-0"
                        title={t("incidents.copyPhone")}
                      >
                        <Copy className="h-2.5 w-2.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] block leading-tight">
                    {t("incidents.email")}
                  </span>
                  {showCallerInfo && incident.reporter_email ? (
                    <a
                      className="text-[hsl(var(--foreground))] font-mono text-[11px] font-medium hover:text-primary hover:underline truncate block leading-tight mt-0.5"
                      href={`mailto:${incident.reporter_email}`}
                      title={incident.reporter_email}
                    >
                      {incident.reporter_email}
                    </a>
                  ) : (
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      —
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-[hsl(var(--muted)/0.6)] border border-[hsl(var(--border))] rounded-lg p-2.5 flex flex-col space-y-2 hover:border-[hsl(var(--border))] transition-all justify-start w-full">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono font-semibold text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded">
                  <User className="h-2 w-2 text-primary" />{" "}
                  {t("incidents.reporter")}
                </span>
              </div>
              <div className="space-y-1.5">
                <div>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] block leading-tight">
                    {t("common.name")}
                  </span>
                  <span className="text-xs font-bold text-[hsl(var(--foreground))] leading-tight">
                    {reporterName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] block leading-tight">
                    {t("incidents.phoneLabel")}
                  </span>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    {reporterPhone ? (
                      <a
                        className="text-primary font-mono text-xs font-medium hover:underline flex items-center gap-1 truncate"
                        href={`tel:${reporterPhone}`}
                      >
                        <Smartphone className="h-2.5 w-2.5 text-[hsl(var(--muted-foreground))] shrink-0" />
                        <span className="truncate">{reporterPhone}</span>
                      </a>
                    ) : (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        —
                      </span>
                    )}
                    {reporterPhone ? (
                      <button
                        type="button"
                        onClick={async () => {
                          if (await copyText(reporterPhone)) {
                            toast.success(t("incidents.copied"));
                          } else {
                            toast.error(t("incidents.copyFailed"));
                          }
                        }}
                        className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--muted-foreground))] p-0.5 transition-colors shrink-0"
                        title={t("incidents.copyPhone")}
                      >
                        <Copy className="h-2.5 w-2.5" />
                      </button>
                    ) : null}
                  </div>
                  {reporterAltPhone ? (
                    <div className="flex items-center justify-between gap-1 mt-1">
                      <a
                        className="text-primary font-mono text-xs font-medium hover:underline flex items-center gap-1 truncate"
                        href={`tel:${reporterAltPhone}`}
                        title={t(
                          "users.alternateMobile",
                          "Alternate Mobile Number",
                        )}
                      >
                        <Smartphone className="h-2.5 w-2.5 text-[hsl(var(--muted-foreground))] shrink-0" />
                        <span className="truncate">{reporterAltPhone}</span>
                      </a>
                    </div>
                  ) : null}
                </div>
                <div>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] block leading-tight">
                    {t("incidents.email")}
                  </span>
                  {reporterEmail ? (
                    <a
                      className="text-[hsl(var(--foreground))] font-mono text-[11px] font-medium hover:text-primary hover:underline truncate block leading-tight mt-0.5"
                      href={`mailto:${reporterEmail}`}
                      title={reporterEmail}
                    >
                      {reporterEmail}
                    </a>
                  ) : (
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      —
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Approval history */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 flex flex-col justify-between shadow-sm min-w-0">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[hsl(var(--border))]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <BadgeCheck className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-xs font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider leading-none">
                {t("incidents.approvalHistory")}
              </h3>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-xs mb-2 w-full">
            <div className="bg-[hsl(var(--muted)/0.6)] border border-[hsl(var(--border))] rounded-lg p-2.5 flex flex-col space-y-2 hover:border-[hsl(var(--border))] transition-all w-full">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                  <CheckCheck className="h-2 w-2" /> {t("incidents.approvals")}
                </span>
              </div>
              <div className="space-y-2">
                <PersonRow
                  label={t("incidents.firstApprovedBy")}
                  entry={approvals[0]}
                  tone="emerald"
                />
                {approvals.length > 1 ? (
                  <div className="pt-1 border-t border-[hsl(var(--border))]">
                    <PersonRow
                      label={t("incidents.lastApprovedBy")}
                      entry={approvals[approvals.length - 1]}
                      tone="cyan"
                    />
                  </div>
                ) : null}
                {approvals.length === 0 ? (
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    {t("incidents.noApprovalsYet")}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="bg-[hsl(var(--muted)/0.6)] border border-[hsl(var(--border))] rounded-lg p-2.5 flex flex-col space-y-2 hover:border-[hsl(var(--border))] transition-all w-full">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono font-semibold text-rose-700 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                  <X className="h-2 w-2" /> {t("incidents.rejections")}
                </span>
              </div>
              <div className="space-y-2">
                <PersonRow
                  label={t("incidents.firstRejectedBy")}
                  entry={rejections[0]}
                  tone="rose"
                />
                {rejections.length > 1 ? (
                  <div className="pt-1 border-t border-[hsl(var(--border))]">
                    <PersonRow
                      label={t("incidents.lastRejectedBy")}
                      entry={rejections[rejections.length - 1]}
                      tone="rose"
                    />
                  </div>
                ) : null}
                {rejections.length === 0 ? (
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    {t("incidents.noRejections")}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          {incident.sla_breached ? (
            <div className="bg-rose-500/10 dark:bg-rose-950/20 border border-rose-500/30 rounded-lg p-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-700 dark:text-rose-400 shrink-0">
                  <TriangleAlert className="h-2.5 w-2.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider block leading-none">
                    {t("incidents.slaPerformance")}
                  </span>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] leading-tight">
                    {t("incidents.breachedMilestone")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-rose-500/10 dark:bg-rose-950/50 border border-rose-600/40 rounded px-2 py-0.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                <span className="text-rose-700 dark:text-rose-300 font-mono font-bold text-xs">
                  -{slaDays != null ? Math.max(slaDays, 0) : 0} days
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                  <CheckCheck className="h-2.5 w-2.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block leading-none">
                    {t("incidents.slaPerformance")}
                  </span>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] leading-tight">
                    {t("incidents.withinMilestone")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 dark:bg-emerald-950/50 border border-emerald-600/40 rounded px-2 py-0.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs">
                  {t("incidents.onTrack")}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* merged incidents — browsable list, same as IncidentDetailPage */}
      {mergedIncidents.length > 0 ? (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 shadow-sm min-w-0">
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[hsl(var(--border))]">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <GitMerge className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-xs font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider leading-none">
              {t("incidents.merge.mergedIncidents")} ({mergedIncidents.length})
            </h3>
          </div>
          <div className="space-y-2">
            {mergedIncidents.map((merged) => (
              <div
                key={merged.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[hsl(var(--muted)/0.6)] border border-[hsl(var(--border))]"
              >
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/incidents/${merged.id}`)}
                    className="font-medium text-xs text-primary hover:text-primary hover:underline truncate block text-start"
                  >
                    {merged.incident_number} - {merged.title}
                  </button>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    {t("incidents.status")}:{" "}
                    {getLocalizedName(merged.current_state) || "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/incidents/${merged.id}`)}
                  className="px-2.5 py-1 bg-[hsl(var(--muted)/0.8)] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors text-[11px] font-medium shrink-0"
                >
                  {t("common.view")}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* dynamic lookup values */}
      {lookupGroups.length > 0 ? (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 shadow-sm min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lookupGroups.map(([category, values]) => {
              const typedValues = values as LookupValue[];
              const categoryLabel =
                i18n.language === "ar"
                  ? typedValues[0]?.category?.name_ar || category
                  : category;
              if (
                parseAllowMultiple(typedValues[0]?.category?.validation_rules)
              ) {
                return (
                  <VisitNumberChipGroup
                    key={category}
                    categoryLabel={categoryLabel}
                    values={typedValues}
                    visitInfo={lookupValueVisitInfo}
                  />
                );
              }
              return (
                <div key={category} className="min-w-0">
                  <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    {categoryLabel}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {typedValues.map((value) => (
                      <span
                        key={value.id}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border border-transparent"
                        style={
                          value.color
                            ? {
                                backgroundColor: `${value.color}20`,
                                color: value.color,
                                borderColor: `${value.color}50`,
                              }
                            : undefined
                        }
                      >
                        <RenderWithIncidentMentions
                          text={
                            i18n.language === "ar" && value.name_ar
                              ? value.name_ar
                              : value.name
                          }
                        />
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* location recurrence — same banner + history as IncidentDetailPage */}
      {recurrenceEnabled &&
      (recurrenceLoading || recurrenceError || recurrenceData) ? (
        <div className="space-y-3">
          {recurrenceTotal > 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-start gap-2.5">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-1.5 text-amber-700 dark:text-amber-400 shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-bold text-[hsl(var(--foreground))]">
                      {t("incidents.locationRecurrence.title")} :
                    </h3>
                    <span className="text-xs font-medium text-[hsl(var(--foreground))]">
                      {t(
                        recurrenceTotal === 1
                          ? "incidents.locationRecurrence.oneOccurrence"
                          : "incidents.locationRecurrence.multipleOccurrences",
                        { count: recurrenceTotal },
                      )}
                    </span>
                    <span className="rounded-full border border-amber-500/40 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      {t("incidents.locationRecurrence.recurrenceOf", {
                        incidentNumber: incident.incident_number,
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                    {t("incidents.locationRecurrence.coordinates", {
                      radius: recurrenceRadius,
                      latitude: incident.latitude?.toFixed(6),
                      longitude: incident.longitude?.toFixed(6),
                    })}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 shadow-sm min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                <h3 className="text-xs font-bold uppercase text-[hsl(var(--foreground))]">
                  {t("incidents.locationRecurrence.inspectionHistory")}
                </h3>
              </div>
              <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                {t("incidents.locationRecurrence.radius", {
                  radius: recurrenceRadius,
                })}
              </span>
            </div>

            {recurrenceLoading ? (
              <p className="py-3 text-xs text-[hsl(var(--muted-foreground))]">
                {t("common.loading")}
              </p>
            ) : recurrenceError ? (
              <p className="py-3 text-xs text-rose-700 dark:text-rose-400">
                {t("incidents.locationRecurrence.error")}
              </p>
            ) : recurrenceItems.length === 0 ? (
              <p className="py-3 text-xs text-[hsl(var(--muted-foreground))]">
                {t("incidents.locationRecurrence.empty")}
              </p>
            ) : (
              <div className="max-h-[280px] space-y-2 overflow-y-auto overscroll-contain pe-1">
                {recurrenceItems.map((item) => (
                  <Link
                    key={item.id}
                    to={`/incidents/${item.id}`}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] px-3 py-2.5 hover:bg-[hsl(var(--muted)/0.6)] transition-colors"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-3">
                      <span className="rounded bg-[hsl(var(--muted))] px-2 py-1 text-[11px] font-semibold text-[hsl(var(--foreground))]">
                        {item.classification_name}
                      </span>
                      <span className="font-mono text-xs font-bold text-primary">
                        {item.incident_number}
                      </span>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {item.location_name || "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status.toLowerCase().includes("closed") ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                      ) : null}
                      <span
                        className="rounded px-2 py-1 text-[11px] font-medium text-white"
                        style={{
                          backgroundColor: item.status_color || "#6b7280",
                        }}
                      >
                        {item.status}
                      </span>
                      <time className="text-[11px] text-[hsl(var(--muted-foreground))] font-mono">
                        {formatActivityDateTime(item.created_at)}
                      </time>
                    </div>
                  </Link>
                ))}
                {(recurrenceData?.total_pages ?? 1) > 1 ? (
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-[hsl(var(--muted-foreground))]">
                      {t("incidents.locationRecurrence.page", {
                        page: recurrenceData?.page,
                        totalPages: recurrenceData?.total_pages,
                      })}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setRecurrencePage((p) => Math.max(1, p - 1))
                        }
                        disabled={recurrencePage <= 1}
                        aria-label={t("common.previous")}
                        className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.8)] p-1.5 text-[hsl(var(--muted-foreground))] disabled:opacity-40 hover:bg-[hsl(var(--muted))] transition-colors"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRecurrencePage((p) =>
                            Math.min(recurrenceData?.total_pages ?? p, p + 1),
                          )
                        }
                        disabled={
                          recurrencePage >= (recurrenceData?.total_pages ?? 1)
                        }
                        aria-label={t("common.next")}
                        className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.8)] p-1.5 text-[hsl(var(--muted-foreground))] disabled:opacity-40 hover:bg-[hsl(var(--muted))] transition-colors"
                      >
                        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Wide map view — same popup as IncidentDetailPage. */}
      {hasCoords ? (
        <Modal
          isOpen={locationMapModalOpen}
          onClose={() => setLocationMapModalOpen(false)}
          size="full"
          className="max-h-[92vh]"
        >
          <ModalHeader>
            <ModalTitle>{t("incidents.geolocation", "Geolocation")}</ModalTitle>
          </ModalHeader>
          <ModalBody className="overflow-y-auto">
            <div className="space-y-4">
              <div className="relative h-[65vh] min-h-[420px] rounded-lg overflow-hidden border border-[hsl(var(--border))]">
                <Suspense fallback={<MapLoadingFallback />}>
                  <SingleLocationMap
                    key={`modal-${incident.id}-${incident.latitude}-${incident.longitude}`}
                    latitude={Number(incident.latitude)}
                    longitude={Number(incident.longitude)}
                    scrollWheelZoom
                    showMapControls
                  />
                </Suspense>
              </div>

              <div className="rounded-lg bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] p-4 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-[hsl(var(--foreground))]">
                      {Number(incident.latitude).toFixed(6)},{" "}
                      {Number(incident.longitude).toFixed(6)}
                    </p>
                    {incident.address ? (
                      <p className="mt-1 text-[hsl(var(--muted-foreground))] break-words">
                        {incident.address}
                      </p>
                    ) : null}
                    {incident.city ||
                    incident.state ||
                    incident.country ||
                    incident.postal_code ? (
                      <p className="mt-1 text-[hsl(var(--muted-foreground))]">
                        {[
                          incident.city,
                          incident.state,
                          incident.country,
                          incident.postal_code,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </ModalBody>
        </Modal>
      ) : null}
    </>
  );
}
