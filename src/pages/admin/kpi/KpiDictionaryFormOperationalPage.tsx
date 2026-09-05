import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Save, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateOperationalKPI,
  useUpdateOperationalKPI,
  useOperationalKPIDetail,
  useOperationalObjectives,
  useProcesses,
  useDataSources,
  useDomains,
  useOrganizations,
  useKpiDocumentaFolderInfo,
} from "../../../hooks/useKpi";
import { useGoals } from "../../../hooks/useGoals";
import { departmentApi } from "../../../api/admin";
import { Button } from "../../../components/ui/Button";
import { Input, Textarea, Select } from "../../../components/ui/Input";
import { DocumentaFolderPicker } from "../../../components/kpi/DocumentaFolderPicker";
import type { OperationalKPIRequest, KPIOwnerType } from "../../../types/kpi";

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
  const { data: domainsData } = useDomains();
  const { data: organizationsData } = useOrganizations();
  const { data: departmentsData } = useQuery({
    queryKey: ["admin", "departments", "all"],
    queryFn: () => departmentApi.list(),
  });

  const goals = (goalsData as any)?.data ?? [];
  const objectives = objectivesData ?? [];
  const processes = processesData ?? [];
  const dataSources = dataSourcesData ?? [];
  const domains = domainsData ?? [];
  const organizations = organizationsData ?? [];
  const departments = departmentsData?.data ?? [];

  const [form, setForm] = useState({
    code: "",
    name_en: "",
    name_ar: "",
    goal_id: "",
    operational_objective_id: "",
    process_id: "",
    domain_id: "",
    owner_type: "internal" as KPIOwnerType,
    owner_dept_id: "",
    owner_org_id: "",
    owning_agency_id: "",
    polarity: "ascending",
    description_en: "",
    description_ar: "",
    formula: "",
    baseline: 0,
    unit_of_measure: "",
    reporting_frequency: "quarterly",
    lifecycle: "",
    data_source: "",
    notes: "",
    documenta_folder_id: "",
  });
  const [documentaFolderPath, setDocumentaFolderPath] = useState<string[]>([]);
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  const { data: configuredFolderInfo } = useKpiDocumentaFolderInfo(
    form.documenta_folder_id || undefined,
  );
  useEffect(() => {
    if (configuredFolderInfo?.path) {
      setDocumentaFolderPath(
        configuredFolderInfo.path.split("/").filter(Boolean),
      );
    }
  }, [configuredFolderInfo]);

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
      domain_id: kpi.domain_id ?? "",
      owner_type: kpi.owner_type ?? "internal",
      owner_dept_id: kpi.owner_dept_id ?? "",
      owner_org_id: kpi.owner_org_id ?? "",
      owning_agency_id: kpi.owning_agency_id ?? "",
      polarity: kpi.polarity,
      description_en: kpi.description_en ?? "",
      description_ar: kpi.description_ar ?? "",
      formula: kpi.formula ?? "",
      baseline: kpi.baseline,
      unit_of_measure: kpi.unit_of_measure ?? "",
      reporting_frequency: kpi.reporting_frequency ?? "quarterly",
      lifecycle: kpi.lifecycle ?? "",
      data_source: kpi.data_source ?? "",
      notes: kpi.notes ?? "",
      documenta_folder_id: kpi.documenta_folder_id ?? "",
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
      domain_id: form.domain_id || undefined,
      owner_dept_id: form.owner_dept_id || undefined,
      owning_agency_id: form.owning_agency_id || undefined,
      owner_org_id:
        form.owner_type === "external"
          ? form.owner_org_id || undefined
          : undefined,
      documenta_folder_id: form.documenta_folder_id || undefined,
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

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Evidence Folder
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                <FolderOpen size={16} className="text-amber-500 shrink-0" />
                {form.documenta_folder_id
                  ? documentaFolderPath.join(" / ") || "Configured"
                  : "Not configured — evidence will use a default folder on first upload"}
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowFolderPicker(true)}
              >
                Choose Folder
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label={t("kpi.dictionary.fieldOwnerType")}
              value={form.owner_type}
              onChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  owner_type: v.target.value as KPIOwnerType,
                  owner_org_id:
                    v.target.value === "internal" ? "" : prev.owner_org_id,
                }))
              }
              options={[
                {
                  value: "internal",
                  label: t("kpi.dictionary.ownerTypeInternal"),
                },
                {
                  value: "external",
                  label: t("kpi.dictionary.ownerTypeExternal"),
                },
              ]}
            />
            <Select
              label={t("kpi.dictionary.fieldOwnerDept")}
              value={form.owner_dept_id}
              onChange={(v) =>
                setForm((prev) => ({ ...prev, owner_dept_id: v.target.value }))
              }
              options={departments.map((d: any) => ({
                value: d.id,
                label: d.name,
              }))}
              placeholder={t("common.selectAnOption")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label={t("kpi.dictionary.fieldOwningAgency")}
              value={form.owning_agency_id}
              onChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  owning_agency_id: v.target.value,
                }))
              }
              options={departments.map((d: any) => ({
                value: d.id,
                label: d.name,
              }))}
              placeholder={t("common.selectAnOption")}
            />
            {form.owner_type === "external" && (
              <Select
                label={t("kpi.dictionary.fieldOwnerOrg")}
                value={form.owner_org_id}
                onChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    owner_org_id: v.target.value,
                  }))
                }
                options={organizations.map((o: any) => ({
                  value: o.id,
                  label: o.name_en,
                }))}
                placeholder={t("common.selectAnOption")}
              />
            )}
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
                {
                  value: "semi_annual",
                  label: t("kpi.dictionary.fieldFrequencySemiAnnual"),
                },
                { value: "annually", label: "Annually" },
                {
                  value: "custom",
                  label: t("kpi.dictionary.fieldFrequencyCustom"),
                },
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

      <DocumentaFolderPicker
        isOpen={showFolderPicker}
        onClose={() => setShowFolderPicker(false)}
        currentFolderId={form.documenta_folder_id || undefined}
        currentFolderPath={documentaFolderPath}
        onSelect={(folderId, folderPath) => {
          setForm((prev) => ({ ...prev, documenta_folder_id: folderId }));
          setDocumentaFolderPath(folderPath);
          setShowFolderPicker(false);
        }}
      />
    </div>
  );
};
