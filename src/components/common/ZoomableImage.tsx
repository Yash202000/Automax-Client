import React, { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, RotateCw, Maximize2 } from "lucide-react";

interface ZoomableImageProps {
  src: string;
  alt?: string;
  className?: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.5;

// Drop-in replacement for a plain lightbox <img> — adds wheel/button zoom,
// drag-to-pan once zoomed, double-click to toggle zoom, and 90°-increment
// rotation. Resets its transform whenever `src` changes (prev/next in a
// gallery), so callers don't need to key/remount it themselves.
export const ZoomableImage: React.FC<ZoomableImageProps> = ({
  src,
  alt,
  className,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragOrigin = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, [src]);

  const clampScale = (value: number) =>
    Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

  const resetTransform = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setScale((prev) => {
      const next = clampScale(prev + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.stopPropagation();
    setIsDragging(true);
    dragOrigin.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragOrigin.current.x,
      y: e.clientY - dragOrigin.current.y,
    });
  };

  const stopDragging = () => setIsDragging(false);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  return (
    <>
      <div
        // No overflow-hidden here deliberately: `transform: scale()` doesn't
        // change this box's layout size, so clipping to it would crop the
        // zoomed-in image right back down to its original frame.
        className={`flex items-center justify-center ${className || ""}`}
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        onDoubleClick={handleDoubleClick}
        style={{
          cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-w-[90vw] max-h-[90vh] object-contain select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? "none" : "transform 0.15s ease-out",
          }}
        />
      </div>

      {/* Zoom/rotate toolbar — fixed to the viewport so it stays put
          regardless of where this component sits in the lightbox layout. */}
      <div
        className="fixed bottom-4 left-4 z-[110] flex items-center gap-1 bg-black/60 rounded-full px-2 py-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setScale((s) => clampScale(s - ZOOM_STEP))}
          disabled={scale <= MIN_SCALE}
          className="p-2 rounded-full text-white hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-white text-xs w-10 text-center select-none">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => clampScale(s + ZOOM_STEP))}
          disabled={scale >= MAX_SCALE}
          className="p-2 rounded-full text-white hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-white/30 mx-0.5" />
        <button
          onClick={() => setRotation((r) => r + 90)}
          className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
          aria-label="Rotate"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          onClick={resetTransform}
          className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
          aria-label="Reset"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </>
  );
};
