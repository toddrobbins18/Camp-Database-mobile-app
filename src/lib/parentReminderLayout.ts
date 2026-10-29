import type { ImageSourcePropType } from 'react-native';
import type { ParentEmailTemplateKey } from './parentEmailTemplates';

/** NSDC parent reminder graphics (1854×2400). Keep in sync with tyler-hill/src/lib/parentReminderLayout.ts */
export const PARENT_REMINDER_WIDTH = 1854;
export const PARENT_REMINDER_HEIGHT = 2400;

export type ParentReminderNameLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
};

export const PARENT_REMINDER_NAME: ParentReminderNameLayout = {
  x: 448,
  y: 708,
  width: 430,
  height: 58,
  fontSize: 36,
  color: '#1c4a7a',
};

const PARENT_REMINDER_SOURCES: Record<ParentEmailTemplateKey, ImageSourcePropType> = {
  sunscreen: require('../../assets/parent-reminders/sunscreen.jpg'),
  extra_clothes: require('../../assets/parent-reminders/extra_clothing.jpg'),
  water_bottle: require('../../assets/parent-reminders/water_bottle.jpg'),
  rain_gear: require('../../assets/parent-reminders/rain_gear.jpg'),
};

export function parentReminderImageSource(templateKey: ParentEmailTemplateKey): ImageSourcePropType {
  return PARENT_REMINDER_SOURCES[templateKey];
}
