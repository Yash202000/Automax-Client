import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Canvas,
  FabricImage,
  Rect,
  Textbox,
  Circle,
  FabricObject,
} from "fabric";
import {
  X,
  Square,
  Circle as CircleIcon,
  Type,
  Trash2,
  Save,
  RotateCcw,
  ImageIcon,
  Copy,
  Palette,
  Minus,
} from "lucide-react";

export default function ImageEditor({
  isOpen,
  imageUrl,
  onClose,
  onSave,
  onSaveAsCopy,
  showReplaceButton = true,
  showSaveAsCopyButton = true,
}: {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onSaveAsCopy: (editedImage: string) => void;
  onSave: (editedImage: string) => void;
  showReplaceButton?: boolean;
  showSaveAsCopyButton?: boolean;
}) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas>(null);

  // Drawing style state
  const [fillColor, setFillColor] = useState<string>("transparent");
  const [strokeColor, setStrokeColor] = useState<string>("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [fontSize, setFontSize] = useState<number>(22);

  // Selected object state for the property panel
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(
    null,
  );

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    let isAborted = false;
    let canvas: Canvas | undefined;

    FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" }).then((img) => {
      if (isAborted) return;

      const maxWidth = 800;
      const maxHeight = 500;

      const width = img.width;
      const height = img.height;

      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);

      const scaledWidth = width * ratio;
      const scaledHeight = height * ratio;

      canvas = new Canvas(canvasRef.current || "", {
        width: scaledWidth,
        height: scaledHeight,
      });

      fabricRef.current = canvas;

      img.set({
        scaleX: ratio,
        scaleY: ratio,
        originX: "left",
        originY: "top",
      });

      canvas.backgroundImage = img;
      canvas.renderAll();

      // Selection listeners
      const onSelect = (e: { selected: FabricObject[] }) => {
        setSelectedObject(e.selected?.[0] ?? null);
      };
      const onClear = () => setSelectedObject(null);

      canvas.on("selection:created", onSelect as any);
      canvas.on("selection:updated", onSelect as any);
      canvas.on("selection:cleared", onClear);
    });

    return () => {
      isAborted = true;
      setSelectedObject(null);
      if (canvas) {
        canvas.dispose();
      } else if (fabricRef.current) {
        fabricRef.current.dispose();
      }
    };
  }, [isOpen, imageUrl]);

  // ── Shape / text adders ───────────────────────────────────────────────────

  const addRectangle = () => {
    const obj = new Rect({
      left: 100,
      top: 100,
      width: 150,
      height: 100,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    });
    fabricRef.current?.add(obj);
    fabricRef.current?.setActiveObject(obj);
    fabricRef.current?.renderAll();
  };

  const addCircle = () => {
    const obj = new Circle({
      left: 150,
      top: 150,
      radius: 60,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    });
    fabricRef.current?.add(obj);
    fabricRef.current?.setActiveObject(obj);
    fabricRef.current?.renderAll();
  };

  const addText = () => {
    const obj = new Textbox("Edit me", {
      left: 200,
      top: 200,
      fontSize: fontSize,
      fill: strokeColor, // text colour follows stroke picker
      fontFamily: "Inter, sans-serif",
    });
    fabricRef.current?.add(obj);
    fabricRef.current?.setActiveObject(obj);
    fabricRef.current?.renderAll();
  };

  // ── Property-panel handlers (update selected object live) ─────────────────

  const applyFill = useCallback((color: string) => {
    setFillColor(color);
    const obj = fabricRef.current?.getActiveObject();
    if (obj) {
      obj.set("fill", color);
      fabricRef.current?.renderAll();
    }
  }, []);

  const applyStrokeColor = useCallback((color: string) => {
    setStrokeColor(color);
    const obj = fabricRef.current?.getActiveObject();
    if (obj) {
      // Textbox uses fill for text colour
      if (obj.type === "textbox" || obj.type === "i-text") {
        obj.set("fill", color);
      } else {
        obj.set("stroke", color);
      }
      fabricRef.current?.renderAll();
    }
  }, []);

  const applyStrokeWidth = useCallback((w: number) => {
    setStrokeWidth(w);
    const obj = fabricRef.current?.getActiveObject();
    if (obj && obj.type !== "textbox" && obj.type !== "i-text") {
      obj.set("strokeWidth", w);
      fabricRef.current?.renderAll();
    }
  }, []);

  const applyFontSize = useCallback((s: number) => {
    setFontSize(s);
    const obj = fabricRef.current?.getActiveObject() as any;
    if (obj && (obj.type === "textbox" || obj.type === "i-text")) {
      obj.set("fontSize", s);
      fabricRef.current?.renderAll();
    }
  }, []);

  // ── Utility actions ───────────────────────────────────────────────────────

  const clearSelection = () => {
    const active = fabricRef.current?.getActiveObject();
    if (active) {
      fabricRef.current?.remove(active);
      fabricRef.current?.renderAll();
    }
  };

  const resetCanvas = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getObjects().forEach((obj) => canvas.remove(obj));
    canvas.renderAll();
  };

  const saveImage = (type: string) => {
    const edited = fabricRef.current?.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 2,
    });
    if (type === "save") {
      onSave(edited || "");
    } else {
      onSaveAsCopy(edited || "");
    }
    onClose();
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const isTextObject = selectedObject
    ? selectedObject.type === "textbox" || selectedObject.type === "i-text"
    : false;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative flex flex-col bg-[hsl(var(--card))] rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200 overflow-hidden max-w-[920px] w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[hsl(var(--primary)/0.1)] rounded-lg">
              <ImageIcon className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">
                {t("common.imageEditor")}
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {t("common.addAnnotationsTextOrShapesToThe")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
            title={t("common.closeEsc")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Toolbar row 1: shape/text tools ── */}
        <div className="flex flex-wrap items-center gap-2 px-6 py-3 bg-[hsl(var(--muted)/0.4)] border-b border-[hsl(var(--border))]">
          <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] mr-1 uppercase tracking-wider">
            {t("common.shapes")}
          </span>

          <button
            onClick={addRectangle}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] hover:border-[hsl(var(--primary)/0.4)] transition-all"
            title={t("common.addRectangle")}
          >
            <Square className="w-4 h-4 text-red-500" />
            {t("common.rectangle")}
          </button>

          <button
            onClick={addCircle}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] hover:border-[hsl(var(--primary)/0.4)] transition-all"
            title={t("common.addCircle")}
          >
            <CircleIcon className="w-4 h-4 text-amber-500" />
            {t("common.circle")}
          </button>

          <button
            onClick={addText}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] hover:border-[hsl(var(--primary)/0.4)] transition-all"
            title={t("common.addText")}
          >
            <Type className="w-4 h-4 text-blue-500" />
            {t("common.text")}
          </button>

          <div className="w-px h-6 bg-[hsl(var(--border))] mx-1" />

          <button
            onClick={clearSelection}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
            title={t("common.deleteSelectedObject")}
          >
            <Trash2 className="w-4 h-4" />
            {t("common.delete")}
          </button>

          <button
            onClick={resetCanvas}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-all"
            title={t("common.resetAllAnnotations")}
          >
            <RotateCcw className="w-4 h-4" />
            {t("common.reset")}
          </button>
        </div>

        {/* ── Toolbar row 2: style controls ── */}
        <div className="flex flex-wrap items-center gap-4 px-6 py-2.5 bg-[hsl(var(--muted)/0.2)] border-b border-[hsl(var(--border))]">
          {/* Fill colour */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Palette className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
              {t("common.fill")}
            </span>
            <div className="relative">
              <input
                type="color"
                value={fillColor === "transparent" ? "#ffffff" : fillColor}
                onChange={(e) => applyFill(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border border-[hsl(var(--border))] p-0.5 bg-transparent"
                title={t("common.fillColour")}
              />
            </div>
            <label className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={fillColor === "transparent"}
                onChange={(e) =>
                  applyFill(e.target.checked ? "transparent" : "#ffffff")
                }
                className="accent-[hsl(var(--primary))] w-3 h-3"
              />
              {t("common.none")}
            </label>
          </label>

          <div className="w-px h-5 bg-[hsl(var(--border))]" />

          {/* Stroke / text colour */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Minus className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
              {isTextObject ? "Text colour" : "Stroke"}
            </span>
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => applyStrokeColor(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border border-[hsl(var(--border))] p-0.5 bg-transparent"
              title={t("common.strokeTextColour")}
            />
          </label>

          {/* Stroke width — hidden for text */}
          {!isTextObject && (
            <>
              <div className="w-px h-5 bg-[hsl(var(--border))]" />
              <label className="flex items-center gap-2">
                <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                  {t("common.width")}
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={strokeWidth}
                  onChange={(e) => applyStrokeWidth(Number(e.target.value))}
                  className="w-14 px-2 py-1 text-xs rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  title={t("common.strokeWidth")}
                />
              </label>
            </>
          )}

          {/* Font size — only for text */}
          {isTextObject && (
            <>
              <div className="w-px h-5 bg-[hsl(var(--border))]" />
              <label className="flex items-center gap-2">
                <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                  {t("common.size")}
                </span>
                <input
                  type="number"
                  min={8}
                  max={96}
                  value={fontSize}
                  onChange={(e) => applyFontSize(Number(e.target.value))}
                  className="w-14 px-2 py-1 text-xs rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  title={t("common.fontSize")}
                />
              </label>
            </>
          )}

          {selectedObject && (
            <span className="ml-auto text-xs text-[hsl(var(--primary))] font-medium">
              {isTextObject ? "Text selected" : "Shape selected"}
              {t("common.dragHandlesToResize")}
            </span>
          )}
        </div>

        {/* Canvas Area */}
        <div className="flex items-center justify-center bg-[hsl(var(--muted)/0.2)] p-4 overflow-auto">
          <div className="rounded-lg overflow-hidden shadow-lg ring-1 ring-[hsl(var(--border))]">
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] shrink-0">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {t("common.clickAnObjectToSelectItPress")}{" "}
            <kbd className="px-1.5 py-0.5 bg-[hsl(var(--muted))] rounded text-xs font-mono">
              Esc
            </kbd>{" "}
            {t("common.toClose")}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--foreground))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition-colors"
            >
              {t("common.cancel")}
            </button>
            {showReplaceButton && (
              <button
                onClick={() => saveImage("save")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                {t("common.replaceImage")}
              </button>
            )}
            {showSaveAsCopyButton && (
              <button
                onClick={() => saveImage("saveAsCopy")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] transition-colors shadow-sm"
              >
                <Copy className="w-4 h-4" />
                {t("common.saveAsCopy")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
