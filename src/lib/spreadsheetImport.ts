import * as XLSX from 'xlsx';
import { normalizeRowKeys } from './spreadsheetRowUtils';

const SPREADSHEET_EXTENSIONS = ['.csv', '.txt', '.xlsx', '.xls'];

export function isSpreadsheetFileName(fileName: string): boolean {
    const lower = fileName.toLowerCase();
    return SPREADSHEET_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function recordsToObjects(records: string[][]): Record<string, unknown>[] {
    if (records.length === 0) return [];
    const headers = records[0].map((h) => h.replace(/^"|"$/g, '').trim());
    return records.slice(1).map((values) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((header, index) => {
            const v = values[index];
            obj[header] = v != null && String(v).length > 0 ? String(v).trim() : null;
        });
        return normalizeRowKeys(obj);
    });
}

/** Parse CSV text into row objects. */
export function parseCsvTextToRows(text: string, parseCsvDocument: (t: string) => string[][]): Record<string, unknown>[] {
    const records = parseCsvDocument(text);
    return recordsToObjects(records);
}

/** Parse Excel ArrayBuffer into row objects (first sheet). */
export function parseExcelBufferToRows(buffer: ArrayBuffer): Record<string, unknown>[] {
    const wb = XLSX.read(buffer, { type: 'array', cellDates: false, raw: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return [];
    const sheet = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: null,
        raw: true,
    });
    return json.map((row) => normalizeRowKeys(row));
}
