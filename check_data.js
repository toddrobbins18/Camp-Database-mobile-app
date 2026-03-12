const { createClient } = require('@supabase/supabase-js');
const url = 'https://qjbkvnzeejbqxbcbskdu.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYmt2bnplZWpicXhiY2Jza2R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzAzMjcsImV4cCI6MjA4ODU0NjMyN30.6SdzLftFAn_HgTQrlmSbqEIk_gZCBZJnZsMmo1yz48U';

const supabase = createClient(url, key);

async function checkData() {
    console.log("Checking data in new Supabase instance...");
    const tables = ['companies', 'profiles', 'children', 'bunks', 'user_roles', 'sports_calendar'];
    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`Table ${table} error:`, error.message);
        } else {
            console.log(`Table ${table}: ${count} rows`);
        }
    }
}

checkData();
