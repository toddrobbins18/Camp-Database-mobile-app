import type { RgbaImage } from './paperAttendanceOmr';
import { extractPdfLiteralStrings } from './paperAttendancePdfText';
import type { PaperScanPage } from './paperAttendanceScan';

type JpegDecode = (data: Uint8Array, options?: { useTArray?: boolean; maxMemoryUsageInMB?: number }) => {
  width: number;
  height: number;
  data: Uint8Array;
};

export function extractJpegBuffersFromPdf(buf: Uint8Array): Uint8Array[] {
  const out: Uint8Array[] = [];
  let i = 0;
  while (i < buf.length - 1) {
    if (buf[i] === 0xff && buf[i + 1] === 0xd8) {
      let j = i + 2;
      while (j < buf.length - 1 && !(buf[j] === 0xff && buf[j + 1] === 0xd9)) j += 1;
      if (j < buf.length - 1) {
        const slice = buf.slice(i, j + 2);
        if (slice.length >= 8000) out.push(slice);
        i = j + 2;
        continue;
      }
    }
    i += 1;
  }
  return out;
}

async function jpegDecoder(): Promise<JpegDecode> {
  try {
    const jpeg = await import('jpeg-js');
    return jpeg.decode as JpegDecode;
  } catch {
    throw new Error('Photo scan needs a JPEG decoder. Mark names by hand for now.');
  }
}

function decodeJpegBuffer(decode: JpegDecode, buf: Uint8Array): RgbaImage {
  const decoded = decode(buf, { useTArray: true, maxMemoryUsageInMB: 64 });
  return { width: decoded.width, height: decoded.height, data: decoded.data };
}

export async function loadRgbaFromUri(uri: string): Promise<RgbaImage> {
  const pages = await loadRgbaPagesFromUri(uri);
  if (!pages.length) throw new Error('Could not open that photo.');
  return pages[0].image;
}

export type PaperScanFileInput = {
  pages: PaperScanPage[];
  documentText: string;
};

export async function loadPaperScanInputFromUri(
  uri: string,
  mimeHint?: string | null,
  fileName?: string | null,
): Promise<PaperScanFileInput> {
  const res = await fetch(uri);
  if (!res.ok) throw new Error('Could not open that file.');
  const buf = new Uint8Array(await res.arrayBuffer());
  const name = fileName?.trim() || 'scan';
  const isPdf =
    mimeHint === 'application/pdf' ||
    name.toLowerCase().endsWith('.pdf') ||
    (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46);
  if (isPdf) {
    const documentText = extractPdfLiteralStrings(buf);
    const jpegs = extractJpegBuffersFromPdf(buf);
    if (!jpegs.length) {
      if (documentText.trim()) return { pages: [], documentText };
      throw new Error(
        'Could not read that PDF. Use the Nest bus/group PDF, a copier scan, or JPEG photos of every page.',
      );
    }
    const decode = await jpegDecoder();
    return {
      documentText,
      pages: jpegs.map((jpeg, index) => ({
        image: decodeJpegBuffer(decode, jpeg),
        sourceName: `${name} page ${index + 1}`,
      })),
    };
  }
  if (buf[0] !== 0xff || buf[1] !== 0xd8) {
    throw new Error('Take a JPEG photo of the page, or pick a bus/group PDF.');
  }
  const decode = await jpegDecoder();
  return {
    documentText: '',
    pages: [{ image: decodeJpegBuffer(decode, buf), sourceName: name }],
  };
}

export async function loadRgbaPagesFromUri(
  uri: string,
  mimeHint?: string | null,
  fileName?: string | null,
): Promise<Array<{ image: RgbaImage; sourceName: string }>> {
  const { pages } = await loadPaperScanInputFromUri(uri, mimeHint, fileName);
  return pages
    .filter((page): page is PaperScanPage & { image: RgbaImage } => !!page.image)
    .map((page) => ({ image: page.image, sourceName: page.sourceName }));
}
