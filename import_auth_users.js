const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const NEW_URL = 'https://qjbkvnzeejbqxbcbskdu.supabase.co';
const NEW_KEY = process.env.NEW_SERVICE_KEY;
const OLD_URL = 'https://gdcxtefbarvnrtvacqln.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkY3h0ZWZiYXJ2bnJ0dmFjcWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNTA3NDIsImV4cCI6MjA3NTYyNjc0Mn0.8KkemWYnHix_jtcT_ZSx0EdsACsBnyID76-xZgZSKhA';

if (!NEW_KEY) { console.error("Set NEW_SERVICE_KEY"); process.exit(1); }

const newClient = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });
const oldClient = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });

// Parse CSV
function parseCSV(content) {
    const lines = content.split('\n').filter(l => l.trim());
    const header = lines[0].split(';').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(';');
        if (vals.length < header.length) continue;
        const row = {};
        for (let j = 0; j < header.length; j++) {
            row[header[j]] = vals[j]?.trim();
        }
        rows.push(row);
    }
    return rows;
}

// Paginated fetch
async function fetchAllPaginated(client, tableName) {
    const PAGE = 1000;
    let allData = [];
    let from = 0;
    while (true) {
        const { data, error } = await client.from(tableName).select('*').range(from, from + PAGE - 1);
        if (error) return { data: null, error };
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
    }
    return { data: allData, error: null };
}

// Smart upsert with column stripping and row-by-row FK handling
async function smartUpsert(tableName, records) {
    let success = 0, fail = 0, stripped = [];
    const doInsert = async (data) => {
        for (let i = 0; i < data.length; i += 200) {
            const batch = data.slice(i, i + 200);
            const { error } = await newClient.from(tableName).upsert(batch, { onConflict: 'id', ignoreDuplicates: true });
            if (error) {
                const colMatch = error.message.match(/Could not find the '(\w+)' column/);
                if (colMatch) {
                    stripped.push(colMatch[1]);
                    return doInsert(data.map(r => { const c = { ...r }; delete c[colMatch[1]]; return c; }));
                }
                for (const row of batch) {
                    const { error: e } = await newClient.from(tableName).upsert(row, { onConflict: 'id', ignoreDuplicates: true });
                    if (e) fail++;
                    else success++;
                }
            } else {
                success += batch.length;
            }
        }
    };
    await doInsert(records);
    return { success, fail, stripped };
}

