import React, { useState } from "react";
import {
  Users,
  Plus,
  Trash2,
  Pencil,
  Shield,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "../ui/Button";
import { Input, Select, Textarea } from "../ui/Input";
import { MultiSelect } from "../ui/MultiSelect";
import { userApi } from "../../api/admin";
import {
  useKpiCollaboratorAssignments,
  useCreateKpiCollaboratorAssignment,
  useUpdateKpiCollaboratorAssignment,
  useDeleteKpiCollaboratorAssignment,
  useKpiCollaboratorPermissionMatrix,
} from "../../hooks/useKpi";
import {
  COLLABORATOR_TYPE_OPTIONS,
  USER_CATEGORY_OPTIONS,
  PERIOD_SCOPE_OPTIONS,
  NOTIFICATION_PREF_OPTIONS,
} from "../../types/kpi";
import type {
  KpiCollaboratorAssignment,
  KpiCollaboratorAssignmentRequest,
} from "../../types/kpi";

const formatDate = (d: string) => {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("en-CA");
};

const collabTypeColors: Record<string, string> = {
  "KPI Owner":
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Data Contributor":
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Data Submitter":
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  Reviewer:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Approver:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Viewer: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};

interface Props {
  type: string;
  id: string;
  canAssign: boolean;
}

export const CollaboratorsTab: React.FC<Props> = ({ type, id, canAssign }) => {
  const { data: assignments = [], isLoading } = useKpiCollaboratorAssignments(
    type,
    id,
  );
  const { data: permissionMatrix = [] } = useKpiCollaboratorPermissionMatrix();
  const createAssignment = useCreateKpiCollaboratorAssignment(type, id);
  const updateAssignment = useUpdateKpiCollaboratorAssignment(type, id);
  const deleteAssignment = useDeleteKpiCollaboratorAssignment(type, id);

  const { data: users = [] } = useQuery({
    queryKey: ["users", "active"],
    queryFn: async () => {
      const res = await userApi.list(1, 500);
      return res.data ?? [];
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const emptyForm: KpiCollaboratorAssignmentRequest = {
    user_id: "",
    user_category: "Internal Employee",
    collaborator_type: "Data Contributor",
    organization_scope: [],
    metric_scope: "All Metrics",
    metric_scope_ids: [],
    period_scope: "All Periods",
    period_scope_year: 0,
    period_scope_periods: [],
    effective_from: "",
    effective_to: "",
    is_active: true,
    delegate_for_user_id: undefined,
    delegation_reason: "",
    notification_prefs: [],
  };

  const [form, setForm] = useState<KpiCollaboratorAssignmentRequest>(emptyForm);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.user_id) {
      toast.error("User is required");
      return;
    }
    if (!form.effective_from) {
      toast.error("Effective from date is required");
      return;
    }
    if (form.effective_to && form.effective_to < form.effective_from) {
      toast.error("Effective to must be on or after effective from");
      return;
    }

    if (editingId) {
      await updateAssignment.mutateAsync({
        assignmentId: editingId,
        data: form,
      });
    } else {
      await createAssignment.mutateAsync(form);
    }
    resetForm();
  };

  const handleEdit = (a: KpiCollaboratorAssignment) => {
    setForm({
      user_id: a.user_id,
      user_category: a.user_category,
      collaborator_type: a.collaborator_type,
      organization_scope: a.organization_scope ?? [],
      metric_scope: a.metric_scope,
      metric_scope_ids: a.metric_scope_ids ?? [],
      period_scope: a.period_scope,
      period_scope_year: a.period_scope_year,
      period_scope_periods: a.period_scope_periods ?? [],
      effective_from: formatDate(a.effective_from),
      effective_to: a.effective_to ? formatDate(a.effective_to) : "",
      is_active: a.is_active,
      delegate_for_user_id: a.delegate_for_user_id,
      delegation_reason: a.delegation_reason ?? "",
      notification_prefs: a.notification_prefs ?? [],
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  const isActiveAssignment = (a: KpiCollaboratorAssignment) => {
    const now = new Date();
    const effFrom = new Date(a.effective_from);
    if (effFrom > now) return false;
    if (a.effective_to && new Date(a.effective_to) < now) return false;
    return a.is_active;
  };

  return (
    <div className="space-y-6">
      {/* Permission Matrix Summary */}
      {permissionMatrix.length > 0 && (
        <details className="group rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80">
          <summary className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors">
            <Shield className="w-4 h-4" />
            Permission Matrix
            <ChevronDownIcon />
          </summary>
          <div className="px-5 pb-4 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/60">
                  <th className="text-left py-2 px-2 font-medium text-slate-500 dark:text-slate-400">
                    Type
                  </th>
                  <th className="text-center py-2 px-2 font-medium text-slate-500 dark:text-slate-400">
                    View
                  </th>
                  <th className="text-center py-2 px-2 font-medium text-slate-500 dark:text-slate-400">
                    Create
                  </th>
                  <th className="text-center py-2 px-2 font-medium text-slate-500 dark:text-slate-400">
                    Submit
                  </th>
                  <th className="text-center py-2 px-2 font-medium text-slate-500 dark:text-slate-400">
                    Review
                  </th>
                  <th className="text-center py-2 px-2 font-medium text-slate-500 dark:text-slate-400">
                    Approve
                  </th>
                  <th className="text-center py-2 px-2 font-medium text-slate-500 dark:text-slate-400">
                    Manage
                  </th>
                </tr>
              </thead>
              <tbody>
                {permissionMatrix.map((p) => (
                  <tr
                    key={p.collaborator_type}
                    className="border-b border-slate-100 dark:border-slate-700/30"
                  >
                    <td className="py-2 px-2 font-medium text-slate-700 dark:text-slate-300">
                      {p.collaborator_type}
                    </td>
                    <td className="text-center py-2 px-2">
                      {boolIcon(p.view_kpi)}
                    </td>
                    <td className="text-center py-2 px-2">
                      {boolIcon(p.create_draft)}
                    </td>
                    <td className="text-center py-2 px-2">
                      {boolIcon(p.submit_entry)}
                    </td>
                    <td className="text-center py-2 px-2">
                      {strIcon(p.review)}
                    </td>
                    <td className="text-center py-2 px-2">
                      {strIcon(p.approve_reject)}
                    </td>
                    <td className="text-center py-2 px-2">
                      {boolIcon(p.manage_collaborators)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Add / Edit Form */}
      {canAssign && showForm && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {editingId ? "Edit Assignment" : "New Assignment"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="User *"
              value={form.user_id}
              onChange={(e) =>
                setForm((p) => ({ ...p, user_id: e.target.value }))
              }
              options={users.map((u: any) => ({
                value: u.id,
                label: `${u.first_name} ${u.last_name} (${u.email})`,
              }))}
              placeholder="Select a user"
            />
            <Select
              label="User Category *"
              value={form.user_category}
              onChange={(e) =>
                setForm((p) => ({ ...p, user_category: e.target.value }))
              }
              options={USER_CATEGORY_OPTIONS}
            />
            <Select
              label="Collaborator Type *"
              value={form.collaborator_type}
              onChange={(e) =>
                setForm((p) => ({ ...p, collaborator_type: e.target.value }))
              }
              options={COLLABORATOR_TYPE_OPTIONS}
            />
            <Input
              label="Effective From *"
              type="date"
              value={form.effective_from}
              onChange={(e) =>
                setForm((p) => ({ ...p, effective_from: e.target.value }))
              }
            />
            <Input
              label="Effective To"
              type="date"
              value={form.effective_to ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, effective_to: e.target.value }))
              }
            />
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="is-active"
                checked={form.is_active ?? true}
                onChange={(e) =>
                  setForm((p) => ({ ...p, is_active: e.target.checked }))
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="is-active"
                className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Active
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Metric Scope"
              value={form.metric_scope ?? "All Metrics"}
              onChange={(e) =>
                setForm((p) => ({ ...p, metric_scope: e.target.value }))
              }
              options={[
                { value: "All Metrics", label: "All Metrics" },
                { value: "Selected Metrics", label: "Selected Metrics" },
              ]}
            />
            <Select
              label="Period Scope"
              value={form.period_scope ?? "All Periods"}
              onChange={(e) =>
                setForm((p) => ({ ...p, period_scope: e.target.value }))
              }
              options={PERIOD_SCOPE_OPTIONS}
            />
          </div>

          <MultiSelect
            label="Organization Scope"
            value={form.organization_scope ?? []}
            onChange={(v) => setForm((p) => ({ ...p, organization_scope: v }))}
            options={[]}
            searchable
            placeholder="Type org unit names..."
          />

          <MultiSelect
            label="Notification Preferences"
            value={form.notification_prefs ?? []}
            onChange={(v) => setForm((p) => ({ ...p, notification_prefs: v }))}
            options={NOTIFICATION_PREF_OPTIONS}
            placeholder="Select notifications..."
          />

          <div className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-700/60 p-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Delegation (optional)
            </p>
            <Select
              label="Delegate For"
              value={form.delegate_for_user_id ?? ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  delegate_for_user_id: e.target.value || undefined,
                }))
              }
              options={users.map((u: any) => ({
                value: u.id,
                label: `${u.first_name} ${u.last_name} (${u.email})`,
              }))}
              placeholder="Select a user"
            />
            <Textarea
              label="Delegation Reason"
              value={form.delegation_reason ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, delegation_reason: e.target.value }))
              }
              rows={2}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={
                createAssignment.isPending || updateAssignment.isPending
              }
            >
              {editingId ? "Update" : "Assign"}
            </Button>
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {canAssign && !showForm && (
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowForm(true)}
        >
          New Assignment
        </Button>
      )}

      {/* Assignments List */}
      {isLoading ? (
        <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">
          Loading...
        </div>
      ) : assignments.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No collaborator assignments yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const active = isActiveAssignment(a);
            return (
              <div
                key={a.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        active
                          ? "bg-blue-100 dark:bg-blue-900/30"
                          : "bg-slate-100 dark:bg-slate-700"
                      }`}
                    >
                      <User
                        className={`w-4 h-4 ${
                          active
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-400"
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {a.user?.first_name} {a.user?.last_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {a.user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!active && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-md px-2 py-1">
                        <Clock className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${collabTypeColors[a.collaborator_type] ?? ""}`}
                    >
                      {a.collaborator_type}
                    </span>
                    {canAssign && (
                      <>
                        <button
                          onClick={() => handleEdit(a)}
                          className="p-1 rounded text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Remove this assignment?"))
                              deleteAssignment.mutate(a.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Category: {a.user_category}</span>
                  <span>Metric: {a.metric_scope}</span>
                  <span>Period: {a.period_scope}</span>
                  <span>
                    <Calendar className="w-3 h-3 inline me-0.5" />
                    {formatDate(a.effective_from)}
                    {a.effective_to
                      ? ` — ${formatDate(a.effective_to)}`
                      : " — Open"}
                  </span>
                  {a.delegate_for_user && (
                    <span className="text-amber-600 dark:text-amber-400">
                      Delegated from {a.delegate_for_user.first_name}{" "}
                      {a.delegate_for_user.last_name}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ChevronDownIcon = () => (
  <svg
    className="w-4 h-4 ml-auto transition-transform group-open:rotate-180"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const boolIcon = (v: boolean) =>
  v ? (
    <CheckCircle className="w-3.5 h-3.5 text-green-500 inline" />
  ) : (
    <XCircle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 inline" />
  );

const strIcon = (v: string) => {
  if (v === "Yes" || v === "true")
    return <CheckCircle className="w-3.5 h-3.5 text-green-500 inline" />;
  if (v === "No" || v === "false" || v === "No by default")
    return (
      <XCircle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 inline" />
    );
  return (
    <span title={v}>
      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 inline" />
    </span>
  );
};
