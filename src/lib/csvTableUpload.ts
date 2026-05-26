import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import {
    CSV_REPLACE_CLEAR_TABLES,
    type CsvImportMode,
    syncChildrenFromCsv,
    syncStaffFromCsv,
} from './csvRosterSync';
import {
    awardSchema,
    calendarEventSchema,
    childSchema,
    dailyNoteSchema,
    dailyWolfContentSchema,
    incidentReportSchema,
    medicationSchema,
    menuItemSchema,
    parseAwardRow,
    parseCalendarEventRow,
    parseChildRow,
    parseDailyNoteRow,
    parseDailyWolfContentRow,
    parseIncidentReportRow,
    parseMedicationRow,
    parseMenuItemRow,
    parseSpecialEventActivityRow,
    parseSportsAcademyRow,
    parseSportsCalendarRow,
    parseStaffRow,
    parseTripRow,
    specialEventActivitySchema,
    sportsAcademySchema,
    sportsCalendarSchema,
    staffSchema,
    tripSchema,
} from './validationSchemas';

/** Tables supported by web `CSVUploader` plus sports_academy & special_events_activities (referenced by web pages). */
export type CsvTableName =
    | 'children'
    | 'staff'
    | 'awards'
    | 'daily_notes'
    | 'trips'
    | 'menu_items'
    | 'incident_reports'
    | 'medication_logs'
    | 'master_calendar'
    | 'sports_calendar'
    | 'daily_wolf_content'
    | 'sports_academy'
    | 'special_events_activities';

const CHILD_PERSON_ID_TABLES: CsvTableName[] = ['awards', 'daily_notes', 'incident_reports', 'medication_logs'];

const CSV_MEAL_SLOT_TO_LABEL: Record<string, string> = {
    'BEFORE BREAKFAST': 'Before Breakfast',
    'AFTER BREAKFAST': 'After Breakfast',
    'BEFORE LUNCH': 'Before Lunch',
    'AFTER LUNCH': 'After Lunch',
    'BEFORE DINNER': 'Before Dinner',
    'AFTER DINNER': 'After Dinner',
    BEDTIME: 'Bedtime',
    BED: 'Bedtime',
};

const STANDARD_MEAL_SCHEDULE_HHMM: Record<string, string> = {
    'Before Breakfast': '08:00',
    'After Breakfast': '09:00',
    'Before Lunch': '12:00',
    'After Lunch': '13:00',
    'Before Dinner': '18:00',
    'After Dinner': '19:00',
};

const WEEKDAY_ALIASES: Record<string, string> = {
    SUNDAY: 'Sunday',
    MONDAY: 'Monday',
    TUESDAY: 'Tuesday',
    WEDNESDAY: 'Wednesday',
    THURSDAY: 'Thursday',
    FRIDAY: 'Friday',
    SATURDAY: 'Saturday',
};

function formatZodIssues(err: z.ZodError): string {
    return err.issues.map((e) => `${e.path.join('.') || 'field'}: ${e.message}`).join(', ');
}

function localDateYmd(d: Date = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function parseCsvDocument(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let i = 0;
    let inQuotes = false;

    while (i < text.length) {
        const c = text[i];

        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i += 2;
                    continue;
                }
                inQuotes = false;
                i++;
                continue;
            }
            field += c;
            i++;
            continue;
        }

        if (c === '"') {
            inQuotes = true;
            i++;
            continue;
        }

        if (c === ',') {
            row.push(field);
            field = '';
            i++;
            continue;
        }

        if (c === '\r') {
            if (text[i + 1] === '\n') i++;
            row.push(field);
            field = '';
            rows.push(row);
            row = [];
            i++;
            continue;
        }

        if (c === '\n') {
            row.push(field);
            field = '';
            rows.push(row);
            row = [];
            i++;
            continue;
        }

        field += c;
        i++;
    }

    row.push(field);
    rows.push(row);

    while (rows.length > 1) {
        const last = rows[rows.length - 1];
        if (last.every((cell) => cell === '')) {
            rows.pop();
        } else {
            break;
        }
    }

    return rows;
}

