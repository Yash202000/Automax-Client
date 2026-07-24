import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  kpiMasterDataApi,
  kpiDictionaryApi,
  kpiPerformanceApi,
  kpiPerformanceBandApi,
  kpiCorrectiveActionApi,
  kpiDashboardApi,
  kpiEngagementApi,
} from "../api/kpi";
import apiClient from "../api/client";
import type {
  PillarRequest,
  StrategicKPIRequest,
  KpiAnnualTargetRequest,
  KpiPerformanceRequest,
  OperationalObjectiveRequest,
  ProcessRequest,
  InitiativeRequest,
  DomainRequest,
  AwardCriterionRequest,
  AwardSubCriterionRequest,
  OperationalKPIRequest,
  AwardKPIRequest,
  KpiMetricRequest,
  KpiEngagementEvidenceRequest,
  KpiCollaboratorAddRequest,
  KpiCheckInRequest,
  KpiEntryRequest,
  KpiCollaboratorAssignmentRequest,
} from "../types/kpi";

function getApiError(err: any): string {
  const data = err?.response?.data;
  if (data?.error) return data.error;
  if (data?.errors) {
    const msgs = Object.values(data.errors);
    return msgs.join("; ");
  }
  return err?.message || "An error occurred";
}

export const usePillars = () =>
  useQuery({
    queryKey: ["kpi", "pillars"],
    queryFn: async () => {
      const res = await kpiMasterDataApi.listPillars();
      return res.data ?? [];
    },
  });

export const useCreatePillar = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: PillarRequest) => kpiMasterDataApi.createPillar(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "pillars"] });
      toast.success(t("kpi.pillarCreated"));
    },
    onError: () => toast.error(t("kpi.pillarCreateFailed")),
  });
};

export const useUpdatePillar = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PillarRequest> }) =>
      kpiMasterDataApi.updatePillar(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "pillars"] });
      toast.success(t("kpi.pillarUpdated"));
    },
    onError: () => toast.error(t("kpi.pillarUpdateFailed")),
  });
};

export const useDeletePillar = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => kpiMasterDataApi.deletePillar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "pillars"] });
      toast.success(t("kpi.pillarDeleted"));
    },
    onError: () => toast.error(t("kpi.pillarDeleteFailed")),
  });
};

export const useEnablers = () =>
  useQuery({
    queryKey: ["kpi", "enablers"],
    queryFn: async () => {
      const res = await kpiMasterDataApi.listEnablers();
      return res.data ?? [];
    },
  });

export const useCreateEnabler = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: any) => kpiMasterDataApi.createEnabler(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "enablers"] });
      toast.success(t("kpi.enablerCreated"));
    },
    onError: () => toast.error(t("kpi.enablerCreateFailed")),
  });
};

export const useUpdateEnabler = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      kpiMasterDataApi.updateEnabler(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "enablers"] });
      toast.success(t("kpi.enablerUpdated"));
    },
    onError: () => toast.error(t("kpi.enablerUpdateFailed")),
  });
};

export const useDeleteEnabler = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => kpiMasterDataApi.deleteEnabler(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "enablers"] });
      toast.success(t("kpi.enablerDeleted"));
    },
    onError: () => toast.error(t("kpi.enablerDeleteFailed")),
  });
};

// ─── Operational Objectives ──────────────────────────────────────────────────

export const useOperationalObjectives = () =>
  useQuery({
    queryKey: ["kpi", "operational-objectives"],
    queryFn: async () => {
      const res = await kpiMasterDataApi.listOperationalObjectives();
      return res.data ?? [];
    },
  });

export const useCreateOperationalObjective = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: OperationalObjectiveRequest) =>
      kpiMasterDataApi.createOperationalObjective(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "operational-objectives"] });
      toast.success(t("kpi.operationalObjectiveCreated"));
    },
    onError: () => toast.error(t("kpi.operationalObjectiveCreateFailed")),
  });
};

export const useUpdateOperationalObjective = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<OperationalObjectiveRequest>;
    }) => kpiMasterDataApi.updateOperationalObjective(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "operational-objectives"] });
      toast.success(t("kpi.operationalObjectiveUpdated"));
    },
    onError: () => toast.error(t("kpi.operationalObjectiveUpdateFailed")),
  });
};

