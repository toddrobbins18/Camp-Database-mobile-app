const { createClient } = require('@supabase/supabase-js');

// Configuration
const OLD_SUPABASE_URL = 'https://gdcxtefbarvnrtvacqln.supabase.co';
const OLD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkY3h0ZWZiYXJ2bnJ0dmFjcWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNTA3NDIsImV4cCI6MjA3NTYyNjc0Mn0.8KkemWYnHix_jtcT_ZSx0EdsACsBnyID76-xZgZSKhA';
const OLD_EMAIL = 'Todd@camptlc.com';
const OLD_PASSWORD = 'Yankees1!';

const NEW_SUPABASE_URL = 'https://qjbkvnzeejbqxbcbskdu.supabase.co';
const NEW_SERVICE_KEY = process.env.NEW_SERVICE_KEY;

if (!NEW_SERVICE_KEY) {
    console.error("Missing NEW_SERVICE_KEY env var.");
    process.exit(1);
}

const oldClient = createClient(OLD_SUPABASE_URL, OLD_ANON_KEY, {
    auth: { persistSession: false },
});

const newClient = createClient(NEW_SUPABASE_URL, NEW_SERVICE_KEY, {
    auth: { persistSession: false },
});

// Tables in dependency order
const TABLES_TO_MIGRATE = [
    'companies',
    'divisions',
    'bunks',
    'children',
    'staff',
    'medication_logs',
    'health_center_admissions',
    'incident_reports',
    'awards',
    'tutoring_therapy',
    'sports_academy',
    'activities_field_trips',
    'special_events_activities',
    'master_calendar',
    'sports_calendar',
    'rainy_day_schedule',
    'special_meals',
    'automated_email_config',
    'user_tags',
    'appointments',
    'evaluation_questions',
    'roster_templates',
];

// Tables that reference auth.users via FK – we need to skip FK validation
const AUTH_USER_TABLES = ['profiles', 'user_roles', 'role_permissions', 'division_permissions', 'messages'];

async function getTableColumns(client, tableName) {
    // Try inserting an empty object to get column info from error, or just do a select
    const { data, error } = await client.from(tableName).select('*').limit(0);
    // We can't easily get column names from supabase-js without data
    // Instead we'll handle errors by stripping bad columns
    return null;
}

async function smartInsert(tableName, records, batchSize = 500) {
    // Try upsert first
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await newClient.from(tableName).upsert(batch, { onConflict: 'id', ignoreDuplicates: true });

        if (error) {
            // If column not found, strip unknown columns and retry
            const colMatch = error.message.match(/Could not find the '(\w+)' column/);
            if (colMatch) {
                const badCol = colMatch[1];
                console.log(`    [!] Stripping unknown column '${badCol}' and retrying...`);
                const cleaned = records.map(r => {
                    const copy = { ...r };
                    delete copy[badCol];
                    return copy;
                });
                return smartInsert(tableName, cleaned, batchSize); // Recurse
            }

            // If duplicate key, try ignoreDuplicates with insert
            if (error.message.includes('duplicate key')) {
                console.log(`    [!] Duplicate keys found, using insert with ignoreDuplicates...`);
                const { error: insertErr } = await newClient.from(tableName).insert(batch, { onConflict: 'id' });
                if (insertErr) {
                    return insertErr;
                }
                continue;
            }

            return error;
        }
    }
    return null;
}