function parseCsvToRawRows(text: string): { rawRows: Record<string, unknown>[] } | { error: string } {
    const records = parseCsvDocument(text);
    if (records.length === 0) return { error: 'CSV file is empty' };
    if (records.length > 1001) return { error: 'CSV file too large. Maximum 1000 rows allowed.' };
    const headers = records[0].map((h) => h.trim().replace(/^"|"$/g, ''));
    const rawRows = records.slice(1).map((values) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((header, index) => {
            const v = values[index];
            obj[header] = v != null && String(v).length > 0 ? String(v).trim() : null;
        });
        return obj;
    });
    return { rawRows };
}

/** Normalize common date formats to YYYY-MM-DD for Postgres DATE columns. */
export function normalizeFlexibleDate(raw: string | undefined | null): string {
    const t = (raw ?? '').trim();
    if (!t) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
    const mdy = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (mdy) {
        const mm = mdy[1].padStart(2, '0');
        const dd = mdy[2].padStart(2, '0');
        return `${mdy[3]}-${mm}-${dd}`;
    }
    return t;
}

function normalizeDateStringOrNull(value: unknown): string | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (us) {
        const mm = us[1].padStart(2, '0');
        const dd = us[2].padStart(2, '0');
        return `${us[3]}-${mm}-${dd}`;
    }
    return null;
}

