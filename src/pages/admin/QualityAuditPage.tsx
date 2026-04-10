import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Eye,
  RotateCcw,
  Info,
} from "lucide-react";
import { Button } from "../../components/ui";
import { incidentApi } from "../../api/admin";
import type { Incident, IncidentFilter } from "../../types";
import { cn } from "@/lib/utils";
import usePermissions from "@/hooks/usePermissions";

// ─── AI Audit Logic ─────────────────────────────────────────────────────────

type AuditStatus =
  | "Verified"
  | "Coordinates Mismatch"
  | "Missing Visit Number"
  | "Missing Reporter Info";

interface AuditResult {
  status: AuditStatus;
  details: string;
}

function auditIncident(incident: Incident): AuditResult {
  if (!incident.source_incident_id) {
    return {
      status: "Missing Visit Number",
      details:
        "No source incident / visit number was provided for this ticket.",
    };
  }
  if (!incident.reporter_name && !incident.reporter_email) {
    return {
      status: "Missing Reporter Info",
      details: "Reporter name and email are both missing.",
    };
  }
  if (
    incident.latitude !== undefined &&
    incident.longitude !== undefined &&
    incident.location?.latitude !== undefined &&
    incident.location?.longitude !== undefined
  ) {
    const dist =
      Math.abs(Number(incident.latitude) - incident.location.latitude) +
      Math.abs(Number(incident.longitude) - incident.location.longitude);
    if (dist > 0.5) {
      return {
        status: "Coordinates Mismatch",
        details: `GPS coordinates deviate significantly from the assigned location (Δ ${dist.toFixed(3)}°).`,
      };
    }
  }
  return {
    status: "Verified",
    details: "All quality audit criteria passed — 100% compliance.",
  };
}

// ─── Badge & row styling helpers ─────────────────────────────────────────────

const auditBadgeClass = (status: AuditStatus) => {
  switch (status) {
    case "Verified":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50";
    case "Coordinates Mismatch":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50";
    case "Missing Visit Number":
    case "Missing Reporter Info":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50";
  }
};

const auditRowClass = (status: AuditStatus) => {
  switch (status) {
    case "Verified":
      return "bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/20";
    case "Coordinates Mismatch":
      return "bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/20";
    case "Missing Visit Number":
    case "Missing Reporter Info":
      return "bg-red-50/60 dark:bg-red-950/20 hover:bg-red-100/60 dark:hover:bg-red-900/20";
  }
};

const AuditIcon = ({ status }: { status: AuditStatus }) => {
  switch (status) {
    case "Verified":
      return (
        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
      );
    case "Coordinates Mismatch":
      return (
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      );
    default:
      return (
        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
      );
  }
};

// ─── Reopen Button ────────────────────────────────────────────────────────────

interface ReopenButtonProps {
  incident: Incident;
  onSuccess: () => void;
}

