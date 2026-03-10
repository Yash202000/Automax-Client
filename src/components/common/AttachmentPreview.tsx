import { useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image,
  Film,
  Music,
  Archive,
} from "lucide-react";

const getFileCategory = (file: File) => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.includes("pdf") || file.type.includes("text"))
    return "document";
  return "other";
};

const FileIcon = ({
  file,
  className = "w-5 h-5",
}: {
  file: File;
  className?: string;
}) => {
  const cat = getFileCategory(file);
  if (cat === "image") return <Image className={className} />;
  if (cat === "video") return <Film className={className} />;
  if (cat === "audio") return <Music className={className} />;
  if (cat === "document") return <FileText className={className} />;
  return <Archive className={className} />;
};

export const AttachmentPreview = ({
  attachments,
  initialIndex,
  onClose,
}: {
  attachments: File[];
  initialIndex: number;
  onClose: () => void;
}) => {
  const [current, setCurrent] = useState(initialIndex);
  const file = attachments[current];
  const category = getFileCategory(file);
  const objectUrl = URL.createObjectURL(file);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col bg-card border border-border rounded-2xl shadow-2xl p-4"
        style={{ width: "580px", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">
            {current + 1} / {attachments.length}
          </span>
          <p className="text-sm font-medium text-foreground truncate max-w-[200px] mx-2">
            {file.name}
          </p>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Arrows */}
        {attachments.length > 1 && (
          <>
            <button
              onClick={() => setCurrent((i) => i - 1)}
              disabled={current === 0}
              className="absolute left-[-52px] top-1/2 -translate-y-1/2 text-primary bg-white/50 hover:bg-white rounded-full p-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrent((i) => i + 1)}
              disabled={current === attachments.length - 1}
              className="absolute right-[-52px] top-1/2 -translate-y-1/2 text-primary bg-white/50 hover:bg-white rounded-full p-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Preview content */}
        <div className="rounded-lg overflow-hidden bg-muted/50 border border-border">
          {category === "image" ? (
            <img
              src={objectUrl}
              alt={file.name}
              style={{
                width: "100%",
                maxHeight: "60vh",
                objectFit: "contain",
                display: "block",
              }}
            />
          ) : category === "video" ? (
            <video
              src={objectUrl}
              controls
              style={{ width: "100%", maxHeight: "60vh" }}
            />
          ) : category === "audio" ? (
            <div className="flex flex-col items-center gap-4 p-10">
              <Music className="w-16 h-16 text-muted-foreground" />
              <audio src={objectUrl} controls className="w-full" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 p-12 text-muted-foreground">
              <FileIcon file={file} className="w-16 h-16" />
              <p className="text-sm">Preview not available</p>
              <a
                href={objectUrl}
                download={file.name}
                className="text-xs text-primary hover:underline"
              >
                Download file
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground">
            {(file.size / 1024).toFixed(1)} KB
          </span>

          {attachments.length > 1 && (
            <div className="flex gap-1.5">
              {attachments.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === current ? 16 : 6,
                    height: 6,
                    background:
                      i === current
                        ? "hsl(var(--primary))"
                        : "hsl(var(--muted-foreground) / 0.3)",
                  }}
                />
              ))}
            </div>
          )}

          <span className="text-xs text-muted-foreground invisible">
            spacer
          </span>
        </div>
      </div>
    </div>
  );
};
