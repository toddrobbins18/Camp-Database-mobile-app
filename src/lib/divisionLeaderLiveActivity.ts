import { campDateTimeToIso } from "./campTime";

const LIVE_ACTIVITY_MAX = 3;

export type LiveActivityLine = {
  groupName: string;
  activity: string;
  startMinutes: number;
  endMinutes: number;
};

export type LiveActivityBanner = {
  visible: boolean;
  lines: LiveActivityLine[];
  phase: "now" | "next" | "idle";
};

export type DivisionLeaderLiveActivityContent = {
  title: string;
  subtitle: string;
  endMs: number;
  key: string;
};

function uniqueKeepOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function minutesToHhmm(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function campMinutesToEpochMs(ymd: string, minutes: number): number {
  return new Date(campDateTimeToIso(ymd, minutesToHhmm(minutes))).getTime();
}

export function divisionLeaderLiveActivityContent(
  state: LiveActivityBanner,
  ymd: string,
  opts?: { allowIdle?: boolean },
): DivisionLeaderLiveActivityContent | null {
  if (!state.visible) return null;
  if (state.lines.length === 0) {
    if (!opts?.allowIdle) return null;
    return {
      title: "Camp schedule",
      subtitle: "No activity right now",
      endMs: Date.now() + 15 * 60 * 1000,
      key: "idle",
    };
  }
  const shown = state.lines.slice(0, LIVE_ACTIVITY_MAX);
  const activities = uniqueKeepOrder(shown.map((line) => line.activity));
  const groups = uniqueKeepOrder(shown.map((line) => line.groupName));
  const activityLabel = activities.join(" · ") || "Activity";
  const title = state.phase === "next" ? `Next: ${activityLabel}` : activityLabel;
  const subtitle = groups.join(" · ");
  const targetMinutes =
    state.phase === "next"
      ? Math.min(...shown.map((line) => line.startMinutes))
      : Math.min(...shown.map((line) => line.endMinutes));
  const endMs = campMinutesToEpochMs(ymd, targetMinutes);
  return {
    title,
    subtitle,
    endMs,
    key: `${state.phase}|${title}|${subtitle}|${endMs}`,
  };
}
