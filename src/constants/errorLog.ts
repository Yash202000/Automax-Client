export const MODULES = [
  "import",
  "call",
  "attachment",
  "incident",
  "integration",
  "contact",
  "auth",
];
export const SEVERITIES = ["low", "medium", "high", "critical"];
export const STATUSES = ["new", "in_review", "resolved", "ignored"];

export const SeverityColors: Record<string, string> = {
  low: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
  medium: "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]",
  high: "bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]",
  critical: "bg-[hsl(var(--destructive))] text-white",
};

export const StatusColors: Record<string, string> = {
  new: "bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]",
  in_review: "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]",
  resolved: "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]",
  ignored: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
};

export const FormatDateTime = (value: string): string =>
  new Date(value).toLocaleString();
