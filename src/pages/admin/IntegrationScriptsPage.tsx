import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Code2,
  Zap,
  Play,
  X,
  Check,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileCode2,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { integrationApi } from "../../api/integration";
import type {
  IntegrationScript,
  IntegrationScriptRequest,
  IntegrationExecutionLog,
} from "../../api/integration";

const HTTP_PLACEHOLDER = JSON.stringify(
  {
    method: "POST",
    url: "https://external.system/api/incidents",
    headers: {
      "Content-Type": "application/json",
      "X-Source": "{{incident.incident_number}}",
    },
    body: {
      externalTitle: "{{incident.title}}",
      severity: "{{incident.priority}}",
      description: "{{incident.description}}",
      sourceRef: "{{incident.id}}",
    },
  },
  null,
  2,
);

const JS_PLACEHOLDER = `// Available context:
//   incident  — selected fields (id, incident_number, title, description, …)
//   vars      — decrypted integration variables (e.g. vars.JIRA_API_KEY)
//   http      — { post, get, put, patch, delete }
//   log       — { info, error }

const resp = http.post(
  "https://external.system/api/v2/tickets",
  {
    summary: incident.title,
    description: incident.description,
    priority: incident.priority,
    sourceId: incident.incident_number,
  },
  { Authorization: "Bearer " + vars.EXTERNAL_API_TOKEN }
);

if (resp.status >= 400) {
  throw new Error("External API failed: " + resp.status);
}

log.info("Ticket created: " + JSON.stringify(resp.body));
`;

const AUTH_TYPES = [
  { value: "none", label: "None" },
  { value: "api_key", label: "API Key" },
  { value: "bearer", label: "Bearer Token" },
  { value: "basic", label: "Basic Auth" },
  { value: "oauth2_client_credentials", label: "OAuth2 Client Credentials" },
];

const emptyBridgeConfig = () =>
  JSON.stringify({
    remote_system_name: "",
    remote_system_url: "",
    response_id_field: "data.id",
    response_number_field: "data.number",
  });

function parseBridgeConfig(raw: string): Record<string, string> {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

const emptyForm = (): IntegrationScriptRequest => ({
  name: "",
  description: "",
  script_type: "http_request",
  script_content: HTTP_PLACEHOLDER,
  auth_config: JSON.stringify({ type: "none" }),
  bridge_config: "",
  is_active: true,
});

function parseAuthConfig(raw: string): Record<string, string> {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return { type: "none" };
  }
}

const InputRow: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
      {label}
    </label>
    {children}
    {hint && (
      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{hint}</p>
    )}
  </div>
);

const inputCls =
  "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-colors";

