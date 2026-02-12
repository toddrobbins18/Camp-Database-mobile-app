import { supabase } from '../lib/supabase';

export const incidentService = {
    deleteIncident: async (id: string) => {
        const { error } = await supabase
            .from('incident_reports')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
};