const ReopenButton: React.FC<ReopenButtonProps> = ({ incident, onSuccess }) => {
  const [isReopening, setIsReopening] = useState(false);

  const handleReopen = async () => {
    setIsReopening(true);
    try {
      // Fetch available transitions
      const transitionRes = await incidentApi.getAvailableTransitions(
        incident.id,
      );
      const transitions = transitionRes.data || [];

      // Find the first executable transition that targets a non-terminal state
      const targetTransition =
        transitions.find(
          (t) =>
            t.can_execute && t.transition?.to_state?.state_type !== "terminal",
        ) || transitions.find((t) => t.can_execute);

      if (!targetTransition) {
        toast.error("No available transitions to reopen this ticket.");
        return;
      }

      await incidentApi.transition(incident.id, {
        transition_id: targetTransition.transition.id,
        comment: "Reopened by Quality Audit team.",
        version: incident.version,
      });

      toast.success(
        `Ticket ${incident.incident_number} has been reopened successfully.`,
      );
      onSuccess();
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to reopen the ticket. Please try again.";
      toast.error(message);
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <button
      onClick={handleReopen}
      disabled={isReopening}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
        "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 hover:border-primary/40",
        "disabled:opacity-50 disabled:cursor-not-allowed",
      )}
    >
      {isReopening ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <RotateCcw className="w-3.5 h-3.5" />
      )}
      {isReopening ? "Reopening…" : "Reopen Ticket"}
    </button>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const QualityAuditPage: React.FC = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = usePermissions();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Filter only terminal (closed) incidents
  const filter: IncidentFilter = {
    record_type: "incident",
    page,
    limit,
    ...(search.length >= 3 ? { search } : {}),
  };

  const {
    data: incidentsData,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ["quality-audit", "incidents", filter],
    queryFn: () => incidentApi.list(filter),
  });

  // Get all terminal state details from incident stats
  const { data: statsData } = useQuery({
    queryKey: ["incidents", "stats", "incident"],
    queryFn: () => incidentApi.getStats("incident"),
  });

  const terminalStateIds = useMemo(() => {
    const details = statsData?.data?.by_state_details || [];
    return details.filter((s) => s.state_type === "terminal").map((s) => s.id);
  }, [statsData]);

  // All fetched incidents — client-side filter to only terminal ones
  const allIncidents = incidentsData?.data || [];
  const terminalIncidents = useMemo(() => {
    if (terminalStateIds.length === 0) return allIncidents;
    return allIncidents.filter(
      (inc) =>
        inc.current_state?.state_type === "terminal" ||
        terminalStateIds.includes(inc.current_state?.id || ""),
    );
  }, [allIncidents, terminalStateIds]);

  // Run AI audit on every visible incident
  const auditedIncidents = useMemo(
    () => terminalIncidents.map((inc) => ({ inc, audit: auditIncident(inc) })),
    [terminalIncidents],
  );

  // Summary counts
  const verifiedCount = auditedIncidents.filter(
    (a) => a.audit.status === "Verified",
  ).length;
  const warningCount = auditedIncidents.filter(
    (a) => a.audit.status === "Coordinates Mismatch",
  ).length;
  const errorCount = auditedIncidents.filter(
    (a) =>
      a.audit.status === "Missing Visit Number" ||
      a.audit.status === "Missing Reporter Info",
  ).length;

  const totalPages = incidentsData?.total_pages ?? 1;
  const totalItems = incidentsData?.total_items ?? 0;

  const handleReopenSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["quality-audit", "incidents"] });
    queryClient.invalidateQueries({ queryKey: ["incidents", "stats"] });
    refetch();
  };

  const formatDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";

  if (error) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            Failed to Load Incidents
          </h3>
          <p className="text-muted-foreground mb-6 text-center max-w-sm">
            An error occurred while loading the incidents. Please try again.
          </p>
          <Button
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <ShieldCheck className="w-5 h-5 text-violet-500" />
            </div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              Quality Audit
            </h1>
          </div>
          <p className="text-muted-foreground mt-1 ml-12">
            AI-powered review of closed incidents for compliance and data
            quality.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            leftIcon={
              !isFetching ? <RefreshCw className="w-4 h-4" /> : undefined
            }
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Verified */}
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-xl bg-emerald-500/10">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {verifiedCount}
            </p>
            <p className="text-sm text-emerald-600 dark:text-emerald-500">
              Verified
            </p>
          </div>
        </div>

        {/* Warnings */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-xl bg-amber-500/10">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {warningCount}
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-500">
              Warnings
            </p>
          </div>
        </div>

        {/* Errors */}
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-xl bg-red-500/10">
            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">
              {errorCount}
            </p>
            <p className="text-sm text-red-600 dark:text-red-500">
              Issues Found
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search incidents... (min. 3 characters)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-11 pr-4 py-2.5 bg-muted/50 border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm text-foreground placeholder:text-muted-foreground transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-sm overflow-hidden">
        {/* Legend */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-[hsl(var(--border))] bg-muted/30 text-xs text-muted-foreground">
          <span className="font-medium">AI Result Legend:</span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Verified
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            Warning
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            Issue
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : auditedIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              No Closed Incidents Found
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              When incidents are closed, they will appear here with their AI
              audit results.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-muted/20">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Incident
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Classification
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    State
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    AI Result
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Closed At
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {auditedIncidents.map(({ inc, audit }) => (
                  <tr
                    key={inc.id}
                    className={cn(
                      "transition-colors",
                      auditRowClass(audit.status),
                    )}
                  >
                    {/* Incident */}
                    <td className="px-4 py-3">
                      <div>
                        <button
                          onClick={() => navigate(`/incidents/${inc.id}`)}
                          className="font-semibold text-primary hover:underline text-sm"
                        >
                          {inc.incident_number}
                        </button>
                        {inc.title && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[200px]">
                            {inc.title}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Classification */}
                    <td className="px-4 py-3 text-muted-foreground">
                      {inc.classification?.name || "—"}
                    </td>

                    {/* State */}
                    <td className="px-4 py-3">
                      {inc.current_state ? (
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border"
                          style={{
                            backgroundColor: inc.current_state.color
                              ? `${inc.current_state.color}22`
                              : undefined,
                            color: inc.current_state.color || undefined,
                            borderColor: inc.current_state.color
                              ? `${inc.current_state.color}44`
                              : undefined,
                          }}
                        >
                          {inc.current_state.name}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* AI Result */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                            auditBadgeClass(audit.status),
                          )}
                        >
                          <AuditIcon status={audit.status} />
                          {audit.status}
                        </span>
                        <span
                          className="text-xs text-muted-foreground line-clamp-1 max-w-[220px]"
                          title={audit.details}
                        >
                          {audit.details}
                        </span>
                      </div>
                    </td>

                    {/* Closed At */}
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(inc.closed_at || inc.updated_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => navigate(`/incidents/${inc.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-all"
                          title="View incident details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                        <ReopenButton
                          incident={inc}
                          onSuccess={handleReopenSuccess}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalItems > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(var(--border))] bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Showing page <span className="font-medium">{page}</span> of{" "}
              <span className="font-medium">{totalPages}</span> ({totalItems}{" "}
              total)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-xl text-sm text-blue-700 dark:text-blue-400">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          The <strong>AI audit engine</strong> automatically checks each closed
          incident for: valid visit/source numbers, reporter contact info, and
          GPS coordinate consistency with the assigned location. Clicking{" "}
          <strong>Reopen Ticket</strong> immediately changes the status back to
          "In Progress" and returns it to the field team.
        </p>
      </div>
    </div>
  );
};
