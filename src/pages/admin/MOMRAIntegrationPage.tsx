import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  Globe2,
  Tags,
  Link2,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  ScrollText,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Button,
  Select,
  Input,
  Checkbox,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "../../components/ui";
import { momraApi } from "../../api/momra";
import type {
  MOMRAStatusMapping,
  MOMRAStatusMappingRequest,
} from "../../api/momra";
import { workflowApi } from "../../api/admin";
import type { IntegrationExecutionLog } from "../../api/integration";
import type { ApiResponse } from "../../types";

// Docs: docs/MOMRA_Outbound_Integration_Spec_v1.0.md
// Admin page covering:
//  - Manual sync triggers for classification master / external entities / EE-classification links (items 2-4)
//  - WorkflowState -> MOMRA CaseStatusID mapping CRUD (item 1, Story A)
//  - Recent status-sync attempts + manual retry (item 1, Story B/C)

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
  running: { icon: Loader2, color: "text-blue-500", bg: "bg-blue-500/10" },
  pending: {
    icon: Clock,
    color: "text-[hsl(var(--muted-foreground))]",
    bg: "bg-[hsl(var(--muted))]",
  },
};

interface SyncCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onSync: () => void;
  isPending: boolean;
  summary?: string;
}

const SyncCard: React.FC<SyncCardProps> = ({
  icon,
  title,
  description,
  onSync,
  isPending,
  summary,
}) => (
  <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
          {title}
        </h3>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      </div>
    </div>
    {summary && (
      <p className="text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]/50 rounded-lg px-3 py-2 font-mono">
        {summary}
      </p>
    )}
    <Button
      size="sm"
      variant="outline"
      onClick={onSync}
      isLoading={isPending}
      leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
    >
      Sync now
    </Button>
  </div>
);

interface MappingFormState {
  id?: string;
  workflow_id: string;
  state_id: string;
  case_status_id: string;
  is_closure_status: boolean;
  is_active: boolean;
}

const EMPTY_FORM = (workflowId: string): MappingFormState => ({
  workflow_id: workflowId,
  state_id: "",
  case_status_id: "",
  is_closure_status: false,
  is_active: true,
});

