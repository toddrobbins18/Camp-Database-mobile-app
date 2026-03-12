const { createClient } = require('@supabase/supabase-js');

const OLD_SUPABASE_URL = 'https://gdcxtefbarvnrtvacqln.supabase.co';
const OLD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkY3h0ZWZiYXJ2bnJ0dmFjcWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNTA3NDIsImV4cCI6MjA3NTYyNjc0Mn0.8KkemWYnHix_jtcT_ZSx0EdsACsBnyID76-xZgZSKhA';
const NEW_SUPABASE_URL = 'https://qjbkvnzeejbqxbcbskdu.supabase.co';
const NEW_SERVICE_KEY = process.env.NEW_SERVICE_KEY;

const oldClient = createClient(OLD_SUPABASE_URL, OLD_ANON_KEY, { auth: { persistSession: false } });
const newClient = createClient(NEW_SUPABASE_URL, NEW_SERVICE_KEY, { auth: { persistSession: false } });

async function fixRemaining() {
    // Login to old
    await oldClient.auth.signInWithPassword({ email: 'Todd@camptlc.com', password: 'Yankees1!' });

    // Check children IDs
    const { data: oldChildren } = await oldClient.from('children').select('id').limit(5);
    const { data: newChildren } = await newClient.from('children').select('id').limit(5);
    console.log('Old children IDs:', oldChildren?.map(c => c.id));
    console.log('New children IDs:', newChildren?.map(c => c.id));

    // Check if the child referenced in medication_logs exists
    const { data: medLogs } = await oldClient.from('medication_logs').select('child_id').limit(5);
    console.log('Medication log child_ids:', medLogs?.map(m => m.child_id));

    if (medLogs && medLogs.length > 0) {
        const testId = medLogs[0].child_id;
        const { data: found } = await newClient.from('children').select('id').eq('id', testId).limit(1);
        console.log(`Child ${testId} exists in new DB:`, found?.length > 0);
    }

    // Check awards child_ids
    const { data: awards } = await oldClient.from('awards').select('child_id').limit(5);
    console.log('Award child_ids:', awards?.map(a => a.child_id));

    if (awards && awards.length > 0) {
        const testId = awards[0].child_id;
        const { data: found } = await newClient.from('children').select('id').eq('id', testId).limit(1);
        console.log(`Child ${testId} exists in new DB:`, found?.length > 0);
    }

    // Total children count
    const { count: newCount } = await newClient.from('children').select('*', { count: 'exact', head: true });
    console.log('Total children in new DB:', newCount);
}

fixRemaining().catch(console.error);
