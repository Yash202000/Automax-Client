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
