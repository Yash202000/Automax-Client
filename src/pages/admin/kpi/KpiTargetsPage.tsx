import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Crosshair, Plus, AlertCircle, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  useKpiTargets,
  useSetKpiTarget,
  useDeleteKpiTarget,
  useKpiCardDefinitions,
} from "../../../hooks/useKpi";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/SelectInput";
import {
  periodTypeForFrequency,
  periodKeyPlaceholder,
} from "../../../utils/kpiPeriod";
import type { KpiAnnualTarget } from "../../../types/kpi";

export const KpiTargetsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [kpiCodeFilter, setKpiCodeFilter] = useState(
    () => searchParams.get("kpi_code") ?? "",
  );

  // Keep the filter box in sync if the user navigates here again with a
  // different ?kpi_code= (e.g. clicking "Targets" from another KPI's page).
  useEffect(() => {
    const fromUrl = searchParams.get("kpi_code");
    if (fromUrl) setKpiCodeFilter(fromUrl);
  }, [searchParams]);

  const { data: allCards } = useKpiCardDefinitions();
  const cardOptions = (allCards ?? []).map((c) => ({
    code: c.code,
    label: `${c.code} — ${c.name_en}`,
    type: c.type,
    reporting_frequency: c.reporting_frequency,
  }));

  const {
    data: targets,
    isLoading,
    error,
  } = useKpiTargets({
    year,
    kpi_code: kpiCodeFilter || undefined,
  });
  const setTarget = useSetKpiTarget();
  const deleteTarget = useDeleteKpiTarget();

  const [modalOpen, setModalOpen] = useState(false);
  const [formKpiCode, setFormKpiCode] = useState("");
  const [formKpiType, setFormKpiType] = useState<string>("strategic");
  const [formTargetValue, setFormTargetValue] = useState("");
  const [formPeriodType, setFormPeriodType] = useState<string>("annual");
  const [formPeriodKey, setFormPeriodKey] = useState("");

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handleSubmit = async () => {
    if (!formKpiCode || !formTargetValue) {
      toast.error(t("kpi.targets.formValidation"));
      return;
    }
    if (formPeriodType !== "annual" && !formPeriodKey) {
      toast.error(t("kpi.targets.periodKeyRequired"));
      return;
    }
    await setTarget.mutateAsync({
      kpi_code: formKpiCode,
      kpi_type: formKpiType as any,
      year,
      period_type: formPeriodType as any,
      period_key: formPeriodType === "annual" ? String(year) : formPeriodKey,
      target_value: Number(formTargetValue),
    });
    setModalOpen(false);
    setFormKpiCode("");
    setFormTargetValue("");
    setFormPeriodType("annual");
    setFormPeriodKey("");
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t("common.confirmDelete"))) {
      deleteTarget.mutate(id);
    }
  };

  const items = targets ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Crosshair className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("kpi.targets.title")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("kpi.targets.subtitle")}
            </p>
          </div>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 me-1" />
          {t("kpi.targets.setTarget")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <div className="relative">
          <input
            type="text"
            value={kpiCodeFilter}
            onChange={(e) => setKpiCodeFilter(e.target.value)}
            placeholder={t("kpi.targets.searchPlaceholder")}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 pe-8"
          />
          {kpiCodeFilter && (
            <button
              onClick={() => {
                setKpiCodeFilter("");
                if (searchParams.get("kpi_code")) {
                  searchParams.delete("kpi_code");
                  setSearchParams(searchParams);
                }
              }}
              className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              title={t("common.clear")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">
                {t("kpi.targets.failedToLoad")}
              </p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Crosshair className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t("kpi.targets.empty")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.targets.table.kpiCode")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.targets.table.kpiType")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.targets.table.year")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.targets.table.period")}
                  </th>
                  <th className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("kpi.targets.table.targetValue")}
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((target: KpiAnnualTarget) => (
                  <tr
                    key={target.id}
                    className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-mono text-slate-900 dark:text-white">
                      {target.kpi_code}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {target.kpi_type}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {target.year}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-700 dark:text-slate-300">
                      {target.period_key || target.year}
                    </td>
                    <td className="px-6 py-4 text-sm tabular-nums font-medium text-slate-900 dark:text-white">
                      {target.target_value}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(target.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                        title={t("common.delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Set Target Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="md">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("kpi.targets.setTarget")}
          </h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("kpi.targets.form.kpiCode")} *
            </label>
            <select
              value={formKpiCode}
              onChange={(e) => {
                const selected = cardOptions.find(
                  (c) => c.code === e.target.value,
                );
                setFormKpiCode(e.target.value);
                if (selected) {
                  setFormKpiType(selected.type);
                  const suggested =
                    periodTypeForFrequency[selected.reporting_frequency ?? ""];
                  if (suggested) setFormPeriodType(suggested);
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
          <Select
            label={t("kpi.targets.form.kpiType")}
            value={formKpiType}
            onChange={(v) => setFormKpiType(v as string)}
            options={[
              { value: "strategic", label: t("kpi.dictionary.strategic") },
              { value: "operational", label: t("kpi.dictionary.operational") },
              { value: "award", label: t("kpi.dictionary.award") },
            ]}
          />
          <Select
            label={t("kpi.targets.form.periodType")}
            value={formPeriodType}
            onChange={(v) => {
              setFormPeriodType(v as string);
              setFormPeriodKey("");
            }}
            options={[
              { value: "annual", label: t("kpi.targets.periodTypes.annual") },
              { value: "month", label: t("kpi.targets.periodTypes.month") },
              {
                value: "quarter",
                label: t("kpi.targets.periodTypes.quarter"),
              },
              {
                value: "semi_annual",
                label: t("kpi.targets.periodTypes.semiAnnual"),
              },
              {
                value: "custom",
                label: t("kpi.targets.periodTypes.custom"),
              },
            ]}
          />
          {formPeriodType !== "annual" && (
            <Input
              label={t("kpi.targets.form.periodKey") + " *"}
              value={formPeriodKey}
              onChange={(e) => setFormPeriodKey(e.target.value)}
              placeholder={periodKeyPlaceholder[formPeriodType]}
            />
          )}
          <Input
            label={t("kpi.targets.form.targetValue") + " *"}
            type="number"
            value={formTargetValue}
            onChange={(e) => setFormTargetValue(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit}>{t("common.save")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
