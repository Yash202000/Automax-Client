import React, { useState, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  [key: string]: unknown;
}

interface HierarchicalTreeSelectProps {
  data: TreeNode[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  label?: string;
  icon?: React.ReactNode;
  emptyMessage?: string;
  maxHeight?: string;
  colorScheme?: 'primary' | 'success' | 'warning' | 'accent';
}

// Helper to get all descendant IDs
const getAllDescendantIds = (node: TreeNode): string[] => {
  const ids: string[] = [node.id];
  if (node.children && node.children.length > 0) {
    node.children.forEach((child) => {
      ids.push(...getAllDescendantIds(child));
    });
  }
  return ids;
};

// Helper to flatten tree to get all node IDs
const flattenTree = (nodes: TreeNode[]): string[] => {
  const ids: string[] = [];
  nodes.forEach((node) => {
    ids.push(...getAllDescendantIds(node));
  });
  return ids;
};

// Helper to check if all children are selected
const areAllChildrenSelected = (node: TreeNode, selectedIds: string[]): boolean => {
  if (!node.children || node.children.length === 0) {
    return selectedIds.includes(node.id);
  }
  return node.children.every((child) => areAllChildrenSelected(child, selectedIds));
};

// Helper to check if some children are selected
const areSomeChildrenSelected = (node: TreeNode, selectedIds: string[]): boolean => {
  if (!node.children || node.children.length === 0) {
    return selectedIds.includes(node.id);
  }
  return node.children.some((child) => areSomeChildrenSelected(child, selectedIds));
};

interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  selectedIds: string[];
  expandedIds: string[];
  onToggleExpand: (id: string) => void;
  onToggleSelect: (node: TreeNode) => void;
  colorScheme: 'primary' | 'success' | 'warning' | 'accent';
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  level,
  selectedIds,
  expandedIds,
  onToggleExpand,
  onToggleSelect,
  colorScheme,
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.includes(node.id);
  const isSelected = selectedIds.includes(node.id);
  const allChildrenSelected = hasChildren ? areAllChildrenSelected(node, selectedIds) : false;
  const someChildrenSelected = hasChildren ? areSomeChildrenSelected(node, selectedIds) : false;
  const isIndeterminate = someChildrenSelected && !allChildrenSelected;

  const colorClasses = {
    primary: {
      selected: 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.3)]',
      checkbox: 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))]',
    },
    success: {
      selected: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)]',
      checkbox: 'bg-[hsl(var(--success))] border-[hsl(var(--success))]',
    },
    warning: {
      selected: 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.3)]',
      checkbox: 'bg-[hsl(var(--warning))] border-[hsl(var(--warning))]',
    },
    accent: {
      selected: 'bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent-foreground))] border-[hsl(var(--accent)/0.3)]',
      checkbox: 'bg-[hsl(var(--accent))] border-[hsl(var(--accent))]',
    },
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all hover:bg-[hsl(var(--muted)/0.5)]",
          (isSelected || allChildrenSelected) && colorClasses[colorScheme].selected
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {/* Expand/Collapse button */}
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
        <button
          type="button"
          onClick={() => onToggleSelect(node)}
          className={cn(
            "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
            isSelected || allChildrenSelected
              ? colorClasses[colorScheme].checkbox
              : isIndeterminate
              ? colorClasses[colorScheme].checkbox
              : 'border-[hsl(var(--border))] bg-[hsl(var(--background))]'
          )}
        >
          {(isSelected || allChildrenSelected) && (
            <Check className="w-3 h-3 text-white" />
          )}
          {isIndeterminate && !isSelected && !allChildrenSelected && (
            <Minus className="w-3 h-3 text-white" />
          )}
        </button>

        {/* Label */}
        <span
          onClick={() => onToggleSelect(node)}
          className={cn(
            "text-sm font-medium flex-1",
            (isSelected || allChildrenSelected)
              ? 'text-[hsl(var(--foreground))]'
              : 'text-[hsl(var(--muted-foreground))]'
          )}
        >
          {node.name}
        </span>

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
              onToggleSelect={onToggleSelect}
              colorScheme={colorScheme}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const HierarchicalTreeSelect: React.FC<HierarchicalTreeSelectProps> = ({
  data,
  selectedIds,
  onSelectionChange,
  label,
  icon,
  emptyMessage = 'No items available',
  maxHeight = '200px',
  colorScheme = 'primary',
}) => {
  const [expandedIds, setExpandedIds] = useState<string[]>(() => {
    // Auto-expand nodes that have selected children
    const expanded: string[] = [];
    const checkAndExpand = (nodes: TreeNode[]) => {
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          if (areSomeChildrenSelected(node, selectedIds)) {
            expanded.push(node.id);
          }
          checkAndExpand(node.children);
        }
      });
    };
    checkAndExpand(data);
    return expanded;
  });

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const toggleSelect = useCallback(
    (node: TreeNode) => {
      const allIds = getAllDescendantIds(node);
      const isCurrentlyFullySelected = allIds.every((id) => selectedIds.includes(id));

      if (isCurrentlyFullySelected) {
        // Deselect all descendants
        onSelectionChange(selectedIds.filter((id) => !allIds.includes(id)));
      } else {
        // Select all descendants
        const newSelection = new Set([...selectedIds, ...allIds]);
        onSelectionChange(Array.from(newSelection));
      }

      // Auto-expand when selecting a parent with children
      if (node.children && node.children.length > 0 && !expandedIds.includes(node.id)) {
        setExpandedIds((prev) => [...prev, node.id]);
      }
    },
    [selectedIds, onSelectionChange, expandedIds]
  );

  const allIds = useMemo(() => flattenTree(data), [data]);
  const selectedCount = selectedIds.filter((id) => allIds.includes(id)).length;

  const expandAll = () => {
    const allNodeIds: string[] = [];
    const collectIds = (nodes: TreeNode[]) => {
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          allNodeIds.push(node.id);
          collectIds(node.children);
        }
      });
    };
    collectIds(data);
    setExpandedIds(allNodeIds);
  };

  const collapseAll = () => {
    setExpandedIds([]);
  };

  const selectAll = () => {
    onSelectionChange(allIds);
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  const colorBadgeClasses = {
    primary: 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]',
    success: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
    warning: 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]',
    accent: 'bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent-foreground))]',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          {label && (
            <label className="text-sm font-medium text-[hsl(var(--foreground))]">
              {label}
            </label>
          )}
          <span className={cn("px-2 py-0.5 text-xs font-medium rounded-md", colorBadgeClasses[colorScheme])}>
            {selectedCount} selected
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={expandAll}
            className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] px-2 py-1 hover:bg-[hsl(var(--muted))] rounded transition-colors"
          >
            Expand
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] px-2 py-1 hover:bg-[hsl(var(--muted))] rounded transition-colors"
          >
            Collapse
          </button>
          <span className="text-[hsl(var(--border))]">|</span>
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] px-2 py-1 hover:bg-[hsl(var(--muted))] rounded transition-colors"
          >
            All
          </button>
          <button
            type="button"
            onClick={deselectAll}
            className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] px-2 py-1 hover:bg-[hsl(var(--muted))] rounded transition-colors"
          >
            None
          </button>
        </div>
      </div>

      {/* Tree Container */}
      <div
        className="border border-[hsl(var(--border))] rounded-xl overflow-y-auto p-2"
        style={{ maxHeight }}
      >
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
              onToggleSelect={toggleSelect}
              colorScheme={colorScheme}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default HierarchicalTreeSelect;
