/**
 * Mirrors web `tyler-hill`: `awards.category` may store JSON from structured award flows.
 */
export type ParsedAwardCategory = {
  weekly_starfish_values?: string[];
  weekly_camper_award?: string;
  year_end_starfish_values?: string[];
};

export function tryParseAwardCategory(raw: string | null | undefined): ParsedAwardCategory | null {
  if (raw == null || raw === '') return null;
  const t = String(raw).trim();
  if (!t.startsWith('{')) return null;
  try {
    const o = JSON.parse(t);
    if (o && typeof o === 'object' && !Array.isArray(o)) return o as ParsedAwardCategory;
  } catch {
    return null;
  }
  return null;
}

export function formatAwardCategoryPlainText(raw: string | null | undefined): string {
  const parsed = tryParseAwardCategory(raw);
  if (!parsed) return (raw ?? '').trim();
  const parts: string[] = [];
  if (parsed.weekly_starfish_values?.length) {
    parts.push(`Starfish: ${parsed.weekly_starfish_values.join(', ')}`);
  }
  if (parsed.weekly_camper_award) {
    parts.push(parsed.weekly_camper_award);
  }
  if (parsed.year_end_starfish_values?.length) {
    parts.push(`Year-end Starfish: ${parsed.year_end_starfish_values.join(', ')}`);
  }
  return parts.join(' · ');
}

/** Chips aligned with web `AwardCategoryDisplay` (filled vs outline). */
export type AwardCategoryChip = {
  key: string;
  text: string;
  variant: 'filled' | 'outline';
};

export function getAwardCategoryChips(raw: string | null | undefined): AwardCategoryChip[] {
  const parsed = tryParseAwardCategory(raw);
  if (!parsed) {
    const t = (raw ?? '').trim();
    if (!t) return [];
    return [{ key: 'legacy', text: t, variant: 'filled' as const }];
  }
  const chips: AwardCategoryChip[] = [];
  parsed.weekly_starfish_values?.forEach((v, i) => {
    chips.push({ key: `ws-${i}-${v}`, text: `Starfish: ${v}`, variant: 'filled' });
  });
  if (parsed.weekly_camper_award) {
    chips.push({ key: 'wca', text: parsed.weekly_camper_award, variant: 'outline' });
  }
  parsed.year_end_starfish_values?.forEach((v, i) => {
    chips.push({ key: `ye-${i}-${v}`, text: `Year-end: ${v}`, variant: 'outline' });
  });
  return chips;
}
