import type { RgbaImage } from './paperAttendanceOmr';

type JpegDecode = (data: Uint8Array, options?: { useTArray?: boolean; maxMemoryUsageInMB?: number }) => {
  width: number;
  height: number;
  data: Uint8Array;
};

export async function loadRgbaFromUri(uri: string): Promise<RgbaImage> {
  const res = await fetch(uri);
  if (!res.ok) throw new Error('Could not open that photo.');
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf[0] !== 0xff || buf[1] !== 0xd8) {
    throw new Error('Take a JPEG photo of the page.');
  }
  let decode: JpegDecode;
  try {
    const jpeg = await import('jpeg-js');
    decode = jpeg.decode as JpegDecode;
  } catch {
    throw new Error('Photo scan needs a JPEG decoder. Mark names by hand for now.');
  }
  const decoded = decode(buf, { useTArray: true, maxMemoryUsageInMB: 64 });
  return { width: decoded.width, height: decoded.height, data: decoded.data };
}
