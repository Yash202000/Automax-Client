import React, { useState, useRef, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Home,
  Download,
  Eye,
  MessageSquare,
  Tag,
  X,
  Send,
  ArrowLeft,
  File,
  Image,
  FileSpreadsheet,
  Loader2,
  Filter,
  Trash2,
  Lock,
  History,
  Upload,
  RotateCcw,
} from "lucide-react";
import {
  useDocumentFiles,
  useDocumentSearch,
  useFileComments,
  useAddComment,
  useFileTags,
  useSetTags,
  useFileVersions,
  useUploadVersion,
  useRollbackVersion,
} from "../../hooks/useDocuments";
import { documentApi } from "../../api/documents";
import type { DmsFile } from "../../types/document";

// ──────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────

const MANDATORY_TAGS = [
  "goal_id",
  "goal_title",
  "goal_priority",
  "goal_status",
  "evidence_type",
  "uploaded_by",
  "uploaded_at",
  "source_system",
  "metric_id",
  "metric_name",
  "department",
];

const COMMON_TAG_FILTERS = [
  "goal_title",
  "evidence_type",
  "department",
  "metric_name",
  "uploaded_by",
  "goal_status",
];

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function getFileIcon(file: DmsFile) {
  if (file.type === "folder")
    return <FolderOpen size={20} className="text-amber-500" />;
  const mime = file.mime_type || "";
  if (mime.startsWith("image/"))
    return <Image size={20} className="text-purple-500" />;
  if (mime === "application/pdf")
    return <FileText size={20} className="text-red-500" />;
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".csv")
  )
    return <FileSpreadsheet size={20} className="text-green-500" />;
  return <File size={20} className="text-slate-400" />;
}

// ──────────────────────────────────────────────────
// Breadcrumbs
// ──────────────────────────────────────────────────

interface BreadcrumbItem {
  id: string;
  name: string;
}

