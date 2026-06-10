import * as DocumentPicker from 'expo-document-picker';
import { isSpreadsheetFileName, parseCsvTextToRows, parseExcelBufferToRows } from './spreadsheetImport';

const SPREADSHEET_MIME_TYPES = [
    'text/csv',
    'text/comma-separated-values',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export type SpreadsheetPickResult =
    | { ok: true; fileName: string; rows: Record<string, unknown>[] }
    | { ok: false; error: 'canceled' | 'unsupported' | 'read_failed' | 'empty'; message?: string };

/**
 * Opens the system file picker for CSV or Excel and returns parsed row objects.
 */
export async function pickAndReadSpreadsheetRows(
    parseCsvDocument: (text: string) => string[][],
): Promise<SpreadsheetPickResult> {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            type: [...SPREADSHEET_MIME_TYPES],
        });
        if (result.canceled || !result.assets?.[0]?.uri) {
            return { ok: false, error: 'canceled' };
        }

        const asset = result.assets[0];
        const name = asset.name || 'upload.csv';
        if (!isSpreadsheetFileName(name)) {
            return {
                ok: false,
                error: 'unsupported',
                message: 'Please choose a .csv, .xlsx, or .xls file.',
            };
        }

        const lower = name.toLowerCase();
        let rows: Record<string, unknown>[];

        if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
            const response = await fetch(asset.uri);
            const buffer = await response.arrayBuffer();
            rows = parseExcelBufferToRows(buffer);
        } else {
            const text = await (await fetch(asset.uri)).text();
            rows = parseCsvTextToRows(text, parseCsvDocument);
        }

        if (rows.length === 0) {
            return { ok: false, error: 'empty', message: 'Spreadsheet has no data rows.' };
        }
        if (rows.length > 1000) {
            return { ok: false, error: 'read_failed', message: 'Maximum 1000 data rows allowed.' };
        }

        return { ok: true, fileName: name, rows };
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Could not read file';
        return { ok: false, error: 'read_failed', message };
    }
}

/** @deprecated Prefer pickAndReadSpreadsheetRows for CSV and Excel. */
export async function pickAndReadCsvText(): Promise<
    | { ok: true; fileName: string; text: string }
    | { ok: false; error: 'canceled' | 'not_csv' | 'read_failed'; message?: string }
> {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            type: [...SPREADSHEET_MIME_TYPES],
        });
        if (result.canceled || !result.assets?.[0]?.uri) {
            return { ok: false, error: 'canceled' };
        }

        const asset = result.assets[0];
        const name = asset.name || 'upload.csv';
        const lower = name.toLowerCase();
        if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
            return {
                ok: false,
                error: 'not_csv',
                message: 'Excel files are supported on the Health screen upload. Choose a .csv file here, or use Health → Upload.',
            };
        }
        if (!lower.endsWith('.csv') && !lower.endsWith('.txt')) {
            return { ok: false, error: 'not_csv', message: 'Please choose a .csv file.' };
        }

        const text = await (await fetch(asset.uri)).text();
        if (!text.trim()) {
            return { ok: false, error: 'read_failed', message: 'File is empty.' };
        }
        return { ok: true, fileName: name, text };
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Could not read file';
        return { ok: false, error: 'read_failed', message };
    }
}
