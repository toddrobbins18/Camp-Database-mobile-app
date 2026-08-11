export const PARENT_PORTAL_COMPANY_SLUG_KEY = 'parent_portal_company_slug';

export const CHANGE_TYPES = [
  { v: 'early_pickup', l: 'Early Pickup' },
  { v: 'late_stay', l: 'Late Stay' },
  { v: 'alternate_guardian', l: 'Alternate Guardian' },
  { v: 'bus_change', l: 'Bus / Transport Change' },
  { v: 'other', l: 'Other' },
] as const;

export const ABSENCE_TYPES = [
  { v: 'absent', l: 'Absent' },
  { v: 'late_arrival', l: 'Late Arrival' },
  { v: 'leaving_early', l: 'Leaving Early' },
] as const;

export type ParentCamper = { id: string; name: string };

export type PickupChange = {
  id: string;
  camper_id: string;
  change_date: string;
  change_type: string;
  pickup_time: string | null;
  pickup_person_name: string | null;
  pickup_person_phone: string | null;
  notes: string | null;
  status: string;
};

export type Absence = {
  id: string;
  camper_id: string;
  absence_date: string;
  absence_type: string;
  arrival_time: string | null;
  reason: string | null;
  notes: string | null;
  status: string;
};

export type AuthorizedPickup = {
  id: string;
  camper_id: string | null;
  full_name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
};

export type SwimLesson = {
  id: string;
  camper_id: string;
  scheduled_at: string;
  duration_minutes: number;
  instructor: string | null;
  location: string | null;
  cost_cents: number;
  status: string;
  parent_confirmed: boolean;
  parent_confirmed_at: string | null;
  notes: string | null;
};

export function statusBadgeStyle(status: string): { bg: string; text: string } {
  if (status === 'acknowledged') return { bg: '#dbeafe', text: '#1d4ed8' };
  if (status === 'completed') return { bg: '#f1f5f9', text: '#475569' };
  if (status === 'cancelled') return { bg: '#fee2e2', text: '#dc2626' };
  return { bg: '#f8fafc', text: '#64748b' };
}