function normalizeMedicationFrequencyValue(raw: unknown): string | null {
    const v = String(raw ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
    if (!v) return null;
    if (['DAILY', 'EVERY DAY', 'EVERYDAY', 'QD'].includes(v)) return 'daily';
    if (['WEEKLY', 'EVERY WEEK'].includes(v)) return 'weekly';
    if (['CUSTOM', 'MONTHLY', 'EVERY MONTH'].includes(v)) return 'custom';
    if (['AS NEEDED', 'PRN'].includes(v)) return null;
    if (WEEKDAY_ALIASES[v]) return 'weekly';
    return null;
}

function normalizeMedicationDaysOfWeek(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const out = raw
        .map((d) => WEEKDAY_ALIASES[String(d ?? '').trim().toUpperCase()] ?? null)
        .filter((d): d is string => Boolean(d));
    return Array.from(new Set(out));
}

function sanitizeMedicationLogRowForInsert(row: Record<string, unknown>): void {
    const normalizedDate = normalizeDateStringOrNull(row.date);
    row.date = normalizedDate || localDateYmd();

    row.end_date = normalizeDateStringOrNull(row.end_date);

    const normalizedFrequency = normalizeMedicationFrequencyValue(row.frequency);
    row.frequency = normalizedFrequency;
    row.days_of_week = normalizeMedicationDaysOfWeek(row.days_of_week);
    if (!row.is_recurring && !normalizedFrequency) {
        row.days_of_week = [];
    }

    const rawSlot = String(row.scheduled_time ?? '')
        .trim()
        .replace(/\s+/g, ' ');
    const upper = rawSlot.toUpperCase();
    const isAsNeeded = !upper || upper.includes('AS NEEDED') || upper === 'PRN';

    if (isAsNeeded) {
        row.scheduled_time = null;
        row.meal_time = null;
        return;
    }

    const label = CSV_MEAL_SLOT_TO_LABEL[upper];
    if (!label) {
        row.scheduled_time = null;
        row.meal_time = null;
        return;
    }

    row.meal_time = [label];
    if (label === 'Bedtime') {
        row.scheduled_time = '21:00';
    } else {
        row.scheduled_time = STANDARD_MEAL_SCHEDULE_HHMM[label] ?? '12:00';
    }
}

async function resolveChildPersonIds(
    client: SupabaseClient,
    companyId: string,
    season: string,
    personIds: string[]
): Promise<Map<string, string>> {
    if (!companyId || personIds.length === 0) return new Map();
    const { data } = await client
        .from('children')
        .select('id, person_id')
        .eq('company_id', companyId)
        .eq('season', season)
        .neq('status', 'inactive')
        .in('person_id', personIds);
    const mapping = new Map<string, string>();
    (data || []).forEach((child: { id: string; person_id: string | null }) => {
        if (child.person_id) mapping.set(child.person_id, child.id);
    });
    return mapping;
}

async function resolveStaffPersonIds(
    client: SupabaseClient,
    companyId: string,
    personIds: string[]
): Promise<Map<string, string>> {
    if (!companyId || personIds.length === 0) return new Map();
    const { data } = await client
        .from('staff')
        .select('id, person_id')
        .eq('company_id', companyId)
        .in('person_id', personIds);
    const mapping = new Map<string, string>();
    (data || []).forEach((s: { id: string; person_id: string | null }) => {
        if (s.person_id) mapping.set(s.person_id, s.id);
    });
    return mapping;
}

type SchemaParser = {
    schema: z.ZodTypeAny;
    parser: (row: Record<string, any>) => Record<string, unknown>;
};

function getSchemaParser(tableName: CsvTableName): SchemaParser | { error: string } {
    switch (tableName) {
        case 'children':
            return { schema: childSchema, parser: parseChildRow };
        case 'staff':
            return { schema: staffSchema, parser: parseStaffRow };
        case 'awards':
            return { schema: awardSchema, parser: parseAwardRow };
        case 'daily_notes':
            return { schema: dailyNoteSchema, parser: parseDailyNoteRow };
        case 'trips':
            return { schema: tripSchema, parser: parseTripRow };
        case 'menu_items':
            return { schema: menuItemSchema, parser: parseMenuItemRow };
        case 'incident_reports':
            return { schema: incidentReportSchema, parser: parseIncidentReportRow };
        case 'medication_logs':
            return { schema: medicationSchema, parser: parseMedicationRow };
        case 'master_calendar':
            return { schema: calendarEventSchema, parser: parseCalendarEventRow };
        case 'sports_calendar':
            return { schema: sportsCalendarSchema, parser: parseSportsCalendarRow };
        case 'daily_wolf_content':
            return { schema: dailyWolfContentSchema, parser: parseDailyWolfContentRow };
        case 'sports_academy':
            return { schema: sportsAcademySchema, parser: parseSportsAcademyRow };
        case 'special_events_activities':
            return { schema: specialEventActivitySchema, parser: parseSpecialEventActivityRow };
        default:
            return { error: `Unsupported table: ${tableName}` };
    }
}

export type CsvUploadResult = { ok: true; message: string } | { ok: false; error: string };

export type { CsvImportMode };

/**
 * Validates and uploads CSV text to Supabase — mirrors web `CSVUploader` behavior.
 */
export async function uploadCsvFromText(
    tableName: CsvTableName,
    csvText: string,
    ctx: { companyId: string; season: string; mode?: CsvImportMode },
    client: SupabaseClient = supabase
): Promise<CsvUploadResult> {
    const { companyId, season, mode = 'merge' } = ctx;
    if (!companyId) return { ok: false, error: 'Company is not selected.' };

    const parsed = parseCsvToRawRows(csvText);
    if ('error' in parsed) return { ok: false, error: parsed.error };

    const sp = getSchemaParser(tableName);
    if ('error' in sp) return { ok: false, error: sp.error };

    const { schema, parser } = sp;
    const validatedRows: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < parsed.rawRows.length; i++) {
        try {
            const raw = parsed.rawRows[i] as Record<string, any>;
            const pre = parser(raw);
            if (tableName === 'medication_logs') {
                const pid = String(pre.person_id ?? '').trim();
                const med = String(pre.medication_name ?? '').trim();
                const dose = String(pre.dosage ?? '').trim();
                if (!pid && !med && !dose) continue;
            }
            const validated = schema.parse(pre);
            validatedRows.push(validated);
        } catch (error) {
            if (error instanceof z.ZodError) {
                errors.push(`Row ${i + 2}: ${formatZodIssues(error)}`);
            } else {
                errors.push(`Row ${i + 2}: Invalid data format`);
            }
        }
    }

    if (errors.length > 0) {
        const head = errors.slice(0, 5).join('\n');
        const more = errors.length > 5 ? `\n...and ${errors.length - 5} more errors` : '';
        return { ok: false, error: `Validation failed:\n${head}${more}` };
    }

    // --- CHILDREN / STAFF: merge or replace roster ---
    if (tableName === 'children') {
        const result = await syncChildrenFromCsv(client, validatedRows, { companyId, season, mode });
        if ('error' in result) return { ok: false, error: result.error };
        return { ok: true, message: result.message };
    }

    if (tableName === 'staff') {
        const result = await syncStaffFromCsv(client, validatedRows, { companyId, season, mode });
        if ('error' in result) return { ok: false, error: result.error };
        return { ok: true, message: result.message };
    }

    // Resolve person_ids for child-linked tables
    let childPersonIdMap = new Map<string, string>();
    let staffPersonIdMap = new Map<string, string>();

    if (CHILD_PERSON_ID_TABLES.includes(tableName)) {
        const personIds = new Set<string>();
        validatedRows.forEach((row) => {
            if (row.person_id) personIds.add(row.person_id);
            if (row.person_ids) (row.person_ids as string[]).forEach((id: string) => personIds.add(id));
        });
        childPersonIdMap = await resolveChildPersonIds(client, companyId, season, Array.from(personIds));

        const missingIds: string[] = [];
        validatedRows.forEach((row, i) => {
            if (row.person_id && !childPersonIdMap.has(row.person_id)) {
                missingIds.push(`Row ${i + 2}: Person ID "${row.person_id}" not found`);
            }
            if (row.person_ids) {
                (row.person_ids as string[]).forEach((id: string) => {
                    if (!childPersonIdMap.has(id)) {
                        missingIds.push(`Row ${i + 2}: Person ID "${id}" not found`);
                    }
                });
            }
        });
        if (missingIds.length > 0) {
            const head = missingIds.slice(0, 5).join('\n');
            const more = missingIds.length > 5 ? `\n...and ${missingIds.length - 5} more` : '';
            return { ok: false, error: `Person ID errors:\n${head}${more}` };
        }
    }

    // Reporter staff IDs for incidents
    if (tableName === 'incident_reports') {
        const reporterIds = new Set<string>();
        validatedRows.forEach((row) => {
            if (row.reporter_person_id) reporterIds.add(row.reporter_person_id as string);
        });
        if (reporterIds.size > 0) {
            staffPersonIdMap = await resolveStaffPersonIds(client, companyId, Array.from(reporterIds));
        }
    }

    // --- INCIDENT REPORTS: insert parent + incident_children (junction) ---
    if (tableName === 'incident_reports') {
        let ok = 0;
        const fail: string[] = [];
        for (let i = 0; i < validatedRows.length; i++) {
            const row = validatedRows[i];
            const ids = (row.person_ids as string[]) || [];
            const childIds = ids.map((pid) => childPersonIdMap.get(pid)).filter(Boolean) as string[];
            if (childIds.length === 0) {
                fail.push(`Row ${i + 2}: at least one valid Person ID is required`);
                continue;
            }

            let reporter_id: string | undefined;
            if (row.reporter_person_id && staffPersonIdMap.has(row.reporter_person_id)) {
                reporter_id = staffPersonIdMap.get(row.reporter_person_id);
            }

            const dateIso = normalizeFlexibleDate(row.date) || String(row.date);
            const { data: report, error: insErr } = await client
                .from('incident_reports')
                .insert({
                    company_id: companyId,
                    season,
                    date: dateIso,
                    type: row.type || 'General',
                    description: row.description || '',
                    severity: row.severity || null,
                    reported_by: row.reported_by || null,
                    reporter_id: reporter_id ?? null,
                    status: row.status || 'open',
                    tags: row.tags || [],
                } as any)
                .select('id')
                .single();

            if (insErr || !report?.id) {
                fail.push(`Row ${i + 2}: ${insErr?.message || 'insert failed'}`);
                continue;
            }

            const links = childIds.map((child_id) => ({
                incident_id: report.id,
                child_id,
            }));
            const { error: linkErr } = await client.from('incident_children').insert(links);
            if (linkErr) {
                fail.push(`Row ${i + 2}: children link: ${linkErr.message}`);
                continue;
            }
            ok++;
        }
        if (ok === 0 && fail.length > 0) {
            return { ok: false, error: fail.slice(0, 8).join('\n') };
        }
        const tail = fail.length ? ` (${fail.length} row(s) skipped)` : '';
        return { ok: true, message: `Uploaded ${ok} incident report(s)${tail}` };
    }

    // --- SPORTS ACADEMY ---
    if (tableName === 'sports_academy') {
        const academyPersonIds = validatedRows.map((r) => r.person_id as string).filter(Boolean);
        const academyChildMap = await resolveChildPersonIds(client, companyId, season, academyPersonIds);
        const rowsOut: Record<string, unknown>[] = [];
        for (const row of validatedRows) {
            const pid = row.person_id as string;
            const child_id = academyChildMap.get(pid);
            if (!child_id) {
                return { ok: false, error: `Person ID "${pid}" not found for sports academy row` };
            }
            rowsOut.push({
                company_id: companyId,
                season,
                child_id,
                sport_name: row.sport_name,
                instructor: row.instructor ?? null,
                start_date: row.start_date ? normalizeFlexibleDate(row.start_date) : null,
                end_date: row.end_date ? normalizeFlexibleDate(row.end_date) : null,
                notes: row.notes ?? null,
                schedule_periods: row.schedule_periods ?? null,
            });
        }
        const { error } = await client.from('sports_academy').insert(rowsOut as any);
        if (error) return { ok: false, error: error.message };
        return { ok: true, message: `Successfully uploaded ${rowsOut.length} enrollment(s)` };
    }

    const rowsWithCompany = validatedRows.map((row) => {
        const baseRow: Record<string, unknown> = {
            ...row,
            company_id: companyId,
            season,
        };

        if (CHILD_PERSON_ID_TABLES.includes(tableName)) {
            if (row.person_id) {
                baseRow.child_id = childPersonIdMap.get(row.person_id);
                delete baseRow.person_id;
            }
            if (row.person_ids) {
                delete baseRow.person_ids;
            }
            if (row.reporter_person_id && staffPersonIdMap.has(row.reporter_person_id)) {
                baseRow.reporter_id = staffPersonIdMap.get(row.reporter_person_id);
                delete baseRow.reporter_person_id;
            }
        }

        if (tableName === 'awards') {
            baseRow.date = normalizeFlexibleDate(row.date as string) || row.date;
        }

        if (tableName === 'master_calendar' || tableName === 'sports_calendar') {
            baseRow.event_date = normalizeFlexibleDate(row.event_date as string) || row.event_date;
        }

        if (tableName === 'trips') {
            baseRow.date = normalizeFlexibleDate(row.date as string) || row.date;
            if (row.end_date) {
                baseRow.end_date = normalizeFlexibleDate(row.end_date as string) || row.end_date;
            }
        }

        if (tableName === 'menu_items') {
            baseRow.date = normalizeFlexibleDate(row.date as string) || row.date;
        }

        if (tableName === 'medication_logs') {
            sanitizeMedicationLogRowForInsert(baseRow);
        }

        if (tableName === 'daily_notes') {
            baseRow.date = normalizeFlexibleDate(row.date as string) || row.date;
        }

        if (tableName === 'daily_wolf_content') {
            baseRow.date = normalizeFlexibleDate(row.date as string) || row.date;
        }

        if (tableName === 'special_events_activities') {
            baseRow.event_date = normalizeFlexibleDate(row.event_date as string) || row.event_date;
            baseRow.start_time = row.start_time || null;
            baseRow.end_time = row.end_time ?? null;
        }

        return baseRow;
    });

    if (mode === 'replace' && CSV_REPLACE_CLEAR_TABLES.has(tableName)) {
        const { error: clearError } = await client
            .from(tableName as any)
            .delete()
            .eq('company_id', companyId)
            .eq('season', season);
        if (clearError) return { ok: false, error: clearError.message };
    }

    const { error } = await client.from(tableName as any).insert(rowsWithCompany as any);
    if (error) return { ok: false, error: error.message };

    return { ok: true, message: `Successfully uploaded ${validatedRows.length} records` };
}
