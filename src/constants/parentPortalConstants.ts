export const PARENT_PORTAL_COMPANY_SLUG_KEY = 'parent_portal_company_slug';

export const CAMP_STAFF_ROLES = new Set([
  'admin',
  'staff',
  'division_leader',
  'specialist',
  'viewer',
  'super_admin',
  'health_center',
]);

export function userIsCampStaff(roles: string[]): boolean {
  return roles.some((role) => CAMP_STAFF_ROLES.has(role));
}

export type ParentPortalView =
  | 'home'
  | 'campers'
  | 'pickups'
  | 'absences'
  | 'authorized'
  | 'swim';

export const PARENT_PORTAL_NAV: {
  id: ParentPortalView;
  label: string;
  mobileLabel: string;
  icon: string;
}[] = [
  { id: 'home', label: 'Home', mobileLabel: 'Home', icon: 'home-outline' },
  { id: 'campers', label: 'My Campers', mobileLabel: 'Campers', icon: 'people-outline' },
  { id: 'pickups', label: 'Pickups', mobileLabel: 'Pickup', icon: 'calendar-outline' },
  { id: 'absences', label: 'Absences', mobileLabel: 'Absences', icon: 'time-outline' },
  { id: 'authorized', label: 'Authorized Adults', mobileLabel: 'Adults', icon: 'shield-checkmark-outline' },
  { id: 'swim', label: 'Swim', mobileLabel: 'Swim', icon: 'water-outline' },
];

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

export type Camper = {
  id: string;
  name: string;
  grade?: string | null;
  group_name?: string | null;
  photo_url?: string | null;
  status?: string | null;
};

/** @deprecated use Camper */
export type ParentCamper = Camper;

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

export function camperDisplayGroup(camper: Camper): string | null {
  const group = camper.group_name?.trim();
  if (group) return group;
  const grade = camper.grade?.trim();
  if (grade) return grade;
  return null;
}

export function camperInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatFriendlyDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function changeTypeLabel(value: string): string {
  return CHANGE_TYPES.find((t) => t.v === value)?.l ?? value.replace(/_/g, ' ');
}

export function absenceTypeLabel(value: string): string {
  return ABSENCE_TYPES.find((t) => t.v === value)?.l ?? value.replace(/_/g, ' ');
}

export function statusDisplayLabel(status: string): string {
  const labels: Record<string, string> = {
    submitted: 'Pending',
    acknowledged: 'Approved',
    completed: 'Completed',
    cancelled: 'Declined',
  };
  return labels[status] ?? status.replace(/_/g, ' ');
}

export function statusBadgeStyle(status: string): { bg: string; text: string } {
  if (status === 'acknowledged') return { bg: '#dbeafe', text: '#1d4ed8' };
  if (status === 'completed') return { bg: '#f1f5f9', text: '#475569' };
  if (status === 'cancelled') return { bg: '#fee2e2', text: '#dc2626' };
  return { bg: '#f8fafc', text: '#64748b' };
}
