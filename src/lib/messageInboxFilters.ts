import { isNestSandboxCompany } from '../constants/camps';

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

/** Nest sandbox: only messages tagged to this camp (matches web). */
export function filterMessagesForCampInbox<T extends InboxMessageLike>(
  rows: T[],
  company: { id?: string; slug?: string | null } | null | undefined,
): T[] {
  if (!isNestSandboxCompany(company?.slug)) return rows;
  if (!company?.id) return [];

  return rows.filter((row) => {
    if (isAutomatedCampBulletin(row)) return false;
    return row.company_id === company.id;
  });
}
