import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Trash2, GripVertical } from "lucide-react";
import { escalationPolicyApi } from "@/api/admin";
import type { EscalationPolicy, EscalationPolicyStepRequest } from "@/types";
import { Button } from "@/components/ui";
import TargetPicker from "./TargetPicker";
import type { TargetEntry } from "./TargetPicker";
import { toTargetRequests, fromBackendTarget } from "./targetUtils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StepDraft {
  id?: string;
  step_order: number;
  delay_hours: number;
  channel: "email" | "sms" | "both";
  targets: TargetEntry[];
}

interface Props {
  editData?: EscalationPolicy;
  onClose: () => void;
  onSuccess: () => void;
}

const EscalationPolicyModal: React.FC<Props> = ({
  editData,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [name, setName] = useState(editData?.name || "");
  const [description, setDescription] = useState(editData?.description || "");
  const [isActive, setIsActive] = useState(editData?.is_active ?? true);
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editData?.steps) {
      setSteps(
        editData.steps.map((s) => ({
          id: s.id,
          step_order: s.step_order,
          delay_hours: s.delay_hours,
          channel: s.channel,
          targets: (s.targets || []).map(fromBackendTarget),
        })),
      );
    } else {
      // start with one empty step
      setSteps([
        { step_order: 1, delay_hours: 0, channel: "email", targets: [] },
      ]);
    }
  }, [editData]);

  const saveMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      description?: string;
      is_active: boolean;
      steps: EscalationPolicyStepRequest[];
    }) =>
      editData
        ? escalationPolicyApi.update(editData.id, payload)
        : escalationPolicyApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalation-policies"] });
      toast.success(
        editData
          ? t("escalation.policy.updatedSuccess", "Policy updated")
          : t("escalation.policy.createdSuccess", "Policy created"),
      );
      onSuccess();
    },
    onError: (e: any) => {
      toast.error(e?.message || t("common.error", "Something went wrong"));
    },
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t("validation.required", "Required");
    steps.forEach((s, i) => {
      if (s.targets.length === 0)
        errs[`step_${i}_targets`] = t(
          "escalation.policy.stepNeedsTarget",
          "At least one target required",
        );
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    saveMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      is_active: isActive,
      steps: steps.map((s, idx) => ({
        step_order: idx + 1,
        delay_hours: s.delay_hours,
        channel: s.channel,
        targets: toTargetRequests(s.targets),
      })),
    });
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        step_order: prev.length + 1,
        delay_hours: 1,
        channel: "email",
        targets: [],
      },
    ]);
  };

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateStep = (idx: number, patch: Partial<StepDraft>) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] shrink-0">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
            {editData
              ? t("escalation.policy.edit", "Edit Policy")
              : t("escalation.policy.create", "Create Escalation Policy")}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
              {t("common.name", "Name")} <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(
                "w-full h-10 rounded-md border px-3 text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))]",
                "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]",
                errors.name ? "border-red-500" : "border-[hsl(var(--border))]",
              )}
              placeholder={t(
                "escalation.policy.namePlaceholder",
                "e.g. Critical Incident Escalation",
              )}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
              {t("common.description", "Description")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={cn(
                "w-full rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm",
                "bg-[hsl(var(--background))] text-[hsl(var(--foreground))]",
                "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] resize-none",
              )}
              placeholder={t(
                "common.descriptionPlaceholder",
                "Optional description...",
              )}
            />
          </div>

          {/* Active */}
          <div className="flex items-center gap-3">
            <input
              id="policy-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-[hsl(var(--border))] accent-[hsl(var(--primary))]"
            />
            <label
              htmlFor="policy-active"
              className="text-sm font-medium text-[hsl(var(--foreground))] cursor-pointer"
            >
              {t("common.active", "Active")}
            </label>
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                {t("escalation.policy.steps", "Escalation Steps")}
              </h3>
              <button
                type="button"
                onClick={addStep}
                className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--primary))] hover:opacity-80 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("escalation.policy.addStep", "Add Step")}
              </button>
            </div>

            <div className="space-y-4">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        {t("escalation.policy.step", "Step")} {idx + 1}
                      </span>
                    </div>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(idx)}
                        className="p-1 rounded hover:bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Delay */}
                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                        {t(
                          "escalation.policy.delayHours",
                          "Fire after (hours)",
                        )}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={step.delay_hours}
                        onChange={(e) =>
                          updateStep(idx, {
                            delay_hours: parseInt(e.target.value) || 0,
                          })
                        }
                        className={cn(
                          "w-full h-9 rounded-md border border-[hsl(var(--border))] px-3 text-sm",
                          "bg-[hsl(var(--background))] text-[hsl(var(--foreground))]",
                          "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]",
                        )}
                      />
                    </div>

                    {/* Channel */}
                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                        {t("escalation.channel", "Channel")}
                      </label>
                      <select
                        value={step.channel}
                        onChange={(e) =>
                          updateStep(idx, {
                            channel: e.target.value as "email" | "sms" | "both",
                          })
                        }
                        className={cn(
                          "w-full h-9 rounded-md border border-[hsl(var(--border))] px-3 text-sm",
                          "bg-[hsl(var(--background))] text-[hsl(var(--foreground))]",
                          "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]",
                        )}
                      >
                        <option value="email">
                          {t("escalation.channelEmail", "Email")}
                        </option>
                        <option value="sms">
                          {t("escalation.channelSms", "SMS")}
                        </option>
                        <option value="both">
                          {t("escalation.channelBoth", "Both")}
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Targets */}
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
                      {t("escalation.targets", "Targets")}
                    </label>
                    <TargetPicker
                      value={step.targets}
                      onChange={(targets) => updateStep(idx, { targets })}
                    />
                    {errors[`step_${idx}_targets`] && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors[`step_${idx}_targets`]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[hsl(var(--border))] shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saveMutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} isLoading={saveMutation.isPending}>
            {editData ? t("common.save", "Save") : t("common.create", "Create")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EscalationPolicyModal;
