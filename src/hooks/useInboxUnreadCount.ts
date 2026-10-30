import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getCachedJson, listQueued, setCachedJson } from '../offline/engine';

/** React Query key for unread inbox rows (recipient = user & read=false). */
export function inboxUnreadCountQueryKey(userId: string) {
    return ['inboxUnreadCount', userId] as const;
}

const unreadCacheKey = (userId: string) => `messages_unread:${userId}`;

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
        refetchInterval: 30_000,
        refetchIntervalInBackground: true,
    });
}
