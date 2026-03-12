const { createClient } = require('@supabase/supabase-js');

const OLD_URL = 'https://gdcxtefbarvnrtvacqln.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkY3h0ZWZiYXJ2bnJ0dmFjcWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNTA3NDIsImV4cCI6MjA3NTYyNjc0Mn0.8KkemWYnHix_jtcT_ZSx0EdsACsBnyID76-xZgZSKhA';
const NEW_URL = 'https://qjbkvnzeejbqxbcbskdu.supabase.co';
const NEW_KEY = process.env.NEW_SERVICE_KEY;

if (!NEW_KEY) { console.error("Set NEW_SERVICE_KEY"); process.exit(1); }

const oldClient = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });
const newClient = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

// ──────────────────────────────────────────
// PHASE 1: Add missing columns via SQL RPC
// ──────────────────────────────────────────
const ALTER_STATEMENTS = [
    // children
    `ALTER TABLE children ADD COLUMN IF NOT EXISTS guardian_name_p2 text`,
    `ALTER TABLE children ADD COLUMN IF NOT EXISTS photo_url text`,
    `ALTER TABLE children ADD COLUMN IF NOT EXISTS tshirt_size text`,
    // staff
    `ALTER TABLE staff ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES divisions(id)`,
    `ALTER TABLE staff ADD COLUMN IF NOT EXISTS gender text`,
    `ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url text`,
    `ALTER TABLE staff ADD COLUMN IF NOT EXISTS tshirt_size text`,
    // special_events_activities
    `ALTER TABLE special_events_activities ADD COLUMN IF NOT EXISTS chaperone text`,
    `ALTER TABLE special_events_activities ADD COLUMN IF NOT EXISTS file_name text`,
    `ALTER TABLE special_events_activities ADD COLUMN IF NOT EXISTS file_url text`,
    // automated_email_config
    `ALTER TABLE automated_email_config ADD COLUMN IF NOT EXISTS specific_recipient_id uuid`,
    // messages — add missing columns
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_id uuid`,
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS parent_message_id uuid`,
];

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────
async function fetchAllPaginated(client, tableName) {
    const PAGE = 1000;
    let allData = [];
    let from = 0;
    while (true) {
        const { data, error } = await client
            .from(tableName)
            .select('*')
            .range(from, from + PAGE - 1);
        if (error) return { data: null, error };
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
    }
    return { data: allData, error: null };
}

async function smartUpsert(tableName, records, batchSize = 200) {
    let success = 0;
    let fail = 0;
    let stripped = [];

    const doInsert = async (data) => {
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            const { error } = await newClient
                .from(tableName)
                .upsert(batch, { onConflict: 'id', ignoreDuplicates: true });

            if (error) {
                // Strip unknown column and retry entire dataset
                const colMatch = error.message.match(/Could not find the '(\w+)' column/);
                if (colMatch) {
                    const badCol = colMatch[1];
                    stripped.push(badCol);
                    const cleaned = data.map(r => { const c = { ...r }; delete c[badCol]; return c; });
                    return doInsert(cleaned);
                }

                // FK constraint — insert row by row
                if (error.message.includes('violates foreign key')) {
                    for (const row of batch) {
                        const { error: rowErr } = await newClient
                            .from(tableName)
                            .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
                        if (rowErr) fail++;
                        else success++;
                    }
                } else {
                    // Other error, try row by row
                    for (const row of batch) {
                        const { error: rowErr } = await newClient
                            .from(tableName)
                            .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
                        if (rowErr) fail++;
                        else success++;
                    }
                }
            } else {
                success += batch.length;
            }
        }
    };

    await doInsert(records);
    return { success, fail, stripped };
}

