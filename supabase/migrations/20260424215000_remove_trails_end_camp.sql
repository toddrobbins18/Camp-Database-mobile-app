-- Remove Trails End Camp from centralized Supabase.
-- This removes all rows in tables that carry a `company_id` column for this company,
-- then deletes the company record itself.
do $$
declare
  trails_end_company_id uuid;
  tyler_hill_company_id uuid;
  table_name text;
begin
  select id into trails_end_company_id
  from public.companies
  where slug = 'trails-end-camp'
  limit 1;

  if trails_end_company_id is null then
    raise notice 'Trails End Camp not found, skipping.';
    return;
  end if;

  select id into tyler_hill_company_id
  from public.companies
  where slug = 'tyler-hill-camp'
  limit 1;

  -- If any profile is still pointed at Trails End, move it to Tyler Hill first.
  if tyler_hill_company_id is not null then
    update public.profiles
    set company_id = tyler_hill_company_id
    where company_id = trails_end_company_id;
  end if;

  -- Delete company-scoped rows from all public tables that have `company_id`.
  for table_name in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema
     and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'company_id'
      and t.table_type = 'BASE TABLE'
      and c.table_name <> 'companies'
  loop
    execute format(
      'delete from public.%I where company_id = %L',
      table_name,
      trails_end_company_id
    );
  end loop;

  delete from public.companies
  where id = trails_end_company_id;
end $$;
