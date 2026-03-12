require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = 'https://qjbkvnzeejbqxbcbskdu.supabase.co';
const key = process.env.NEW_SERVICE_KEY;

if (!key) {
    console.error("Set NEW_SERVICE_KEY env var");
    process.exit(1);
}

const supabase = createClient(url, key);

async function inspectData() {
    console.log("Checking companies...");
    const { data: companies, error: cErr } = await supabase.from('companies').select('*');
    if (cErr) console.error(cErr);
    else console.log(companies.length, "companies:", companies.map(c => ({ id: c.id, slug: c.slug })));

    console.log("Checking profiles...");
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
    if (pErr) console.error(pErr);
    else console.log(profiles.length, "profiles:", profiles.map(p => ({ id: p.id, email: p.email })));
}

inspectData();
