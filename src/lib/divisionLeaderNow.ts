import type { SupabaseClient } from "@supabase/supabase-js";
import {
  activeScheduleRotationWeek,
  campWeekNumber,
  dayOfWeekFromYmd,
  groupScheduleSlotFromRow,
  hhmmToMinutes,
  sameScheduleLabel,
  scheduleGroupName,
  slotRotation,
  slotsAtTime,
  type GroupScheduleSlot,
} from "./groupSchedule";
import { campTimeHHmmFromIso } from "./campTime";
import {
  campWeekForScheduleLookup,
  loadEnrollmentWeekCalendar,
} from "./enrollmentWeekCalendar";
import { campProgramStartDate } from "./medicationStartDate";
import { resolvePermissionDivisionIds } from "./divisionFilterUtils";

const ROSTER_PAGE_SIZE = 1000;
const SCHEDULE_SLOT_PAGE = 1000;
const SCHEDULE_SLOT_SELECT =
  "id, upload_id, group_name, day_of_week, applies_on, start_time, end_time, activity, location";

export const DIVISION_LEADER_BANNER_MAX = 3;

export type DivisionLeaderNowLine = {
  groupName: string;
  activity: string;
  location: string;
  label: string;
  startMinutes: number;
  endMinutes: number;
};

export type DivisionLeaderBannerState = {
  visible: boolean;
  lines: DivisionLeaderNowLine[];
  message: string | null;
  nowMinutes: number;
  phase: "now" | "next" | "idle";
};

export function isDivisionLeaderRole(roles: string[] | null | undefined): boolean {
  return (roles ?? []).includes("division_leader");
}

