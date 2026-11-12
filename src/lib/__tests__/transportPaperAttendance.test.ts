import {
  applyOmrFlagsToRoster,
  decodePaperSheetBarcode,
  formatPaperScanChecklist,
  matchPaperSheetLabel,
  missingPaperSheets,
  parseChangeSheetAttendanceSource,
  reviewPaperAttendance,
  weekdayBubbleIndex,
} from '../paperAttendance';
import { rasterCode39 } from '../paperAttendanceBarcode';
import { extractJpegBuffersFromPdf } from '../paperAttendanceImage';
import { processPaperAttendancePages } from '../paperAttendanceScan';
import {
  analyzePaperAttendanceImage,
  omrRowsToAbsentFlags,
  type RgbaImage,
} from '../paperAttendanceOmr';
import { encodeCamperBarcode, encodePaperSheetBarcode } from '../transportReportPdfLayout';

function makeWhite(width: number, height: number): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(255);
  return { width, height, data };
}

function fillCircle(image: RgbaImage, cx: number, cy: number, r: number, gray: number) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= cy + r; y += 1) {
    for (let x = Math.floor(cx - r); x <= cx + r; x += 1) {
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > r2) continue;
      const i = (y * image.width + x) * 4;
      image.data[i] = gray;
      image.data[i + 1] = gray;
      image.data[i + 2] = gray;
      image.data[i + 3] = 255;
    }
  }
}

function strokeCircle(image: RgbaImage, cx: number, cy: number, r: number) {
  const outer = r * r;
  const inner = (r - 2) * (r - 2);
  for (let y = Math.floor(cy - r); y <= cy + r; y += 1) {
    for (let x = Math.floor(cx - r); x <= cx + r; x += 1) {
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue;
      const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d > outer || d < inner) continue;
      const i = (y * image.width + x) * 4;
      image.data[i] = 0;
      image.data[i + 1] = 0;
      image.data[i + 2] = 0;
      image.data[i + 3] = 255;
    }
  }
}

