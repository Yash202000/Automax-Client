import React, { useState, useRef, useEffect } from "react";
import { X, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HierarchicalTreeSelect,
  type TreeNode,
} from "./HierarchicalTreeSelect";
import { useTranslation } from "react-i18next";

interface MultiTreeSelectProps {
  data: TreeNode[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  label?: string;
  placeholder?: string;
  leafOnly?: boolean;
  colorScheme?: "primary" | "success" | "warning" | "accent";
  maxHeight?: string;
  maxTags?: number;
  className?: string;
}

// Parent nodes control their descendants; chips and counts represent leaves only.
const findSelectedLeaves = (
  nodes: TreeNode[],
  ids: string[],
): { id: string; name: string }[] => {
  const selected: { id: string; name: string }[] = [];

  const search = (list: TreeNode[]) => {
    list.forEach((node) => {
      if (node.children?.length) {
        search(node.children);
      } else if (ids.includes(node.id)) {
        selected.push({ id: node.id, name: node.name });
      }
    });
  };

  search(nodes);
  return selected;
};

export const MultiTreeSelect: React.FC<MultiTreeSelectProps> = ({
  data,
  selectedIds,
  onSelectionChange,
  label,
  placeholder,
  leafOnly = true,
  colorScheme = "primary",
  maxHeight = "240px",
  maxTags,
  className,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedItems = findSelectedLeaves(data, selectedIds);
  const selectedNames = selectedItems.map((item) => item.name);
  const selectedCount = selectedItems.length;
  const displayText =
    selectedCount === 0
      ? (placeholder ?? t("common.all"))
      : selectedCount === 1
        ? selectedNames[0] || t("common.selectedCount", { count: 1 })
        : t("common.selectedCount", { count: selectedCount });

  const hasSelection = selectedCount > 0;

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 bg-[hsl(var(--background))] border rounded-lg text-sm transition-all text-start",
          hasSelection
            ? "border-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary)/0.2)]"
            : "border-[hsl(var(--border))]",
          isOpen &&
            "ring-2 ring-[hsl(var(--primary)/0.2)] border-[hsl(var(--primary))]",
        )}
      >
        {maxTags !== undefined && hasSelection ? (
          <span className="flex flex-1 items-center gap-1 overflow-hidden">
            {selectedNames.slice(0, Math.max(0, maxTags)).map((name, index) => (
              <span
                key={selectedItems[index].id}
                className="max-w-32 truncate rounded-md bg-[hsl(var(--primary)/0.1)] px-2 py-0.5 text-xs font-medium text-[hsl(var(--primary))]"
                title={name}
              >
                {name}
              </span>
            ))}
            {selectedCount > Math.max(0, maxTags) && (
              <span className="shrink-0 rounded-md bg-[hsl(var(--muted))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--muted-foreground))]">
                +{selectedCount - Math.max(0, maxTags)}
              </span>
            )}
          </span>
        ) : (
          <span
            className={cn(
              "flex-1 truncate text-sm",
              hasSelection
                ? "text-[hsl(var(--foreground))]"
                : "text-[hsl(var(--muted-foreground))]",
            )}
          >
            {displayText}
          </span>
        )}
        <div className="flex items-center gap-1 ml-2">
          {hasSelection && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectionChange([]);
              }}
              className="p-0.5 hover:bg-[hsl(var(--muted))] rounded transition-colors"
            >
              <X className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
            </button>
          )}
          <ChevronsUpDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full min-w-[260px] mt-1 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-lg overflow-hidden">
          <div className="p-3">
            <HierarchicalTreeSelect
              data={data}
              selectedIds={selectedIds}
              onSelectionChange={onSelectionChange}
              colorScheme={colorScheme}
              maxHeight={maxHeight}
              leafOnly={leafOnly}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiTreeSelect;