export const useDeleteOperationalObjective = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => kpiMasterDataApi.deleteOperationalObjective(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "operational-objectives"] });
      toast.success(t("kpi.operationalObjectiveDeleted"));
    },
    onError: () => toast.error(t("kpi.operationalObjectiveDeleteFailed")),
  });
};

// ─── Processes ────────────────────────────────────────────────────────────────

export const useProcesses = () =>
  useQuery({
    queryKey: ["kpi", "processes"],
    queryFn: async () => {
      const res = await kpiMasterDataApi.listProcesses();
      return res.data ?? [];
    },
  });

export const useCreateProcess = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: ProcessRequest) => kpiMasterDataApi.createProcess(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "processes"] });
      toast.success(t("kpi.processCreated"));
    },
    onError: () => toast.error(t("kpi.processCreateFailed")),
  });
};

export const useUpdateProcess = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProcessRequest> }) =>
      kpiMasterDataApi.updateProcess(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "processes"] });
      toast.success(t("kpi.processUpdated"));
    },
    onError: () => toast.error(t("kpi.processUpdateFailed")),
  });
};

export const useDeleteProcess = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => kpiMasterDataApi.deleteProcess(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "processes"] });
      toast.success(t("kpi.processDeleted"));
    },
    onError: () => toast.error(t("kpi.processDeleteFailed")),
  });
};

// ─── Initiatives ──────────────────────────────────────────────────────────────

export const useInitiatives = () =>
  useQuery({
    queryKey: ["kpi", "initiatives"],
    queryFn: async () => {
      const res = await kpiMasterDataApi.listInitiatives();
      return res.data ?? [];
    },
  });

export const useCreateInitiative = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: InitiativeRequest) =>
      kpiMasterDataApi.createInitiative(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "initiatives"] });
      toast.success(t("kpi.initiativeCreated"));
    },
    onError: () => toast.error(t("kpi.initiativeCreateFailed")),
  });
};

export const useUpdateInitiative = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<InitiativeRequest>;
    }) => kpiMasterDataApi.updateInitiative(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "initiatives"] });
      toast.success(t("kpi.initiativeUpdated"));
    },
    onError: () => toast.error(t("kpi.initiativeUpdateFailed")),
  });
};

export const useDeleteInitiative = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => kpiMasterDataApi.deleteInitiative(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "initiatives"] });
      toast.success(t("kpi.initiativeDeleted"));
    },
    onError: () => toast.error(t("kpi.initiativeDeleteFailed")),
  });
};

// ─── Domains ──────────────────────────────────────────────────────────────────

export const useDomains = () =>
  useQuery({
    queryKey: ["kpi", "domains"],
    queryFn: async () => {
      const res = await kpiMasterDataApi.listDomains();
      return res.data ?? [];
    },
  });

export const useCreateDomain = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: DomainRequest) => kpiMasterDataApi.createDomain(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "domains"] });
      toast.success(t("kpi.domainCreated"));
    },
    onError: () => toast.error(t("kpi.domainCreateFailed")),
  });
};

export const useUpdateDomain = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DomainRequest> }) =>
      kpiMasterDataApi.updateDomain(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "domains"] });
      toast.success(t("kpi.domainUpdated"));
    },
    onError: () => toast.error(t("kpi.domainUpdateFailed")),
  });
};

export const useDeleteDomain = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => kpiMasterDataApi.deleteDomain(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "domains"] });
      toast.success(t("kpi.domainDeleted"));
    },
    onError: () => toast.error(t("kpi.domainDeleteFailed")),
  });
};

// ─── Award Criteria ───────────────────────────────────────────────────────────

export const useAwardCriteria = () =>
  useQuery({
    queryKey: ["kpi", "award-criteria"],
    queryFn: async () => {
      const res = await kpiMasterDataApi.listAwardCriteria();
      return res.data ?? [];
    },
  });

export const useCreateAwardCriterion = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: AwardCriterionRequest) =>
      kpiMasterDataApi.createAwardCriterion(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "award-criteria"] });
      toast.success(t("kpi.awardCriterionCreated"));
    },
    onError: () => toast.error(t("kpi.awardCriterionCreateFailed")),
  });
};

