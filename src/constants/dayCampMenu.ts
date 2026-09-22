import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { isNorthShoreDayCamp, northShoreBusTransportEnabled, type CampLike } from './camps';

export type MobileDrawerMenuItem = {
  key: string;
  menuId: string;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  screen: string;
  params?: Record<string, string>;
};

/** Staff transport tools — linked from Front Office, not top-level drawer. */
export const FRONT_OFFICE_TRANSPORT_MENU_IDS = new Set([
  'transport-admin',
  'bus-attendance',
  'change-sheets',
  'pending-transport-changes',
  'group-bubble-sheets',
]);

/** Bus transport modules — gated when North Shore bus transport is disabled. */
const BUS_TRANSPORT_MENU_IDS = new Set(['transportation', ...FRONT_OFFICE_TRANSPORT_MENU_IDS]);

/** Parent-facing staff tools — Parent Portal drawer section. */
export const PARENT_PORTAL_MENU_IDS = new Set(['parent-portal', 'parent-portal-dashboard']);

/** Todd carryover — existing Nest modules (matches web dayCampMenu.ts). */
export function getDayCampNestCarryoverMenuItems(): MobileDrawerMenuItem[] {
  return [
    { key: 'dashboard', menuId: 'dashboard', label: 'Dashboard', icon: 'home-outline', screen: 'Dashboard' },
    { key: 'activities-field-trips', menuId: 'activities', label: 'Activities & Field Trips', icon: 'leaf-outline', screen: 'ActivitiesFieldTrips' },
    { key: 'tutoring-therapy', menuId: 'tutoring-therapy', label: 'Tutoring & Therapy', icon: 'book-outline', screen: 'TutoringTherapy' },
    { key: 'camper', menuId: 'roster', label: 'Camper', icon: 'people-outline', screen: 'Camper', params: { screen: 'CamperList' } },
    { key: 'daily-news', menuId: 'notes', label: 'Daily news', icon: 'document-text-outline', screen: 'DailyNews' },
    { key: 'health-center', menuId: 'nurse', label: 'Health Center', icon: 'medical-outline', screen: 'DayCampModule', params: { moduleId: 'nurse' } },
    { key: 'incident-reports', menuId: 'incidents', label: 'Incident Reports', icon: 'warning-outline', screen: 'IncidentReports' },
    { key: 'master-calendar', menuId: 'calendar', label: 'Master Calendar', icon: 'calendar-outline', screen: 'Calendar' },
    { key: 'menu', menuId: 'menu', label: 'Menu', icon: 'restaurant-outline', screen: 'Menu' },
    { key: 'messages', menuId: 'messages', label: 'Messages', icon: 'mail-outline', screen: 'Messages' },
    { key: 'rainy-day-schedule', menuId: 'rainy-day', label: 'Rainy Day Schedule', icon: 'rainy-outline', screen: 'RainyDaySchedule' },
    { key: 'special-events', menuId: 'special-events', label: 'Special Events', icon: 'calendar-outline', screen: 'SpecialEvents' },
    { key: 'staff', menuId: 'staff', label: 'Staff', icon: 'person-outline', screen: 'Staff' },
  ];
}

