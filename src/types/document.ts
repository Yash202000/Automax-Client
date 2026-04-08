// ──────────────────────────────────────────────────
// Documenta / MyDocs DMS Types
// ──────────────────────────────────────────────────

export interface DmsFile {
  uuid: string;
  name: string;
  type: "file" | "folder";
  size: number;
  mime_type: string;
  parent: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, string>;
}

export interface DmsComment {
  id: string;
  file_id: string;
  author: string;
  content: string;
  created_at: string;
}

export interface DmsListResult {
  files: DmsFile[];
}

export interface DmsSearchResult {
  files: DmsFile[];
  total: number;
}
