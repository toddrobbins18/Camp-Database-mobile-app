-- Add missing company_id columns before making them NOT NULL
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE division_permissions ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE automated_email_config ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE user_tags ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Update existing rows to have the default company_id so we can make them NOT NULL safely
UPDATE divisions SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE role_permissions SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE user_roles SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE division_permissions SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE automated_email_config SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE user_tags SET company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;

-- Make company_id NOT NULL in all multi-tenancy tables
ALTER TABLE divisions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE role_permissions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE user_roles ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE division_permissions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE automated_email_config ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE user_tags ALTER COLUMN company_id SET NOT NULL;