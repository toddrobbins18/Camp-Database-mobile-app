import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import type { NavigationContainerRefWithCurrent, ParamListBase } from '@react-navigation/native';

export type InboxNotificationData = {
  messageId?: string;
  threadId?: string;
  groupId?: string;
  activeView?: 'inbox' | 'sent' | 'families' | 'channels' | 'groups' | 'parent_portal';
  channelRootId?: string;
  channelName?: string;
};

export function threadIdFromMessageRow(row: {
  id?: string;
  parent_message_id?: string | null;
}): string | undefined {
  const root = row.parent_message_id?.trim() || row.id;
  return root || undefined;
}

export function navigateFromInboxNotification(
  navigationRef: NavigationContainerRefWithCurrent<ParamListBase>,
  data: InboxNotificationData | undefined,
): void {
  if (!data || !navigationRef.isReady()) return;

  if (data.groupId || data.activeView === 'groups') {
    navigationRef.navigate('MainApp', {
      screen: 'Messages',
      params: {
        openGroupId: data.groupId ? String(data.groupId) : undefined,
        activeView: 'groups',
      },
    });
    return;
  }

  if (data.activeView === 'parent_portal') {
    navigationRef.navigate('MainApp', {
      screen: 'DayCampModule',
      params: {
        moduleId: 'parent-portal',
        initialTab: 'messages',
        openMessageThreadRootId: data.threadId,
      },
    });
    return;
  }

  if (data.activeView === 'channels' && data.channelRootId) {
    navigationRef.navigate('MainApp', {
      screen: 'Messages',
      params: {
        activeView: 'channels',
        openChannelRootId: String(data.channelRootId),
        channelName: data.channelName,
      },
    });
    return;
  }

  const threadId = data.threadId || data.messageId;
  if (!threadId) return;

  const view =
    data.activeView === 'families'
      ? 'families'
      : data.activeView === 'sent'
        ? 'sent'
        : 'inbox';

  navigationRef.navigate('MainApp', {
    screen: 'Messages',
    params: {
      openThreadId: String(threadId),
      activeView: view,
    },
  });
}

/** Tap on device alert → open the matching inbox thread (not just Messages home). */
export function useInboxNotificationDeepLink(
  navigationRef: NavigationContainerRefWithCurrent<ParamListBase>,
): void {
  useEffect(() => {
    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const data = response.notification.request.content.data as InboxNotificationData | undefined;
      navigateFromInboxNotification(navigationRef, data);
    };

    void Notifications.getLastNotificationResponseAsync().then(handle);

    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [navigationRef]);
}
