import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ===================== EVALUATION QUESTIONS =====================

export interface EvaluationQuestion {
    id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'text' | 'rating';
    options?: string[];
    category?: string;
    is_active: boolean;
    created_at: string;
}

export const useEvaluationQuestions = () => {
    return useQuery({
        queryKey: ['evaluation_questions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('evaluation_questions')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return (data || []) as EvaluationQuestion[];
        },
    });
};

export const useAddEvaluationQuestion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (q: Omit<EvaluationQuestion, 'id' | 'created_at' | 'is_active'>) => {
            const { data, error } = await supabase
                .from('evaluation_questions')
                .insert([{ ...q, is_active: true }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evaluation_questions'] });
        },
    });
};

export const useUpdateEvaluationQuestion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<EvaluationQuestion> & { id: string }) => {
            const { error } = await supabase
                .from('evaluation_questions')
                .update(updates)
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evaluation_questions'] });
        },
    });
};

export const useDeleteEvaluationQuestion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('evaluation_questions')
                .update({ is_active: false })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evaluation_questions'] });
        },
    });
};

// ===================== CAMPER EVALUATION QUESTIONS =====================

export interface CamperEvalQuestion {
    id: string;
    report_type: '10_day' | 'end_of_summer';
    question_text: string;
    question_type: 'rating' | 'text' | 'multiple_choice';
    options?: any;
    sort_order: number;
    company_id: string;
    is_active: boolean;
}

export const useCamperEvalQuestions = (companyId: string | null, reportType?: string) => {
    return useQuery({
        queryKey: ['camper_eval_questions', companyId, reportType],
        queryFn: async () => {
            if (!companyId) return [];
            let query = supabase
                .from('camper_evaluation_questions')
                .select('*')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });
            if (reportType) {
                query = query.eq('report_type', reportType);
            }
            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as CamperEvalQuestion[];
        },
        enabled: !!companyId,
    });
};

// ===================== CAMPER REPORTS =====================

export interface CamperReport {
    id: string;
    child_id: string;
    report_type: '10_day' | 'end_of_summer';
    report_date: string;
    created_by?: string;
    report_data: any;
    company_id: string;
    season: string;
}

export const useCamperReports = (companyId: string | null, season: string) => {
    return useQuery({
        queryKey: ['camper_reports', companyId, season],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('camper_reports')
                .select('*')
                .eq('company_id', companyId)
                .eq('season', season)
                .order('report_date', { ascending: false });
            if (error) throw error;
            return (data || []) as CamperReport[];
        },
        enabled: !!companyId,
    });
};
