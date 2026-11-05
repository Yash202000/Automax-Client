/**
 * DUMMY dispatcher incidents. No backend calls: replace with real endpoints
 * once they exist.
 */
export type DispatchStatus =
  | "waiting"
  | "dispatched"
  | "resolved"
  | "completed";

export interface DummyIncident {
  id: string;
  number: string;
  title: string;
  title_ar: string;
  location: string;
  reportedAt: string;
  status: DispatchStatus;
  latitude: number;
  longitude: number;
  description: string;
  priority: number;
  priorityName: string;
  source: string;
  channel: string;
  department: string;
  slaDeadline: string;
  slaBreached: boolean;
  reporter: { name: string; phone: string };
  assignee: string;
  comments: { author: string; text: string; at: string }[];
  activity: { text: string; at: string }[];
}

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const SOURCES: [string, string][] = [
  ["Call Center", "Phone"],
  ["Mobile App", "App"],
  ["Web Portal", "Web"],
];

export const STATUS_COLORS: Record<DispatchStatus, string> = {
  waiting: "#f59e0b",
  dispatched: "#16a34a",
  resolved: "#0891b2",
  completed: "#6b7280",
};

const TITLES: [string, string][] = [
  ["Building fire", "حريق مبنى"],
  ["Vehicle fire", "حريق مركبة"],
  ["Gas leak", "تسرب غاز"],
  ["Road accident", "حادث مروري"],
  ["Rescue request", "طلب إنقاذ"],
  ["Warehouse fire", "حريق مستودع"],
];
const AREAS = [
  "Downtown",
  "North District",
  "East District",
  "South District",
  "West District",
  "Industrial Area",
];

// Deterministic pseudo-random so the data is stable between renders.
let seed = 42;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

export const DUMMY_INCIDENTS: DummyIncident[] = Array.from(
  { length: 60 },
  (_, i) => {
    const [title, title_ar] = TITLES[i % TITLES.length];
    const created = Date.now() - i * 17 * 60_000;
    const priority = (i % 4) + 1;
    const [source, channel] = SOURCES[i % SOURCES.length];
    const at = (mins: number) =>
      new Date(created + mins * 60_000).toISOString();
    return {
      id: `dummy-${i + 1}`,
      description: `${title} reported in ${AREAS[i % AREAS.length]}. Caller reports smoke and people nearby; immediate response requested.`,
      priority,
      priorityName: PRIORITIES[priority - 1],
      source,
      channel,
      department: i % 2 ? "Civil Defense" : "Emergency Operations",
      slaDeadline: at(60),
      slaBreached: i % 5 === 0,
      reporter: {
        name: ["Ahmed Al-Saud", "Sara Khan", "Omar Hassan"][i % 3],
        phone: `+966 50 ${String(1000000 + i * 137).slice(0, 3)} ${String(1000 + i).slice(-4)}`,
      },
      assignee: i % 3 === 0 ? "Khalid Al-Otaibi" : "Unassigned",
      comments: [
        {
          author: "Dispatcher",
          text: "Caller confirmed the address.",
          at: at(3),
        },
        {
          author: "Supervisor",
          text: "Check nearest available unit.",
          at: at(8),
        },
      ],
      activity: [
        { text: "Incident created", at: at(0) },
        { text: "Assigned to dispatcher queue", at: at(2) },
        ...(i % 3 === 0 ? [{ text: "Dispatched to unit", at: at(12) }] : []),
      ],
      number: `INC-${String(1000 + i + 1)}`,
      title,
      title_ar,
      location: AREAS[i % AREAS.length],
      reportedAt: new Date(Date.now() - i * 17 * 60_000).toISOString(),
      status: (
        [
          "dispatched",
          "waiting",
          "waiting",
          "resolved",
          "waiting",
          "completed",
        ] as const
      )[i % 6],
      latitude: 24.7136 + (rnd() - 0.5) * 0.35,
      longitude: 46.6753 + (rnd() - 0.5) * 0.45,
    };
  },
);

export interface DummyUnit {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

/** DUMMY response units scattered around the city. */
export const DUMMY_UNITS: DummyUnit[] = Array.from({ length: 14 }, (_, i) => ({
  id: `unit-${i + 1}`,
  name: `Unit ${i + 1}`,
  latitude: 24.7136 + (rnd() - 0.5) * 0.3,
  longitude: 46.6753 + (rnd() - 0.5) * 0.4,
}));
