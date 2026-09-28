import { format, parseISO } from 'date-fns';
import { Share } from 'react-native';
import { File, Paths } from 'expo-file-system';
import {
  formatOwlTimeCampClock,
  owlTimeRowsToCsv,
  owlTimeStatusLabel,
  type AttendanceDetailRow,
  type AttendanceSummaryRow,
  type DailyRollCallRow,
  type SignInOutHistoryRow,
} from './owlTimeAttendance';
import { installTextCodecPolyfill } from './textCodecPolyfill';

export type OwlTimeExportFormat = 'csv' | 'pdf' | 'xlsx';

export type OwlTimeReportKind = 'summary' | 'daily' | 'detail' | 'history';

export type OwlTimeReportDataset = {
  kind: OwlTimeReportKind;
  title: string;
  subtitle: string;
  season: string;
  dateLabel: string;
  headers: string[];
  rows: (string | number)[][];
  meta?: { label: string; value: string }[];
};

const FORMAT_META: Record<
  OwlTimeExportFormat,
  { label: string; description: string; extension: string }
> = {
  csv: {
    label: 'CSV',
    description: 'Opens in Excel or Google Sheets',
    extension: 'csv',
  },
  pdf: {
    label: 'PDF',
    description: 'Print-ready report with Owl Time branding',
    extension: 'pdf',
  },
  xlsx: {
    label: 'Excel',
    description: 'Native .xlsx workbook',
    extension: 'xlsx',
  },
};

export function owlTimeExportFormatMeta(format: OwlTimeExportFormat) {
  return FORMAT_META[format];
}

export function buildSummaryDataset(
  rows: AttendanceSummaryRow[],
  season: string,
  dateLabel: string,
  periodLabel: string,
): OwlTimeReportDataset {
  return {
    kind: 'summary',
    title: 'Attendance Summary',
    subtitle: `${periodLabel} · Season ${season}`,
    season,
    dateLabel,
    headers: [
      'Staff Name',
      'Scheduled Days',
      'Days Signed In',
      'Days Missing',
      'Days Late',
      'Days On Time',
      'Attendance %',
      'Total Minutes Late',
    ],
    rows: rows.map((row) => [
      row.staffName,
      row.scheduledDays,
      row.daysSignedIn,
      row.daysMissing,
      row.daysLate,
      row.daysOnTime,
      `${row.attendancePct}%`,
      row.totalMinutesLate,
    ]),
    meta: [{ label: 'Staff count', value: String(rows.length) }],
  };
}

export function buildDailyRollCallDataset(
  rows: DailyRollCallRow[],
  season: string,
  date: string,
  periodLabel: string,
): OwlTimeReportDataset {
  const onTime = rows.filter((r) => r.status === 'on_time').length;
  const late = rows.filter((r) => r.status === 'late').length;
  const missing = rows.filter((r) => r.status === 'missing').length;

  return {
    kind: 'daily',
    title: 'Daily Roll Call',
    subtitle: `${periodLabel} · Season ${season}`,
    season,
    dateLabel: date,
    headers: ['Date', 'Staff Name', 'Sign-In', 'Status', 'Minutes Late'],
    rows: rows.map((row) => [
      row.date,
      row.staffName,
      row.signedInAt ? formatOwlTimeCampClock(row.signedInAt) : '',
      owlTimeStatusLabel(row.status),
      row.minutesLate,
    ]),
    meta: [
      { label: 'On time', value: String(onTime) },
      { label: 'Late', value: String(late) },
      { label: 'Missing', value: String(missing) },
    ],
  };
}

export function buildDetailDataset(
  rows: AttendanceDetailRow[],
  staffName: string,
  season: string,
  dateLabel: string,
  periodLabel: string,
): OwlTimeReportDataset {
  return {
    kind: 'detail',
    title: 'Attendance Detail',
    subtitle: `${staffName} · ${periodLabel} · Season ${season}`,
    season,
    dateLabel,
    headers: ['Staff Name', 'Date', 'Sign-In', 'Status', 'Minutes Late'],
    rows: rows.map((row) => [
      staffName,
      format(parseISO(row.date), 'EEE, MMM d, yyyy'),
      row.signedInAt ? formatOwlTimeCampClock(row.signedInAt) : '',
      owlTimeStatusLabel(row.status),
      row.minutesLate,
    ]),
    meta: [{ label: 'Days shown', value: String(rows.length) }],
  };
}

