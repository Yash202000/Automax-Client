import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateStrategicKPI,
  useUpdateStrategicKPI,
  useStrategicKPIDetail,
  usePillars,
  useDomains,
  useDataSources,
  useProcesses,
  useOrganizations,
  useSegmentationDimensions,
} from "../../../hooks/useKpi";
import { useGoals } from "../../../hooks/useGoals";
import { departmentApi } from "../../../api/admin";
import { kpiMasterDataApi } from "../../../api/kpi";
import { Button } from "../../../components/ui/Button";
import { Input, Textarea, Select } from "../../../components/ui/Input";
import type { StrategicKPIRequest, KPIOwnerType } from "../../../types/kpi";

export const KpiDictionaryFormPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const createKpi = useCreateStrategicKPI();
  const updateKpi = useUpdateStrategicKPI();
  const { data: existingData } = useStrategicKPIDetail(id ?? "");

  const { data: pillarsData } = usePillars();
  const { data: domainsData } = useDomains();
  const { data: okrGoalsData } = useGoals({ limit: 200 });
  const { data: dataSourcesData } = useDataSources();
  const { data: processesData } = useProcesses();
  const { data: organizationsData } = useOrganizations();
  const { data: segmentationDimensionsData } = useSegmentationDimensions();
  const { data: departmentsData } = useQuery({
    queryKey: ["admin", "departments", "all"],
    queryFn: () => departmentApi.list(),
  });

  const pillars = pillarsData ?? [];
  const domains = domainsData ?? [];
  const okrGoals = (okrGoalsData as any)?.data ?? [];
  const dataSources = dataSourcesData ?? [];
  const processes = processesData ?? [];
  const organizations = organizationsData ?? [];
  const segmentationDimensions = segmentationDimensionsData ?? [];
  const departments = departmentsData?.data ?? [];

  const [form, setForm] = useState({
    code: "",
    name_en: "",
    name_ar: "",
    pillar_id: "",
    domain_id: "",
    goal_id: "",
    process_id: "",
    owner_type: "internal" as KPIOwnerType,
    owner_dept_id: "",
    owner_org_id: "",
    owning_agency_id: "",
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

  useEffect(() => {
    const kpi = existingData?.data;
    if (!kpi) return;
    setForm({
      code: kpi.code,
      name_en: kpi.name_en,
      name_ar: kpi.name_ar ?? "",
      pillar_id: kpi.pillar_id ?? "",
      domain_id: kpi.domain_id ?? "",
      goal_id: kpi.goal_id ?? "",
      process_id: kpi.process_id ?? "",
      owner_type: kpi.owner_type ?? "internal",
      owner_dept_id: kpi.owner_dept_id ?? "",
      owner_org_id: kpi.owner_org_id ?? "",
      owning_agency_id: kpi.owning_agency_id ?? "",
      polarity: kpi.polarity,
      activation_status: kpi.activation_status,
      description_en: kpi.description_en ?? "",
      description_ar: kpi.description_ar ?? "",
      formula: kpi.formula ?? "",
      baseline: kpi.baseline,
      unit_of_measure: kpi.unit_of_measure ?? "",
      reporting_frequency: kpi.reporting_frequency ?? "quarterly",
      lifecycle: kpi.lifecycle ?? "",
      data_source: kpi.data_source ?? "",
      segmentation_axes: kpi.segmentation_axes ?? "",
      related_units: kpi.related_units ?? "",
      notes: kpi.notes ?? "",
    });
  }, [existingData]);

  // Structured segmentation axes / administrative units — only usable once
  // the KPI has an id (endpoints are scoped to kpi_id), same "save first"
  // gating used elsewhere in the KPI module for sub-resources.
  const qc = useQueryClient();

  const { data: segmentationAxesData } = useQuery({
    queryKey: ["kpi", "strategic", id, "segmentation-axes"],
    queryFn: async () => {
      const res = await kpiMasterDataApi.listSegmentationAxes("strategic", id!);
      return res.data ?? [];
    },
    enabled: isEdit,
  });
  const segmentationAxes = segmentationAxesData ?? [];

  const { data: administrativeUnitsData } = useQuery({
    queryKey: ["kpi", "strategic", id, "administrative-units"],
    queryFn: async () => {
      const res = await kpiMasterDataApi.listAdministrativeUnits(
        "strategic",
        id!,
      );
      return res.data ?? [];
    },
    enabled: isEdit,
  });
  const administrativeUnits = administrativeUnitsData ?? [];

  const [newAxisDimensionId, setNewAxisDimensionId] = useState("");
  const [newUnitDepartmentId, setNewUnitDepartmentId] = useState("");

  const addAxis = useMutation({
    mutationFn: (dimensionId: string) =>
      kpiMasterDataApi.addSegmentationAxis("strategic", id!, dimensionId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "strategic", id, "segmentation-axes"],
      });
      setNewAxisDimensionId("");
    },
    onError: () => toast.error(t("common.failed")),
  });

  const deleteAxis = useMutation({
    mutationFn: (axisId: string) =>
      kpiMasterDataApi.deleteSegmentationAxis(axisId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "strategic", id, "segmentation-axes"],
      });
    },
    onError: () => toast.error(t("common.failed")),
  });

  const addUnit = useMutation({
    mutationFn: (departmentId: string) =>
      kpiMasterDataApi.addAdministrativeUnit("strategic", id!, departmentId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "strategic", id, "administrative-units"],
      });
      setNewUnitDepartmentId("");
    },
    onError: () => toast.error(t("common.failed")),
  });

  const deleteUnit = useMutation({
    mutationFn: (unitId: string) =>
      kpiMasterDataApi.deleteAdministrativeUnit(unitId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "strategic", id, "administrative-units"],
      });
    },
    onError: () => toast.error(t("common.failed")),
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

    if (!form.code || !form.name_en || !form.goal_id || !form.process_id) {
      toast.error(t("kpi.targets.formValidation"));
      return;
    }

    const data: StrategicKPIRequest = {
      ...form,
      baseline: Number(form.baseline),
      goal_id: form.goal_id,
      process_id: form.process_id,
      pillar_id: form.pillar_id || undefined,
      domain_id: form.domain_id || undefined,
      owner_dept_id: form.owner_dept_id || undefined,
      owning_agency_id: form.owning_agency_id || undefined,
      owner_org_id:
        form.owner_type === "external"
          ? form.owner_org_id || undefined
          : undefined,
    };

    if (isEdit) {
      await updateKpi.mutateAsync({ id: id!, data });
      navigate(`/goals/kpi/dictionary/strategic/${id}`);
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
        <div className="p-2 rounded-lg bg-blue-500/10">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isEdit ? "Edit KPI" : t("kpi.dictionary.newKpi")}
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
            <Select
              label="Objective *"
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

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("kpi.dictionary.fieldSegmentationAxesStructured")}
            </label>
            {!isEdit ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                {t("kpi.dictionary.saveKpiFirstForAxes")}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {segmentationAxes.length === 0 && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {t("common.none")}
                    </span>
                  )}
                  {segmentationAxes.map((axis) => (
                    <span
                      key={axis.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-300"
                    >
                      {axis.dimension?.name_en ?? axis.dimension_id}
                      <button
                        type="button"
                        onClick={() => deleteAxis.mutate(axis.id)}
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      value={newAxisDimensionId}
                      onChange={(e) => setNewAxisDimensionId(e.target.value)}
                      options={segmentationDimensions
                        .filter(
                          (d: any) =>
                            !segmentationAxes.some(
                              (a) => a.dimension_id === d.id,
                            ),
                        )
                        .map((d: any) => ({
                          value: d.id,
                          label: d.name_en,
                        }))}
                      placeholder={t("common.selectAnOption")}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!newAxisDimensionId || addAxis.isPending}
                    onClick={() =>
                      newAxisDimensionId && addAxis.mutate(newAxisDimensionId)
                    }
                  >
                    {t("common.add")}
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("kpi.dictionary.fieldAdministrativeUnitsStructured")}
            </label>
            {!isEdit ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                {t("kpi.dictionary.saveKpiFirstForAxes")}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {administrativeUnits.length === 0 && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {t("common.none")}
                    </span>
                  )}
                  {administrativeUnits.map((unit) => (
                    <span
                      key={unit.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-300"
                    >
                      {unit.department?.name ?? unit.department_id}
                      <button
                        type="button"
                        onClick={() => deleteUnit.mutate(unit.id)}
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      value={newUnitDepartmentId}
                      onChange={(e) => setNewUnitDepartmentId(e.target.value)}
                      options={departments
                        .filter(
                          (d: any) =>
                            !administrativeUnits.some(
                              (u) => u.department_id === d.id,
                            ),
                        )
                        .map((d: any) => ({
                          value: d.id,
                          label: d.name,
                        }))}
                      placeholder={t("common.selectAnOption")}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!newUnitDepartmentId || addUnit.isPending}
                    onClick={() =>
                      newUnitDepartmentId && addUnit.mutate(newUnitDepartmentId)
                    }
                  >
                    {t("common.add")}
                  </Button>
                </div>
              </>
            )}
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
