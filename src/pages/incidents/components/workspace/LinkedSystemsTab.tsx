import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  ChevronRight,
  Clock,
  Copy,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { integrationApi } from "../../../../api/integration";
import type { IncidentBridge } from "../../../../api/integration";
import { copyText } from "./workspaceUtils";

function bridgeDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function bridgeTime(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function hostOf(url?: string): string {
  if (!url) return "—";
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function remoteUrlFor(bridge: IncidentBridge): string | null {
  return bridge.remote_system_url && bridge.remote_incident_id
    ? `${bridge.remote_system_url.replace(/\/$/, "")}/incidents/${bridge.remote_incident_id}`
    : null;
}

/* Linked Systems tab — same incident bridges as IncidentDetailPage
   (read-only list; no link/sync/unlink endpoints exist): header with
   count, audit table with relationship/status/sync cells. */
export function LinkedSystemsTab({ incidentId }: { incidentId: string }) {
  const { t } = useTranslation();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["incidents", "v2-list", "bridges", incidentId],
    queryFn: () => integrationApi.listIncidentBridges(incidentId),
    enabled: !!incidentId,
    staleTime: 60_000,
    retry: false,
  });

  // listIncidentBridges returns the raw axios envelope (unlike the
  // unwrapped admin helpers) — same double-.data access as IncidentDetailPage.
  const bridges: IncidentBridge[] = data?.data?.data ?? [];

  const copyRef = async (value: string) => {
    if (await copyText(value)) {
      toast.success(t("incidents.copied"));
    } else {
      toast.error(t("incidents.copyFailed"));
    }
  };

  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-md shadow-black/20 overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-[hsl(var(--border))] flex flex-wrap items-center justify-between gap-2 bg-[hsl(var(--muted)/0.4)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 dark:bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-700 dark:text-cyan-400">
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-[hsl(var(--foreground))]">
              {t("incidents.linkedSystems")}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
              {t("incidents.linkedSystemsCount", { count: bridges.length })}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.6)] transition-colors text-xs disabled:opacity-60"
        >
          <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
          {t("incidents.refresh")}
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 flex items-center justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[hsl(var(--border))] border-t-transparent" />
          {t("incidents.updating")}
        </div>
      ) : bridges.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-[hsl(var(--muted-foreground))]">
          <ArrowRightLeft className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
            {t("incidents.noLinkedSystems")}
          </p>
          <p className="text-[11px] mt-1 text-center max-w-xs">
            {t("incidents.noLinkedSystemsDescription")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[hsl(var(--muted)/0.7)] border-b border-[hsl(var(--border))] text-[10px] uppercase font-mono tracking-wider text-[hsl(var(--muted-foreground))] select-none">
              <tr>
                <th className="py-2.5 px-4 font-semibold">
                  {t("incidents.linkedSystem", "System / Source")}
                </th>
                <th className="py-2.5 px-4 font-semibold">
                  {t("incidents.linkedIncidentRef", "Incident ID & Ref")}
                </th>
                <th className="py-2.5 px-4 font-semibold">
                  {t("incidents.linkedRelationship", "Relationship / Type")}
                </th>
                <th className="py-2.5 px-4 font-semibold">
                  {t("common.status", "Status")}
                </th>
                <th className="py-2.5 px-4 font-semibold">
                  {t("incidents.linkedSyncDate", "Sync Date / Time")}
                </th>
                <th className="py-2.5 px-4 font-semibold text-right">
                  {t("common.actions", "Action")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))] text-[hsl(var(--foreground))]">
              {bridges.map((bridge) => {
                const isOutbound = bridge.direction === "outbound";
                const url = remoteUrlFor(bridge);
                const syncedAt = bridge.updated_at || bridge.created_at;
                return (
                  <tr
                    key={bridge.id}
                    className="hover:bg-[hsl(var(--muted)/0.4)] transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-[10px] shrink-0 shadow-inner",
                            isOutbound
                              ? "bg-cyan-500/10 dark:bg-cyan-950/60 border-cyan-500/30 text-cyan-700 dark:text-cyan-400"
                              : "bg-emerald-950/60 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
                          )}
                        >
                          {isOutbound ? (
                            <ArrowRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowLeft className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[hsl(var(--foreground))] group-hover:text-cyan-700 dark:group-hover:text-cyan-300 dark:text-cyan-300 transition-colors leading-snug truncate">
                            {bridge.remote_system_name || "—"}
                          </div>
                          <div className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
                            {hostOf(bridge.remote_system_url)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400 text-xs truncate">
                          {bridge.remote_incident_number || "—"}
                        </span>
                        {bridge.remote_incident_number ? (
                          <button
                            type="button"
                            onClick={() => {
                              void copyRef(bridge.remote_incident_number);
                            }}
                            className="text-[hsl(var(--muted-foreground))] hover:text-cyan-700 dark:text-cyan-300 transition-colors p-0.5 shrink-0"
                            title={t("incidents.copyIncidentId")}
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        ) : null}
                      </div>
                      <div className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
                        Ref: {bridge.remote_incident_id || "—"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap",
                          isOutbound
                            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-300"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isOutbound ? "bg-cyan-400" : "bg-emerald-400",
                          )}
                        />
                        {isOutbound
                          ? t("incidents.bridgeSent")
                          : t("incidents.bridgeReceived")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusPill status={bridge.status} />
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      <div className="flex items-start gap-1.5">
                        <Clock className="h-3 w-3 text-[hsl(var(--muted-foreground))] mt-0.5 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-[hsl(var(--foreground))] font-medium leading-tight">
                            {bridgeDate(syncedAt)}
                          </span>
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))] leading-tight">
                            {bridgeTime(syncedAt)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {url ? (
                        <button
                          type="button"
                          onClick={() => window.open(url, "_blank", "noopener")}
                          className="px-2 py-1 bg-[hsl(var(--muted)/0.8)] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors text-[11px] font-medium items-center gap-1 shadow-sm inline-flex"
                          title={t(
                            "incidents.openRemoteRecord",
                            "Open Remote Record",
                          )}
                        >
                          <span>{t("common.view")}</span>
                          <ChevronRight className="h-2.5 w-2.5 text-[hsl(var(--muted-foreground))] rtl:rotate-180" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: IncidentBridge["status"] }) {
  const { t } = useTranslation();
  if (status === "closed")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        {t("incidents.synchronized")}
      </span>
    );
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        {t("common.error")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-400 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
      {t("incidents.inProgress")}
    </span>
  );
}
