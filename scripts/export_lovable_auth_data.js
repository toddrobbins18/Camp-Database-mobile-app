const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const out = {};
  for (const line of lines) {
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

function getConfig() {
  const localEnv = parseDotEnv(path.resolve(process.cwd(), '.env'));

  const url =
    process.env.LOVABLE_SUPABASE_URL ||
    localEnv.LOVABLE_SUPABASE_URL ||
    localEnv.SUPABASE_URL ||
    localEnv.VITE_SUPABASE_URL;

  const serviceKey =
    process.env.LOVABLE_SUPABASE_SERVICE_ROLE_KEY ||
    localEnv.LOVABLE_SUPABASE_SERVICE_ROLE_KEY ||
    localEnv.SUPABASE_SERVICE_ROLE_KEY;

  const companyId =
    process.env.LOVABLE_COMPANY_ID ||
    localEnv.LOVABLE_COMPANY_ID ||
    null;

  const companySlug =
    process.env.LOVABLE_COMPANY_SLUG ||
    localEnv.LOVABLE_COMPANY_SLUG ||
    null;

  if (!url) {
    throw new Error(
      'Missing LOVABLE_SUPABASE_URL (or SUPABASE_URL / VITE_SUPABASE_URL in .env).'
    );
  }
  if (!serviceKey) {
    throw new Error(
      'Missing LOVABLE_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY in .env).'
    );
  }

  return { url, serviceKey, companyId, companySlug };
}

async function listAllAuthUsers(adminClient) {
  const perPage = 1000;
  let page = 1;
  const users = [];

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;

    const chunk = data?.users || [];
    users.push(...chunk);
    if (chunk.length < perPage) break;
    page += 1;
  }

  return users;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fetchByUserIds(client, table, columns, userIds) {
  if (userIds.length === 0) return [];
  const chunks = chunkArray(userIds, 500);
  const allRows = [];

  for (const ids of chunks) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .in('user_id', ids);
    if (error) throw error;
    allRows.push(...(data || []));
  }

  return allRows;
}

async function resolveCompanyId(client, explicitCompanyId, companySlug) {
  if (explicitCompanyId) return explicitCompanyId;
  if (!companySlug) return null;

  const { data, error } = await client
    .from('companies')
    .select('id')
    .eq('slug', companySlug)
    .maybeSingle();

  if (error) throw error;
  return data?.id || null;
}

async function main() {
  const { url, serviceKey, companyId, companySlug } = getConfig();

  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const effectiveCompanyId = await resolveCompanyId(client, companyId, companySlug);

  console.log('Export source:', url);
  console.log(
    'Filter:',
    effectiveCompanyId
      ? `company_id=${effectiveCompanyId}`
      : 'all companies (no company filter)'
  );

  // Profiles
  let profilesQuery = client
    .from('profiles')
    .select('id, email, full_name, company_id, approved, created_at, updated_at');
  if (effectiveCompanyId) {
    profilesQuery = profilesQuery.eq('company_id', effectiveCompanyId);
  }
  const { data: profiles, error: profilesErr } = await profilesQuery;
  if (profilesErr) throw profilesErr;

  const profileRows = profiles || [];
  const profileIds = profileRows.map((p) => p.id);

  // Auth users from GoTrue Admin API (service role only)
  const allAuthUsers = await listAllAuthUsers(client);
  const authUsers = effectiveCompanyId
    ? allAuthUsers.filter((u) => profileIds.includes(u.id))
    : allAuthUsers;

  // Role/permission tables linked by user_id
  const userRoles = await fetchByUserIds(
    client,
    'user_roles',
    'id, user_id, company_id, role, created_at',
    profileIds
  );
  const divisionPermissions = await fetchByUserIds(
    client,
    'division_permissions',
    'id, user_id, division_id, can_access',
    profileIds
  );
  const userTags = await fetchByUserIds(
    client,
    'user_tags',
    'id, user_id, company_id, tag, created_at, created_by',
    profileIds
  );

  // role_permissions is company-scoped, not user-scoped
  let rolePermissionsQuery = client
    .from('role_permissions')
    .select('id, company_id, role, menu_item, can_access');
  if (effectiveCompanyId) {
    rolePermissionsQuery = rolePermissionsQuery.eq('company_id', effectiveCompanyId);
  }
  const { data: rolePermissions, error: rpErr } = await rolePermissionsQuery;
  if (rpErr) throw rpErr;

  const exportPayload = {
    exported_at: new Date().toISOString(),
    source: {
      supabase_url: url,
      company_id: effectiveCompanyId,
      company_slug: companySlug,
    },
    counts: {
      auth_users: authUsers.length,
      profiles: profileRows.length,
      user_roles: userRoles.length,
      division_permissions: divisionPermissions.length,
      user_tags: userTags.length,
      role_permissions: (rolePermissions || []).length,
    },
    auth_users: authUsers,
    profiles: profileRows,
    user_roles: userRoles,
    division_permissions: divisionPermissions,
    user_tags: userTags,
    role_permissions: rolePermissions || [],
  };

  const outDir = path.resolve(process.cwd(), 'exports');
  fs.mkdirSync(outDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `lovable-auth-export-${timestamp}.json`;
  const outPath = path.join(outDir, fileName);

  fs.writeFileSync(outPath, JSON.stringify(exportPayload, null, 2), 'utf8');

  console.log('\nExport completed.');
  console.log('Output:', outPath);
  console.log('Counts:', exportPayload.counts);
}

main().catch((err) => {
  console.error('Export failed:', err?.message || err);
  process.exit(1);
});

