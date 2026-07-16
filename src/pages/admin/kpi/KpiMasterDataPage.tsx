import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Database,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Download,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { KpiObjectivesTree } from "../../../components/kpi/KpiObjectivesTree";
import {
  usePillars,
  useCreatePillar,
  useUpdatePillar,
  useDeletePillar,
  useEnablers,
  useCreateEnabler,
  useUpdateEnabler,
  useDeleteEnabler,
  useOperationalObjectives,
  useCreateOperationalObjective,
  useUpdateOperationalObjective,
  useDeleteOperationalObjective,
  useProcesses,
  useCreateProcess,
  useUpdateProcess,
  useDeleteProcess,
  useInitiatives,
  useCreateInitiative,
  useUpdateInitiative,
  useDeleteInitiative,
  useDomains,
  useCreateDomain,
  useUpdateDomain,
  useDeleteDomain,
  useAwardCriteria,
  useCreateAwardCriterion,
  useUpdateAwardCriterion,
  useDeleteAwardCriterion,
  useAwardSubCriteria,
  useCreateAwardSubCriterion,
  useUpdateAwardSubCriterion,
  useDeleteAwardSubCriterion,
  useDataSources,
  useCreateDataSource,
  useUpdateDataSource,
  useDeleteDataSource,
  useSegmentationDimensions,
  useCreateSegmentationDimension,
  useUpdateSegmentationDimension,
  useDeleteSegmentationDimension,
} from "../../../hooks/useKpi";
import { useGoals } from "../../../hooks/useGoals";
import { usePermissions } from "../../../hooks/usePermissions";
import { PERMISSIONS } from "../../../constants/permissions";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/SelectInput";
import { userApi, departmentApi } from "../../../api/admin";
import { exportToExcel as exportToExcelUtil } from "../../../utils/exportExcel";
import type {
  Pillar,
  Enabler,
  OperationalObjective,
  Initiative,
  Domain,
  AwardCriterion,
  AwardSubCriterion,
  KpiDataSource,
  KpiSegmentationDimension,
  PillarRequest,
  EnablerRequest,
  OperationalObjectiveRequest,
  ProcessRequest,
  InitiativeRequest,
  DomainRequest,
  AwardCriterionRequest,
  AwardSubCriterionRequest,
  KpiDataSourceRequest,
  KpiSegmentationDimensionRequest,
} from "../../../types/kpi";

type EntityType =
  | "pillar"
  | "enabler"
  | "operational-objective"
  | "process"
  | "objectives-tree"
  | "initiative"
  | "domain"
  | "award-criterion"
  | "award-sub-criterion"
  | "data-source"
  | "segmentation-dimension";

interface FormState {
  name_en: string;
  name_ar: string;
  owner_id: string;
  pillar_id: string;
  enabler_id: string;
  goal_id: string;
  objective_id: string;
  operational_objective_id: string;
  department_id: string;
  unit: string;
  status: string;
  type: string;
  criterion_no: string;
  award_criterion_id: string;
  sub_no: string;
}

const initialForm: FormState = {
  name_en: "",
  name_ar: "",
  owner_id: "",
  pillar_id: "",
  enabler_id: "",
  goal_id: "",
  objective_id: "",
  operational_objective_id: "",
  department_id: "",
  unit: "",
  status: "",
  type: "",
  criterion_no: "",
  award_criterion_id: "",
  sub_no: "",
};

