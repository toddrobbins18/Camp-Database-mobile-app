import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { showNewInboxMessageNotification } from '../lib/inboxLocalNotification';
import { canonicalProfileUuid, fetchMessageProfileLabels, rowParticipantIds } from '../lib/messageProfiles';
import { enqueueSync, getCachedJson, isOnlineNow, listQueued, setCachedJson } from '../offline/engine';

async function attachParticipantProfiles(
  rows: Record<string, unknown>[],
  companyId: string | null | undefined
): Promise<Message[]> {
  const base = (rows || []) as Message[];
  if (!base.length) return base;

  const ids = new Set<string>();
  base.forEach((r) => {
    const row = r as Record<string, unknown>;
    const { senderId, recipientId } = rowParticipantIds(row);
    if (senderId) ids.add(senderId);
    if (recipientId) ids.add(recipientId);
  });

  const labels =
    ids.size === 0
      ? new Map<string, string>()
      : await fetchMessageProfileLabels([...ids], companyId ?? undefined);
  return base.map((r) => {
    const row = r as Record<string, unknown>;
    const { senderId, recipientId } = rowParticipantIds(row);
    const snapshot =
      String(row.sender_display_name ?? (row as { senderDisplayName?: unknown }).senderDisplayName ?? '').trim();
    const fromRpc = senderId ? labels.get(senderId) : undefined;
    const rpcOk =
      !!(fromRpc && fromRpc.trim()) &&
      fromRpc !== 'Unknown' &&
      fromRpc !== 'Unknown sender';
    const senderLabel = (rpcOk ? fromRpc.trim() : '') || snapshot || undefined;
    return {
      ...r,
      sender_id: senderId ?? r.sender_id,
      recipient_id: recipientId ?? r.recipient_id,
      sender_name: senderLabel,
      sender: senderLabel ? { full_name: senderLabel } : undefined,
      recipient: recipientId ? { full_name: labels.get(recipientId) ?? undefined } : undefined,
    };
  });
}