export function buildHistoryDataset(
  rows: SignInOutHistoryRow[],
  staffName: string,
  season: string,
  dateLabel: string,
  periodLabel: string,
): OwlTimeReportDataset {
  return {
    kind: 'history',
    title: 'Sign-In/Out History',
    subtitle: `${staffName} · ${periodLabel} · Season ${season}`,
    season,
    dateLabel,
    headers: [
      'Staff Name',
      'Date',
      'Sign-In',
      'Sign-Out',
      'Total Hours',
      'Late',
      'Minutes Late',
      'Early Departure',
    ],
    rows: rows.map((row) => [
      staffName,
      format(parseISO(row.date), 'EEE, MMM d, yyyy'),
      row.signedInAt ? formatOwlTimeCampClock(row.signedInAt) : '',
      row.signedOutAt ? formatOwlTimeCampClock(row.signedOutAt) : '',
      row.totalHours != null ? row.totalHours.toFixed(2) : '',
      row.isLate ? 'Yes' : 'No',
      row.minutesLate,
      row.isEarlyDeparture ? 'Yes' : 'No',
    ]),
    meta: [{ label: 'Punch days', value: String(rows.length) }],
  };
}

export function owlTimeExportFilename(dataset: OwlTimeReportDataset, format: OwlTimeExportFormat): string {
  const ext = FORMAT_META[format].extension;
  return `owl-time-${dataset.kind}-${dataset.season}-${dataset.dateLabel}.${ext}`;
}

async function buildPdfBytes(dataset: OwlTimeReportDataset): Promise<Uint8Array> {
  installTextCodecPolyfill();
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default as (
    doc: InstanceType<typeof jsPDF>,
    options: Record<string, unknown>,
  ) => void;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  doc.setFillColor(10, 30, 66);
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Owl Time', margin, 10);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(dataset.title, margin, 16);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.text(dataset.subtitle, margin, 28);

  let metaY = 33;
  if (dataset.meta?.length) {
    const metaLine = dataset.meta.map((m) => `${m.label}: ${m.value}`).join('   ·   ');
    doc.setTextColor(100, 116, 139);
    doc.text(metaLine, margin, metaY);
    metaY += 6;
  }

  autoTable(doc, {
    head: [dataset.headers],
    body: dataset.rows.map((row) => row.map(String)),
    startY: metaY + 2,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: (data: { pageNumber: number }) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Generated ${new Date().toLocaleString('en-US')} · Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' },
      );
    },
  });

  const buffer = doc.output('arraybuffer') as ArrayBuffer;
  return new Uint8Array(buffer);
}

async function buildXlsxBytes(dataset: OwlTimeReportDataset): Promise<Uint8Array> {
  const XLSX = await import('xlsx');
  const sheetRows = [dataset.headers, ...dataset.rows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  worksheet['!cols'] = dataset.headers.map((header) => ({
    wch: Math.max(header.length + 2, 14),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, dataset.title.slice(0, 31));
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Uint8Array(buffer);
}

function buildCsvText(dataset: OwlTimeReportDataset): string {
  return owlTimeRowsToCsv(dataset.headers, dataset.rows);
}

export async function shareOwlTimeExport(
  format: OwlTimeExportFormat,
  dataset: OwlTimeReportDataset,
): Promise<void> {
  const filename = owlTimeExportFilename(dataset, format);
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create({ overwrite: true });

  if (format === 'pdf') {
    const bytes = await buildPdfBytes(dataset);
    file.write(bytes);
    await Share.share({ url: file.uri, title: filename });
    return;
  }

  if (format === 'xlsx') {
    const bytes = await buildXlsxBytes(dataset);
    file.write(bytes);
    await Share.share({ url: file.uri, title: filename });
    return;
  }

  const csv = buildCsvText(dataset);
  file.write(csv);
  await Share.share({ url: file.uri, title: filename, message: csv });
}
