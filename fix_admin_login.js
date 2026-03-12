const { createClient } = require('@supabase/supabase-js');

const url = 'https://qjbkvnzeejbqxbcbskdu.supabase.co';
const key = process.env.NEW_SERVICE_KEY;
const supabase = createClient(url, key);

async function checkAndFixAdmin() {
    console.log('=== CHECKING SUPER ADMIN STATE ===\n');

    // 1. Find Todd in auth.users
    const { data: authData } = await supabase.auth.admin.listUsers();
    const todd = (authData?.users || []).find(u => u.email?.toLowerCase() === 'todd@camptlc.com');

    if (!todd) {
        console.log('Todd NOT found in auth.users! Creating...');
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
            email: 'Todd@camptlc.com',
            password: 'Yankees1!',
            email_confirm: true,
        });
        if (createErr) {
            console.error('Create error:', createErr.message);
            // Try updating instead
            const { data: listData } = await supabase.auth.admin.listUsers();
            const existingTodd = (listData?.users || []).find(u => u.email?.toLowerCase() === 'todd@camptlc.com');
            if (existingTodd) {
                console.log('Found Todd after all, ID:', existingTodd.id);
                await fixProfile(existingTodd.id);
            }
            return;
        }
        console.log('Created Todd, ID:', newUser.user.id);
        await fixProfile(newUser.user.id);
    } else {
        console.log('Todd found in auth.users:', todd.id);
        console.log('  email_confirmed:', !!todd.email_confirmed_at);

        // Reset password just in case
        const { error: updateErr } = await supabase.auth.admin.updateUserById(todd.id, {
            password: 'Yankees1!',
            email_confirm: true,
        });
        if (updateErr) console.log('  Password update error:', updateErr.message);
        else console.log('  Password reset to Yankees1!');

        await fixProfile(todd.id);
    }

    // 3. Test login
    console.log('\n--- Testing login ---');
    const testClient = createClient(url, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYmt2bnplZWpicXhiY2Jza2R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzAzMjcsImV4cCI6MjA4ODU0NjMyN30.6SdzLftFAn_HgTQrlmSbqEIk_gZCBZJnZsMmo1yz48U');
    const { data: loginData, error: loginErr } = await testClient.auth.signInWithPassword({
        email: 'Todd@camptlc.com',
        password: 'Yankees1!',
    });
    if (loginErr) {
        console.log('LOGIN FAILED:', loginErr.message);
    } else {
        console.log('LOGIN SUCCESS! User ID:', loginData.user.id);

        // Check profile fetch
        const { data: profile, error: profErr } = await testClient.from('profiles').select('*').eq('id', loginData.user.id).single();
        if (profErr) console.log('Profile fetch error:', profErr.message);
        else console.log('Profile:', JSON.stringify(profile, null, 2));
    }
}

async function fixProfile(userId) {
    // Get first company
    const { data: companies } = await supabase.from('companies').select('id, name');
    console.log('\nCompanies available:', companies?.map(c => `${c.name} (${c.id})`));

    const companyId = companies?.[0]?.id;
    if (!companyId) {
        console.error('No companies found!');
        return;
    }

    // Upsert profile
    const { error: profErr } = await supabase.from('profiles').upsert({
        id: userId,
        email: 'Todd@camptlc.com',
        name: 'Todd',
        approved: true,
        company_id: companyId,
    }, { onConflict: 'id' });

    if (profErr) console.log('  Profile upsert error:', profErr.message);
    else console.log(`  Profile set: approved=true, company_id=${companyId}`);

    // Check existing user_roles
    const { data: existingRoles } = await supabase.from('user_roles').select('*').eq('user_id', userId);
    console.log('  Existing roles:', existingRoles);

    // Insert super_admin role if not exists
    if (!existingRoles || existingRoles.length === 0 || !existingRoles.find(r => r.role === 'super_admin')) {
        const { error: roleErr } = await supabase.from('user_roles').insert({
            user_id: userId,
            role: 'super_admin',
            company_id: companyId,
        });
        if (roleErr) console.log('  Role insert error:', roleErr.message);
        else console.log('  super_admin role assigned');
    } else {
        console.log('  super_admin role already exists');
    }
}

checkAndFixAdmin().catch(console.error);
