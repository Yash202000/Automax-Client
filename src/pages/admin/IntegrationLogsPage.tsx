import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  ScrollText,
  RefreshCw,
} from "lucide-react";
import { integrationApi } from "../../api/integration";
import type {
  IntegrationExecutionLog,
  IntegrationLogsResponse,
} from "../../api/integration";
import type { ApiResponse } from "../../types";
import type { AxiosResponse } from "axios";

const STATUS_CONFIG: Record<
  string,
  { icon: React.FC<{ className?: string }>; color: string; bg: string }
> = {
  success: {
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-500/10",
  },
  failed: {
    icon: XCircle,
    color: "text-[hsl(var(--destructive))]",
    bg: "bg-[hsl(var(--destructive))]/10",
  },
  running: {
    icon: Loader2,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  timeout: {
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  pending: {
    icon: Clock,
    color: "text-[hsl(var(--muted-foreground))]",
    bg: "bg-[hsl(var(--muted))]",
  },
};

const TRIGGER_LABELS: Record<string, string> = {
  state_enter: "State Enter",
  state_exit: "State Exit",
  transition: "Transition",
  test: "Manual Test",
};

interface LogRowProps {
  log: IntegrationExecutionLog;
}

const LogRow: React.FC<LogRowProps> = ({ log }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  const prettyJSON = (s: string) => {
    if (!s) return "";
    try {
      return JSON.stringify(JSON.parse(s), null, 2);
    } catch {
      return s;
    }
  };

  return (
    <>
      <tr
        className="hover:bg-[hsl(var(--muted))]/30 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Icon
              className={`w-4 h-4 ${cfg.color} ${log.status === "running" ? "animate-spin" : ""}`}
            />
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color} capitalize`}
            >
              {log.status}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm font-mono font-medium text-[hsl(var(--foreground))]">
            {log.incident_number}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-[hsl(var(--foreground))] line-clamp-1">
            {log.script_name || log.integration_script_id}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs px-2 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-full">
            {TRIGGER_LABELS[log.trigger_type] ?? log.trigger_type}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            {log.trigger_ref_name || "—"}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {log.duration_ms > 0 ? `${log.duration_ms}ms` : "—"}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {new Date(log.executed_at).toLocaleString()}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[hsl(var(--muted))]/20">
          <td colSpan={8} className="px-4 pb-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {log.error_message && (
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1.5">
                    Error
                  </p>
                  <div className="px-3 py-2 bg-[hsl(var(--destructive))]/8 border border-[hsl(var(--destructive))]/20 rounded-lg">
                    <p className="text-xs font-mono text-[hsl(var(--destructive))]">
                      {log.error_message}
                    </p>
                  </div>
                </div>
              )}
              {log.request_payload && (
                <div>
                  <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1.5">
                    Request Payload
                  </p>
                  <pre className="text-xs font-mono bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg p-3 overflow-x-auto max-h-40 text-[hsl(var(--foreground))]">
                    {prettyJSON(log.request_payload)}
                  </pre>
                </div>
              )}
              {log.response_body && (
                <div>
                  <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1.5">
                    Response
                    {log.status_code > 0 && (
                      <span className="ml-2 font-normal normal-case text-[hsl(var(--muted-foreground))]">
                        HTTP {log.status_code}
                      </span>
                    )}
                  </p>
                  <pre className="text-xs font-mono bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg p-3 overflow-x-auto max-h-40 text-[hsl(var(--foreground))]">
                    {prettyJSON(log.response_body)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

interface IntegrationLogsPageProps {
  scriptId?: string;
  incidentId?: string;
  title?: string;
}

export const IntegrationLogsPage: React.FC<IntegrationLogsPageProps> = ({
  scriptId,
  incidentId,
  title = "Integration Execution Logs",
}) => {
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["integration-logs", scriptId, incidentId, page],
    queryFn: (): Promise<
      AxiosResponse<ApiResponse<IntegrationLogsResponse>>
    > =>
      scriptId
        ? integrationApi.listScriptLogs(scriptId, limit, page * limit)
        : incidentId
          ? integrationApi.listIncidentLogs(incidentId, limit, page * limit)
          : Promise.resolve({
              data: { data: { logs: [], total: 0, limit, offset: 0 } },
            } as unknown as AxiosResponse<
              ApiResponse<IntegrationLogsResponse>
            >),
    enabled: !!(scriptId || incidentId),
  });

  const logsData = data?.data?.data;
  const logs: IntegrationExecutionLog[] = logsData?.logs ?? [];
  const total = logsData?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center">
            <ScrollText className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              {title}
            </h2>
            {total > 0 && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {total} execution{total !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[hsl(var(--border))] rounded-lg hover:bg-[hsl(var(--muted))] transition-colors text-[hsl(var(--muted-foreground))]"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-10 flex justify-center">
            <span className="w-6 h-6 border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3 text-center">
            <ScrollText className="w-10 h-10 text-[hsl(var(--muted-foreground))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              No executions yet
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40">
                {[
                  "Status",
                  "Incident",
                  "Script",
                  "Trigger Type",
                  "Trigger",
                  "Duration",
                  "Executed At",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {logs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-xs font-medium border border-[hsl(var(--border))] rounded-md hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-xs font-medium border border-[hsl(var(--border))] rounded-md hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
