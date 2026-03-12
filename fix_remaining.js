const { createClient } = require('@supabase/supabase-js');

const OLD_SUPABASE_URL = 'https://gdcxtefbarvnrtvacqln.supabase.co';
const OLD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkY3h0ZWZiYXJ2bnJ0dmFjcWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNTA3NDIsImV4cCI6MjA3NTYyNjc0Mn0.8KkemWYnHix_jtcT_ZSx0EdsACsBnyID76-xZgZSKhA';
const NEW_SUPABASE_URL = 'https://qjbkvnzeejbqxbcbskdu.supabase.co';
const NEW_SERVICE_KEY = process.env.NEW_SERVICE_KEY;

const oldClient = createClient(OLD_SUPABASE_URL, OLD_ANON_KEY, { auth: { persistSession: false } });
const newClient = createClient(NEW_SUPABASE_URL, NEW_SERVICE_KEY, { auth: { persistSession: false } });

async function smartInsert(tableName, records) {
    // Strip unknown columns recursively
    const tryInsert = async (data) => {
        // Insert in batches of 100 to isolate failures
        let success = 0;
        let fail = 0;
        for (let i = 0; i < data.length; i += 100) {
            const batch = data.slice(i, i + 100);
            const { error } = await newClient.from(tableName).upsert(batch, { onConflict: 'id', ignoreDuplicates: true });
            if (error) {
                const colMatch = error.message.match(/Could not find the '(\w+)' column/);
                if (colMatch) {
                    const badCol = colMatch[1];
                    console.log(`    [!] Stripping '${badCol}'`);
                    const cleaned = data.map(r => { const c = { ...r }; delete c[badCol]; return c; });
                    return tryInsert(cleaned);
                }
                // For FK errors, insert row-by-row to skip bad ones
                if (error.message.includes('violates foreign key')) {
                    for (const row of batch) {
                        const { error: rowErr } = await newClient.from(tableName).upsert(row, { onConflict: 'id', ignoreDuplicates: true });
                        if (rowErr) fail++;
                        else success++;
                    }
                } else {
                    console.log(`    ERROR: ${error.message}`);
                    fail += batch.length;
                }
            } else {
                success += batch.length;
            }
        }
        return { success, fail };
    };
    return tryInsert(records);
}

async function fixRemaining() {
    console.log('=== FIXING REMAINING TABLES ===\n');
    await oldClient.auth.signInWithPassword({ email: 'Todd@camptlc.com', password: 'Yankees1!' });

    const RETRY_TABLES = [
        'medication_logs',
        'health_center_admissions',
        'awards',
        'appointments',
        'role_permissions', // Not actually auth-dependent, it's role+company+menu_item
    ];

    for (const tableName of RETRY_TABLES) {
        process.stdout.write(`[${tableName}] `);
        const { data, error } = await oldClient.from(tableName).select('*');
        if (error) { console.log(`FETCH ERROR: ${error.message}`); continue; }
        if (!data || data.length === 0) { console.log('empty'); continue; }

        process.stdout.write(`${data.length} records... `);
        const result = await smartInsert(tableName, data);
        console.log(`OK: ${result.success} inserted, ${result.fail} skipped (FK)`);
    }

    // Verify final counts
    console.log('\n=== FINAL TABLE COUNTS ===');
    const tables = ['companies', 'divisions', 'children', 'staff', 'profiles', 'user_roles',
        'role_permissions', 'activities_field_trips', 'sports_calendar',
        'evaluation_questions', 'medication_logs', 'awards', 'automated_email_config',
        'special_events_activities', 'incident_reports'];
    for (const t of tables) {
        const { count } = await newClient.from(t).select('*', { count: 'exact', head: true });
        console.log(`  ${t}: ${count} rows`);
    }

    console.log('\n=== DONE ===');
}

fixRemaining().catch(console.error);
