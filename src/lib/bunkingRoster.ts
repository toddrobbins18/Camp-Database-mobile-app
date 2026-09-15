import { supabase } from './supabase';

type RosterChildRow = {
  id: string;
  name: string;
  gender: string | null;
  grade: string | null;
  group_name: string | null;
  category: string | null;
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

function isActiveRosterStatus(status: unknown): boolean {
  if (status == null) return true;
  const s = String(status).trim().toLowerCase();
  if (!s) return true;
  return s !== 'inactive' && s !== 'withdrawn';
}

export async function fetchBunkingCampersFromRoster(
  companyId: string,
  season: string,
): Promise<BunkingRosterCamper[]> {
  const { data, error } = await supabase
    .from('children')
    .select(`
      id,
      name,
      gender,
      grade,
      group_name,
      category,
      status,
      division:division_id(name)
    `)
    .eq('company_id', companyId)
    .eq('season', season)
    .order('name');

  if (error) throw error;

  return (data as RosterChildRow[] | null || [])
    .filter((child) => isActiveRosterStatus(child.status))
    .map((child) => ({
      id: child.id,
      name: child.name,
      gender: child.gender || undefined,
      division:
        child.division?.name?.trim() ||
        child.grade?.trim() ||
        child.group_name?.trim() ||
        child.category?.trim() ||
        '',
      town: '',
      requests: [],
      disrequests: [],
    }));
}