/** Match web inbox: latest reply preview + count. Also infer "From" when root `sender_id` is null (many edge inserts omit it). */
async function enrichInboxWithThreadPreview(
  rows: Message[],
  companyId: string | null | undefined
): Promise<Message[]> {
  if (!rows.length) return rows;

  const parentIds = rows.map((r) => r.id);
  const { data: childRows, error: childErr } = await supabase
    .from('messages')
    .select('*')
    .in('parent_message_id', parentIds);

  if (childErr) {
    console.warn('[messages] enrichInboxWithThreadPreview children:', childErr.message);
  }

  const byParent = new Map<string, Record<string, unknown>[]>();
  for (const c of childRows || []) {
    const row = c as Record<string, unknown>;
    const pid = canonicalProfileUuid(row.parent_message_id as string | undefined);
    if (!pid) continue;
    const list = byParent.get(pid) ?? [];
    list.push(row);
    byParent.set(pid, list);
  }

  const labelIds = new Set<string>();
  type Aug = {
    sorted: Record<string, unknown>[];
    latest?: Record<string, unknown>;
    peerSenderId: string | null;
    peerSenderSnapshot: string | null;
  };
  const augByRootId = new Map<string, Aug>();

  for (const m of rows) {
    const rootId = canonicalProfileUuid(m.id) ?? m.id;
    const list = (byParent.get(rootId) ?? []).slice().sort((a, b) => {
      const ta = new Date(String(a.created_at ?? 0)).getTime();
      const tb = new Date(String(b.created_at ?? 0)).getTime();
      return ta - tb;
    });
    const latest = list.length ? list[list.length - 1] : undefined;

    const rootSenderId = rowParticipantIds(m as unknown as Record<string, unknown>).senderId;
    const recipientId = canonicalProfileUuid(m.recipient_id);

    let peerSenderId: string | null = null;
    let peerSenderSnapshot: string | null = null;
    if (!rootSenderId && recipientId) {
      const peerRow = list.find((row) => {
        const sid = rowParticipantIds(row).senderId;
        return sid != null && sid !== recipientId;
      });
      if (peerRow) {
        peerSenderId = rowParticipantIds(peerRow).senderId;
        peerSenderSnapshot =
          String(peerRow.sender_display_name ?? '').trim() || null;
      }
    }

    if (latest) {
      const lsid = rowParticipantIds(latest).senderId;
      if (lsid) labelIds.add(lsid);
    }
    if (peerSenderId) labelIds.add(peerSenderId);

    augByRootId.set(m.id, { sorted: list, latest, peerSenderId, peerSenderSnapshot });
  }

  const labels = await fetchMessageProfileLabels([...labelIds], companyId ?? undefined);

  return rows.map((m) => {
    const aug = augByRootId.get(m.id)!;
    const { latest, peerSenderId, peerSenderSnapshot } = aug;
    const rootSenderId = rowParticipantIds(m as unknown as Record<string, unknown>).senderId;
    const recipientId = canonicalProfileUuid(m.recipient_id);

    let latestSenderName: string | undefined;
    if (latest) {
      const lsid = rowParticipantIds(latest).senderId;
      if (lsid) latestSenderName = labels.get(lsid);
      if (!latestSenderName || latestSenderName === 'Unknown' || latestSenderName === 'Unknown sender') {
        const snap = String((latest as { sender_display_name?: unknown }).sender_display_name ?? '').trim();
        if (snap) latestSenderName = snap;
      }
    }

    const peerName = peerSenderId ? labels.get(peerSenderId) : undefined;
    const peerRpcOk =
      !!(peerName && peerName.trim()) &&
      peerName !== 'Unknown' &&
      peerName !== 'Unknown sender';
    const peerLabel =
      (peerRpcOk ? peerName!.trim() : '') ||
      peerSenderSnapshot ||
      '';

    /** Root row often has NULL sender_id (bulk/edge); if last activity is from the counterparty, use that label. */
    let fromLatestOtherParty: string | undefined;
    if (!rootSenderId && recipientId && latest) {
      const lsid = rowParticipantIds(latest).senderId;
      if (lsid && lsid !== recipientId) {
        let nm = labels.get(lsid);
        const lsnap = String((latest as { sender_display_name?: unknown }).sender_display_name ?? '').trim();
        if (!nm || nm === 'Unknown' || nm === 'Unknown sender') {
          nm = lsnap || undefined;
        }
        if (nm && nm !== 'Unknown' && nm !== 'Unknown sender') {
          fromLatestOtherParty = nm.trim();
        }
      }
    }

    const inferredFrom =
      (peerLabel && peerLabel.trim()) ||
      fromLatestOtherParty ||
      undefined;
    const senderOverlay =
      !rootSenderId && inferredFrom
        ? {
            sender_name: inferredFrom,
            sender: { full_name: inferredFrom } as { full_name?: string; email?: string },
          }
        : {};

    return {
      ...m,
      ...senderOverlay,
      reply_count: aug.sorted.length,
      latest_reply_content: latest ? String((latest as { content?: string }).content ?? '') : undefined,
      latest_reply_at: latest ? String((latest as { created_at?: string }).created_at ?? '') : undefined,
      latest_reply_sender_name: latestSenderName,
    };
  });
}

/** Replies in a 1:1 thread — RLS allows rows where user is sender or recipient. */
export async function fetchMessageThread(
  parentId: string,
  companyId: string | null | undefined
): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('parent_message_id', parentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[messages] fetchMessageThread:', error.message);
    return [];
  }
  return attachParticipantProfiles((data || []) as Record<string, unknown>[], companyId);
}

// ===================== MESSAGES =====================

export interface Message {
    id: string;
    sender_id: string;
    recipient_id: string;
    subject: string;
    content: string;
    read: boolean;
    created_at: string;
    sender_display_name?: string | null;
    sender?: { full_name?: string; email?: string };
    /** Same as web inbox — cached label or snapshot for From: line */
    sender_name?: string;
    recipient?: { full_name?: string; email?: string };
    /** Inbox only — latest reply in thread (parity with Nest web Messages). */
    reply_count?: number;
    latest_reply_content?: string;
    latest_reply_at?: string;
    latest_reply_sender_name?: string;
}

