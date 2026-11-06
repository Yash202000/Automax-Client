import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  classificationApi,
  departmentApi,
  locationApi,
  lookupApi,
} from "../api/admin";
import type { LookupCategory } from "../types";
import { getNodePath, type TreeSelectNode } from "../utils/treeUtils";
import { resolveSourceLabel } from "../utils/sourceLabel";

/**
 * Source label resolved through the SOURCE lookup category — the same
 * labels the legacy pages show (localized, exact code match).
 */
export function useSourceLabel(source?: string | null): string {
  const { data } = useQuery({
    queryKey: ["lookups", "categories"],
    queryFn: () => lookupApi.listCategories(),
    staleTime: 300_000,
  });
  const category = useMemo(
    () =>
      (data?.data || []).find((c: LookupCategory) => c.code === "SOURCE") ||
      null,
    [data],
  );
  return useMemo(
    () => resolveSourceLabel(source, category),
    [source, category],
  );
}

function useTreeNodes(
  queryKey: string[],
  fetch: () => Promise<{ data?: unknown }>,
): TreeSelectNode[] {
  const { data } = useQuery({
    queryKey,
    queryFn: fetch,
    staleTime: 300_000,
  });
  return useMemo(
    () => (data?.data || []) as unknown as TreeSelectNode[],
    [data],
  );
}

/**
 * Full hierarchy trees with the exact query keys the feed FilterDrawer
 * uses, so opening the workspace never refetches them.
 */
export function useDepartmentTree(): TreeSelectNode[] {
  return useTreeNodes(["admin", "departments", "tree"], () =>
    departmentApi.getTree(),
  );
}

export function useClassificationTree(): TreeSelectNode[] {
  // Same query key AND same raw-array shape as FilterDrawer, so both
  // consumers share one cache entry without shape mismatch.
  const { data } = useQuery({
    queryKey: ["admin", "classifications", "tree", "incident-all"],
    queryFn: async () => {
      const [a, b] = await Promise.all([
        classificationApi.getTree("incident"),
        classificationApi.getTree("all"),
      ]);
      const combined = [...(a.data || []), ...(b.data || [])];
      return combined.filter(
        (c, i, self) => i === self.findIndex((x) => x.id === c.id),
      );
    },
    staleTime: 300_000,
  });
  return useMemo(() => (data || []) as unknown as TreeSelectNode[], [data]);
}

export function useLocationTree(): TreeSelectNode[] {
  return useTreeNodes(["admin", "locations", "tree"], () =>
    locationApi.getTree(),
  );
}

/**
 * Breadcrumb path (localized) from a tree root to a node id.
 */
export function useNodePath(
  nodes: TreeSelectNode[],
  id?: string | null,
  language?: string,
): string[] {
  return useMemo(
    () => (id ? getNodePath(nodes, id, language ?? "en") : []),
    [nodes, id, language],
  );
}
