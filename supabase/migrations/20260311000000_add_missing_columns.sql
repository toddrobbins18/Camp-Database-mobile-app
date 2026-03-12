-- Add missing columns to match Lovable schema

-- Children table
ALTER TABLE children ADD COLUMN IF NOT EXISTS guardian_name_p2 text;
ALTER TABLE children ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE children ADD COLUMN IF NOT EXISTS tshirt_size text;

-- Staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES divisions(id);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS tshirt_size text;

-- Special events activities table
ALTER TABLE special_events_activities ADD COLUMN IF NOT EXISTS chaperone text;
ALTER TABLE special_events_activities ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE special_events_activities ADD COLUMN IF NOT EXISTS file_url text;

-- Automated email config table
ALTER TABLE automated_email_config ADD COLUMN IF NOT EXISTS specific_recipient_id uuid;

-- Messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_id uuid;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS parent_message_id uuid;