async function migrateData() {
    console.log('=== SMART DATA MIGRATION ===\n');

    // 1. Login to old project
    console.log(`Logging in to Lovable as ${OLD_EMAIL}...`);
    const { error: loginError } = await oldClient.auth.signInWithPassword({
        email: OLD_EMAIL,
        password: OLD_PASSWORD,
    });
    if (loginError) {
        console.error('Failed to login:', loginError.message);
        return;
    }
    console.log('Login successful!\n');

    // 2. Migrate standard tables
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const tableName of TABLES_TO_MIGRATE) {
        process.stdout.write(`[${tableName}] `);

        const { data: oldData, error: fetchError } = await oldClient.from(tableName).select('*');
        if (fetchError) {
            console.log(`FETCH ERROR: ${fetchError.message}`);
            failCount++;
            continue;
        }
        if (!oldData || oldData.length === 0) {
            console.log('empty, skipping');
            skipCount++;
            continue;
        }

        process.stdout.write(`${oldData.length} records... `);
        const err = await smartInsert(tableName, oldData);
        if (err) {
            console.log(`INSERT ERROR: ${err.message}`);
            failCount++;
        } else {
            console.log('OK');
            successCount++;
        }
    }

    // 3. Migrate auth-dependent tables (profiles, user_roles, etc.)
    // These reference auth.users which we can't migrate via API.
    // We will strip the FK-violating rows and only insert what we can.
    console.log('\n--- Auth-dependent tables (best effort) ---');

    for (const tableName of AUTH_USER_TABLES) {
        process.stdout.write(`[${tableName}] `);

        const { data: oldData, error: fetchError } = await oldClient.from(tableName).select('*');
        if (fetchError) {
            console.log(`FETCH ERROR: ${fetchError.message}`);
            failCount++;
            continue;
        }
        if (!oldData || oldData.length === 0) {
            console.log('empty, skipping');
            skipCount++;
            continue;
        }

        process.stdout.write(`${oldData.length} records... `);

        // Get list of auth users in the new DB
        const { data: authUsers } = await newClient.auth.admin.listUsers();
        const validUserIds = new Set((authUsers?.users || []).map(u => u.id));

        // Filter records to only those whose user_id or id exists in new auth
        let filtered;
        if (tableName === 'profiles') {
            filtered = oldData.filter(r => validUserIds.has(r.id));
        } else if (tableName === 'messages') {
            filtered = oldData; // Messages may not have user FK, try all
        } else {
            filtered = oldData.filter(r => validUserIds.has(r.user_id));
        }

        if (filtered.length === 0) {
            console.log(`0/${oldData.length} match existing auth users, skipping`);
            skipCount++;
            continue;
        }

        process.stdout.write(`${filtered.length}/${oldData.length} match auth users... `);
        const err = await smartInsert(tableName, filtered);
        if (err) {
            console.log(`INSERT ERROR: ${err.message}`);
            failCount++;
        } else {
            console.log('OK');
            successCount++;
        }
    }

    // 4. Summary
    console.log(`\n=== MIGRATION SUMMARY ===`);
    console.log(`Success: ${successCount} | Failed: ${failCount} | Skipped (empty): ${skipCount}`);
    console.log(`\nNOTE: profiles/user_roles only migrated for users who exist in the new auth system.`);
    console.log(`The Super Admin (Todd@camptlc.com) was set up separately via setupAdmin.ts.\n`);

    // 5. Now re-run setupAdmin to ensure Todd's profile is correct
    console.log('--- Re-linking Super Admin profile ---');
    const { data: companies } = await newClient.from('companies').select('id, name').limit(1);
    if (companies && companies.length > 0) {
        const companyId = companies[0].id;
        const { data: authData } = await newClient.auth.admin.listUsers();
        const todd = (authData?.users || []).find(u => u.email?.toLowerCase() === 'todd@camptlc.com');
        if (todd) {
            // Upsert profile
            await newClient.from('profiles').upsert({
                id: todd.id,
                email: todd.email,
                name: 'Todd',
                approved: true,
                company_id: companyId,
            }, { onConflict: 'id' });

            // Upsert user_role
            await newClient.from('user_roles').upsert({
                user_id: todd.id,
                role: 'super_admin',
                company_id: companyId,
            }, { onConflict: 'user_id,role,company_id' }).then(({ error }) => {
                if (error) {
                    // Try insert if upsert fails
                    return newClient.from('user_roles').insert({
                        user_id: todd.id,
                        role: 'super_admin',
                        company_id: companyId,
                    });
                }
            });

            console.log(`Super Admin linked to company: ${companies[0].name} (${companyId})`);
        }
    }

    console.log('\n=== ALL DONE ===');
}

migrateData().catch(console.error);
