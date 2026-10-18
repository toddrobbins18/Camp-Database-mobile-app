/** Todd NSDC template 682×1024 — keep in sync with tyler-hill/src/lib/sunshineLayout.ts */

export const SUNSHINE_TEMPLATE_WIDTH = 682;
export const SUNSHINE_TEMPLATE_HEIGHT = 1024;

export type SunshineLineBlock = {
  x: number;
  firstBaseline: number;
  lineGap: number;
  fontSize: number;
  maxLines: number;
};

export const SUNSHINE_LAYOUT = {
  camper: { x: 228, baseline: 270, fontSize: 50 },
  activities: { x: 62, firstBaseline: 435, lineGap: 30, fontSize: 16, maxLines: 4 },
  sports: { x: 368, firstBaseline: 435, lineGap: 30, fontSize: 16, maxLines: 4 },
  lunch: { x: 62, firstBaseline: 660, lineGap: 30, fontSize: 16, maxLines: 3 },
  bmCheck: { x: 290, baseline: 790, fontSize: 20 },
  napCheck: { x: 620, baseline: 790, fontSize: 20 },
} as const;

export function baselinesFor(block: SunshineLineBlock): number[] {
  return Array.from({ length: block.maxLines }, (_, i) => block.firstBaseline + i * block.lineGap);
}

export function fitSheetLines(items: string[], maxLines: number): string[] {
  if (!items.length) return [];
  if (items.length <= maxLines) return items;
  const head = items.slice(0, maxLines - 1);
  head.push(items.slice(maxLines - 1).join(', '));
  return head;
}

function baselineToTop(baseline: number, fontSize: number): number {
  return baseline - fontSize + 2;
}

export type SunshinePreviewInput = {
  camperName: string;
  activities: string[];
  sports: string[];
  lunch: string[];
  bm: boolean;
  napped: boolean;
};

/** Positions for overlay text on the template (682×1024 coordinate space). */
export function sunshinePreviewOverlayItems(input: SunshinePreviewInput) {
  const L = SUNSHINE_LAYOUT;
  const name = input.camperName.trim() || 'Camper';

  const lineItems = (items: string[], block: SunshineLineBlock, maxWidth: number) =>
    fitSheetLines(items, block.maxLines).map((text, i) => ({
      key: text + i,
      text,
      x: block.x,
      top: baselineToTop(baselinesFor(block)[i]!, block.fontSize),
      fontSize: block.fontSize,
      maxWidth,
      fontWeight: '600' as const,
      color: '#1f2937',
    }));

  return {
    camper: {
      text: name,
      x: L.camper.x,
      top: baselineToTop(L.camper.baseline, L.camper.fontSize),
      fontSize: L.camper.fontSize,
      maxWidth: 420,
      fontWeight: '700' as const,
      color: '#1d4ed8',
    },
    activities: lineItems(input.activities, L.activities, 268),
    sports: lineItems(input.sports, L.sports, 268),
    lunch: lineItems(input.lunch, L.lunch, 558),
    bmCheck: input.bm
      ? {
          text: '✓',
          x: L.bmCheck.x,
          top: baselineToTop(L.bmCheck.baseline, L.bmCheck.fontSize),
          fontSize: L.bmCheck.fontSize,
          fontWeight: '800' as const,
          color: '#0f172a',
        }
      : null,
    napCheck: input.napped
      ? {
          text: '✓',
          x: L.napCheck.x,
          top: baselineToTop(L.napCheck.baseline, L.napCheck.fontSize),
          fontSize: L.napCheck.fontSize,
          fontWeight: '800' as const,
          color: '#0f172a',
        }
      : null,
  };
}
