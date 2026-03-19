/**
 * Maps mobile Staff form values → Supabase `staff` row shape.
 * DB check constraint on staff_type + DATE columns must match Postgres expectations.
 */

export type DbStaffType = 'general_counselor' | 'specialist' | 'both' | 'support' | 'leadership';

const DB_STAFF_TYPE_LABEL: Record<string, string> = {
    general_counselor: 'General Counselor',
    specialist: 'Specialist',
    both: 'Both',
    support: 'Support',
    leadership: 'Leadership',
};

/** For list cards / edit form prefill */
export function formatStaffTypeFromDb(db: string | null | undefined): string {
    if (db == null || db === '') return '';
    return DB_STAFF_TYPE_LABEL[db] || String(db).replace(/_/g, ' ');
}

/** UI labels from StaffScreen STAFF_TYPES */
const UI_STAFF_TYPE_TO_DB: Record<string, DbStaffType | null> = {
    'Not Specified': null,
    'General Counselor': 'general_counselor',
    Specialist: 'specialist',
    Support: 'support',
    Leadership: 'leadership',
    Both: 'both',
};

/** Also accept snake_case if ever passed from API round-trip */
export function mapUiStaffTypeToDb(ui: string | undefined | null): DbStaffType | null {
    if (ui == null || String(ui).trim() === '') return null;
    const t = String(ui).trim();
    if (t in UI_STAFF_TYPE_TO_DB) return UI_STAFF_TYPE_TO_DB[t] ?? null;
    if (t === 'general_counselor' || t === 'specialist' || t === 'both' || t === 'support' || t === 'leadership') {
        return t as DbStaffType;
    }
    return null;
}

/** Convert MM/DD/YYYY or YYYY-MM-DD to ISO date string for Postgres DATE, or null */
/** DB DATE → MM/DD/YYYY for form display */
export function formatIsoDateToUs(iso: string | null | undefined): string {
    if (!iso || typeof iso !== 'string') return '';
    const m = iso.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    return `${m[2]}/${m[3]}/${m[1]}`;
}

export function toIsoDateOrNull(s: string | undefined | null): string | null {
    const t = s?.trim();
    if (!t) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
        const mm = m[1].padStart(2, '0');
        const dd = m[2].padStart(2, '0');
        return `${m[3]}-${mm}-${dd}`;
    }
    return null;
}

export type StaffFormFields = {
    name: string;
    role: string;
    department: string;
    email: string;
    phone: string;
    hireDate: string;
    dob: string;
    staffType: string;
    allergies: string;
    rfid: string;
};

/**
 * Columns that exist on `public.staff` — do NOT send `reports_to` (use leader_id UUID when available).
 */
export function buildStaffInsertRow(
    companyId: string,
    season: string,
    fields: StaffFormFields,
    options?: { leaderId?: string | null }
): Record<string, unknown> {
    const name = fields.name?.trim();
    if (!name) throw new Error('Name is required');

    const row: Record<string, unknown> = {
        company_id: companyId,
        season: season || '2026',
        name,
        role: (fields.role?.trim() || 'Staff').slice(0, 100),
        status: 'active',
    };

    const dept = fields.department?.trim();
    if (dept) row.department = dept.slice(0, 200);

    const email = fields.email?.trim();
    if (email) row.email = email;

    const phone = fields.phone?.trim();
    if (phone) row.phone = phone.slice(0, 40);

    const hire = toIsoDateOrNull(fields.hireDate);
    if (hire) row.hire_date = hire;

    const dob = toIsoDateOrNull(fields.dob);
    if (dob) row.date_of_birth = dob;

    const st = mapUiStaffTypeToDb(fields.staffType);
    if (st) row.staff_type = st;

    const allergies = fields.allergies?.trim();
    if (allergies) row.allergies = allergies;

    const rfid = fields.rfid?.trim();
    if (rfid) row.rfid = rfid;

    const lid = options?.leaderId?.trim();
    if (lid && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lid)) {
        row.leader_id = lid;
    }

    return row;
}