export interface MessageGroup {
    id: string;
    name: string;
    description?: string | null;
    company_id: string;
    created_by: string;
    created_at: string;
    updated_at?: string;
}

/** React Query key for unread inbox rows (all message rows where recipient = user & read=false). */
export function inboxUnreadCountQueryKey(userId: string) {
    return ['inboxUnreadCount', userId] as const;
}

const messagesCacheKey = (kind: 'inbox' | 'sent', userId: string, companyId?: string | null) =>
    `messages:${kind}:${userId}:${companyId ?? ''}`;
const groupsCacheKey = (userId: string) => `message_groups:${userId}`;
const unreadCacheKey = (userId: string) => `messages_unread:${userId}`;

async function applyQueuedMessageOps(rows: Message[], userId: string, kind: 'inbox' | 'sent'): Promise<Message[]> {
    const out = [...rows];
    const queued = await listQueued('messages.');
    for (const q of queued) {
        if (q.action === 'messages.insert') {
            const ins = Array.isArray(q.payload) ? (q.payload as any[]) : [q.payload as any];
            for (const row of ins) {
                if (!row) continue;
                if (kind === 'inbox' && row.recipient_id === userId) {
                    out.unshift({ ...(row as Message), id: (row.id as string) || `offline-${q.id}` });
                } else if (kind === 'sent' && row.sender_id === userId) {
                    out.unshift({ ...(row as Message), id: (row.id as string) || `offline-${q.id}` });
                }
            }
        } else if (q.action === 'messages.mark_read' && kind === 'inbox') {
            const id = (q.payload as any)?.id as string | undefined;
            if (!id) continue;
            const idx = out.findIndex((m) => m.id === id);
            if (idx >= 0) out[idx] = { ...out[idx], read: true };
        }
    }
    return out;
}

async function queuedUnreadAdjustment(userId: string): Promise<number> {
    const queued = await listQueued('messages.');
    let delta = 0;
    for (const q of queued) {
        if (q.action === 'messages.insert') {
            const ins = Array.isArray(q.payload) ? (q.payload as any[]) : [q.payload as any];
            for (const row of ins) {
                if (row?.recipient_id === userId && !row?.read) delta += 1;
            }
        } else if (q.action === 'messages.mark_read') {
            delta -= 1;
        }
    }
    return delta;
}

export function useInboxUnreadCount(userId: string | null) {
    return useQuery({
        queryKey: userId ? inboxUnreadCountQueryKey(userId) : ['inboxUnreadCount', 'disabled'],
        queryFn: async (): Promise<number> => {
            if (!userId) return 0;
            try {
                const { count, error } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('recipient_id', userId)
                    .eq('read', false);
                if (error) throw error;
                const base = count ?? 0;
                const total = Math.max(0, base + (await queuedUnreadAdjustment(userId)));
                await setCachedJson(unreadCacheKey(userId), total);
                return total;
            } catch {
                const cached = (await getCachedJson<number>(unreadCacheKey(userId))) ?? 0;
                return Math.max(0, cached + (await queuedUnreadAdjustment(userId)));
            }
        },
        enabled: !!userId,
        staleTime: 5000,
        /** Fallback when Realtime misses events (sleep/network/publication quirks). */
        refetchInterval: 30_000,
        /** When Realtime misses (background / network), unread count still updates periodically. */
        refetchIntervalInBackground: true,
    });
}

