import { createClient } from '@supabase/supabase-js';

const NEW_SUPABASE_URL = 'https://qjbkvnzeejbqxbcbskdu.supabase.co';
const NEW_SERVICE_KEY = process.env.NEW_SERVICE_KEY;

if (!NEW_SERVICE_KEY) {
    console.error("Missing NEW_SERVICE_KEY. Run with: NEW_SERVICE_KEY='...' npx tsx supabase/setupAdmin.ts");
    process.exit(1);
}

const supabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    const email = 'Todd@camptlc.com';
    const password = 'Yankees1!';

    console.log(`Setting up super admin user: ${email}`);

    // 1. Find the user first
    const { data: listUsersResponse, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('Could not list users:', listError);
        return;
    }

    let userId: string;
    const existingUser = listUsersResponse.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (existingUser) {
        console.log(`User already exists in auth.users. Updating password for ID: ${existingUser.id}`);
        userId = existingUser.id;

        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
            password: password,
            email_confirm: true
        });

        if (updateError) {
            console.error('Error updating existing user password:', updateError);
            return;
        }
        console.log('Password updated successfully.');
    } else {
        console.log('User does not exist, creating...');
        const { data: userResponse, error: createUserError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
        });

        if (createUserError || !userResponse?.user) {
            console.error('Error creating user:', createUserError);
            return;
        }
        console.log('User created successfully.');
        userId = userResponse.user.id;
    }

    console.log(`User ID: ${userId}`);

    // 3. Fetch companies first so we can use one for the profile
    console.log('Fetching companies...');
    const { data: companies, error: companiesError } = await supabase.from('companies').select('id, name');

    if (companiesError || !companies || companies.length === 0) {
        console.error('Error fetching companies or no companies exist:', companiesError);
        return;
    }

    // 4. Update public.profiles
    console.log('Updating profile...');
    const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: 'Todd Robbins',
        email: email,
        approved: true, // Ensure Admin is fully approved upon setup
        company_id: companies[0].id // Must have a company_id to bypass login block
    });

    if (profileError) {
        console.error('Error updating profile:', profileError);
    } else {
        console.log('Profile updated.');
    }

    // 5. Update user_roles for every company
    console.log('Setting roles to super_admin for all companies...');
    for (const company of companies) {
        console.log(`  Assigning super_admin for company: ${company.name}`);

        // Using basic insert since we lack unique constraints, and ignore duplicates
        const { error: roleError } = await supabase.from('user_roles').insert([
            {
                user_id: userId,
                company_id: company.id,
                role: 'super_admin'
            }
        ]);

        if (roleError) {
            if (roleError.code === '23505') { // Postgres duplicate key error
                console.log(`    Role already exists for ${company.name}`);
            } else {
                console.error(`    Failed to assign role for ${company.name}:`, roleError);
            }
        } else {
            console.log(`    Success for ${company.name}`);
        }
    }

    console.log('Admin user setup complete!');
}

main().catch(console.error);
