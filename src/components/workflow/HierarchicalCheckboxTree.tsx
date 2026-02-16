import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  level?: number;
  [key: string]: unknown;
}

interface HierarchicalCheckboxTreeProps {
  data: TreeNode[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  emptyMessage?: string;
  showSelectAll?: boolean;
}

// Helper to get all descendant IDs (including the node itself)
const getAllDescendantIds = (node: TreeNode): string[] => {
  const ids = [node.id];
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => {
      ids.push(...getAllDescendantIds(child));
    });
  }
  return ids;
};

// Helper to get all IDs in the tree
const getAllIds = (nodes: TreeNode[]): string[] => {
  let ids: string[] = [];
  nodes.forEach(node => {
    ids.push(...getAllDescendantIds(node));
  });
  return ids;
};

// Helper to check if all children are selected
const areAllChildrenSelected = (node: TreeNode, selectedIds: string[]): boolean => {
  if (!node.children || node.children.length === 0) return false;
  const childIds = getAllDescendantIds(node).filter(id => id !== node.id);
  return childIds.every(id => selectedIds.includes(id));
};

// Helper to check if some (but not all) children are selected
const areSomeChildrenSelected = (node: TreeNode, selectedIds: string[]): boolean => {
  if (!node.children || node.children.length === 0) return false;
  const childIds = getAllDescendantIds(node).filter(id => id !== node.id);
  const selectedCount = childIds.filter(id => selectedIds.includes(id)).length;
  return selectedCount > 0 && selectedCount < childIds.length;
};

interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  selectedIds: string[];
  expandedIds: string[];
  onToggleExpand: (id: string) => void;
  onToggleCheckbox: (node: TreeNode, checked: boolean) => void;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  level,
  selectedIds,
  expandedIds,
  onToggleExpand,
  onToggleCheckbox,
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.includes(node.id);
  const isChecked = selectedIds.includes(node.id);
  const allChildrenSelected = hasChildren && areAllChildrenSelected(node, selectedIds);
  const someChildrenSelected = hasChildren && areSomeChildrenSelected(node, selectedIds);
  const isIndeterminate = someChildrenSelected && !allChildrenSelected;

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onToggleCheckbox(node, e.target.checked);
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg transition-all hover:bg-[hsl(var(--primary)/0.05)]",
          isChecked && "bg-[hsl(var(--primary)/0.1)]"
        )}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        {/* Expand/Collapse icon */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            className="p-0.5 hover:bg-[hsl(var(--muted))] rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isChecked || allChildrenSelected}
          ref={(input) => {
            if (input) {
              input.indeterminate = isIndeterminate || false;
            }
          }}
          onChange={handleCheckboxChange}
          className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))] cursor-pointer"
        />

        {/* Node name */}
        <label
          onClick={() => hasChildren && onToggleExpand(node.id)}
          className={cn(
            "flex-1 text-sm cursor-pointer",
            (isChecked || allChildrenSelected) ? "font-medium text-[hsl(var(--foreground))]" : "font-normal text-[hsl(var(--foreground))]"
          )}
        >
          {node.name}
        </label>

        {/* Children count badge */}
        {hasChildren && (
          <span className="text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded">
            {node.children!.length}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedIds={selectedIds}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onToggleCheckbox={onToggleCheckbox}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const HierarchicalCheckboxTree: React.FC<HierarchicalCheckboxTreeProps> = ({
  data,
  selectedIds,
  onSelectionChange,
  emptyMessage = 'No items available',
  showSelectAll = true,
}) => {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleCheckbox = (node: TreeNode, checked: boolean) => {
    const descendantIds = getAllDescendantIds(node);

    if (checked) {
      // Add this node and all descendants
      const newSelectedIds = [...new Set([...selectedIds, ...descendantIds])];
      onSelectionChange(newSelectedIds);
    } else {
      // Remove this node and all descendants
      const newSelectedIds = selectedIds.filter(id => !descendantIds.includes(id));
      onSelectionChange(newSelectedIds);
    }
  };

  const handleSelectAll = () => {
    const allIds = getAllIds(data);
    onSelectionChange(allIds);
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
  };

  const expandAll = () => {
    const allParentIds: string[] = [];
    const collectParentIds = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          allParentIds.push(node.id);
          collectParentIds(node.children);
        }
      });
    };
    collectParentIds(data);
    setExpandedIds(allParentIds);
  };

  const collapseAll = () => {
    setExpandedIds([]);
  };

  const allIds = getAllIds(data);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.includes(id));
  const someSelected = !allSelected && allIds.some(id => selectedIds.includes(id));

  return (
    <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
      {/* Header with controls */}
      {(showSelectAll || data.length > 0) && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          {showSelectAll && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = someSelected || false;
                  }
                }}
                onChange={(e) => {
                  if (e.target.checked) {
                    handleSelectAll();
                  } else {
                    handleDeselectAll();
                  }
                }}
                className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))] cursor-pointer"
              />
              <span className="text-xs font-medium text-[hsl(var(--foreground))]">
                {allSelected ? 'Deselect All' : 'Select All'}
              </span>
            </div>
          )}

          {!showSelectAll && (
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {selectedIds.length} selected
            </span>
          )}

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={expandAll}
              className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] px-2 py-1 hover:bg-[hsl(var(--muted))] rounded transition-colors"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] px-2 py-1 hover:bg-[hsl(var(--muted))] rounded transition-colors"
            >
              Collapse
            </button>
          </div>
        </div>
      )}

      {/* Tree content */}
      <div className="overflow-y-auto p-2" style={{ maxHeight: '320px' }}>
        {data.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
            {emptyMessage}
          </p>
        ) : (
          data.map((node) => (
            <TreeNodeItem
              key={node.id}
              node={node}
              level={0}
              selectedIds={selectedIds}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              onToggleCheckbox={handleToggleCheckbox}
            />
          ))
        )}
      </div>

      {/* Empty state message */}
      {selectedIds.length === 0 && data.length > 0 && (
        <div className="border-t border-[hsl(var(--border))] px-3 py-2 bg-blue-50">
          <p className="text-xs text-blue-700">
            <strong>No selection</strong> - This workflow will match <strong>all items</strong> in this category
          </p>
        </div>
      )}
    </div>
  );
};
