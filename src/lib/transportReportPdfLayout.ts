import type jsPDF from "jspdf";
import { format } from "date-fns";

export type TransportPdfLogo = {
  dataUrl: string;
  format: "PNG" | "JPEG" | "WEBP";
};

export type TransportPdfHeaderOptions = {
  companyName: string;
  reportTitle: string;
  metaLines: string[];
  subtitle?: string;
  /** Code 39 payload identifying the sheet (bus vs group) for paper scans. */
  sheetBarcode?: string;
  logo?: TransportPdfLogo | null;
  printedAt?: Date;
};

/** Logo left off on mobile for now (same as web skip). */
export async function loadTransportPdfLogo(
  _logoUrl?: string | null,
): Promise<TransportPdfLogo | null> {
  return null;
}

export function sanitizeBarcodePayload(raw: string): string {
  const cleaned = raw.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  return cleaned.slice(0, 24);
}

/** Header barcode so a scan can tell Bus 3 from Barcelona. */
export function encodePaperSheetBarcode(kind: "bus" | "group", label: string): string {
  const prefix = kind === "bus" ? "B" : "G";
  return sanitizeBarcodePayload(`${prefix}${label}`);
}

/** CODE39 patterns (* = narrow/wide unit sequence). */
const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  "*": "nwnnwnwnn",
};

function measureCode39Width(encoded: string, narrow: number): number {
  const wide = narrow * 3;
  let width = 0;
  for (const ch of encoded) {
    const pattern = CODE39[ch];
    if (!pattern) continue;
    for (const unit of pattern) width += unit === "w" ? wide : narrow;
    width += narrow;
  }
  return width;
}

export function drawCode39Barcode(
  doc: jsPDF,
  x: number,
  y: number,
  payload: string,
  options?: { heightMm?: number; narrowMm?: number; maxWidthMm?: number; label?: boolean },
): number {
  const text = sanitizeBarcodePayload(payload);
  if (!text) return y;

  const encoded = `*${text}*`;
  let narrow = options?.narrowMm ?? 0.35;
  if (options?.maxWidthMm && options.maxWidthMm > 0) {
    const natural = measureCode39Width(encoded, narrow);
    if (natural > options.maxWidthMm) {
      narrow = Math.max(0.12, narrow * (options.maxWidthMm / natural));
    }
  }
  const wide = narrow * 3;
  const barH = options?.heightMm ?? 7;
  let cx = x;

  doc.setFillColor(0);
  doc.setDrawColor(0);

  for (const ch of encoded) {
    const pattern = CODE39[ch];
    if (!pattern) continue;
    let isBar = true;
    for (const unit of pattern) {
      const w = unit === "w" ? wide : narrow;
      if (isBar) {
        doc.rect(cx, y, w, barH, "F");
      }
      cx += w;
      isBar = !isBar;
    }
    cx += narrow;
  }

  if (options?.label !== false) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(text, x, y + barH + 2.5);
  }

  return y + barH + (options?.label !== false ? 4 : 0);
}

export function drawTransportPdfHeader(
  doc: jsPDF,
  margin: number,
  pageWidth: number,
  options: TransportPdfHeaderOptions,
): number {
  let y = margin;
  const logoH = 14;
  const logoW = 28;
  let textX = margin;

  if (options.logo) {
    try {
      doc.addImage(options.logo.dataUrl, options.logo.format, margin, y, logoW, logoH);
      textX = margin + logoW + 4;
    } catch {
      textX = margin;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(options.logo ? 11 : 12);
  doc.text(options.companyName, textX, y + 5);
  doc.setFontSize(10);
  doc.text(options.reportTitle, pageWidth - margin, y + 5, { align: "right" });

  y += options.logo ? logoH + 2 : 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  for (const line of options.metaLines) {
    doc.text(line, pageWidth - margin, y, { align: "right" });
    y += 4;
  }
  const printed = options.printedAt ?? new Date();
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text(`Printed ${format(printed, "MMM d, yyyy h:mm a")}`, pageWidth - margin, y, { align: "right" });
  doc.setTextColor(0);
  y += 4;

  if (options.subtitle) {
    y += 1;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(options.subtitle, margin, y);
    const sheetCode = options.sheetBarcode?.trim();
    if (sheetCode) {
      const barW = 42;
      drawCode39Barcode(doc, pageWidth - margin - barW, y - 7, sheetCode, {
        heightMm: 7,
        narrowMm: 0.22,
        maxWidthMm: barW,
        label: true,
      });
      y += 10;
    } else {
      y += 6;
    }
  }

  doc.setDrawColor(40);
  doc.setLineWidth(0.35);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineWidth(0.15);
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  return y + 3;
}

export function addTransportPdfFooters(doc: jsPDF, printedAt?: Date) {
  const total = doc.getNumberOfPages();
  const stamp = format(printedAt ?? new Date(), "yyyy-MM-dd HH:mm");
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.width;
    const h = doc.internal.pageSize.height;
    doc.setFontSize(7);
    doc.setTextColor(90);
    doc.text(`The Nest · ${stamp}`, 12, h - 5);
    doc.text(`Page ${i} of ${total}`, w / 2, h - 5, { align: "center" });
    doc.setTextColor(0);
  }
}
