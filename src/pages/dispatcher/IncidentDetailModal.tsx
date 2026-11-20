import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Boxes,
  Clock,
  FileText,
  Flame,
  MapPin,
  Plus,
  Smartphone,
  Star,
  Tag,
  TriangleAlert,
  User,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../../components/ui";
import { Modal, ModalBody, ModalFooter } from "../../components/ui/Modal";
import { incidentApi } from "../../api/admin";
import type { AvailableTransition, User as UserType } from "../../types";
import { useFireStations } from "./useDispatchData";
import { AssociateFireStationsModal } from "./AssociateFireStationsModal";
import { ActivityTab } from "../incidents/components/workspace/ActivityTab";
import { AttachmentsTab } from "../incidents/components/workspace/AttachmentsTab";
import { CommentsTab } from "../incidents/components/workspace/CommentsTab";
import { getAttachmentPreviewUrl } from "../incidents/components/workspace/workspaceUtils";
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

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString() : "—";

const userName = (u?: Pick<UserType, "first_name" | "last_name" | "email">) =>
  u
    ? [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "—"
    : "—";

/**
 * Incident details modal laid out like the incident management workspace
 * (status/SLA/number header, meta tiles, tabs). The list row gives an
 * instant first paint; the full incident, its comments and its transition
 * history are then loaded from the incident API.
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
  const { stations } = useFireStations();

  const { data: detailRes } = useQuery({
    queryKey: ["incidents", "dispatcher", "detail", incident.id],
    queryFn: () => incidentApi.getById(incident.id),
  });
  // Same query keys as the incident management workspace, so the shared tabs
  // refresh themselves after an upload / comment.
  const { data: attachmentsRes } = useQuery({
    queryKey: ["incidents", "v2-list", "attachments", incident.id],
    queryFn: () => incidentApi.listAttachments(incident.id),
  });
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["incidents", "v2-list", "comments", incident.id],
    queryFn: () => incidentApi.listCombinedComments(incident.id),
  });
  const { data: historyRes, isLoading: historyLoading } = useQuery({
    queryKey: ["incidents", "dispatcher", "history", incident.id],
    queryFn: () => incidentApi.getHistory(incident.id),
  });
  const queryClient = useQueryClient();
  const { data: transitionsRes, isLoading: transitionsLoading } = useQuery({
    queryKey: ["incidents", "dispatcher", "transitions", incident.id],
    queryFn: () => incidentApi.getAvailableTransitions(incident.id),
  });
  const transitions = transitionsRes?.data ?? [];
  const [selected, setSelected] = useState<AvailableTransition | null>(null);
  const [comment, setComment] = useState("");
  const full = detailRes?.data;
  const unsupportedReqs = (selected?.requirements ?? []).filter(
    (r) =>
      r.is_mandatory &&
      (r.requirement_type === "attachment" ||
        r.requirement_type === "feedback" ||
        r.requirement_type === "rating" ||
        r.requirement_type === "field_value"),
  );
  const commentRequired = (selected?.requirements ?? []).some(
    (r) => r.requirement_type === "comment" && r.is_mandatory,
  );
  const transitionMutation = useMutation({
    mutationFn: () =>
      incidentApi.transition(incident.id, {
        transition_id: selected!.transition.id,
        comment: comment.trim() || undefined,
        version: full?.version ?? 0,
      }),
    onSuccess: () => {
      toast.success(t("incidents.transitionSuccess", "Transition completed"));
      setSelected(null);
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: (e: {
      response?: { data?: { error?: { message?: string }; message?: string } };
    }) =>
      toast.error(
        e?.response?.data?.error?.message ||
          e?.response?.data?.message ||
          t("incidents.transitionFailed", "Transition failed"),
      ),
  });
  const refreshComments = () => {
    void queryClient.invalidateQueries({
      queryKey: ["incidents", "v2-list", "comments", incident.id],
    });
  };
  const [previewId, setPreviewId] = useState<string | null>(null);
  // Oldest first, as the shared Activity / Attachments tabs expect.
  const historyAsc = [...(historyRes?.data ?? [])].sort(
    (a, b) =>
      new Date(a.transitioned_at).getTime() -
      new Date(b.transitioned_at).getTime(),
  );
  const history = [...(historyRes?.data ?? [])].sort(
    (a, b) =>
      new Date(b.transitioned_at).getTime() -
      new Date(a.transitioned_at).getTime(),
  );
  const attachments = attachmentsRes?.data ?? full?.attachments ?? [];
  const assignees = full?.assignees?.length
    ? full.assignees
    : full?.assignee
      ? [full.assignee]
      : [];
  const associated = stations.filter((s) =>
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
    {
      key: "attachments",
      label: `${t("incidents.attachments", "Attachments")} (${attachments.length})`,
    },
    {
      key: "comments",
      label: `${t("incidents.comments", "Comments")} (${comments.length})`,
    },
    {
      key: "activity",
      label: `${t("incidents.activity", "Activity")} (${history.length})`,
    },
  ];

  const field = (label: string, value?: string | null) => (
    <div className="min-w-0">
      <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
        {label}
      </div>
      <div className="text-xs font-semibold break-words">{value || "—"}</div>
    </div>
  );

  const loadingText = (
    <div className={cn(card, "text-xs text-[hsl(var(--muted-foreground))]")}>
      {t("common.loading", "Loading...")}
    </div>
  );

  const stateLabel = full?.current_state?.name ?? stateName;
  const stateColor = full?.current_state?.color ?? color;
  const locationText =
    [
      full?.location?.name,
      full?.address,
      full?.city,
      full?.state,
      full?.country,
    ]
      .filter(Boolean)
      .join(", ") || incident.location;

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="full"
      className="max-w-5xl h-[92vh] flex flex-col overflow-hidden"
    >
      <ModalBody className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* header */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 text-white"
            style={{ background: stateColor }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {stateLabel}
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
          {full?.workflow?.name ? (
            <span className="rounded-md border border-[hsl(var(--border))] px-2 py-1 text-[11px] text-[hsl(var(--muted-foreground))]">
              {full.workflow.name}
            </span>
          ) : null}
          {full?.classification?.name ? (
            <span className="flex items-center gap-1 rounded-md border border-[hsl(var(--border))] px-2 py-1 text-[11px] font-medium">
              <Tag className="h-2.5 w-2.5 text-primary" />
              {full.classification.name}
            </span>
          ) : null}
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
            {full?.updated_at ? (
              <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                {t("incidents.updated", "Updated")}: {fmt(full.updated_at)}
              </div>
            ) : null}
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
              {!incident.slaDeadline
                ? "—"
                : incident.slaBreached
                  ? "Breached"
                  : "Within SLA"}
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
              {incident.source || "—"}
            </div>
            {incident.channel ? (
              <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                {incident.channel}
              </div>
            ) : null}
          </div>
          <div className={tile}>
            <div className={tileLabel}>
              <Boxes className="h-2.5 w-2.5 text-primary" />
              {t("incidents.department", "Department")}
            </div>
            <div className="text-xs font-semibold truncate">
              {full?.department?.name || incident.department || "—"}
            </div>
          </div>
          <div className={tile}>
            <div className={tileLabel}>
              <MapPin className="h-2.5 w-2.5 text-primary" />
              {t("incidents.location", "Location")}
            </div>
            <div className="text-xs font-semibold truncate">
              {full?.location?.name || incident.location || "—"}
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
                <button
                  type="button"
                  onClick={() => setAssociateOpen(true)}
                  className="ms-auto flex items-center gap-1 rounded-md border border-[hsl(var(--border))] px-2 py-0.5 text-[11px] font-medium hover:bg-[hsl(var(--muted))]"
                >
                  <Plus className="h-3 w-3" />
                  {t("dispatcher.associate", "Associate")}
                </button>
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
                {field(
                  t("incidents.name", "Name"),
                  full?.reporter_name || incident.reporter.name,
                )}
                {field(
                  t("incidents.phone", "Phone"),
                  full?.reporter_phone || incident.reporter.phone,
                )}
                {field(t("incidents.email", "Email"), full?.reporter_email)}
                {field(
                  t("incidents.createdBy", "Created by"),
                  full?.created_by_name,
                )}
              </div>
            </div>
            <div className={card}>
              <h3 className={cardTitle}>
                <MapPin className="h-2.5 w-2.5 text-primary" />
                {t("incidents.location", "Location")}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  {field(t("incidents.address", "Address"), locationText)}
                </div>
                {field(t("incidents.city", "City"), full?.city)}
                {field(
                  t("incidents.postalCode", "Postal code"),
                  full?.postal_code,
                )}
                {field(
                  t("incidents.coordinates", "Coordinates"),
                  Number.isFinite(incident.latitude) &&
                    Number.isFinite(incident.longitude)
                    ? `${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}`
                    : undefined,
                )}
              </div>
            </div>
            <div className={card}>
              <h3 className={cardTitle}>
                <Users className="h-2.5 w-2.5 text-primary" />
                {t("incidents.assignment", "Assignment")}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {field(
                  t("incidents.assignee", "Assignee"),
                  assignees.length
                    ? assignees.map((u) => userName(u)).join(", ")
                    : incident.assignee === "Unassigned"
                      ? t("incidents.unassigned", "Unassigned")
                      : incident.assignee,
                )}
                {field(
                  t("incidents.department", "Department"),
                  full?.department?.name,
                )}
                {full?.due_date
                  ? field(
                      t("incidents.dueDate", "Due date"),
                      fmt(full.due_date),
                    )
                  : null}
                {full?.resolved_at
                  ? field(
                      t("incidents.resolvedAt", "Resolved at"),
                      fmt(full.resolved_at),
                    )
                  : null}
                {full?.closed_at
                  ? field(
                      t("incidents.closedAt", "Closed at"),
                      fmt(full.closed_at),
                    )
                  : null}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "attachments" ? (
          <AttachmentsTab
            key={`attachments-${incident.id}`}
            incidentId={incident.id}
            attachments={attachments}
            transitionHistory={historyAsc}
            onPreview={(id) => setPreviewId(id)}
          />
        ) : null}

        {tab === "comments" ? (
          <CommentsTab
            key={`comments-${incident.id}`}
            incidentId={incident.id}
            comments={comments}
            loading={commentsLoading}
            onChanged={refreshComments}
          />
        ) : null}

        {tab === "activity" ? (
          historyLoading ? (
            loadingText
          ) : (
            <ActivityTab transitionHistory={historyAsc} />
          )
        ) : null}
      </ModalBody>
      <ModalFooter className="flex flex-col gap-2 items-stretch">
        {selected ? (
          <div className="space-y-2 rounded-lg border border-[hsl(var(--border))] p-2">
            <div className="text-xs font-semibold">
              {selected.transition.name}
              {commentRequired ? " *" : ""}
            </div>
            {unsupportedReqs.length > 0 ? (
              <p className="text-xs text-rose-600">
                {t(
                  "dispatcher.transitionNeedsFullPage",
                  "This transition requires extra input (attachment, feedback or fields). Please perform it from the incident management page.",
                )}
              </p>
            ) : null}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder={t("incidents.comment", "Comment")}
              className="w-full rounded-md border border-[hsl(var(--border))] bg-transparent p-2 text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelected(null);
                  setComment("");
                }}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                disabled={
                  transitionMutation.isPending ||
                  unsupportedReqs.length > 0 ||
                  (commentRequired && !comment.trim())
                }
                onClick={() => transitionMutation.mutate()}
              >
                {t("common.confirm", "Confirm")}
              </Button>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {transitionsLoading ? (
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {t("common.loading", "Loading...")}
              </span>
            ) : (
              transitions.map((tr) => (
                <Button
                  key={tr.transition.id}
                  size="sm"
                  variant={
                    tr.transition.is_rejection ? "destructive" : "default"
                  }
                  disabled={!tr.can_execute}
                  title={tr.reason}
                  onClick={() => {
                    setSelected(tr);
                    setComment("");
                  }}
                >
                  {i18n.language === "ar" && tr.transition.name_ar
                    ? tr.transition.name_ar
                    : tr.transition.name}
                </Button>
              ))
            )}
          </div>
          <Button variant="outline" onClick={onClose}>
            {t("common.close", "Close")}
          </Button>
        </div>
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
      {previewId ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90"
          onClick={() => setPreviewId(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewId(null)}
            className="absolute end-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label={t("common.close", "Close")}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={getAttachmentPreviewUrl(previewId)}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </Modal>
  );
}