export const useUpdateAwardCriterion = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<AwardCriterionRequest>;
    }) => kpiMasterDataApi.updateAwardCriterion(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "award-criteria"] });
      toast.success(t("kpi.awardCriterionUpdated"));
    },
    onError: () => toast.error(t("kpi.awardCriterionUpdateFailed")),
  });
};

export const useDeleteAwardCriterion = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => kpiMasterDataApi.deleteAwardCriterion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "award-criteria"] });
      toast.success(t("kpi.awardCriterionDeleted"));
    },
    onError: () => toast.error(t("kpi.awardCriterionDeleteFailed")),
  });
};

// ─── Award Sub Criteria ───────────────────────────────────────────────────────

export const useAwardSubCriteria = (criterionId?: string) =>
  useQuery({
    queryKey: ["kpi", "award-sub-criteria", criterionId],
    queryFn: async () => {
      const res = await kpiMasterDataApi.listAwardSubCriteria(criterionId);
      return res.data ?? [];
    },
  });

export const useCreateAwardSubCriterion = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: AwardSubCriterionRequest) =>
      kpiMasterDataApi.createAwardSubCriterion(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "award-sub-criteria"] });
      toast.success(t("kpi.awardSubCriterionCreated"));
    },
    onError: () => toast.error(t("kpi.awardSubCriterionCreateFailed")),
  });
};

export const useUpdateAwardSubCriterion = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<AwardSubCriterionRequest>;
    }) => kpiMasterDataApi.updateAwardSubCriterion(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "award-sub-criteria"] });
      toast.success(t("kpi.awardSubCriterionUpdated"));
    },
    onError: () => toast.error(t("kpi.awardSubCriterionUpdateFailed")),
  });
};

export const useDeleteAwardSubCriterion = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => kpiMasterDataApi.deleteAwardSubCriterion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "award-sub-criteria"] });
      toast.success(t("kpi.awardSubCriterionDeleted"));
    },
    onError: () => toast.error(t("kpi.awardSubCriterionDeleteFailed")),
  });
};

export const useDataSources = () =>
  useQuery({
    queryKey: ["kpi", "data-sources"],
    queryFn: async () => {
      const res = await kpiMasterDataApi.listDataSources();
      return res.data ?? [];
    },
  });

export const useCreateDataSource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => kpiMasterDataApi.createDataSource(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "data-sources"] });
      toast.success("Data source saved");
    },
    onError: () => toast.error("Failed to save data source"),
  });
};

export const useUpdateDataSource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      kpiMasterDataApi.updateDataSource(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "data-sources"] });
      toast.success("Data source updated");
    },
    onError: () => toast.error("Failed to update data source"),
  });
};

export const useDeleteDataSource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => kpiMasterDataApi.deleteDataSource(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "data-sources"] });
      toast.success("Data source deleted");
    },
    onError: () => toast.error("Failed to delete data source"),
  });
};

export const useSegmentationDimensions = () =>
  useQuery({
    queryKey: ["kpi", "segmentation-dimensions"],
    queryFn: async () => {
      const res = await kpiMasterDataApi.listSegmentationDimensions();
      return res.data ?? [];
    },
  });

export const useCreateSegmentationDimension = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      kpiMasterDataApi.createSegmentationDimension(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "segmentation-dimensions"] });
      toast.success("Segmentation dimension saved");
    },
    onError: () => toast.error("Failed to save segmentation dimension"),
  });
};

export const useUpdateSegmentationDimension = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      kpiMasterDataApi.updateSegmentationDimension(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "segmentation-dimensions"] });
      toast.success("Segmentation dimension updated");
    },
    onError: () => toast.error("Failed to update segmentation dimension"),
  });
};

export const useDeleteSegmentationDimension = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      kpiMasterDataApi.deleteSegmentationDimension(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "segmentation-dimensions"] });
      toast.success("Segmentation dimension deleted");
    },
    onError: () => toast.error("Failed to delete segmentation dimension"),
  });
};

export const useStrategicKPIs = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  goal_id?: string;
}) =>
  useQuery({
    queryKey: ["kpi", "strategic", params],
    queryFn: () => kpiDictionaryApi.listStrategic(params),
  });