/** Nest 2.0 / Airtable POC — Day Camp section (matches web). */
export function getDayCampPocMenuItems(): MobileDrawerMenuItem[] {
  return [
    {
      key: 'front-office',
      menuId: 'front-office',
      label: 'Front Office',
      icon: 'radio-outline',
      screen: 'DayCampModule',
      params: { moduleId: 'front-office' },
    },
    {
      key: 'transport-admin',
      menuId: 'transport-admin',
      label: 'Transport Admin',
      icon: 'bus-outline',
      screen: 'DayCampModule',
      params: { moduleId: 'transport-admin' },
    },
    { key: 'bunking', menuId: 'bunking', label: 'Bunking', icon: 'bed-outline', screen: 'DayCampModule', params: { moduleId: 'bunking' } },
    { key: 'hiring', menuId: 'hiring', label: 'Hiring', icon: 'briefcase-outline', screen: 'DayCampModule', params: { moduleId: 'hiring' } },
    { key: 'media', menuId: 'media', label: 'Media', icon: 'camera-outline', screen: 'DayCampModule', params: { moduleId: 'media' } },
    { key: 'swim', menuId: 'swim', label: 'Swim', icon: 'water-outline', screen: 'DayCampModule', params: { moduleId: 'swim' } },
    { key: 'swim-lessons', menuId: 'swim-lessons', label: 'Swim Lessons', icon: 'water-outline', screen: 'DayCampModule', params: { moduleId: 'swim-lessons' } },
    { key: 'sunshine-report', menuId: 'sunshine-report', label: 'Sunshine Report', icon: 'sunny-outline', screen: 'DayCampModule', params: { moduleId: 'sunshine-report' } },
    { key: 'transportation', menuId: 'transportation', label: 'Transportation', icon: 'car-outline', screen: 'Transport' },
    {
      key: 'bus-attendance',
      menuId: 'bus-attendance',
      label: 'Bus Attendance',
      icon: 'clipboard-outline',
      screen: 'DayCampModule',
      params: { moduleId: 'bus-attendance' },
    },
    {
      key: 'group-bubble-sheets',
      menuId: 'group-bubble-sheets',
      label: 'Group Bubble Sheets',
      icon: 'people-outline',
      screen: 'DayCampModule',
      params: { moduleId: 'group-bubble-sheets' },
    },
    {
      key: 'change-sheets',
      menuId: 'change-sheets',
      label: 'Change Sheets',
      icon: 'document-text-outline',
      screen: 'DayCampModule',
      params: { moduleId: 'change-sheets' },
    },
    {
      key: 'pending-transport-changes',
      menuId: 'pending-transport-changes',
      label: 'Pending Changes',
      icon: 'time-outline',
      screen: 'DayCampModule',
      params: { moduleId: 'pending-transport-changes' },
    },
    { key: 'office-changes', menuId: 'office-changes', label: 'Office Changes', icon: 'create-outline', screen: 'DayCampModule', params: { moduleId: 'office-changes' } },
    { key: 'swim-bracelets', menuId: 'swim-bracelets', label: 'Swim Bracelets', icon: 'water-outline', screen: 'DayCampModule', params: { moduleId: 'swim-bracelets' } },
    { key: 'swim-progress', menuId: 'swim-progress', label: 'Swim Progress', icon: 'stats-chart-outline', screen: 'DayCampModule', params: { moduleId: 'swim-progress' } },
    { key: 'parent-portal', menuId: 'parent-portal', label: 'Parent Portal', icon: 'people-circle-outline', screen: 'DayCampModule', params: { moduleId: 'parent-portal' } },
    {
      key: 'parent-portal-dashboard',
      menuId: 'parent-portal-dashboard',
      label: 'Portal Dashboard',
      icon: 'shield-checkmark-outline',
      screen: 'DayCampModule',
      params: { moduleId: 'parent-portal-dashboard' },
    },
  ];
}

/** North Shore — hide Media per Todd (Jul 30). Bunking + Hiring enabled for roster. */
const NORTH_SHORE_SKIP_POC_MENU_IDS = new Set(['media']);

function isTransportMenuItem(menuId: string): boolean {
  return BUS_TRANSPORT_MENU_IDS.has(menuId);
}

export function getDayCampPocItemsForCompany(company: CampLike): MobileDrawerMenuItem[] {
  return getDayCampPocMenuItems().filter((item) => {
    if (isNorthShoreDayCamp(company?.slug) && NORTH_SHORE_SKIP_POC_MENU_IDS.has(item.menuId)) {
      return false;
    }
    if (isTransportMenuItem(item.menuId) && !northShoreBusTransportEnabled(company)) {
      return false;
    }
    return true;
  });
}

/** Day Camp drawer — excludes Front Office transport links and Parent Portal items. */
export function getDayCampSidebarPocItems(company: CampLike): MobileDrawerMenuItem[] {
  return getDayCampPocItemsForCompany(company).filter(
    (item) =>
      !FRONT_OFFICE_TRANSPORT_MENU_IDS.has(item.menuId) &&
      !PARENT_PORTAL_MENU_IDS.has(item.menuId),
  );
}

