import React, { useState, useRef, useEffect } from "react";
import { X, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HierarchicalTreeSelect,
  type TreeNode,
} from "./HierarchicalTreeSelect";

interface MultiTreeSelectProps {
  data: TreeNode[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  label?: string;
  placeholder?: string;
  leafOnly?: boolean;
  colorScheme?: "primary" | "success" | "warning" | "accent";
  maxHeight?: string;
  className?: string;
}

// Flatten tree to look up node names
const findNames = (nodes: TreeNode[], ids: string[]): string[] => {
  const names: string[] = [];
  const search = (list: TreeNode[]) => {
    list.forEach((n) => {
      if (ids.includes(n.id)) names.push(n.name);
      if (n.children) search(n.children);
    });
  };
  search(nodes);
  return names;
};

export const MultiTreeSelect: React.FC<MultiTreeSelectProps> = ({
  data,
  selectedIds,
  onSelectionChange,
  label,
  placeholder = "All",
  leafOnly = true,
  colorScheme = "primary",
  maxHeight = "240px",
  className,
}) => {
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

  const selectedNames = findNames(data, selectedIds);
  const displayText =
    selectedIds.length === 0
      ? placeholder
      : selectedIds.length === 1
        ? selectedNames[0] || "1 selected"
        : `${selectedIds.length} selected`;

  const hasSelection = selectedIds.length > 0;

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
