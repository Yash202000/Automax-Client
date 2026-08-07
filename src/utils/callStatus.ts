// Helpers for rendering a subtle agent-availability indicator derived from a
// user's `call_status` (offline / online / busy / in_call). Native <option>
// elements can only contain text, so we express the colored dot with a Unicode
// circle glyph: green = available, amber = on a call / busy, grey = offline.

export type CallStatusTone = "green" | "amber" | "grey";

export function callStatusTone(status?: string): CallStatusTone {
  switch (status) {
    case "online":
      return "green";
    case "in_call":
    case "busy":
      return "amber";
    default:
      // offline, unknown or unset
      return "grey";
  }
}

/** Colored circle glyph used to prefix assignee option labels. */
export function callStatusDot(status?: string): string {
  switch (callStatusTone(status)) {
    case "green":
      return "\u{1F7E2}"; // 🟢
    case "amber":
      return "\u{1F7E1}"; // 🟡
    default:
      return "\u{26AA}"; // ⚪
  }
}

/** Prefix an option label with the availability dot (kept subtle: dot + space). */
export function withCallStatusDot(label: string, status?: string): string {
  return `${callStatusDot(status)} ${label}`;
}
