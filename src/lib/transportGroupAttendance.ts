import type { SupabaseClient } from '@supabase/supabase-js';
import type { BusAttendanceMap, BusAttendanceStatus } from './transportBusAttendance';
import { attendanceStatusLabel } from './transportBusAttendance';

export type GroupAttendanceStatus = 'present' | 'absent';
export type GroupAttendanceMap = Record<string, GroupAttendanceStatus>;

export type GroupRosterCamper = {
  id: string;
  name: string;
  groupName: string;
  key: string;
};

export const normCamperName = (name: string) => name.trim().toLowerCase();

export function groupAttendanceRecordKey(groupName: string, camperName: string): string {
  return `${groupName.trim().toLowerCase()}|${normCamperName(camperName)}`;
}

export async function loadGroupRoster(
  supabase: SupabaseClient,
  companyId: string,
  season: string,
): Promise<GroupRosterCamper[]> {
  const { data, error } = await supabase
    .from('children')
    .select('id, name, group_name')
    .eq('company_id', companyId)
    .eq('season', season)
    .neq('status', 'inactive');

  if (error) {
    console.error('[Transport] Load group roster failed:', error.message);
    return [];
  }

  const out: GroupRosterCamper[] = [];
  for (const row of data ?? []) {
    const name = (row as { name?: string }).name?.trim();
    const groupName = (row as { group_name?: string }).group_name?.trim() || 'Unassigned';
    if (!name) continue;
    out.push({
      id: (row as { id: string }).id,
      name,
      groupName,
      key: groupAttendanceRecordKey(groupName, name),
    });
  }
  return out.sort((a, b) => a.groupName.localeCompare(b.groupName) || a.name.localeCompare(b.name));
}

export function buildCamperBusStatus(
  busRoster: { key: string; name: string }[],
  busAttendance: BusAttendanceMap,
): Map<string, BusAttendanceStatus | 'unmarked'> {
  const map = new Map<string, BusAttendanceStatus | 'unmarked'>();
  for (const c of busRoster) {
    const norm = normCamperName(c.name);
    if (map.has(norm)) continue;
    const label = attendanceStatusLabel(c.key, busAttendance);
    map.set(norm, label === 'Present' ? 'present' : label === 'Absent' ? 'absent' : 'unmarked');
  }
  return map;
}
