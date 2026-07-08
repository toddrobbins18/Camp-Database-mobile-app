import NetInfo, { type NetInfoSubscription } from '@react-native-community/netinfo';
import * as SQLite from 'expo-sqlite';
import { supabase } from '../lib/supabase';

type QueueStatus = 'pending' | 'failed' | 'synced';

export type SyncAction =
    | 'medication_logs.insert'
    | 'medication_logs.administer'
    | 'medication_logs.delete'
    | 'health_center_admissions.insert'
    | 'health_center_admissions.checkout'
    | 'children.insert'
    | 'children.update'
    | 'children.delete'
    | 'staff.insert'
    | 'staff.update'
    | 'staff.delete'
    | 'menu_items.insert'
    | 'menu_items.delete'
    | 'sports_academy.insert'
    | 'sports_academy.update'
    | 'sports_academy.delete'
    | 'trips.insert'
    | 'trips.update'
    | 'trips.delete'
    | 'trip_attendees.replace'
    | 'incident_reports.insert'
    | 'incident_reports.update'
    | 'incident_reports.delete'
    | 'rainy_day_schedule.insert'
    | 'tutoring_therapy.insert'
    | 'tutoring_therapy.update'
    | 'tutoring_therapy.delete'
    | 'role_permissions.upsert'
    | 'division_permissions.upsert'
    | 'messages.insert'
    | 'messages.mark_read'
    | 'message_groups.create'
    | 'special_events.insert'
    | 'special_events.update'
    | 'special_events.delete'
    | 'owl_pay_items.upsert'
    | 'owl_pay_items.delete'
    | 'owl_pay_email_config.save'
    | 'owl_pay_daily_scans.insert'
    | 'owl_pay_transactions.insert_many'
    | 'children.balance.increment'
    | 'user_roles.replace'
    | 'user_tags.add'
    | 'user_tags.remove'
    | 'automated_email_config.update'
    | 'evaluation_questions.insert'
    | 'evaluation_questions.update'
    | 'evaluation_questions.deactivate'
    | 'sports_calendar.insert'
    | 'sports_calendar.update'
    | 'sports_calendar.delete'
    | 'sports_calendar_divisions.replace'
    | 'daily_wolf_content.insert'
    | 'daily_wolf_content.update'
    | 'user_notification_preferences.upsert_many'
    | 'elective_signups.replace'
    | 'electives.insert'
    | 'electives.update'
    | 'roster_templates.create_with_children'
    | 'roster_templates.update_with_children'
    | 'roster_templates.duplicate_with_children'
    | 'roster_templates.delete'
    | 'bunk_staff.insert'
    | 'bunk_staff.update'
    | 'bunk_staff.delete'
    | 'staff_days_off.insert'
    | 'staff_days_off.update'
    | 'staff_days_off.delete'
    | 'staff_days_off.upsert';

type QueueRow = {
    id: string;
    action: SyncAction;
    payload: string;
    status: QueueStatus;
    attempts: number;
    last_error: string | null;
    created_at: string;
    updated_at: string;
};

const DB_NAME = 'offline_engine.db';
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let netSub: NetInfoSubscription | null = null;
let syncInProgress = false;
/** Serializes cache writes to avoid OPFS access-handle conflicts on Expo Web. */
let cacheWriteChain: Promise<void> = Promise.resolve();

function nowIso(): string {
    return new Date().toISOString();
}

function makeId(): string {
    return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

async function getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!dbPromise) {
        dbPromise = SQLite.openDatabaseAsync(DB_NAME);
    }
    return dbPromise;
}

export async function initOfflineEngine(): Promise<void> {
    const db = await getDb();
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS offline_cache (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY NOT NULL,
        action TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status_created
        ON sync_queue(status, created_at);
    `);
}

export async function setCachedJson<T>(key: string, value: T): Promise<void> {
    const write = async () => {
        const db = await getDb();
        const raw = JSON.stringify(value);
        const ts = nowIso();
        await db.runAsync(
            `INSERT INTO offline_cache (key, value, updated_at)
             VALUES (?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
            [key, raw, ts]
        );
    };

    const pending = cacheWriteChain.then(write, write);
    cacheWriteChain = pending.catch(() => {});
    return pending;
}

