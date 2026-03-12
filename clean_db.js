require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = 'https://qjbkvnzeejbqxbcbskdu.supabase.co';
const key = process.env.NEW_SERVICE_KEY;
const supabase = createClient(url, key);

async function cleanData() {
    console.log("Cleaning database for real data migration...");

    // 1. Unlink profiles from companies to avoid FK errors
    await supabase.from('profiles').update({ company_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Delete test data from all relevant tables
    const tablesToClear = [
        'automated_email_config', // added
        'messages', // added
        'user_roles',
        'role_permissions',
        'division_permissions',
        'children',
        'staff',
        'medication_logs',
        'health_center_admissions',
        'incident_reports',
        'awards',
        'activities_field_trips',
        'sports_calendar',
        'appointments',
        'evaluation_questions',
        'special_events_activities', // added
        'menu',
        'special_meals',
        'evaluations',
        'divisions',
        'companies'
    ];

    for (const table of tablesToClear) {
        console.log(`Clearing ${table}...`);
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) console.log(`  Error clearing ${table}:`, error.message);
    }

    console.log("Cleanup complete!");
}

cleanData();
