-- Keep camp theme colors aligned with web/mobile branding.
-- Web reads `companies.theme_color` directly; mobile now does the same for drawer branding.
update public.companies
set theme_color = case slug
  when 'tyler-hill-camp' then '#1d4ed8'   -- blue
  when 'timber-lake-west' then '#7f1d1d'  -- maroon
  when 'timber-lake-camp' then '#000000'  -- black
  else theme_color
end
where slug in ('tyler-hill-camp', 'timber-lake-west', 'timber-lake-camp');
