import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Zap,
  Globe,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { integrationApi } from "../../../api/integration";
import type {
  WorkflowStateTrigger,
  WorkflowTransitionTrigger,
  WorkflowStateTriggerRequest,
  WorkflowTransitionTriggerRequest,
} from "../../../api/integration";
import type { Classification } from "../../../types";
import { classificationApi } from "../../../api/admin";
import {
  HierarchicalCheckboxTree,
  type TreeNode,
} from "../../../components/workflow/HierarchicalCheckboxTree";
import { t } from "i18next";

const inputCls =
  "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-colors";

type TriggerType = "state" | "transition";

interface Props {
  triggerId: string; // stateId or transitionId
  type: TriggerType;
}

function useClassificationTree() {
  return useQuery({
    queryKey: ["classifications-tree"],
    queryFn: async () => {
      const res = await classificationApi.getTree();
      return (res.data ?? []) as Classification[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

const emptyStateTriggerForm = (): WorkflowStateTriggerRequest => ({
  integration_script_id: "",
  trigger_on: "enter",
  field_mappings: "",
  execution_order: 0,
  is_async: true,
  is_active: true,
  classification_ids: [],
});

const emptyTransitionTriggerForm = (): WorkflowTransitionTriggerRequest => ({
  integration_script_id: "",
  field_mappings: "",
  execution_order: 0,
  is_async: true,
  is_active: true,
  classification_ids: [],
});

interface TriggerFormProps {
  type: TriggerType;
  triggerId: string;
  editingTrigger?: WorkflowStateTrigger | WorkflowTransitionTrigger | null;
  onDone: () => void;
}

const TriggerForm: React.FC<TriggerFormProps> = ({
  type,
  triggerId,
  editingTrigger,
  onDone,
}) => {
  const queryClient = useQueryClient();
  const isEdit = !!editingTrigger;

  const [stateForm, setStateForm] = useState<WorkflowStateTriggerRequest>(
    isEdit && type === "state"
      ? {
          integration_script_id: (editingTrigger as WorkflowStateTrigger)
            .integration_script_id,
          trigger_on: (editingTrigger as WorkflowStateTrigger).trigger_on,
          field_mappings: editingTrigger.field_mappings ?? "",
          execution_order: editingTrigger.execution_order,
          is_async: editingTrigger.is_async,
          is_active: editingTrigger.is_active,
          classification_ids:
            editingTrigger.classifications?.map((c) => c.id) ?? [],
        }
      : emptyStateTriggerForm(),
  );

  const [transForm, setTransForm] = useState<WorkflowTransitionTriggerRequest>(
    isEdit && type === "transition"
      ? {
          integration_script_id: editingTrigger.integration_script_id,
          field_mappings: editingTrigger.field_mappings ?? "",
          execution_order: editingTrigger.execution_order,
          is_async: editingTrigger.is_async,
          is_active: editingTrigger.is_active,
          classification_ids:
            editingTrigger.classifications?.map((c) => c.id) ?? [],
        }
      : emptyTransitionTriggerForm(),
  );

  const { data: scripts } = useQuery({
    queryKey: ["integration-scripts"],
    queryFn: () => integrationApi.listScripts(true),
  });
  const scriptList = scripts?.data?.data ?? [];

  const { data: classificationTree } = useClassificationTree();

  const createStateMut = useMutation({
    mutationFn: (req: WorkflowStateTriggerRequest) =>
      integrationApi.createStateTrigger(triggerId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["state-triggers", triggerId],
      });
      toast.success("Trigger added");
      onDone();
    },
    onError: () => toast.error("Failed to add trigger"),
  });

  const updateStateMut = useMutation({
    mutationFn: (req: WorkflowStateTriggerRequest) =>
      integrationApi.updateStateTrigger(triggerId, editingTrigger!.id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["state-triggers", triggerId],
      });
      toast.success("Trigger updated");
      onDone();
    },
    onError: () => toast.error("Failed to update trigger"),
  });

  const createTransMut = useMutation({
    mutationFn: (req: WorkflowTransitionTriggerRequest) =>
      integrationApi.createTransitionTrigger(triggerId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transition-triggers", triggerId],
      });
      toast.success("Trigger added");
      onDone();
    },
    onError: () => toast.error("Failed to add trigger"),
  });

  const updateTransMut = useMutation({
    mutationFn: (req: WorkflowTransitionTriggerRequest) =>
      integrationApi.updateTransitionTrigger(
        triggerId,
        editingTrigger!.id,
        req,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transition-triggers", triggerId],
      });
      toast.success("Trigger updated");
      onDone();
    },
    onError: () => toast.error("Failed to update trigger"),
  });

  const handleSubmit = () => {
    if (type === "state") {
      if (!stateForm.integration_script_id) {
        toast.error("Select a script");
        return;
      }
      if (isEdit) updateStateMut.mutate(stateForm);
      else createStateMut.mutate(stateForm);
    } else {
      if (!transForm.integration_script_id) {
        toast.error("Select a script");
        return;
      }
      if (isEdit) updateTransMut.mutate(transForm);
      else createTransMut.mutate(transForm);
    }
  };

  const isSaving =
    createStateMut.isPending ||
    updateStateMut.isPending ||
    createTransMut.isPending ||
    updateTransMut.isPending;

  const form = type === "state" ? stateForm : transForm;
  const setForm = (
    v: WorkflowStateTriggerRequest | WorkflowTransitionTriggerRequest,
  ) => {
    if (type === "state") setStateForm(v as WorkflowStateTriggerRequest);
    else setTransForm(v as WorkflowTransitionTriggerRequest);
  };

  return (
    <div className="space-y-4 p-4 bg-[hsl(var(--muted))]/30 rounded-xl border border-[hsl(var(--border))]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Script selector */}
        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
            Script <span className="text-[hsl(var(--destructive))]">*</span>
          </label>
          <select
            value={form.integration_script_id}
            onChange={(e) =>
              setForm({ ...form, integration_script_id: e.target.value })
            }
            className={inputCls}
          >
            <option value="">Select script…</option>
            {scriptList.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.script_type === "javascript" ? "JS" : "HTTP"}] {s.name}
              </option>
            ))}
          </select>
          {scriptList.length === 0 && (
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              No active scripts. Create one in Integration Scripts first.
            </p>
          )}
        </div>

        {/* Trigger on (state only) */}
        {type === "state" && (
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
              Fire on
            </label>
            <select
              value={(stateForm as WorkflowStateTriggerRequest).trigger_on}
              onChange={(e) =>
                setStateForm({
                  ...stateForm,
                  trigger_on: e.target.value as "enter" | "exit" | "both",
                })
              }
              className={inputCls}
            >
              <option value="enter">State Enter</option>
              <option value="exit">State Exit</option>
              <option value="both">Both (Enter & Exit)</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
            Execution Order
          </label>
          <input
            type="number"
            value={form.execution_order}
            onChange={(e) =>
              setForm({
                ...form,
                execution_order: parseInt(e.target.value, 10) || 0,
              })
            }
            min={0}
            className={inputCls}
          />
        </div>
      </div>

      {/* Field mappings */}
      <div>
        <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
          Field Mappings{" "}
          <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">
            (optional JSON, leave empty to include all default fields)
          </span>
        </label>
        <textarea
          value={form.field_mappings}
          onChange={(e) => setForm({ ...form, field_mappings: e.target.value })}
          rows={3}
          placeholder='[{"source":"title","target":"summary"},{"source":"incident_number","target":"ref"}]'
          className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-colors resize-none"
        />
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
          Available sources: id, incident_number, title, description,
          record_type, classification_name, current_state, department,
          assignee_name, assignee_email, reporter_name, due_date, sla_breached
        </p>
      </div>

      {/* Classification filter */}
      <div>
        <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
          Classification Filter{" "}
          <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">
            (empty = run for all classifications)
          </span>
        </label>
        <HierarchicalCheckboxTree
          data={(classificationTree ?? []) as unknown as TreeNode[]}
          selectedIds={form.classification_ids ?? []}
          onSelectionChange={(ids) =>
            setForm({ ...form, classification_ids: ids })
          }
          emptyMessage="No classifications found"
          showSelectAll={false}
        />
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <button
            type="button"
            role="switch"
            aria-checked={form.is_async}
            onClick={() => setForm({ ...form, is_async: !form.is_async })}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              form.is_async
                ? "bg-[hsl(var(--primary))]"
                : "bg-[hsl(var(--muted))]"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                form.is_async ? "translate-x-[18px]" : "translate-x-[3px]"
              }`}
            />
          </button>
          <span className="text-sm text-[hsl(var(--foreground))]">
            Run async
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
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
          <span className="text-sm text-[hsl(var(--foreground))]">Active</span>
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50"
        >
          {isSaving ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {isEdit ? "Save Changes" : "Add Trigger"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-4 py-2 border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-lg hover:bg-[hsl(var(--muted))] transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

interface TriggerRowProps {
  trigger: WorkflowStateTrigger | WorkflowTransitionTrigger;
  type: TriggerType;
  triggerId: string;
  onEdit: () => void;
}

const TriggerRow: React.FC<TriggerRowProps> = ({
  trigger,
  type,
  triggerId,
  onEdit,
}) => {
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const deleteStateMut = useMutation({
    mutationFn: () => integrationApi.deleteStateTrigger(triggerId, trigger.id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["state-triggers", triggerId],
      });
      toast.success("Trigger removed");
    },
    onError: () => toast.error("Failed to remove trigger"),
  });

  const deleteTransMut = useMutation({
    mutationFn: () =>
      integrationApi.deleteTransitionTrigger(triggerId, trigger.id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transition-triggers", triggerId],
      });
      toast.success("Trigger removed");
    },
    onError: () => toast.error("Failed to remove trigger"),
  });

  const script = trigger.integration_script;
  const isStateTrigger = type === "state";

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl">
      <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center shrink-0">
        {script?.script_type === "javascript" ? (
          <Zap className="w-4 h-4 text-yellow-500" />
        ) : (
          <Globe className="w-4 h-4 text-blue-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
          {script?.name ?? trigger.integration_script_id}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {isStateTrigger && (
            <span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-full">
              {(trigger as WorkflowStateTrigger).trigger_on}
            </span>
          )}
          {trigger.is_async && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded-full">
              async
            </span>
          )}
          {!trigger.is_active && (
            <span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-full">
              inactive
            </span>
          )}
          {(trigger.classifications?.length ?? 0) > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded-full">
              {trigger.classifications?.length} classification filter
              {trigger.classifications!.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors text-xs font-medium px-3"
        >
          Edit
        </button>
        {deleteConfirm ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (type === "state") deleteStateMut.mutate();
                else deleteTransMut.mutate();
              }}
              className="p-1.5 rounded-lg bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/20 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeleteConfirm(false)}
              className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="p-1.5 rounded-lg hover:bg-[hsl(var(--destructive))]/10 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export const IntegrationTriggersPanel: React.FC<Props> = ({
  triggerId,
  type,
}) => {
  const [addingNew, setAddingNew] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<
    WorkflowStateTrigger | WorkflowTransitionTrigger | null
  >(null);
  const [expanded, setExpanded] = useState(false);

  const stateTriggersQuery = useQuery({
    queryKey: ["state-triggers", triggerId],
    queryFn: () => integrationApi.listStateTriggers(triggerId),
    enabled: type === "state",
  });

  const transTriggersQuery = useQuery({
    queryKey: ["transition-triggers", triggerId],
    queryFn: () => integrationApi.listTransitionTriggers(triggerId),
    enabled: type === "transition",
  });

  const triggers: (WorkflowStateTrigger | WorkflowTransitionTrigger)[] =
    type === "state"
      ? (stateTriggersQuery.data?.data?.data ?? [])
      : (transTriggersQuery.data?.data?.data ?? []);

  const isLoading =
    type === "state"
      ? stateTriggersQuery.isLoading
      : transTriggersQuery.isLoading;

  return (
    <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[hsl(var(--muted))]/40 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="w-4 h-4 text-[hsl(var(--primary))] shrink-0" />
          <span className="text-sm font-semibold text-[hsl(var(--foreground))] shrink-0">
            {t("workflows.integrationTriggers")}
          </span>
          {triggers.length > 0 ? (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-[hsl(var(--primary))] text-white rounded-full shrink-0">
              {triggers.length}
            </span>
          ) : null}
          {!expanded && triggers.length > 0 && (
            <span className="text-xs text-[hsl(var(--muted-foreground))] truncate">
              {triggers
                .map((t) => t.integration_script?.name ?? "Script")
                .join(", ")}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 space-y-3 border-t border-[hsl(var(--border))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {type === "state"
              ? t("workflows.stateTriggerDescription")
              : t("workflows.transitionTriggerDescription")}
            {triggers.length > 1 && (
              <span className="ml-1">
                Multiple scripts run in <strong>execution order</strong> (lowest
                first).
              </span>
            )}
          </p>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <span className="w-5 h-5 border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {triggers.map((t) =>
                editingTrigger?.id === t.id ? (
                  <TriggerForm
                    key={t.id}
                    type={type}
                    triggerId={triggerId}
                    editingTrigger={t}
                    onDone={() => setEditingTrigger(null)}
                  />
                ) : (
                  <TriggerRow
                    key={t.id}
                    trigger={t}
                    type={type}
                    triggerId={triggerId}
                    onEdit={() => {
                      setEditingTrigger(t);
                      setAddingNew(false);
                    }}
                  />
                ),
              )}
            </div>
          )}

          {addingNew && (
            <TriggerForm
              type={type}
              triggerId={triggerId}
              onDone={() => setAddingNew(false)}
            />
          )}

          <button
            type="button"
            disabled={addingNew || !!editingTrigger}
            onClick={() => {
              setAddingNew(true);
              setEditingTrigger(null);
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/8 rounded-lg transition-colors w-full justify-center border border-dashed border-[hsl(var(--primary))]/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <Plus className="w-4 h-4" />
            {t("workflows.addIntegrationTrigger")}
          </button>
        </div>
      )}
    </div>
  );
};
