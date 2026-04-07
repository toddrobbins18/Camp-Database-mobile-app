-- Normalize legacy display labels in recipient_tags to backend keys.
-- This keeps mobile and web automation workflows aligned.

WITH normalized AS (
  SELECT
    id,
    ARRAY(
      SELECT DISTINCT mapped_tag
      FROM (
        SELECT
          CASE lower(trim(tag_value))
            WHEN 'nurse' THEN 'nurse'
            WHEN 'transportation' THEN 'transportation'
            WHEN 'food service' THEN 'food_service'
            WHEN 'food_service' THEN 'food_service'
            WHEN 'specialist' THEN 'specialist'
            WHEN 'division leader' THEN 'division_leader'
            WHEN 'division_leader' THEN 'division_leader'
            WHEN 'director' THEN 'director'
            WHEN 'general staff' THEN 'general_staff'
            WHEN 'general_staff' THEN 'general_staff'
            WHEN 'admin staff' THEN 'admin_staff'
            WHEN 'admin_staff' THEN 'admin_staff'
            WHEN 'head of girls side' THEN 'head_of_girls_side'
            WHEN 'head_of_girls_side' THEN 'head_of_girls_side'
            WHEN 'head of boys side' THEN 'head_of_boys_side'
            WHEN 'head_of_boys_side' THEN 'head_of_boys_side'
            ELSE NULL
          END AS mapped_tag
        FROM unnest(COALESCE(recipient_tags, '{}'::text[])) AS tag_value
      ) mapped
      WHERE mapped_tag IS NOT NULL
    ) AS normalized_tags
  FROM public.automated_email_config
)
UPDATE public.automated_email_config cfg
SET recipient_tags = normalized.normalized_tags
FROM normalized
WHERE cfg.id = normalized.id;

-- Keep send_timing consistent with web defaults where null.
UPDATE public.automated_email_config
SET send_timing = ARRAY['on_create']::text[]
WHERE send_timing IS NULL;
