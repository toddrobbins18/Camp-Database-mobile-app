import * as DocumentPicker from 'expo-document-picker';

const CSV_TYPES = ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain'] as const;

/**
 * Opens the system file picker and returns CSV text (same flow as ODManagementScreen / ActivitiesFieldTrips).
 */
export async function pickAndReadCsvText(): Promise<
    | { ok: true; fileName: string; text: string }
    | { ok: false; error: 'canceled' | 'not_csv' | 'read_failed'; message?: string }
> {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            type: [...CSV_TYPES],
        });
        if (result.canceled || !result.assets?.[0]?.uri) {
            return { ok: false, error: 'canceled' };
        }
        const asset = result.assets[0];
        const name = (asset.name || '').toLowerCase();
        if (name && !name.endsWith('.csv')) {
            return { ok: false, error: 'not_csv', message: 'Please choose a .csv file.' };
        }
        const text = await (await fetch(asset.uri)).text();
        return { ok: true, fileName: asset.name || 'upload.csv', text };
    } catch (e: any) {
        return { ok: false, error: 'read_failed', message: e?.message || 'Could not read file' };
    }
}
