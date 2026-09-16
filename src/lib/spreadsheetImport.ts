import * as XLSX from 'xlsx';
import { normalizeRowKeys } from './spreadsheetRowUtils';

const SPREADSHEET_EXTENSIONS = ['.csv', '.txt', '.xlsx', '.xls'];

export function isSpreadsheetFileName(fileName: string): boolean {
    const lower = fileName.toLowerCase();
    return SPREADSHEET_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function escapeCsvCell(value: string): string {
    if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
}

/** Serialize parsed spreadsheet rows back to CSV text (for legacy CSV-only upload paths). */
export function spreadsheetRowsToCsvText(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';
    const headers = Array.from(
        rows.reduce((set, row) => {
            Object.keys(row).forEach((key) => set.add(key));
            return set;
        }, new Set<string>()),
    );
    const lines = [
        headers.map(escapeCsvCell).join(','),
        ...rows.map((row) =>
            headers
                .map((header) => {
                    const value = row[header];
                    return escapeCsvCell(value == null ? '' : String(value).trim());
                })
                .join(','),
        ),
    ];
    return lines.join('\n');
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
    let lines = text.split(/\r?\n/);
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const lower = lines[i].toLowerCase();
        if (lower.includes('template')) continue;
        
        if (lower.includes('person id') || 
            lower.includes('personid') ||
            lower.includes('bunk number') || 
            lower.includes('bunk name') ||
            lower.includes('day of') ||
            lower.includes('day off') ||
            lower.includes('night off') ||
            lower.includes('is primary') ||
            lower.includes('first name') ||
            lower.includes('last name') ||
            lower.includes('date') ||
            lower.includes('time') ||
            lower.includes('rfid')) {
            headerRowIndex = i;
            break;
        }
    }
    const relevantText = lines.slice(headerRowIndex).join('\n');
    const records = parseCsvDocument(relevantText);
    return recordsToObjects(records);
}

/** Parse Excel ArrayBuffer into row objects (first sheet). */
export function parseExcelBufferToRows(buffer: ArrayBuffer): Record<string, unknown>[] {
    const wb = XLSX.read(buffer, { type: 'array', cellDates: false, raw: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return [];
    const sheet = wb.Sheets[sheetName];

    const range = XLSX.utils.decode_range(sheet['!ref'] || "A1:A1");
    let headerRowIndex = range.s.r;
    
    for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
        let hasHeaders = false;
        for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = sheet[XLSX.utils.encode_cell({r, c})];
            if (cell && cell.v) {
                const val = String(cell.v).toLowerCase();
                if (val.includes('template')) continue;
                
                if (val.includes('person id') || 
                    val.includes('personid') ||
                    val.includes('bunk number') || 
                    val.includes('bunk name') ||
                    val.includes('day of') ||
                    val.includes('day off') ||
                    val.includes('night off') ||
                    val.includes('is primary') ||
                    val.includes('first name') ||
                    val.includes('last name') ||
                    val.includes('date') ||
                    val.includes('time') ||
                    val.includes('rfid')) {
                    hasHeaders = true;
                    break;
                }
            }
        }
        if (hasHeaders) {
            headerRowIndex = r;
            break;
        }
    }
    
    const newRange = { ...range, s: { ...range.s, r: headerRowIndex } };
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: null,
        raw: true,
        range: newRange
    });
    return json.map((row) => normalizeRowKeys(row));
}
