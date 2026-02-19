import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TreeSelectNode {
  id: string;
  name: string;
  children?: TreeSelectNode[];
  [key: string]: unknown;
}

interface TreeSelectProps {
  data: TreeSelectNode[];
  value: string;
  onChange: (id: string, node?: TreeSelectNode) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
  maxHeight?: string;
  leafOnly?: boolean; // Only allow selecting nodes without children
}

// Helper to find a node by ID in the tree
const findNodeById = (nodes: TreeSelectNode[], id: string): TreeSelectNode | undefined => {
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
const getNodePath = (nodes: TreeSelectNode[], id: string, path: string[] = []): string[] => {
  for (const node of nodes) {
    if (node.id === id) return [...path, node.name];
    if (node.children && node.children.length > 0) {
      const result = getNodePath(node.children, id, [...path, node.name]);
      if (result.length > 0) return result;
    }
  }
  return [];
};

interface TreeNodeItemProps {
  node: TreeSelectNode;
  level: number;
  selectedId: string;
  expandedIds: string[];
  onToggleExpand: (id: string) => void;
  onSelect: (node: TreeSelectNode) => void;
  leafOnly: boolean;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  level,
  selectedId,
  expandedIds,
  onToggleExpand,
  onSelect,
  leafOnly,
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.includes(node.id);
  const isSelected = selectedId === node.id;
  const canSelect = !leafOnly || !hasChildren;

  const handleClick = () => {
    if (hasChildren) {
      onToggleExpand(node.id);
    }
    if (canSelect) {
      onSelect(node);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg transition-all",
          canSelect
            ? "cursor-pointer hover:bg-[hsl(var(--primary)/0.1)]"
            : "cursor-default",
          isSelected && "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]",
          !canSelect && !isSelected && "text-[hsl(var(--muted-foreground))]"
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

        {/* Node name */}
        <span className={cn(
          "flex-1 text-sm",
          isSelected ? "font-medium" : "font-normal",
          !canSelect && "opacity-60"
        )}>
          {node.name}
        </span>

        {/* Selected check */}
        {isSelected && (
          <Check className="w-4 h-4 text-[hsl(var(--primary))]" />
        )}

        {/* Children count badge for parents */}
        {hasChildren && leafOnly && (
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
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              leafOnly={leafOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const TreeSelect: React.FC<TreeSelectProps> = ({
  data,
  value,
  onChange,
  label,
  placeholder = 'Select...',
  error,
  required,
  disabled,
  emptyMessage = 'No items available',
  maxHeight = '300px',
  leafOnly = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-expand parents of selected value
  useEffect(() => {
    if (value && data.length > 0) {
      const expandParents = (nodes: TreeSelectNode[], targetId: string, parents: string[] = []): string[] | null => {
        for (const node of nodes) {
          if (node.id === targetId) {
            return parents;
          }
          if (node.children && node.children.length > 0) {
            const result = expandParents(node.children, targetId, [...parents, node.id]);
            if (result) return result;
          }
        }
        return null;
      };

      const parents = expandParents(data, value);
      if (parents && parents.length > 0) {
        setExpandedIds(prev => {
          const newExpanded = new Set([...prev, ...parents]);
          return Array.from(newExpanded);
        });
      }
    }
  }, [value, data]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelect = (node: TreeSelectNode) => {
    const hasChildren = node.children && node.children.length > 0;
    if (leafOnly && hasChildren) return;

    onChange(node.id, node);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', undefined);
  };

  const selectedNode = value ? findNodeById(data, value) : null;
  const selectedPath = value ? getNodePath(data, value) : [];

  const expandAll = () => {
    const allParentIds: string[] = [];
    const collectParentIds = (nodes: TreeSelectNode[]) => {
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

  return (
    <div className="relative" ref={containerRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
          {label}
          {required && <span className="text-red-500 ms-1">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 bg-[hsl(var(--background))] border rounded-lg text-sm transition-all text-start",
          error
            ? "border-red-500 focus:ring-red-500/20"
            : "border-[hsl(var(--border))] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]",
          disabled && "opacity-50 cursor-not-allowed bg-[hsl(var(--muted))]",
          isOpen && "ring-2 ring-[hsl(var(--primary)/0.2)] border-[hsl(var(--primary))]"
        )}
      >
        <span className={cn(
          "flex-1 truncate",
          selectedNode ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"
        )}>
          {selectedNode ? (
            selectedPath.length > 1
              ? selectedPath.join(' > ')
              : selectedNode.name
          ) : placeholder}
        </span>
        <div className="flex items-center gap-1 ml-2">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-[hsl(var(--muted))] rounded transition-colors"
            >
              <X className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            </button>
          )}
          <ChevronsUpDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        </div>
      </button>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-lg overflow-hidden">
          {/* Header with expand/collapse controls */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {leafOnly ? 'Select a leaf item' : 'Select an item'}
            </span>
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

          {/* Tree content */}
          <div
            className="overflow-y-auto p-2"
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
                  selectedId={value}
                  expandedIds={expandedIds}
                  onToggleExpand={toggleExpand}
                  onSelect={handleSelect}
                  leafOnly={leafOnly}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TreeSelect;
