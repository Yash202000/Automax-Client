import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalTemplateApi } from "../api/goalTemplates";
import type {
  GoalTemplateFilter,
  GoalTemplateCreateRequest,
  GoalTemplateUpdateRequest,
} from "../types/goal";
import { toast } from "sonner";

export const templateKeys = {
  all: ["goal-templates"] as const,
  lists: () => [...templateKeys.all, "list"] as const,
  list: (filter: GoalTemplateFilter) =>
    [...templateKeys.lists(), filter] as const,
  active: () => [...templateKeys.all, "active"] as const,
  details: () => [...templateKeys.all, "detail"] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
};

export function useGoalTemplates(filter: GoalTemplateFilter = {}) {
  return useQuery({
    queryKey: templateKeys.list(filter),
    queryFn: () => goalTemplateApi.list(filter),
  });
}

export function useActiveGoalTemplates() {
  return useQuery({
    queryKey: templateKeys.active(),
    queryFn: () => goalTemplateApi.listActive(),
  });
}

export function useGoalTemplate(id: string) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => goalTemplateApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateGoalTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GoalTemplateCreateRequest) =>
      goalTemplateApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
      toast.success("Template created");
    },
    onError: () => {
      toast.error("Failed to create template");
    },
  });
}

export function useUpdateGoalTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: GoalTemplateUpdateRequest;
    }) => goalTemplateApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
      toast.success("Template updated");
    },
    onError: () => {
      toast.error("Failed to update template");
    },
  });
}

export function useDeleteGoalTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalTemplateApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
      toast.success("Template deleted");
    },
    onError: () => {
      toast.error("Failed to delete template");
    },
  });
}
