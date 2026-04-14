const { createClient } = require('@supabase/supabase-js');

const OLD_URL = 'https://gdcxtefbarvnrtvacqln.supabase.co';
const OLD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkY3h0ZWZiYXJ2bnJ0dmFjcWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNTA3NDIsImV4cCI6MjA3NTYyNjc0Mn0.8KkemWYnHix_jtcT_ZSx0EdsACsBnyID76-xZgZSKhA';
const NEW_URL = 'https://qjbkvnzeejbqxbcbskdu.supabase.co';
const NEW_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYmt2bnplZWpicXhiY2Jza2R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzAzMjcsImV4cCI6MjA4ODU0NjMyN30.6SdzLftFAn_HgTQrlmSbqEIk_gZCBZJnZsMmo1yz48U';

const LOGIN_EMAIL = 'Todd@camptlc.com';
const LOGIN_PASSWORD = 'Yankees1!';

const TARGET_SLUGS = ['timber-lake-camp', 'timber-lake-west', 'tyler-hill-camp'];
const TARGET_SEASONS = ['2025', '2026'];
const BATCH_SIZE = 100;
const PRUNE_EXTRAS = true;

function canonicalName(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function chunks(list, size) {
    const out = [];
    for (let i = 0; i < list.length; i += size) {
        out.push(list.slice(i, i + size));
    }
    return out;
}

async function signIn(client, label) {
    const { error } = await client.auth.signInWithPassword({
        email: LOGIN_EMAIL,
        password: LOGIN_PASSWORD,
    });
    if (error) throw new Error(`${label} login failed: ${error.message}`);
}

async function fetchCompanies(client) {
    const { data, error } = await client
        .from('companies')
        .select('id, slug, name')
        .in('slug', TARGET_SLUGS);
    if (error) throw error;
    return data || [];
}

async function fetchStaffRows(client, companyId, season) {
    const { data, error } = await client
        .from('staff')
        .select('*')
        .eq('company_id', companyId)
        .eq('season', season)
        .neq('name', 'Unknown')
        .not('name', 'is', null);
    if (error) throw error;
    return data || [];
}

async function main() {
    const oldClient = createClient(OLD_URL, OLD_ANON_KEY, { auth: { persistSession: false } });
    const newClient = createClient(NEW_URL, NEW_ANON_KEY, { auth: { persistSession: false } });

    await signIn(oldClient, 'Old DB');
    await signIn(newClient, 'New DB');

    const oldCompanies = await fetchCompanies(oldClient);
    const newCompanies = await fetchCompanies(newClient);

    const summary = [];
    let totalInserted = 0;
    let totalDeleted = 0;

    for (const slug of TARGET_SLUGS) {
        const oldCompany = oldCompanies.find((c) => c.slug === slug);
        const newCompany = newCompanies.find((c) => c.slug === slug);
        if (!oldCompany || !newCompany) {
            throw new Error(`Missing company mapping for slug: ${slug}`);
        }

        for (const season of TARGET_SEASONS) {
            const oldRows = await fetchStaffRows(oldClient, oldCompany.id, season);
            const newRows = await fetchStaffRows(newClient, newCompany.id, season);

            const newCanonSet = new Set(newRows.map((r) => canonicalName(r.name)));
            const oldCanonSet = new Set(oldRows.map((r) => canonicalName(r.name)));
            const newPersonIdSet = new Set(
                newRows.map((r) => r.person_id).filter((id) => id !== null && id !== undefined && id !== '')
            );

            const toInsert = oldRows.filter((row) => {
                const missingByCanon = !newCanonSet.has(canonicalName(row.name));
                const pid = row.person_id;
                const conflictsOnPerson =
                    pid !== null && pid !== undefined && pid !== '' && newPersonIdSet.has(pid);
                return missingByCanon && !conflictsOnPerson;
            });
            const toDelete = PRUNE_EXTRAS
                ? newRows.filter((row) => !oldCanonSet.has(canonicalName(row.name)))
                : [];

            let inserted = 0;
            for (const batch of chunks(toInsert, BATCH_SIZE)) {
                const prepared = batch.map((row) => ({
                    ...row,
                    company_id: newCompany.id,
                }));
                const { error } = await newClient.from('staff').insert(prepared);
                if (error) throw error;
                inserted += prepared.length;
            }

            let deleted = 0;
            for (const batch of chunks(toDelete, BATCH_SIZE)) {
                const ids = batch.map((row) => row.id).filter(Boolean);
                if (!ids.length) continue;
                const { error } = await newClient.from('staff').delete().in('id', ids);
                if (error) throw error;
                deleted += ids.length;
            }

            totalInserted += inserted;
            totalDeleted += deleted;
            summary.push({
                slug,
                season,
                oldCount: oldRows.length,
                newCountBefore: newRows.length,
                inserted,
                deleted,
                expectedAfter: newRows.length + inserted - deleted,
            });
        }
    }

    console.log('Migration complete.');
    console.log('Inserted:', totalInserted);
    console.log('Deleted extras:', totalDeleted);
    for (const row of summary) {
        console.log(
            `${row.slug} ${row.season} old=${row.oldCount} newBefore=${row.newCountBefore} +${row.inserted} -${row.deleted} => ${row.expectedAfter}`
        );
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