export const useStrategicKPIDetail = (id: string) =>
  useQuery({
    queryKey: ["kpi", "strategic", id],
    queryFn: () => kpiDictionaryApi.getStrategic(id),
    enabled: !!id,
  });

export const useOperationalKPIDetail = (id: string) =>
  useQuery({
    queryKey: ["kpi", "operational", id],
    queryFn: () => kpiDictionaryApi.getOperational(id),
    enabled: !!id,
  });

export const useAwardKPIDetail = (id: string) =>
  useQuery({
    queryKey: ["kpi", "award", id],
    queryFn: () => kpiDictionaryApi.getAward(id),
    enabled: !!id,
  });

export const useCreateStrategicKPI = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: StrategicKPIRequest) =>
      kpiDictionaryApi.createStrategic(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "strategic"] });
      toast.success(t("kpi.kpiCreated"));
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useUpdateStrategicKPI = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<StrategicKPIRequest>;
    }) => kpiDictionaryApi.updateStrategic(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "strategic"] });
      toast.success(t("kpi.kpiUpdated"));
    },
    onError: () => toast.error(t("kpi.kpiUpdateFailed")),
  });
};

export const useDeleteStrategicKPI = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => kpiDictionaryApi.deleteStrategic(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "strategic"] });
      toast.success(t("kpi.kpiDeleted"));
    },
    onError: () => toast.error(t("kpi.kpiDeleteFailed")),
  });
};

export const useOperationalKPIs = (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) =>
  useQuery({
    queryKey: ["kpi", "operational", params],
    queryFn: () => kpiDictionaryApi.listOperational(params),
  });

export const useAwardKPIs = (params?: { page?: number; limit?: number }) =>
  useQuery({
    queryKey: ["kpi", "award", params],
    queryFn: () => kpiDictionaryApi.listAward(params),
  });

export const useCreateOperationalKPI = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OperationalKPIRequest) =>
      kpiDictionaryApi.createOperational(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "operational"] });
      toast.success("Operational KPI created");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useUpdateOperationalKPI = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<OperationalKPIRequest>;
    }) => kpiDictionaryApi.updateOperational(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "operational"] });
      toast.success("Operational KPI updated");
    },
    onError: () => toast.error("Failed to update Operational KPI"),
  });
};

export const useDeleteOperationalKPI = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => kpiDictionaryApi.deleteOperational(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "operational"] });
      toast.success("Operational KPI deleted");
    },
    onError: () => toast.error("Failed to delete Operational KPI"),
  });
};

export const useCreateAwardKPI = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AwardKPIRequest) => kpiDictionaryApi.createAward(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "award"] });
      toast.success("Award KPI created");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useUpdateAwardKPI = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<AwardKPIRequest>;
    }) => kpiDictionaryApi.updateAward(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "award"] });
      toast.success("Award KPI updated");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useDeleteAwardKPI = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => kpiDictionaryApi.deleteAward(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "award"] });
      toast.success("Award KPI deleted");
    },
    onError: () => toast.error("Failed to delete Award KPI"),
  });
};

export const useKpiTargets = (params?: {
  kpi_code?: string;
  year?: number;
  metric_id?: string;
  period_code?: string;
  target_status?: string;
}) =>
  useQuery({
    queryKey: ["kpi", "targets", params],
    queryFn: async () => {
      const res = await kpiPerformanceApi.listTargets(params);
      return res.data ?? [];
    },
    enabled: true,
  });

export const useSetKpiTarget = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: KpiAnnualTargetRequest) =>
      kpiPerformanceApi.setTarget(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "targets"] });
      toast.success(t("kpi.targetSet"));
    },
    onError: () => toast.error(t("kpi.targetSetFailed")),
  });
};

export const useKpiMetricsByCode = (kpiCode?: string) =>
  useQuery({
    queryKey: ["kpi", "metrics-by-code", kpiCode],
    queryFn: async () => {
      if (!kpiCode) return [];
      const res = await apiClient.get(`/kpi/metrics-by-code/${kpiCode}`);
      return (res.data as any)?.data ?? [];
    },
    enabled: !!kpiCode,
  });

export const useDeleteKpiTarget = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => kpiPerformanceApi.deleteTarget(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "targets"] });
      toast.success(t("kpi.targetDeleted"));
    },
    onError: () => toast.error(t("kpi.targetDeleteFailed")),
  });
};

