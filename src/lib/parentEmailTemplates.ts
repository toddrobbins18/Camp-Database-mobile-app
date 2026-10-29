/** Todd: four NSDC reminder graphics only (no towel / pack lunch). */
export type ParentEmailTemplateKey =
  | 'sunscreen'
  | 'extra_clothes'
  | 'water_bottle'
  | 'rain_gear';

export type ParentEmailTemplateOption = {
  key: ParentEmailTemplateKey;
  label: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
};

export const PARENT_EMAIL_TEMPLATE_OPTIONS: ParentEmailTemplateOption[] = [
  { key: 'sunscreen', label: 'More sunscreen', icon: 'sunny-outline' },
  { key: 'extra_clothes', label: 'Extra clothes', icon: 'shirt-outline' },
  { key: 'water_bottle', label: 'Water bottle', icon: 'water' },
  { key: 'rain_gear', label: 'Rain gear', icon: 'rainy-outline' },
];
