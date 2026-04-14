const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const OLD_URL = 'https://gdcxtefbarvnrtvacqln.supabase.co';
const OLD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkY3h0ZWZiYXJ2bnJ0dmFjcWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNTA3NDIsImV4cCI6MjA3NTYyNjc0Mn0.8KkemWYnHix_jtcT_ZSx0EdsACsBnyID76-xZgZSKhA';
const NEW_URL = 'https://qjbkvnzeejbqxbcbskdu.supabase.co';
const NEW_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYmt2bnplZWpicXhiY2Jza2R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzAzMjcsImV4cCI6MjA4ODU0NjMyN30.6SdzLftFAn_HgTQrlmSbqEIk_gZCBZJnZsMmo1yz48U';
const LOGIN_EMAIL = 'Todd@camptlc.com';
const LOGIN_PASSWORD = 'Yankees1!';

const TARGET_SLUGS = ['timber-lake-camp', 'timber-lake-west', 'tyler-hill-camp'];
const TARGET_SEASONS = ['2025', '2026'];

function keyByNameEmail(row) {
    const name = String(row.name || '').trim().toLowerCase();
    const email = String(row.email || '').trim().toLowerCase();
    return `${name}|${email}`;
}

async function signIn(client) {
    const { error } = await client.auth.signInWithPassword({
        email: LOGIN_EMAIL,
        password: LOGIN_PASSWORD,
    });
    if (error) throw error;
}

async function fetchCompanies(client) {
    const { data, error } = await client
        .from('companies')
        .select('id, slug, name')
        .in('slug', TARGET_SLUGS);
    if (error) throw error;
    return data || [];
}

async function fetchStaff(client, companyId, season) {
    const { data, error } = await client
        .from('staff')
        .select('id, name, email, role, season, company_id')
        .eq('company_id', companyId)
        .eq('season', season)
        .neq('name', 'Unknown')
        .not('name', 'is', null)
        .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
}

async function main() {
    const oldClient = createClient(OLD_URL, OLD_ANON_KEY, { auth: { persistSession: false } });
    const newClient = createClient(NEW_URL, NEW_ANON_KEY, { auth: { persistSession: false } });
    await signIn(oldClient);
    await signIn(newClient);

    const oldCompanies = await fetchCompanies(oldClient);
    const newCompanies = await fetchCompanies(newClient);

    const report = {
        generatedAt: new Date().toISOString(),
        totals: [],
        missingInNew: [],
        missingInOld: [],
    };

    for (const slug of TARGET_SLUGS) {
        const oldCompany = oldCompanies.find((c) => c.slug === slug);
        const newCompany = newCompanies.find((c) => c.slug === slug);
        if (!oldCompany || !newCompany) continue;

        for (const season of TARGET_SEASONS) {
            const oldRows = await fetchStaff(oldClient, oldCompany.id, season);
            const newRows = await fetchStaff(newClient, newCompany.id, season);

            report.totals.push({
                slug,
                season,
                oldCount: oldRows.length,
                newCount: newRows.length,
                deltaOldMinusNew: oldRows.length - newRows.length,
            });

            const newKeySet = new Set(newRows.map((r) => keyByNameEmail(r)));
            const oldKeySet = new Set(oldRows.map((r) => keyByNameEmail(r)));

            for (const row of oldRows) {
                if (!newKeySet.has(keyByNameEmail(row))) {
                    report.missingInNew.push({ slug, season, ...row });
                }
            }
            for (const row of newRows) {
                if (!oldKeySet.has(keyByNameEmail(row))) {
                    report.missingInOld.push({ slug, season, ...row });
                }
            }
        }
    }

    fs.writeFileSync('staff_count_diff_report.json', JSON.stringify(report, null, 2), 'utf8');

    console.log('Wrote staff_count_diff_report.json');
    for (const row of report.totals) {
        console.log(
            `${row.slug} ${row.season} old=${row.oldCount} new=${row.newCount} delta=${row.deltaOldMinusNew}`
        );
    }
    console.log(`missingInNew=${report.missingInNew.length}`);
    console.log(`missingInOld=${report.missingInOld.length}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
