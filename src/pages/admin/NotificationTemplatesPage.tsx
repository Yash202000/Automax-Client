import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Mail,
  MessageSquare,
  Info,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { notificationTemplateApi } from "../../api/admin";
import type { NotificationTemplate } from "../../types";
import { Button } from "../../components/ui";

// ─── constants ──────────────────────────────────────────────────────────────

const CHANNELS = ["email", "sms"] as const;
const MODULE_TYPES = [
  "incident",
  "complaint",
  "request",
  "query",
  "global",
] as const;
const ACTION_TYPES = [
  "escalation",
  "assignment",
  "closure",
  "status_change",
  "ready_to_close",
  "new_incident",
  "custom",
] as const;

// ─── helpers ─────────────────────────────────────────────────────────────────

const channelBadge = (ch: string) =>
  ch === "email" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
      <Mail className="w-3 h-3" /> Email
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
      <MessageSquare className="w-3 h-3" /> SMS
    </span>
  );

const actionBadge = (at: string) => (
  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
    {at.replace(/_/g, " ")}
  </span>
);

// ─── form types ──────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  code: string;
  channel: "email" | "sms";
  module_type: string;
  action_type: string;
  subject_en: string;
  body_en: string;
  subject_ar: string;
  body_ar: string;
  variables: string;
  is_active: boolean;
}

const blankForm = (): FormState => ({
  name: "",
  code: "",
  channel: "email",
  module_type: "incident",
  action_type: "status_change",
  subject_en: "",
  body_en: "",
  subject_ar: "",
  body_ar: "",
  variables: "",
  is_active: true,
});

// ─── VariableHint component ──────────────────────────────────────────────────

const GROUP_ESCALATION_VARS = [
  "first_name",
  "last_name",
  "incident_count",
  "classification_name",
  "sla_page_url",
  "incidents_summary",
  "report_date",
];
const POLICY_ESCALATION_VARS = [
  "first_name",
  "last_name",
  "incident_number",
  "incident_title",
  "incident_url",
  "state_name",
  "hours_in_state",
  "sla_hours",
  "policy_name",
  "step_order",
  "hours_in_breach",
];

const VarChip: React.FC<{ v: string }> = ({ v }) => (
  <code
    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-blue-100"
    title="Click to copy"
    onClick={() => {
      navigator.clipboard.writeText(`{{${v}}}`).catch(() => {});
      toast.success(`Copied {{${v}}}`);
    }}
  >
    {`{{${v}}}`}
  </code>
);

