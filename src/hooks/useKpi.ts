import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  kpiMasterDataApi,
  kpiDictionaryApi,
  kpiPerformanceApi,
  kpiDashboardApi,
} from "../api/kpi";
import type {
  PillarRequest,
  StrategicGoalRequest,
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

export const useStrategicGoals = () =>
  useQuery({
    queryKey: ["kpi", "strategic-goals"],
    queryFn: async () => {
      const res = await kpiMasterDataApi.listGoals();
      return res.data ?? [];
    },
  });

export const useCreateStrategicGoal = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (data: StrategicGoalRequest) =>
      kpiMasterDataApi.createGoal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "strategic-goals"] });
      toast.success(t("kpi.goalCreated"));
    },
    onError: () => toast.error(t("kpi.goalCreateFailed")),
  });
};

export const useUpdateStrategicGoal = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<StrategicGoalRequest>;
    }) => kpiMasterDataApi.updateGoal(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "strategic-goals"] });
      toast.success(t("kpi.goalUpdated"));
    },
    onError: () => toast.error(t("kpi.goalUpdateFailed")),
  });
};

export const useDeleteStrategicGoal = () => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => kpiMasterDataApi.deleteGoal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpi", "strategic-goals"] });
      toast.success(t("kpi.goalDeleted"));
    },
    onError: () => toast.error(t("kpi.goalDeleteFailed")),
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

export const useStrategicKPIs = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  strategic_goal_id?: string;
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

export const useKpiTargets = (params?: { kpi_code?: string; year?: number }) =>
  useQuery({
    queryKey: ["kpi", "targets", params],
    queryFn: async () => {
      const res = await kpiPerformanceApi.listTargets(params);
      return res.data ?? [];
    },
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

export const useKpiDashboard = () =>
  useQuery({
    queryKey: ["kpi", "dashboard"],
    queryFn: async () => {
      const res = await kpiDashboardApi.getDashboard();
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
