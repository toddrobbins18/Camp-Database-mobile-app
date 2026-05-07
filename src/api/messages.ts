import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ===================== MESSAGES =====================

export interface Message {
    id: string;
    sender_id: string;
    recipient_id: string;
    subject: string;
    content: string;
    read: boolean;
    created_at: string;
    sender?: { full_name?: string; email?: string };
    recipient?: { full_name?: string; email?: string };
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

export function useInboxUnreadCount(userId: string | null) {
    return useQuery({
        queryKey: userId ? inboxUnreadCountQueryKey(userId) : ['inboxUnreadCount', 'disabled'],
        queryFn: async (): Promise<number> => {
            if (!userId) return 0;
            const { count, error } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('recipient_id', userId)
                .eq('read', false);
            if (error) throw error;
            return count ?? 0;
        },
        enabled: !!userId,
        staleTime: 5000,
        /** Fallback when Realtime misses events (sleep/network/publication quirks). */
        refetchInterval: 30_000,
        refetchIntervalInBackground: false,
    });
}

/** Subscribe to inbox/sent DB changes so lists update live (matches web `postgres_changes` behavior). */
export function useMessagesRealtimeSync(userId: string | null) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!userId) return;

        const invalidateInbox = () => {
            queryClient.invalidateQueries({ queryKey: ['messages', userId] });
        };
        const invalidateSent = () => {
            queryClient.invalidateQueries({ queryKey: ['messages_sent', userId] });
        };
        const invalidateUnread = () => {
            queryClient.invalidateQueries({ queryKey: inboxUnreadCountQueryKey(userId) });
        };

        const channel = supabase
            .channel(`messages-mobile-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `recipient_id=eq.${userId}`,
                },
                () => {
                    invalidateInbox();
                    invalidateUnread();
                },
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `sender_id=eq.${userId}`,
                },
                invalidateSent,
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
                queryClient.invalidateQueries({ queryKey: ['messages', userId] });
                queryClient.invalidateQueries({ queryKey: ['messages_sent', userId] });
                queryClient.invalidateQueries({ queryKey: inboxUnreadCountQueryKey(userId) });
            }
        });
        return () => sub.remove();
    }, [userId, queryClient]);
}

export const useMessages = (userId: string | null) => {
    return useQuery({
        queryKey: ['messages', userId],
        queryFn: async () => {
            if (!userId) return [];
            const { data, error } = await supabase
                .from('messages')
                .select('*, sender:profiles!sender_id(full_name, email), recipient:profiles!recipient_id(full_name, email)')
                .eq('recipient_id', userId)
                .is('parent_message_id', null)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []) as Message[];
        },
        enabled: !!userId,
    });
};

export const useSentMessages = (userId: string | null) => {
    return useQuery({
        queryKey: ['messages_sent', userId],
        queryFn: async () => {
            if (!userId) return [];
            const { data, error } = await supabase
                .from('messages')
                .select('*, sender:profiles!sender_id(full_name, email), recipient:profiles!recipient_id(full_name, email)')
                .eq('sender_id', userId)
                .is('parent_message_id', null)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []) as Message[];
        },
        enabled: !!userId,
    });
};

export const useMessageGroups = (userId: string | null) => {
    return useQuery({
        queryKey: ['message_groups', userId],
        queryFn: async () => {
            if (!userId) return [];
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
            return (data || []) as MessageGroup[];
        },
        enabled: !!userId,
    });
};

export const useSendMessage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (msg: { sender_id: string; recipient_id: string; subject: string; content: string }) => {
            const { data, error } = await supabase
                .from('messages')
                .insert([msg])
                .select()
                .single();
            if (error) throw error;
            return data;
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
            const { data: group, error: groupError } = await supabase
                .from('message_groups')
                .insert({
                    name: params.name.trim(),
                    description: params.description?.trim() || null,
                    company_id: params.company_id,
                    created_by: params.created_by,
                })
                .select()
                .single();
            if (groupError) throw groupError;

            const uniqueMemberIds = Array.from(new Set([...params.member_ids, params.created_by]));
            if (uniqueMemberIds.length > 0) {
                const rows = uniqueMemberIds.map((userId) => ({ group_id: group.id, user_id: userId }));
                const { error: membersError } = await supabase.from('message_group_members').insert(rows);
                if (membersError) throw membersError;
            }
            return group;
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
            const { error } = await supabase
                .from('messages')
                .update({ read: true })
                .eq('id', messageId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['inboxUnreadCount'] });
        },
    });
};
