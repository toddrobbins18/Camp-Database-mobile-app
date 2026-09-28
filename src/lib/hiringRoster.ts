import { supabase } from './supabase';

export type HiringStatus = 'hired';

export type HiringStaffMember = {
  id: string;
  name: string;
  position: string;
  department: string;
  actualBudget: number;
  proposedBudget: number;
  kidCredit: number;
  netBudget: number;
  status: HiringStatus;
  notes?: string;
};

export function isActiveHiredStaffRow(row: {
  status?: unknown;
  name?: unknown;
}): boolean {
  const name = String(row.name ?? '').trim();
  if (!name || name.toLowerCase() === 'unknown') return false;
  const s = String(row.status ?? 'active').trim().toLowerCase();
  if (!s) return true;
  return s === 'active' || s !== 'inactive';
}

export async function fetchHiredStaffForHiring(
  companyId: string,
  season: string,
): Promise<HiringStaffMember[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('id, name, role, department, status, staff_type')
    .eq('company_id', companyId)
    .eq('season', season)
    .or('status.eq.active,status.is.null,status.eq.Active')
    .neq('name', 'Unknown')
    .not('name', 'is', null)
    .order('name');

  if (error) throw error;

  return (data || [])
    .filter(isActiveHiredStaffRow)
    .map((row) => ({
      id: row.id,
      name: row.name,
      position: row.role?.trim() || row.staff_type?.trim() || 'Staff',
      department: (row.department?.trim() || 'General').toUpperCase(),
      actualBudget: 0,
      proposedBudget: 0,
      kidCredit: 0,
      netBudget: 0,
      status: 'hired' as const,
    }));
}

export function mergeHiringPipelineWithSaved(
  roster: HiringStaffMember[],
  saved: HiringStaffMember[] | null | undefined,
): HiringStaffMember[] {
  if (!saved?.length) return roster;
  const savedById = new Map(saved.map((s) => [s.id, s]));
  return roster.map((member) => {
    const prev = savedById.get(member.id);
    if (!prev) return member;
    return {
      ...member,
      status: 'hired' as const,
      actualBudget: prev.actualBudget ?? member.actualBudget,
      proposedBudget: prev.proposedBudget ?? member.proposedBudget,
      kidCredit: prev.kidCredit ?? member.kidCredit,
      netBudget: prev.netBudget ?? member.netBudget,
      notes: prev.notes ?? member.notes,
    };
  });
}
