import { Platform, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import type { ParentPortalColors } from './parentPortalTheme';

/** 4pt grid — use everywhere for alignment. */
export const PP = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

const FONT = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const ppFont = {
  display: {
    fontFamily: FONT,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
  },
  title: {
    fontFamily: FONT,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.35,
  },
  titleSm: {
    fontFamily: FONT,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: FONT,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontFamily: FONT,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500' as const,
  },
  caption: {
    fontFamily: FONT,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  label: {
    fontFamily: FONT,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  tab: {
    fontFamily: FONT,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500' as const,
  },
};

export function ppCard(colors: ParentPortalColors): ViewStyle {
  return {
    backgroundColor: colors.elevated,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    ...ppShadow(colors),
  };
}

export function ppShadow(colors: ParentPortalColors): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: {},
  }) as ViewStyle;
}

export function ppPrimaryBtn(colors: ParentPortalColors): ViewStyle {
  return {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingHorizontal: PP.lg,
    paddingVertical: PP.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  };
}

export function ppSectionHeader(title: string, colors: ParentPortalColors): TextStyle {
  return { ...ppFont.titleSm, color: colors.text };
}