export const useKpiPerformances = (params?: {
  kpi_code?: string;
  year?: number;
  quarter?: number;
  status?: string;
  page?: number;
  limit?: number;
}) =>
  useQuery({
    queryKey: ["kpi", "performance", params],
    queryFn: () => kpiPerformanceApi.listPerformance(params),
  });

export const useKpiPerformance = (id: string) =>
  useQuery({
    queryKey: ["kpi", "performance", id],
    queryFn: () => kpiPerformanceApi.getPerformance(id),
    enabled: !!id,
  });

export const useKpiAvailableTransitions = (id: string) =>
  useQuery({
    queryKey: ["kpi", "performance", id, "transitions"],
    queryFn: () => kpiPerformanceApi.getAvailableTransitions(id),
    enabled: !!id,
  });

export const useKpiPerformanceHistory = (id: string) =>
  useQuery({
    queryKey: ["kpi", "performance", id, "history"],
    queryFn: () => kpiPerformanceApi.getPerformanceHistory(id),
    enabled: !!id,
  });

export const useSubmitPerformance = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: KpiPerformanceRequest) =>
      kpiPerformanceApi.submitPerformance(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "performance"] });
      toast.success(t("kpi.performanceSubmitted"));
    },
    onError: () => toast.error(t("kpi.performanceSubmitFailed")),
  });
};

export const useUpdatePerformance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      kpiPerformanceApi.updatePerformance(id, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ["kpi", "performance"] });
      qc.invalidateQueries({ queryKey: ["kpi", "performance", id] });
      toast.success("Performance entry updated");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useDeletePerformance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => kpiPerformanceApi.deletePerformance(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "performance"] });
      toast.success("Performance entry deleted");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const usePerformanceEvidence = (performanceId?: string) =>
  useQuery({
    queryKey: ["kpi", "performance", performanceId, "evidence"],
    queryFn: async () => {
      const res = await kpiPerformanceApi.listPerformanceEvidence(
        performanceId!,
      );
      return res.data ?? [];
    },
    enabled: !!performanceId,
  });

export const useCreatePerformanceEvidence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      kpiPerformanceApi.createPerformanceEvidence(id, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({
        queryKey: ["kpi", "performance", id, "evidence"],
      });
      toast.success("Evidence added");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useDeletePerformanceEvidence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, evidenceId }: { id: string; evidenceId: string }) =>
      kpiPerformanceApi.deletePerformanceEvidence(id, evidenceId),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({
        queryKey: ["kpi", "performance", id, "evidence"],
      });
      toast.success("Evidence removed");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useTransitionPerformance = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({
      id,
      transitionId,
      comment,
    }: {
      id: string;
      transitionId: string;
      comment?: string;
    }) => kpiPerformanceApi.transitionPerformance(id, transitionId, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "performance"] });
      toast.success(t("kpi.performanceTransitioned"));
    },
    onError: () => toast.error(t("kpi.performanceTransitionFailed")),
  });
};

export const useKpiStatusTransition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      type,
      id,
      action,
      comment,
    }: {
      type: string;
      id: string;
      action: string;
      comment?: string;
    }) => kpiDictionaryApi.transitionKpiStatus(type, id, { action, comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi"] });
      toast.success("KPI status updated");
    },
    onError: () => toast.error("Failed to update KPI status"),
  });
};

export const useKpiBenchmarks = (params?: {
  kpi_code?: string;
  zone?: string;
  department_id?: string;
  year?: number;
}) =>
  useQuery({
    queryKey: ["kpi", "benchmarks", params],
    queryFn: async () => {
      const res = await kpiPerformanceApi.listBenchmarks(params);
      return res.data ?? [];
    },
  });

export const useCreateKpiBenchmark = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => kpiPerformanceApi.createBenchmark(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "benchmarks"] });
      toast.success("Benchmark created");
    },
    onError: () => toast.error("Failed to create benchmark"),
  });
};

export const useDeleteKpiBenchmark = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => kpiPerformanceApi.deleteBenchmark(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "benchmarks"] });
      toast.success("Benchmark deleted");
    },
    onError: () => toast.error("Failed to delete benchmark"),
  });
};

