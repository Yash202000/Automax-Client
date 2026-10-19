/**
 * Static Tailwind class maps for the dark ops-center incident look.
 * All classes are full literals so Tailwind can detect them (no dynamic
 * `bg-${color}-...` interpolation).
 */

export type IncidentStateTone =
  | "blue"
  | "rose"
  | "amber"
  | "emerald"
  | "indigo"
  | "sky"
  | "slate"
  | "orange";

interface ToneClasses {
  pill: string;
  dot: string;
}

const TONES: Record<IncidentStateTone, ToneClasses> = {
  blue: {
    pill: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30",
    dot: "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]",
  },
  rose: {
    pill: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30",
    dot: "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]",
  },
  amber: {
    pill: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
  },
  emerald: {
    pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]",
  },
  indigo: {
    pill: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30",
    dot: "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]",
  },
  sky: {
    pill: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30",
    dot: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]",
  },
  orange: {
    pill: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30",
    dot: "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]",
  },
  slate: {
    pill: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/30",
    dot: "bg-slate-400",
  },
};

/** Map a workflow-state name to the ops-center tone. */
export function stateTone(stateName?: string | null): ToneClasses {
  const n = (stateName || "").toLowerCase();
  if (/(closed|resolved|final close|approve)/.test(n)) return TONES.emerald;
  if (/reject/.test(n)) return TONES.rose;
  if (/ready to close|partial close/.test(n)) return TONES.amber;
  if (/under review|review/.test(n) && !/await/.test(n)) return TONES.rose;
  if (/await|pending|missing/.test(n)) return TONES.amber;
  if (/under resolution|in progress|progress/.test(n)) return TONES.indigo;
  if (/reopen/.test(n)) return TONES.orange;
  if (/new|open|initial|created|escalat/.test(n)) return TONES.blue;
  return TONES.slate;
}

export interface PriorityTone {
  text: string;
  icon: "star" | "dot";
  dot: string;
}

export function priorityTone(name?: string | null): PriorityTone | null {
  if (!name) return null;
  const n = name.toLowerCase();
  if (/critical|urgent|highest|high/.test(n))
    return {
      text: "text-rose-700 dark:text-rose-400",
      icon: "dot",
      dot: "bg-rose-400",
    };
  if (/medium|med|moderate|normal/.test(n))
    return {
      text: "text-amber-700 dark:text-amber-400",
      icon: "star",
      dot: "bg-amber-400",
    };
  if (/low|minor/.test(n))
    return {
      text: "text-slate-600 dark:text-slate-400",
      icon: "dot",
      dot: "bg-emerald-400",
    };
  return {
    text: "text-slate-600 dark:text-slate-400",
    icon: "dot",
    dot: "bg-slate-400",
  };
}
