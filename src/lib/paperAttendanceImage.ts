import type { RgbaImage } from './paperAttendanceOmr';
import { extractPdfLiteralStrings } from './paperAttendancePdfText';
import type { PaperScanPage } from './paperAttendanceScan';

type JpegDecode = (data: Uint8Array, options?: { useTArray?: boolean; maxMemoryUsageInMB?: number }) => {
  width: number;
  height: number;
  data: Uint8Array;
};

function findAscii(buf: Uint8Array, ascii: string, from = 0): number {
  const n = ascii.length;
  outer: for (let i = from; i <= buf.length - n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      if (buf[i + j] !== ascii.charCodeAt(j)) continue outer;
    }
    return i;
  }
  return -1;
}

/** Real JPEGs start SOI + another marker. Copier Flate streams often contain stray FFD8 bytes. */
export function isStandaloneJpegPayload(buf: Uint8Array): boolean {
  return (
    buf.length >= 8000
    && buf[0] === 0xff
    && buf[1] === 0xd8
    && buf[2] === 0xff
    && buf[buf.length - 2] === 0xff
    && buf[buf.length - 1] === 0xd9
  );
}

export function extractJpegBuffersFromPdf(buf: Uint8Array): Uint8Array[] {
  const out: Uint8Array[] = [];
  let i = 0;
  while (i < buf.length - 1) {
    if (buf[i] === 0xff && buf[i + 1] === 0xd8) {
      let j = i + 2;
      while (j < buf.length - 1 && !(buf[j] === 0xff && buf[j + 1] === 0xd9)) j += 1;
      if (j < buf.length - 1) {
        const slice = buf.slice(i, j + 2);
        if (isStandaloneJpegPayload(slice)) out.push(slice);
        i = j + 2;
        continue;
      }
    }
    i += 1;
  }
  return out;
}

export function extractFlateDctJpegBuffers(
  buf: Uint8Array,
  inflate: (data: Uint8Array) => Uint8Array,
): Uint8Array[] {
  const out: Uint8Array[] = [];
  let from = 0;
  while (from < buf.length) {
    const streamAt = findAscii(buf, "stream", from);
    if (streamAt < 0) break;
    if (
      streamAt >= 3
      && buf[streamAt - 3] === 101
      && buf[streamAt - 2] === 110
      && buf[streamAt - 1] === 100
    ) {
      from = streamAt + 6;
      continue;
    }
    const header = new TextDecoder("latin1").decode(buf.subarray(Math.max(0, streamAt - 480), streamAt));
    let dataStart = streamAt + 6;
    if (buf[dataStart] === 13 && buf[dataStart + 1] === 10) dataStart += 2;
    else if (buf[dataStart] === 10 || buf[dataStart] === 13) dataStart += 1;
    const end = findAscii(buf, "endstream", dataStart);
    if (end < 0) break;
    from = end + 9;
    if (!header.includes("DCTDecode") || !header.includes("FlateDecode")) continue;
    let data = buf.subarray(dataStart, end);
    if (data.length >= 2 && data[data.length - 2] === 13 && data[data.length - 1] === 10) {
      data = data.subarray(0, data.length - 2);
    } else if (data.length >= 1 && (data[data.length - 1] === 10 || data[data.length - 1] === 13)) {
      data = data.subarray(0, data.length - 1);
    }
    try {
      const raw = inflate(data);
      if (raw.length >= 8000 && raw[0] === 0xff && raw[1] === 0xd8) out.push(raw);
    } catch {
      /* skip a bad stream */
    }
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
    let jpegs = extractJpegBuffersFromPdf(buf);
    try {
      const { unzlibSync } = await import("fflate");
      const inflated = extractFlateDctJpegBuffers(buf, (data) => unzlibSync(data));
      if (inflated.length) jpegs = inflated;
    } catch {
      /* jpeg-js path still handles plain DCT copier PDFs */
    }
    if (jpegs.length) {
      try {
        const decode = await jpegDecoder();
        const pages = jpegs.flatMap((jpeg, index) => {
          try {
            const image = decodeJpegBuffer(decode, jpeg);
            if (Math.min(image.width, image.height) < 400) return [];
            return [{ image, sourceName: `${name} page ${index + 1}` }];
          } catch {
            return [];
          }
        });
        if (pages.length) return { documentText, pages };
      } catch {
        /* Fall through to PDF text. */
      }
    }
    if (documentText.trim()) return { pages: [], documentText };
    throw new Error(
      'Could not read that PDF. Use one PDF for all buses, one PDF for all groups, or photos of the pages.',
    );
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