export async function safeSetCachedJson<T>(key: string, value: T): Promise<void> {
    try {
        await setCachedJson(key, value);
    } catch {
        // Offline cache is optional (e.g. expo-sqlite on web).
    }
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM offline_cache WHERE key = ?', [key]);
    if (!row?.value) return null;
    try {
        return JSON.parse(row.value) as T;
    } catch {
        return null;
    }
}

export async function safeGetCachedJson<T>(key: string): Promise<T | null> {
    try {
        return await getCachedJson<T>(key);
    } catch {
        return null;
    }
}

export async function enqueueSync(action: SyncAction, payload: unknown): Promise<string> {
    const db = await getDb();
    const id = makeId();
    const ts = nowIso();
    await db.runAsync(
        `INSERT INTO sync_queue (id, action, payload, status, attempts, last_error, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', 0, NULL, ?, ?)`,
        [id, action, JSON.stringify(payload), ts, ts]
    );
    return id;
}

export async function listQueued(actionPrefix?: string): Promise<Array<{ id: string; action: string; payload: unknown }>> {
    const db = await getDb();
    const rows = actionPrefix
        ? await db.getAllAsync<Pick<QueueRow, 'id' | 'action' | 'payload'>>(
              `SELECT id, action, payload
               FROM sync_queue
               WHERE status IN ('pending', 'failed') AND action LIKE ?
               ORDER BY created_at ASC`,
              [`${actionPrefix}%`]
          )
        : await db.getAllAsync<Pick<QueueRow, 'id' | 'action' | 'payload'>>(
              `SELECT id, action, payload
               FROM sync_queue
               WHERE status IN ('pending', 'failed')
               ORDER BY created_at ASC`
          );

    return rows.map((r) => {
        let parsed: unknown = null;
        try {
            parsed = JSON.parse(r.payload);
        } catch {
            parsed = null;
        }
        return { id: r.id, action: r.action, payload: parsed };
    });
}

async function markSynced(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(`UPDATE sync_queue SET status = 'synced', updated_at = ? WHERE id = ?`, [nowIso(), id]);
}

async function markFailed(id: string, errorMessage: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
        `UPDATE sync_queue
         SET status = 'failed',
             attempts = attempts + 1,
             last_error = ?,
             updated_at = ?
         WHERE id = ?`,
        [errorMessage.slice(0, 500), nowIso(), id]
    );
}

export async function isOnlineNow(): Promise<boolean> {
    const st = await NetInfo.fetch();
    return Boolean(st.isConnected && st.isInternetReachable !== false);
}

