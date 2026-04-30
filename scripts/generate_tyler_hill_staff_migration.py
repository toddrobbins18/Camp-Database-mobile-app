#!/usr/bin/env python3
"""Generate INSERT + UPDATE SQL for Tyler Hill staff from Lovable CSV export."""
import csv
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parent.parent / "query-results-export-2026-04-29_12-28-28.csv"
OUT_PATH = Path(__file__).resolve().parent.parent / "supabase/migrations/manual_tyler_hill_staff_from_lovable.sql"

TYLER_HILL = "0d0b7f4f-327e-4497-83ff-3aa501ffc295"

CSV_COLS = [
    "allergies",
    "company_id",
    "created_at",
    "date_of_birth",
    "department",
    "division_id",
    "division_name",
    "email",
    "gender",
    "hire_date",
    "id",
    "leader_id",
    "name",
    "person_id",
    "phone",
    "photo_url",
    "rfid",
    "role",
    "season",
    "session",
    "sort_order",
    "specialty_sports",
    "staff_type",
    "status",
    "tshirt_size",
    "updated_at",
]


def lit(val):
    if val is None:
        return "NULL"
    s = str(val).strip()
    if s == "":
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def main():
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8"), delimiter=";"))
    statuses = {}
    for r in rows:
        k = (r.get("status") or "").strip().lower() or "(empty)"
        statuses[k] = statuses.get(k, 0) + 1

    spec_case = """CASE
          WHEN trim(COALESCE(s.specialty_sports, '')) IN ('', '[]') THEN '{}'::text[]
          ELSE ARRAY(SELECT jsonb_array_elements_text(trim(s.specialty_sports)::jsonb))
        END"""

    status_case = """COALESCE(NULLIF(trim(s.status), ''), 'active')"""

    leader_case = """CASE
          WHEN trim(COALESCE(s.leader_id, '')) ~ '^[0-9a-fA-F-]{36}$' THEN trim(s.leader_id)::uuid
          ELSE NULL
        END"""

    blocks = []

    blocks.append("-- Tyler Hill Camp staff — sync from Lovable CSV export")
    blocks.append(f"-- Source: {CSV_PATH.name}")
    blocks.append(f"-- Rows: {len(rows)} | Status breakdown in export: {statuses}")
    blocks.append("-- INSERT missing rows | UPDATE existing rows matched by (company_id, person_id)")
    blocks.append("-- Division from division_name → divisions.id; status preserved (active, hired, …)")
    blocks.append("")
    blocks.append("BEGIN;")
    blocks.append("")
    blocks.append("-- 1) Insert rows not yet present")
    blocks.append("INSERT INTO public.staff (")
    blocks.append("  id,")
    blocks.append("  allergies,")
    blocks.append("  company_id,")
    blocks.append("  created_at,")
    blocks.append("  date_of_birth,")
    blocks.append("  department,")
    blocks.append("  division_id,")
    blocks.append("  email,")
    blocks.append("  gender,")
    blocks.append("  hire_date,")
    blocks.append("  leader_id,")
    blocks.append("  name,")
    blocks.append("  person_id,")
    blocks.append("  phone,")
    blocks.append("  photo_url,")
    blocks.append("  rfid,")
    blocks.append("  role,")
    blocks.append("  season,")
    blocks.append("  session,")
    blocks.append("  sort_order,")
    blocks.append("  specialty_sports,")
    blocks.append("  staff_type,")
    blocks.append("  status,")
    blocks.append("  tshirt_size,")
    blocks.append("  updated_at")
    blocks.append(")")
    blocks.append("SELECT")
    blocks.append("  gen_random_uuid(),")
    blocks.append("  NULLIF(trim(s.allergies), ''),")
    blocks.append(f"  '{TYLER_HILL}'::uuid,")
    blocks.append("  COALESCE(NULLIF(trim(s.created_at), '')::timestamptz, now()),")
    blocks.append("  NULLIF(trim(s.date_of_birth), '')::date,")
    blocks.append("  NULLIF(trim(s.department), ''),")
    blocks.append("  d.id,")
    blocks.append("  NULLIF(trim(s.email), ''),")
    blocks.append("  NULLIF(trim(s.gender), ''),")
    blocks.append("  NULLIF(trim(s.hire_date), '')::date,")
    blocks.append(f"  {leader_case},")
    blocks.append("  trim(s.name),")
    blocks.append("  trim(s.person_id),")
    blocks.append("  NULLIF(trim(s.phone), ''),")
    blocks.append("  NULLIF(trim(s.photo_url), ''),")
    blocks.append("  NULLIF(trim(s.rfid), ''),")
    blocks.append("  trim(s.role),")
    blocks.append("  NULLIF(trim(s.season), ''),")
    blocks.append("  NULLIF(trim(s.session), ''),")
    blocks.append("  NULLIF(trim(s.sort_order), '')::integer,")
    blocks.append(f"  {spec_case},")
    blocks.append("  NULLIF(trim(s.staff_type), ''),")
    blocks.append(f"  {status_case},")
    blocks.append("  NULLIF(trim(s.tshirt_size), ''),")
    blocks.append("  COALESCE(NULLIF(trim(s.updated_at), '')::timestamptz, now())")
    blocks.append("FROM (")
    blocks.append("  VALUES")

    for i, row in enumerate(rows):
        vals = [lit(row.get(c)) for c in CSV_COLS]
        suf = "," if i < len(rows) - 1 else ""
        blocks.append("    (" + ", ".join(vals) + ")" + suf)

    alias_cols = ",\n  ".join(CSV_COLS)
    blocks.append(f") AS s (\n  {alias_cols}\n)")
    blocks.append("LEFT JOIN public.divisions d")
    blocks.append(f"  ON d.company_id = '{TYLER_HILL}'::uuid")
    blocks.append(" AND trim(d.name) = trim(s.division_name)")
    blocks.append("WHERE NOT EXISTS (")
    blocks.append("  SELECT 1 FROM public.staff c")
    blocks.append(f"  WHERE c.company_id = '{TYLER_HILL}'::uuid")
    blocks.append("    AND trim(c.person_id) = trim(s.person_id)")
    blocks.append(");")
    blocks.append("")
    blocks.append("-- 2) Update existing rows to match Lovable (same VALUES source)")
    blocks.append("UPDATE public.staff AS st")
    blocks.append("SET")
    blocks.append("  allergies = NULLIF(trim(s.allergies), ''),")
    blocks.append("  date_of_birth = NULLIF(trim(s.date_of_birth), '')::date,")
    blocks.append("  department = NULLIF(trim(s.department), ''),")
    blocks.append("  division_id = d.id,")
    blocks.append("  email = NULLIF(trim(s.email), ''),")
    blocks.append("  gender = NULLIF(trim(s.gender), ''),")
    blocks.append("  hire_date = NULLIF(trim(s.hire_date), '')::date,")
    blocks.append(
        "  leader_id = CASE WHEN trim(COALESCE(s.leader_id, '')) ~ '^[0-9a-fA-F-]{36}$' "
        "THEN trim(s.leader_id)::uuid ELSE NULL END,"
    )
    blocks.append("  name = trim(s.name),")
    blocks.append("  phone = NULLIF(trim(s.phone), ''),")
    blocks.append("  photo_url = NULLIF(trim(s.photo_url), ''),")
    blocks.append("  rfid = NULLIF(trim(s.rfid), ''),")
    blocks.append("  role = trim(s.role),")
    blocks.append("  season = NULLIF(trim(s.season), ''),")
    blocks.append("  session = NULLIF(trim(s.session), ''),")
    blocks.append("  sort_order = NULLIF(trim(s.sort_order), '')::integer,")
    blocks.append(f"  specialty_sports = {spec_case},")
    blocks.append(f"  staff_type = NULLIF(trim(s.staff_type), ''),")
    blocks.append(f"  status = {status_case},")
    blocks.append(f"  tshirt_size = NULLIF(trim(s.tshirt_size), ''),")
    blocks.append("  updated_at = COALESCE(NULLIF(trim(s.updated_at), '')::timestamptz, now())")
    blocks.append("FROM (")
    blocks.append("  VALUES")

    for i, row in enumerate(rows):
        vals = [lit(row.get(c)) for c in CSV_COLS]
        suf = "," if i < len(rows) - 1 else ""
        blocks.append("    (" + ", ".join(vals) + ")" + suf)

    blocks.append(f") AS s (\n  {alias_cols}\n)")
    blocks.append("LEFT JOIN public.divisions d")
    blocks.append(f"  ON d.company_id = '{TYLER_HILL}'::uuid")
    blocks.append(" AND trim(d.name) = trim(s.division_name)")
    blocks.append(f"WHERE st.company_id = '{TYLER_HILL}'::uuid")
    blocks.append("  AND trim(st.person_id) = trim(s.person_id);")
    blocks.append("")
    blocks.append("COMMIT;")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text("\n".join(blocks), encoding="utf-8")
    print(f"Wrote {OUT_PATH} ({OUT_PATH.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