export const KpiMasterDataPage: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as EntityType | null;
  const tabs: { key: EntityType; label: string }[] = [
    { key: "pillar", label: t("kpi.masterData.pillars") },
    { key: "enabler", label: t("kpi.masterData.enablers") },
    { key: "objectives-tree", label: "Objectives Hierarchy" },
    { key: "initiative", label: t("kpi.masterData.initiatives") },
    { key: "domain", label: t("kpi.masterData.domains") },
    { key: "award-criterion", label: t("kpi.masterData.awardCriteria") },
    {
      key: "award-sub-criterion",
      label: t("kpi.masterData.awardSubCriteria"),
    },
    { key: "data-source", label: t("kpi.masterData.dataSources") },
    {
      key: "segmentation-dimension",
      label: t("kpi.masterData.segmentationDimensions"),
    },
  ];
  const validKeys = tabs.map((t) => t.key);
  const activeTab: EntityType =
    tabParam && validKeys.includes(tabParam) ? tabParam : "pillar";
  const isStandalone = searchParams.get("standalone") === "1";

  const {
    data: pillars,
    isLoading: pillarsLoading,
    error: pillarsError,
  } = usePillars();
  const {
    data: enablers,
    isLoading: enablersLoading,
    error: enablersError,
  } = useEnablers();
  const { data: goalsData } = useGoals({ limit: 200 });
  const goals = (goalsData as any)?.data ?? [];
  const { data: operationalObjectives } = useOperationalObjectives();
  const { data: processes } = useProcesses();
  const { data: initiatives } = useInitiatives();
  const { data: domains } = useDomains();
  const { data: awardCriteria } = useAwardCriteria();
  const { data: awardSubCriteria } = useAwardSubCriteria();
  const { data: dataSources } = useDataSources();
  const { data: segmentationDimensions } = useSegmentationDimensions();

  const { data: usersData } = useQuery({
    queryKey: ["admin", "users", "all"],
    queryFn: () => userApi.list(1, 1000),
  });

  const users = (usersData as any)?.data ?? [];

  const { data: departmentsData } = useQuery({
    queryKey: ["admin", "departments", "all"],
    queryFn: () => departmentApi.list(),
  });

  const departments = departmentsData?.data ?? [];

  const createPillar = useCreatePillar();
  const updatePillar = useUpdatePillar();
  const deletePillar = useDeletePillar();
  const createEnabler = useCreateEnabler();
  const updateEnabler = useUpdateEnabler();
  const deleteEnabler = useDeleteEnabler();
  const createOperationalObjective = useCreateOperationalObjective();
  const updateOperationalObjective = useUpdateOperationalObjective();
  const deleteOperationalObjective = useDeleteOperationalObjective();
  const createProcess = useCreateProcess();
  const updateProcess = useUpdateProcess();
  const deleteProcess = useDeleteProcess();
  const createInitiative = useCreateInitiative();
  const updateInitiative = useUpdateInitiative();
  const deleteInitiative = useDeleteInitiative();
  const createDomain = useCreateDomain();
  const updateDomain = useUpdateDomain();
  const deleteDomain = useDeleteDomain();
  const createAwardCriterion = useCreateAwardCriterion();
  const updateAwardCriterion = useUpdateAwardCriterion();
  const deleteAwardCriterion = useDeleteAwardCriterion();
  const createAwardSubCriterion = useCreateAwardSubCriterion();
  const updateAwardSubCriterion = useUpdateAwardSubCriterion();
  const deleteAwardSubCriterion = useDeleteAwardSubCriterion();
  const createDataSource = useCreateDataSource();
  const updateDataSource = useUpdateDataSource();
  const deleteDataSource = useDeleteDataSource();
  const createSegmentationDimension = useCreateSegmentationDimension();
  const updateSegmentationDimension = useUpdateSegmentationDimension();
  const deleteSegmentationDimension = useDeleteSegmentationDimension();

  const canManage = isSuperAdmin || hasPermission(PERMISSIONS.GOALS_MANAGE);

  const userOptions = users.map((u: any) => ({
    value: u.id,
    label: `${u.first_name} ${u.last_name} (${u.email})`,
  }));

  const departmentOptions = departments.map((d) => ({
    value: d.id,
    label: d.name,
  }));

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<EntityType>("pillar");
  const [modalItem, setModalItem] = useState<any>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const set =
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const setSel = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleAdd = (type: EntityType) => {
    setModalType(type);
    setModalItem(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const handleEdit = (type: EntityType, item: any) => {
    setModalType(type);
    setModalItem(item);
    setForm({
      name_en: item.name_en || "",
      name_ar: item.name_ar || "",
      owner_id: item.owner_id || "",
      pillar_id: item.pillar_id || "",
      enabler_id: item.enabler_id || "",
      goal_id: item.goal_id || "",
      objective_id: item.objective_id || "",
      operational_objective_id: item.operational_objective_id || "",
      department_id: item.department_id || "",
      unit: item.unit || "",
      status: item.status || "",
      type: item.type || "",
      criterion_no:
        item.criterion_no !== undefined ? String(item.criterion_no) : "",
      award_criterion_id: item.award_criterion_id || "",
      sub_no: item.sub_no || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const isEdit = !!modalItem;
    try {
      if (modalType === "pillar") {
        const data: PillarRequest = {
          name_en: form.name_en,
          name_ar: form.name_ar,
          owner_id: form.owner_id || undefined,
        };
        if (isEdit) await updatePillar.mutateAsync({ id: modalItem.id, data });
        else await createPillar.mutateAsync(data);
      } else if (modalType === "enabler") {
        const data: EnablerRequest = {
          name_en: form.name_en,
          name_ar: form.name_ar,
          owner_id: form.owner_id || undefined,
        };
        if (isEdit) await updateEnabler.mutateAsync({ id: modalItem.id, data });
        else await createEnabler.mutateAsync(data);
      } else if (modalType === "operational-objective") {
        const data: OperationalObjectiveRequest = {
          name_en: form.name_en,
          name_ar: form.name_ar,
          goal_id: form.goal_id,
          pillar_id: form.pillar_id || undefined,
          enabler_id: form.enabler_id || undefined,
        };
        if (isEdit)
          await updateOperationalObjective.mutateAsync({
            id: modalItem.id,
            data,
          });
        else await createOperationalObjective.mutateAsync(data);
      } else if (modalType === "process") {
        const data: ProcessRequest = {
          name_en: form.name_en,
          name_ar: form.name_ar,
          operational_objective_id: form.operational_objective_id,
          goal_id: form.goal_id,
          pillar_id: form.pillar_id || undefined,
          enabler_id: form.enabler_id || undefined,
          department_id: form.department_id || undefined,
          unit: form.unit || undefined,
        };
        if (isEdit) await updateProcess.mutateAsync({ id: modalItem.id, data });
        else await createProcess.mutateAsync(data);
      } else if (modalType === "initiative") {
        const data: InitiativeRequest = {
          name_en: form.name_en,
          name_ar: form.name_ar,
          goal_id: form.goal_id,
          objective_id: form.objective_id || undefined,
          pillar_id: form.pillar_id || undefined,
          enabler_id: form.enabler_id || undefined,
          owner_id: form.owner_id || undefined,
          status: form.status || undefined,
        };
        if (isEdit)
          await updateInitiative.mutateAsync({ id: modalItem.id, data });
        else await createInitiative.mutateAsync(data);
      } else if (modalType === "domain") {
        const data: DomainRequest = {
          name_en: form.name_en,
          name_ar: form.name_ar,
          type: form.type,
        };
        if (isEdit) await updateDomain.mutateAsync({ id: modalItem.id, data });
        else await createDomain.mutateAsync(data);
      } else if (modalType === "award-criterion") {
        const data: AwardCriterionRequest = {
          criterion_no: Number(form.criterion_no),
          name_en: form.name_en,
          name_ar: form.name_ar,
        };
        if (isEdit)
          await updateAwardCriterion.mutateAsync({ id: modalItem.id, data });
        else await createAwardCriterion.mutateAsync(data);
      } else if (modalType === "award-sub-criterion") {
        const data: AwardSubCriterionRequest = {
          award_criterion_id: form.award_criterion_id,
          sub_no: form.sub_no,
          name_en: form.name_en,
          name_ar: form.name_ar,
        };
        if (isEdit)
          await updateAwardSubCriterion.mutateAsync({ id: modalItem.id, data });
        else await createAwardSubCriterion.mutateAsync(data);
      } else if (modalType === "data-source") {
        const data: KpiDataSourceRequest = {
          name_en: form.name_en,
          name_ar: form.name_ar,
        };
        if (isEdit)
          await updateDataSource.mutateAsync({ id: modalItem.id, data });
        else await createDataSource.mutateAsync(data);
      } else if (modalType === "segmentation-dimension") {
        const data: KpiSegmentationDimensionRequest = {
          name_en: form.name_en,
          name_ar: form.name_ar,
        };
        if (isEdit)
          await updateSegmentationDimension.mutateAsync({
            id: modalItem.id,
            data,
          });
        else await createSegmentationDimension.mutateAsync(data);
      }
      setModalOpen(false);
    } catch {
      // toast handled by hook
    }
  };

  const handleDelete = (type: EntityType, id: string) => {
    const actions: Record<string, (id: string) => void> = {
      pillar: (i) => deletePillar.mutate(i),
      enabler: (i) => deleteEnabler.mutate(i),
      "operational-objective": (i) => deleteOperationalObjective.mutate(i),
      process: (i) => deleteProcess.mutate(i),
      initiative: (i) => deleteInitiative.mutate(i),
      domain: (i) => deleteDomain.mutate(i),
      "award-criterion": (i) => deleteAwardCriterion.mutate(i),
      "award-sub-criterion": (i) => deleteAwardSubCriterion.mutate(i),
      "data-source": (i) => deleteDataSource.mutate(i),
      "segmentation-dimension": (i) => deleteSegmentationDimension.mutate(i),
    };
    actions[type]?.(id);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importType, setImportType] = useState<EntityType>("pillar");

  const exportToExcel = (data: any[], label: string) =>
    exportToExcelUtil(
      data,
      label,
      t("common.noDataToExport"),
      t("common.exported"),
    );

  const handleImportExcel = (type: EntityType) => {
    setImportType(type);
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any>(sheet);
        if (!json.length) {
          toast.error(t("common.emptyFile"));
          return;
        }
        let imported = 0;
        for (const row of json) {
          try {
            await submitImportRow(importType, row);
            imported++;
          } catch {
            // skip failed rows
          }
        }
        toast.success(t("common.imported", { count: imported }));
      } catch {
        toast.error(t("common.invalidFile"));
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const submitImportRow = async (type: EntityType, row: any) => {
    const name_en = row.name_en || row.NameEn || row.Name || "";
    const name_ar = row.name_ar || row.NameAr || "";
    if (!name_en) return;
    if (type === "pillar") {
      await createPillar.mutateAsync({
        name_en,
        name_ar,
        owner_id: row.owner_id || undefined,
      } as PillarRequest);
    } else if (type === "enabler") {
      await createEnabler.mutateAsync({
        name_en,
        name_ar,
        owner_id: row.owner_id || undefined,
      } as EnablerRequest);
    } else if (type === "operational-objective") {
      await createOperationalObjective.mutateAsync({
        name_en,
        name_ar,
        goal_id: row.goal_id,
        pillar_id: row.pillar_id || undefined,
        enabler_id: row.enabler_id || undefined,
      } as OperationalObjectiveRequest);
    } else if (type === "process") {
      await createProcess.mutateAsync({
        name_en,
        name_ar,
        operational_objective_id: row.operational_objective_id,
        goal_id: row.goal_id,
        pillar_id: row.pillar_id || undefined,
        enabler_id: row.enabler_id || undefined,
        department_id: row.department_id || undefined,
        unit: row.unit || undefined,
      } as ProcessRequest);
    } else if (type === "initiative") {
      await createInitiative.mutateAsync({
        name_en,
        name_ar,
        goal_id: row.goal_id,
        objective_id: row.objective_id || undefined,
        pillar_id: row.pillar_id || undefined,
        enabler_id: row.enabler_id || undefined,
        owner_id: row.owner_id || undefined,
        status: row.status || undefined,
      } as InitiativeRequest);
    } else if (type === "domain") {
      await createDomain.mutateAsync({
        name_en,
        name_ar,
        type: row.type || "",
      } as DomainRequest);
    } else if (type === "award-criterion") {
      await createAwardCriterion.mutateAsync({
        name_en,
        name_ar,
        criterion_no: Number(row.criterion_no || row.criterionNo || 1),
      } as AwardCriterionRequest);
    } else if (type === "award-sub-criterion") {
      await createAwardSubCriterion.mutateAsync({
        name_en,
        name_ar,
        award_criterion_id: row.award_criterion_id,
        sub_no: row.sub_no || row.subNo || "1",
      } as AwardSubCriterionRequest);
    } else if (type === "data-source") {
      await createDataSource.mutateAsync({
        name_en,
        name_ar,
      } as KpiDataSourceRequest);
    } else if (type === "segmentation-dimension") {
      await createSegmentationDimension.mutateAsync({
        name_en,
        name_ar,
      } as KpiSegmentationDimensionRequest);
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId) return "-";
    const u = users.find((x: any) => x.id === userId);
    return u ? `${u.first_name} ${u.last_name}` : userId;
  };

  const getDepartmentName = (departmentId?: string) => {
    if (!departmentId) return "-";
    const d = departments.find((x) => x.id === departmentId);
    return d ? d.name : departmentId;
  };

  const modalEntityLabelKey: Record<EntityType, string> = {
    pillar: "pillars",
    enabler: "enablers",
    "operational-objective": "operationalObjectives",
    process: "processes",
    "objectives-tree": "processes",
    initiative: "initiatives",
    domain: "domains",
    "award-criterion": "awardCriteria",
    "award-sub-criterion": "awardSubCriteria",
    "data-source": "dataSources",
    "segmentation-dimension": "segmentationDimensions",
  };
  const modalTitle = modalItem ? t("common.edit") : t("common.add");
  const modalEntityLabel = t(
    `kpi.masterData.${modalEntityLabelKey[modalType]}`,
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("kpi.masterData.title")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("kpi.masterData.subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit overflow-x-auto">
        {isStandalone ? (
          <div className="px-4 py-2 text-sm font-medium">
            {tabs.find((t) => t.key === activeTab)?.label}
          </div>
        ) : (
          tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSearchParams({ tab: tab.key })}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))
        )}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
        {activeTab === "pillar" && (
          <MasterTable<Pillar>
            data={pillars ?? []}
            columns={[
              { header: t("kpi.masterData.nameEn"), accessor: "name_en" },
              { header: t("kpi.masterData.nameAr"), accessor: "name_ar" },
              {
                header: t("kpi.masterData.owner"),
                accessor: (r) => r.owner?.name ?? getDepartmentName(r.owner_id),
              },
              {
                header: t("kpi.masterData.active"),
                accessor: (r) =>
                  r.is_active ? t("common.yes") : t("common.no"),
              },
            ]}
            emptyMessage={t("kpi.masterData.noPillars")}
            canManage={canManage}
            onEdit={(item) => handleEdit("pillar", item)}
            onDelete={(id) => handleDelete("pillar", id)}
            onAdd={() => handleAdd("pillar")}
            onExport={() => exportToExcel(pillars ?? [], "Pillars")}
            onImport={() => handleImportExcel("pillar")}
            loading={pillarsLoading}
            error={pillarsError ? t("kpi.masterData.failedToLoad") : undefined}
          />
        )}
        {activeTab === "enabler" && (
          <MasterTable<Enabler>
            data={enablers ?? []}
            columns={[
              { header: t("kpi.masterData.nameEn"), accessor: "name_en" },
              { header: t("kpi.masterData.nameAr"), accessor: "name_ar" },
              {
                header: t("kpi.masterData.owner"),
                accessor: (r) => r.owner?.name ?? getDepartmentName(r.owner_id),
              },
              {
                header: t("kpi.masterData.active"),
                accessor: (r) =>
                  r.is_active ? t("common.yes") : t("common.no"),
              },
            ]}
            emptyMessage={t("kpi.masterData.noEnablers")}
            canManage={canManage}
            onEdit={(item) => handleEdit("enabler", item)}
            onDelete={(id) => handleDelete("enabler", id)}
            onAdd={() => handleAdd("enabler")}
            onExport={() => exportToExcel(enablers ?? [], "Enablers")}
            onImport={() => handleImportExcel("enabler")}
            loading={enablersLoading}
            error={enablersError ? t("kpi.masterData.failedToLoad") : undefined}
          />
        )}
        {activeTab === "objectives-tree" && (
          <KpiObjectivesTree
            operationalObjectives={operationalObjectives ?? []}
            processes={processes ?? []}
            canManage={canManage}
            onAddParent={() => handleAdd("operational-objective")}
            onEditParent={(item) => handleEdit("operational-objective", item)}
            onDeleteParent={(id) => handleDelete("operational-objective", id)}
            onExportParent={() =>
              exportToExcel(operationalObjectives ?? [], "ParentObjectives")
            }
            onImportParent={() => handleImportExcel("operational-objective")}
            onAddChild={() => handleAdd("process")}
            onEditChild={(item) => handleEdit("process", item)}
            onDeleteChild={(id) => handleDelete("process", id)}
            onExportChild={() =>
              exportToExcel(processes ?? [], "OperationalObjectives")
            }
            onImportChild={() => handleImportExcel("process")}
          />
        )}
        {activeTab === "initiative" && (
          <MasterTable<Initiative>
            data={initiatives ?? []}
            columns={[
              { header: t("kpi.masterData.nameEn"), accessor: "name_en" },
              { header: t("kpi.masterData.nameAr"), accessor: "name_ar" },
              {
                header: t("kpi.masterData.strategicGoal"),
                accessor: (r) => r.goal?.title ?? r.goal_id ?? "-",
              },
              {
                header: "Parent Objective",
                accessor: (r) => r.objective?.name_en ?? r.objective_id ?? "-",
              },
              {
                header: t("kpi.masterData.owner"),
                accessor: (r) => getUserName(r.owner_id),
              },
              { header: t("kpi.masterData.status"), accessor: "status" },
            ]}
            emptyMessage={t("kpi.masterData.noInitiatives")}
            canManage={canManage}
            onEdit={(item) => handleEdit("initiative", item)}
            onDelete={(id) => handleDelete("initiative", id)}
            onAdd={() => handleAdd("initiative")}
            onExport={() => exportToExcel(initiatives ?? [], "Initiatives")}
            onImport={() => handleImportExcel("initiative")}
          />
        )}
        {activeTab === "domain" && (
          <MasterTable<Domain>
            data={domains ?? []}
            columns={[
              { header: t("kpi.masterData.nameEn"), accessor: "name_en" },
              { header: t("kpi.masterData.nameAr"), accessor: "name_ar" },
              { header: t("kpi.masterData.type"), accessor: "type" },
            ]}
            emptyMessage={t("kpi.masterData.noDomains")}
            canManage={canManage}
            onEdit={(item) => handleEdit("domain", item)}
            onDelete={(id) => handleDelete("domain", id)}
            onAdd={() => handleAdd("domain")}
            onExport={() => exportToExcel(domains ?? [], "Domains")}
            onImport={() => handleImportExcel("domain")}
          />
        )}
        {activeTab === "award-criterion" && (
          <MasterTable<AwardCriterion>
            data={awardCriteria ?? []}
            columns={[
              {
                header: t("kpi.masterData.criterionNo"),
                accessor: "criterion_no",
              },
              { header: t("kpi.masterData.nameEn"), accessor: "name_en" },
              { header: t("kpi.masterData.nameAr"), accessor: "name_ar" },
            ]}
            emptyMessage={t("kpi.masterData.noAwardCriteria")}
            canManage={canManage}
            onEdit={(item) => handleEdit("award-criterion", item)}
            onDelete={(id) => handleDelete("award-criterion", id)}
            onAdd={() => handleAdd("award-criterion")}
            onExport={() => exportToExcel(awardCriteria ?? [], "AwardCriteria")}
            onImport={() => handleImportExcel("award-criterion")}
          />
        )}
        {activeTab === "award-sub-criterion" && (
          <MasterTable<AwardSubCriterion>
            data={awardSubCriteria ?? []}
            columns={[
              {
                header: t("kpi.masterData.awardCriterion"),
                accessor: (r) =>
                  r.award_criterion?.name_en ?? r.award_criterion_id ?? "-",
              },
              { header: t("kpi.masterData.subNo"), accessor: "sub_no" },
              { header: t("kpi.masterData.nameEn"), accessor: "name_en" },
              { header: t("kpi.masterData.nameAr"), accessor: "name_ar" },
            ]}
            emptyMessage={t("kpi.masterData.noAwardSubCriteria")}
            canManage={canManage}
            onEdit={(item) => handleEdit("award-sub-criterion", item)}
            onDelete={(id) => handleDelete("award-sub-criterion", id)}
            onAdd={() => handleAdd("award-sub-criterion")}
            onExport={() =>
              exportToExcel(awardSubCriteria ?? [], "AwardSubCriteria")
            }
            onImport={() => handleImportExcel("award-sub-criterion")}
          />
        )}
        {activeTab === "data-source" && (
          <MasterTable<KpiDataSource>
            data={dataSources ?? []}
            columns={[
              { header: t("kpi.masterData.nameEn"), accessor: "name_en" },
              { header: t("kpi.masterData.nameAr"), accessor: "name_ar" },
              {
                header: t("kpi.masterData.active"),
                accessor: (r) =>
                  r.is_active ? t("common.yes") : t("common.no"),
              },
            ]}
            emptyMessage={t("kpi.masterData.noDataSources")}
            canManage={canManage}
            onEdit={(item) => handleEdit("data-source", item)}
            onDelete={(id) => handleDelete("data-source", id)}
            onAdd={() => handleAdd("data-source")}
            onExport={() => exportToExcel(dataSources ?? [], "DataSources")}
            onImport={() => handleImportExcel("data-source")}
          />
        )}
        {activeTab === "segmentation-dimension" && (
          <MasterTable<KpiSegmentationDimension>
            data={segmentationDimensions ?? []}
            columns={[
              { header: t("kpi.masterData.nameEn"), accessor: "name_en" },
              { header: t("kpi.masterData.nameAr"), accessor: "name_ar" },
              {
                header: t("kpi.masterData.active"),
                accessor: (r) =>
                  r.is_active ? t("common.yes") : t("common.no"),
              },
            ]}
            emptyMessage={t("kpi.masterData.noSegmentationDimensions")}
            canManage={canManage}
            onEdit={(item) => handleEdit("segmentation-dimension", item)}
            onDelete={(id) => handleDelete("segmentation-dimension", id)}
            onAdd={() => handleAdd("segmentation-dimension")}
            onExport={() =>
              exportToExcel(
                segmentationDimensions ?? [],
                "SegmentationDimensions",
              )
            }
            onImport={() => handleImportExcel("segmentation-dimension")}
          />
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={onFileChange}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="lg">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {modalTitle} {modalEntityLabel}
          </h2>

          <Input
            label={`${t("kpi.masterData.nameEn")} *`}
            value={form.name_en}
            onChange={set("name_en")}
          />
          <Input
            label={t("kpi.masterData.nameAr")}
            value={form.name_ar}
            onChange={set("name_ar")}
          />

          {(modalType === "pillar" || modalType === "enabler") && (
            <Select
              label={t("kpi.masterData.owner")}
              options={departmentOptions}
              value={form.owner_id}
              onChange={setSel("owner_id")}
              searchable
              placeholder={t("common.selectAnOption")}
            />
          )}

          {modalType === "operational-objective" && (
            <>
              <Select
                label={t("kpi.masterData.strategicGoal")}
                options={(goals ?? []).map((g: any) => ({
                  value: g.id,
                  label: g.title,
                }))}
                value={form.goal_id}
                onChange={setSel("goal_id")}
                searchable
                placeholder={t("common.selectAnOption")}
              />
              <Select
                label={t("kpi.masterData.pillar")}
                options={(pillars ?? []).map((p: Pillar) => ({
                  value: p.id,
                  label: p.name_en,
                }))}
                value={form.pillar_id}
                onChange={setSel("pillar_id")}
                searchable
                placeholder={t("common.selectAnOption")}
              />
              <Select
                label={t("kpi.masterData.enabler")}
                options={(enablers ?? []).map((e: Enabler) => ({
                  value: e.id,
                  label: e.name_en,
                }))}
                value={form.enabler_id}
                onChange={setSel("enabler_id")}
                searchable
                placeholder={t("common.selectAnOption")}
              />
            </>
          )}

          {modalType === "process" && (
            <>
              <Select
                label={t("kpi.masterData.operationalObjective")}
                options={(operationalObjectives ?? []).map(
                  (o: OperationalObjective) => ({
                    value: o.id,
                    label: o.name_en,
                  }),
                )}
                value={form.operational_objective_id}
                onChange={(v) => {
                  const selected = (operationalObjectives ?? []).find(
                    (o: OperationalObjective) => o.id === v,
                  );
                  setForm((prev) => ({
                    ...prev,
                    operational_objective_id: v,
                    goal_id: selected?.goal_id ?? selected?.goal?.id ?? "",
                  }));
                }}
                searchable
                placeholder={t("common.selectAnOption")}
              />
              <Input
                label={t("kpi.masterData.strategicGoal")}
                value={
                  (operationalObjectives ?? []).find(
                    (o: OperationalObjective) =>
                      o.id === form.operational_objective_id,
                  )?.goal?.title ?? ""
                }
                disabled
                placeholder="Select a Parent Objective first"
              />
              <Select
                label={t("kpi.masterData.pillar")}
                options={(pillars ?? []).map((p: Pillar) => ({
                  value: p.id,
                  label: p.name_en,
                }))}
                value={form.pillar_id}
                onChange={setSel("pillar_id")}
                searchable
                placeholder={t("common.selectAnOption")}
              />
              <Select
                label={t("kpi.masterData.enabler")}
                options={(enablers ?? []).map((e: Enabler) => ({
                  value: e.id,
                  label: e.name_en,
                }))}
                value={form.enabler_id}
                onChange={setSel("enabler_id")}
                searchable
                placeholder={t("common.selectAnOption")}
              />
            </>
          )}

          {modalType === "initiative" && (
            <>
              <Select
                label={t("kpi.masterData.strategicGoal")}
                options={(goals ?? []).map((g: any) => ({
                  value: g.id,
                  label: g.title,
                }))}
                value={form.goal_id}
                onChange={setSel("goal_id")}
                searchable
                placeholder={t("common.selectAnOption")}
              />
              <Select
                label="Parent Objective"
                options={(operationalObjectives ?? []).map(
                  (o: OperationalObjective) => ({
                    value: o.id,
                    label: o.name_en,
                  }),
                )}
                value={form.objective_id}
                onChange={setSel("objective_id")}
                searchable
                placeholder={t("common.selectAnOption")}
              />
              <Select
                label={t("kpi.masterData.pillar")}
                options={(pillars ?? []).map((p: Pillar) => ({
                  value: p.id,
                  label: p.name_en,
                }))}
                value={form.pillar_id}
                onChange={setSel("pillar_id")}
                searchable
                placeholder={t("common.selectAnOption")}
              />
              <Select
                label={t("kpi.masterData.enabler")}
                options={(enablers ?? []).map((e: Enabler) => ({
                  value: e.id,
                  label: e.name_en,
                }))}
                value={form.enabler_id}
                onChange={setSel("enabler_id")}
                searchable
                placeholder={t("common.selectAnOption")}
              />
              <Select
                label={t("kpi.masterData.owner")}
                options={userOptions}
                value={form.owner_id}
                onChange={setSel("owner_id")}
                searchable
                placeholder={t("common.selectAnOption")}
              />
              <Input
                label={t("kpi.masterData.status")}
                value={form.status}
                onChange={set("status")}
              />
            </>
          )}

          {modalType === "domain" && (
            <Select
              label={t("kpi.masterData.type")}
              options={[
                {
                  value: "strategy",
                  label: t("kpi.masterData.domainTypeStrategy"),
                },
                { value: "award", label: t("kpi.masterData.domainTypeAward") },
                {
                  value: "strategy_and_award",
                  label: t("kpi.masterData.domainTypeStrategyAndAward"),
                },
              ]}
              value={form.type}
              onChange={setSel("type")}
              placeholder={t("common.selectAnOption")}
            />
          )}

          {modalType === "award-criterion" && (
            <Input
              label={t("kpi.masterData.criterionNo")}
              value={form.criterion_no}
              onChange={set("criterion_no")}
              type="number"
            />
          )}

          {modalType === "award-sub-criterion" && (
            <>
              <Select
                label={t("kpi.masterData.awardCriterion")}
                options={(awardCriteria ?? []).map((c: AwardCriterion) => ({
                  value: c.id,
                  label: `${c.criterion_no} - ${c.name_en}`,
                }))}
                value={form.award_criterion_id}
                onChange={setSel("award_criterion_id")}
                searchable
                placeholder={t("common.selectAnOption")}
              />
              <Input
                label={t("kpi.masterData.subNo")}
                value={form.sub_no}
                onChange={set("sub_no")}
              />
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave}>
              {modalItem ? t("common.save") : t("common.create")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => string | number | boolean);
}

function MasterTable<T extends { id: string }>({
  data,
  columns,
  emptyMessage,
  canManage,
  onEdit,
  onDelete,
  onAdd,
  onExport,
  onImport,
  loading,
  error,
}: {
  data: T[];
  columns: Column<T>[];
  emptyMessage: string;
  canManage?: boolean;
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  onAdd?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  loading?: boolean;
  error?: string;
}) {
  const { t } = useTranslation();

  const getValue = (item: T, col: Column<T>) => {
    if (typeof col.accessor === "function") return String(col.accessor(item));
    return String(item[col.accessor] ?? "-");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Database className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {emptyMessage}
        </p>
        <div className="flex gap-2 mt-4">
          {canManage && onAdd && (
            <Button onClick={onAdd} size="sm">
              <Plus className="w-4 h-4 me-1" />
              {t("common.add")}
            </Button>
          )}
          {onImport && (
            <Button onClick={onImport} size="sm" variant="secondary">
              <Upload className="w-4 h-4 me-1" />
              {t("common.import")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {canManage && onAdd && (
        <div className="px-6 pt-4 pb-2 flex justify-end gap-2">
          {onExport && (
            <Button onClick={onExport} size="sm" variant="secondary">
              <Download className="w-4 h-4 me-1" />
              {t("common.export")}
            </Button>
          )}
          {onImport && (
            <Button onClick={onImport} size="sm" variant="secondary">
              <Upload className="w-4 h-4 me-1" />
              {t("common.import")}
            </Button>
          )}
          <Button onClick={onAdd} size="sm">
            <Plus className="w-4 h-4 me-1" />
            {t("common.add")}
          </Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className="px-6 py-3 ltr:text-left rtl:text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  {col.header}
                </th>
              ))}
              {canManage && (
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("common.actions")}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={item.id}
                className="border-b border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                {columns.map((col, i) => (
                  <td
                    key={i}
                    className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300"
                  >
                    {getValue(item, col)}
                  </td>
                ))}
                {canManage && (
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => {
                            if (window.confirm(t("common.confirmDelete")))
                              onDelete(item.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
