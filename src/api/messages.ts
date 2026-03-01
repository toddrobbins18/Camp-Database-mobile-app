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

export const useMessages = (userId: string | null) => {
    return useQuery({
        queryKey: ['messages', userId],
        queryFn: async () => {
            if (!userId) return [];
            const { data, error } = await supabase
                .from('messages')
                .select('*, sender:profiles!sender_id(full_name, email), recipient:profiles!recipient_id(full_name, email)')
                .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data || []) as Message[];
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
