import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { categoryApi } from "../api/admin";
import type {
  CategoryCreateRequest,
  CategoryUpdateRequest,
  CategoryListParams,
} from "../types/category";

// ──────────────────────────────────────────────────
// Query Keys
// ──────────────────────────────────────────────────

export const categoryKeys = {
  all: ["categories"] as const,
  list: (params?: CategoryListParams) =>
    [...categoryKeys.all, "list", params ?? {}] as const,
  tree: () => [...categoryKeys.all, "tree"] as const,
  detail: (id: string) => [...categoryKeys.all, "detail", id] as const,
};

// ──────────────────────────────────────────────────
// Queries
// ──────────────────────────────────────────────────

export function useCategories(params?: CategoryListParams) {
  return useQuery({
    queryKey: categoryKeys.list(params),
    queryFn: () => categoryApi.list(params),
  });
}

export function useCategoryTree() {
  return useQuery({
    queryKey: categoryKeys.tree(),
    queryFn: () => categoryApi.getTree(),
    staleTime: 60_000,
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => categoryApi.getById(id),
    enabled: !!id,
  });
}

// ──────────────────────────────────────────────────
// Mutations
// ──────────────────────────────────────────────────

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryCreateRequest) => categoryApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      toast.success("Category created successfully");
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      const msg = error?.response?.data?.error || "Failed to create category";
      toast.error(msg);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryUpdateRequest }) =>
      categoryApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      toast.success("Category updated successfully");
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      const msg = error?.response?.data?.error || "Failed to update category";
      toast.error(msg);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      toast.success("Category deleted successfully");
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      const msg = error?.response?.data?.error || "Failed to delete category";
      toast.error(msg);
    },
  });
}
