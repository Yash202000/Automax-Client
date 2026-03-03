import React, { useEffect, useRef } from "react";
import { Canvas, FabricImage, Rect, Textbox } from "fabric";
import {
    X,
    Square,
    Type,
    Trash2,
    Save,
    RotateCcw,
    ImageIcon,
    Copy
} from "lucide-react";

export default function ImageEditor({
    isOpen,
    imageUrl,
    onClose,
    onSave,
    onSaveAsCopy,
    showReplaceButton = true,
    showSaveAsCopyButton = true
}: {
    isOpen: boolean;
    imageUrl: string;
    onClose: () => void;
    onSaveAsCopy: (editedImage: string) => void;
    onSave: (editedImage: string) => void;
    showReplaceButton?: boolean;
    showSaveAsCopyButton?: boolean;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<Canvas>(null);

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

        FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
            if (isAborted) return;

            const maxWidth = 800;
            const maxHeight = 500;

            let width = img.width;
            let height = img.height;

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
                originX: 'left',
                originY: 'top'
            });

            canvas.backgroundImage = img;
            canvas.renderAll();
        });

        return () => {
            isAborted = true;
            if (canvas) {
                canvas.dispose();
            } else if (fabricRef.current) {
                fabricRef.current.dispose();
            }
        };
    }, [isOpen, imageUrl]);

    const addRectangle = () => {
        fabricRef?.current?.add(
            new Rect({
                left: 100,
                top: 100,
                width: 150,
                height: 100,
                fill: "transparent",
                stroke: "#ef4444",
                strokeWidth: 2,
            })
        );
    };

    const addText = () => {
        fabricRef?.current?.add(
            new Textbox("Edit me", {
                left: 200,
                top: 200,
                fontSize: 22,
                fill: "#ffffff",
                fontFamily: "Inter, sans-serif",
            })
        );
        fabricRef?.current?.renderAll();
    };

    const clearSelection = () => {
        const active = fabricRef?.current?.getActiveObject();
        if (active) {
            fabricRef?.current?.remove(active);
            fabricRef?.current?.renderAll();
        }
    };

    const resetCanvas = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        // Remove all objects but keep background
        canvas.getObjects().forEach((obj) => canvas.remove(obj));
        canvas.renderAll();
    };

    const saveImage = (type: string) => {
        const edited = fabricRef?.current?.toDataURL({
            format: "png",
            quality: 1,
            multiplier: 2,
        });
        if (type === 'save') {
            onSave(edited || "");
        } else {
            onSaveAsCopy(edited || "");
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative flex flex-col bg-[hsl(var(--card))] rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200 overflow-hidden max-w-[900px] w-full">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[hsl(var(--primary)/0.1)] rounded-lg">
                            <ImageIcon className="w-5 h-5 text-[hsl(var(--primary))]" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">
                                Image Editor
                            </h3>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                Add annotations, text, or shapes to the image
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
                        title="Close (Esc)"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-2 px-6 py-3 bg-[hsl(var(--muted)/0.4)] border-b border-[hsl(var(--border))]">
                    <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] mr-2 uppercase tracking-wider">
                        Tools
                    </span>

                    <button
                        onClick={addRectangle}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] hover:border-[hsl(var(--primary)/0.4)] transition-all"
                        title="Add Rectangle"
                    >
                        <Square className="w-4 h-4 text-red-500" />
                        Rectangle
                    </button>

                    <button
                        onClick={addText}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] hover:border-[hsl(var(--primary)/0.4)] transition-all"
                        title="Add Text"
                    >
                        <Type className="w-4 h-4 text-blue-500" />
                        Text
                    </button>

                    <div className="w-px h-6 bg-[hsl(var(--border))] mx-1" />

                    <button
                        onClick={clearSelection}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
                        title="Delete selected object"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Selected
                    </button>

                    <button
                        onClick={resetCanvas}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-all"
                        title="Reset all annotations"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </button>
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
                        Click an object to select it • Press <kbd className="px-1.5 py-0.5 bg-[hsl(var(--muted))] rounded text-xs font-mono">Esc</kbd> to close
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--foreground))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition-colors"
                        >
                            Cancel
                        </button>
                        {showReplaceButton && (
                            <button
                                onClick={() => saveImage('save')}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] transition-colors shadow-sm"
                            >
                                <Save className="w-4 h-4" />
                                Replace Image
                            </button>)}
                        {showSaveAsCopyButton && (
                            <button
                                onClick={() => saveImage('saveAsCopy')}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] transition-colors shadow-sm"
                            >
                                <Copy className="w-4 h-4" />
                                Save as Copy
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}