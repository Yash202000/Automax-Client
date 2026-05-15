export interface TreeSelectNode {
  id: string;
  name: string;
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
  path: string[] = [],
): string[] => {
  for (const node of nodes) {
    if (node.id === id) return [...path, node.name];
    if (node.children && node.children.length > 0) {
      const result = getNodePath(node.children, id, [...path, node.name]);
      if (result.length > 0) return result;
    }
  }
  return [];
};
