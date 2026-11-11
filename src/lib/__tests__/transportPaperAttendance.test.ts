import {
  applyOmrFlagsToRoster,
  parseChangeSheetAttendanceSource,
  reviewPaperAttendance,
  weekdayBubbleIndex,
} from '../paperAttendance';
import {
  analyzePaperAttendanceImage,
  omrRowsToAbsentFlags,
  type RgbaImage,
} from '../paperAttendanceOmr';

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
});