const VariableHint: React.FC<{
  actionType: string;
  vars: Record<string, string[]>;
}> = ({ actionType, vars }) => {
  const [open, setOpen] = useState(false);
  const list = vars[actionType] ?? [];
  if (list.length === 0) return null;

  const isEscalation = actionType === "escalation";

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
      >
        <Info className="w-3 h-3" />
        Available variables
        {open ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>
      {open &&
        (isEscalation ? (
          <div className="mt-2 space-y-3">
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-2">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
                Escalation Group template — one email covers many incidents
              </p>
              <div className="flex flex-wrap gap-1">
                {GROUP_ESCALATION_VARS.map((v) => (
                  <VarChip key={v} v={v} />
                ))}
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1.5">
                Use <code className="font-mono">{"{{incidents_summary}}"}</code>{" "}
                to show the list of all breached incidents.
              </p>
            </div>
            <div className="rounded-md border border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800 p-2">
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1.5">
                Escalation Policy step template — one email per incident
              </p>
              <div className="flex flex-wrap gap-1">
                {POLICY_ESCALATION_VARS.map((v) => (
                  <VarChip key={v} v={v} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-1 flex flex-wrap gap-1">
            {list.map((v) => (
              <VarChip key={v} v={v} />
            ))}
          </div>
        ))}
    </div>
  );
};

// ─── TemplateModal ────────────────────────────────────────────────────────────

interface TemplateModalProps {
  initial?: NotificationTemplate;
  availableVars: Record<string, string[]>;
  onClose: () => void;
  onSaved: () => void;
}

const TemplateModal: React.FC<TemplateModalProps> = ({
  initial,
  availableVars,
  onClose,
  onSaved,
}) => {
  const isEdit = !!initial;
  const [form, setForm] = useState<FormState>(() =>
    initial
      ? {
          name: initial.name,
          code: initial.code,
          channel: initial.channel,
          module_type: initial.module_type || "incident",
          action_type: initial.action_type || "status_change",
          subject_en: initial.subject_en || "",
          body_en: initial.body_en,
          subject_ar: initial.subject_ar || "",
          body_ar: initial.body_ar || "",
          variables: initial.variables || "",
          is_active: initial.is_active,
        }
      : blankForm(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.code.trim()) e.code = "Code is required";
    if (!/^[A-Z0-9_]+$/.test(form.code.trim()))
      e.code =
        "Code must be uppercase letters, digits and underscores only (e.g. SLA_BREACH)";
    if (!form.body_en.trim() && !form.body_ar.trim())
      e.body_en = "At least one body (EN or AR) is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const createMut = useMutation({
    mutationFn: () =>
      notificationTemplateApi.create({
        name: form.name,
        code: form.code,
        channel: form.channel,
        module_type: form.module_type,
        action_type: form.action_type,
        subject_en: form.subject_en,
        body_en: form.body_en,
        subject_ar: form.subject_ar,
        body_ar: form.body_ar,
        variables: form.variables,
        is_active: form.is_active,
      }),
    onSuccess: () => {
      toast.success("Template created");
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message || "Create failed"),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      notificationTemplateApi.update(initial!.id, {
        name: form.name,
        subject_en: form.subject_en,
        body_en: form.body_en,
        subject_ar: form.subject_ar,
        body_ar: form.body_ar,
        module_type: form.module_type,
        action_type: form.action_type,
        variables: form.variables,
        is_active: form.is_active,
      }),
    onSuccess: () => {
      toast.success("Template updated");
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message || "Update failed"),
  });

  // const handleSubmit = () => {
  //   if (!validate()) return;
  //   isEdit if  updateMut.mutate() : createMut.mutate();
  // };

  const handleSubmit = () => {
    if (!validate()) return;
    if (isEdit) {
      updateMut.mutate();
    } else {
      createMut.mutate();
    }
  };

  const busy = createMut.isPending || updateMut.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[hsl(var(--background))] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-base font-semibold">
            {isEdit ? "Edit Template" : "New Notification Template"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* row: name + code */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--background))]"
                placeholder="SLA State Breach Email"
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                value={form.code}
                onChange={(e) =>
                  set({
                    code: e.target.value.toUpperCase().replace(/\s/g, "_"),
                  })
                }
                disabled={isEdit}
                className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--background))] font-mono disabled:opacity-60"
                placeholder="SLA_STATE_BREACH"
              />
              {errors.code && (
                <p className="text-xs text-red-500 mt-0.5">{errors.code}</p>
              )}
            </div>
          </div>

          {/* row: channel + module_type + action_type */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Channel <span className="text-red-500">*</span>
              </label>
              <select
                value={form.channel}
                onChange={(e) =>
                  set({ channel: e.target.value as "email" | "sms" })
                }
                disabled={isEdit}
                className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--background))] disabled:opacity-60"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Module
              </label>
              <select
                value={form.module_type}
                onChange={(e) => set({ module_type: e.target.value })}
                className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--background))]"
              >
                {MODULE_TYPES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Action Type
              </label>
              <select
                value={form.action_type}
                onChange={(e) => set({ action_type: e.target.value })}
                className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--background))]"
              >
                {ACTION_TYPES.map((a) => (
                  <option key={a} value={a}>
                    {a.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* subject EN */}
          {form.channel === "email" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Subject (EN)
              </label>
              <input
                value={form.subject_en}
                onChange={(e) => set({ subject_en: e.target.value })}
                className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--background))]"
                placeholder="SLA Alert: Incident {{incident_number}} — action required"
              />
            </div>
          )}

          {/* body EN */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Body (EN) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.body_en}
              onChange={(e) => set({ body_en: e.target.value })}
              rows={5}
              className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--background))] font-mono resize-y"
              placeholder={
                "Dear {{first_name}},\n\nIncident {{incident_number}} — {{incident_title}} ..."
              }
            />
            {errors.body_en && (
              <p className="text-xs text-red-500 mt-0.5">{errors.body_en}</p>
            )}
            <VariableHint actionType={form.action_type} vars={availableVars} />
          </div>

          {/* subject AR */}
          {form.channel === "email" && (
            <div dir="rtl">
              <label className="block text-xs font-medium text-muted-foreground mb-1 text-right">
                Subject (AR)
              </label>
              <input
                value={form.subject_ar}
                onChange={(e) => set({ subject_ar: e.target.value })}
                className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--background))] text-right"
                placeholder="تنبيه: الحادثة {{incident_number}}"
              />
            </div>
          )}

          {/* body AR */}
          <div dir="rtl">
            <label className="block text-xs font-medium text-muted-foreground mb-1 text-right">
              Body (AR)
            </label>
            <textarea
              value={form.body_ar}
              onChange={(e) => set({ body_ar: e.target.value })}
              rows={4}
              className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-[hsl(var(--background))] font-mono resize-y text-right"
              placeholder={
                "عزيزي {{first_name}}، الحادثة {{incident_number}} ..."
              }
            />
          </div>

          {/* is_active */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => set({ is_active: !form.is_active })}
              className="text-primary"
            >
              {form.is_active ? (
                <ToggleRight className="w-6 h-6 text-green-600" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-slate-400" />
              )}
            </button>
            <span className="text-sm">
              {form.is_active
                ? "Active — template will be used"
                : "Inactive — fallback content used"}
            </span>
          </div>
        </div>

        {/* footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))]">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={busy}>
            {isEdit ? "Save Changes" : "Create Template"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── main page ────────────────────────────────────────────────────────────────

export const NotificationTemplatesPage: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<
    NotificationTemplate | undefined
  >();
  const [deleteTarget, setDeleteTarget] = useState<
    NotificationTemplate | undefined
  >();

  // Fetch templates
  const { data, isLoading } = useQuery({
    queryKey: [
      "notification-templates",
      "all",
      filterChannel,
      filterAction,
      search,
    ],
    queryFn: () =>
      notificationTemplateApi.list({
        channel: filterChannel || undefined,
        action_type: filterAction || undefined,
        search: search || undefined,
        limit: 100,
      }),
  });

  // Fetch available variables
  const { data: varsData } = useQuery({
    queryKey: ["notification-templates", "available-variables"],
    queryFn: notificationTemplateApi.getAvailableVariables,
  });

  // The endpoint wraps the map under `.data` inside the response `.data`
  const availableVars: Record<string, string[]> =
    (varsData as unknown as { data: { data: Record<string, string[]> } })?.data
      ?.data ?? {};

  const templates: NotificationTemplate[] = data?.data ?? [];

  const toggleMut = useMutation({
    mutationFn: (id: string) => notificationTemplateApi.toggle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-templates"] });
      toast.success("Template status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => notificationTemplateApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-templates"] });
      toast.success("Template deleted");
      setDeleteTarget(undefined);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditTarget(undefined);
    setModalOpen(true);
  };

  const openEdit = (t: NotificationTemplate) => {
    setEditTarget(t);
    setModalOpen(true);
  };

  const onSaved = () => {
    qc.invalidateQueries({ queryKey: ["notification-templates"] });
    setModalOpen(false);
    setEditTarget(undefined);
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Notification Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage bilingual email &amp; SMS templates used by transitions,
            escalations, and SLA alerts.
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          New Template
        </Button>
      </div>

      {/* system template codes hint */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-4 text-sm space-y-2">
        <p className="font-semibold text-blue-800 dark:text-blue-200">
          System-reserved template codes (create these to override the built-in
          fallback messages):
        </p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-blue-700 dark:text-blue-300 font-mono text-xs">
          <span>SLA_STATE_BREACH — email</span>
          <span>SLA_STATE_BREACH_SMS — sms</span>
          <span>SLA_POLICY_BREACH — email</span>
          <span>SLA_POLICY_BREACH_SMS — sms</span>
          <span>SLA_GLOBAL_BREACH — email</span>
          <span>SLA_GLOBAL_BREACH_SMS — sms</span>
        </div>
        <p className="text-blue-600 dark:text-blue-400 text-xs">
          Use{" "}
          <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">{`{{variable_name}}`}</code>{" "}
          in body/subject — e.g.{" "}
          <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">{`{{incident_number}}`}</code>
          ,{" "}
          <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">{`{{first_name}}`}</code>
          . Click any variable chip in the editor to copy it.
        </p>
      </div>

      {/* filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full pl-9 pr-3 h-9 border border-[hsl(var(--border))] rounded-lg text-sm bg-[hsl(var(--background))]"
          />
        </div>
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className="h-9 border border-[hsl(var(--border))] rounded-lg px-3 text-sm bg-[hsl(var(--background))]"
        >
          <option value="">All channels</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
        </select>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="h-9 border border-[hsl(var(--border))] rounded-lg px-3 text-sm bg-[hsl(var(--background))]"
        >
          <option value="">All action types</option>
          {ACTION_TYPES.map((a) => (
            <option key={a} value={a}>
              {a.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {/* table */}
      {isLoading ? (
        <div className="flex justify-center py-12 text-muted-foreground text-sm">
          Loading templates...
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-base font-medium">No templates found</p>
          <p className="text-sm mt-1">
            Create one using the "New Template" button above.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[hsl(var(--muted))] text-muted-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Channel</th>
                <th className="px-4 py-3 text-left font-medium">Action Type</th>
                <th className="px-4 py-3 text-left font-medium">
                  Subject (EN)
                </th>
                <th className="px-4 py-3 text-center font-medium">Active</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {templates.map((tpl) => (
                <tr
                  key={tpl.id}
                  className="hover:bg-[hsl(var(--muted)/0.4)] transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    {tpl.code}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {tpl.name}
                  </td>
                  <td className="px-4 py-3">{channelBadge(tpl.channel)}</td>
                  <td className="px-4 py-3">{actionBadge(tpl.action_type)}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                    {tpl.subject_en || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleMut.mutate(tpl.id)}
                      disabled={toggleMut.isPending}
                      title={tpl.is_active ? "Deactivate" : "Activate"}
                    >
                      {tpl.is_active ? (
                        <ToggleRight className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-slate-400 mx-auto" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(tpl)}
                        className="p-1.5 rounded hover:bg-[hsl(var(--muted))] text-muted-foreground hover:text-foreground"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(tpl)}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      {modalOpen && (
        <TemplateModal
          initial={editTarget}
          availableVars={availableVars}
          onClose={() => {
            setModalOpen(false);
            setEditTarget(undefined);
          }}
          onSaved={onSaved}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[hsl(var(--background))] rounded-xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-foreground">Delete Template</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-mono font-medium text-foreground">
                {deleteTarget.code}
              </span>
              ? This cannot be undone. Any notification configured to use this
              code will fall back to its built-in default message.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setDeleteTarget(undefined)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                isLoading={deleteMut.isPending}
                onClick={() => deleteMut.mutate(deleteTarget.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationTemplatesPage;