async function executeAction(action: SyncAction, payload: any): Promise<void> {
    if (action === 'medication_logs.insert') {
        const { error } = await supabase.from('medication_logs').insert(payload);
        if (error) throw error;
        return;
    }
    if (action === 'medication_logs.administer') {
        const { id, update } = payload ?? {};
        const { error } = await supabase.from('medication_logs').update(update).eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'medication_logs.delete') {
        const { id } = payload ?? {};
        const { error } = await supabase.from('medication_logs').delete().eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'health_center_admissions.insert') {
        const { error } = await supabase.from('health_center_admissions').insert(payload);
        if (error) throw error;
        return;
    }
    if (action === 'health_center_admissions.checkout') {
        const { id, update } = payload ?? {};
        const { error } = await supabase.from('health_center_admissions').update(update).eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'children.insert') {
        const rows = Array.isArray(payload) ? payload : [payload];
        const { error } = await supabase.from('children').insert(rows as any);
        if (error) throw error;
        return;
    }
    if (action === 'children.update') {
        const { id, update } = payload ?? {};
        const { error } = await supabase.from('children').update(update).eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'children.delete') {
        const { id } = payload ?? {};
        const { error } = await supabase.from('children').delete().eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'staff.insert') {
        const rows = Array.isArray(payload) ? payload : [payload];
        const { error } = await supabase.from('staff').insert(rows as any);
        if (error) throw error;
        return;
    }
    if (action === 'staff.update') {
        const { id, update } = payload ?? {};
        const { error } = await supabase.from('staff').update(update).eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'staff.delete') {
        const { id } = payload ?? {};
        const { error } = await supabase.from('staff').delete().eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'menu_items.insert') {
        const rows = Array.isArray(payload) ? payload : [payload];
        const { error } = await supabase.from('menu_items').insert(rows as any);
        if (error) throw error;
        return;
    }
    if (action === 'menu_items.delete') {
        const { id } = payload ?? {};
        const { error } = await supabase.from('menu_items').delete().eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'sports_academy.insert') {
        const rows = Array.isArray(payload) ? payload : [payload];
        const { error } = await supabase.from('sports_academy').insert(rows as any);
        if (error) throw error;
        return;
    }
    if (action === 'sports_academy.update') {
        const { id, update } = payload ?? {};
        const { error } = await supabase.from('sports_academy').update(update).eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'sports_academy.delete') {
        const { id } = payload ?? {};
        const { error } = await supabase.from('sports_academy').delete().eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'trips.insert') {
        const rows = Array.isArray(payload) ? payload : [payload];
        const { error } = await supabase.from('trips').insert(rows as any);
        if (error) throw error;
        return;
    }
    if (action === 'trips.update') {
        const { id, update } = payload ?? {};
        const { error } = await supabase.from('trips').update(update).eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'trips.delete') {
        const { id } = payload ?? {};
        const { error } = await supabase.from('trips').delete().eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'trip_attendees.replace') {
        const { tripId, childIds, companyId } = payload ?? {};
        const { error: delErr } = await supabase.from('trip_attendees').delete().eq('trip_id', tripId);
        if (delErr) throw delErr;
        if (Array.isArray(childIds) && childIds.length > 0) {
            const rows = childIds.map((child_id: string) => ({ trip_id: tripId, child_id, company_id: companyId }));
            const { error: insErr } = await supabase.from('trip_attendees').insert(rows as any);
            if (insErr) throw insErr;
        }
        return;
    }
    if (action === 'incident_reports.insert') {
        const { reportData, childIds } = payload ?? {};
        const primaryChildId = Array.isArray(childIds) ? childIds[0] : undefined;
        const { data: report, error: insErr } = await supabase
            .from('incident_reports')
            .insert([{
                ...(reportData as Record<string, unknown>),
                ...(primaryChildId ? { child_id: primaryChildId } : {}),
            }] as any)
            .select('id')
            .single();
        if (insErr) throw insErr;
        if (report?.id && Array.isArray(childIds) && childIds.length > 0) {
            const links = childIds.map((child_id: string) => ({ incident_id: report.id, child_id }));
            const { error: linkErr } = await supabase.from('incident_children').insert(links as any);
            if (linkErr) throw linkErr;
        }
        return;
    }
    if (action === 'incident_reports.update') {
        const { id, update } = payload ?? {};
        const { error } = await supabase.from('incident_reports').update(update).eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'incident_reports.delete') {
        const { id } = payload ?? {};
        const { error } = await supabase.from('incident_reports').delete().eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'rainy_day_schedule.insert') {
        const rows = Array.isArray(payload) ? payload : [payload];
        const { error } = await supabase.from('rainy_day_schedule').insert(rows as any);
        if (error) throw error;
        return;
    }
    if (action === 'tutoring_therapy.insert') {
        const rows = Array.isArray(payload) ? payload : [payload];
        const { error } = await supabase.from('tutoring_therapy').insert(rows as any);
        if (error) throw error;
        return;
    }
    if (action === 'tutoring_therapy.update') {
        const { id, update } = payload ?? {};
        const { error } = await supabase.from('tutoring_therapy').update(update).eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'tutoring_therapy.delete') {
        const { id } = payload ?? {};
        const { error } = await supabase.from('tutoring_therapy').delete().eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'role_permissions.upsert') {
        const { companyId, role, menu_item, can_access } = payload ?? {};
        const { error } = await supabase
            .from('role_permissions')
            .upsert({ company_id: companyId, role, menu_item, can_access } as any, {
                onConflict: 'company_id,role,menu_item',
            });
        if (error) throw error;
        return;
    }
    if (action === 'division_permissions.upsert') {
        const { row } = payload ?? {};
        const { error } = await supabase.from('division_permissions').upsert(row as any, {
            onConflict: 'user_id,division_id',
        });
        if (error) throw error;
        return;
    }
    if (action === 'messages.insert') {
        const rows = Array.isArray(payload) ? payload : [payload];
        const { error } = await supabase.from('messages').insert(rows as any);
        if (error) throw error;
        return;
    }
    if (action === 'messages.mark_read') {
        const { id } = payload ?? {};
        const { error } = await supabase.from('messages').update({ read: true }).eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'message_groups.create') {
        const { groupRow, memberIds } = payload ?? {};
        const { data: group, error: groupErr } = await supabase
            .from('message_groups')
            .insert(groupRow as any)
            .select('id')
            .single();
        if (groupErr) throw groupErr;
        const ids = Array.isArray(memberIds) ? memberIds : [];
        if (group?.id && ids.length > 0) {
            const rows = ids.map((user_id: string) => ({ group_id: group.id, user_id }));
            const { error: membersErr } = await supabase.from('message_group_members').insert(rows as any);
            if (membersErr) throw membersErr;
        }
        return;
    }
    if (action === 'special_events.insert') {
        const { eventRow, divisionIds } = payload ?? {};
        const { data: event, error: insErr } = await supabase
            .from('special_events_activities')
            .insert([eventRow] as any)
            .select('id, company_id')
            .single();
        if (insErr) throw insErr;
        if (event?.id && Array.isArray(divisionIds) && divisionIds.length > 0) {
            const rows = divisionIds.map((division_id: string) => ({
                event_id: event.id,
                division_id,
                company_id: event.company_id ?? eventRow?.company_id,
            }));
            const { error: linkErr } = await supabase.from('special_events_divisions').insert(rows as any);
            if (linkErr) throw linkErr;
        }
        return;
    }
    if (action === 'special_events.update') {
        const { id, company_id, eventUpdate, divisionIds } = payload ?? {};
        const { error: updErr } = await supabase
            .from('special_events_activities')
            .update(eventUpdate)
            .eq('id', id)
            .eq('company_id', company_id);
        if (updErr) throw updErr;
        const { error: delErr } = await supabase
            .from('special_events_divisions')
            .delete()
            .eq('event_id', id)
            .eq('company_id', company_id);
        if (delErr) throw delErr;
        if (Array.isArray(divisionIds) && divisionIds.length > 0) {
            const rows = divisionIds.map((division_id: string) => ({ event_id: id, division_id, company_id }));
            const { error: insErr } = await supabase.from('special_events_divisions').insert(rows as any);
            if (insErr) throw insErr;
        }
        return;
    }
    if (action === 'special_events.delete') {
        const { id, company_id } = payload ?? {};
        const { error } = await supabase
            .from('special_events_activities')
            .delete()
            .eq('id', id)
            .eq('company_id', company_id);
        if (error) throw error;
        return;
    }
    if (action === 'owl_pay_items.upsert') {
        const { payloadRow } = payload ?? {};
        if (payloadRow?.id) {
            const { id, ...rest } = payloadRow;
            const { error } = await supabase.from('owl_pay_items').update(rest).eq('id', id);
            if (error) throw error;
            return;
        }
        const { error } = await supabase.from('owl_pay_items').insert(payloadRow as any);
        if (error) throw error;
        return;
    }
    if (action === 'owl_pay_items.delete') {
        const { id } = payload ?? {};
        const { error } = await supabase.from('owl_pay_items').delete().eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'owl_pay_email_config.save') {
        const { row } = payload ?? {};
        const { data: existing, error: lookupErr } = await supabase
            .from('owl_pay_email_config')
            .select('id')
            .eq('company_id', row?.company_id)
            .maybeSingle();
        if (lookupErr) throw lookupErr;
        if (existing?.id) {
            const { error } = await supabase
                .from('owl_pay_email_config')
                .update({ ...row, updated_at: nowIso() } as any)
                .eq('id', existing.id);
            if (error) throw error;
            return;
        }
        const { error } = await supabase.from('owl_pay_email_config').insert(row as any);
        if (error) throw error;
        return;
    }
    if (action === 'owl_pay.checkout.complete') {
        const {
            companyId,
            childId,
            staffId,
            createdBy,
            pricing,
            transactions,
        } = payload ?? {};
        const chargeTotal = (transactions || []).reduce(
            (sum: number, row: { amount?: number }) => sum + Number(row?.amount || 0),
            0,
        );
        const { error } = await supabase.rpc('complete_owl_pay_purchase', {
            _company_id: companyId,
            _child_id: childId ?? null,
            _staff_id: staffId ?? null,
            _created_by: createdBy ?? null,
            _charge_total: chargeTotal,
            _record_free_daily_scan: Boolean(pricing?.freeItemApplied && childId),
            _transactions: transactions ?? [],
        });
        if (error) throw error;
        return;
    }
    if (action === 'owl_pay_daily_scans.insert') {
        const rows = Array.isArray(payload) ? payload : [payload];
        const { error } = await supabase.from('owl_pay_daily_scans').insert(rows as any);
        if (error) throw error;
        return;
    }
    if (action === 'owl_pay_transactions.insert_many') {
        const rows = Array.isArray(payload) ? payload : [];
        if (rows.length === 0) return;
        const { error } = await supabase.from('owl_pay_transactions').insert(rows as any);
        if (error) throw error;
        return;
    }
    if (action === 'children.balance.increment') {
        const { childId, amount } = payload ?? {};
        const { error } = await supabase.rpc('increment_camper_balance', {
            _child_id: childId,
            _amount: amount,
        });
        if (error) throw error;
        return;
    }
    if (action === 'user_roles.replace') {
        const { userId, role, companyId } = payload ?? {};
        const { error: delErr } = await supabase.from('user_roles').delete().eq('user_id', userId);
        if (delErr) throw delErr;
        const { error: insErr } = await supabase
            .from('user_roles')
            .insert({ user_id: userId, role, company_id: companyId } as any);
        if (insErr) throw insErr;
        return;
    }
    if (action === 'user_tags.add') {
        const { row } = payload ?? {};
        const { error } = await supabase.from('user_tags').insert(row as any);
        if (error) throw error;
        return;
    }
    if (action === 'user_tags.remove') {
        const { userId, tag, companyId } = payload ?? {};
        const { error } = await supabase
            .from('user_tags')
            .delete()
            .eq('user_id', userId)
            .eq('tag', tag)
            .eq('company_id', companyId);
        if (error) throw error;
        return;
    }
    if (action === 'automated_email_config.update') {
        const { id, companyId, update } = payload ?? {};
        const { error } = await supabase
            .from('automated_email_config')
            .update(update)
            .eq('id', id)
            .eq('company_id', companyId);
        if (error) throw error;
        return;
    }
    if (action === 'evaluation_questions.insert') {
        const rows = Array.isArray(payload) ? payload : [payload];
        const { error } = await supabase.from('evaluation_questions').insert(rows as any);
        if (error) throw error;
        return;
    }
    if (action === 'evaluation_questions.update') {
        const { id, update } = payload ?? {};
        const { error } = await supabase.from('evaluation_questions').update(update).eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'evaluation_questions.deactivate') {
        const { id } = payload ?? {};
        const { error } = await supabase.from('evaluation_questions').update({ is_active: false }).eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'sports_calendar.insert') {
        const rows = Array.isArray(payload) ? payload : [payload];
        const { error } = await supabase.from('sports_calendar').insert(rows as any);
        if (error) throw error;
        return;
    }
    if (action === 'sports_calendar.update') {
        const { id, update } = payload ?? {};
        const { error } = await supabase.from('sports_calendar').update(update).eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'sports_calendar.delete') {
        const { id } = payload ?? {};
        const { error } = await supabase.from('sports_calendar').delete().eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'sports_calendar_divisions.replace') {
        const { eventId, companyId, divisionIds } = payload ?? {};
        const { error: delErr } = await supabase
            .from('sports_calendar_divisions')
            .delete()
            .eq('sports_event_id', eventId)
            .eq('company_id', companyId);
        if (delErr) throw delErr;
        if (Array.isArray(divisionIds) && divisionIds.length > 0) {
            const rows = divisionIds.map((division_id: string) => ({
                sports_event_id: eventId,
                division_id,
                company_id: companyId,
            }));
            const { error: insErr } = await supabase.from('sports_calendar_divisions').insert(rows as any);
            if (insErr) throw insErr;
        }
        return;
    }
    if (action === 'daily_wolf_content.insert') {
        const rows = Array.isArray(payload) ? payload : [payload];
        const { error } = await supabase.from('daily_wolf_content').insert(rows as any);
        if (error) throw error;
        return;
    }
    if (action === 'daily_wolf_content.update') {
        const { id, update } = payload ?? {};
        const { error } = await supabase.from('daily_wolf_content').update(update).eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'user_notification_preferences.upsert_many') {
        const { rows } = payload ?? {};
        const upserts = Array.isArray(rows) ? rows : [];
        if (upserts.length === 0) return;
        for (const row of upserts) {
            const { error } = await supabase
                .from('user_notification_preferences')
                .upsert(row as any, { onConflict: 'user_id,company_id,notification_type' });
            if (error) throw error;
        }
        return;
    }
    if (action === 'elective_signups.replace') {
        const { companyId, childId, weekStart, dayOfWeek, period, season, electiveId } = payload ?? {};
        const { error: delErr } = await supabase
            .from('elective_signups')
            .delete()
            .eq('company_id', companyId)
            .eq('child_id', childId)
            .eq('week_start_date', weekStart)
            .eq('day_of_week', dayOfWeek)
            .eq('period', period);
        if (delErr) throw delErr;
        if (electiveId) {
            const { error: insErr } = await supabase.from('elective_signups').insert({
                company_id: companyId,
                child_id: childId,
                elective_id: electiveId,
                week_start_date: weekStart,
                day_of_week: dayOfWeek,
                period,
                season,
            } as any);
            if (insErr) throw insErr;
        }
        return;
    }
    if (action === 'electives.insert') {
        const rows = Array.isArray(payload) ? payload : [payload];
        const { error } = await supabase.from('electives').insert(rows as any);
        if (error) throw error;
        return;
    }
    if (action === 'electives.update') {
        const { id, update } = payload ?? {};
        const { error } = await supabase.from('electives').update(update).eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'roster_templates.create_with_children') {
        const { templateRow, childIds } = payload ?? {};
        const { data: template, error: tmplErr } = await supabase
            .from('roster_templates')
            .insert([templateRow] as any)
            .select('id, company_id')
            .single();
        if (tmplErr) throw tmplErr;
        if (template?.id && Array.isArray(childIds) && childIds.length > 0) {
            const rows = childIds.map((child_id: string) => ({
                template_id: template.id,
                company_id: template.company_id ?? templateRow?.company_id,
                child_id,
            }));
            const { error: chErr } = await supabase.from('roster_template_children').insert(rows as any);
            if (chErr) throw chErr;
        }
        return;
    }
    if (action === 'roster_templates.update_with_children') {
        const { templateId, update, companyId, childIds } = payload ?? {};
        const { error: upErr } = await supabase.from('roster_templates').update(update).eq('id', templateId);
        if (upErr) throw upErr;
        const { error: delErr } = await supabase
            .from('roster_template_children')
            .delete()
            .eq('template_id', templateId)
            .eq('company_id', companyId);
        if (delErr) throw delErr;
        if (Array.isArray(childIds) && childIds.length > 0) {
            const rows = childIds.map((child_id: string) => ({
                template_id: templateId,
                company_id: companyId,
                child_id,
            }));
            const { error: insErr } = await supabase.from('roster_template_children').insert(rows as any);
            if (insErr) throw insErr;
        }
        return;
    }
    if (action === 'roster_templates.duplicate_with_children') {
        const { sourceTemplate, companyId } = payload ?? {};
        const children = Array.isArray(sourceTemplate?.roster_template_children)
            ? sourceTemplate.roster_template_children
            : [];
        const { data: newTemplate, error: newErr } = await supabase
            .from('roster_templates')
            .insert({
                company_id: companyId,
                name: `${sourceTemplate?.name || 'Template'} (Copy)`,
                description: sourceTemplate?.description ?? null,
            } as any)
            .select('id')
            .single();
        if (newErr) throw newErr;
        if (newTemplate?.id && children.length > 0) {
            const rows = children.map((c: any) => ({
                template_id: newTemplate.id,
                company_id: companyId,
                child_id: c.child_id,
            }));
            const { error: insErr } = await supabase.from('roster_template_children').insert(rows as any);
            if (insErr) throw insErr;
        }
        return;
    }
    if (action === 'roster_templates.delete') {
        const { templateId } = payload ?? {};
        const { error } = await supabase.from('roster_templates').delete().eq('id', templateId);
        if (error) throw error;
        return;
    }
    if (action === 'bunk_staff.insert') {
        const rows = Array.isArray(payload) ? payload : [payload];
        const { error } = await supabase.from('bunk_staff').insert(rows as any);
        if (error) throw error;
        return;
    }
    if (action === 'bunk_staff.update') {
        const { id, update } = payload ?? {};
        const { error } = await supabase.from('bunk_staff').update(update).eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'bunk_staff.delete') {
        const { id } = payload ?? {};
        const { error } = await supabase.from('bunk_staff').delete().eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'staff_days_off.insert') {
        const rows = Array.isArray(payload) ? payload : [payload];
        const { error } = await supabase.from('staff_days_off').insert(rows as any);
        if (error) throw error;
        return;
    }
    if (action === 'staff_days_off.update') {
        const { id, update } = payload ?? {};
        const { error } = await supabase.from('staff_days_off').update(update).eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'staff_days_off.delete') {
        const { id } = payload ?? {};
        const { error } = await supabase.from('staff_days_off').delete().eq('id', id);
        if (error) throw error;
        return;
    }
    if (action === 'staff_days_off.upsert') {
        const { row } = payload ?? {};
        const { error } = await supabase
            .from('staff_days_off')
            .upsert(row as any, { onConflict: 'company_id,staff_id,date,season' });
        if (error) throw error;
        return;
    }
    throw new Error(`Unknown sync action: ${action}`);
}

export async function syncNow(): Promise<void> {
    if (syncInProgress) return;
    if (!(await isOnlineNow())) return;
    syncInProgress = true;
    try {
        const queue = await listQueued();
        for (const item of queue) {
            try {
                await executeAction(item.action as SyncAction, item.payload);
                await markSynced(item.id);
            } catch (e: any) {
                await markFailed(item.id, e?.message || String(e));
            }
        }
    } finally {
        syncInProgress = false;
    }
}

export async function startOfflineSyncEngine(): Promise<void> {
    await initOfflineEngine();
    await syncNow();
    if (!netSub) {
        netSub = NetInfo.addEventListener((st) => {
            if (st.isConnected && st.isInternetReachable !== false) {
                void syncNow();
            }
        });
    }
}

export function stopOfflineSyncEngine(): void {
    if (netSub) {
        netSub();
        netSub = null;
    }
}

