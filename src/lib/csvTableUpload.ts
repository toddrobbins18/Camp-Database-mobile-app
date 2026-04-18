import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
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

function formatZodIssues(err: z.ZodError): string {
    return err.issues.map((e) => `${e.path.join('.') || 'field'}: ${e.message}`).join(', ');
}

function parseCsvToRawRows(text: string): { rawRows: Record<string, unknown>[] } | { error: string } {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) return { error: 'CSV file is empty' };
    if (lines.length > 1001) return { error: 'CSV file too large. Maximum 1000 rows allowed.' };
    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
    const rawRows = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));
        const obj: Record<string, unknown> = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] ?? null;
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

async function resolveChildPersonIds(
    client: SupabaseClient,
    companyId: string,
    personIds: string[]
): Promise<Map<string, string>> {
    if (!companyId || personIds.length === 0) return new Map();
    const { data } = await client
        .from('children')
        .select('id, person_id')
        .eq('company_id', companyId)
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

/**
 * Validates and uploads CSV text to Supabase — mirrors `lovable-web-app` `CSVUploader` behavior.
 */
export async function uploadCsvFromText(
    tableName: CsvTableName,
    csvText: string,
    ctx: { companyId: string; season: string },
    client: SupabaseClient = supabase
): Promise<CsvUploadResult> {
    const { companyId, season } = ctx;
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

    // --- CHILDREN (roster sync) ---
    if (tableName === 'children') {
        const csvPersonIds = new Set(validatedRows.map((r) => r.person_id).filter(Boolean));

        const { data: existingChildren } = await client
            .from('children')
            .select('id, name, person_id, status')
            .eq('company_id', companyId)
            .eq('season', season)
            .neq('status', 'inactive');

        const existingMap = new Map<string, { id: string; name: string; person_id: string }>();
        (existingChildren || []).forEach((child: any) => {
            if (child.person_id) existingMap.set(child.person_id, child);
        });

        const toUpdate: { existingId: string; data: Record<string, unknown> }[] = [];
        const toInsert: Record<string, unknown>[] = [];

        for (const row of validatedRows) {
            const rowData: Record<string, unknown> = {
                ...row,
                company_id: companyId,
                season,
                status: 'active',
            };

            if (row.person_id && existingMap.has(row.person_id)) {
                toUpdate.push({ existingId: existingMap.get(row.person_id)!.id, data: rowData });
            } else {
                toInsert.push(rowData);
            }
        }

        if (toInsert.length > 0) {
            const { error: insertError } = await client.from('children').insert(toInsert as any);
            if (insertError) return { ok: false, error: insertError.message };
        }

        let updateErrors = 0;
        for (const item of toUpdate) {
            const { existingId, data } = item;
            const updatePayload = { ...data };
            delete updatePayload.person_id;
            const { error: updateError } = await client.from('children').update(updatePayload as any).eq('id', existingId);
            if (updateError) updateErrors++;
        }

        const dropped = (existingChildren || []).filter(
            (child: any) => child.person_id && !csvPersonIds.has(child.person_id) && child.status !== 'inactive'
        );

        if (dropped.length > 0) {
            const droppedIds = dropped.map((c: any) => c.id);
            const { error: dropError } = await client.from('children').update({ status: 'inactive' } as any).in('id', droppedIds);
            if (dropError) {
                console.warn('csv children drop:', dropError);
            }
        }

        const summary: string[] = [];
        if (toInsert.length > 0) summary.push(`${toInsert.length} added`);
        if (toUpdate.length > 0) summary.push(`${toUpdate.length} updated`);
        if (dropped.length > 0) summary.push(`${dropped.length} dropped`);
        if (updateErrors > 0) summary.push(`${updateErrors} update errors`);
        return { ok: true, message: `Camper sync complete: ${summary.join(', ') || 'no changes'}` };
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
        childPersonIdMap = await resolveChildPersonIds(client, companyId, Array.from(personIds));

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
        const academyChildMap = await resolveChildPersonIds(client, companyId, academyPersonIds);
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
            baseRow.date = normalizeFlexibleDate(row.date as string) || row.date;
            if (row.end_date) {
                baseRow.end_date = normalizeFlexibleDate(row.end_date as string) || row.end_date;
            }
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

    const { error } = await client.from(tableName as any).insert(rowsWithCompany as any);
    if (error) return { ok: false, error: error.message };

    return { ok: true, message: `Successfully uploaded ${validatedRows.length} records` };
}
