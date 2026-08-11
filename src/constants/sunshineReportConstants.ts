export type SunshineGroup = { id: string; name: string; sort_order: number };
export type SunshineCamper = {
  id: string;
  full_name: string;
  group_id: string | null;
  parent_email: string | null;
  sort_order: number;
};
export type TagCategory = 'sport' | 'activity' | 'lunch';
export type SunshineTagOption = { id: string; category: TagCategory; label: string; color: string };
export type SunshineReport = {
  id?: string;
  camper_id: string;
  report_date: string;
  sports: string[];
  activities: string[];
  lunch: string[];
  bm: boolean;
  napped: boolean;
  send_email: boolean;
  email_sent_at: string | null;
};

export const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  blue: { bg: '#dbeafe', text: '#1e3a8a' },
  green: { bg: '#dcfce7', text: '#14532d' },
  pink: { bg: '#fce7f3', text: '#831843' },
  purple: { bg: '#f3e8ff', text: '#581c87' },
  orange: { bg: '#ffedd5', text: '#9a3412' },
  yellow: { bg: '#fef9c3', text: '#854d0e' },
  teal: { bg: '#ccfbf1', text: '#115e59' },
  gray: { bg: '#f3f4f6', text: '#374151' },
};

export const normalizeGroupName = (value: string) => value.trim().toLowerCase();

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
