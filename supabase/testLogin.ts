import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qjbkvnzeejbqxbcbskdu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYmt2bnplZWpicXhiY2Jza2R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzAzMjcsImV4cCI6MjA4ODU0NjMyN30.6SdzLftFAn_HgTQrlmSbqEIk_gZCBZJnZsMmo1yz48U';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
});

async function testLogin() {
    console.log("Testing login...");
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'Todd@camptlc.com',
        password: 'Yankees1!',
    });

    if (error) {
        console.error("Login failed:", error.message);
    } else {
        console.log("Login successful! User ID:", data.user?.id);
    }
}

testLogin();
