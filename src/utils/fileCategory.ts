// Shared file-type categorization for local (not-yet-uploaded) File objects
// — used by both AttachmentPreview.tsx and any upload modal that wants a
// thumbnail/icon for the selected file. Split out of AttachmentPreview.tsx
// because mixing component and non-component exports in one file breaks
// React Fast Refresh (react-refresh/only-export-components).
export const getFileCategory = (file: File) => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.includes("pdf") || file.type.includes("text"))
    return "document";
  return "other";
};
