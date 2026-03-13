import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Placement = "top" | "bottom" | "left" | "right";
type TriggerMode = "hover" | "click";

export type TooltipPopoverProps = {
  /** The element that triggers the tooltip/popover */
  children: React.ReactNode;
  /** Content to show inside the floating panel */
  content: React.ReactNode;
  /** "hover" for tooltip behaviour, "click" for popover behaviour */
  trigger?: TriggerMode;
  /** Preferred placement — auto-flips if not enough space */
  placement?: Placement;
  /** Extra class on the floating panel */
  className?: string;
  /** Gap between trigger and panel in px */
  offset?: number;
  /** Disable the popover/tooltip entirely */
  disabled?: boolean;
  /** For click mode: close when clicking outside */
  closeOnOutsideClick?: boolean;
  /** For click mode: close when pressing Escape */
  closeOnEscape?: boolean;
  /** Max width of the panel */
  maxWidth?: number;
  /** Show a small arrow pointing at the trigger */
  showArrow?: boolean;
};

// ─── Portal helper ────────────────────────────────────────────────────────────

import { createPortal } from "react-dom";

// ─── Hook: compute position ───────────────────────────────────────────────────

function useFloatingPosition(
  triggerRef: React.RefObject<HTMLElement | null>,
  panelRef: React.RefObject<HTMLDivElement | null>,
  placement: Placement,
  offset: number,
  open: boolean,
) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [actualPlacement, setActualPlacement] = useState<Placement>(placement);

  const compute = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const tr = trigger.getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let resolved: Placement = placement;

    // Auto-flip if preferred placement doesn't fit
    if (placement === "bottom" && tr.bottom + pr.height + offset > vh)
      resolved = "top";
    else if (placement === "top" && tr.top - pr.height - offset < 0)
      resolved = "bottom";
    else if (placement === "right" && tr.right + pr.width + offset > vw)
      resolved = "left";
    else if (placement === "left" && tr.left - pr.width - offset < 0)
      resolved = "right";

    setActualPlacement(resolved);

    let top = 0;
    let left = 0;

    switch (resolved) {
      case "bottom":
        top = tr.bottom + offset;
        left = tr.left + tr.width / 2 - pr.width / 2;
        break;
      case "top":
        top = tr.top - pr.height - offset;
        left = tr.left + tr.width / 2 - pr.width / 2;
        break;
      case "right":
        top = tr.top + tr.height / 2 - pr.height / 2;
        left = tr.right + offset;
        break;
      case "left":
        top = tr.top + tr.height / 2 - pr.height / 2;
        left = tr.left - pr.width - offset;
        break;
    }

    // Clamp to viewport edges with 8px margin
    const margin = 8;
    left = Math.max(margin, Math.min(left, vw - pr.width - margin));
    top = Math.max(margin, Math.min(top, vh - pr.height - margin));

    setStyle({ position: "fixed", top, left });
  }, [placement, offset, triggerRef, panelRef]);

  useEffect(() => {
    if (!open) return;
    // Run after paint so panel has dimensions
    const raf = requestAnimationFrame(compute);
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open, compute]);

  return { style, actualPlacement };
}

// ─── Arrow ────────────────────────────────────────────────────────────────────

// const ARROW_SIZE = 6;

const Arrow = ({ placement }: { placement: Placement }) => {
  const base =
    "absolute w-0 h-0 border-solid border-transparent pointer-events-none";

  const styles: Record<Placement, string> = {
    bottom: `border-b-[hsl(var(--border))] border-b-[7px] border-x-[6px] -top-[7px] left-1/2 -translate-x-1/2`,
    top: `border-t-[hsl(var(--border))] border-t-[7px] border-x-[6px] -bottom-[7px] left-1/2 -translate-x-1/2`,
    right: `border-r-[hsl(var(--border))] border-r-[7px] border-y-[6px] -left-[7px] top-1/2 -translate-y-1/2`,
    left: `border-l-[hsl(var(--border))] border-l-[7px] border-y-[6px] -right-[7px] top-1/2 -translate-y-1/2`,
  };

  // Inner arrow (fills with bg)
  const innerStyles: Record<Placement, string> = {
    bottom: `border-b-[hsl(var(--popover))] border-b-[6px] border-x-[5px] -top-[6px] left-1/2 -translate-x-1/2`,
    top: `border-t-[hsl(var(--popover))] border-t-[6px] border-x-[5px] -bottom-[6px] left-1/2 -translate-x-1/2`,
    right: `border-r-[hsl(var(--popover))] border-r-[6px] border-y-[5px] -left-[6px] top-1/2 -translate-y-1/2`,
    left: `border-l-[hsl(var(--popover))] border-l-[6px] border-y-[5px] -right-[6px] top-1/2 -translate-y-1/2`,
  };

  return (
    <>
      <span className={cn(base, styles[placement])} />
      <span className={cn(base, innerStyles[placement])} />
    </>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const TooltipPopover: React.FC<TooltipPopoverProps> = ({
  children,
  content,
  trigger = "hover",
  placement = "bottom",
  className,
  offset = 8,
  disabled = false,
  closeOnOutsideClick = true,
  closeOnEscape = true,
  maxWidth = 280,
  showArrow = true,
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { style, actualPlacement } = useFloatingPosition(
    triggerRef,
    panelRef,
    placement,
    offset,
    open,
  );

  // ── Click outside ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || trigger !== "click" || !closeOnOutsideClick) return;
    const handler = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !panelRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, trigger, closeOnOutsideClick]);

  // ── Escape key ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, closeOnEscape]);

  // ── Trigger event props ────────────────────────────────────────────────────
  const triggerProps =
    trigger === "hover"
      ? {
          onMouseEnter: () => !disabled && setOpen(true),
          onMouseLeave: () => setOpen(false),
        }
      : {
          onClick: () => !disabled && setOpen((o) => !o),
        };

  return (
    <>
      {/* Trigger wrapper */}
      <div ref={triggerRef} className="inline-flex" {...triggerProps}>
        {children}
      </div>

      {/* Floating panel — rendered in a portal to escape overflow:hidden */}
      {open &&
        !disabled &&
        createPortal(
          <div
            ref={panelRef}
            style={{ ...style, maxWidth, zIndex: 9999 }}
            className={cn(
              "bg-[hsl(var(--popover))] border border-[hsl(var(--border))]",
              "rounded-xl shadow-2xl shadow-black/10",
              "text-[hsl(var(--popover-foreground))]",
              "animate-in fade-in-0 zoom-in-95 duration-100",
              "relative",
              className,
            )}
            // For hover mode: keep open while hovering panel
            {...(trigger === "hover"
              ? {
                  onMouseEnter: () => setOpen(true),
                  onMouseLeave: () => setOpen(false),
                }
              : {})}
          >
            {showArrow && <Arrow placement={actualPlacement} />}
            {content}
          </div>,
          document.body,
        )}
    </>
  );
};

export default TooltipPopover;
