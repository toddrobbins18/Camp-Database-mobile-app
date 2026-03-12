import { createClient } from '@supabase/supabase-js';

// Configuration
const OLD_SUPABASE_URL = 'https://gdcxtefbarvnrtvacqln.supabase.co';
const OLD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkY3h0ZWZiYXJ2bnJ0dmFjcWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNTA3NDIsImV4cCI6MjA3NTYyNjc0Mn0.8KkemWYnHix_jtcT_ZSx0EdsACsBnyID76-xZgZSKhA';
const OLD_EMAIL = process.env.OLD_EMAIL; // PASS THIS IN
const OLD_PASSWORD = process.env.OLD_PASSWORD; // PASS THIS IN

const NEW_SUPABASE_URL = 'https://qjbkvnzeejbqxbcbskdu.supabase.co';
const NEW_SERVICE_KEY = process.env.NEW_SERVICE_KEY; // PASS THIS IN

if (!OLD_EMAIL || !OLD_PASSWORD || !NEW_SERVICE_KEY) {
    console.error("Missing environment variables. Run with: OLD_EMAIL='...' OLD_PASSWORD='...' NEW_SERVICE_KEY='...' npx tsx migrateData.ts");
    process.exit(1);
}

// Old client uses Anon key with Auth
const oldClient = createClient(OLD_SUPABASE_URL, OLD_ANON_KEY, {
    auth: { persistSession: false },
});

// New client MUST use Service Role Key to bypass RLS for inserts
const newClient = createClient(NEW_SUPABASE_URL, NEW_SERVICE_KEY, {
    auth: { persistSession: false },
});

// The exact order matters because of Foreign Key constraints.
// Parent tables must be copied BEFORE child tables that reference them.
const TABLES_TO_MIGRATE = [
    'companies',
    'divisions',
    'bunks',
    'profiles',         // References companies
    'user_roles',       // References companies, auth.users
    'role_permissions', // References companies
    'division_permissions', // References companies, divisions
    'children',         // References companies, bunks
    'staff',            // References companies, bunks
    'medication_logs',
    'health_center_admissions',
    'incident_reports',
    'awards',
    'tutoring_therapy',
    'sports_academy',
    'activities_field_trips', // References companies
    'special_events_activities',
    'master_calendar',
    'sports_calendar',
    'transportation',
    'rainy_day_schedule',
    'menu',
    'special_meals',    // References companies
    'messages',
    'automated_email_config',
    'user_tags',
    'appointments',
    'daily_news',
    'days_off',
    'evaluation_questions',
    'evaluations',
    'roster_templates'
];

async function migrateData() {
    console.log('--- STARTING DATA MIGRATION ---');

    console.log(`[i] Logging in to old Supabase as ${OLD_EMAIL}...`);
    const { error: loginError } = await oldClient.auth.signInWithPassword({
        email: OLD_EMAIL as string,
        password: OLD_PASSWORD as string
    });

    if (loginError) {
        console.error('  [X] Failed to log in to Lovable project:', loginError.message);
        return;
    }
    console.log('  [+] Login successful. Extracting tables...');

    for (const tableName of TABLES_TO_MIGRATE) {
        console.log(`\nMigrating table: ${tableName}...`);

        // 1. Fetch all records from old database
        const { data: oldData, error: fetchError } = await oldClient
            .from(tableName)
            .select('*');

        if (fetchError) {
            console.error(`  [X] Error fetching from old ${tableName}:`, fetchError.message);
            continue;
        }

        if (!oldData || oldData.length === 0) {
            console.log(`  [-] Table ${tableName} is empty. Skipping.`);
            continue;
        }

        console.log(`  [i] Found ${oldData.length} records. Inserting into new database...`);

        // 2. Insert records into new database
        const { error: insertError } = await newClient
            .from(tableName)
            .upsert(oldData, { onConflict: 'id' }); // Upsert by ID to avoid duplicates if re-run

        if (insertError) {
            // Sometimes onConflict requires specific unique columns, fallback to basic insert
            if (insertError.code === '42P10') {
                console.log(`  [!] Falling back to standard insert for ${tableName} (no ID primary key).`);
                const { error: fallbackError } = await newClient.from(tableName).insert(oldData);
                if (fallbackError) {
                    console.error(`  [X] Fallback Error inserting to new ${tableName}:`, fallbackError.message);
                } else {
                    console.log(`  [+] Successfully inserted ${oldData.length} records fallback.`);
                }
            } else {
                console.error(`  [X] Error inserting to new ${tableName}:`, insertError.message, insertError.details);
            }
        } else {
            console.log(`  [+] Successfully inserted ${oldData.length} records.`);
        }
    }

    console.log('\n--- MIGRATION COMPLETE ---');
    console.log('NOTE: auth.users (Authentication Accounts) cannot be exported by API. Users will need to sign up again, OR you must request a database dump from Lovable to import auth users natively via SQL.');
}

migrateData().catch(console.error);
