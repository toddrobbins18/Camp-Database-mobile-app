const { Client } = require('pg');

// Supabase pooler connection (discovered from supabase link --debug)
const connectionString = `postgresql://postgres.qjbkvnzeejbqxbcbskdu:${process.env.DB_PASSWORD}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres`;

const ALTER_STATEMENTS = `
ALTER TABLE children ADD COLUMN IF NOT EXISTS guardian_name_p2 text;
ALTER TABLE children ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE children ADD COLUMN IF NOT EXISTS tshirt_size text;

ALTER TABLE staff ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES divisions(id);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS tshirt_size text;

ALTER TABLE special_events_activities ADD COLUMN IF NOT EXISTS chaperone text;
ALTER TABLE special_events_activities ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE special_events_activities ADD COLUMN IF NOT EXISTS file_url text;

ALTER TABLE automated_email_config ADD COLUMN IF NOT EXISTS specific_recipient_id uuid;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_id uuid;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS parent_message_id uuid;
`;

async function main() {
    if (!process.env.DB_PASSWORD) {
        console.error('Set DB_PASSWORD environment variable (your Supabase database password)');
        process.exit(1);
    }

    console.log('Connecting to Supabase PostgreSQL...');
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        console.log('Connected!\n');

        const statements = ALTER_STATEMENTS.split(';').map(s => s.trim()).filter(s => s.length > 0);

        for (const stmt of statements) {
            const colMatch = stmt.match(/ADD COLUMN IF NOT EXISTS (\w+)/);
            const tblMatch = stmt.match(/ALTER TABLE (\w+)/);
            try {
                await client.query(stmt);
                console.log(`✅ ${tblMatch?.[1]}.${colMatch?.[1]}`);
            } catch (err) {
                console.log(`❌ ${tblMatch?.[1]}.${colMatch?.[1]}: ${err.message}`);
            }
        }

        console.log('\nDone! Verifying columns...');
        // Verify children columns
        const { rows: childCols } = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'children' AND table_schema = 'public'
            ORDER BY ordinal_position;
        `);
        console.log('\nchildren columns:', childCols.map(r => r.column_name).join(', '));

        const { rows: staffCols } = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'staff' AND table_schema = 'public'
            ORDER BY ordinal_position;
        `);
        console.log('staff columns:', staffCols.map(r => r.column_name).join(', '));

    } catch (err) {
        console.error('Connection error:', err.message);
    } finally {
        await client.end();
    }
}

main();