export const useKpiSegmentations = (params?: {
  kpi_code?: string;
  year?: number;
  quarter?: number;
  dimension?: string;
  department_id?: string;
  zone?: string;
}) =>
  useQuery({
    queryKey: ["kpi", "segmentation", params],
    queryFn: async () => {
      const res = await kpiPerformanceApi.listSegmentation(params);
      return res.data ?? [];
    },
  });

export const useCreateKpiSegmentation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => kpiPerformanceApi.createSegmentation(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "segmentation"] });
      toast.success("Segmentation created");
    },
    onError: () => toast.error("Failed to create segmentation"),
  });
};

export const useDeleteKpiSegmentation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => kpiPerformanceApi.deleteSegmentation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "segmentation"] });
      toast.success("Segmentation deleted");
    },
    onError: () => toast.error("Failed to delete segmentation"),
  });
};

export const usePerformanceBands = () =>
  useQuery({
    queryKey: ["kpi", "performance-bands"],
    queryFn: async () => {
      const res = await kpiPerformanceBandApi.listBands();
      return res.data ?? [];
    },
  });

export const useEffectivePerformanceBand = (kpiCode?: string) =>
  useQuery({
    queryKey: ["kpi", "performance-bands", "effective", kpiCode],
    queryFn: async () => {
      const res = await kpiPerformanceBandApi.getEffectiveBand(kpiCode);
      return res.data ?? { green_min: 80, amber_min: 60 };
    },
  });

export const useUpsertPerformanceBand = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => kpiPerformanceBandApi.upsertBand(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "performance-bands"] });
      toast.success("Performance band saved");
    },
    onError: () => toast.error("Failed to save performance band"),
  });
};

export const useDeletePerformanceBand = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => kpiPerformanceBandApi.deleteBand(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "performance-bands"] });
      toast.success("Performance band deleted");
    },
    onError: () => toast.error("Failed to delete performance band"),
  });
};

export const useCorrectiveActions = (performanceId?: string) =>
  useQuery({
    queryKey: ["kpi", "corrective-actions", performanceId],
    queryFn: async () => {
      const res = await kpiCorrectiveActionApi.listByPerformance(
        performanceId!,
      );
      return res.data ?? [];
    },
    enabled: !!performanceId,
  });

export const useCreateCorrectiveAction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => kpiCorrectiveActionApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "corrective-actions"] });
      toast.success("Corrective action created");
    },
    onError: () => toast.error("Failed to create corrective action"),
  });
};

export const useUpdateCorrectiveActionStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      kpiCorrectiveActionApi.updateStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "corrective-actions"] });
      toast.success("Corrective action updated");
    },
    onError: () => toast.error("Failed to update corrective action"),
  });
};

export const useKpiDashboard = (params?: {
  kpi_type?: string;
  year?: number;
  quarter?: number;
}) =>
  useQuery({
    queryKey: ["kpi", "dashboard", params],
    queryFn: async () => {
      const res = await kpiDashboardApi.getDashboard(params);
      return res.data;
    },
  });

export const useKpiDashboardTrends = (params?: {
  kpi_code?: string;
  year?: number;
}) =>
  useQuery({
    queryKey: ["kpi", "dashboard", "trends", params],
    queryFn: async () => {
      const res = await kpiDashboardApi.getTrends(params);
      return res.data ?? [];
    },
  });

export const useKpiCardDefinitions = (params?: {
  type?: string;
  search?: string;
}) =>
  useQuery({
    queryKey: ["kpi", "dashboard", "cards", params],
    queryFn: async () => {
      const res = await kpiDashboardApi.getKpiCardDefinitions(params);
      return res.data ?? [];
    },
  });

export const useKpiBenchmarkSummary = () =>
  useQuery({
    queryKey: ["kpi", "benchmarks", "summary"],
    queryFn: async () => {
      const res = await kpiPerformanceApi.listBenchmarkSummary();
      return res.data ?? [];
    },
  });

export const useKpiSegmentationSummary = () =>
  useQuery({
    queryKey: ["kpi", "segmentation", "summary"],
    queryFn: async () => {
      const res = await kpiPerformanceApi.listSegmentationSummary();
      return res.data ?? [];
    },
  });

// ─── KPI Engagement: Metrics ──────────────────────────────────────────────

