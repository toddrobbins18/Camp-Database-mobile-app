/** Shared calendar color defaults — mirrors web calendarColorDefaults.ts */

export const DEFAULT_MASTER_CALENDAR_COLORS: Record<string, string> = {
  'Sports (Default)': '#3b82f6',
  'Field Trip (Default)': '#22c55e',
  'Special Event (Default)': '#a855f7',
  'Tiger Times (Default)': '#f59e0b',
  'Daily Wolf (Default)': '#0ea5e9',
  Default: '#22c55e',
  'field-trip': '#22c55e',
  'arts-crafts': '#ec4899',
  nature: '#16a34a',
  water: '#0ea5e9',
  outdoor: '#d97706',
  cultural: '#8b5cf6',
  'staff-bus': '#6b7280',
  'sporting-event': '#3b82f6',
  other: '#64748b',
  'Teen Trip': '#6b7280',
  'Collegiate Trip': '#14b8a6',
  'Senior Trip': '#7f1d1d',
  'Junior Trip': '#9333ea',
  Olympics: '#000000',
  'Wacky Wednesday': '#000000',
  'Divisional Night': '#bf00ff',
  'Campus Night': '#4d4dff',
  'Full Camp': '#ff6600',
  'Rookie Day': '#22c55e',
  Tour: '#000000',
  'special-event': '#3b82f6',
  'evening-activity': '#8b5cf6',
  'rookie-day': '#22c55e',
  tour: '#000000',
  'divisional-night': '#bf00ff',
  'campus-night': '#4d4dff',
  'full-camp': '#ff6600',
  campfire: '#f59e0b',
  'movie-night': '#6366f1',
  'talent-show': '#ec4899',
  'game-night': '#14b8a6',
  Away: '#1e3a5f',
  Home: '#166534',
  'Away (Sports)': '#1e3a5f',
  'Home (Sports)': '#166534',
  Gordon: '#39ff14',
  Jacobs: '#39ff14',
  'Bocian/Melter Bowl': '#39ff14',
  'TT: Laundry': '#3b82f6',
  'TT: Phone Calls': '#ef4444',
  'TT: Movie / Entertainment': '#eab308',
  'TT: Outside Events': '#eab308',
  'TT: Staff Days Off': '#93c5fd',
  'TT: OD Notes': '#ec4899',
  'DW: Super OD': '#6366f1',
  'DW: Quote': '#d97706',
  'DW: Laundry': '#3b82f6',
  'DW: Phone Calls': '#ef4444',
  'DW: Notes': '#a855f7',
};

export type EventSource =
  | 'sports_calendar'
  | 'activities_field_trips'
  | 'special_events_activities'
  | 'tiger_times'
  | 'daily_wolf';

const SOURCE_DEFAULTS: Record<EventSource, string> = {
  sports_calendar: DEFAULT_MASTER_CALENDAR_COLORS['Sports (Default)'],
  activities_field_trips: DEFAULT_MASTER_CALENDAR_COLORS['Field Trip (Default)'],
  special_events_activities: DEFAULT_MASTER_CALENDAR_COLORS['Special Event (Default)'],
  tiger_times: DEFAULT_MASTER_CALENDAR_COLORS['Tiger Times (Default)'],
  daily_wolf: DEFAULT_MASTER_CALENDAR_COLORS['Daily Wolf (Default)'],
};

export function resolveMasterCalendarColor(
  source: EventSource,
  originalData?: Record<string, unknown> | null,
): string {
  const cc = DEFAULT_MASTER_CALENDAR_COLORS;
  const subCategory = originalData?.sub_category as string | undefined;
  const eventType = (
    originalData?.event_type ||
    originalData?.activity_type ||
    originalData?.sport_type
  ) as string | undefined;
  const homeAway = originalData?.home_away as string | undefined;

  let bgColor: string | undefined;

  if (source === 'activities_field_trips') {
    const activityKey = subCategory || eventType;
    if (activityKey && cc[activityKey]) bgColor = cc[activityKey];
    if (!bgColor && cc.Default) bgColor = cc.Default;
  } else if (source === 'special_events_activities') {
    if (subCategory && cc[subCategory]) bgColor = cc[subCategory];
    if (!bgColor && eventType && cc[eventType]) bgColor = cc[eventType];
  } else if (source === 'sports_calendar') {
    if (homeAway === 'away' || eventType === 'Away') {
      bgColor = cc['Away (Sports)'] || cc.Away;
    } else if (homeAway === 'home' || eventType === 'Home') {
      bgColor = cc['Home (Sports)'] || cc.Home;
    } else if (eventType && ['Gordon', 'Jacobs', 'Bocian/Melter Bowl'].includes(eventType)) {
      bgColor = cc[eventType];
    } else if (eventType && cc[eventType]) {
      bgColor = cc[eventType];
    }
  } else {
    if (subCategory && cc[subCategory]) bgColor = cc[subCategory];
    if (!bgColor && eventType && cc[eventType]) bgColor = cc[eventType];
  }

  if (source === 'tiger_times') {
    const ttCategory = originalData?.tiger_times_category as string | undefined;
    if (ttCategory && cc[ttCategory]) bgColor = cc[ttCategory];
  }
  if (source === 'daily_wolf') {
    const dwCategory = originalData?.daily_wolf_category as string | undefined;
    if (dwCategory && cc[dwCategory]) bgColor = cc[dwCategory];
  }

  return bgColor || SOURCE_DEFAULTS[source] || '#6b7280';
}

export type CalendarAccent = { bg: string; text: string; marker: string };

export function getMasterCalendarAccent(
  source: EventSource,
  originalData?: Record<string, unknown> | null,
): CalendarAccent {
  const marker = resolveMasterCalendarColor(source, originalData);
  const isNeonGreen = marker === '#39ff14';
  const isDark = marker === '#000000' || marker === '#7f1d1d';
  const bg = `${marker}28`;
  const text = isNeonGreen ? '#166534' : isDark ? '#ffffff' : marker;
  return { bg, text, marker };
}
