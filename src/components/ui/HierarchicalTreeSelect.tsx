import React, { useState, useCallback, useMemo } from "react";
import { ChevronRight, ChevronDown, Check, Minus, Search } from "lucide-react";
import { cn, getLocalizedName } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export type TreeNodeRecordType =
  | "incident"
  | "request"
  | "complaint"
  | "query"
  | "mobile"
  | "ivr";

const RECORD_TYPES: TreeNodeRecordType[] = [
  "incident",
  "request",
  "complaint",
  "query",
  "mobile",
  "ivr",
];

// What kind of hierarchy this tree represents. Only "classification" nodes
// carry a `types` array, so it's the only kind that gets the type badges and
// the type filter dropdown.
export type HierarchicalTreeKind = "location" | "classification" | "department";

export interface TreeNode {
  id: string;
  name: string;
  name_ar?: string | null;
  children?: TreeNode[];
  types?: string[];
}

interface HierarchicalTreeSelectProps {
  data: TreeNode[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  label?: string;
  icon?: React.ReactNode;
  emptyMessage?: string;
  maxHeight?: string;
  colorScheme?: "primary" | "success" | "warning" | "accent";
  leafOnly?: boolean; // Only allow selecting leaf nodes (no children)
  hierarchyType?: HierarchicalTreeKind;
  // Initial value for the type filter (only relevant when
  // hierarchyType === "classification"); the user can change it afterwards
  // via the type filter dropdown shown in the options row.
  type?: TreeNodeRecordType;
}

// Strictly prunes the tree down to nodes tagged with `type` (or that have a
// matching descendant) — unlike the live search filter below, this never
// falls back to showing a matched parent's untouched original children.
const filterByType = (
  nodes: TreeNode[],
  type: TreeNodeRecordType,
): TreeNode[] =>
  nodes
    .map((node) => {
      const ownMatch = !!node.types?.includes(type);
      const filteredChildren = node.children
        ? filterByType(node.children, type)
        : [];

      if (ownMatch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : undefined,
        };
      }
      return null;
    })
    .filter(Boolean) as TreeNode[];

const getLeafDescendantIds = (node: TreeNode): string[] => {
  if (!node.children?.length) return [node.id];
  return node.children.flatMap(getLeafDescendantIds);
};

const getAllLeafIds = (nodes: TreeNode[]): string[] =>
  nodes.flatMap(getLeafDescendantIds);

const withPartiallySelectedParents = (
  nodes: TreeNode[],
  leafIds: string[],
): string[] => {
  const selected = new Set(leafIds);

  const visit = (node: TreeNode): boolean => {
    if (!node.children?.length) return selected.has(node.id);

    const anyChildSelected = node.children.map(visit).some(Boolean);
    if (anyChildSelected) selected.add(node.id);
    return anyChildSelected;
  };

  nodes.forEach(visit);
  return Array.from(selected);
};

// Helper to check if all children are selected
const areAllChildrenSelected = (
  node: TreeNode,
  selectedIds: string[],
): boolean => {
  if (!node.children || node.children.length === 0) {
    return selectedIds.includes(node.id);
  }
  return node.children.every((child) =>
    areAllChildrenSelected(child, selectedIds),
  );
};

// Helper to check if some children are selected
const areSomeChildrenSelected = (
  node: TreeNode,
  selectedIds: string[],
): boolean => {
  if (!node.children || node.children.length === 0) {
    return selectedIds.includes(node.id);
  }
  return node.children.some((child) =>
    areSomeChildrenSelected(child, selectedIds),
  );
};

const formatTypeLabel = (type: string): string =>
  type === "ivr" ? "IVR" : type.charAt(0).toUpperCase() + type.slice(1);

interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  selectedIds: string[];
  expandedIds: string[];
  onToggleExpand: (id: string) => void;
  onToggleSelect: (node: TreeNode) => void;
  colorScheme: "primary" | "success" | "warning" | "accent";
  leafOnly: boolean;
  showTypes: boolean;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  level,
  selectedIds,
  expandedIds,
  onToggleExpand,
  onToggleSelect,
  colorScheme,
  leafOnly,
  showTypes,
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.includes(node.id);
  const isSelected = selectedIds.includes(node.id);
  const allChildrenSelected = hasChildren
    ? areAllChildrenSelected(node, selectedIds)
    : false;
  const someChildrenSelected = hasChildren
    ? areSomeChildrenSelected(node, selectedIds)
    : false;
  const isChecked = hasChildren ? allChildrenSelected : isSelected;
  const isIndeterminate = someChildrenSelected && !allChildrenSelected;
  // In leafOnly mode, parents are not selectable
  const isSelectable = !leafOnly || !hasChildren;

  const colorClasses = {
    primary: {
      selected:
        "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.3)]",
      checkbox: "bg-[hsl(var(--primary))] border-[hsl(var(--primary))]",
    },
    success: {
      selected:
        "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)]",
      checkbox: "bg-[hsl(var(--success))] border-[hsl(var(--success))]",
    },
    warning: {
      selected:
        "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.3)]",
      checkbox: "bg-[hsl(var(--warning))] border-[hsl(var(--warning))]",
    },
    accent: {
      selected:
        "bg-[hsl(var(--accent)/0.1)] text-success border-[hsl(var(--accent)/0.3)]",
      checkbox: "bg-[hsl(var(--accent))] border-[hsl(var(--accent))]",
    },
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-lg transition-all",
          isSelectable
            ? "cursor-pointer hover:bg-[hsl(var(--muted)/0.5)]"
            : "cursor-default hover:bg-[hsl(var(--muted)/0.3)]",
          isSelectable && isChecked && colorClasses[colorScheme].selected,
        )}
        style={{ paddingInlineStart: `${level * 16 + 8}px` }}
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
              <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] rtl:-rotate-180" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Checkbox — hidden for non-selectable parents in leafOnly mode */}
        {isSelectable ? (
          <button
            type="button"
            onClick={() => onToggleSelect(node)}
            className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
              isChecked
                ? colorClasses[colorScheme].checkbox
                : isIndeterminate
                  ? colorClasses[colorScheme].checkbox
                  : "border-[hsl(var(--border))] bg-[hsl(var(--background))]",
            )}
          >
            {isChecked && <Check className="w-3 h-3 text-white" />}
            {isIndeterminate && <Minus className="w-3 h-3 text-white" />}
          </button>
        ) : (
          /* In leafOnly mode, show an indeterminate dot when some children selected */
          <span
            className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center",
              someChildrenSelected
                ? colorClasses[colorScheme].checkbox
                : "border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]",
            )}
          >
            {someChildrenSelected && <Minus className="w-3 h-3 text-white" />}
          </span>
        )}

        {/* Label */}
        <span
          onClick={() => {
            if (isSelectable) onToggleSelect(node);
            else if (hasChildren) onToggleExpand(node.id);
          }}
          className={cn(
            "text-sm font-medium flex-1",
            isSelectable
              ? isChecked
                ? "text-[hsl(var(--foreground))]"
                : "text-[hsl(var(--muted-foreground))]"
              : "text-[hsl(var(--foreground))] opacity-70",
          )}
        >
          {getLocalizedName(node)}
        </span>

        {/* Classification type tags */}
        {showTypes && node.types && node.types.length > 0 && (
          <span className="flex items-center gap-1 flex-wrap justify-end">
            {node.types.map((nodeType) => (
              <span
                key={nodeType}
                className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded-full"
              >
                {formatTypeLabel(nodeType)}
              </span>
            ))}
          </span>
        )}

        {/* Children count badge */}
        {hasChildren && (
          <span className="text-xs text-[hsl(var(--muted-foreground))] border-[1px] border-[hsl(var(--border))] px-1.5 py-0.5 rounded">
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
              leafOnly={leafOnly}
              showTypes={showTypes}
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
  emptyMessage = "No items available",
  maxHeight = "200px",
  colorScheme = "primary",
  leafOnly = false,
  hierarchyType,
  type,
}) => {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const isClassification = hierarchyType === "classification";
  const [typeFilter, setTypeFilter] = useState<TreeNodeRecordType | undefined>(
    type,
  );

  // The type filter is a structural pre-filter — everything below (search,
  // selection, select-all) operates on this narrowed set, as if the caller
  // had passed a smaller `data` array in the first place.
  const effectiveData = useMemo(
    () => (typeFilter ? filterByType(data, typeFilter) : data),
    [data, typeFilter],
  );

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return effectiveData;

    const query = searchQuery.toLowerCase();

    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .map((node) => {
          const name = getLocalizedName(node) || "";
          const matches = name.toLowerCase().includes(query);

          let filteredChildren: TreeNode[] = [];
          if (node.children) {
            filteredChildren = filterNodes(node.children);
          }

          if (matches || filteredChildren.length > 0) {
            return {
              ...node,
              children:
                filteredChildren.length > 0 ? filteredChildren : node.children,
            };
          }
          return null;
        })
        .filter(Boolean) as TreeNode[];
    };

    return filterNodes(effectiveData);
  }, [effectiveData, searchQuery, i18n.language]);

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
    checkAndExpand(effectiveData);
    return expanded;
  });

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }, []);

  const toggleSelect = useCallback(
    (node: TreeNode) => {
      const hasChildren = node.children && node.children.length > 0;
      // In leafOnly mode, parents are not selectable
      if (leafOnly && hasChildren) return;

      const idsToToggle = getLeafDescendantIds(node);
      const isCurrentlyFullySelected = idsToToggle.every((id) =>
        selectedIds.includes(id),
      );

      const validLeafIds = new Set(getAllLeafIds(effectiveData));
      const normalizedSelection = selectedIds.filter((id) =>
        validLeafIds.has(id),
      );
      const nextLeafIds = isCurrentlyFullySelected
        ? normalizedSelection.filter((id) => !idsToToggle.includes(id))
        : Array.from(new Set([...normalizedSelection, ...idsToToggle]));

      onSelectionChange(
        leafOnly
          ? nextLeafIds
          : withPartiallySelectedParents(effectiveData, nextLeafIds),
      );

      // Auto-expand when clicking a parent with children
      if (hasChildren && !expandedIds.includes(node.id)) {
        setExpandedIds((prev) => [...prev, node.id]);
      }
    },
    [selectedIds, onSelectionChange, expandedIds, leafOnly, effectiveData],
  );

  const allLeafIds = useMemo(() => getAllLeafIds(filteredData), [filteredData]);
  const selectableIds = allLeafIds;
  const selectedCount = selectedIds.filter((id) =>
    selectableIds.includes(id),
  ).length;

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
    collectIds(filteredData);
    setExpandedIds(allNodeIds);
  };

  const collapseAll = () => {
    setExpandedIds([]);
  };

  const selectAll = () => {
    onSelectionChange(
      leafOnly
        ? selectableIds
        : withPartiallySelectedParents(effectiveData, selectableIds),
    );
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  const colorBadgeClasses = {
    primary: "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]",
    success: "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]",
    warning: "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]",
    accent: "bg-[hsl(var(--accent)/0.1)] text-success",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            {label && (
              <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                {label}
              </label>
            )}
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-md",
                colorBadgeClasses[colorScheme],
              )}
            >
              {selectedCount} {t("common.selected")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={expandAll}
              className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] px-2 py-1 hover:bg-[hsl(var(--muted))] rounded transition-colors"
            >
              {t("common.expand")}
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] px-2 py-1 hover:bg-[hsl(var(--muted))] rounded transition-colors"
            >
              {t("common.collapse")}
            </button>
            <span className="text-[hsl(var(--border))]">|</span>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] px-2 py-1 hover:bg-[hsl(var(--muted))] rounded transition-colors"
            >
              {t("common.all")}
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] px-2 py-1 hover:bg-[hsl(var(--muted))] rounded transition-colors"
            >
              {t("common.none")}
            </button>
          </div>
        </div>
      </div>

      {/* Search Input + Type Filter */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("common.search", { defaultValue: "Search..." })}
            className="w-full pl-9 pr-3 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
          />
        </div>
        {isClassification && (
          <select
            value={typeFilter ?? ""}
            onChange={(e) =>
              setTypeFilter(
                e.target.value
                  ? (e.target.value as TreeNodeRecordType)
                  : undefined,
              )
            }
            className="px-3 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
          >
            <option value="">
              {t("common.allTypes", { defaultValue: "All Types" })}
            </option>
            {RECORD_TYPES.map((recordType) => (
              <option key={recordType} value={recordType}>
                {formatTypeLabel(recordType)}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tree Container */}
      <div
        className="border border-[hsl(var(--border))] rounded-xl overflow-y-auto p-2"
        style={{ maxHeight }}
      >
        {filteredData.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
            {emptyMessage}
          </p>
        ) : (
          filteredData.map((node) => (
            <TreeNodeItem
              key={node.id}
              node={node}
              level={0}
              selectedIds={selectedIds}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              onToggleSelect={toggleSelect}
              colorScheme={colorScheme}
              leafOnly={leafOnly}
              showTypes={isClassification}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default HierarchicalTreeSelect;