describe('paper attendance', () => {
  it('maps weekdays to bubble columns', () => {
    expect(weekdayBubbleIndex('2026-07-08')).toBe(2);
    expect(weekdayBubbleIndex('2026-07-11')).toBeNull();
  });

  it('treats both lists as confirmed and one-sided as conflicts', () => {
    const review = reviewPaperAttendance(
      [
        { camperName: 'Jamie Smith', sheetLabel: 'Bus 3' },
        { camperName: 'Alex Lee', sheetLabel: 'Bus 7' },
      ],
      [
        { camperName: 'Jamie Smith', sheetLabel: 'Barcelona' },
        { camperName: 'Sam Kim', sheetLabel: 'Barcelona' },
      ],
    );
    expect(review.confirmed.map((r) => r.camperName)).toEqual(['Jamie Smith']);
    expect(review.busOnly.map((r) => r.camperName)).toEqual(['Alex Lee']);
    expect(review.groupOnly.map((r) => r.camperName)).toEqual(['Sam Kim']);
  });

  it('defaults change-sheet source to paperless', () => {
    expect(parseChangeSheetAttendanceSource(undefined)).toBe('paperless');
    expect(parseChangeSheetAttendanceSource('paper_scan')).toBe('paper_scan');
  });

  it('reads filled Wednesday bubbles on a group sheet', () => {
    const image = makeWhite(240, 360);
    const colW = (240 * 0.38) / 5;
    const x0 = 240 * 0.62;
    const rowsY = [80, 160, 240];
    for (const y of rowsY) {
      for (let c = 0; c < 5; c += 1) {
        const cx = x0 + colW * c + colW / 2;
        if (c === 2 && (y === 80 || y === 240)) fillCircle(image, cx, y, 7, 0);
        else strokeCircle(image, cx, y, 7);
      }
    }
    const result = analyzePaperAttendanceImage(image, {
      kind: 'group',
      weekdayIndex: 2,
      camperCount: 3,
    });
    const flags = omrRowsToAbsentFlags(result.rows, 'group');
    const roster = applyOmrFlagsToRoster([{ name: 'A' }, { name: 'B' }, { name: 'C' }], flags);
    expect(roster.map((r) => r.absent)).toEqual([true, false, true]);
  });

  it('ties camper barcodes to CampMinder person ids', () => {
    expect(encodeCamperBarcode('22032198')).toBe('22032198');
    expect(encodePaperSheetBarcode('bus', 'Bus 3')).toBe('BBUS3');
    expect(decodePaperSheetBarcode('BBUS3')).toEqual({ kind: 'bus', key: 'BUS3' });
    expect(matchPaperSheetLabel('BBUS3', 'bus', ['Bus 1', 'Bus 3'])).toBe('Bus 3');
  });

  it('lists missing sheets after a combined scan', () => {
    expect(missingPaperSheets(['Bus 3', 'Bus 5', 'Bus 7'], ['Bus 3', 'Bus 7'])).toEqual(['Bus 5']);
    expect(
      formatPaperScanChecklist({
        kind: 'bus',
        scannedLabels: ['Bus 3', 'Bus 7'],
        missingLabels: ['Bus 5'],
        unreadPages: [],
      }),
    ).toContain('Missing: Bus 5');
  });

  it('reads AM/PM marks on a bus sheet as one row per camper', () => {
    const width = 240;
    const height = 360;
    const image = makeWhite(width, height);
    const pageRight = width * 0.945;
    const bubbleW = width * (58 / 215.9);
    const bubbleX = pageRight - bubbleW;
    const gutter = bubbleW * (9 / 58);
    const colW = (bubbleW - gutter) / 5;
    const blocks = [
      { top: 70, am: true, pm: false },
      { top: 150, am: false, pm: false },
      { top: 230, am: false, pm: true },
    ];
    for (const block of blocks) {
      for (let c = 0; c < 5; c += 1) {
        const cx = bubbleX + gutter + colW * c + colW / 2;
        const amY = block.top + 12;
        const pmY = block.top + 32;
        if (c === 2 && block.am) fillCircle(image, cx, amY, 6, 0);
        else strokeCircle(image, cx, amY, 6);
        if (c === 2 && block.pm) fillCircle(image, cx, pmY, 6, 0);
        else strokeCircle(image, cx, pmY, 6);
      }
    }
    const result = analyzePaperAttendanceImage(image, {
      kind: 'bus',
      weekdayIndex: 2,
      camperCount: 3,
    });
    const flags = omrRowsToAbsentFlags(result.rows, 'bus');
    const roster = applyOmrFlagsToRoster([{ name: 'A' }, { name: 'B' }, { name: 'C' }], flags);
    expect(result.expectedRows).toBe(3);
    expect(roster.map((r) => r.absent)).toEqual([true, false, true]);
  });

  it('reads header barcodes and flags a missing bus sheet', () => {
    const makePage = (payload: string, fillFirst: boolean) => {
      const image = makeWhite(420, 360);
      rasterCode39(image, 168, 12, payload, { narrow: 1, height: 28 });
      const pageRight = 420 * 0.945;
      const bubbleW = 420 * (58 / 215.9);
      const bubbleX = pageRight - bubbleW;
      const gutter = bubbleW * (9 / 58);
      const colW = (bubbleW - gutter) / 5;
      const cx = bubbleX + gutter + colW * 2 + colW / 2;
      if (fillFirst) fillCircle(image, cx, 82, 7, 0);
      else strokeCircle(image, cx, 82, 7);
      strokeCircle(image, cx, 102, 7);
      return image;
    };
    const batch = processPaperAttendancePages(
      [
        { image: makePage('BBUS3', true), sourceName: 'page-bus3' },
        { image: makePage('BBUS7', false), sourceName: 'page-bus7' },
      ],
      {
        kind: 'bus',
        weekdayIndex: 2,
        expectedLabels: ['Bus 3', 'Bus 5', 'Bus 7'],
        rosterForLabel: (label) => [{ id: label, name: `${label} camper` }],
      },
    );
    expect(batch.scannedLabels.sort()).toEqual(['Bus 3', 'Bus 7']);
    expect(batch.missingLabels).toEqual(['Bus 5']);
  });

  it('pulls page JPEGs out of a copier PDF', () => {
    const jpeg = new Uint8Array(9000);
    jpeg[0] = 0xff;
    jpeg[1] = 0xd8;
    jpeg[8998] = 0xff;
    jpeg[8999] = 0xd9;
    const pdf = new Uint8Array(20 + jpeg.length);
    pdf.set([0x25, 0x50, 0x44, 0x46], 0);
    pdf.set(jpeg, 10);
    expect(extractJpegBuffersFromPdf(pdf)).toHaveLength(1);
  });
});
