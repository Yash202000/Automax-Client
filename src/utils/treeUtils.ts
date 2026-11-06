export interface TreeSelectNode {
  id: string;
  name: string;
  name_ar?: string;
  children?: TreeSelectNode[];
  [key: string]: unknown;
}
// Helper to find a node by ID in the tree
export const findNodeById = (
  nodes: TreeSelectNode[],
  id: string,
): TreeSelectNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children && node.children.length > 0) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
};

// Helper to get the path/breadcrumb to a node
export const getNodePath = (
  nodes: TreeSelectNode[],
  id: string,
  language: string,
  path: string[] = [],
): string[] => {
  for (const node of nodes) {
    const nodeName =
      language === "ar" && node.name_ar ? node.name_ar : node.name;
    if (node.id === id) return [...path, nodeName];
    if (node.children && node.children.length > 0) {
      const result = getNodePath(node.children, id, language, [
        ...path,
        nodeName,
      ]);
      if (result.length > 0) return result;
    }
  }
  return [];
};

// Filter a tree by name, keeping ancestors of matching nodes so the
// hierarchy stays intact. Returns the original list when query is blank.
export function filterTreeByName<T extends TreeSelectNode>(
  nodes: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;
  const out: T[] = [];
  for (const node of nodes) {
    const children = node.children
      ? filterTreeByName(node.children as T[], query)
      : [];
    const label = `${node.name} ${node.name_ar || ""}`.toLowerCase();
    if (label.includes(q) || children.length) {
      out.push({ ...node, children } as T);
    }
  }
  return out;
}
