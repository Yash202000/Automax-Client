import { format, formatDistanceToNow } from "date-fns";
import { API_URL } from "../../../../api/client";
import type { TransitionHistory } from "../../../../types";

export function formatDay(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function formatAgo(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

export function formatActivityDateTime(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function shortTime(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Same URL helpers as IncidentDetailPage: the base URL forces download
// (Content-Disposition: attachment), /preview renders inline.
export function getAttachmentUrl(attachmentId: string) {
  const token = localStorage.getItem("token");
  return `${API_URL}/attachments/${attachmentId}?token=${token}`;
}

export function getAttachmentPreviewUrl(attachmentId: string) {
  const token = localStorage.getItem("token");
  return `${API_URL}/attachments/${attachmentId}/preview?token=${token}`;
}

export function actorName(h?: TransitionHistory): string {
  const u = h?.performed_by;
  if (!u) return "—";
  return (
    [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "—"
  );
}

export function actorRole(h?: TransitionHistory): string {
  return h?.performed_by?.roles?.[0]?.name || "";
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export interface ExpiryCountdown {
  label: string;
  at: string;
}

// Pre-expiry countdown for ready-to-close / partial-close banners — same
// 0 < hours <= 24 window as IncidentDetailPage, null otherwise.
export function expiryCountdown(
  expiresAt?: string,
  active?: boolean,
): ExpiryCountdown | null {
  if (!expiresAt || !active) return null;
  const at = new Date(expiresAt);
  if (Number.isNaN(at.getTime())) return null;
  const hoursLeft = (at.getTime() - Date.now()) / 3_600_000;
  if (!(hoursLeft > 0 && hoursLeft <= 24)) return null;
  return {
    label: `${Math.floor(hoursLeft)}h ${Math.round((hoursLeft % 1) * 60)}m`,
    at: at.toLocaleString(),
  };
}
