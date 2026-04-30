"""Emit DELETE SQL: trim Tyler Hill staff to person_ids present in Lovable CSV."""
import csv
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parent.parent / "query-results-export-2026-04-29_12-28-28.csv"
OUT_PATH = Path(__file__).resolve().parent.parent / "supabase/migrations/manual_tyler_hill_staff_delete_not_in_lovable_csv.sql"
TYLER = "0d0b7f4f-327e-4497-83ff-3aa501ffc295"


def esc(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def main() -> None:
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8"), delimiter=";"))
    ids = sorted({(r.get("person_id") or "").strip() for r in rows if (r.get("person_id") or "").strip()})
    assert len(ids) == 353, f"expected 353 unique person_id, got {len(ids)}"

    lines = [
        "-- Trim Tyler Hill 2026 staff to match Lovable CSV only (353 CampMinder person_ids).",
        f"-- Whitelist from: {CSV_PATH.name}",
        "-- Deletes rows where person_id is NOT in that export (e.g. 358 -> 353).",
        "-- Backup first. If DELETE fails, child tables may reference staff.id — resolve FKs first.",
        "",
        "BEGIN;",
        "",
        "DELETE FROM public.staff AS st",
        f"WHERE st.company_id = '{TYLER}'::uuid",
        "  AND st.season = '2026'",
        "  AND trim(st.person_id) NOT IN (",
    ]
    for i, pid in enumerate(ids):
        comma = "," if i < len(ids) - 1 else ""
        lines.append(f"    {esc(pid)}{comma}")
    lines.extend(["  );", "", "COMMIT;"])

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT_PATH} ({OUT_PATH.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
