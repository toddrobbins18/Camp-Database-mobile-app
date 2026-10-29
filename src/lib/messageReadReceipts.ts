import type { SupabaseClient } from '@supabase/supabase-js';

export type ReadReceiptFields = {
  read?: boolean | null;
  read_at?: string | null;
};

/** PostgREST / cache sometimes return non-boolean; treat only explicit true as read. */
export function isMessageReadFlag(read: unknown): boolean {
  return read === true;
}

/** Receipt for sent list rows: latest outbound reply in thread, else the root message. */
export function readReceiptForSentThread(
  root: ReadReceiptFields,
  replies: ReadReceiptFields[],
  senderUserId: string,
  replySenderIds?: (string | null | undefined)[],
): ReadReceiptFields {
  for (let i = replies.length - 1; i >= 0; i--) {
    const sid = replySenderIds?.[i];
    if (sid === senderUserId) {
      return { read: isMessageReadFlag(replies[i].read), read_at: replies[i].read_at ?? null };
    }
  }
  return { read: isMessageReadFlag(root.read), read_at: root.read_at ?? null };
}

/** Never let a stale local patch hide server read=true (fixes stuck “Delivered” on app). */
export function mergeMessageRead<T extends ReadReceiptFields>(
  row: T,
  patch?: ReadReceiptFields | null,
): T {
  if (!patch) return row;
  const read = isMessageReadFlag(row.read) || isMessageReadFlag(patch.read);
  const read_at = read ? row.read_at ?? patch.read_at ?? null : null;
  return { ...row, read, read_at };
}

export function formatReadReceiptTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return time;
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${time}`;
}

export function getReadReceiptLabel(
  message: ReadReceiptFields,
  options?: { includeDelivered?: boolean },
): string | null {
  const includeDelivered = options?.includeDelivered !== false;
  if (isMessageReadFlag(message.read)) {
    const when = formatReadReceiptTime(message.read_at);
    return when ? `Read ${when}` : 'Read';
  }
  if (includeDelivered) return 'Delivered';
  return null;
}

export async function markMessageRead(
  supabase: SupabaseClient,
  messageId: string,
): Promise<{ error: string | null }> {
  const readAt = new Date().toISOString();
  const { error } = await supabase
    .from('messages')
    .update({ read: true, read_at: readAt })
    .eq('id', messageId)
    .eq('read', false);
  if (error) return { error: error.message };
  return { error: null };
}

export async function markThreadRepliesReadForRecipient(
  supabase: SupabaseClient,
  parentMessageId: string,
  recipientUserId: string,
): Promise<void> {
  const readAt = new Date().toISOString();
  await supabase
    .from('messages')
    .update({ read: true, read_at: readAt })
    .eq('parent_message_id', parentMessageId)
    .eq('recipient_id', recipientUserId)
    .eq('read', false);
}
