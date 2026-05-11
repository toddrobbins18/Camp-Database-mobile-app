import { supabase } from './supabase';

type ProfileRow = { id: string; full_name: string | null; email: string | null };

/** Postgres returns snake_case, but caches / transforms may expose camelCase. */
export function canonicalProfileUuid(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim().toLowerCase();
  if (!s || s === 'null' || s === 'undefined') return null;
  return s;
}

export function rowParticipantIds(r: Record<string, unknown>): { senderId: string | null; recipientId: string | null } {
  const senderId =
    canonicalProfileUuid(r.sender_id) ??
    canonicalProfileUuid((r as { senderId?: unknown }).senderId) ??
    canonicalProfileUuid((r as { Sender_id?: unknown }).Sender_id);

  const recipientId =
    canonicalProfileUuid(r.recipient_id) ??
    canonicalProfileUuid((r as { recipientId?: unknown }).recipientId) ??
    canonicalProfileUuid((r as { Recipient_id?: unknown }).Recipient_id);

  return { senderId, recipientId };
}

export function messageRowSenderId(msg: Record<string, unknown>): string | null {
  return rowParticipantIds(msg).senderId;
}

export function messageRowRecipientId(msg: Record<string, unknown>): string | null {
  return rowParticipantIds(msg).recipientId;
}

/** Display names for message participants in the selected camp (RPC matches compose recipient auth). */
export async function fetchMessageProfileLabels(
  profileIds: string[],
  targetCompanyId: string | undefined
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const ids = [...new Set(profileIds.map((id) => canonicalProfileUuid(id)).filter(Boolean) as string[])];
  if (ids.length === 0) return map;

  let rows: ProfileRow[] | null = null;

  if (targetCompanyId) {
    const { data, error } = await supabase.rpc('resolve_message_profile_labels', {
      profile_ids: ids,
      target_company_id: targetCompanyId,
    });
    if (!error && data) {
      rows = data as ProfileRow[];
    } else {
      const missingRpc =
        error?.code === 'PGRST202' ||
        (typeof error?.message === 'string' && error.message.includes('could not find the function'));
      if (error && !missingRpc) {
        console.warn('[fetchMessageProfileLabels] rpc:', error);
      }
    }
  }

  if (rows === null) {
    const { data: fb, error: qErr } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ids);
    if (qErr) {
      console.warn('[fetchMessageProfileLabels] profiles fallback:', qErr);
      rows = [];
    } else {
      rows = (fb || []) as ProfileRow[];
    }
  }

  for (const p of rows) {
    const pid = canonicalProfileUuid(p.id);
    if (!pid) continue;
    map.set(pid, p.full_name?.trim() || p.email?.split('@')[0] || 'Unknown');
  }

  const stillMissing = ids.filter((id) => !map.has(id) || map.get(id) === 'Unknown');
  if (stillMissing.length > 0) {
    const { data: partnerRows, error: pErr } = await supabase.rpc('resolve_profile_names_for_message_partners', {
      profile_ids: stillMissing,
    });
    if (!pErr && partnerRows) {
      for (const p of partnerRows as ProfileRow[]) {
        const pid = canonicalProfileUuid(p.id);
        if (!pid) continue;
        const label = p.full_name?.trim() || p.email?.split('@')[0] || 'Unknown';
        map.set(pid, label);
      }
    } else if (
      pErr &&
      pErr.code !== 'PGRST202' &&
      !(typeof pErr.message === 'string' && pErr.message.includes('could not find the function'))
    ) {
      console.warn('[fetchMessageProfileLabels] resolve_profile_names_for_message_partners:', pErr);
    }
  }

  return map;
}

/** Fallback label when enriched profile is missing (null sender vs group inline name). */
export function inboxSenderDisplayName(msg: {
  sender?: { full_name?: string; email?: string | null };
  sender_id?: string | null;
  sender_display_name?: string | null;
  content?: string;
  group_id?: string | null;
}): string {
  const resolved = msg.sender?.full_name?.trim() || msg.sender?.email?.split('@')[0];
  if (resolved && resolved !== 'Unknown') return resolved;
  const rawRow = msg as Record<string, unknown>;
  const snap =
    (typeof msg.sender_display_name === 'string' ? msg.sender_display_name : '') ||
    (typeof rawRow.senderDisplayName === 'string' ? rawRow.senderDisplayName : '');
  const trimmedSnap = snap.trim();
  if (trimmedSnap) return trimmedSnap;
  const sid = messageRowSenderId(msg as unknown as Record<string, unknown>);
  if (sid) return 'Unknown sender';
  if (msg.group_id && typeof msg.content === 'string') {
    const i = msg.content.indexOf(':');
    if (i > 0) {
      const prefix = msg.content.slice(0, i).trim();
      if (prefix.length > 0 && prefix.length < 120) return prefix;
    }
  }
  return 'Automated notification';
}

export function sentRecipientDisplayName(msg: {
  recipient?: { full_name?: string; email?: string | null };
  recipient_id?: string | null;
}): string {
  const resolved = msg.recipient?.full_name?.trim() || msg.recipient?.email?.split('@')[0];
  if (resolved && resolved !== 'Unknown') return resolved;
  const rid = messageRowRecipientId(msg as unknown as Record<string, unknown>);
  if (rid) return 'Unknown';
  return 'Unknown';
}