export const MOMRAIntegrationPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<MappingFormState | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { data: workflowsData } = useQuery({
    queryKey: ["momra-workflows"],
    queryFn: () => workflowApi.list(true),
  });
  const workflows = workflowsData?.data ?? [];

  const { data: workflowDetailData } = useQuery({
    queryKey: ["momra-workflow-detail", selectedWorkflowId],
    queryFn: () => workflowApi.getById(selectedWorkflowId),
    enabled: !!selectedWorkflowId,
  });
  const workflowStates = useMemo(
    () => workflowDetailData?.data?.states ?? [],
    [workflowDetailData],
  );

  const { data: mappingsData, isLoading: mappingsLoading } = useQuery({
    queryKey: ["momra-status-mappings", selectedWorkflowId],
    queryFn: () => momraApi.listStatusMappings(selectedWorkflowId),
    enabled: !!selectedWorkflowId,
  });
  const mappings: MOMRAStatusMapping[] = mappingsData?.data.data ?? [];

  const {
    data: logsData,
    refetch: refetchLogs,
    isFetching: logsFetching,
  } = useQuery({
    queryKey: ["momra-status-sync-logs"],
    queryFn: () => momraApi.listStatusSyncLogs(50, 0),
  });
  const logs: IntegrationExecutionLog[] = logsData?.data.data?.logs ?? [];

  const stateNameById = useMemo(() => {
    const map = new Map<string, string>();
    workflowStates.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [workflowStates]);

  // Sync mutations
  const useSyncMutation = <T,>(
    fn: () => Promise<{ data: ApiResponse<T> }>,
    label: string,
  ) =>
    useMutation({
      mutationFn: fn,
      onSuccess: () => toast.success(`${label} sync completed`),
      onError: (err: any) =>
        toast.error(err?.response?.data?.error || `${label} sync failed`),
    });

  const classificationSync = useSyncMutation(
    momraApi.syncClassifications,
    "Classification",
  );
  const eeSync = useSyncMutation(
    momraApi.syncExternalEntities,
    "External entity",
  );
  const eeClassificationSync = useSyncMutation(
    momraApi.syncExternalEntityClassifications,
    "External entity classification",
  );
  const syncAll = useSyncMutation(momraApi.syncAll, "Full");

  const summarize = (data: unknown): string | undefined => {
    if (!data) return undefined;
    return Object.entries(data as Record<string, unknown>)
      .filter(([, v]) => typeof v === "number")
      .map(([k, v]) => `${k}: ${v}`)
      .join("  ·  ");
  };

  // Mapping CRUD mutations
  const createMutation = useMutation({
    mutationFn: (req: MOMRAStatusMappingRequest) =>
      momraApi.createStatusMapping(req),
    onSuccess: () => {
      toast.success("Status mapping created");
      queryClient.invalidateQueries({
        queryKey: ["momra-status-mappings", selectedWorkflowId],
      });
      setFormOpen(false);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || "Failed to create mapping"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, req }: { id: string; req: MOMRAStatusMappingRequest }) =>
      momraApi.updateStatusMapping(id, req),
    onSuccess: () => {
      toast.success("Status mapping updated");
      queryClient.invalidateQueries({
        queryKey: ["momra-status-mappings", selectedWorkflowId],
      });
      setFormOpen(false);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || "Failed to update mapping"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => momraApi.deleteStatusMapping(id),
    onSuccess: () => {
      toast.success("Status mapping deleted");
      queryClient.invalidateQueries({
        queryKey: ["momra-status-mappings", selectedWorkflowId],
      });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || "Failed to delete mapping"),
  });

  const retryMutation = useMutation({
    mutationFn: (logId: string) => momraApi.retryStatusSync(logId),
    onSuccess: () => {
      toast.success("Retry attempted — refreshing logs");
      refetchLogs();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || "Retry failed"),
  });

  const openCreateForm = () => {
    setForm(EMPTY_FORM(selectedWorkflowId));
    setFormOpen(true);
  };

  const openEditForm = (m: MOMRAStatusMapping) => {
    setForm({
      id: m.id,
      workflow_id: m.workflow_id,
      state_id: m.state_id,
      case_status_id: m.case_status_id,
      is_closure_status: m.is_closure_status,
      is_active: m.is_active,
    });
    setFormOpen(true);
  };

  const submitForm = () => {
    if (!form || !form.state_id || !form.case_status_id.trim()) {
      toast.error("State and MOMRA CaseStatusID are required");
      return;
    }
    const req: MOMRAStatusMappingRequest = {
      workflow_id: form.workflow_id,
      state_id: form.state_id,
      case_status_id: form.case_status_id.trim(),
      is_closure_status: form.is_closure_status,
      is_active: form.is_active,
    };
    if (form.id) {
      updateMutation.mutate({ id: form.id, req });
    } else {
      createMutation.mutate(req);
    }
  };

  const prettyJSON = (s: string) => {
    if (!s) return "";
    try {
      return JSON.stringify(JSON.parse(s), null, 2);
    } catch {
      return s;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">
          {t("admin.momraIntegration", "MOMRA CRM Integration")}
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Outbound sync with MOMRA CRM — classification hierarchy, external
          entities, and incident status updates.
        </p>
      </div>

      {/* Sync triggers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SyncCard
          icon={
            <Tags className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          }
          title="Classification Master"
          description="3.21/3.22/3.23 — Main / Sub / Special hierarchy"
          onSync={() => classificationSync.mutate()}
          isPending={classificationSync.isPending}
          summary={summarize(classificationSync.data?.data.data)}
        />
        <SyncCard
          icon={
            <Globe2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          }
          title="External Entities"
          description="3.35 — active EE master list"
          onSync={() => eeSync.mutate()}
          isPending={eeSync.isPending}
          summary={summarize(eeSync.data?.data.data)}
        />
        <SyncCard
          icon={
            <Link2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          }
          title="EE ↔ Classification Links"
          description="3.36 — allowed classifications per EE (run after the two above)"
          onSync={() => eeClassificationSync.mutate()}
          isPending={eeClassificationSync.isPending}
          summary={summarize(eeClassificationSync.data?.data.data)}
        />
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => syncAll.mutate()}
        isLoading={syncAll.isPending}
        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
      >
        Run all three in order
      </Button>

      {/* Status mapping */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[hsl(var(--border))]">
          <div>
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Status Mapping (3.14)
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Which MOMRA CaseStatusID to send for each workflow state
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-56">
              <Select
                value={selectedWorkflowId}
                onChange={(e) => setSelectedWorkflowId(e.target.value)}
                placeholder="Select a workflow"
                options={workflows.map((w) => ({ value: w.id, label: w.name }))}
              />
            </div>
            <Button
              size="sm"
              disabled={!selectedWorkflowId}
              onClick={openCreateForm}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add mapping
            </Button>
          </div>
        </div>

        {!selectedWorkflowId ? (
          <div className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Select a workflow to view or edit its status mappings
          </div>
        ) : mappingsLoading ? (
          <div className="p-8 flex justify-center">
            <span className="w-6 h-6 border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] rounded-full animate-spin" />
          </div>
        ) : mappings.length === 0 ? (
          <div className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No mappings yet for this workflow — every state used in this
            workflow's incident lifecycle should have one, or status changes
            won't sync to MOMRA.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40">
                {["State", "CaseStatusID", "Closure?", "Active?", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider px-4 py-2.5"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {mappings.map((m) => (
                <tr key={m.id} className="hover:bg-[hsl(var(--muted))]/20">
                  <td className="px-4 py-2.5 text-sm text-[hsl(var(--foreground))]">
                    {m.state?.name ||
                      stateNameById.get(m.state_id) ||
                      m.state_id}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-mono text-[hsl(var(--foreground))]">
                    {m.case_status_id}
                  </td>
                  <td className="px-4 py-2.5">
                    {m.is_closure_status ? (
                      <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full">
                        Yes
                      </span>
                    ) : (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {m.is_active ? (
                      <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-600 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-full">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditForm(m)}
                        className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this status mapping?"))
                            deleteMutation.mutate(m.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent status-sync attempts */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Recent status-sync attempts
            </h2>
          </div>
          <button
            onClick={() => refetchLogs()}
            disabled={logsFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[hsl(var(--border))] rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${logsFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No status-sync attempts yet
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40">
                {["Status", "Incident", "Executed At", "Duration", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider px-4 py-2.5"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {logs.map((log) => {
                const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                const expanded = expandedLogId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      className="hover:bg-[hsl(var(--muted))]/20 cursor-pointer"
                      onClick={() => setExpandedLogId(expanded ? null : log.id)}
                    >
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color} capitalize`}
                        >
                          <Icon
                            className={`w-3.5 h-3.5 ${log.status === "running" ? "animate-spin" : ""}`}
                          />
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm font-mono text-[hsl(var(--foreground))]">
                        {log.incident_number}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[hsl(var(--muted-foreground))]">
                        {new Date(log.executed_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[hsl(var(--muted-foreground))]">
                        {log.duration_ms > 0 ? `${log.duration_ms}ms` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {log.status === "failed" && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                retryMutation.mutate(log.id);
                              }}
                              isLoading={
                                retryMutation.isPending &&
                                retryMutation.variables === log.id
                              }
                            >
                              Retry
                            </Button>
                          )}
                          {expanded ? (
                            <ChevronUp className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-[hsl(var(--muted))]/20">
                        <td colSpan={5} className="px-4 pb-4 pt-2">
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
                                  Request
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
                                  {log.status_code > 0
                                    ? ` (HTTP ${log.status_code})`
                                    : ""}
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
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit mapping modal */}
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} size="md">
        <ModalHeader>
          <ModalTitle>
            {form?.id ? "Edit status mapping" : "New status mapping"}
          </ModalTitle>
        </ModalHeader>
        <ModalBody>
          {form && (
            <div className="space-y-4">
              <Select
                label="Workflow state"
                required
                value={form.state_id}
                onChange={(e) => setForm({ ...form, state_id: e.target.value })}
                placeholder="Select a state"
                options={workflowStates.map((s) => ({
                  value: s.id,
                  label: s.name,
                }))}
              />
              <Input
                label="MOMRA CaseStatusID"
                required
                placeholder="e.g. 004"
                hint="Transported as a string to preserve leading zeros"
                value={form.case_status_id}
                onChange={(e) =>
                  setForm({ ...form, case_status_id: e.target.value })
                }
              />
              <Checkbox
                label="This is a closure status (sets ClosureFlag = Yes)"
                checked={form.is_closure_status}
                onChange={(e) =>
                  setForm({ ...form, is_closure_status: e.target.checked })
                }
              />
              <Checkbox
                label="Active"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setFormOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={submitForm}
            isLoading={createMutation.isPending || updateMutation.isPending}
          >
            Save
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};
