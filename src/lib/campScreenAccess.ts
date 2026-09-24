import type { CampLike } from '../constants/camps';
import {
  appointmentsEnabledForCompany,
  isDayCampCompany,
  isTimberLakeCamp,
  isTimberLakeWest,
  isTylerHillCamp,
  staffTimeClockEnabledForCompany,
} from '../constants/camps';
import {
  getDayCampNestCarryoverMenuItems,
  getDayCampPocItemsForCompany,
  getDayCampSidebarPocItems,
  getParentPortalMenuItems,
} from '../constants/dayCampMenu';

export type ActiveRoute = {
  name: string;
  params?: Record<string, unknown>;
};

const ALWAYS_ALLOWED_SCREENS = new Set([
  'Dashboard',
  'AdminPanel',
  'EvaluationQuestions',
  'QuestionText',
  'RolePermissions',
  'DivisionPermissions',
  'SpecialistSportAssignments',
  'UserApprovals',
  'NotificationPreferences',
  'AccessDenied',
  'CamperList',
  'CamperDetail',
  'StaffList',
  'StaffDetail',
  'MenuList',
  'AddMenuItem',
]);

function getAllowedScreensForCompany(company: CampLike): Set<string> {
  const screens = new Set<string>(['Dashboard']);

  if (isDayCampCompany(company)) {
    for (const item of [
      ...getDayCampNestCarryoverMenuItems(),
      ...getDayCampSidebarPocItems(company),
      ...getParentPortalMenuItems(),
    ]) {
      screens.add(item.screen);
    }
    screens.add('DayCampModule');
    screens.add('Transport');
    return screens;
  }

  const overnightScreens = [
    'Camper',
    'Staff',
    'Calendar',
    'Health',
    'Transport',
    'Sports',
    'SportsCalendar',
    'RainyDaySchedule',
    'TutoringTherapy',
    'Reports',
    'RosterTemplates',
    'SpecialEvents',
    'SpecialMeals',
    'IncidentReports',
    'Menu',
    'Messages',
    'ActivitiesFieldTrips',
    'Awards',
    'DailyNews',
    'ODManagement',
  ];
  overnightScreens.forEach((screen) => screens.add(screen));

  if (staffTimeClockEnabledForCompany(company)) screens.add('StaffTimeClock');
  if (appointmentsEnabledForCompany(company)) screens.add('Appointments');
  if (isTylerHillCamp(company?.slug)) screens.add('OwlPay');
  if (isTimberLakeCamp(company?.slug)) {
    screens.add('DailySchedule');
    screens.add('ElectiveSignUp');
    screens.add('TigerTimes');
  }
  if (isTimberLakeWest(company?.slug)) {
    screens.add('DailyWolfPrintable');
    screens.add('DailyWolfManagement');
  }

  return screens;
}

/** Whether the active drawer screen belongs to the selected camp (ignores role permissions). */
export function isScreenAllowedForCompany(route: ActiveRoute, company: CampLike | null | undefined): boolean {
  if (!company) return true;

  const { name, params } = route;

  if (ALWAYS_ALLOWED_SCREENS.has(name)) return true;

  if (name === 'DayCampModule') {
    const moduleId = params?.moduleId as string | undefined;
    if (!moduleId || !isDayCampCompany(company)) return false;
    return getDayCampPocItemsForCompany(company).some((item) => item.params?.moduleId === moduleId);
  }

  return getAllowedScreensForCompany(company).has(name);
}