/** Subscribe to inbox/sent DB changes. Uses an unfiltered channel: RLS scopes events to rows the user may SELECT; filtered `recipient_id=eq` subs are unreliable for INSERT on some projects. */
export function useMessagesRealtimeSync(userId: string | null) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!userId) return;

        const invalidateInbox = () => {
            queryClient.invalidateQueries({
                predicate: (q) =>
                    Array.isArray(q.queryKey) &&
                    q.queryKey[0] === 'messages' &&
                    q.queryKey[1] === userId,
            });
        };
        const invalidateSent = () => {
            queryClient.invalidateQueries({
                predicate: (q) =>
                    Array.isArray(q.queryKey) &&
                    q.queryKey[0] === 'messages_sent' &&
                    q.queryKey[1] === userId,
            });
        };
        const invalidateUnread = () => {
            queryClient.invalidateQueries({ queryKey: inboxUnreadCountQueryKey(userId) });
        };

        const involvesUser = (
            row: { recipient_id?: string | null; sender_id?: string | null } | null | undefined,
        ) =>
            !!row &&
            (String(row.recipient_id) === userId || String(row.sender_id) === userId);

        /**
         * Unique topic per effect run: `@supabase/realtime-js` reuses `.channel(topic)` instances.
         * After `subscribe()`, calling `.on()` on that reused channel throws (React Strict Mode
         * remount → same topic → same joined channel → error).
         */
        const listenerId =
            typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto
                ? globalThis.crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const channel = supabase
            .channel(`messages-mobile-${userId}-${listenerId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                },
                (payload) => {
                    const newRow = payload.new as {
                        recipient_id?: string;
                        sender_id?: string;
                        read?: boolean;
                        subject?: string;
                        content?: string;
                    } | null;
                    const oldRow = payload.old as { recipient_id?: string; sender_id?: string } | null;

                    const touches = involvesUser(newRow) || involvesUser(oldRow);

                    if (touches) {
                        invalidateInbox();
                        invalidateSent();
                        invalidateUnread();
                    }

                    if (
                        payload.eventType === 'INSERT' &&
                        newRow?.recipient_id != null &&
                        String(newRow.recipient_id) === userId &&
                        !newRow.read
                    ) {
                        void showNewInboxMessageNotification(
                            String(newRow.subject || 'New message'),
                            String(newRow.content || ''),
                        );
                    }
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, queryClient]);

    useEffect(() => {
        if (!userId) return;
        const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
            if (next === 'active') {
                queryClient.invalidateQueries({
                    predicate: (q) =>
                        Array.isArray(q.queryKey) &&
                        q.queryKey[0] === 'messages' &&
                        q.queryKey[1] === userId,
                });
                queryClient.invalidateQueries({
                    predicate: (q) =>
                        Array.isArray(q.queryKey) &&
                        q.queryKey[0] === 'messages_sent' &&
                        q.queryKey[1] === userId,
                });
                queryClient.invalidateQueries({ queryKey: inboxUnreadCountQueryKey(userId) });
            }
        });
        return () => sub.remove();
    }, [userId, queryClient]);
}

export const useMessages = (userId: string | null, companyId: string | null | undefined) => {
    return useQuery({
        queryKey: ['messages', userId, companyId ?? ''],
        queryFn: async () => {
            if (!userId) return [];
            try {
                const { error: fixErr } = await supabase.rpc('apply_message_senders_from_email_logs_for_inbox');
                const missingRpc =
                    fixErr?.code === 'PGRST202' ||
                    (typeof fixErr?.message === 'string' && fixErr.message.includes('could not find the function'));
                if (fixErr && !missingRpc) {
                    console.warn('[messages] apply_message_senders_from_email_logs_for_inbox:', fixErr.message);
                }
                const { data, error } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('recipient_id', userId)
                    .is('parent_message_id', null)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                const withParties = await attachParticipantProfiles((data || []) as Record<string, unknown>[], companyId);
                const enriched = await enrichInboxWithThreadPreview(withParties, companyId);
                await setCachedJson(messagesCacheKey('inbox', userId, companyId), enriched);
                return await applyQueuedMessageOps(enriched, userId, 'inbox');
            } catch {
                const cached = (await getCachedJson<Message[]>(messagesCacheKey('inbox', userId, companyId))) || [];
                return await applyQueuedMessageOps(cached, userId, 'inbox');
            }
        },
        enabled: !!userId,
        staleTime: 8000,
        /** Realtime subscriptions can flake on mobile; polls like unread count. */
        refetchInterval: 20_000,
        refetchIntervalInBackground: true,
    });
};

export const useSentMessages = (userId: string | null, companyId: string | null | undefined) => {
    return useQuery({
        queryKey: ['messages_sent', userId, companyId ?? ''],
        queryFn: async () => {
            if (!userId) return [];
            try {
                const { data, error } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('sender_id', userId)
                    .is('parent_message_id', null)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                const rows = await attachParticipantProfiles((data || []) as Record<string, unknown>[], companyId);
                await setCachedJson(messagesCacheKey('sent', userId, companyId), rows);
                return await applyQueuedMessageOps(rows, userId, 'sent');
            } catch {
                const cached = (await getCachedJson<Message[]>(messagesCacheKey('sent', userId, companyId))) || [];
                return await applyQueuedMessageOps(cached, userId, 'sent');
            }
        },
        enabled: !!userId,
        staleTime: 8000,
        refetchInterval: 20_000,
        refetchIntervalInBackground: true,
    });
};

export const useMessageGroups = (userId: string | null) => {
    return useQuery({
        queryKey: ['message_groups', userId],
        queryFn: async () => {
            if (!userId) return [];
            try {
                const { data: memberships, error: membershipsError } = await supabase
                    .from('message_group_members')
                    .select('group_id')
                    .eq('user_id', userId);
                if (membershipsError) throw membershipsError;
                const ids = (memberships || []).map((m: any) => m.group_id).filter(Boolean);
                if (ids.length === 0) return [];
                const { data, error } = await supabase
                    .from('message_groups')
                    .select('*')
                    .in('id', ids)
                    .order('updated_at', { ascending: false });
                if (error) throw error;
                const rows = (data || []) as MessageGroup[];
                await setCachedJson(groupsCacheKey(userId), rows);
                return rows;
            } catch {
                return (await getCachedJson<MessageGroup[]>(groupsCacheKey(userId))) || [];
            }
        },
        enabled: !!userId,
    });
};

export const useSendMessage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (msg: {
            sender_id: string;
            recipient_id: string;
            subject: string;
            content: string;
            sender_display_name?: string | null;
        }) => {
            const row = {
                sender_id: msg.sender_id,
                recipient_id: msg.recipient_id,
                subject: msg.subject,
                content: msg.content,
                sender_display_name: msg.sender_display_name?.trim() || null,
            };
            if (await isOnlineNow()) {
                const { data, error } = await supabase.from('messages').insert([row]).select().single();
                if (error) throw error;
                return data;
            }
            const offlineRow = {
                ...row,
                id: `offline-${Date.now()}`,
                read: false,
                created_at: new Date().toISOString(),
            };
            await enqueueSync('messages.insert', [row]);
            return offlineRow;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['messages_sent'] });
            queryClient.invalidateQueries({ queryKey: ['inboxUnreadCount'] });
        },
    });
};

export const useCreateMessageGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (params: {
            name: string;
            description?: string;
            company_id: string;
            created_by: string;
            member_ids: string[];
        }) => {
            const groupRow = {
                name: params.name.trim(),
                description: params.description?.trim() || null,
                company_id: params.company_id,
                created_by: params.created_by,
            };
            const uniqueMemberIds = Array.from(new Set([...params.member_ids, params.created_by]));
            if (await isOnlineNow()) {
                const { data: group, error: groupError } = await supabase
                    .from('message_groups')
                    .insert(groupRow)
                    .select()
                    .single();
                if (groupError) throw groupError;
                if (uniqueMemberIds.length > 0) {
                    const rows = uniqueMemberIds.map((userId) => ({ group_id: group.id, user_id: userId }));
                    const { error: membersError } = await supabase.from('message_group_members').insert(rows);
                    if (membersError) throw membersError;
                }
                return group;
            }
            await enqueueSync('message_groups.create', { groupRow, memberIds: uniqueMemberIds });
            return {
                ...groupRow,
                id: `offline-${Date.now()}`,
                created_at: new Date().toISOString(),
            } as MessageGroup;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['message_groups'] });
        },
    });
};

export const useMarkMessageRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (messageId: string) => {
            if (await isOnlineNow()) {
                const { error } = await supabase
                    .from('messages')
                    .update({ read: true })
                    .eq('id', messageId);
                if (error) throw error;
            } else {
                await enqueueSync('messages.mark_read', { id: messageId });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['inboxUnreadCount'] });
        },
    });
};
