import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { integrationApi } from "../../api/integration";
import type { IntegrationVariableCreateRequest } from "../../api/integration";

const emptyForm = (): IntegrationVariableCreateRequest => ({
  name: "",
  description: "",
  value: "",
  is_secret: true,
});

export const IntegrationVariablesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] =
    useState<IntegrationVariableCreateRequest>(emptyForm());
  const [showValue, setShowValue] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: varsRes, isLoading } = useQuery({
    queryKey: ["integration-variables"],
    queryFn: () => integrationApi.listVariables(),
  });
  const variables = varsRes?.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (req: IntegrationVariableCreateRequest) =>
      integrationApi.createVariable(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-variables"] });
      toast.success("Variable created successfully");
      setShowForm(false);
      setForm(emptyForm());
      setErrors({});
    },
    onError: () => toast.error("Failed to create variable"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => integrationApi.deleteVariable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-variables"] });
      toast.success("Variable deleted");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to delete variable"),
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    else if (!/^[A-Z0-9_]+$/.test(form.name))
      e.name = "Use only UPPERCASE letters, digits, and underscores";
    if (!form.value.trim()) e.value = "Value is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    createMutation.mutate(form);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
              Integration Variables
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
              Encrypted secrets and API keys used by integration scripts
            </p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Variable
          </button>
        )}
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <ShieldCheck className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Write-only secrets
          </p>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
            Variable values are encrypted with AES-256-GCM and cannot be viewed
            after creation. To update a value, delete and recreate the variable.
          </p>
        </div>
      </div>

      {/* Add Variable Form */}
      {showForm && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">
              New Variable
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm());
                setErrors({});
              }}
              className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                  Name <span className="text-[hsl(var(--destructive))]">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      name: e.target.value.toUpperCase().replace(/\s/g, "_"),
                    });
                    if (errors.name) setErrors({ ...errors, name: "" });
                  }}
                  placeholder="JIRA_API_KEY"
                  className={`w-full px-3 py-2 bg-[hsl(var(--background))] border rounded-lg text-[hsl(var(--foreground))] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-colors ${
                    errors.name
                      ? "border-[hsl(var(--destructive))]"
                      : "border-[hsl(var(--border))]"
                  }`}
                />
                {errors.name && (
                  <p className="flex items-center gap-1 text-xs text-[hsl(var(--destructive))] mt-1">
                    <AlertCircle className="w-3 h-3" /> {errors.name}
                  </p>
                )}
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  Reference in scripts as{" "}
                  <code className="font-mono bg-[hsl(var(--muted))] px-1 rounded">
                    {"{{vars.NAME}}"}
                  </code>
                </p>
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
                  placeholder="API key for Jira integration"
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                Value <span className="text-[hsl(var(--destructive))]">*</span>
              </label>
              <div className="relative">
                <input
                  type={showValue ? "text" : "password"}
                  value={form.value}
                  onChange={(e) => {
                    setForm({ ...form, value: e.target.value });
                    if (errors.value) setErrors({ ...errors, value: "" });
                  }}
                  placeholder="Paste your secret value here"
                  className={`w-full px-3 py-2 pr-10 bg-[hsl(var(--background))] border rounded-lg text-[hsl(var(--foreground))] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-colors ${
                    errors.value
                      ? "border-[hsl(var(--destructive))]"
                      : "border-[hsl(var(--border))]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowValue(!showValue)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  {showValue ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.value && (
                <p className="flex items-center gap-1 text-xs text-[hsl(var(--destructive))] mt-1">
                  <AlertCircle className="w-3 h-3" /> {errors.value}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.is_secret}
                onClick={() => setForm({ ...form, is_secret: !form.is_secret })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 ${
                  form.is_secret
                    ? "bg-[hsl(var(--primary))]"
                    : "bg-[hsl(var(--muted))]"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                    form.is_secret ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
              <span className="text-sm text-[hsl(var(--foreground))]">
                Mark as secret (mask value in UI)
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50"
              >
                {createMutation.isPending ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save Variable
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyForm());
                  setErrors({});
                }}
                className="px-4 py-2 border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-lg hover:bg-[hsl(var(--muted))] transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <span className="w-6 h-6 border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] rounded-full animate-spin" />
          </div>
        ) : variables.length === 0 ? (
          <div className="p-16 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center">
              <Lock className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
            </div>
            <div>
              <p className="text-[hsl(var(--foreground))] font-medium">
                No variables yet
              </p>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                Add your first secret to use in integration scripts
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Variable
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40">
                <th className="text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider px-5 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider px-5 py-3">
                  Description
                </th>
                <th className="text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider px-5 py-3">
                  Type
                </th>
                <th className="text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider px-5 py-3">
                  Created
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {variables.map((v) => (
                <tr
                  key={v.id}
                  className="hover:bg-[hsl(var(--muted))]/30 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-sm font-medium text-[hsl(var(--foreground))]">
                      {v.name}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                      {v.description || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {v.is_secret ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600">
                        <Lock className="w-3 h-3" /> Secret
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                        Plain
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                      {new Date(v.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {deleteTarget === v.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          Delete?
                        </span>
                        <button
                          onClick={() => deleteMutation.mutate(v.id)}
                          disabled={deleteMutation.isPending}
                          className="px-2.5 py-1 text-xs font-medium bg-[hsl(var(--destructive))] text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteTarget(null)}
                          className="px-2.5 py-1 text-xs font-medium border border-[hsl(var(--border))] rounded-md hover:bg-[hsl(var(--muted))] transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteTarget(v.id)}
                        className="p-1.5 rounded-lg hover:bg-[hsl(var(--destructive))]/10 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
        {variables.length} variable{variables.length !== 1 ? "s" : ""} stored
        &middot; All values encrypted with AES-256-GCM
      </p>
    </div>
  );
};