// ──────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────
async function main() {
    console.log('=== FULL DATA MIGRATION FIX ===\n');

    // Login to Lovable (READ ONLY — no writes)
    console.log('Logging in to Lovable (read-only)...');
    const { error: loginErr } = await oldClient.auth.signInWithPassword({
        email: 'Todd@camptlc.com', password: 'Yankees1!'
    });
    if (loginErr) { console.error('Login failed:', loginErr.message); return; }
    console.log('Login OK.\n');

    // ── PHASE 1: Add missing columns ──
    console.log('── PHASE 1: Adding missing columns ──');
    for (const sql of ALTER_STATEMENTS) {
        const colName = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1];
        const tblName = sql.match(/ALTER TABLE (\w+)/)?.[1];
        const { error } = await newClient.rpc('exec_sql', { sql_query: sql });
        if (error) {
            // If RPC doesn't exist, we need to use a different approach
            if (error.message.includes('function') || error.message.includes('exec_sql')) {
                console.log(`  ⚠️  Cannot run ALTER TABLE via API (no exec_sql RPC). Will handle missing columns by stripping.`);
                break;
            }
            console.log(`  ❌ ${tblName}.${colName}: ${error.message}`);
        } else {
            console.log(`  ✅ Added ${tblName}.${colName}`);
        }
    }
    console.log('');

    // ── PHASE 2: Re-fetch and import all data (paginated) ──
    console.log('── PHASE 2: Migrating data with pagination ──\n');

    // Order matters: parent tables first
    const TABLES = [
        'companies',
        'divisions',
        'bunks',
        'children',
        'staff',
        'activities_field_trips',
        'activity_divisions',
        'special_events_activities',
        'sports_calendar',
        'master_calendar',
        'incident_reports',
        'awards',
        'medication_logs',
        'health_center_admissions',
        'appointments',
        'automated_email_config',
        'evaluation_questions',
        'special_meals',
        'rainy_day_schedule',
        'roster_templates',
        'user_tags',
        'messages',
        'daily_news',
        'days_off',
    ];

    const results = [];

    for (const table of TABLES) {
        process.stdout.write(`[${table}] Fetching... `);
        const { data: oldData, error: fetchErr } = await fetchAllPaginated(oldClient, table);

        if (fetchErr) {
            console.log(`FETCH ERROR: ${fetchErr.message}`);
            results.push({ table, oldCount: '?', newCount: '?', status: 'FETCH_ERROR', detail: fetchErr.message });
            continue;
        }
        if (!oldData || oldData.length === 0) {
            console.log('empty');
            results.push({ table, oldCount: 0, newCount: 0, status: 'EMPTY' });
            continue;
        }

        process.stdout.write(`${oldData.length} rows... Upserting... `);
        const { success, fail, stripped } = await smartUpsert(table, oldData);
        const strippedMsg = stripped.length > 0 ? ` (stripped: ${stripped.join(', ')})` : '';
        console.log(`✅ ${success} ok, ${fail} failed${strippedMsg}`);

        // Get final new count
        const { count: newCount } = await newClient.from(table).select('*', { count: 'exact', head: true });
        results.push({ table, oldCount: oldData.length, newCount: newCount || 0, status: fail > 0 ? 'PARTIAL' : 'OK', stripped });
    }

    // ── Auth-dependent tables (best effort) ──
    console.log('\n── Auth-dependent tables (best effort) ──\n');

    const AUTH_TABLES = ['profiles', 'user_roles', 'division_permissions'];
    const { data: authUsers } = await newClient.auth.admin.listUsers();
    const validUserIds = new Set((authUsers?.users || []).map(u => u.id));
    console.log(`Auth users in new DB: ${validUserIds.size}`);

    for (const table of AUTH_TABLES) {
        process.stdout.write(`[${table}] Fetching... `);
        const { data: oldData, error: fetchErr } = await fetchAllPaginated(oldClient, table);

        if (fetchErr) {
            console.log(`FETCH ERROR: ${fetchErr.message}`);
            results.push({ table, oldCount: '?', newCount: '?', status: 'FETCH_ERROR' });
            continue;
        }
        if (!oldData || oldData.length === 0) {
            console.log('empty');
            results.push({ table, oldCount: 0, newCount: 0, status: 'EMPTY' });
            continue;
        }

        // Filter to only rows with valid user IDs
        const userIdField = table === 'profiles' ? 'id' : 'user_id';
        const filtered = oldData.filter(r => validUserIds.has(r[userIdField]));

        process.stdout.write(`${oldData.length} total, ${filtered.length} match auth... `);

        if (filtered.length === 0) {
            console.log('skipped (no matching auth users)');
            results.push({ table, oldCount: oldData.length, newCount: 0, status: 'NO_AUTH_USERS' });
            continue;
        }

        const { success, fail, stripped } = await smartUpsert(table, filtered);
        console.log(`✅ ${success} ok, ${fail} failed`);

        const { count: newCount } = await newClient.from(table).select('*', { count: 'exact', head: true });
        results.push({ table, oldCount: oldData.length, newCount: newCount || 0, status: 'PARTIAL_AUTH' });
    }

    // ── SUMMARY ──
    console.log('\n\n════════════════════════════════════════════');
    console.log('              MIGRATION RESULTS');
    console.log('════════════════════════════════════════════');
    console.log('Table'.padEnd(32) + 'Lovable'.padStart(8) + 'New DB'.padStart(8) + '  Status');
    console.log('─'.repeat(60));
    for (const r of results) {
        console.log(
            r.table.padEnd(32) +
            String(r.oldCount).padStart(8) +
            String(r.newCount).padStart(8) +
            '  ' + r.status
        );
    }

    console.log('\n=== DONE ===');
}

main().catch(console.error);
