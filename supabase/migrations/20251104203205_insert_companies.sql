-- Create the specific companies with the exact UUIDs that later scripts depend on
INSERT INTO public.companies (id, name, slug, theme_color, is_active)
VALUES 
  ('1d296ccf-31e1-4176-af57-50a4a4820f82', 'Timber Lake Camp', 'timber-lake-camp', '#1d4ed8', true),
  ('9cbae52b-cdf8-4fab-88f5-fb949f0bde2a', 'Timber Lake West', 'timber-lake-west', '#047857', true),
  ('0d0b7f4f-327e-4497-83ff-3aa501ffc295', 'Tyler Hill Camp', 'tyler-hill-camp', '#b91c1c', true)
ON CONFLICT (slug) DO UPDATE SET id = EXCLUDED.id;
