import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Horizontal nav that replaces the native scrollbar with arrow buttons.
 * Arrows only appear while there is hidden content in that direction.
 */
export function ScrollableNav({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // scrollLeft is 0 at the start edge and negative in RTL, so work with its
    // magnitude and map start/end onto physical left/right.
    const offset = Math.abs(el.scrollLeft);
    const hasStart = offset > 1;
    const hasEnd = offset + el.clientWidth < el.scrollWidth - 1;
    const rtl = getComputedStyle(el).direction === "rtl";
    setCanScrollLeft(rtl ? hasEnd : hasStart);
    setCanScrollRight(rtl ? hasStart : hasEnd);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [update, children]);

  const scroll = (direction: -1 | 1) =>
    ref.current?.scrollBy({ left: direction * 200, behavior: "smooth" });

  const arrowClass =
    "absolute top-0 bottom-0 z-10 flex items-center px-1 bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors";

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scroll(-1)}
          className={cn(arrowClass, "left-0")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <nav
        ref={ref}
        onScroll={update}
        className={cn(
          "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          className,
        )}
      >
        {children}
      </nav>
      {canScrollRight && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scroll(1)}
          className={cn(arrowClass, "right-0")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
