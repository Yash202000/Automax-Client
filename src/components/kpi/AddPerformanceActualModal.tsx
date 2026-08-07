import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useSubmitPerformance,
  useKpiCardDefinitions,
} from "../../hooks/useKpi";
import {
  periodTypeForFrequency,
  periodKeyPlaceholder,
} from "../../utils/kpiPeriod";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Select } from "../ui/SelectInput";

interface AddPerformanceActualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddPerformanceActualModal: React.FC<
  AddPerformanceActualModalProps
> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { data: allCards } = useKpiCardDefinitions();
  const submitPerformance = useSubmitPerformance();

  const currentYear = new Date().getFullYear();
  const cardOptions = (allCards ?? []).map((c) => ({
    code: c.code,
    label: `${c.code} — ${c.name_en}`,
    type: c.type,
    reporting_frequency: c.reporting_frequency,
  }));

  const [kpiCode, setKpiCode] = useState("");
  const [kpiType, setKpiType] = useState("strategic");
  const [year, setYear] = useState(currentYear);
  const [quarter, setQuarter] = useState(1);
  const [periodType, setPeriodType] = useState("quarter");
  const [periodKey, setPeriodKey] = useState("");
  const [target, setTarget] = useState("");
  const [actual, setActual] = useState("");
  const [trendDescription, setTrendDescription] = useState("");
  const [justification, setJustification] = useState("");

  const reset = () => {
    setKpiCode("");
    setKpiType("strategic");
    setYear(currentYear);
    setQuarter(1);
    setPeriodType("quarter");
    setPeriodKey("");
    setTarget("");
    setActual("");
    setTrendDescription("");
    setJustification("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!kpiCode || !actual) {
      toast.error(t("kpi.performance.addActual.validation"));
      return;
    }
    if (periodType !== "quarter" && !periodKey) {
      toast.error(t("kpi.performance.addActual.periodKeyRequired"));
      return;
    }

    await submitPerformance.mutateAsync({
      kpi_code: kpiCode,
      kpi_type: kpiType as any,
      year,
      quarter,
      period_type: periodType as any,
      period_key: periodKey || undefined,
      target: target ? Number(target) : undefined,
      actual: Number(actual),
      trend_description: trendDescription || undefined,
      justification: justification || undefined,
    });
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t("kpi.performance.addActual.title")}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("kpi.performance.addActual.subtitle")}
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t("kpi.targets.form.kpiCode")} *
          </label>
          <select
            value={kpiCode}
            onChange={(e) => {
              const selected = cardOptions.find(
                (c) => c.code === e.target.value,
              );
              setKpiCode(e.target.value);
              if (selected) {
                setKpiType(selected.type);
                const suggested =
                  periodTypeForFrequency[selected.reporting_frequency ?? ""];
                if (suggested) setPeriodType(suggested);
              }
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">-- Select KPI --</option>
            {cardOptions.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t("kpi.targets.table.year") + " *"}
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
          <Select
            label={t("kpi.performance.table.period") + " (Q) *"}
            value={String(quarter)}
            onChange={(v) => setQuarter(Number(v))}
            options={[1, 2, 3, 4].map((q) => ({
              value: String(q),
              label: `Q${q}`,
            }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t("kpi.targets.form.periodType")}
            value={periodType}
            onChange={(v) => {
              setPeriodType(v as string);
              setPeriodKey("");
            }}
            options={[
              { value: "quarter", label: t("kpi.targets.periodTypes.quarter") },
              { value: "month", label: t("kpi.targets.periodTypes.month") },
              {
                value: "semi_annual",
                label: t("kpi.targets.periodTypes.semiAnnual"),
              },
              { value: "annual", label: t("kpi.targets.periodTypes.annual") },
              { value: "custom", label: t("kpi.targets.periodTypes.custom") },
            ]}
          />
          {periodType !== "quarter" && (
            <Input
              label={t("kpi.targets.form.periodKey") + " *"}
              value={periodKey}
              onChange={(e) => setPeriodKey(e.target.value)}
              placeholder={periodKeyPlaceholder[periodType]}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t("kpi.performance.table.target")}
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <Input
            label={t("kpi.performance.table.actual") + " *"}
            type="number"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
          />
        </div>

        <Input
          label={t("kpi.performance.detail.trend")}
          value={trendDescription}
          onChange={(e) => setTrendDescription(e.target.value)}
        />
        <Input
          label={t("kpi.performance.detail.justification")}
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitPerformance.isPending}>
            {submitPerformance.isPending ? "..." : t("common.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
