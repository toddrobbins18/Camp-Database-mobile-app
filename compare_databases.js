const { createClient } = require('@supabase/supabase-js');

const OLD_URL = 'https://gdcxtefbarvnrtvacqln.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkY3h0ZWZiYXJ2bnJ0dmFjcWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNTA3NDIsImV4cCI6MjA3NTYyNjc0Mn0.8KkemWYnHix_jtcT_ZSx0EdsACsBnyID76-xZgZSKhA';

const NEW_URL = 'https://qjbkvnzeejbqxbcbskdu.supabase.co';
const NEW_KEY = process.env.NEW_SERVICE_KEY;

if (!NEW_KEY) { console.error("Set NEW_SERVICE_KEY"); process.exit(1); }

const oldClient = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });
const newClient = createClient(NEW_URL, NEW_KEY, { auth: { persistSession: false } });

// All known tables from our migration files + Lovable
const ALL_TABLES = [
    'companies', 'divisions', 'bunks', 'profiles', 'user_roles',
    'role_permissions', 'division_permissions', 'children', 'staff',
    'medication_logs', 'health_center_admissions', 'incident_reports',
    'awards', 'tutoring_therapy', 'sports_academy',
    'activities_field_trips', 'activity_divisions',
    'special_events_activities', 'master_calendar', 'sports_calendar',
    'transportation', 'rainy_day_schedule', 'menu', 'menus',
    'special_meals', 'messages', 'automated_email_config',
    'user_tags', 'appointments', 'daily_news', 'days_off',
    'evaluation_questions', 'evaluations', 'roster_templates',
    'transport_routes', 'transport_stops', 'transport_assignments',
];

async function getTableInfo(client, tableName) {
    // Get count
    const { count, error: countErr } = await client.from(tableName).select('*', { count: 'exact', head: true });
    if (countErr) return { exists: false, count: 0, error: countErr.message };

    // Get column names from a sample row
    const { data: sample, error: sampleErr } = await client.from(tableName).select('*').limit(1);
    const columns = (sample && sample.length > 0) ? Object.keys(sample[0]).sort() : [];

    return { exists: true, count: count || 0, columns, error: null };
}

async function main() {
    console.log('Logging in to Lovable...');
    const { error: loginErr } = await oldClient.auth.signInWithPassword({
        email: 'Todd@camptlc.com', password: 'Yankees1!'
    });
    if (loginErr) { console.error('Login failed:', loginErr.message); return; }

    const report = {
        tables: [],
        summary: { totalOld: 0, totalNew: 0, missingInNew: [], missingInOld: [], schemaDiffs: [] }
    };

    console.log('Comparing tables...\n');

    for (const table of ALL_TABLES) {
        process.stdout.write(`  ${table}... `);
        const oldInfo = await getTableInfo(oldClient, table);
        const newInfo = await getTableInfo(newClient, table);

        const entry = {
            table,
            oldExists: oldInfo.exists,
            newExists: newInfo.exists,
            oldCount: oldInfo.count,
            newCount: newInfo.count,
            oldColumns: oldInfo.columns || [],
            newColumns: newInfo.columns || [],
            missingInNew: [],
            missingInOld: [],
            dataDiff: 0,
        };

        if (oldInfo.exists && newInfo.exists) {
            entry.missingInNew = (oldInfo.columns || []).filter(c => !(newInfo.columns || []).includes(c));
            entry.missingInOld = (newInfo.columns || []).filter(c => !(oldInfo.columns || []).includes(c));
            entry.dataDiff = oldInfo.count - newInfo.count;
        }

        if (oldInfo.exists && !newInfo.exists) report.summary.missingInNew.push(table);
        if (!oldInfo.exists && newInfo.exists) report.summary.missingInOld.push(table);
        if (entry.missingInNew.length > 0 || entry.missingInOld.length > 0) {
            report.summary.schemaDiffs.push({ table, missingInNew: entry.missingInNew, extraInNew: entry.missingInOld });
        }

        report.summary.totalOld += oldInfo.count;
        report.summary.totalNew += newInfo.count;
        report.tables.push(entry);

        const status = !oldInfo.exists && !newInfo.exists ? 'NEITHER' :
            !oldInfo.exists ? 'NEW_ONLY' :
                !newInfo.exists ? 'OLD_ONLY' :
                    oldInfo.count === newInfo.count ? 'MATCH' :
                        `DIFF (old:${oldInfo.count} new:${newInfo.count})`;
        console.log(status);
    }

    // Output JSON report
    const fs = require('fs');
    fs.writeFileSync('comparison_report.json', JSON.stringify(report, null, 2));
    console.log('\n--- Report saved to comparison_report.json ---');

    // Print summary
    console.log('\n=== SUMMARY ===');
    console.log(`Total rows in Lovable: ${report.summary.totalOld}`);
    console.log(`Total rows in New DB:  ${report.summary.totalNew}`);
    console.log(`\nTables in Lovable but NOT in New DB: ${report.summary.missingInNew.join(', ') || 'none'}`);
    console.log(`Tables in New DB but NOT in Lovable: ${report.summary.missingInOld.join(', ') || 'none'}`);
    console.log(`\nSchema differences:`);
    for (const diff of report.summary.schemaDiffs) {
        if (diff.missingInNew.length > 0)
            console.log(`  ${diff.table}: columns in Lovable but missing in new: ${diff.missingInNew.join(', ')}`);
        if (diff.extraInNew.length > 0)
            console.log(`  ${diff.table}: columns in new but missing in Lovable: ${diff.extraInNew.join(', ')}`);
    }

    // Print data comparison table
    console.log('\n=== DATA COMPARISON ===');
    console.log('Table'.padEnd(35) + 'Lovable'.padStart(10) + 'New DB'.padStart(10) + 'Diff'.padStart(10));
    console.log('-'.repeat(65));
    for (const t of report.tables) {
        if (!t.oldExists && !t.newExists) continue;
        const diff = t.oldCount - t.newCount;
        const marker = diff > 0 ? ` ⚠️ -${diff}` : diff < 0 ? ` +${Math.abs(diff)}` : ' ✅';
        console.log(
            t.table.padEnd(35) +
            (t.oldExists ? String(t.oldCount) : 'N/A').padStart(10) +
            (t.newExists ? String(t.newCount) : 'N/A').padStart(10) +
            marker.padStart(10)
        );
    }
}

main().catch(console.error);
