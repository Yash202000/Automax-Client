import apiClient from "./client";
import type { ApiResponse } from "../types";
import type {
  Pillar,
  PillarRequest,
  Enabler,
  EnablerRequest,
  StrategicGoal,
  StrategicGoalRequest,
  OperationalObjective,
  OperationalObjectiveRequest,
  Process,
  ProcessRequest,
  Initiative,
  InitiativeRequest,
  Domain,
  DomainRequest,
  AwardCriterion,
  AwardCriterionRequest,
  AwardSubCriterion,
  AwardSubCriterionRequest,
  StrategicKPI,
  StrategicKPIRequest,
  OperationalKPI,
  OperationalKPIRequest,
  AwardKPI,
  AwardKPIRequest,
  KpiAnnualTarget,
  KpiAnnualTargetRequest,
  KpiPerformance,
  KpiPerformanceRequest,
  KpiBenchmark,
  KpiBenchmarkRequest,
  KpiSegmentation,
  KpiSegmentationRequest,
  EnhancedKpiDashboardData,
  PerformanceTrend,
  KpiCardDef,
  PaginatedResponse,
  WorkflowTransitionBrief,
  KpiWorkflowAction,
} from "../types/kpi";

export const kpiMasterDataApi = {
  listPillars: async (): Promise<ApiResponse<Pillar[]>> => {
    const res = await apiClient.get("/kpi/pillars");
    return res.data;
  },
  createPillar: async (data: PillarRequest): Promise<ApiResponse<Pillar>> => {
    const res = await apiClient.post("/kpi/pillars", data);
    return res.data;
  },
  updatePillar: async (
    id: string,
    data: Partial<PillarRequest>,
  ): Promise<ApiResponse<Pillar>> => {
    const res = await apiClient.put(`/kpi/pillars/${id}`, data);
    return res.data;
  },
  deletePillar: async (id: string): Promise<ApiResponse<void>> => {
    const res = await apiClient.delete(`/kpi/pillars/${id}`);
    return res.data;
  },

  listEnablers: async (): Promise<ApiResponse<Enabler[]>> => {
    const res = await apiClient.get("/kpi/enablers");
    return res.data;
  },
  createEnabler: async (
    data: EnablerRequest,
  ): Promise<ApiResponse<Enabler>> => {
    const res = await apiClient.post("/kpi/enablers", data);
    return res.data;
  },
  updateEnabler: async (
    id: string,
    data: Partial<EnablerRequest>,
  ): Promise<ApiResponse<Enabler>> => {
    const res = await apiClient.put(`/kpi/enablers/${id}`, data);
    return res.data;
  },
  deleteEnabler: async (id: string): Promise<ApiResponse<void>> => {
    const res = await apiClient.delete(`/kpi/enablers/${id}`);
    return res.data;
  },

  listGoals: async (): Promise<ApiResponse<StrategicGoal[]>> => {
    const res = await apiClient.get("/kpi/strategic-goals");
    return res.data;
  },
  createGoal: async (
    data: StrategicGoalRequest,
  ): Promise<ApiResponse<StrategicGoal>> => {
    const res = await apiClient.post("/kpi/strategic-goals", data);
    return res.data;
  },
  updateGoal: async (
    id: string,
    data: Partial<StrategicGoalRequest>,
  ): Promise<ApiResponse<StrategicGoal>> => {
    const res = await apiClient.put(`/kpi/strategic-goals/${id}`, data);
    return res.data;
  },
  deleteGoal: async (id: string): Promise<ApiResponse<void>> => {
    const res = await apiClient.delete(`/kpi/strategic-goals/${id}`);
    return res.data;
  },

  listOperationalObjectives: async (): Promise<
    ApiResponse<OperationalObjective[]>
  > => {
    const res = await apiClient.get("/kpi/operational-objectives");
    return res.data;
  },
  createOperationalObjective: async (
    data: OperationalObjectiveRequest,
  ): Promise<ApiResponse<OperationalObjective>> => {
    const res = await apiClient.post("/kpi/operational-objectives", data);
    return res.data;
  },
  updateOperationalObjective: async (
    id: string,
    data: Partial<OperationalObjectiveRequest>,
  ): Promise<ApiResponse<OperationalObjective>> => {
    const res = await apiClient.put(`/kpi/operational-objectives/${id}`, data);
    return res.data;
  },
  deleteOperationalObjective: async (
    id: string,
  ): Promise<ApiResponse<void>> => {
    const res = await apiClient.delete(`/kpi/operational-objectives/${id}`);
    return res.data;
  },

  listProcesses: async (): Promise<ApiResponse<Process[]>> => {
    const res = await apiClient.get("/kpi/processes");
    return res.data;
  },
  createProcess: async (
    data: ProcessRequest,
  ): Promise<ApiResponse<Process>> => {
    const res = await apiClient.post("/kpi/processes", data);
    return res.data;
  },
  updateProcess: async (
    id: string,
    data: Partial<ProcessRequest>,
  ): Promise<ApiResponse<Process>> => {
    const res = await apiClient.put(`/kpi/processes/${id}`, data);
    return res.data;
  },
  deleteProcess: async (id: string): Promise<ApiResponse<void>> => {
    const res = await apiClient.delete(`/kpi/processes/${id}`);
    return res.data;
  },

  listInitiatives: async (): Promise<ApiResponse<Initiative[]>> => {
    const res = await apiClient.get("/kpi/initiatives");
    return res.data;
  },
  createInitiative: async (
    data: InitiativeRequest,
  ): Promise<ApiResponse<Initiative>> => {
    const res = await apiClient.post("/kpi/initiatives", data);
    return res.data;
  },
  updateInitiative: async (
    id: string,
    data: Partial<InitiativeRequest>,
  ): Promise<ApiResponse<Initiative>> => {
    const res = await apiClient.put(`/kpi/initiatives/${id}`, data);
    return res.data;
  },
  deleteInitiative: async (id: string): Promise<ApiResponse<void>> => {
    const res = await apiClient.delete(`/kpi/initiatives/${id}`);
    return res.data;
  },

  listDomains: async (): Promise<ApiResponse<Domain[]>> => {
    const res = await apiClient.get("/kpi/domains");
    return res.data;
  },
  createDomain: async (data: DomainRequest): Promise<ApiResponse<Domain>> => {
    const res = await apiClient.post("/kpi/domains", data);
    return res.data;
  },
  updateDomain: async (
    id: string,
    data: Partial<DomainRequest>,
  ): Promise<ApiResponse<Domain>> => {
    const res = await apiClient.put(`/kpi/domains/${id}`, data);
    return res.data;
  },
  deleteDomain: async (id: string): Promise<ApiResponse<void>> => {
    const res = await apiClient.delete(`/kpi/domains/${id}`);
    return res.data;
  },

  listAwardCriteria: async (): Promise<ApiResponse<AwardCriterion[]>> => {
    const res = await apiClient.get("/kpi/award-criteria");
    return res.data;
  },
  createAwardCriterion: async (
    data: AwardCriterionRequest,
  ): Promise<ApiResponse<AwardCriterion>> => {
    const res = await apiClient.post("/kpi/award-criteria", data);
    return res.data;
  },
  updateAwardCriterion: async (
    id: string,
    data: Partial<AwardCriterionRequest>,
  ): Promise<ApiResponse<AwardCriterion>> => {
    const res = await apiClient.put(`/kpi/award-criteria/${id}`, data);
    return res.data;
  },
  deleteAwardCriterion: async (id: string): Promise<ApiResponse<void>> => {
    const res = await apiClient.delete(`/kpi/award-criteria/${id}`);
    return res.data;
  },

  listAwardSubCriteria: async (
    criterionId?: string,
  ): Promise<ApiResponse<AwardSubCriterion[]>> => {
    const url = criterionId
      ? `/kpi/award-criteria/${criterionId}/sub-criteria`
      : "/kpi/award-sub-criteria";
    const res = await apiClient.get(url);
    return res.data;
  },
  createAwardSubCriterion: async (
    data: AwardSubCriterionRequest,
  ): Promise<ApiResponse<AwardSubCriterion>> => {
    const res = await apiClient.post(
      `/kpi/award-criteria/${data.award_criterion_id}/sub-criteria`,
      data,
    );
    return res.data;
  },
  updateAwardSubCriterion: async (
    id: string,
    data: Partial<AwardSubCriterionRequest>,
  ): Promise<ApiResponse<AwardSubCriterion>> => {
    const res = await apiClient.put(`/kpi/award-sub-criteria/${id}`, data);
    return res.data;
  },
  deleteAwardSubCriterion: async (id: string): Promise<ApiResponse<void>> => {
    const res = await apiClient.delete(`/kpi/award-sub-criteria/${id}`);
    return res.data;
  },
};