export const IntegrationScriptsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<IntegrationScriptRequest>(emptyForm());
  const [authExpanded, setAuthExpanded] = useState(false);
  const [bridgeExpanded, setBridgeExpanded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [testModal, setTestModal] = useState(false);
  const [testIncidentId, setTestIncidentId] = useState("");
  const [testResult, setTestResult] = useState<IntegrationExecutionLog | null>(
    null,
  );

  const { data: scriptsRes, isLoading } = useQuery({
    queryKey: ["integration-scripts"],
    queryFn: () => integrationApi.listScripts(false),
  });
  const scripts: IntegrationScript[] = scriptsRes?.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (req: IntegrationScriptRequest) =>
      integrationApi.createScript(req),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["integration-scripts"] });
      toast.success("Script created");
      const newScript = res.data?.data;
      if (newScript) {
        setSelectedId(newScript.id);
        setIsNew(false);
      }
    },
    onError: () => toast.error("Failed to create script"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, req }: { id: string; req: IntegrationScriptRequest }) =>
      integrationApi.updateScript(id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-scripts"] });
      toast.success("Script saved");
    },
    onError: () => toast.error("Failed to save script"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => integrationApi.deleteScript(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-scripts"] });
      toast.success("Script deleted");
      setDeleteTarget(null);
      setSelectedId(null);
      setIsNew(false);
    },
    onError: () => toast.error("Failed to delete script"),
  });

  const testMutation = useMutation({
    mutationFn: ({ id, incidentId }: { id: string; incidentId: string }) =>
      integrationApi.testScript(id, incidentId),
    onSuccess: (res) => {
      setTestResult(res.data?.data ?? null);
    },
    onError: () => toast.error("Test execution failed"),
  });

  const handleSelectScript = (script: IntegrationScript) => {
    setSelectedId(script.id);
    setIsNew(false);
    setForm({
      name: script.name,
      description: script.description,
      script_type: script.script_type,
      script_content: script.script_content,
      auth_config: script.auth_config || JSON.stringify({ type: "none" }),
      bridge_config: script.bridge_config || "",
      is_active: script.is_active,
    });
    setAuthExpanded(false);
    setBridgeExpanded(false);
  };

  const handleNewScript = () => {
    setSelectedId(null);
    setIsNew(true);
    setForm(emptyForm());
    setAuthExpanded(false);
    setBridgeExpanded(false);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Script name is required");
      return;
    }
    if (isNew) {
      createMutation.mutate(form);
    } else if (selectedId) {
      updateMutation.mutate({ id: selectedId, req: form });
    }
  };

  const handleCancel = () => {
    setIsNew(false);
    setSelectedId(null);
  };

  const handleScriptTypeChange = (type: "http_request" | "javascript") => {
    setForm({
      ...form,
      script_type: type,
      script_content:
        type === "http_request" ? HTTP_PLACEHOLDER : JS_PLACEHOLDER,
    });
  };

  const authConfig = parseAuthConfig(form.auth_config || "{}");

  const setAuthField = (key: string, value: string) => {
    const updated = { ...authConfig, [key]: value };
    setForm({ ...form, auth_config: JSON.stringify(updated) });
  };

  const bridgeConfig = parseBridgeConfig(form.bridge_config || "{}");
  const hasBridgeConfig = !!(
    form.bridge_config && form.bridge_config.trim() !== ""
  );

  const setBridgeField = (key: string, value: string) => {
    const base = hasBridgeConfig
      ? bridgeConfig
      : parseBridgeConfig(emptyBridgeConfig());
    const updated = { ...base, [key]: value };
    setForm({ ...form, bridge_config: JSON.stringify(updated) });
  };

  const toggleBridgeConfig = () => {
    if (hasBridgeConfig) {
      setForm({ ...form, bridge_config: "" });
    } else {
      setForm({ ...form, bridge_config: emptyBridgeConfig() });
      setBridgeExpanded(true);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const showPanel = isNew || selectedId !== null;

  return (
    <div className="p-6 h-[calc(100vh-80px)] flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/10 flex items-center justify-center">
            <Code2 className="w-5 h-5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              Integration Scripts
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
              Define HTTP templates or JavaScript scripts triggered by workflow
              events
            </p>
          </div>
        </div>
        <button
          onClick={handleNewScript}
          className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Script
        </button>
      </div>

      {/* Split layout */}
      <div className="flex-1 flex gap-5 min-h-0">
        {/* Script list */}
        <div className="w-72 shrink-0 flex flex-col bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40">
            <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
              {scripts.length} script{scripts.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 flex justify-center">
                <span className="w-5 h-5 border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] rounded-full animate-spin" />
              </div>
            ) : scripts.length === 0 ? (
              <div className="p-8 flex flex-col items-center gap-3 text-center">
                <FileCode2 className="w-10 h-10 text-[hsl(var(--muted-foreground))]" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  No scripts yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[hsl(var(--border))]">
                {scripts.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectScript(s)}
                    className={`w-full text-left px-4 py-3 hover:bg-[hsl(var(--muted))]/50 transition-colors ${
                      selectedId === s.id
                        ? "bg-[hsl(var(--primary))]/8 border-l-2 border-l-[hsl(var(--primary))]"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-[hsl(var(--foreground))] leading-snug line-clamp-1">
                        {s.name}
                      </span>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          s.script_type === "javascript"
                            ? "bg-yellow-500/10 text-yellow-600"
                            : "bg-blue-500/10 text-blue-600"
                        }`}
                      >
                        {s.script_type === "javascript" ? (
                          <Zap className="w-2.5 h-2.5" />
                        ) : (
                          <Globe className="w-2.5 h-2.5" />
                        )}
                        {s.script_type === "javascript" ? "JS" : "HTTP"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          s.is_active ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Editor panel */}
        {showPanel ? (
          <div className="flex-1 flex flex-col bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden shadow-sm min-w-0">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 shrink-0">
              <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                {isNew ? "New Script" : form.name || "Edit Script"}
              </h2>
              <div className="flex items-center gap-2">
                {!isNew && selectedId && (
                  <>
                    <button
                      onClick={() => {
                        setTestModal(true);
                        setTestResult(null);
                        setTestIncidentId("");
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[hsl(var(--border))] rounded-lg hover:bg-[hsl(var(--muted))] transition-colors text-[hsl(var(--foreground))]"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Test
                    </button>
                    {deleteTarget === selectedId ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          Delete?
                        </span>
                        <button
                          onClick={() => deleteMutation.mutate(selectedId)}
                          className="px-2.5 py-1 text-xs font-medium bg-[hsl(var(--destructive))] text-white rounded-md hover:opacity-90"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteTarget(null)}
                          className="px-2.5 py-1 text-xs font-medium border border-[hsl(var(--border))] rounded-md hover:bg-[hsl(var(--muted))]"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteTarget(selectedId)}
                        className="p-1.5 rounded-lg hover:bg-[hsl(var(--destructive))]/10 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Form body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputRow label="Script Name *">
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Create Jira Ticket"
                    className={inputCls}
                  />
                </InputRow>
                <InputRow label="Description">
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Creates a ticket in Jira when incident is assigned"
                    className={inputCls}
                  />
                </InputRow>
              </div>

              {/* Script type */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  Script Type
                </label>
                <div className="flex gap-3">
                  {(
                    [
                      {
                        value: "http_request",
                        label: "HTTP Request Template",
                        icon: Globe,
                        color: "blue",
                      },
                      {
                        value: "javascript",
                        label: "JavaScript",
                        icon: Zap,
                        color: "yellow",
                      },
                    ] as const
                  ).map((t) => {
                    const Icon = t.icon;
                    const active = form.script_type === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => handleScriptTypeChange(t.value)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                          active
                            ? t.color === "blue"
                              ? "bg-blue-500/10 border-blue-500/40 text-blue-600"
                              : "bg-yellow-500/10 border-yellow-500/40 text-yellow-600"
                            : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Script content */}
              <InputRow
                label="Script Content"
                hint={
                  form.script_type === "http_request"
                    ? "JSON config. Use {{incident.field}} and {{vars.NAME}} placeholders."
                    : "JavaScript. Use the incident object and http helper for API calls."
                }
              >
                <textarea
                  value={form.script_content}
                  onChange={(e) =>
                    setForm({ ...form, script_content: e.target.value })
                  }
                  rows={16}
                  spellCheck={false}
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-colors resize-y"
                />
              </InputRow>

              {/* Auth config */}
              <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAuthExpanded(!authExpanded)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[hsl(var(--muted))]/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                      Authentication
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-full">
                      {authConfig.type || "none"}
                    </span>
                  </div>
                  {authExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  )}
                </button>

                {authExpanded && (
                  <div className="px-4 pb-4 pt-2 space-y-4 border-t border-[hsl(var(--border))]">
                    <div>
                      <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                        Auth Type
                      </label>
                      <select
                        value={authConfig.type || "none"}
                        onChange={(e) => setAuthField("type", e.target.value)}
                        className={inputCls}
                      >
                        {AUTH_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {authConfig.type === "api_key" && (
                      <div className="grid grid-cols-2 gap-4">
                        <InputRow
                          label="Header Name"
                          hint='Default: "X-API-Key"'
                        >
                          <input
                            type="text"
                            value={authConfig.api_key_header || ""}
                            onChange={(e) =>
                              setAuthField("api_key_header", e.target.value)
                            }
                            placeholder="X-API-Key"
                            className={inputCls}
                          />
                        </InputRow>
                        <InputRow
                          label="API Key Value"
                          hint="Use {{vars.NAME}} to reference a variable"
                        >
                          <input
                            type="text"
                            value={authConfig.api_key_value || ""}
                            onChange={(e) =>
                              setAuthField("api_key_value", e.target.value)
                            }
                            placeholder="{{vars.MY_API_KEY}}"
                            className={inputCls}
                          />
                        </InputRow>
                      </div>
                    )}

                    {authConfig.type === "bearer" && (
                      <InputRow
                        label="Bearer Token"
                        hint="Use {{vars.NAME}} to reference a variable"
                      >
                        <input
                          type="text"
                          value={authConfig.bearer_token || ""}
                          onChange={(e) =>
                            setAuthField("bearer_token", e.target.value)
                          }
                          placeholder="{{vars.BEARER_TOKEN}}"
                          className={inputCls}
                        />
                      </InputRow>
                    )}

                    {authConfig.type === "basic" && (
                      <div className="grid grid-cols-2 gap-4">
                        <InputRow label="Username">
                          <input
                            type="text"
                            value={authConfig.basic_username || ""}
                            onChange={(e) =>
                              setAuthField("basic_username", e.target.value)
                            }
                            placeholder="admin"
                            className={inputCls}
                          />
                        </InputRow>
                        <InputRow
                          label="Password"
                          hint="Use {{vars.NAME}} to reference a variable"
                        >
                          <input
                            type="text"
                            value={authConfig.basic_password || ""}
                            onChange={(e) =>
                              setAuthField("basic_password", e.target.value)
                            }
                            placeholder="{{vars.BASIC_PASSWORD}}"
                            className={inputCls}
                          />
                        </InputRow>
                      </div>
                    )}

                    {authConfig.type === "oauth2_client_credentials" && (
                      <div className="space-y-4">
                        <InputRow label="Token URL">
                          <input
                            type="text"
                            value={authConfig.oauth2_token_url || ""}
                            onChange={(e) =>
                              setAuthField("oauth2_token_url", e.target.value)
                            }
                            placeholder="https://auth.system.com/oauth/token"
                            className={inputCls}
                          />
                        </InputRow>
                        <div className="grid grid-cols-2 gap-4">
                          <InputRow label="Client ID">
                            <input
                              type="text"
                              value={authConfig.oauth2_client_id || ""}
                              onChange={(e) =>
                                setAuthField("oauth2_client_id", e.target.value)
                              }
                              placeholder="{{vars.OAUTH_CLIENT_ID}}"
                              className={inputCls}
                            />
                          </InputRow>
                          <InputRow
                            label="Client Secret"
                            hint="Use {{vars.NAME}} to reference a variable"
                          >
                            <input
                              type="text"
                              value={authConfig.oauth2_client_secret || ""}
                              onChange={(e) =>
                                setAuthField(
                                  "oauth2_client_secret",
                                  e.target.value,
                                )
                              }
                              placeholder="{{vars.OAUTH_CLIENT_SECRET}}"
                              className={inputCls}
                            />
                          </InputRow>
                        </div>
                        <InputRow label="Scope (optional)">
                          <input
                            type="text"
                            value={authConfig.oauth2_scope || ""}
                            onChange={(e) =>
                              setAuthField("oauth2_scope", e.target.value)
                            }
                            placeholder="openid profile"
                            className={inputCls}
                          />
                        </InputRow>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bridge Config (HTTP only) */}
              {form.script_type === "http_request" && (
                <div className="border border-[hsl(var(--border))] rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer bg-[hsl(var(--muted))]/30 hover:bg-[hsl(var(--muted))]/50 transition-colors select-none"
                    onClick={() => setBridgeExpanded((v) => !v)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                        Incident Bridge Config
                      </span>
                      {hasBridgeConfig && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium">
                          Enabled
                        </span>
                      )}
                    </div>
                    {bridgeExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    )}
                  </div>
                  {bridgeExpanded && (
                    <div className="p-4 space-y-4 border-t border-[hsl(var(--border))]">
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        When enabled, a successful execution auto-creates an
                        incident bridge linking to the remote incident using
                        fields from the response body. Use dot-notation for
                        nested fields (e.g.{" "}
                        <code className="bg-[hsl(var(--muted))] px-1 rounded">
                          data.id
                        </code>
                        ).
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={hasBridgeConfig}
                          onClick={toggleBridgeConfig}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 ${
                            hasBridgeConfig
                              ? "bg-[hsl(var(--primary))]"
                              : "bg-[hsl(var(--muted))]"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                              hasBridgeConfig
                                ? "translate-x-[18px]"
                                : "translate-x-[3px]"
                            }`}
                          />
                        </button>
                        <span className="text-sm text-[hsl(var(--foreground))]">
                          Enable bridge tracking for this script
                        </span>
                      </div>
                      {hasBridgeConfig && (
                        <div className="space-y-3 pt-1">
                          <InputRow
                            label="Remote System Name"
                            hint='Label shown in the "Linked Systems" panel (e.g. "HQ Automax")'
                          >
                            <input
                              type="text"
                              value={bridgeConfig.remote_system_name || ""}
                              onChange={(e) =>
                                setBridgeField(
                                  "remote_system_name",
                                  e.target.value,
                                )
                              }
                              placeholder="HQ Automax"
                              className={inputCls}
                            />
                          </InputRow>
                          <InputRow
                            label="Remote System URL"
                            hint="Base URL of the remote Automax (used to build deep-link to the remote incident)"
                          >
                            <input
                              type="text"
                              value={bridgeConfig.remote_system_url || ""}
                              onChange={(e) =>
                                setBridgeField(
                                  "remote_system_url",
                                  e.target.value,
                                )
                              }
                              placeholder="https://hq.automax.example.com"
                              className={inputCls}
                            />
                          </InputRow>
                          <InputRow
                            label="Response ID Field"
                            hint="Dot-path to the remote incident UUID in the response JSON"
                          >
                            <input
                              type="text"
                              value={bridgeConfig.response_id_field || ""}
                              onChange={(e) =>
                                setBridgeField(
                                  "response_id_field",
                                  e.target.value,
                                )
                              }
                              placeholder="data.id"
                              className={inputCls}
                            />
                          </InputRow>
                          <InputRow
                            label="Response Number Field"
                            hint="Dot-path to the human-readable incident number in the response JSON"
                          >
                            <input
                              type="text"
                              value={bridgeConfig.response_number_field || ""}
                              onChange={(e) =>
                                setBridgeField(
                                  "response_number_field",
                                  e.target.value,
                                )
                              }
                              placeholder="data.number"
                              className={inputCls}
                            />
                          </InputRow>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.is_active}
                  onClick={() =>
                    setForm({ ...form, is_active: !form.is_active })
                  }
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 ${
                    form.is_active
                      ? "bg-[hsl(var(--primary))]"
                      : "bg-[hsl(var(--muted))]"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                      form.is_active
                        ? "translate-x-[18px]"
                        : "translate-x-[3px]"
                    }`}
                  />
                </button>
                <span className="text-sm text-[hsl(var(--foreground))]">
                  Script is active
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="shrink-0 flex items-center gap-3 px-5 py-3.5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {isNew ? "Create Script" : "Save Changes"}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-lg hover:bg-[hsl(var(--muted))] transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-sm">
            <div className="flex flex-col items-center gap-3 text-center p-12">
              <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center">
                <Code2 className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
              </div>
              <p className="text-[hsl(var(--foreground))] font-medium">
                Select a script to edit
              </p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                or create a new one with the button above
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Test Modal */}
      {testModal && selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-[hsl(var(--primary))]" />
                <h3 className="font-semibold text-[hsl(var(--foreground))]">
                  Test Script
                </h3>
              </div>
              <button
                onClick={() => {
                  setTestModal(false);
                  setTestResult(null);
                }}
                className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                  Incident ID
                </label>
                <input
                  type="text"
                  value={testIncidentId}
                  onChange={(e) => setTestIncidentId(e.target.value)}
                  placeholder="Paste incident UUID"
                  className={inputCls}
                />
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  The script will run with this incident's data as context
                </p>
              </div>

              <button
                onClick={() =>
                  testMutation.mutate({
                    id: selectedId,
                    incidentId: testIncidentId,
                  })
                }
                disabled={!testIncidentId.trim() || testMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50"
              >
                {testMutation.isPending ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Run Test
              </button>

              {testResult && (
                <div className="space-y-3 pt-2 border-t border-[hsl(var(--border))]">
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {testResult.status === "success" ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[hsl(var(--destructive))]" />
                    )}
                    <span
                      className={`text-sm font-semibold capitalize ${
                        testResult.status === "success"
                          ? "text-green-600"
                          : "text-[hsl(var(--destructive))]"
                      }`}
                    >
                      {testResult.status}
                    </span>
                    {testResult.status_code > 0 && (
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        HTTP {testResult.status_code}
                      </span>
                    )}
                    <span className="text-xs text-[hsl(var(--muted-foreground))] ml-auto">
                      {testResult.duration_ms}ms
                    </span>
                  </div>

                  {testResult.error_message && (
                    <div className="flex items-start gap-2 px-3 py-2 bg-[hsl(var(--destructive))]/8 border border-[hsl(var(--destructive))]/20 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-[hsl(var(--destructive))] mt-0.5 shrink-0" />
                      <p className="text-xs text-[hsl(var(--destructive))] font-mono">
                        {testResult.error_message}
                      </p>
                    </div>
                  )}

                  {testResult.request_payload && (
                    <div>
                      <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1.5">
                        Request Payload
                      </p>
                      <pre className="text-xs font-mono bg-[hsl(var(--muted))]/60 rounded-lg p-3 overflow-x-auto max-h-32 text-[hsl(var(--foreground))]">
                        {(() => {
                          try {
                            return JSON.stringify(
                              JSON.parse(testResult.request_payload),
                              null,
                              2,
                            );
                          } catch {
                            return testResult.request_payload;
                          }
                        })()}
                      </pre>
                    </div>
                  )}

                  {testResult.response_body && (
                    <div>
                      <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1.5">
                        Response
                      </p>
                      <pre className="text-xs font-mono bg-[hsl(var(--muted))]/60 rounded-lg p-3 overflow-x-auto max-h-32 text-[hsl(var(--foreground))]">
                        {(() => {
                          try {
                            return JSON.stringify(
                              JSON.parse(testResult.response_body),
                              null,
                              2,
                            );
                          } catch {
                            return testResult.response_body;
                          }
                        })()}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
