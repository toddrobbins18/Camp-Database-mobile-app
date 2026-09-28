import { CAMP_SLUG } from '../constants/camps';

export const NORTH_SHORE_THEME_COLOR = '#1565C0';
export const DEFAULT_PARENT_PORTAL_THEME = NORTH_SHORE_THEME_COLOR;

export type ParentPortalColors = {
  brand: string;
  brandDark: string;
  brandSoft: string;
  brandMuted: string;
  brandSubtle: string;
  bg: string;
  elevated: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  shadow: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized.slice(0, 6);
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('')}`;
}

function mix(hex: string, target: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  return rgbToHex(
    a.r + (b.r - a.r) * amount,
    a.g + (b.g - a.g) * amount,
    a.b + (b.b - a.b) * amount,
  );
}

export function resolveParentPortalThemeColor(
  themeColor?: string | null,
  companySlug?: string | null,
): string {
  const trimmed = themeColor?.trim();
  if (trimmed && /^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  if (companySlug === CAMP_SLUG.NORTH_SHORE_DAY_CAMP) return NORTH_SHORE_THEME_COLOR;
  return DEFAULT_PARENT_PORTAL_THEME;
}

export function buildParentPortalColors(themeColor: string): ParentPortalColors {
  const brand = resolveParentPortalThemeColor(themeColor);
  return {
    brand,
    brandDark: mix(brand, '#0f172a', 0.35),
    brandSoft: mix(brand, '#ffffff', 0.9),
    brandMuted: mix(brand, '#ffffff', 0.82),
    brandSubtle: mix(brand, '#ffffff', 0.95),
    bg: '#F4F6F8',
    elevated: '#FFFFFF',
    text: '#0F172A',
    textMuted: '#64748B',
    textSubtle: '#94A3B8',
    border: '#E2E8F0',
    shadow: mix(brand, '#0f172a', 0.5),
    success: '#15803D',
    successBg: '#F0FDF4',
    warning: '#B45309',
    warningBg: '#FFFBEB',
  };
}