export const kpiDictionaryApi = {
  listStrategic: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    strategic_goal_id?: string;
  }): Promise<PaginatedResponse<StrategicKPI>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", String(params.page));
    if (params?.limit) searchParams.append("limit", String(params.limit));
    if (params?.search) searchParams.append("search", params.search);
    if (params?.strategic_goal_id)
      searchParams.append("strategic_goal_id", params.strategic_goal_id);
    const res = await apiClient.get(
      `/kpi/strategic?${searchParams.toString()}`,
    );
    return res.data;
  },
  getStrategic: async (id: string): Promise<ApiResponse<StrategicKPI>> => {
    const res = await apiClient.get(`/kpi/strategic/${id}`);
    return res.data;
  },
  createStrategic: async (
    data: StrategicKPIRequest,
  ): Promise<ApiResponse<StrategicKPI>> => {
    const res = await apiClient.post("/kpi/strategic", data);
    return res.data;
  },
  updateStrategic: async (
    id: string,
    data: Partial<StrategicKPIRequest>,
  ): Promise<ApiResponse<StrategicKPI>> => {
    const res = await apiClient.put(`/kpi/strategic/${id}`, data);
    return res.data;
  },
  deleteStrategic: async (id: string): Promise<ApiResponse<void>> => {
    const res = await apiClient.delete(`/kpi/strategic/${id}`);
    return res.data;
  },

  listOperational: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<OperationalKPI>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", String(params.page));
    if (params?.limit) searchParams.append("limit", String(params.limit));
    if (params?.search) searchParams.append("search", params.search);
    const res = await apiClient.get(
      `/kpi/operational?${searchParams.toString()}`,
    );
    return res.data;
  },
  createOperational: async (
    data: OperationalKPIRequest,
  ): Promise<ApiResponse<OperationalKPI>> => {
    const res = await apiClient.post("/kpi/operational", data);
    return res.data;
  },
  getOperational: async (id: string): Promise<ApiResponse<OperationalKPI>> => {
    const res = await apiClient.get(`/kpi/operational/${id}`);
    return res.data;
  },
  updateOperational: async (
    id: string,
    data: Partial<OperationalKPIRequest>,
  ): Promise<ApiResponse<OperationalKPI>> => {
    const res = await apiClient.put(`/kpi/operational/${id}`, data);
    return res.data;
  },
  deleteOperational: async (id: string): Promise<ApiResponse<void>> => {
    const res = await apiClient.delete(`/kpi/operational/${id}`);
    return res.data;
  },

  listAward: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<AwardKPI>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", String(params.page));
    if (params?.limit) searchParams.append("limit", String(params.limit));
    const res = await apiClient.get(`/kpi/award?${searchParams.toString()}`);
    return res.data;
  },
  createAward: async (
    data: AwardKPIRequest,
  ): Promise<ApiResponse<AwardKPI>> => {
    const res = await apiClient.post("/kpi/award", data);
    return res.data;
  },
  getAward: async (id: string): Promise<ApiResponse<AwardKPI>> => {
    const res = await apiClient.get(`/kpi/award/${id}`);
    return res.data;
  },
  updateAward: async (
    id: string,
    data: Partial<AwardKPIRequest>,
  ): Promise<ApiResponse<AwardKPI>> => {
    const res = await apiClient.put(`/kpi/award/${id}`, data);
    return res.data;
  },
  deleteAward: async (id: string): Promise<ApiResponse<void>> => {
    const res = await apiClient.delete(`/kpi/award/${id}`);
    return res.data;
  },
  transitionKpiStatus: async (
    type: string,
    id: string,
    data: { action: string; comment?: string },
  ): Promise<ApiResponse<void>> => {
    const res = await apiClient.post(`/kpi/${type}/${id}/transition`, data);
    return res.data;
  },
};

