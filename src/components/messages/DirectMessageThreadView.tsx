import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { MessageMediaContent } from '../MessageMediaContent';
import { ReadReceipt } from './ReadReceipt';
import { ThreadMessageComposer } from './ThreadMessageComposer';
import type { PickedMessageMedia } from '../../lib/messageMedia';
import { canonicalProfileUuid } from '../../lib/messageProfiles';

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
  onPickMedia: () => void;
  onBack: () => void;
  senderLabel: (row: ChatRow) => string;
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
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const timeline = useMemo(() => {
    const rows: ChatRow[] = [detailMessage, ...threadReplies];
    return rows.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [detailMessage, threadReplies]);

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
      return (
        <View key={row.id} style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
            {!isMe ? (
              <Text style={styles.bubbleSender} numberOfLines={1}>
                {senderLabel(row)}
              </Text>
            ) : null}
            <MessageMediaContent
              content={row.content ?? ''}
              messageKind={row.message_kind}
              mediaStoragePath={row.media_storage_path}
              mediaMime={row.media_mime}
              mediaFileName={row.media_file_name}
              senderId={row.sender_id}
              notificationType={row.notification_type}
            />
            <View style={styles.bubbleMeta}>
              <Text style={styles.bubbleTime}>{formatBubbleTime(row.created_at)}</Text>
              {isMe ? <ReadReceipt message={row} variant="whatsapp" /> : null}
            </View>
          </View>
        </View>
      );
    },
    [currentUserId, senderLabel],
  );

  return (
    <View style={styles.flex1}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
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
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
      >
        {timeline.map(renderBubble)}
      </ScrollView>

      {canReply ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ThreadMessageComposer
            threadId={threadId}
            messageMediaEnabled={messageMediaEnabled}
            threadPendingMedia={threadPendingMedia}
            setThreadPendingMedia={setThreadPendingMedia}
            threadSending={threadSending}
            onSend={onSend}
            onPickMedia={onPickMedia}
          />
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}

export const DirectMessageThreadView = DirectMessageThreadViewInner;

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 4,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubject: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  headerSpacer: { width: 44 },
  chatScroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  chatContent: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 4,
  },
  bubbleRow: {
    width: '100%',
    marginVertical: 2,
  },
  bubbleRowMe: {
    alignItems: 'flex-end',
  },
  bubbleRowThem: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 1,
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderTopRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderTopLeftRadius: 4,
  },
  bubbleSender: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.secondary,
    marginBottom: 4,
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  bubbleTime: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});
