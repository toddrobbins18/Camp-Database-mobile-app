import { CAMP_SLUG, isNestSandboxCompany } from '../constants/camps';

export type InboxMessageLike = {
  subject?: string | null;
  notification_type?: string | null;
  sender_id?: string | null;
  sender_display_name?: string | null;
  company_id?: string | null;
  group_id?: string | null;
};

const DAILY_BULLETIN_SUBJECT = /daily news|daily wolf|tiger times|daily dashboard/i;

/** Cron email bulletins mirrored into the messages table (not human chat). */
export function isAutomatedCampBulletin(row: InboxMessageLike): boolean {
  if (row.notification_type === 'automated') return true;
  const subject = row.subject?.trim() ?? '';
  if (subject && DAILY_BULLETIN_SUBJECT.test(subject)) return true;
  if (!row.sender_id && row.sender_display_name?.trim() === 'Camp notification') return true;
  return false;
}

const BULLETIN_SUBJECT_CAMP_SLUG: { pattern: RegExp; slug: string }[] = [
  { pattern: /tyler hill daily news/i, slug: CAMP_SLUG.TYLER_HILL_CAMP },
  { pattern: /\bdaily wolf\b/i, slug: CAMP_SLUG.TIMBER_LAKE_WEST },
  { pattern: /\btiger times\b/i, slug: CAMP_SLUG.TIMBER_LAKE_CAMP },
  { pattern: /north shore day camp daily news/i, slug: CAMP_SLUG.NORTH_SHORE_DAY_CAMP },
];

export function inferBulletinCampSlugFromSubject(subject: string | null | undefined): string | null {
  const text = subject?.trim() ?? '';
  if (!text) return null;
  for (const { pattern, slug } of BULLETIN_SUBJECT_CAMP_SLUG) {
    if (pattern.test(text)) return slug;
  }
  return null;
}

export function messageVisibleInCampInbox(
  row: InboxMessageLike,
  company: { id?: string; slug?: string | null } | null | undefined,
): boolean {
  if (!company?.id) return false;

  if (row.company_id) {
    return row.company_id === company.id;
  }

  const bulletinSlug = inferBulletinCampSlugFromSubject(row.subject);
  if (bulletinSlug) {
    return bulletinSlug === (company.slug ?? null);
  }

  if (isAutomatedCampBulletin(row)) {
    return false;
  }

  return true;
}

/** Nest sandbox: camp-tagged only. Live camps: hide other camps' inbox noise (matches web). */
export function filterMessagesForCampInbox<T extends InboxMessageLike>(
  rows: T[],
  company: { id?: string; slug?: string | null } | null | undefined,
): T[] {
  if (isNestSandboxCompany(company?.slug)) {
    if (!company?.id) return [];
    return rows.filter((row) => {
      if (isAutomatedCampBulletin(row)) return false;
      return row.company_id === company.id;
    });
  }

  return rows.filter((row) => messageVisibleInCampInbox(row, company));
}
