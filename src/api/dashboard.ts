import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Fetch today's birthdays from children and staff tables
export const useTodayBirthdays = (companyId: string | null, todayMonth: number, todayDay: number) => {
    return useQuery({
        queryKey: ['dashboard_birthdays', companyId, todayMonth, todayDay],
        queryFn: async () => {
            if (!companyId) return [];

            // Get all children
            const { data: childrenData, error: childrenError } = await supabase
                .from('children')
                .select('id, first_name, last_name, name, date_of_birth')
                .eq('company_id', companyId);

            if (childrenError) throw childrenError;

            // Get all staff
            const { data: staffData, error: staffError } = await supabase
                .from('staff')
                .select('id, name, first_name, last_name, date_of_birth')
                .eq('company_id', companyId);

            if (staffError) throw staffError;

            const birthdays: any[] = [];

            const addBirthdays = (data: any[], type: string) => {
                (data || []).forEach((person: any) => {
                    if (!person.date_of_birth) return;
                    const dob = new Date(person.date_of_birth);
                    if (dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay) {
                        const fullName = person.name || `${person.first_name} ${person.last_name}`.trim();
                        const age = new Date().getFullYear() - dob.getFullYear();
                        birthdays.push({
                            id: person.id,
                            name: fullName,
                            type: type,
                            age: age
                        });
                    }
                });
            };

            addBirthdays(childrenData, 'child');
            addBirthdays(staffData, 'staff');

            return birthdays;
        },
        enabled: !!companyId,
    });
};

// Fetch today's events from activities_field_trips table
export const useTodayEvents = (companyId: string | null, todayString: string) => {
    return useQuery({
        queryKey: ['dashboard_events', companyId, todayString],
        queryFn: async () => {
            if (!companyId) return [];
            const { data, error } = await supabase
                .from('activities_field_trips')
                .select('id, title, description, date, time, location')
                .eq('company_id', companyId)
                .eq('date', todayString)
                .order('time', { ascending: true });

            if (error) throw error;
            return data || [];
        },
        enabled: !!companyId,
    });
};

// Fetch today's menu from menu_items table
export const useTodayMeals = (companyId: string | null, todayString: string) => {
    return useQuery({
        queryKey: ['dashboard_meals', companyId, todayString],
        queryFn: async () => {
            if (!companyId) return null;
            try {
                const { data, error } = await supabase
                    .from('menu_items')
                    .select('*')
                    .eq('company_id', companyId)
                    .eq('date', todayString);

                if (error) throw error;

                const meals = { breakfast: '', lunch: '', snack: '', dinner: '' };
                (data || []).forEach(item => {
                    const type = item.meal_type?.toLowerCase() || '';
                    if (type === 'breakfast') meals.breakfast = item.items;
                    if (type === 'lunch') meals.lunch = item.items;
                    if (type === 'dinner') meals.dinner = item.items;
                    if (type === 'snack') meals.snack = item.items;
                });
                return meals;
            } catch {
                return null;
            }
        },
        enabled: !!companyId,
    });
};