export const useKpiMetrics = (type: string, id: string) =>
  useQuery({
    queryKey: ["kpi", "engagement", type, id, "metrics"],
    queryFn: async () => {
      const res = await kpiEngagementApi.listMetrics(type, id);
      return res.data ?? [];
    },
    enabled: !!type && !!id,
  });

export const useCreateKpiMetric = (type: string, id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: KpiMetricRequest) =>
      kpiEngagementApi.createMetric(type, id, data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "metrics"],
      });
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "activity"],
      });
      toast.success("Metric added");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useUploadKpiAttachment = (type: string, id: string) => {
  return useMutation({
    mutationFn: (file: File) =>
      kpiEngagementApi.uploadAttachment(type, id, file),
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useUpdateKpiMetric = (type: string, id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      metricId,
      data,
    }: {
      metricId: string;
      data: KpiMetricRequest;
    }) => kpiEngagementApi.updateMetric(metricId, data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "metrics"],
      });
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "activity"],
      });
      toast.success("Metric updated");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useUpdateKpiMetricValue = (type: string, id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ metricId, value }: { metricId: string; value: number }) =>
      kpiEngagementApi.updateMetricValue(metricId, value),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "metrics"],
      });
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "activity"],
      });
      toast.success("Value updated");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useDeleteKpiMetric = (type: string, id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (metricId: string) => kpiEngagementApi.deleteMetric(metricId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "metrics"],
      });
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "activity"],
      });
      toast.success("Metric deleted");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

// ─── KPI Engagement: Evidence ─────────────────────────────────────────────

export const useKpiEngagementEvidence = (type: string, id: string) =>
  useQuery({
    queryKey: ["kpi", "engagement", type, id, "evidence"],
    queryFn: async () => {
      const res = await kpiEngagementApi.listEvidence(type, id);
      return res.data ?? [];
    },
    enabled: !!type && !!id,
  });

export const useCreateKpiEvidence = (type: string, id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: KpiEngagementEvidenceRequest) =>
      kpiEngagementApi.createEvidence(type, id, data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "evidence"],
      });
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "activity"],
      });
      toast.success("Evidence added");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useDeleteKpiEvidence = (type: string, id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (evidenceId: string) =>
      kpiEngagementApi.deleteEvidence(evidenceId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "evidence"],
      });
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "activity"],
      });
      toast.success("Evidence deleted");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useDownloadKpiEvidence = () => {
  return useMutation({
    mutationFn: ({
      evidenceId,
      fileName,
    }: {
      evidenceId: string;
      fileName: string;
    }) => kpiEngagementApi.downloadEvidence(evidenceId, fileName),
    onError: (err) => toast.error(getApiError(err)),
  });
};

// ─── KPI Engagement: Collaborators ────────────────────────────────────────

export const useKpiCollaborators = (type: string, id: string) =>
  useQuery({
    queryKey: ["kpi", "engagement", type, id, "collaborators"],
    queryFn: async () => {
      const res = await kpiEngagementApi.listCollaborators(type, id);
      return res.data ?? [];
    },
    enabled: !!type && !!id,
  });

export const useAddKpiCollaborator = (type: string, id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: KpiCollaboratorAddRequest) =>
      kpiEngagementApi.addCollaborator(type, id, data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "collaborators"],
      });
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "activity"],
      });
      toast.success("Collaborator added");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useRemoveKpiCollaborator = (type: string, id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      kpiEngagementApi.removeCollaborator(type, id, userId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "collaborators"],
      });
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "activity"],
      });
      toast.success("Collaborator removed");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

// ─── KPI Engagement: Check-ins ────────────────────────────────────────────

export const useKpiCheckIns = (
  type: string,
  id: string,
  page = 1,
  limit = 10,
) =>
  useQuery({
    queryKey: ["kpi", "engagement", type, id, "check-ins", page, limit],
    queryFn: () => kpiEngagementApi.listCheckIns(type, id, page, limit),
    enabled: !!type && !!id,
  });