export function uniqueRosterGroupNames(raw: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    const name = scheduleGroupName(value ?? "");
    if (!name || name.toLowerCase() === "unassigned") continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export function formatDivisionLeaderNowLine(slot: {
  groupName: string;
  activity: string;
}): string {
  const group = scheduleGroupName(slot.groupName);
  const activity = slot.activity.trim();
  if (!group) return activity;
  return activity ? `${group} · ${activity}` : group;
}

export function currentSlotsForGroups(
  slots: GroupScheduleSlot[],
  groupNames: string[],
  ymd: string,
  minutes: number,
  rotationWeek?: 1 | 2 | null,
): GroupScheduleSlot[] {
  const wanted = uniqueRosterGroupNames(groupNames);
  if (wanted.length === 0) return [];
  return slotsAtTime(slots, ymd, minutes, rotationWeek).filter((slot) =>
    wanted.some((name) => sameScheduleLabel(slot.groupName, name)),
  );
}

function linesFromSlots(rows: GroupScheduleSlot[]): DivisionLeaderNowLine[] {
  const seen = new Set<string>();
  const lines: DivisionLeaderNowLine[] = [];
  for (const slot of rows) {
    const groupName = scheduleGroupName(slot.groupName);
    const key = groupName.toLowerCase();
    if (!groupName || seen.has(key)) continue;
    seen.add(key);
    lines.push({
      groupName,
      activity: slot.activity.trim(),
      location: slot.location.trim(),
      label: formatDivisionLeaderNowLine(slot),
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
    });
  }
  return lines;
}

export function divisionLeaderNowLines(
  slots: GroupScheduleSlot[],
  groupNames: string[],
  ymd: string,
  minutes: number,
  rotationWeek?: 1 | 2 | null,
): DivisionLeaderNowLine[] {
  return linesFromSlots(currentSlotsForGroups(slots, groupNames, ymd, minutes, rotationWeek));
}

export function nextSlotsForGroups(
  slots: GroupScheduleSlot[],
  groupNames: string[],
  ymd: string,
  minutes: number,
  rotationWeek?: 1 | 2 | null,
): GroupScheduleSlot[] {
  const wanted = uniqueRosterGroupNames(groupNames);
  if (wanted.length === 0) return [];
  const day = dayOfWeekFromYmd(ymd);
  const upcoming = slots.filter((slot) => {
    if (!wanted.some((name) => sameScheduleLabel(slot.groupName, name))) return false;
    if (rotationWeek != null) {
      const week = slotRotation(slot);
      if (week != null && week !== rotationWeek) return false;
    }
    if (slot.appliesOn) {
      if (slot.appliesOn !== ymd) return false;
    } else if (slot.dayOfWeek !== day) return false;
    return slot.startMinutes > minutes;
  });
  const nextStart = Math.min(...upcoming.map((slot) => slot.startMinutes));
  if (!Number.isFinite(nextStart)) return [];
  return upcoming.filter((slot) => slot.startMinutes === nextStart);
}

export function campMinutesNow(now: Date = new Date()): number {
  return hhmmToMinutes(campTimeHHmmFromIso(now.toISOString())) ?? 0;
}

export function divisionLeaderBannerState(opts: {
  isDayCamp: boolean;
  isDl: boolean;
  groupNames: string[];
  slots: GroupScheduleSlot[];
  ymd: string;
  minutes: number;
  rotationWeek?: 1 | 2 | null;
}): DivisionLeaderBannerState {
  if (!opts.isDayCamp || !opts.isDl) {
    return { visible: false, lines: [], message: null, nowMinutes: opts.minutes, phase: "idle" };
  }
  const lines = divisionLeaderNowLines(
    opts.slots,
    opts.groupNames,
    opts.ymd,
    opts.minutes,
    opts.rotationWeek,
  );
  if (lines.length > 0) {
    return { visible: true, lines, message: null, nowMinutes: opts.minutes, phase: "now" };
  }
  const next = linesFromSlots(
    nextSlotsForGroups(opts.slots, opts.groupNames, opts.ymd, opts.minutes, opts.rotationWeek),
  );
  if (next.length > 0) {
    return { visible: true, lines: next, message: null, nowMinutes: opts.minutes, phase: "next" };
  }
  if (opts.groupNames.length === 0) {
    return { visible: true, lines: [], message: "No groups assigned yet", nowMinutes: opts.minutes, phase: "idle" };
  }
  if (opts.slots.length === 0) {
    return { visible: true, lines: [], message: "No schedule uploaded yet", nowMinutes: opts.minutes, phase: "idle" };
  }
  return { visible: true, lines: [], message: "No activity right now", nowMinutes: opts.minutes, phase: "idle" };
}

export async function loadDivisionLeaderDivisionIds(
  supabase: SupabaseClient,
  userId: string,
  companyId: string,
): Promise<string[]> {
  const { data: divPerms, error } = await supabase
    .from("division_permissions")
    .select("division_id")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .eq("can_access", true);
  if (error) {
    console.error("[DL now] division permissions", error.message);
    return [];
  }
  const rawIds = [...new Set((divPerms ?? []).map((row) => row.division_id as string).filter(Boolean))];
  if (rawIds.length === 0) return [];
  const { data: allDivisions } = await supabase
    .from("divisions")
    .select("id, name, is_active")
    .eq("company_id", companyId);
  return resolvePermissionDivisionIds(rawIds, allDivisions ?? []);
}

export async function loadDivisionLeaderGroupNames(
  supabase: SupabaseClient,
  companyId: string,
  season: string,
  divisionIds: string[],
  assignedGroups: string[] = [],
): Promise<string[]> {
  const names: Array<string | null | undefined> = [...assignedGroups];
  if (divisionIds.length > 0) {
    let from = 0;
    for (;;) {
      const to = from + ROSTER_PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("children")
        .select("group_name")
        .eq("company_id", companyId)
        .eq("season", season)
        .neq("status", "inactive")
        .in("division_id", divisionIds)
        .range(from, to);
      if (error) {
        console.error("[DL now] roster groups", error.message);
        break;
      }
      const page = data ?? [];
      for (const row of page) names.push((row as { group_name?: string | null }).group_name);
      if (page.length < ROSTER_PAGE_SIZE) break;
      from += ROSTER_PAGE_SIZE;
    }
  }
  return uniqueRosterGroupNames(names);
}

export async function loadDivisionLeaderScheduleSlots(
  supabase: SupabaseClient,
  companyId: string,
  season: string,
): Promise<GroupScheduleSlot[]> {
  const loaded: GroupScheduleSlot[] = [];
  for (let offset = 0; ; offset += SCHEDULE_SLOT_PAGE) {
    const { data, error } = await supabase
      .from("group_schedule_slots")
      .select(SCHEDULE_SLOT_SELECT)
      .eq("company_id", companyId)
      .eq("season", season)
      .order("id")
      .range(offset, offset + SCHEDULE_SLOT_PAGE - 1);
    if (error) {
      console.error("[DL now] schedule slots", error.message);
      return [];
    }
    const page = data ?? [];
    loaded.push(...page.map((row) => groupScheduleSlotFromRow(row as never)));
    if (page.length < SCHEDULE_SLOT_PAGE) break;
  }
  return loaded;
}

export async function loadDivisionLeaderRotationWeek(
  supabase: SupabaseClient,
  companyId: string,
  season: string,
  lookupDate: string,
  slots: GroupScheduleSlot[],
): Promise<1 | 2 | null> {
  const calendar = await loadEnrollmentWeekCalendar(supabase, companyId, season);
  const campWeek = campWeekForScheduleLookup(
    calendar,
    lookupDate,
    campProgramStartDate(season),
    campWeekNumber,
  );
  return activeScheduleRotationWeek(slots, campWeek);
}
