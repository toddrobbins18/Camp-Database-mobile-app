const NATIVE_TEXT_DECODER = globalThis.TextDecoder;
const NATIVE_TEXT_ENCODER = globalThis.TextEncoder;

function toUint8Array(input: AllowSharedBufferSource): Uint8Array {
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
}

function decodeLatin1(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i]);
  }
  return result;
}

function decodeAscii(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i] & 0x7f);
  }
  return result;
}

class TextDecoderPolyfill {
  readonly encoding: string;
  readonly fatal = false;
  readonly ignoreBOM = false;

  constructor(label?: string, _options?: TextDecoderOptions) {
    this.encoding = (label ?? 'utf-8').toLowerCase();
  }

  decode(input?: AllowSharedBufferSource): string {
    if (input == null) return '';
    const bytes = toUint8Array(input);
    const enc = this.encoding;

    if (enc === 'latin1' || enc === 'iso-8859-1') {
      return decodeLatin1(bytes);
    }
    if (enc === 'ascii' || enc === 'us-ascii') {
      return decodeAscii(bytes);
    }
    if ((enc === 'utf-8' || enc === 'utf8') && NATIVE_TEXT_DECODER) {
      return new NATIVE_TEXT_DECODER('utf-8').decode(bytes);
    }

    throw new RangeError(`Unknown encoding: ${enc} (normalized: ${enc})`);
  }
}

class TextEncoderPolyfill {
  readonly encoding = 'utf-8';

  encode(input = ''): Uint8Array {
    if (NATIVE_TEXT_ENCODER) {
      return new NATIVE_TEXT_ENCODER().encode(input);
    }
    const out = new Uint8Array(input.length);
    for (let i = 0; i < input.length; i++) {
      out[i] = input.charCodeAt(i) & 0xff;
    }
    return out;
  }
}

/** Hermes/Expo TextDecoder only supports utf-8; jsPDF needs latin1. */
export function installTextCodecPolyfill() {
  (globalThis as typeof globalThis & { TextDecoder: typeof TextDecoderPolyfill }).TextDecoder =
    TextDecoderPolyfill;
  (globalThis as typeof globalThis & { TextEncoder: typeof TextEncoderPolyfill }).TextEncoder =
    TextEncoderPolyfill;
}
