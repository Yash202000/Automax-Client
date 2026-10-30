import { useState } from "react";
import { Button } from "../ui/Button";
import { Input, Textarea } from "../ui/Input";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "../ui/Modal";
import { useCreateKpiEntryCorrection } from "../../hooks/useKpi";
import type {
  KpiEntry,
  KpiEntryComponentValue,
  KpiEntryCorrectionType,
} from "../../types/kpi";

interface Props {
  entry: KpiEntry | null;
  onClose: () => void;
}

const numOrUndefined = (v: string) =>
  v.trim() === "" || !Number.isFinite(Number(v)) ? undefined : Number(v);

// Corrects an approved entry without touching it: an Adjustment is a new
// version with corrected values, a Reversal cancels the entry. Either one is
// created as a draft and only takes effect once submitted and approved.
export function CorrectEntryModal({ entry, onClose }: Props) {
  const createCorrection = useCreateKpiEntryCorrection();
  // State starts from the entry; callers pass key={entry.id} so each entry
  // opens a fresh form.
  const [type, setType] = useState<KpiEntryCorrectionType>("adjustment");
  const [reason, setReason] = useState("");
  const [direct, setDirect] = useState(
    String(entry?.direct_actual_value ?? ""),
  );
  const [numerator, setNumerator] = useState(
    String(entry?.numerator_value ?? ""),
  );
  const [denominator, setDenominator] = useState(
    String(entry?.denominator_value ?? ""),
  );
  const [components, setComponents] = useState<KpiEntryComponentValue[]>(
    entry?.component_values ?? [],
  );
  const [commentary, setCommentary] = useState(
    entry?.performance_commentary ?? "",
  );

  if (!entry) return null;

  const calc = entry.calculation_type_snapshot;
  const usesRatio =
    calc === "Percentage - Ratio" || calc === "Ratio" || calc === "Difference";
  const usesComponents =
    calc === "Average" || calc === "Sum" || calc === "Weighted Average";

  const valuesValid =
    type === "reversal" ||
    (usesRatio
      ? numOrUndefined(numerator) !== undefined &&
        numOrUndefined(denominator) !== undefined &&
        (calc === "Difference" || Number(denominator) !== 0)
      : usesComponents
        ? components.length > 0
        : numOrUndefined(direct) !== undefined);
  const canSubmit = reason.trim() !== "" && valuesValid;

  const submit = async () => {
    await createCorrection.mutateAsync({
      entry,
      data: {
        correction_type: type,
        reason: reason.trim(),
        direct_actual_value:
          usesRatio || usesComponents ? undefined : numOrUndefined(direct),
        numerator_value: usesRatio ? numOrUndefined(numerator) : undefined,
        denominator_value: usesRatio ? numOrUndefined(denominator) : undefined,
        component_values: usesComponents ? components : undefined,
        // Carried over unchanged so the new version keeps the original's
        // source and quality details.
        data_source_type: entry.data_source_type,
        source_reference: entry.source_reference,
        data_cutoff_date: entry.data_cutoff_date?.slice(0, 10) ?? "",
        data_quality_status: entry.data_quality_status,
        data_quality_notes: entry.data_quality_notes,
        performance_commentary: commentary,
        improvement_action: entry.improvement_action,
      },
    });
    onClose();
  };

  const typeButton = (
    value: KpiEntryCorrectionType,
    label: string,
    hint: string,
  ) => (
    <button
      type="button"
      onClick={() => setType(value)}
      className={`flex-1 rounded-lg border p-3 text-start transition-colors ${
        type === value
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40"
      }`}
    >
      <div className="text-sm font-medium text-slate-900 dark:text-white">
        {label}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{hint}</div>
    </button>
  );

  return (
    <Modal isOpen={!!entry} onClose={onClose}>
      <ModalHeader>
        <ModalTitle>Correct Approved Entry</ModalTitle>
        <ModalDescription>
          {entry.metric?.name ?? "Entry"} · {entry.period_code}{" "}
          {entry.reporting_year} · v{entry.entry_version} · Actual{" "}
          {entry.actual_value}. The approved entry stays unchanged; the
          correction applies only after it is approved.
        </ModalDescription>
      </ModalHeader>
      <ModalBody className="space-y-4">
        <div className="flex gap-3">
          {typeButton(
            "adjustment",
            "Adjustment",
            "Replace with corrected values",
          )}
          {typeButton("reversal", "Reversal", "Cancel this entry entirely")}
        </div>

        {type === "adjustment" &&
          (usesRatio ? (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={`${entry.numerator_label_snapshot || "Numerator"} *`}
                type="number"
                value={numerator}
                onChange={(e) => setNumerator(e.target.value)}
              />
              <Input
                label={`${entry.denominator_label_snapshot || "Denominator"} *`}
                type="number"
                value={denominator}
                onChange={(e) => setDenominator(e.target.value)}
              />
            </div>
          ) : usesComponents ? (
            <div className="space-y-2">
              {components.map((comp, i) => (
                <div key={i} className="grid grid-cols-3 gap-3">
                  <Input label="Component" value={comp.component} disabled />
                  <Input
                    label="Value *"
                    type="number"
                    value={comp.value}
                    onChange={(e) =>
                      setComponents((prev) =>
                        prev.map((c, j) =>
                          j === i ? { ...c, value: Number(e.target.value) } : c,
                        ),
                      )
                    }
                  />
                  {calc === "Weighted Average" && (
                    <Input
                      label="Weight"
                      type="number"
                      value={comp.weight ?? 1}
                      onChange={(e) =>
                        setComponents((prev) =>
                          prev.map((c, j) =>
                            j === i
                              ? { ...c, weight: Number(e.target.value) }
                              : c,
                          ),
                        )
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Input
              label="Corrected Actual Value *"
              type="number"
              value={direct}
              onChange={(e) => setDirect(e.target.value)}
            />
          ))}

        <Textarea
          label="Reason *"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            type === "reversal"
              ? "Why should this entry be cancelled?"
              : "What was wrong with the approved values?"
          }
        />
        {type === "adjustment" && (
          <Textarea
            label="Performance Commentary"
            rows={2}
            value={commentary}
            onChange={(e) => setCommentary(e.target.value)}
          />
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={type === "reversal" ? "destructive" : "default"}
          disabled={!canSubmit}
          isLoading={createCorrection.isPending}
          onClick={submit}
        >
          {type === "reversal" ? "Create Reversal" : "Create Adjustment"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
