const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function chunk(items, size) {
  const res = [];
  for (let i = 0; i < items.length; i += size) res.push(items.slice(i, i + size));
  return res;
}

async function main() {
  const localEnv = parseDotEnv(path.resolve(process.cwd(), '.env'));

  const targetUrl =
    process.env.TARGET_SUPABASE_URL ||
    localEnv.TARGET_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    localEnv.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    localEnv.VITE_SUPABASE_URL;

  const targetServiceKey =
    process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY ||
    localEnv.TARGET_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.TARGET_SERVICE_KEY ||
    localEnv.TARGET_SERVICE_KEY;

  const exportPath =
    process.env.LOVABLE_EXPORT_PATH ||
    localEnv.LOVABLE_EXPORT_PATH;

  const companySlug =
    process.env.LOVABLE_COMPANY_SLUG ||
    localEnv.LOVABLE_COMPANY_SLUG ||
    'tyler-hill-camp';

  if (!targetUrl) throw new Error('Missing TARGET_SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL).');
  if (!targetServiceKey) throw new Error('Missing TARGET_SUPABASE_SERVICE_ROLE_KEY.');
  if (!exportPath) throw new Error('Missing LOVABLE_EXPORT_PATH (path to lovable-auth-export-*.json).');

  const file = path.resolve(process.cwd(), exportPath);
  if (!fs.existsSync(file)) throw new Error(`Export file not found: ${file}`);

  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = (payload.profiles || []).map((p) => {
    const roleRow = (payload.user_roles || []).find((r) => r.user_id === p.id);
    const tags = (payload.user_tags || [])
      .filter((t) => t.user_id === p.id)
      .map((t) => String(t.tag));

    return {
      source_user_id: p.id || null,
      email: p.email,
      full_name: p.full_name || null,
      approved: typeof p.approved === 'boolean' ? p.approved : null,
      role_text: roleRow?.role || 'staff',
      company_slug: companySlug,
      tags,
    };
  }).filter((r) => !!r.email);

  const client = createClient(targetUrl, targetServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Loading ${rows.length} rows into lovable_user_sync_snapshot...`);

  // Replace prior snapshot for same company slug.
  const { error: delErr } = await client
    .from('lovable_user_sync_snapshot')
    .delete()
    .eq('company_slug', companySlug);
  if (delErr) throw delErr;

  for (const batch of chunk(rows, 300)) {
    const { error } = await client
      .from('lovable_user_sync_snapshot')
      .insert(batch);
    if (error) throw error;
  }

  console.log('Applying sync function...');
  const { data: syncResult, error: syncErr } = await client.rpc('apply_lovable_user_sync', {
    p_company_slug: companySlug,
    p_replace_company_roles: true,
  });
  if (syncErr) throw syncErr;

  console.log('Sync done:');
  console.log(JSON.stringify(syncResult, null, 2));
}

main().catch((err) => {
  console.error('Import failed:', err?.message || err);
  process.exit(1);
});

