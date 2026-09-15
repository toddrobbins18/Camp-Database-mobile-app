import { compareByLastName } from './nameSortUtils';
import { supabase } from './supabase';

export type BraceletColor = 'Red' | 'Orange' | 'Yellow' | 'Green' | 'Blue';
export type SkillStatus = 'Achieved' | 'Working Towards' | '—';
export type LevelStatus = 'Complete' | 'Incomplete' | '—';

export interface RosterChild {
  id: string;
  name: string;
  group_name: string | null;
  leader: { name: string } | null;
}

export interface BraceletRecord {
  id: string;
  name: string;
  group: string;
  divisionLeader: string;
  currentBracelet: BraceletColor | '';
  proctor1: string;
  date1: string;
  note1: string;
  proctor2: string;
  date2: string;
  note2: string;
  proctor3: string;
  date3: string;
  note3: string;
  emailSent: boolean;
}

export interface LevelRecord {
  id: string;
  name: string;
  group: string;
  goldfish: SkillStatus[];
  goldfishLevel: LevelStatus;
  minnow: SkillStatus[];
  minnowLevel: LevelStatus;
  tadpole: SkillStatus[];
  tadpoleLevel: LevelStatus;
  redCross: LevelStatus;
  redCross2: LevelStatus;
  redCross3: LevelStatus;
  redCross4: LevelStatus;
  frog: LevelStatus;
  lastModified: string;
}

export const PROCTORS = ['MF', 'JT', 'VS', 'KL', 'AR'];
export const BRACELETS: BraceletColor[] = ['Red', 'Orange', 'Yellow', 'Green', 'Blue'];
export const PASS_OPTIONS = ['Passed', 'Did Not Pass', 'Retest'] as const;
export const SKILL_OPTIONS: SkillStatus[] = ['—', 'Achieved', 'Working Towards'];
export const LEVEL_OPTIONS: LevelStatus[] = ['—', 'Complete', 'Incomplete'];
export const DATE_FMT = 'MMMM d, yyyy';
export const CAMPERS_PAGE_SIZE = 1000;

export function levelFromSkills(skills: SkillStatus[]): LevelStatus {
  if (skills.every((s) => s === 'Achieved')) return 'Complete';
  if (skills.some((s) => s !== '—')) return 'Incomplete';
  return '—';
}

const emptySkills4 = (): SkillStatus[] => ['—', '—', '—', '—'];
const emptySkills6 = (): SkillStatus[] => ['—', '—', '—', '—', '—', '—'];

export function rosterGroup(child: RosterChild): string {
  return child.group_name?.trim() || '—';
}

export function rosterDivisionLeader(child: RosterChild): string {
  return child.leader?.name?.trim() || '—';
}

export function braceletFromChild(child: RosterChild): BraceletRecord {
  return {
    id: child.id,
    name: child.name,
    group: rosterGroup(child),
    divisionLeader: rosterDivisionLeader(child),
    currentBracelet: '',
    proctor1: '',
    date1: '',
    note1: '',
    proctor2: '',
    date2: '',
    note2: '',
    proctor3: '',
    date3: '',
    note3: '',
    emailSent: false,
  };
}

export function levelFromChild(child: RosterChild): LevelRecord {
  const goldfish = emptySkills4();
  const minnow = emptySkills6();
  const tadpole = emptySkills4();
  return {
    id: child.id,
    name: child.name,
    group: rosterGroup(child),
    goldfish,
    goldfishLevel: levelFromSkills(goldfish),
    minnow,
    minnowLevel: levelFromSkills(minnow),
    tadpole,
    tadpoleLevel: levelFromSkills(tadpole),
    redCross: '—',
    redCross2: '—',
    redCross3: '—',
    redCross4: '—',
    frog: '—',
    lastModified: '—',
  };
}

export function mergeBracelets(existing: Map<string, BraceletRecord>, children: RosterChild[]): BraceletRecord[] {
  return children.map((child) => {
    const prev = existing.get(child.id);
    const rosterFields = {
      name: child.name,
      group: rosterGroup(child),
      divisionLeader: rosterDivisionLeader(child),
    };
    return prev ? { ...prev, ...rosterFields } : braceletFromChild(child);
  });
}

export function mergeLevels(existing: Map<string, LevelRecord>, children: RosterChild[]): LevelRecord[] {
  return children.map((child) => {
    const prev = existing.get(child.id);
    const rosterFields = { name: child.name, group: rosterGroup(child) };
    return prev ? { ...prev, ...rosterFields } : levelFromChild(child);
  });
}

export async function fetchSwimRosterChildren(companyId: string, season: string): Promise<RosterChild[]> {
  const rows: RosterChild[] = [];
  let from = 0;

  for (;;) {
    const to = from + CAMPERS_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('children')
      .select('id, name, group_name, leader:leader_id(name)')
      .eq('company_id', companyId)
      .eq('season', season)
      .neq('status', 'inactive')
      .order('name')
      .range(from, to);

    if (error) throw error;
    const batch = (data ?? []) as RosterChild[];
    rows.push(...batch);
    if (batch.length < CAMPERS_PAGE_SIZE) break;
    from += CAMPERS_PAGE_SIZE;
  }

  rows.sort(compareByLastName);
  return rows;
}
