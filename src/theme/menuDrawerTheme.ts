import { CAMP_SLUG } from '../constants/camps';

/** Drawer / camp-switcher look — aligned with Lovable “The Nest” per camp */
export type MenuDrawerTheme = {
    drawerBackground: string;
    menuItemInactive: string;
    menuActiveTint: string;
    menuActiveBackground: string;
    /** Year + camp dropdown selected row */
    dropdownSelectionBg: string;
    campSwitcherBorderWidth: number;
    campSwitcherBorderColor: string;
    sectionHeader: string;
};

type MenuDrawerThemeInput = {
    companySlug: string | null | undefined;
    companyThemeColor?: string | null;
};

const DEFAULT: MenuDrawerTheme = {
    drawerBackground: '#0f172a',
    menuItemInactive: '#e2e8f0',
    menuActiveTint: '#ffffff',
    menuActiveBackground: 'rgba(255, 255, 255, 0.12)',
    dropdownSelectionBg: '#f97316',
    campSwitcherBorderWidth: 0,
    campSwitcherBorderColor: 'transparent',
    sectionHeader: '#94a3b8',
};

/** Tyler Hill — navy sidebar, orange selection (matches web camp picker) */
const TYLER_HILL: MenuDrawerTheme = {
    drawerBackground: '#000B3D',
    menuItemInactive: '#ffffff',
    menuActiveTint: '#ffffff',
    menuActiveBackground: '#F2711C',
    dropdownSelectionBg: '#F2711C',
    campSwitcherBorderWidth: 2,
    campSwitcherBorderColor: '#F2711C',
    sectionHeader: '#94a3b8',
};

/** Timber Lake West — maroon sidebar, red accents */
const TIMBER_LAKE_WEST: MenuDrawerTheme = {
    drawerBackground: '#3b0a0a',
    menuItemInactive: '#ffffff',
    menuActiveTint: '#ffffff',
    menuActiveBackground: '#991b1b',
    dropdownSelectionBg: '#dc2626',
    campSwitcherBorderWidth: 2,
    campSwitcherBorderColor: '#ef4444',
    sectionHeader: '#94a3b8',
};

/** Timber Lake Camp — black sidebar, green accents */
const TIMBER_LAKE_CAMP: MenuDrawerTheme = {
    drawerBackground: '#000000',
    menuItemInactive: '#ffffff',
    menuActiveTint: '#ffffff',
    menuActiveBackground: '#166534',
    dropdownSelectionBg: '#22c55e',
    campSwitcherBorderWidth: 2,
    campSwitcherBorderColor: '#22c55e',
    sectionHeader: '#94a3b8',
};

export function getMenuDrawerTheme(companySlug: string | null | undefined): MenuDrawerTheme {
    switch (companySlug) {
        case CAMP_SLUG.TYLER_HILL_CAMP:
            return TYLER_HILL;
        case CAMP_SLUG.TIMBER_LAKE_WEST:
            return TIMBER_LAKE_WEST;
        case CAMP_SLUG.TIMBER_LAKE_CAMP:
            return TIMBER_LAKE_CAMP;
        default:
            return DEFAULT;
    }
}

export function getMenuDrawerThemeFromCompany({
    companySlug,
    companyThemeColor,
}: MenuDrawerThemeInput): MenuDrawerTheme {
    const baseTheme = getMenuDrawerTheme(companySlug);
    if (!companyThemeColor) return baseTheme;

    // Use Supabase as source of truth for camp branding color.
    return {
        ...baseTheme,
        drawerBackground: companyThemeColor,
        menuActiveBackground: companyThemeColor,
        dropdownSelectionBg: companyThemeColor,
        campSwitcherBorderColor: companyThemeColor,
    };
}
