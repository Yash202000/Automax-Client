import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BookOpen, Save } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateStrategicKPI,
  usePillars,
  useDomains,
  useDataSources,
} from "../../../hooks/useKpi";
import { useGoals } from "../../../hooks/useGoals";
import { Button } from "../../../components/ui/Button";
import { Input, Textarea, Select } from "../../../components/ui/Input";
import type { StrategicKPIRequest } from "../../../types/kpi";

export const KpiDictionaryFormPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createKpi = useCreateStrategicKPI();

  const { data: pillarsData } = usePillars();
  const { data: domainsData } = useDomains();
  const { data: okrGoalsData } = useGoals({ limit: 200 });
  const { data: dataSourcesData } = useDataSources();

  const pillars = pillarsData ?? [];
  const domains = domainsData ?? [];
  const okrGoals = (okrGoalsData as any)?.data ?? [];
  const dataSources = dataSourcesData ?? [];

  const [form, setForm] = useState({
    code: "",
    name_en: "",
    name_ar: "",
    pillar_id: "",
    domain_id: "",
    goal_id: "",
    polarity: "ascending",
    activation_status: "draft",
    description_en: "",
    description_ar: "",
    formula: "",
    baseline: 0,
    unit_of_measure: "",
    reporting_frequency: "quarterly",
    lifecycle: "",
    data_source: "",
    segmentation_axes: "",
    related_units: "",
    notes: "",
  });

  const handleChange =
    (field: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.code || !form.name_en || !form.goal_id) {
      toast.error(t("kpi.targets.formValidation"));
      return;
    }

    const data: StrategicKPIRequest = {
      ...form,
      baseline: Number(form.baseline),
      goal_id: form.goal_id,
      pillar_id: form.pillar_id || undefined,
      domain_id: form.domain_id || undefined,
    };

    await createKpi.mutateAsync(data);
    navigate("/goals/kpi/dictionary");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <Link
        to="/goals/kpi/dictionary"
        className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("kpi.dictionary.backToDictionary")}
      </Link>

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("kpi.dictionary.newKpi")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("kpi.dictionary.subtitle")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={`${t("kpi.dictionary.fieldCode")} *`}
              value={form.code}
              onChange={handleChange("code")}
              placeholder="KPI-P1-01-01"
              required
            />
            <Select
              label={`${t("kpi.masterData.strategicGoal")} *`}
              value={form.goal_id}
              onChange={(v) =>
                setForm((prev) => ({ ...prev, goal_id: v.target.value }))
              }
              options={okrGoals.map((g: any) => ({
                value: g.id,
                label: g.title,
              }))}
              placeholder={t("common.selectAnOption")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={`${t("kpi.dictionary.fieldNameEn")} *`}
              value={form.name_en}
              onChange={handleChange("name_en")}
              required
            />
            <Input
              label={t("kpi.dictionary.fieldNameAr")}
              value={form.name_ar}
              onChange={handleChange("name_ar")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label={t("kpi.masterData.pillar")}
              value={form.pillar_id}
              onChange={(v) =>
                setForm((prev) => ({ ...prev, pillar_id: v.target.value }))
              }
              options={pillars.map((p: any) => ({
                value: p.id,
                label: p.name_en,
              }))}
              placeholder={t("common.selectAnOption")}
            />
            <Select
              label={t("kpi.masterData.domains")}
              value={form.domain_id}
              onChange={(v) =>
                setForm((prev) => ({ ...prev, domain_id: v.target.value }))
              }
              options={domains.map((d: any) => ({
                value: d.id,
                label: d.name_en,
              }))}
              placeholder={t("common.selectAnOption")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label={t("kpi.dictionary.fieldPolarity")}
              value={form.polarity}
              onChange={(v) =>
                setForm((prev) => ({ ...prev, polarity: v.target.value }))
              }
              options={[
                { value: "ascending", label: "Ascending" },
                { value: "descending", label: "Descending" },
              ]}
            />
            <Select
              label={t("kpi.dictionary.fieldFrequency")}
              value={form.reporting_frequency}
              onChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  reporting_frequency: v.target.value,
                }))
              }
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "quarterly", label: "Quarterly" },
                { value: "annually", label: "Annually" },
              ]}
            />
            <Select
              label={t("kpi.dictionary.fieldStatus")}
              value={form.activation_status}
              onChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  activation_status: v.target.value,
                }))
              }
              options={[
                { value: "draft", label: "Draft" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t("kpi.dictionary.fieldBaseline")}
              type="number"
              value={form.baseline}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  baseline: Number(e.target.value),
                }))
              }
            />
            <Input
              label={t("kpi.dictionary.fieldUnitOfMeasure")}
              value={form.unit_of_measure}
              onChange={handleChange("unit_of_measure")}
              placeholder="%, days, SAR, count..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Textarea
              label={t("kpi.dictionary.fieldDescriptionEn")}
              value={form.description_en}
              onChange={handleChange("description_en")}
              rows={3}
            />
            <Textarea
              label={t("kpi.dictionary.fieldDescriptionAr")}
              value={form.description_ar}
              onChange={handleChange("description_ar")}
              rows={3}
            />
          </div>

          <Textarea
            label={t("kpi.dictionary.fieldFormula")}
            value={form.formula}
            onChange={handleChange("formula")}
            rows={2}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t("kpi.dictionary.fieldLifecycle")}
              value={form.lifecycle}
              onChange={handleChange("lifecycle")}
            />
            <Select
              label={t("kpi.dictionary.fieldDataSource")}
              value={form.data_source}
              onChange={(v) =>
                setForm((prev) => ({ ...prev, data_source: v.target.value }))
              }
              options={dataSources.map((d: any) => ({
                value: d.name_en,
                label: d.name_en,
              }))}
              placeholder={t("common.selectAnOption")}
            />
          </div>

          <Textarea
            label={t("kpi.dictionary.fieldSegmentation")}
            value={form.segmentation_axes}
            onChange={handleChange("segmentation_axes")}
            rows={2}
          />

          <Input
            label={t("kpi.dictionary.fieldRelatedUnits")}
            value={form.related_units}
            onChange={handleChange("related_units")}
          />

          <Textarea
            label={t("kpi.dictionary.fieldNotes")}
            value={form.notes}
            onChange={handleChange("notes")}
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/goals/kpi/dictionary")}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" isLoading={createKpi.isPending}>
            <Save className="w-4 h-4 me-1" />
            {t("common.save")}
          </Button>
        </div>
      </form>
    </div>
  );
};
