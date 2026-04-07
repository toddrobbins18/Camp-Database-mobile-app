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
        },
    });
};
