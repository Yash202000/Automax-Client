import React, { useState } from "react";
import {
  X,
  Folder,
  FolderPlus,
  ChevronRight,
  Check,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { KpiMasterDataEntityType } from "../../types/kpi";
import { KPI_ROOT_FOLDER_OPTIONS } from "../../types/kpi";
import { Select } from "../ui/Input";
import {
  useKpiDocumentaAnchor,
  useKpiDocumentaFolders,
  useCreateKpiDocumentaFolder,
} from "../../hooks/useKpi";

interface DocumentaFolderPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string, folderPath: string[]) => void;
  currentFolderId?: string;
  currentFolderPath?: string[];
}

// Modal folder browser/creator for the "KPI Evidence Folder Configuration"
// feature. Root Folder is a single pick from the seven fixed KPI Master
// Data categories (Pillars/Enablers/Objectives Hierarchy/Initiatives/
// Domains/Award Criteria/Award Sub-Criteria) — each one IS a top-level
// Documenta folder, not tied to whichever taxonomy the KPI being configured
// belongs to. From there the user browses/creates sub-folders freehand.
export const DocumentaFolderPicker: React.FC<DocumentaFolderPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentFolderId,
  currentFolderPath,
}) => {
  const [rootFolder, setRootFolder] = useState<KpiMasterDataEntityType | "">(
    "",
  );
  const [crumbs, setCrumbs] = useState<{ id: string; name: string }[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);

  const anchor = useKpiDocumentaAnchor(
    rootFolder ? { entity_type: rootFolder } : {},
  );

  const anchorId = anchor.data?.anchor_folder_id;
  const currentParentId =
    crumbs.length > 0 ? crumbs[crumbs.length - 1].id : anchorId;
  const folders = useKpiDocumentaFolders(anchorId, currentParentId);
  const createFolder = useCreateKpiDocumentaFolder();

  if (!isOpen) return null;

  const handleClose = () => {
    setRootFolder("");
    setCrumbs([]);
    setShowNewFolder(false);
    setNewFolderName("");
    onClose();
  };

  const currentPath = [
    ...(anchor.data?.anchor_path ?? []),
    ...crumbs.map((c) => c.name),
  ];

  const handleCreateFolder = async () => {
    if (!anchorId || !newFolderName.trim()) return;
    try {
      const res = await createFolder.mutateAsync({
        anchorId,
        parentId: currentParentId,
        name: newFolderName.trim(),
      });
      if (res.data) {
        setCrumbs((prev) => [
          ...prev,
          { id: res.data!.uuid, name: res.data!.name },
        ]);
      }
      setNewFolderName("");
      setShowNewFolder(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create folder");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Select Evidence Folder
          </h3>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {currentFolderId && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 p-3">
              <div className="text-sm text-teal-700 dark:text-teal-300 min-w-0">
                <span className="block text-xs uppercase tracking-wide text-teal-500 dark:text-teal-400">
                  Currently configured
                </span>
                <span className="font-medium break-words">
                  {(currentFolderPath ?? []).join(" / ") || currentFolderId}
                </span>
              </div>
              <button
                onClick={() => onSelect("", [])}
                className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline shrink-0"
              >
                <XCircle size={14} /> Remove
              </button>
            </div>
          )}

          <Select
            label="Root Folder"
            value={rootFolder}
            onChange={(e) => {
              setRootFolder(e.target.value as KpiMasterDataEntityType);
              setCrumbs([]);
            }}
            options={KPI_ROOT_FOLDER_OPTIONS}
            placeholder="Choose a root folder"
          />

          {!rootFolder && (
            <p className="text-sm text-slate-400">
              Pick a root folder above to browse its Documenta folders.
            </p>
          )}

          {rootFolder && anchor.isLoading && (
            <p className="text-sm text-slate-400">Resolving folder…</p>
          )}

          {rootFolder && anchor.data && !anchor.data.resolvable && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {anchor.data.reason ||
                "This root doesn't resolve to a folder yet."}
            </p>
          )}

          {rootFolder && anchor.data?.resolvable && (
            <>
              <div className="flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                <button
                  onClick={() => setCrumbs([])}
                  className="hover:text-teal-600 dark:hover:text-teal-400"
                >
                  {anchor.data.anchor_path[
                    anchor.data.anchor_path.length - 1
                  ] ?? "Root"}
                </button>
                {crumbs.map((crumb, i) => (
                  <React.Fragment key={crumb.id}>
                    <ChevronRight size={14} />
                    <button
                      onClick={() => setCrumbs((prev) => prev.slice(0, i + 1))}
                      className="hover:text-teal-600 dark:hover:text-teal-400"
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-700/60">
                {folders.isLoading && (
                  <p className="p-3 text-sm text-slate-400">Loading folders…</p>
                )}
                {!folders.isLoading && (folders.data ?? []).length === 0 && (
                  <p className="p-3 text-sm text-slate-400">
                    No sub-folders here yet.
                  </p>
                )}
                {(folders.data ?? []).map((folder) => (
                  <div
                    key={folder.uuid}
                    className="flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  >
                    <button
                      onClick={() =>
                        setCrumbs((prev) => [
                          ...prev,
                          { id: folder.uuid, name: folder.name },
                        ])
                      }
                      className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 flex-1 text-left"
                    >
                      <Folder size={16} className="text-amber-500" />
                      {folder.name}
                    </button>
                    <button
                      onClick={() =>
                        onSelect(folder.uuid, [...currentPath, folder.name])
                      }
                      className="text-xs px-2 py-1 rounded-md bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/50 flex items-center gap-1"
                    >
                      <Check size={12} /> Select
                    </button>
                  </div>
                ))}
              </div>

              {showNewFolder ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New folder name"
                    className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-sm text-slate-900 dark:text-white"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateFolder}
                    disabled={createFolder.isPending || !newFolderName.trim()}
                    className="text-sm px-3 py-1.5 rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowNewFolder(false);
                      setNewFolderName("");
                    }}
                    className="text-sm px-2 py-1.5 text-slate-500"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewFolder(true)}
                  className="flex items-center gap-1.5 text-sm text-teal-600 dark:text-teal-400 hover:underline"
                >
                  <FolderPlus size={16} /> New Folder
                </button>
              )}

              <button
                onClick={() => onSelect(currentParentId as string, currentPath)}
                className="w-full text-sm px-3 py-2 rounded-md border border-teal-600 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20"
              >
                Use current folder ({currentPath.join(" / ") || "root"})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
