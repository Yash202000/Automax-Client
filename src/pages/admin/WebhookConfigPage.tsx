import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Webhook,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { integrationApi } from "../../api/integration";
import type {
  WebhookCallbackConfig,
  WebhookCallbackConfigRequest,
} from "../../api/integration";
import { workflowApi } from "../../api/admin";

const inputCls =
  "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-colors";

const selectCls =
  "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-colors appearance-none cursor-pointer";

interface FlatTransition {
  id: string;
  name: string;
  code: string;
  workflowId: string;
  workflowName: string;
  fromState: string;
  toState: string;
}

function safeJson(s: string): Record<string, string> {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
}

const TransitionSelect: React.FC<{
  value: string;
  onChange: (uuid: string) => void;
  transitions: FlatTransition[];
  loading: boolean;
  placeholder?: string;
}> = ({
  value,
  onChange,
  transitions,
  loading,
  placeholder = "— select transition —",
}) => {
  // Group by workflow
  const byWorkflow = transitions.reduce<
    Record<string, { name: string; items: FlatTransition[] }>
  >((acc, t) => {
    if (!acc[t.workflowId])
      acc[t.workflowId] = { name: t.workflowName, items: [] };
    acc[t.workflowId].items.push(t);
    return acc;
  }, {});

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading}
      className={selectCls}
    >
      <option value="">{loading ? "Loading transitions…" : placeholder}</option>
      {Object.entries(byWorkflow).map(([wfId, wf]) => (
        <optgroup key={wfId} label={wf.name}>
          {wf.items.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.fromState} → {t.toState})
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};

const emptyForm = (): WebhookCallbackConfigRequest => ({
  name: "",
  description: "",
  is_active: true,
  shared_secret: "",
  action_mappings: JSON.stringify({ close: "", reopen: "" }, null, 2),
  state_code_mappings: "{}",
});

const WEBHOOK_URL = `${window.location.origin}/api/v1/webhooks/automax-callback`;

export const WebhookConfigPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WebhookCallbackConfig | null>(null);
  const [form, setForm] = useState<WebhookCallbackConfigRequest>(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [stateCodeDraft, setStateCodeDraft] = useState<
    { code: string; transitionId: string }[]
  >([]);

  const { data, isLoading } = useQuery({
    queryKey: ["webhook-configs"],
    queryFn: () => integrationApi.listWebhookConfigs(),
  });
  const configs: WebhookCallbackConfig[] = data?.data?.data ?? [];

  const { data: allTransitions = [], isFetching: transitionsLoading } =
    useQuery<FlatTransition[]>({
      queryKey: ["all-transitions-flat"],
      queryFn: async () => {
        const wfRes = await workflowApi.list(false);
        const workflows = wfRes?.data ?? [];
        const results = await Promise.all(
          workflows.map((w) => workflowApi.listTransitions(w.id)),
        );
        return workflows.flatMap((w, i) =>
          (results[i]?.data ?? []).map((t) => ({
            id: t.id,
            name: t.name,
            code: t.code,
            workflowId: w.id,
            workflowName: w.name,
            fromState: t.from_state?.name ?? "",
            toState: t.to_state?.name ?? "",
          })),
        );
      },
      staleTime: 60_000,
    });

  const createMut = useMutation({
    mutationFn: (req: WebhookCallbackConfigRequest) =>
      integrationApi.createWebhookConfig(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-configs"] });
      toast.success("Webhook config created");
      setShowForm(false);
      setForm(emptyForm());
      setStateCodeDraft([]);
    },
    onError: () => toast.error("Failed to create webhook config"),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      req,
    }: {
      id: string;
      req: WebhookCallbackConfigRequest;
    }) => integrationApi.updateWebhookConfig(id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-configs"] });
      toast.success("Webhook config updated");
      setEditing(null);
      setShowForm(false);
      setStateCodeDraft([]);
    },
    onError: () => toast.error("Failed to update webhook config"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => integrationApi.deleteWebhookConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-configs"] });
      toast.success("Webhook config deleted");
      setDeleteConfirm(null);
    },
    onError: () => toast.error("Failed to delete webhook config"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!editing && !form.shared_secret.trim()) {
      toast.error("Shared secret is required");
      return;
    }
    // Flush draft rows (filtering empty codes) into form before submitting
    const scObj = stateCodeDraft.reduce<Record<string, string>>((acc, r) => {
      if (r.code.trim()) acc[r.code.trim()] = r.transitionId;
      return acc;
    }, {});
    const finalForm = { ...form, state_code_mappings: JSON.stringify(scObj) };
    if (editing) {
      updateMut.mutate({ id: editing.id, req: finalForm });
    } else {
      createMut.mutate(finalForm);
    }
  };

  const openEdit = (cfg: WebhookCallbackConfig) => {
    setEditing(cfg);
    const parsedSC = safeJson(cfg.state_code_mappings || "{}");
    setStateCodeDraft(
      Object.entries(parsedSC).map(([code, transitionId]) => ({
        code,
        transitionId,
      })),
    );
    setForm({
      name: cfg.name,
      description: cfg.description,
      is_active: cfg.is_active,
      shared_secret: "",
      action_mappings: cfg.action_mappings || "{}",
      state_code_mappings: cfg.state_code_mappings || "{}",
    });
    setShowForm(true);
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  // Derived helpers for structured mapping editors
  const actionMap = safeJson(form.action_mappings ?? "{}");
  const setActionMapping = (action: string, transitionId: string) => {
    const updated = { ...actionMap, [action]: transitionId };
    setForm({ ...form, action_mappings: JSON.stringify(updated) });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center">
            <Webhook className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">
              Webhook Callback Configs
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Configure how inbound callbacks from remote Automax systems
              trigger local transitions
            </p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setEditing(null);
              setForm(emptyForm());
              setStateCodeDraft([]);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Config
          </button>
        )}
      </div>

      {/* Webhook URL info banner */}
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-500/8 border border-blue-500/20 rounded-xl">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">
            Your webhook endpoint
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Configure remote Automax systems to POST to:
          </p>
          <code className="text-xs font-mono bg-[hsl(var(--muted))] px-2 py-0.5 rounded mt-1 inline-block break-all">
            POST {WEBHOOK_URL}
          </code>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            With header:{" "}
            <code className="font-mono">
              Authorization: Bearer &lt;shared_secret&gt;
            </code>{" "}
            and body:{" "}
            <code className="font-mono">
              {"{ source_incident_id, action, remote_state_code, remote_ref }"}
            </code>
          </p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
            <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">
              {editing ? "Edit Config" : "New Webhook Config"}
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setEditing(null);
                setStateCodeDraft([]);
              }}
              className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                  Name <span className="text-[hsl(var(--destructive))]">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Automax HQ Callback"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                  Shared Secret{" "}
                  {!editing && (
                    <span className="text-[hsl(var(--destructive))]">*</span>
                  )}
                  {editing && (
                    <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">
                      {" "}
                      (leave blank to keep current)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={form.shared_secret}
                    onChange={(e) =>
                      setForm({ ...form, shared_secret: e.target.value })
                    }
                    placeholder={editing ? "••••••••" : "Min 8 characters"}
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  >
                    {showSecret ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">
                  On the <strong>remote system</strong>, store this value as an
                  Integration Variable (e.g.{" "}
                  <code className="bg-[hsl(var(--muted))] px-1 rounded">
                    SYSTEM_A_SECRET
                  </code>
                  ), then use{" "}
                  <code className="bg-[hsl(var(--muted))] px-1 rounded">
                    {"Bearer {{vars.SYSTEM_A_SECRET}}"}
                  </code>{" "}
                  as the{" "}
                  <code className="bg-[hsl(var(--muted))] px-1 rounded">
                    Authorization
                  </code>{" "}
                  header in the HTTP script that calls back to this system.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Optional description"
                className={inputCls}
              />
            </div>

            {/* Action Mappings */}
            <div className="border border-[hsl(var(--border))] rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-[hsl(var(--muted))]/30 border-b border-[hsl(var(--border))]">
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  Action Mappings
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  Maps a semantic action key (sent by the remote system) to a
                  local workflow transition. The remote system sends{" "}
                  <code className="bg-[hsl(var(--muted))] px-1 rounded">
                    action: "close"
                  </code>{" "}
                  or{" "}
                  <code className="bg-[hsl(var(--muted))] px-1 rounded">
                    action: "reopen"
                  </code>
                  .
                </p>
              </div>
              <div className="p-4 space-y-3">
                {["close", "reopen"].map((action) => (
                  <div key={action} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs font-mono font-semibold text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] px-2 py-1.5 rounded text-center">
                      {action}
                    </span>
                    <div className="flex-1">
                      <TransitionSelect
                        value={actionMap[action] ?? ""}
                        onChange={(uuid) => setActionMapping(action, uuid)}
                        transitions={allTransitions}
                        loading={transitionsLoading}
                        placeholder="— no transition mapped —"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* State Code Mappings */}
            <div className="border border-[hsl(var(--border))] rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-[hsl(var(--muted))]/30 border-b border-[hsl(var(--border))]">
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  State Code Mappings
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  Optional fine-grained overrides. When the remote system sends
                  a{" "}
                  <code className="bg-[hsl(var(--muted))] px-1 rounded">
                    remote_state_code
                  </code>
                  , these are checked <strong>before</strong> action mappings.
                  Add one row per remote state code.
                </p>
              </div>
              <div className="p-4 space-y-3">
                {stateCodeDraft.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row.code}
                      onChange={(e) => {
                        const updated = [...stateCodeDraft];
                        updated[idx] = {
                          ...updated[idx],
                          code: e.target.value,
                        };
                        setStateCodeDraft(updated);
                      }}
                      placeholder="RESOLVED"
                      className="w-32 shrink-0 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    />
                    <div className="flex-1">
                      <TransitionSelect
                        value={row.transitionId}
                        onChange={(uuid) => {
                          const updated = [...stateCodeDraft];
                          updated[idx] = {
                            ...updated[idx],
                            transitionId: uuid,
                          };
                          setStateCodeDraft(updated);
                        }}
                        transitions={allTransitions}
                        loading={transitionsLoading}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setStateCodeDraft(
                          stateCodeDraft.filter((_, i) => i !== idx),
                        )
                      }
                      className="p-1.5 rounded-lg hover:bg-[hsl(var(--destructive))]/10 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {stateCodeDraft.length === 0 && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] italic">
                    No state code mappings — action mappings will be used as
                    fallback.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setStateCodeDraft([
                      ...stateCodeDraft,
                      { code: "", transitionId: "" },
                    ])
                  }
                  className="flex items-center gap-1.5 text-xs text-[hsl(var(--primary))] hover:underline mt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add state code mapping
                </button>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                role="switch"
                aria-checked={form.is_active}
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  form.is_active
                    ? "bg-[hsl(var(--primary))]"
                    : "bg-[hsl(var(--muted))]"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                    form.is_active ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
              <span className="text-sm text-[hsl(var(--foreground))]">
                Active
              </span>
            </label>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {editing ? "Save Changes" : "Create Config"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  setStateCodeDraft([]);
                }}
                className="px-4 py-2 border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-lg hover:bg-[hsl(var(--muted))] transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center">
            <span className="w-6 h-6 border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] rounded-full animate-spin" />
          </div>
        ) : configs.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-10 h-10 text-[hsl(var(--muted-foreground))]" />
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">
              No webhook configs
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm">
              Create a config to accept callbacks from remote Automax systems
              and automatically transition incidents.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40">
                {[
                  "Name",
                  "Status",
                  "Action Mappings",
                  "State Code Mappings",
                  "Created",
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
              {configs.map((cfg) => (
                <tr
                  key={cfg.id}
                  className="hover:bg-[hsl(var(--muted))]/20 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {cfg.name}
                    </p>
                    {cfg.description && (
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                        {cfg.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        cfg.is_active
                          ? "bg-green-500/10 text-green-600"
                          : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                      }`}
                    >
                      {cfg.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <pre className="text-xs font-mono text-[hsl(var(--muted-foreground))] max-w-[180px] truncate">
                      {cfg.action_mappings || "—"}
                    </pre>
                  </td>
                  <td className="px-4 py-3">
                    <pre className="text-xs font-mono text-[hsl(var(--muted-foreground))] max-w-[180px] truncate">
                      {cfg.state_code_mappings || "—"}
                    </pre>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(cfg.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(cfg)}
                        className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {deleteConfirm === cfg.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteMut.mutate(cfg.id)}
                            className="p-1.5 rounded-lg bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/20 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(cfg.id)}
                          className="p-1.5 rounded-lg hover:bg-[hsl(var(--destructive))]/10 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
