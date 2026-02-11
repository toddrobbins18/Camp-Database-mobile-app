import { supabase } from '../lib/supabase';
import { LoginFormValues, RegisterFormValues } from '../lib/authSchemas';

export const authApi = {
    signIn: async ({ email, password }: LoginFormValues) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    signUp: async ({ email, password, full_name }: RegisterFormValues) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name,
                    approved: false, // Default to false as per Tyler Hill flow
                },
            },
        });
        if (error) throw error;
        return data;
    },

    signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    getProfile: async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) throw error;
        return data;
    },
};