export const kpiPerformanceApi = {
  listTargets: async (params?: {
    kpi_code?: string;
    year?: number;
  }): Promise<ApiResponse<KpiAnnualTarget[]>> => {
    const searchParams = new URLSearchParams();
    if (params?.kpi_code) searchParams.append("kpi_code", params.kpi_code);
    if (params?.year) searchParams.append("year", String(params.year));
    const res = await apiClient.get(`/kpi/targets?${searchParams.toString()}`);
    return res.data;
  },
  setTarget: async (
    data: KpiAnnualTargetRequest,
  ): Promise<ApiResponse<KpiAnnualTarget>> => {
    const res = await apiClient.post("/kpi/targets", data);
    return res.data;
  },
  deleteTarget: async (id: string): Promise<ApiResponse<void>> => {
    const res = await apiClient.delete(`/kpi/targets/${id}`);
    return res.data;
  },

  listPerformance: async (params?: {
    kpi_code?: string;
    year?: number;
    quarter?: number;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<KpiPerformance>> => {
    const searchParams = new URLSearchParams();
    if (params?.kpi_code) searchParams.append("kpi_code", params.kpi_code);
    if (params?.year) searchParams.append("year", String(params.year));
    if (params?.quarter) searchParams.append("quarter", String(params.quarter));
    if (params?.status) searchParams.append("status", params.status);
    if (params?.page) searchParams.append("page", String(params.page));
    if (params?.limit) searchParams.append("limit", String(params.limit));
    const res = await apiClient.get(
      `/kpi/performance?${searchParams.toString()}`,
    );
    return res.data;
  },
  submitPerformance: async (
    data: KpiPerformanceRequest,
  ): Promise<ApiResponse<KpiPerformance>> => {
    const res = await apiClient.post("/kpi/performance", data);
    return res.data;
  },
  getPerformance: async (id: string): Promise<ApiResponse<KpiPerformance>> => {
    const res = await apiClient.get(`/kpi/performance/${id}`);
    return res.data;
  },
  getAvailableTransitions: async (
    id: string,
  ): Promise<ApiResponse<WorkflowTransitionBrief[]>> => {
    const res = await apiClient.get(`/kpi/performance/${id}/transitions`);
    return res.data;
  },
  getPerformanceHistory: async (
    id: string,
  ): Promise<ApiResponse<KpiWorkflowAction[]>> => {
    const res = await apiClient.get(`/kpi/performance/${id}/history`);
    return res.data;
  },
  transitionPerformance: async (
    id: string,
    transitionId: string,
    comment?: string,
  ): Promise<ApiResponse<KpiPerformance>> => {
    const res = await apiClient.post(`/kpi/performance/${id}/transition`, {
      transition_id: transitionId,
      comment,
    });
    return res.data;
  },

  listBenchmarks: async (params?: {
    kpi_code?: string;
    zone?: string;
    department_id?: string;
    year?: number;
  }): Promise<ApiResponse<KpiBenchmark[]>> => {
    const searchParams = new URLSearchParams();
    if (params?.kpi_code) searchParams.append("kpi_code", params.kpi_code);
    if (params?.zone) searchParams.append("zone", params.zone);
    if (params?.department_id)
      searchParams.append("department_id", params.department_id);
    if (params?.year) searchParams.append("year", String(params.year));
    const res = await apiClient.get(
      `/kpi/benchmarks?${searchParams.toString()}`,
    );
    return res.data;
  },
  createBenchmark: async (
    data: KpiBenchmarkRequest,
  ): Promise<ApiResponse<KpiBenchmark>> => {
    const res = await apiClient.post("/kpi/benchmarks", data);
    return res.data;
  },
  deleteBenchmark: async (id: string): Promise<ApiResponse<void>> => {
    const res = await apiClient.delete(`/kpi/benchmarks/${id}`);
    return res.data;
  },
  listBenchmarkSummary: async (): Promise<
    ApiResponse<
      {
        kpi_code: string;
        zone: string;
        benchmark_entity: string;
        avg_internal: number;
        avg_benchmark: number;
        avg_variance: number;
        total_records: number;
      }[]
    >
  > => {
    const res = await apiClient.get("/kpi/benchmarks/summary");
    return res.data;
  },

  listSegmentation: async (params?: {
    kpi_code?: string;
    year?: number;
    quarter?: number;
    dimension?: string;
    department_id?: string;
    zone?: string;
  }): Promise<ApiResponse<KpiSegmentation[]>> => {
    const searchParams = new URLSearchParams();
    if (params?.kpi_code) searchParams.append("kpi_code", params.kpi_code);
    if (params?.year) searchParams.append("year", String(params.year));
    if (params?.quarter) searchParams.append("quarter", String(params.quarter));
    if (params?.dimension) searchParams.append("dimension", params.dimension);
    if (params?.department_id)
      searchParams.append("department_id", params.department_id);
    if (params?.zone) searchParams.append("zone", params.zone);
    const res = await apiClient.get(
      `/kpi/segmentation?${searchParams.toString()}`,
    );
    return res.data;
  },
  createSegmentation: async (
    data: KpiSegmentationRequest,
  ): Promise<ApiResponse<KpiSegmentation>> => {
    const res = await apiClient.post("/kpi/segmentation", data);
    return res.data;
  },
  deleteSegmentation: async (id: string): Promise<ApiResponse<void>> => {
    const res = await apiClient.delete(`/kpi/segmentation/${id}`);
    return res.data;
  },
  listSegmentationSummary: async (): Promise<
    ApiResponse<
      {
        dimension_name: string;
        segment_name: string;
        avg_achievement: number;
        avg_target: number;
        avg_pct: number;
        total_records: number;
      }[]
    >
  > => {
    const res = await apiClient.get("/kpi/segmentation/summary");
    return res.data;
  },
};

export const kpiDashboardApi = {
  getDashboard: async (): Promise<ApiResponse<EnhancedKpiDashboardData>> => {
    const res = await apiClient.get("/kpi/dashboard");
    return res.data;
  },
  getTrends: async (params?: {
    kpi_code?: string;
    year?: number;
  }): Promise<ApiResponse<PerformanceTrend[]>> => {
    const searchParams = new URLSearchParams();
    if (params?.kpi_code) searchParams.append("kpi_code", params.kpi_code);
    if (params?.year) searchParams.append("year", String(params.year));
    const res = await apiClient.get(
      `/kpi/dashboard/trends?${searchParams.toString()}`,
    );
    return res.data;
  },
  getKpiCardDefinitions: async (params?: {
    type?: string;
    search?: string;
  }): Promise<ApiResponse<KpiCardDef[]>> => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append("type", params.type);
    if (params?.search) searchParams.append("search", params.search);
    const res = await apiClient.get(
      `/kpi/dashboard/cards?${searchParams.toString()}`,
    );
    return res.data;
  },
};
