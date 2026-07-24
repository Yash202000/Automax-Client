import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BookOpen, Save } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateOperationalKPI,
  useUpdateOperationalKPI,
  useOperationalKPIDetail,
  useOperationalObjectives,
  useProcesses,
  useDataSources,
} from "../../../hooks/useKpi";
import { useGoals } from "../../../hooks/useGoals";
import { Button } from "../../../components/ui/Button";
import { Input, Textarea, Select } from "../../../components/ui/Input";
import type { OperationalKPIRequest } from "../../../types/kpi";

export const KpiDictionaryFormOperationalPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const createKpi = useCreateOperationalKPI();
  const updateKpi = useUpdateOperationalKPI();
  const { data: existingData } = useOperationalKPIDetail(id ?? "");

  const { data: goalsData } = useGoals({ limit: 200 });
  const { data: objectivesData } = useOperationalObjectives();
  const { data: processesData } = useProcesses();
  const { data: dataSourcesData } = useDataSources();

  const goals = (goalsData as any)?.data ?? [];
  const objectives = objectivesData ?? [];
  const processes = processesData ?? [];
  const dataSources = dataSourcesData ?? [];

  const [form, setForm] = useState({
    code: "",
    name_en: "",
    name_ar: "",
    goal_id: "",
    operational_objective_id: "",
    process_id: "",
    polarity: "ascending",
    activation_status: "draft",
    description_en: "",
    description_ar: "",
    formula: "",
    baseline: 0,
    unit_of_measure: "",
    reporting_frequency: "quarterly",
    data_source: "",
    notes: "",
  });

  useEffect(() => {
    const kpi = existingData?.data;
    if (!kpi) return;
    setForm({
      code: kpi.code,
      name_en: kpi.name_en,
      name_ar: kpi.name_ar ?? "",
      goal_id: kpi.goal_id ?? "",
      operational_objective_id: kpi.operational_objective_id ?? "",
      process_id: kpi.process_id ?? "",
      polarity: kpi.polarity,
      activation_status: kpi.activation_status,
      description_en: kpi.description_en ?? "",
      description_ar: kpi.description_ar ?? "",
      formula: kpi.formula ?? "",
      baseline: kpi.baseline,
      unit_of_measure: kpi.unit_of_measure ?? "",
      reporting_frequency: kpi.reporting_frequency ?? "quarterly",
      data_source: kpi.data_source ?? "",
      notes: kpi.notes ?? "",
    });
  }, [existingData]);

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

    if (
      !form.code ||
      !form.name_en ||
      !form.goal_id ||
      !form.operational_objective_id ||
      !form.process_id
    ) {
      toast.error(t("kpi.targets.formValidation"));
      return;
    }

    const data: OperationalKPIRequest = {
      ...form,
      baseline: Number(form.baseline),
    };

    if (isEdit) {
      await updateKpi.mutateAsync({ id: id!, data });
      navigate(`/goals/kpi/dictionary/operational/${id}`);
    } else {
      await createKpi.mutateAsync(data);
      navigate("/goals/kpi/dictionary");
    }
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
        <div className="p-2 rounded-lg bg-green-500/10">
          <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isEdit ? "Edit Operational KPI" : "New Operational KPI"}
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
              placeholder="OP-P1-01-01"
              required
            />
            <Select
              label={`${t("kpi.masterData.strategicGoal")} *`}
              value={form.goal_id}
              onChange={(v) =>
                setForm((prev) => ({ ...prev, goal_id: v.target.value }))
              }
              options={goals.map((g: any) => ({
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
              label={`Parent Objective *`}
              value={form.operational_objective_id}
              onChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  operational_objective_id: v.target.value,
                }))
              }
              options={objectives.map((o: any) => ({
                value: o.id,
                label: o.name_en,
              }))}
              placeholder={t("common.selectAnOption")}
            />
            <Select
              label={`Operational Objective *`}
              value={form.process_id}
              onChange={(v) =>
                setForm((prev) => ({ ...prev, process_id: v.target.value }))
              }
              options={processes.map((p: any) => ({
                value: p.id,
                label: p.name_en,
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
          <Button
            type="submit"
            leftIcon={<Save className="w-4 h-4" />}
            isLoading={isEdit ? updateKpi.isPending : createKpi.isPending}
          >
            {t("common.save")}
          </Button>
        </div>
      </form>
    </div>
  );
};