/** Transport shortcuts on the Front Office screen. */
export function getFrontOfficeTransportMenuItems(company: CampLike): MobileDrawerMenuItem[] {
  return getDayCampPocItemsForCompany(company).filter((item) =>
    FRONT_OFFICE_TRANSPORT_MENU_IDS.has(item.menuId),
  );
}

export function getParentPortalMenuItems(): MobileDrawerMenuItem[] {
  return [
    {
      key: 'parent-portal',
      menuId: 'parent-portal',
      label: 'Parent Portal',
      icon: 'people-circle-outline',
      screen: 'DayCampModule',
      params: { moduleId: 'parent-portal' },
    },
    {
      key: 'parent-portal-dashboard',
      menuId: 'parent-portal-dashboard',
      label: 'Portal Dashboard',
      icon: 'shield-checkmark-outline',
      screen: 'DayCampModule',
      params: { moduleId: 'parent-portal-dashboard' },
    },
  ];
}

export type DayCampRolePermissionItem = {
  id: string;
  name: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
};

/** Role permission rows for day camps — mirrors web getDayCampRolePermissionMenuItems(). */
export function getDayCampRolePermissionMenuItems(): DayCampRolePermissionItem[] {
  const fromMenu = [...getDayCampNestCarryoverMenuItems(), ...getDayCampPocMenuItems()].map((item) => ({
    id: item.menuId,
    name: item.label,
    icon: item.icon,
    iconColor: '#64748b',
  }));

  const adminItems: DayCampRolePermissionItem[] = [
    { id: 'admin', name: 'Admin Panel', icon: 'shield-outline', iconColor: '#3b82f6' },
    { id: 'evaluation-questions', name: 'Evaluation Questions', icon: 'clipboard-outline', iconColor: '#8b4513' },
    { id: 'role-permissions', name: 'Role Permissions', icon: 'settings-outline', iconColor: '#f59e0b' },
    { id: 'division-permissions', name: 'Division Permissions', icon: 'lock-closed-outline', iconColor: '#f59e0b' },
    {
      id: 'specialist-sport-assignments',
      name: 'Specialist Sport Assignments',
      icon: 'trophy-outline',
      iconColor: '#f59e0b',
    },
    { id: 'user-approvals', name: 'User Approvals', icon: 'checkmark-circle-outline', iconColor: '#10b981' },
  ];

  return [...fromMenu, ...adminItems].sort((a, b) => a.name.localeCompare(b.name));
}

export const DAY_CAMP_MODULE_COPY: Record<string, { title: string; description: string }> = {
  'health-center': {
    title: 'Health Center',
    description: 'Day camp health module — separate from sleepaway Nurse. Coming soon.',
  },
  'sunshine-report': {
    title: 'Sunshine Report',
    description: 'Daily camper tracking — fill out throughout the day, then send to parents at the end of day.',
  },
  'office-changes': {
    title: 'Office Changes',
    description: 'Schedule changes that notify transportation. Coming soon.',
  },
  'swim-bracelets': {
    title: 'Swim Bracelets',
    description: 'Approve and send swim bracelet reports. Coming soon.',
  },
  'swim-progress': {
    title: 'Swim Progress',
    description: 'Swim progress tied to division leaders. Coming soon.',
  },
  'parent-portal': {
    title: 'Parent Portal',
    description: 'Parent login for swim lessons, pickups, absences, and authorized adults.',
  },
  'parent-portal-dashboard': {
    title: 'Portal Dashboard',
    description: 'Staff review and approve parent submissions before they update routes and paperwork.',
  },
  'group-bubble-sheets': {
    title: 'Group Bubble Sheets',
    description: 'Print team attendance sheets filtered by enrollment week.',
  },
  'transport-admin': {
    title: 'Transport Admin',
    description: 'Staff backend for bus exceptions — log pickup, absence, swim, nurse sent-home, and approve.',
  },
};
