import { supabase } from './supabase';
import { filterActiveRoster } from './rosterStatus';

const ROSTER_PAGE_SIZE = 1000;

type RosterChildRow = {
  id: string;
  name: string;
  gender: string | null;
  grade: string | null;
  group_name: string | null;
  status: string | null;
  division: { name: string } | null;
};

export type BunkingRosterCamper = {
  id: string;
  name: string;
  division: string;
  gender?: string;
  town?: string;
  requests?: string[];
  disrequests?: string[];
};

function mapBunkingRosterChild(child: RosterChildRow): BunkingRosterCamper {
  return {
    id: child.id,
    name: child.name,
    gender: child.gender || undefined,
    division:
      child.division?.name?.trim() ||
      child.grade?.trim() ||
      child.group_name?.trim() ||
      '',
    town: '',
    requests: [],
    disrequests: [],
  };
}

export async function fetchBunkingCampersFromRoster(
  companyId: string,
  season: string,
): Promise<BunkingRosterCamper[]> {
  const rows: RosterChildRow[] = [];
  let from = 0;

  for (;;) {
    const to = from + ROSTER_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('children')
      .select(`
        id,
        name,
        gender,
        grade,
        group_name,
        status,
        division:division_id(name)
      `)
      .eq('company_id', companyId)
      .eq('season', season)
      .neq('status', 'inactive')
      .order('name')
      .range(from, to);

    if (error) throw error;

    const batch = (data as RosterChildRow[] | null) ?? [];
    rows.push(...batch);
    if (batch.length < ROSTER_PAGE_SIZE) break;
    from += ROSTER_PAGE_SIZE;
  }

  return filterActiveRoster(rows).map(mapBunkingRosterChild);
}
