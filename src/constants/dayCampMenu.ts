import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type MobileDrawerMenuItem = {
  key: string;
  menuId: string;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  screen: string;
  params?: Record<string, string>;
};

/** Todd carryover — existing Nest modules (matches web dayCampMenu.ts). */
export function getDayCampNestCarryoverMenuItems(): MobileDrawerMenuItem[] {
  return [
    { key: 'dashboard', menuId: 'dashboard', label: 'Dashboard', icon: 'home-outline', screen: 'Dashboard' },
    { key: 'activities-field-trips', menuId: 'activities', label: 'Activities & Field Trips', icon: 'leaf-outline', screen: 'ActivitiesFieldTrips' },
    { key: 'appointments', menuId: 'appointments', label: 'Appointments', icon: 'calendar-outline', screen: 'Appointments' },
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
    { key: 'bunking', menuId: 'bunking', label: 'Bunking', icon: 'bed-outline', screen: 'DayCampModule', params: { moduleId: 'bunking' } },
    { key: 'swim', menuId: 'swim', label: 'Swim', icon: 'water-outline', screen: 'DayCampModule', params: { moduleId: 'swim' } },
    { key: 'swim-lessons', menuId: 'swim-lessons', label: 'Swim Lessons', icon: 'water-outline', screen: 'DayCampModule', params: { moduleId: 'swim-lessons' } },
    { key: 'sunshine-report', menuId: 'sunshine-report', label: 'Sunshine Report', icon: 'sunny-outline', screen: 'DayCampModule', params: { moduleId: 'sunshine-report' } },
    { key: 'transportation', menuId: 'transportation', label: 'Transportation', icon: 'car-outline', screen: 'Transport' },
    { key: 'office-changes', menuId: 'office-changes', label: 'Office Changes', icon: 'create-outline', screen: 'DayCampModule', params: { moduleId: 'office-changes' } },
    { key: 'swim-bracelets', menuId: 'swim-bracelets', label: 'Swim Bracelets', icon: 'water-outline', screen: 'DayCampModule', params: { moduleId: 'swim-bracelets' } },
    { key: 'swim-progress', menuId: 'swim-progress', label: 'Swim Progress', icon: 'stats-chart-outline', screen: 'DayCampModule', params: { moduleId: 'swim-progress' } },
    { key: 'parent-portal', menuId: 'parent-portal', label: 'Parent Portal', icon: 'people-circle-outline', screen: 'DayCampModule', params: { moduleId: 'parent-portal' } },
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
    description: 'Daily camper tracking for Nursery Campers. Coming soon.',
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
    description: 'Parent login for swim lessons and transportation requests. Coming soon.',
  },
};
