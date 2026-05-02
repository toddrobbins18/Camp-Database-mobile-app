/**
 * Matches `tyler-hill/src/utils/themeUtils.ts`: derive drawer/sidebar background from
 * Supabase `companies.theme_color` so mobile matches web (darkened sidebar, not raw brand hex).
 */

function normalizeHex(hex: string): string {
    let h = hex.replace('#', '').trim();
    if (h.length === 3) {
        h = h
            .split('')
            .map((c) => c + c)
            .join('');
    }
    if (h.length !== 6 || !/^[0-9a-fA-F]+$/.test(h)) {
        throw new Error(`Invalid hex color: ${hex}`);
    }
    return h;
}

function brandHexToHslString(hex: string): string {
    const normalized = normalizeHex(hex);
    const r = parseInt(normalized.substring(0, 2), 16) / 255;
    const g = parseInt(normalized.substring(2, 4), 16) / 255;
    const b = parseInt(normalized.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function parseHsl(hsl: string): { h: number; s: number; l: number } {
    const matches = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
    if (!matches) throw new Error('Invalid HSL format');
    return {
        h: parseInt(matches[1], 10),
        s: parseInt(matches[2], 10),
        l: parseInt(matches[3], 10),
    };
}

/** Keep in sync with web `sidebarBackgroundLightness` in `tyler-hill/src/utils/themeUtils.ts`. */
function sidebarBackgroundLightness(brandLightness: number): number {
    return Math.min(30, Math.max(14, brandLightness - 40));
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    s /= 100;
    l /= 100;
    const hue = (((h % 360) + 360) % 360);
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = l - c / 2;
    let r1 = 0;
    let g1 = 0;
    let b1 = 0;
    if (hue < 60) {
        r1 = c;
        g1 = x;
    } else if (hue < 120) {
        r1 = x;
        g1 = c;
    } else if (hue < 180) {
        g1 = c;
        b1 = x;
    } else if (hue < 240) {
        g1 = x;
        b1 = c;
    } else if (hue < 300) {
        r1 = x;
        b1 = c;
    } else {
        r1 = c;
        b1 = x;
    }
    return [
        Math.round((r1 + m) * 255),
        Math.round((g1 + m) * 255),
        Math.round((b1 + m) * 255),
    ];
}

function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Sidebar / drawer background `#rrggbb` from brand hex; null if invalid. */
export function sidebarBackgroundHexFromBrandHex(brandHex: string | null | undefined): string | null {
    if (!brandHex) return null;
    try {
        const hsl = brandHexToHslString(brandHex);
        const { h, s, l } = parseHsl(hsl);
        const bgL = sidebarBackgroundLightness(l);
        const [r, g, b] = hslToRgb(h, s, bgL);
        return rgbToHex(r, g, b);
    } catch {
        return null;
    }
}
