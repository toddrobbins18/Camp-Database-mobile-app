/** Todd: sunscreen, goggles, extra clothing only (no lunch/towel/water/rain). */
export type ParentEmailTemplateKey = 'sunscreen' | 'extra_clothes' | 'goggles';

export type ParentEmailTemplateOption = {
  key: ParentEmailTemplateKey;
  label: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
};

export const PARENT_EMAIL_TEMPLATE_OPTIONS: ParentEmailTemplateOption[] = [
  { key: 'sunscreen', label: 'More sunscreen', icon: 'sunny-outline' },
  { key: 'goggles', label: 'Goggles', icon: 'eye-outline' },
  { key: 'extra_clothes', label: 'Extra clothes', icon: 'shirt-outline' },
];
