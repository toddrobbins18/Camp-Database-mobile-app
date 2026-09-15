import { supabase } from './supabase';

export type HiringStatus = 'to-hire' | 'interviewing' | 'offered' | 'hired';

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

export function isHiredStaffStatus(status: unknown): boolean {
  if (status == null) return true;
  const s = String(status).trim().toLowerCase();
  if (!s) return true;
  return !['inactive', 'resigned', 'dismissed', 'cancelled', 'terminated'].includes(s);
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
    .order('name');

  if (error) throw error;

  return (data || [])
    .filter((row) => isHiredStaffStatus(row.status))
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