export const useCreateKpiCheckIn = (type: string, id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: KpiCheckInRequest) =>
      kpiEngagementApi.createCheckIn(type, id, data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "check-ins"],
      });
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "activity"],
      });
      toast.success("Check-in added");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useDeleteKpiCheckIn = (type: string, id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (checkInId: string) =>
      kpiEngagementApi.deleteCheckIn(checkInId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "check-ins"],
      });
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "activity"],
      });
      toast.success("Check-in deleted");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

// ─── KPI Engagement: Comments ─────────────────────────────────────────────

export const useKpiComments = (
  type: string,
  id: string,
  page = 1,
  limit = 20,
) =>
  useQuery({
    queryKey: ["kpi", "engagement", type, id, "comments", page, limit],
    queryFn: () => kpiEngagementApi.listComments(type, id, page, limit),
    enabled: !!type && !!id,
  });

export const useAddKpiComment = (type: string, id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      kpiEngagementApi.addComment(type, id, content),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "comments"],
      });
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "activity"],
      });
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useDeleteKpiComment = (type: string, id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      kpiEngagementApi.deleteComment(commentId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "comments"],
      });
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "activity"],
      });
      toast.success("Comment deleted");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

// ─── KPI Engagement: Activity ─────────────────────────────────────────────

export const useKpiActivity = (
  type: string,
  id: string,
  page = 1,
  limit = 20,
) =>
  useQuery({
    queryKey: ["kpi", "engagement", type, id, "activity", page, limit],
    queryFn: () => kpiEngagementApi.listActivity(type, id, page, limit),
    enabled: !!type && !!id,
  });

// ─── KPI Engagement: Entries ─────────────────────────────────────────────

export const useKpiEntries = (type: string, id: string, metricId?: string) =>
  useQuery({
    queryKey: ["kpi", "engagement", type, id, "entries", metricId],
    queryFn: async () => {
      const res = await kpiEngagementApi.listEntries(type, id, metricId);
      return res.data ?? [];
    },
    enabled: !!type && !!id,
  });

export const useKpiAllEntries = (params?: {
  kpi_code?: string;
  metric_name?: string;
  reporting_year?: number;
  period_code?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) =>
  useQuery({
    queryKey: ["kpi", "entries", "all", params],
    queryFn: async () => {
      const res = await kpiEngagementApi.listAllEntries(params);
      return res;
    },
  });

export const useCreateKpiEntry = (type: string, id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: KpiEntryRequest) =>
      kpiEngagementApi.createEntry(type, id, data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "entries"],
      });
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "activity"],
      });
      toast.success("Entry added");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

// ── Collaborator Assignment Hooks ─────────────────────────────────────────

export const useKpiCollaboratorAssignments = (
  type: string,
  id: string,
  params?: { active?: string; collaborator_type?: string },
) =>
  useQuery({
    queryKey: ["kpi", "collaborator-assignments", type, id, params],
    queryFn: async () => {
      const res = await kpiEngagementApi.listCollaboratorAssignments(
        type,
        id,
        params,
      );
      return res.data ?? [];
    },
    enabled: !!type && !!id,
  });

export const useCreateKpiCollaboratorAssignment = (
  type: string,
  id: string,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: KpiCollaboratorAssignmentRequest) =>
      kpiEngagementApi.createCollaboratorAssignment(type, id, data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "collaborator-assignments", type, id],
      });
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "activity"],
      });
      toast.success("Collaborator assigned");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useUpdateKpiCollaboratorAssignment = (
  type: string,
  id: string,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      data,
    }: {
      assignmentId: string;
      data: KpiCollaboratorAssignmentRequest;
    }) => kpiEngagementApi.updateCollaboratorAssignment(assignmentId, data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "collaborator-assignments", type, id],
      });
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "activity"],
      });
      toast.success("Collaborator assignment updated");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useDeleteKpiCollaboratorAssignment = (
  type: string,
  id: string,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) =>
      kpiEngagementApi.deleteCollaboratorAssignment(assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["kpi", "collaborator-assignments", type, id],
      });
      qc.invalidateQueries({
        queryKey: ["kpi", "engagement", type, id, "activity"],
      });
      toast.success("Collaborator assignment removed");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
};

export const useKpiCollaboratorPermissionMatrix = () =>
  useQuery({
    queryKey: ["kpi", "collaborator-permission-matrix"],
    queryFn: async () => {
      const res = await kpiEngagementApi.getCollaboratorPermissionMatrix();
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
