import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Boxes,
  Clock,
  FileText,
  Flame,
  MapPin,
  Smartphone,
  Star,
  TriangleAlert,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../../components/ui";
import { Modal, ModalBody, ModalFooter } from "../../components/ui/Modal";
import { DUMMY_FIRE_STATIONS } from "../../api/dispatcher";
import { AssociateFireStationsModal } from "./AssociateFireStationsModal";
import { STATUS_COLORS, type DummyIncident } from "./dummyIncidents";

const tile =
  "rounded-lg p-2 min-w-0 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))]";
const tileLabel =
  "text-[10px] flex items-center gap-1 mb-1 font-medium truncate text-[hsl(var(--muted-foreground))]";
const card =
  "bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3 shadow-sm min-w-0";
const cardTitle =
  "text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5 mb-2";

const PRIORITY_TEXT: Record<number, string> = {
  1: "text-emerald-600",
  2: "text-amber-600",
  3: "text-orange-600",
  4: "text-rose-600",
};

type TabKey = "details" | "attachments" | "comments" | "activity";

const fmt = (iso: string) => new Date(iso).toLocaleString();

/**
 * Incident details modal laid out like the incident management workspace
 * (status/SLA/number header, meta tiles, tabs). DUMMY data, no API.
 */
export function IncidentDetailModal({
  incident,
  onClose,
  onAssociate,
}: {
  incident: DummyIncident;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars
  onAssociate: (stationIds: string[]) => void;
}) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<TabKey>("details");
  const [associateOpen, setAssociateOpen] = useState(false);
  const associated = DUMMY_FIRE_STATIONS.filter((s) =>
    incident.fireStationIds.includes(s.id),
  );
  const color = STATUS_COLORS[incident.status];
  const stateName = {
    waiting: t("dispatcher.waitingForDispatch", "Waiting for dispatch"),
    dispatched: t("dispatcher.dispatched", "Dispatched"),
    resolved: t("dispatcher.resolved", "Resolved"),
    completed: t("dispatcher.completed", "Completed"),
  }[incident.status];

  const tabs: { key: TabKey; label: string }[] = [
    { key: "details", label: t("incidents.details", "Details") },
    { key: "attachments", label: t("incidents.attachments", "Attachments") },
    { key: "comments", label: t("incidents.comments", "Comments") },
    { key: "activity", label: t("incidents.activity", "Activity") },
  ];

  const field = (label: string, value: string) => (
    <div className="min-w-0">
      <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
        {label}
      </div>
      <div className="text-xs font-semibold truncate">{value}</div>
    </div>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="full"
      className="max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
    >
      <ModalBody className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* header */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 text-white"
            style={{ background: color }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {stateName}
          </span>
          {incident.slaBreached ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-700 text-[11px] font-bold border border-rose-600/40">
              <TriangleAlert className="h-2.5 w-2.5" />
              {t("incidents.slaBreached", "SLA breached")}
            </span>
          ) : null}
          <div className="flex items-center gap-2 bg-[hsl(var(--muted)/0.7)] px-2.5 py-1 rounded-lg border border-[hsl(var(--border))]">
            <span className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium">
              {t("incidents.incident", "Incident")}:
            </span>
            <span className="text-xs font-bold font-mono">
              {incident.number}
            </span>
          </div>
        </div>

        {/* meta tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pb-3 border-b border-[hsl(var(--border))]">
          <div className={tile}>
            <div className={tileLabel}>
              <Clock className="h-2.5 w-2.5 text-primary" />
              {t("incidents.created", "Created")}
            </div>
            <div className="text-xs font-semibold">
              {fmt(incident.reportedAt)}
            </div>
          </div>
          <div
            className={cn(
              tile,
              incident.slaBreached && "bg-rose-500/10 border-rose-500/30",
            )}
          >
            <div className={tileLabel}>
              <TriangleAlert className="h-2.5 w-2.5 text-primary" />
              SLA Deadline
            </div>
            <div className="text-xs font-semibold">
              {fmt(incident.slaDeadline)}
            </div>
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
              {incident.slaBreached ? "Breached" : "Within SLA"}
            </div>
          </div>
          <div className={tile}>
            <div className={tileLabel}>
              <Star className="h-2.5 w-2.5 text-amber-600" />
              {t("incidents.priority", "Priority")}
            </div>
            <div
              className={cn(
                "text-xs font-semibold",
                PRIORITY_TEXT[incident.priority],
              )}
            >
              {incident.priorityName}
            </div>
          </div>
          <div className={tile}>
            <div className={tileLabel}>
              <Smartphone className="h-2.5 w-2.5 text-primary" />
              {t("incidents.source", "Source")}
            </div>
            <div className="text-xs font-semibold truncate">
              {incident.source}
            </div>
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
              {incident.channel}
            </div>
          </div>
          <div className={tile}>
            <div className={tileLabel}>
              <Boxes className="h-2.5 w-2.5 text-primary" />
              {t("incidents.department", "Department")}
            </div>
            <div className="text-xs font-semibold truncate">
              {incident.department}
            </div>
          </div>
          <div className={tile}>
            <div className={tileLabel}>
              <MapPin className="h-2.5 w-2.5 text-primary" />
              {t("incidents.location", "Location")}
            </div>
            <div className="text-xs font-semibold truncate">
              {incident.location}
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="flex gap-1 border-b border-[hsl(var(--border))]">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              type="button"
              onClick={() => setTab(tb.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold -mb-px",
                tab === tb.key
                  ? "border-b-2 border-primary text-primary"
                  : "text-[hsl(var(--muted-foreground))]",
              )}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {tab === "details" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className={card}>
              <h3 className={cardTitle}>
                <FileText className="h-2.5 w-2.5 text-primary" />
                {t("incidents.incidentDescription", "Incident description")}
              </h3>
              <p className="text-xs font-semibold mb-1">
                {i18n.language === "ar" ? incident.title_ar : incident.title}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] whitespace-pre-wrap">
                {incident.description}
              </p>
            </div>
            <div className={cn(card, "lg:col-span-2")}>
              <h3 className={cardTitle}>
                <Flame className="h-2.5 w-2.5 text-red-600" />
                {t(
                  "dispatcher.associatedFireStations",
                  "Associated fire stations",
                )}
              </h3>
              {associated.length === 0 ? (
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {t(
                    "dispatcher.noFireStations",
                    "No fire stations associated",
                  )}
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {associated.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-md border border-[hsl(var(--border))] px-2 py-1 text-xs font-medium"
                    >
                      {i18n.language === "ar" && s.name_ar ? s.name_ar : s.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className={card}>
              <h3 className={cardTitle}>
                <User className="h-2.5 w-2.5 text-primary" />
                {t("incidents.callerReporter", "Caller & Reporter")}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {field(t("incidents.name", "Name"), incident.reporter.name)}
                {field(t("incidents.phone", "Phone"), incident.reporter.phone)}
                {field(t("incidents.assignee", "Assignee"), incident.assignee)}
                {field(
                  t("incidents.coordinates", "Coordinates"),
                  `${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}`,
                )}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "attachments" ? (
          <div
            className={cn(card, "text-xs text-[hsl(var(--muted-foreground))]")}
          >
            {t("incidents.noAttachments", "No attachments")}
          </div>
        ) : null}

        {tab === "comments" ? (
          <div className="space-y-2">
            {incident.comments.map((c, idx) => (
              <div key={idx} className={card}>
                <div className="flex justify-between text-[11px]">
                  <span className="font-semibold">{c.author}</span>
                  <span className="text-[hsl(var(--muted-foreground))]">
                    {fmt(c.at)}
                  </span>
                </div>
                <p className="mt-1 text-xs">{c.text}</p>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "activity" ? (
          <ul className={cn(card, "space-y-2")}>
            {incident.activity.map((a, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="font-medium">{a.text}</span>
                <span className="ms-auto text-[hsl(var(--muted-foreground))]">
                  {fmt(a.at)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </ModalBody>
      <ModalFooter className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          {t("common.close", "Close")}
        </Button>
      </ModalFooter>
      {associateOpen ? (
        <AssociateFireStationsModal
          associatedIds={incident.fireStationIds}
          onClose={() => setAssociateOpen(false)}
          onConfirm={(ids) => {
            setAssociateOpen(false);
            onAssociate(ids);
          }}
        />
      ) : null}
    </Modal>
  );
}
