import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MessageMediaContent } from '../MessageMediaContent';
import { ReadReceipt } from './ReadReceipt';
import { ThreadMessageComposer } from './ThreadMessageComposer';
import type { PickedMessageMedia } from '../../lib/messageMedia';
import { canonicalProfileUuid } from '../../lib/messageProfiles';
import type { ParentPortalColors } from '../../lib/parentPortalTheme';
import {
  createChatThreadStyles,
  isParentPortalThreadStarter,
  type ChatAppearance,
} from './chatBubbleStyles';
import { messageRowMediaFields, rowHasMessageMedia } from '../../lib/messageRowMedia';

function formatBubbleTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

type ChatRow = {
  id: string;
  sender_id?: string | null;
  created_at: string;
  content?: string | null;
  message_kind?: string | null;
  media_storage_path?: string | null;
  media_mime?: string | null;
  media_file_name?: string | null;
  notification_type?: string | null;
  read?: boolean | null;
  read_at?: string | null;
  sender_display_name?: string | null;
};

type Props = {
  threadId: string;
  threadSubject: string;
  detailMessage: ChatRow;
  threadReplies: ChatRow[];
  currentUserId: string | null;
  threadPartyLabel: string;
  canReply: boolean;
  messageMediaEnabled: boolean;
  threadPendingMedia: PickedMessageMedia | null;
  setThreadPendingMedia: (v: PickedMessageMedia | null) => void;
  threadSending: boolean;
  onSend: (text: string) => void | Promise<void>;
  onPickMedia?: () => void;
  onBack: () => void;
  senderLabel: (row: ChatRow) => string;
  /** Parent portal: frosted glass bubbles + softer chat canvas. */
  appearance?: ChatAppearance;
  portalColors?: ParentPortalColors;
};

function DirectMessageThreadViewInner({
  threadId,
  threadSubject,
  detailMessage,
  threadReplies,
  currentUserId,
  threadPartyLabel,
  canReply,
  messageMediaEnabled,
  threadPendingMedia,
  setThreadPendingMedia,
  threadSending,
  onSend,
  onPickMedia,
  onBack,
  senderLabel,
  appearance = 'nest',
  portalColors,
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const styles = useMemo(
    () => createChatThreadStyles(appearance, portalColors),
    [appearance, portalColors],
  );

  const timeline = useMemo(() => {
    let rows: ChatRow[] = [detailMessage, ...threadReplies];
    if (appearance === 'parentGlass') {
      rows = rows.filter((r) => !isParentPortalThreadStarter(r, detailMessage.id));
    }
    return rows.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [detailMessage, threadReplies, appearance]);

  const replyCount = threadReplies.length;

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(t);
  }, [replyCount, threadId]);

  const renderBubble = useCallback(
    (row: ChatRow) => {
      const isMe =
        canonicalProfileUuid(row.sender_id) != null &&
        canonicalProfileUuid(row.sender_id) === canonicalProfileUuid(currentUserId);
      const media = messageRowMediaFields(row as Record<string, unknown>);
      const hasBody = media.content.trim().length > 0 || rowHasMessageMedia(row as Record<string, unknown>);

      return (
        <View key={row.id} style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
            {!isMe ? (
              <Text style={styles.bubbleSender} numberOfLines={1}>
                {senderLabel(row)}
              </Text>
            ) : null}
            {hasBody ? (
              <MessageMediaContent
                content={media.content}
                messageKind={media.messageKind}
                mediaStoragePath={media.mediaStoragePath}
                mediaMime={media.mediaMime}
                mediaFileName={media.mediaFileName}
                senderId={row.sender_id}
                notificationType={row.notification_type}
              />
            ) : (
              <Text style={styles.bubbleTime}>Attachment</Text>
            )}
            <View style={styles.bubbleMeta}>
              <Text style={styles.bubbleTime}>{formatBubbleTime(row.created_at)}</Text>
              {isMe ? <ReadReceipt message={row} variant="whatsapp" /> : null}
            </View>
          </View>
        </View>
      );
    },
    [currentUserId, senderLabel, styles],
  );

  const headerPadTop = appearance === 'parentGlass' ? 8 : Math.max(insets.top, 8);

  return (
    <KeyboardAvoidingView
      style={styles.flex1}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.flex1}>
        <View style={[styles.header, { paddingTop: headerPadTop }]}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerName} numberOfLines={1}>
              {threadPartyLabel}
            </Text>
            <Text style={styles.headerSubject} numberOfLines={1}>
              {threadSubject}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={[
            styles.chatContent,
            timeline.length === 0 ? styles.chatContentEmpty : styles.chatContentFilled,
          ]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          {timeline.map(renderBubble)}
        </ScrollView>

        {canReply ? (
          <ThreadMessageComposer
            threadId={threadId}
            messageMediaEnabled={messageMediaEnabled}
            threadPendingMedia={threadPendingMedia}
            setThreadPendingMedia={setThreadPendingMedia}
            threadSending={threadSending}
            onSend={onSend}
            onPickMedia={onPickMedia}
            appearance={appearance}
            brandColor={portalColors?.brand}
          />
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

export const DirectMessageThreadView = DirectMessageThreadViewInner;
