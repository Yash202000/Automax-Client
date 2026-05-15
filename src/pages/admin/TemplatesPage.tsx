import { useState, useRef, useEffect, useMemo } from "react";
import {
  Plus,
  RefreshCw,
  Search,
  Filter,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Mail,
  MessageSquare,
  Check,
  AlertTriangle,
  FileText,
  ArrowLeft,
  Pencil,
  X,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

// ─── constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ["escalation", "closure", "rejection", "reminder"];
const TYPES = ["email", "sms"];
const EVENTS = [
  "sla_breach",
  "incident_closed",
  "ticket_rejected",
  "reminder_24h",
  "reminder_48h",
  "escalation_l1",
  "escalation_l2",
  "closure_confirmed",
];

const CATEGORY_STYLES: any = {
  escalation: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  closure: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  rejection: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  reminder: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
};

const TYPE_STYLES: any = {
  email: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    icon: Mail,
  },
  sms: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    icon: MessageSquare,
  },
};

const COLUMN_STORAGE_KEY = "template_columns_config";

const defaultColumns = [
  { id: "name", label: "Name / Code", visible: true, required: true },
  { id: "type", label: "Type", visible: true },
  { id: "category", label: "Category", visible: true },
  { id: "event", label: "Event", visible: true },
  { id: "subject", label: "Subject", visible: false },
  { id: "status", label: "Status", visible: true },
  { id: "actions", label: "Actions", visible: true, required: true },
];

// ─── seed data ────────────────────────────────────────────────────────────────
const seedData = [
  {
    id: "t-001",
    name: "SLA Breach Alert",
    code: "SLA_BREACH_EMAIL",
    type: "email",
    category: "escalation",
    event: "sla_breach",
    subject: "Attention: SLA Breach for {{ticket_id}}",
    body: "Dear {{username}},\n\nThis is an automated notification regarding the escalation of ticket {{ticket_id}}. The SLA for this task has reached a critical stage.\n\nPlease review the status in the portal immediately.",
    is_active: true,
    created_by: "admin-001",
    created_at: "2025-03-12T09:14:00Z",
    updated_at: "2025-04-01T11:30:00Z",
  },
  {
    id: "t-002",
    name: "Incident Closed SMS",
    code: "INCIDENT_CLOSED_SMS",
    type: "sms",
    category: "closure",
    event: "incident_closed",
    subject: "",
    body: "Hi {{username}}, your incident #{{ticket_id}} has been resolved. Thank you for your patience.",
    is_active: true,
    created_by: "admin-001",
    created_at: "2025-03-15T10:00:00Z",
    updated_at: "2025-03-15T10:00:00Z",
  },
  {
    id: "t-003",
    name: "Ticket Rejection Notice",
    code: "TICKET_REJECTED_EMAIL",
    type: "email",
    category: "rejection",
    event: "ticket_rejected",
    subject: "Update on your request #{{ticket_id}}",
    body: "Dear {{username}},\n\nWe regret to inform you that your request #{{ticket_id}} could not be processed.\n\nReason: {{rejection_reason}}\n\nPlease contact support if you need assistance.",
    is_active: false,
    created_by: "admin-002",
    created_at: "2025-04-02T08:00:00Z",
    updated_at: "2025-04-10T14:22:00Z",
  },
  {
    id: "t-004",
    name: "24h Reminder",
    code: "REMINDER_24H_SMS",
    type: "sms",
    category: "reminder",
    event: "reminder_24h",
    subject: "",
    body: "Reminder: Ticket {{ticket_id}} is due in 24 hours. Please take action.",
    is_active: true,
    created_by: "admin-001",
    created_at: "2025-04-05T07:00:00Z",
    updated_at: "2025-04-05T07:00:00Z",
  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
const uid = () => "t-" + Math.random().toString(36).slice(2, 8);
const nowIso = () => new Date().toISOString();
const fmt = (iso: any) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const emptyForm = () => ({
  name: "",
  code: "",
  type: "email",
  category: "escalation",
  event: "",
  subject: "",
  body: "",
  is_active: true,
});

const loadColumns = () => {
  try {
    const s = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      return defaultColumns.map((d) => {
        const found = parsed.find((p: any) => p.id === d.id);
        return found ? { ...d, visible: found.visible } : d;
      });
    }
  } catch (e) {
    console.error("Failed to load column configuration, using defaults.", e);
  }
  return defaultColumns;
};

// ─── shared atoms ─────────────────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all";

function Badge({ label, style }: { label: string; style: any }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        style.bg,
        style.text,
        style.border,
      )}
    >
      {label}
    </span>
  );
}

function StatusToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
        checked
          ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
          : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100",
      )}
    >
      {checked ? (
        <ToggleRight className="w-3.5 h-3.5" />
      ) : (
        <ToggleLeft className="w-3.5 h-3.5" />
      )}
      {checked ? "Active" : "Inactive"}
    </button>
  );
}

function FormField({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function DeleteConfirm({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 w-full max-w-sm">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-4">
          <Trash2 className="w-5 h-5 text-red-500" />
        </div>
        <p className="text-base font-semibold text-gray-900 mb-1">
          Delete template?
        </p>
        <p className="text-sm text-gray-500 mb-5 leading-relaxed">
          <span className="font-medium text-gray-700">{name}</span> will be
          permanently deleted. This cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── form page ────────────────────────────────────────────────────────────────
function TemplateForm({
  initial,
  onSave,
  onCancel,
  isEdit,
}: {
  initial: any;
  onSave: (form: any) => void;
  onCancel: () => void;
  isEdit: boolean;
}) {
  const [form, setForm] = useState(initial || emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: any) => {
    setForm((f: any) => ({ ...f, [k]: v }));
    setErrors((e: any) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.code.trim()) e.code = "Required";
    if (!form.body.trim()) e.body = "Required";
    if (form.type === "email" && !form.subject.trim())
      e.subject = "Required for email type";
    setErrors(e);
    return !Object.keys(e).length;
  };

  return (
    <div className="max-h-screen bg-background">
      {/* Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-lg text-gray-400">
              <span className="font-semibold text-gray-700">
                {isEdit ? "Edit template" : "Create template"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className=" mx-auto px-6 py-6 space-y-4">
        {/* General configuration */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Settings2 className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                General configuration
              </p>
              <p className="text-xs text-gray-400">
                Core identity and routing properties
              </p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <FormField label="Template name" required error={errors.name}>
                <input
                  className={cn(
                    inputCls,
                    errors.name &&
                      "border-red-300 focus:border-red-400 focus:ring-red-500/20",
                  )}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. SLA Breach Alert"
                />
              </FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Type" required>
                <select
                  className={inputCls}
                  value={form.type}
                  onChange={(e) => set("type", e.target.value)}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.toUpperCase()}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Category" required>
                <select
                  className={inputCls}
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Event" hint="Trigger event name">
                <select
                  className={inputCls}
                  value={form.event}
                  onChange={(e) => set("event", e.target.value)}
                >
                  <option value="">— Select event —</option>
                  {EVENTS.map((ev) => (
                    <option key={ev} value={ev}>
                      {ev}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => set("is_active", !form.is_active)}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30",
                  form.is_active ? "bg-indigo-600" : "bg-gray-200",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                    form.is_active ? "translate-x-4" : "translate-x-0.5",
                  )}
                />
              </button>
              <span className="text-sm text-gray-600">
                Template is{" "}
                <span
                  className={cn(
                    "font-medium",
                    form.is_active ? "text-green-600" : "text-gray-400",
                  )}
                >
                  {form.is_active ? "active" : "inactive"}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Template content
              </p>
              <p className="text-xs text-gray-400">
                Subject and body. Use{" "}
                <code className="bg-gray-100 px-1 rounded text-gray-600">
                  {"{{variable}}"}
                </code>{" "}
                syntax for dynamic values.
              </p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {form.type === "email" && (
              <FormField label="Subject line" required error={errors.subject}>
                <input
                  className={cn(inputCls, errors.subject && "border-red-300")}
                  value={form.subject}
                  onChange={(e) => set("subject", e.target.value)}
                  placeholder="e.g. Attention: SLA Breach for {{ticket_id}}"
                />
              </FormField>
            )}
            <FormField
              label="Body"
              required
              error={errors.body}
              hint={
                form.type === "sms"
                  ? `${form.body.length} chars · ${Math.max(1, Math.ceil(form.body.length / 160))} segment(s)`
                  : `${form.body.length} chars`
              }
            >
              <textarea
                className={cn(
                  inputCls,
                  "min-h-[160px] resize-y font-mono leading-relaxed",
                  errors.body && "border-red-300",
                )}
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                placeholder={
                  form.type === "email"
                    ? "Dear {{username}},\n\nYour message here..."
                    : "Hi {{username}}, your ticket {{ticket_id}} update..."
                }
              />
            </FormField>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (validate()) onSave(form);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-linear-to-r from-primary to-accent rounded-lg hover:bg-primary transition-colors shadow-sm w-1/2"
          >
            <Check className="w-4 h-4" />
            {isEdit ? "Save changes" : "Create template"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── list page ────────────────────────────────────────────────────────────────
function ListView({ templates, onCreate, onEdit, onDelete, onToggle }: any) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [columns, setColumns] = useState(loadColumns);
  const [showColCfg, setShowColCfg] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [page, setPage] = useState(1);
  const colRef = useRef<HTMLDivElement | null>(null);
  const PER_PAGE = 10;

  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    const h = (e: any) => {
      if (colRef.current && !colRef.current.contains(e.target))
        setShowColCfg(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const visible = useMemo(
    () =>
      templates.filter((t: any) => {
        const q = search.toLowerCase();
        return (
          (!q ||
            t.name.toLowerCase().includes(q) ||
            t.code.toLowerCase().includes(q) ||
            (t.event || "").includes(q)) &&
          (filterType === "all" || t.type === filterType) &&
          (filterCat === "all" || t.category === filterCat)
        );
      }),
    [templates, search, filterType, filterCat],
  );

  const totalPages = Math.max(1, Math.ceil(visible.length / PER_PAGE));
  const paged = visible.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const hasFilters = !!(search || filterType !== "all" || filterCat !== "all");
  const visibleColCount = columns.filter((c) => c.visible).length;
  const isCol = (id: any) => columns.find((c) => c.id === id)?.visible ?? true;
  const toggleCol = (id: any) =>
    setColumns((prev) =>
      prev.map((c) =>
        c.id === id && !c.required ? { ...c, visible: !c.visible } : c,
      ),
    );

  return (
    <div className="max-h-screen ">
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onConfirm={() => {
            onDelete(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="px-6 py-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold ">Templates</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {templates.length} template{templates.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={"outline"}>
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Button onClick={onCreate}>
              <Plus className="w-4 h-4" /> New template
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, code or event…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm  placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              {/* <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors",
                  showFilters
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
                )}
              >
                <Filter className="w-4 h-4" />
                Filters
                {hasFilters && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 ml-0.5" />
                )}
              </button> */}
              {/* {hasFilters && (
                <button
                  onClick={() => {
                    setSearch("");
                    setFilterType("all");
                    setFilterCat("all");
                    setPage(1);
                  }}
                  className="flex items-center gap-1 px-2 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )} */}
              {/* Column configurator */}
              {/* <div className="relative" ref={colRef}>
                <button
                  onClick={() => setShowColCfg(!showColCfg)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors",
                    showColCfg
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
                  )}
                >
                  <Settings2 className="w-4 h-4" />
                  Columns
                  <span className="text-xs text-gray-400">
                    ({visibleColCount})
                  </span>
                </button>
                {showColCfg && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <p className="text-sm font-semibold text-gray-700">
                        Configure columns
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Toggle column visibility
                      </p>
                    </div>
                    <div className="py-1 max-h-64 overflow-y-auto">
                      {columns.map((col) => (
                        <button
                          key={col.id}
                          onClick={() => toggleCol(col.id)}
                          disabled={col.required}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                            col.required
                              ? "opacity-40 cursor-not-allowed"
                              : "hover:bg-gray-50",
                          )}
                        >
                          <div
                            className={cn(
                              "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                              col.visible
                                ? "bg-indigo-600 border-indigo-600"
                                : "border-gray-300",
                            )}
                          >
                            {col.visible && (
                              <Check className="w-2.5 h-2.5 text-white" />
                            )}
                          </div>
                          <span
                            className={
                              col.visible ? "text-gray-700" : "text-gray-400"
                            }
                          >
                            {col.label}
                          </span>
                          {col.required && (
                            <span className="ml-auto text-xs text-gray-400">
                              Required
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                      <button
                        onClick={() => setColumns(defaultColumns)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                      >
                        Reset to defaults
                      </button>
                    </div>
                  </div>
                )}
              </div> */}
            </div>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setPage(1);
                  }}
                  className={inputCls}
                >
                  <option value="all">All types</option>
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={filterCat}
                  onChange={(e) => {
                    setFilterCat(e.target.value);
                    setPage(1);
                  }}
                  className={inputCls}
                >
                  <option value="all">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {paged.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-background border border-border rounded-2xl mb-4">
                <AlertTriangle className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">
                No templates found
              </h3>
              <p className="text-sm text-gray-400 mb-5">
                {hasFilters
                  ? "Try adjusting your filters."
                  : "Create your first template to get started."}
              </p>
              {hasFilters ? (
                <button
                  onClick={() => {
                    setSearch("");
                    setFilterType("all");
                    setFilterCat("all");
                  }}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  Clear filters
                </button>
              ) : (
                <button
                  onClick={onCreate}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors mx-auto"
                >
                  <Plus className="w-4 h-4" /> New template
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-border bg-card">
                      {isCol("name") && (
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Name / Code
                        </th>
                      )}
                      {isCol("type") && (
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                      )}
                      {isCol("category") && (
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                      )}
                      {isCol("event") && (
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Event
                        </th>
                      )}
                      {isCol("subject") && (
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Subject
                        </th>
                      )}
                      {isCol("status") && (
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      )}

                      {isCol("actions") && (
                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y ">
                    {paged.map((t: any) => {
                      const typeStyle = TYPE_STYLES[t.type] || {};
                      const catStyle = CATEGORY_STYLES[t.category] || {};
                      const TypeIcon = typeStyle.icon || FileText;
                      return (
                        <tr
                          key={t.id}
                          className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                        >
                          {isCol("name") && (
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold ">{t.name}</p>
                              <p className="text-xs font-mono text-gray-400 mt-0.5">
                                {t.code}
                              </p>
                            </td>
                          )}
                          {isCol("type") && (
                            <td className="px-5 py-4">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ",
                                  typeStyle.bg,
                                  typeStyle.text,
                                  typeStyle.border,
                                )}
                              >
                                <TypeIcon className="w-3 h-3" />
                                {t.type.toUpperCase()}
                              </span>
                            </td>
                          )}
                          {isCol("category") && (
                            <td className="px-5 py-4">
                              <Badge label={t.category} style={catStyle} />
                            </td>
                          )}
                          {isCol("event") && (
                            <td className="px-5 py-4">
                              {t.event ? (
                                <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                  {t.event}
                                </span>
                              ) : (
                                <span className="text-gray-300 text-sm">—</span>
                              )}
                            </td>
                          )}
                          {isCol("subject") && (
                            <td className="px-5 py-4 max-w-[180px]">
                              <p className="text-xs text-gray-500 truncate">
                                {t.subject || (
                                  <span className="text-gray-300">—</span>
                                )}
                              </p>
                            </td>
                          )}
                          {isCol("status") && (
                            <td className="px-5 py-4">
                              <StatusToggle
                                checked={t.is_active}
                                onChange={(v) => onToggle(t.id, v)}
                              />
                            </td>
                          )}

                          {isCol("actions") && (
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1 justify-end ">
                                <button
                                  onClick={() => onEdit(t)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(t)}
                                  className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-5 py-3.5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-card">
                <p className="text-sm text-gray-400">
                  Showing{" "}
                  <span className="font-semibold text-gray-700">
                    {(page - 1) * PER_PAGE + 1}
                  </span>
                  –
                  <span className="font-semibold text-gray-700">
                    {Math.min(page * PER_PAGE, visible.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-700">
                    {visible.length}
                  </span>{" "}
                  templates
                </p>
                <div className="flex items-center gap-1.5" dir="ltr">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p;
                    if (totalPages <= 5) p = i + 1;
                    else if (page <= 3) p = i + 1;
                    else if (page >= totalPages - 2) p = totalPages - 4 + i;
                    else p = page - 2 + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={cn(
                          "w-9 h-9 rounded-lg text-sm font-semibold transition-all",
                          page === p
                            ? "bg-linear-to-br from-primary to-accent text-white shadow-sm"
                            : "text-gray-600 hover:bg-white border border-transparent hover:border-gray-200",
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── root ─────────────────────────────────────────────────────────────────────
export default function TemplateCRUD() {
  const [templates, setTemplates] = useState(seedData);
  const [view, setView] = useState("list");
  const [editing, setEditing] = useState<any | null>(null);

  const handleSave = (form: any) => {
    const ts = nowIso();
    if (editing) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editing.id ? { ...t, ...form, updated_at: ts } : t,
        ),
      );
    } else {
      setTemplates((prev) => [
        {
          ...form,
          id: uid(),
          created_by: "admin-001",
          created_at: ts,
          updated_at: ts,
        },
        ...prev,
      ]);
    }
    setView("list");
    setEditing(null);
  };

  if (view === "form") {
    return (
      <TemplateForm
        initial={editing}
        onSave={handleSave}
        onCancel={() => {
          setView("list");
          setEditing(null);
        }}
        isEdit={!!editing}
      />
    );
  }

  return (
    <ListView
      templates={templates}
      onCreate={() => {
        setEditing(null);
        setView("form");
      }}
      onEdit={(t: any) => {
        setEditing(t);
        setView("form");
      }}
      onDelete={(id: any) =>
        setTemplates((prev) => prev.filter((t: any) => t.id !== id))
      }
      onToggle={(id: any, val: any) =>
        setTemplates((prev) =>
          prev.map((t: any) =>
            t.id === id ? { ...t, is_active: val, updated_at: nowIso() } : t,
          ),
        )
      }
    />
  );
}