async function main() {
    console.log('=== IMPORTING AUTH USERS & REMAINING DATA ===\n');

    // ── STEP 1: Read CSV and create auth users ──
    console.log('── STEP 1: Creating auth users from CSV ──\n');
    const csv = fs.readFileSync('E:\\DataCamp\\datacamp-mobile\\query-results-export-2026-03-11_12-52-40.csv', 'utf-8');
    const users = parseCSV(csv);
    console.log(`Found ${users.length} users in CSV.\n`);

    // Get existing users in new DB
    const { data: existingAuth } = await newClient.auth.admin.listUsers();
    const existingIds = new Set((existingAuth?.users || []).map(u => u.id));
    const existingEmails = new Set((existingAuth?.users || []).map(u => u.email?.toLowerCase()));

    let created = 0, skipped = 0, failed = 0;

    for (const user of users) {
        const id = user.id;
        const email = user.email;

        if (existingIds.has(id) || existingEmails.has(email?.toLowerCase())) {
            process.stdout.write(`  [skip] ${email} (already exists)\n`);
            skipped++;
            continue;
        }

        // Create user with their original UUID
        const { error } = await newClient.auth.admin.createUser({
            id: id,
            email: email,
            email_confirm: true,
            password: 'TempPass123!', // Temp password — they'll need to reset
            user_metadata: JSON.parse(user.raw_user_meta_data?.replace(/""/g, '"').replace(/^"/, '').replace(/"$/, '') || '{}'),
        });

        if (error) {
            console.log(`  [FAIL] ${email}: ${error.message}`);
            failed++;
        } else {
            process.stdout.write(`  [OK] ${email}\n`);
            created++;
        }
    }

    console.log(`\nAuth users: ${created} created, ${skipped} skipped, ${failed} failed\n`);

    // ── STEP 2: Re-import auth-dependent tables ──
    console.log('── STEP 2: Re-importing auth-dependent tables ──\n');

    await oldClient.auth.signInWithPassword({ email: 'Todd@camptlc.com', password: 'Yankees1!' });

    // Get updated valid user IDs
    const { data: updatedAuth } = await newClient.auth.admin.listUsers();
    const validIds = new Set((updatedAuth?.users || []).map(u => u.id));
    console.log(`Total auth users in new DB: ${validIds.size}\n`);

    // profiles
    {
        process.stdout.write('[profiles] ');
        const { data } = await fetchAllPaginated(oldClient, 'profiles');
        if (data) {
            const filtered = data.filter(r => validIds.has(r.id));
            process.stdout.write(`${data.length} total, ${filtered.length} match... `);
            if (filtered.length > 0) {
                const r = await smartUpsert('profiles', filtered);
                console.log(`✅ ${r.success} ok, ${r.fail} failed${r.stripped.length ? ' (stripped: ' + r.stripped.join(', ') + ')' : ''}`);
            } else console.log('none match');
        }
    }

    // user_roles
    {
        process.stdout.write('[user_roles] ');
        const { data } = await fetchAllPaginated(oldClient, 'user_roles');
        if (data) {
            const filtered = data.filter(r => validIds.has(r.user_id));
            process.stdout.write(`${data.length} total, ${filtered.length} match... `);
            if (filtered.length > 0) {
                const r = await smartUpsert('user_roles', filtered);
                console.log(`✅ ${r.success} ok, ${r.fail} failed`);
            } else console.log('none match');
        }
    }

    // division_permissions
    {
        process.stdout.write('[division_permissions] ');
        const { data } = await fetchAllPaginated(oldClient, 'division_permissions');
        if (data) {
            const filtered = data.filter(r => validIds.has(r.user_id));
            process.stdout.write(`${data.length} total, ${filtered.length} match... `);
            if (filtered.length > 0) {
                const r = await smartUpsert('division_permissions', filtered);
                console.log(`✅ ${r.success} ok, ${r.fail} failed`);
            } else console.log('none match');
        }
    }

    // health_center_admissions (FK to admitted_by -> auth.users)
    {
        process.stdout.write('[health_center_admissions] ');
        const { data } = await fetchAllPaginated(oldClient, 'health_center_admissions');
        if (data) {
            // Need both child_id and admitted_by to exist
            const filtered = data.filter(r => {
                const admittedOk = !r.admitted_by || validIds.has(r.admitted_by);
                const staffOk = !r.staff_id || validIds.has(r.staff_id);
                return admittedOk && staffOk;
            });
            process.stdout.write(`${data.length} total, ${filtered.length} match... `);
            if (filtered.length > 0) {
                const r = await smartUpsert('health_center_admissions', filtered);
                console.log(`✅ ${r.success} ok, ${r.fail} failed`);
            } else {
                // Try stripping FK columns
                const stripped = data.map(r => {
                    const c = { ...r };
                    delete c.admitted_by;
                    delete c.checked_out_by;
                    delete c.staff_id;
                    return c;
                });
                const r = await smartUpsert('health_center_admissions', stripped);
                console.log(`✅ ${r.success} ok, ${r.fail} failed (stripped user FK cols)`);
            }
        }
    }

    // messages
    {
        process.stdout.write('[messages] ');
        const { data } = await fetchAllPaginated(oldClient, 'messages');
        if (data) {
            const filtered = data.filter(r => {
                const senderOk = !r.sender_id || validIds.has(r.sender_id);
                const recipOk = !r.recipient_id || validIds.has(r.recipient_id);
                return senderOk && recipOk;
            });
            process.stdout.write(`${data.length} total, ${filtered.length} match... `);
            if (filtered.length > 0) {
                const r = await smartUpsert('messages', filtered);
                console.log(`✅ ${r.success} ok, ${r.fail} failed${r.stripped.length ? ' (stripped: ' + r.stripped.join(', ') + ')' : ''}`);
            } else console.log('none match (sender/recipient not in new DB)');
        }
    }

    // ── STEP 3: Final verification ──
    console.log('\n── FINAL COUNTS ──\n');
    const tables = [
        'companies', 'divisions', 'children', 'staff', 'profiles', 'user_roles',
        'role_permissions', 'division_permissions', 'awards', 'activities_field_trips',
        'sports_calendar', 'evaluation_questions', 'medication_logs', 'automated_email_config',
        'special_events_activities', 'incident_reports', 'appointments',
        'health_center_admissions', 'messages',
    ];
    console.log('Table'.padEnd(32) + 'Count'.padStart(8));
    console.log('─'.repeat(40));
    for (const t of tables) {
        const { count } = await newClient.from(t).select('*', { count: 'exact', head: true });
        console.log(t.padEnd(32) + String(count || 0).padStart(8));
    }

    console.log('\n=== ALL DONE ===');
}

main().catch(console.error);