function Breadcrumbs({
  path,
  onNavigate,
}: {
  path: BreadcrumbItem[];
  onNavigate: (index: number) => void;
}) {
  return (
    <nav className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 overflow-x-auto">
      <button
        onClick={() => onNavigate(-1)}
        className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 whitespace-nowrap"
      >
        <Home size={14} />
        <span>Automax</span>
      </button>
      {path.map((item, i) => (
        <React.Fragment key={item.id}>
          <ChevronRight size={14} className="flex-shrink-0 text-slate-300" />
          <button
            onClick={() => onNavigate(i)}
            className={`whitespace-nowrap ${
              i === path.length - 1
                ? "text-slate-900 dark:text-white font-medium"
                : "hover:text-blue-600 dark:hover:text-blue-400"
            }`}
          >
            {item.name}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
}

// ──────────────────────────────────────────────────
// File Detail Panel
// ──────────────────────────────────────────────────

function FileDetailPanel({
  file,
  onClose,
}: {
  file: DmsFile;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "info" | "comments" | "tags" | "versions"
  >("info");
  const { data: comments, isLoading: loadingComments } = useFileComments(
    file.uuid,
    activeTab === "comments",
  );
  const addComment = useAddComment(file.uuid);
  const { data: tags, isLoading: loadingTags } = useFileTags(
    file.uuid,
    activeTab === "tags",
  );
  const setTags = useSetTags(file.uuid);
  const [newComment, setNewComment] = useState("");
  const [newTagKey, setNewTagKey] = useState("");
  const [newTagValue, setNewTagValue] = useState("");

  // Versions
  const { data: versions, isLoading: loadingVersions } = useFileVersions(
    activeTab === "versions" ? file.uuid : "",
  );
  const uploadVersion = useUploadVersion();
  const rollbackVersion = useRollbackVersion();
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionDescription, setVersionDescription] = useState("");
  const [rollbackConfirm, setRollbackConfirm] = useState<string | null>(null);
  const versionFileInputRef = useRef<HTMLInputElement>(null);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment.mutate(newComment.trim(), {
      onSuccess: () => setNewComment(""),
    });
  };

  const handleAddTag = () => {
    if (!newTagKey.trim() || !newTagValue.trim()) return;
    const updated = { ...(tags || {}), [newTagKey.trim()]: newTagValue.trim() };
    setTags.mutate(updated, {
      onSuccess: () => {
        setNewTagKey("");
        setNewTagValue("");
      },
    });
  };

  const handleDeleteTag = (keyToRemove: string) => {
    const updated = { ...(tags || {}) };
    delete updated[keyToRemove];
    setTags.mutate(updated);
  };

  const handleUploadVersion = () => {
    if (!versionFile) return;
    uploadVersion.mutate(
      {
        fileId: file.uuid,
        file: versionFile,
        description: versionDescription.trim(),
      },
      {
        onSuccess: () => {
          setVersionFile(null);
          setVersionDescription("");
          if (versionFileInputRef.current) {
            versionFileInputRef.current.value = "";
          }
        },
      },
    );
  };

  const handleDownloadVersion = async (versionUuid: string) => {
    try {
      const blob = await documentApi.downloadVersion(versionUuid);
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // Error handled by API layer
    }
  };

  const handleRollback = (versionUuid: string) => {
    rollbackVersion.mutate(
      { fileId: file.uuid, versionUuid },
      { onSuccess: () => setRollbackConfirm(null) },
    );
  };

  const handleDownload = async () => {
    try {
      await documentApi.download(file.uuid, file.name);
    } catch {
      // Error toast is surfaced by the axios interceptor.
    }
  };

  const handlePreview = async () => {
    const res = await documentApi.getPreviewUrl(file.uuid);
    if (res.data?.url) {
      window.open(res.data.url, "_blank");
    }
  };

  const tabClass = (tab: string) =>
    `px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
      activeTab === tab
        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
    }`;

  // Split tags into system (mandatory) and custom
  const systemTags = useMemo(() => {
    if (!tags) return [];
    return MANDATORY_TAGS.map((key) => ({
      key,
      value: tags[key] ?? "",
    }));
  }, [tags]);

  const customTags = useMemo(() => {
    if (!tags) return [];
    return Object.entries(tags)
      .filter(([key]) => !MANDATORY_TAGS.includes(key))
      .map(([key, value]) => ({ key, value }));
  }, [tags]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700/60">
        <div className="flex items-center gap-3 min-w-0">
          {getFileIcon(file)}
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">
              {file.name}
            </h3>
            <p className="text-xs text-slate-500">
              {formatFileSize(file.size)} &middot;{" "}
              {file.mime_type || "Unknown type"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreview}
            className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            title="Preview"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg text-slate-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
            title="Download"
          >
            <Download size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-slate-200 dark:border-slate-700/60">
        <button className={tabClass("info")} onClick={() => setActiveTab("info")}>
          Info
        </button>
        <button
          className={tabClass("comments")}
          onClick={() => setActiveTab("comments")}
        >
          <MessageSquare size={14} className="inline mr-1" />
          Comments
        </button>
        <button
          className={tabClass("tags")}
          onClick={() => setActiveTab("tags")}
        >
          <Tag size={14} className="inline mr-1" />
          Tags
        </button>
        <button
          className={tabClass("versions")}
          onClick={() => setActiveTab("versions")}
        >
          <History size={14} className="inline mr-1" />
          Versions
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {activeTab === "info" && (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Name</dt>
              <dd className="text-slate-900 dark:text-white">{file.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Type</dt>
              <dd className="text-slate-900 dark:text-white">
                {file.mime_type || file.type}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Size</dt>
              <dd className="text-slate-900 dark:text-white tabular-nums">
                {formatFileSize(file.size)}
              </dd>
            </div>
            {file.created_at && (
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Created</dt>
                <dd className="text-slate-900 dark:text-white">
                  {new Date(file.created_at).toLocaleString()}
                </dd>
              </div>
            )}
            {file.updated_at && (
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Modified</dt>
                <dd className="text-slate-900 dark:text-white">
                  {new Date(file.updated_at).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        )}

        {activeTab === "comments" && (
          <div className="space-y-4">
            {/* Add comment */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddComment}
                disabled={addComment.isPending || !newComment.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            </div>

            {/* Comments list */}
            {loadingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : comments && comments.length > 0 ? (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {comment.author}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">
                No comments yet
              </p>
            )}
          </div>
        )}

        {activeTab === "tags" && (
          <div className="space-y-4">
            {loadingTags ? (
              <div className="flex justify-center py-4">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                {/* System Tags (read-only) */}
                {systemTags.some((t) => t.value) && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Lock size={10} />
                      System Tags
                    </h4>
                    <div className="space-y-1">
                      {systemTags
                        .filter((t) => t.value)
                        .map((t) => (
                          <div
                            key={t.key}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-700/30"
                          >
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              {t.key}
                            </span>
                            <span className="text-xs text-slate-700 dark:text-slate-300 max-w-[50%] truncate text-right">
                              {t.value}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Custom Tags (editable) */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Custom Tags
                  </h4>

                  {/* Add custom tag */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newTagKey}
                      onChange={(e) => setNewTagKey(e.target.value)}
                      placeholder="Key"
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={newTagValue}
                      onChange={(e) => setNewTagValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                      placeholder="Value"
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleAddTag}
                      disabled={
                        setTags.isPending ||
                        !newTagKey.trim() ||
                        !newTagValue.trim()
                      }
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Tag size={14} />
                    </button>
                  </div>

                  {customTags.length > 0 ? (
                    <div className="space-y-1">
                      {customTags.map((t) => (
                        <div
                          key={t.key}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 group"
                        >
                          <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                            {t.key}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-900 dark:text-white">
                              {t.value}
                            </span>
                            <button
                              onClick={() => handleDeleteTag(t.key)}
                              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove tag"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-2">
                      No custom tags
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "versions" && (
          <div className="space-y-4">
            {/* Upload New Version */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Upload New Version
              </h4>
              <input
                ref={versionFileInputRef}
                type="file"
                onChange={(e) =>
                  setVersionFile(e.target.files?.[0] ?? null)
                }
                className="w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600 dark:file:bg-blue-900/30 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40"
              />
              <textarea
                value={versionDescription}
                onChange={(e) => setVersionDescription(e.target.value)}
                placeholder="Version description (optional)"
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={handleUploadVersion}
                disabled={!versionFile || uploadVersion.isPending}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {uploadVersion.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                Upload Version
              </button>
            </div>

            {/* Versions List */}
            {loadingVersions ? (
              <div className="flex justify-center py-4">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : versions && versions.length > 0 ? (
              <div className="space-y-2">
                {versions.map((v) => (
                  <div
                    key={v.uuid}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-white tabular-nums">
                          v{v.version_number}
                        </span>
                        {v.is_current && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Current
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 tabular-nums">
                        {formatFileSize(v.size)}
                      </span>
                    </div>
                    {v.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 line-clamp-2">
                        {v.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                      <span>{v.created_by_name || v.created_by}</span>
                      <span>&middot;</span>
                      <span>
                        {new Date(v.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadVersion(v.uuid)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                        title="Download this version"
                      >
                        <Download size={12} />
                        Download
                      </button>
                      {!v.is_current && (
                        <>
                          {rollbackConfirm === v.uuid ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleRollback(v.uuid)}
                                disabled={rollbackVersion.isPending}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                              >
                                {rollbackVersion.isPending ? (
                                  <Loader2
                                    size={12}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <RotateCcw size={12} />
                                )}
                                Confirm
                              </button>
                              <button
                                onClick={() => setRollbackConfirm(null)}
                                className="px-2 py-1 text-xs font-medium rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRollbackConfirm(v.uuid)}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                              title="Rollback to this version"
                            >
                              <RotateCcw size={12} />
                              Rollback
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">
                No versions available
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Tag Filter Bar
// ──────────────────────────────────────────────────

function TagFilterBar({
  tags,
  onChange,
}: {
  tags: Record<string, string>;
  onChange: (tags: Record<string, string>) => void;
}) {
  const [filterKey, setFilterKey] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [expanded, setExpanded] = useState(false);

  const activeFilters = Object.entries(tags);

  const handleAdd = () => {
    if (!filterKey.trim() || !filterValue.trim()) return;
    onChange({ ...tags, [filterKey.trim()]: filterValue.trim() });
    setFilterKey("");
    setFilterValue("");
  };

  const handleRemove = (key: string) => {
    const updated = { ...tags };
    delete updated[key];
    onChange(updated);
  };

  const handleChipClick = (tagName: string) => {
    setFilterKey(tagName);
    setFilterValue("");
    setExpanded(true);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors rounded-xl"
      >
        <span className="flex items-center gap-2">
          <Filter size={14} />
          Filter by Tags
          {activeFilters.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-bold">
              {activeFilters.length}
            </span>
          )}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-700/40 pt-3">
          {/* Quick filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {COMMON_TAG_FILTERS.map((tag) => (
              <button
                key={tag}
                onClick={() => handleChipClick(tag)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  filterKey === tag
                    ? "border-blue-400 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700"
                    : "border-slate-200 dark:border-slate-600 text-slate-500 hover:border-blue-300 hover:text-blue-500"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Custom filter input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={filterKey}
              onChange={(e) => setFilterKey(e.target.value)}
              placeholder="Tag key"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Tag value"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAdd}
              disabled={!filterKey.trim() || !filterValue.trim()}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </div>

          {/* Active filters */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs"
                >
                  <span className="font-mono font-medium">{key}</span>
                  <span className="text-blue-400">=</span>
                  <span>{value}</span>
                  <button
                    onClick={() => handleRemove(key)}
                    className="p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <button
                onClick={() => onChange({})}
                className="text-xs text-slate-400 hover:text-red-500"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────

export function DocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [folderPath, setFolderPath] = useState<BreadcrumbItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<DmsFile | null>(null);
  const [searchTags, setSearchTags] = useState<Record<string, string>>({});

  // Deep-link: ?file=<uuid> navigates into the file's parent folder and opens
  // the file detail panel. Used by "Open in Documents" links from evidence
  // cards so users can jump straight to a file's context without manually
  // walking the folder tree.
  const deepLinkFileId = searchParams.get("file");
  useEffect(() => {
    if (!deepLinkFileId) return;
    let cancelled = false;
    (async () => {
      try {
        // Fetch file info + folder chain in parallel.
        const [infoRes, breadcrumbRes] = await Promise.all([
          documentApi.getFileInfo(deepLinkFileId),
          documentApi.getFileBreadcrumb(deepLinkFileId),
        ]);
        if (cancelled) return;
        if (breadcrumbRes?.data?.breadcrumb) {
          setFolderPath(
            breadcrumbRes.data.breadcrumb.map((entry) => ({
              id: entry.uuid,
              name: entry.name,
            })),
          );
        }
        if (infoRes?.data) {
          setSelectedFile(infoRes.data);
        }
      } catch {
        // file not found or not accessible — silently ignore; user lands on root
      }
      if (!cancelled) {
        const next = new URLSearchParams(searchParams);
        next.delete("file");
        setSearchParams(next, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkFileId]);

  const currentParentId =
    folderPath.length > 0 ? folderPath[folderPath.length - 1].id : undefined;

  const hasTagFilters = Object.keys(searchTags).length > 0;
  const isSearching = searchQuery.length > 0 || hasTagFilters;

  const { data: fileList, isLoading: loadingFiles } =
    useDocumentFiles(currentParentId);
  const { data: searchResults, isLoading: loadingSearch } = useDocumentSearch(
    searchQuery,
    hasTagFilters ? searchTags : undefined,
    isSearching,
  );

  const displayFiles = useMemo(() => {
    if (isSearching && searchResults) return searchResults.files || [];
    if (fileList) return fileList.files || [];
    return [];
  }, [isSearching, searchResults, fileList]);

  const isLoading = isSearching ? loadingSearch : loadingFiles;

  // Sort: folders first, then files alphabetically
  const sortedFiles = useMemo(() => {
    return [...displayFiles].sort((a, b) => {
      if (a.type === "folder" && b.type !== "folder") return -1;
      if (a.type !== "folder" && b.type === "folder") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [displayFiles]);

  const handleFolderClick = (folder: DmsFile) => {
    setFolderPath((prev) => [...prev, { id: folder.uuid, name: folder.name }]);
    setSelectedFile(null);
    setSearchQuery("");
    setSearchInput("");
    setSearchTags({});
  };

  const handleFileClick = (file: DmsFile) => {
    if (file.type === "folder") {
      handleFolderClick(file);
    } else {
      setSelectedFile(file);
    }
  };

  const handleBreadcrumbNavigate = (index: number) => {
    if (index < 0) {
      setFolderPath([]);
    } else {
      setFolderPath((prev) => prev.slice(0, index + 1));
    }
    setSelectedFile(null);
    setSearchQuery("");
    setSearchInput("");
    setSearchTags({});
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    setSelectedFile(null);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchInput("");
    setSearchTags({});
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Documents
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse and manage files in the Automax document management system
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search files and folders..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
        {isSearching && (
          <button
            type="button"
            onClick={clearSearch}
            className="px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      {/* Tag Filter */}
      <TagFilterBar tags={searchTags} onChange={setSearchTags} />

      {/* Breadcrumbs (hide during search) */}
      {!isSearching && (
        <Breadcrumbs path={folderPath} onNavigate={handleBreadcrumbNavigate} />
      )}

      {isSearching && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button
            onClick={clearSearch}
            className="flex items-center gap-1 hover:text-blue-600"
          >
            <ArrowLeft size={14} />
            Back to browsing
          </button>
          <span>
            &middot; {searchResults?.total ?? sortedFiles.length} result
            {(searchResults?.total ?? sortedFiles.length) !== 1 ? "s" : ""}
            {searchQuery && <> for &ldquo;{searchQuery}&rdquo;</>}
            {hasTagFilters && !searchQuery && <> matching tag filters</>}
            {hasTagFilters && searchQuery && <> with tag filters</>}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File List */}
        <div className={selectedFile ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2
                  size={24}
                  className="animate-spin text-slate-400 mr-2"
                />
                <span className="text-slate-500">Loading...</span>
              </div>
            ) : sortedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <FolderOpen size={48} className="mb-3 opacity-50" />
                <p className="text-sm">
                  {isSearching ? "No files found" : "This folder is empty"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
                {sortedFiles.map((file) => (
                  <button
                    key={file.uuid}
                    onClick={() => handleFileClick(file)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${
                      selectedFile?.uuid === file.uuid
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : ""
                    }`}
                  >
                    {getFileIcon(file)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {file.type === "folder"
                          ? "Folder"
                          : formatFileSize(file.size)}
                        {file.updated_at &&
                          ` · ${new Date(file.updated_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    {file.type === "folder" && (
                      <ChevronRight
                        size={16}
                        className="text-slate-300 flex-shrink-0"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedFile && (
          <div className="lg:col-span-1">
            <FileDetailPanel
              file={selectedFile}
              onClose={() => setSelectedFile(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
