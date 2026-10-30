import { messagePreviewLabel } from './messageMedia';
import type { InboxPushData } from './inboxLocalNotification';
import { threadIdFromMessageRow } from './inboxNotificationNavigation';

export type MessageInsertRow = {
  id?: string;
  sender_id?: string | null;
  recipient_id?: string | null;
  parent_message_id?: string | null;
  group_id?: string | null;
  thread_kind?: string | null;
  division_id?: string | null;
  subject?: string | null;
  content?: string | null;
  message_kind?: string | null;
  media_file_name?: string | null;
  read?: boolean;
};

export type MessagePushPlan = {
  title: string;
  body: string;
  data: InboxPushData;
};

/** Local push when a new messages row is relevant to this user (staff inbox, families, channels). */
export function planInboxPushForInsert(
  row: MessageInsertRow,
  userId: string,
): MessagePushPlan | null {
  if (!row?.id || !userId) return null;
  const senderId = row.sender_id != null ? String(row.sender_id) : '';
  if (senderId === userId) return null;

  const preview = messagePreviewLabel(
    row.message_kind,
    String(row.content ?? ''),
    row.media_file_name,
  );

  if (row.thread_kind === 'division_channel' && row.parent_message_id) {
    const rootId = String(row.parent_message_id);
    return {
      title: 'Division channel',
      body: preview,
      data: {
        activeView: 'channels',
        channelRootId: rootId,
        threadId: rootId,
        messageId: String(row.id),
      },
    };
  }

  if (row.thread_kind === 'parent_division_leader') {
    const threadId = threadIdFromMessageRow(row);
    if (!threadId) return null;
    const recipientId = row.recipient_id != null ? String(row.recipient_id) : '';
    if (recipientId !== userId || row.read) return null;
    return {
      title: String(row.subject || 'Parent portal message'),
      body: preview,
      data: {
        activeView: 'families',
        threadId,
        messageId: String(row.id),
      },
    };
  }

  const recipientId = row.recipient_id != null ? String(row.recipient_id) : '';
  if (recipientId !== userId || row.read) return null;

  const threadId = threadIdFromMessageRow(row);
  if (!threadId) return null;

  return {
    title: String(row.subject || 'New message'),
    body: preview,
    data: {
      activeView: 'inbox',
      messageId: String(row.id),
      threadId,
      ...(row.group_id ? { groupId: String(row.group_id) } : {}),
    },
  };
}
