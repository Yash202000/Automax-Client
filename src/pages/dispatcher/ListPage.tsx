import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Eye, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { INCIDENT_DRAG_TYPE } from "../../components/dispatcher/incidentMap.types";
import { DispatcherMapPanel } from "./DispatcherMapPanel";
import { IncidentDetailModal } from "./IncidentDetailModal";
import { FireStationAlertModal } from "../../components/dispatcher/FireStationAlertModal";
import { DUMMY_INCIDENTS, STATUS_COLORS } from "./dummyIncidents";

const PAGE_SIZE = 15;

/**
 * Dispatcher view backed entirely by DUMMY data (no API calls): status tabs,
 * a searchable incident list and a clustered map. The selected incident is
 * reflected in the URL as /dispatcher/:id.
 */
export function DispatcherListPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  // Local copy so dropping an incident on a unit/station can assign it.
  const [allIncidents, setAllIncidents] = useState(DUMMY_INCIDENTS);
  const [tab, setTab] = useState<"all" | "waiting" | "dispatched">("all");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [fireStationModalOpen, setFireStationModalOpen] = useState(false);

  const tabs: { key: "all" | "waiting" | "dispatched"; label: string }[] = [
    { key: "all", label: t("dispatcher.all", "All") },
    {
      key: "waiting",
      label: t("dispatcher.waitingForDispatch", "Waiting for dispatch"),
    },
    { key: "dispatched", label: t("dispatcher.dispatched", "Dispatched") },
  ];

  const counts = useMemo(
    () => ({
      all: allIncidents.length,
      waiting: allIncidents.filter((i) => i.status === "waiting").length,
      dispatched: allIncidents.filter((i) => i.status === "dispatched").length,
    }),
    [allIncidents],
  );

  const incidents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allIncidents.filter(
      (i) =>
        (tab === "all" || i.status === tab) &&
        (!q ||
          [i.number, i.title, i.title_ar, i.location].some((v) =>
            v.toLowerCase().includes(q),
          )),
    );
  }, [allIncidents, tab, query]);

  // "All" is paginated; the status tabs show their whole list.
  const totalPages =
    tab === "all" ? Math.max(1, Math.ceil(incidents.length / PAGE_SIZE)) : 1;
  const currentPage = Math.min(page, totalPages);
  const visible =
    tab === "all"
      ? incidents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
      : incidents;

  const assign = (incidentId: string, target: { label: string }) => {
    const inc = allIncidents.find((x) => x.id === incidentId);
    if (!inc) return;
    if (inc.status === "resolved" || inc.status === "completed") {
      toast.info(
        t(
          "dispatcher.alreadyClosed",
          "{{incident}} is already closed and can't be assigned",
          { incident: inc.number },
        ),
      );
      return;
    }
    setAllIncidents((prev) =>
      prev.map((x) =>
        x.id === incidentId
          ? { ...x, status: "dispatched", assignee: target.label }
          : x,
      ),
    );
    toast.success(
      t("dispatcher.incidentAssigned", "{{incident}} assigned to {{target}}", {
        incident: inc.number,
        target: target.label,
      }),
    );
  };

  const select = (next: string) =>
    navigate(`/dispatcher/${next}`, { replace: true });

  return (
    <>
      <div className="flex h-[calc(100vh-70px-1rem)] min-h-0 w-full overflow-hidden lg:h-[calc(100vh-70px-2rem)]">
        <div className="flex min-h-0 w-full max-w-md shrink-0 flex-col border-e border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] p-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-2.5 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={t("common.search", "Search")}
                className="h-9 w-full rounded-md border border-[hsl(var(--border))] bg-transparent ps-8 pe-2 text-sm outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setFireStationModalOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-white"
              aria-label={t("common.create", "Create")}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex border-b border-[hsl(var(--border))]">
            {tabs.map((tb) => (
              <button
                key={tb.key}
                type="button"
                onClick={() => {
                  setTab(tb.key);
                  setPage(1);
                }}
                className={cn(
                  "flex-1 px-3 py-2 text-sm font-medium",
                  tab === tb.key
                    ? "border-b-2 border-primary text-primary"
                    : "text-[hsl(var(--muted-foreground))]",
                )}
              >
                {tb.label} ({counts[tb.key]})
              </button>
            ))}
          </div>

          <ul className="min-h-0 flex-1 overflow-y-auto">
            {visible.map((i) => (
              <li
                key={i.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(INCIDENT_DRAG_TYPE, i.id);
                  e.dataTransfer.setData("text/plain", i.number);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                <button
                  type="button"
                  onClick={() => select(i.id)}
                  className={cn(
                    "w-full border-b border-[hsl(var(--border))] px-3 py-2.5 text-start hover:bg-[hsl(var(--muted))]",
                    id === i.id && "bg-[hsl(var(--muted))]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: STATUS_COLORS[i.status] }}
                    />
                    <span className="text-sm font-semibold">{i.number}</span>
                    <span className="ms-auto text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(i.reportedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      title={t("dispatcher.viewDetails", "View details")}
                      aria-label={t("dispatcher.viewDetails", "View details")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailId(i.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          setDetailId(i.id);
                        }
                      }}
                      className="rounded p-1 text-primary hover:bg-primary/10"
                    >
                      <Eye className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-0.5 text-sm">
                    {i18n.language === "ar" ? i.title_ar : i.title}
                  </div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">
                    {i.location}
                    {i.assignee !== "Unassigned" ? ` · ${i.assignee}` : ""}
                  </div>
                </button>
              </li>
            ))}
            {incidents.length === 0 ? (
              <li className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                {t("common.noResults", "No results")}
              </li>
            ) : null}
          </ul>

          {tab === "all" && totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-[hsl(var(--border))] px-3 py-2 text-xs">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                className="rounded-md border border-[hsl(var(--border))] p-1 disabled:opacity-40"
                aria-label={t("common.previous", "Previous")}
              >
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              </button>
              <span className="text-[hsl(var(--muted-foreground))]">
                {t("common.pageOf", "Page {{page}} of {{total}}", {
                  page: currentPage,
                  total: totalPages,
                })}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
                className="rounded-md border border-[hsl(var(--border))] p-1 disabled:opacity-40"
                aria-label={t("common.next", "Next")}
              >
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </button>
            </div>
          ) : null}
        </div>

        <main className="min-h-0 min-w-0 flex-1">
          <DispatcherMapPanel
            incidents={incidents}
            selectedId={id ?? null}
            onSelect={select}
            onDropIncident={assign}
          />
        </main>
      </div>

      {detailId ? (
        <IncidentDetailModal
          incident={allIncidents.find((x) => x.id === detailId)!}
          onClose={() => setDetailId(null)}
        />
      ) : null}
      {fireStationModalOpen ? (
        <FireStationAlertModal
          isOpen
          onClose={() => setFireStationModalOpen(false)}
          onProceed={() => {
            setFireStationModalOpen(false);
            navigate("/incidents/new");
          }}
        />
      ) : null}
    </>
  );
}
