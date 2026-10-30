import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { PP, ppFont, useParentPortalMainAreaHeight } from '../../lib/parentPortalUi';
import {
  listParentPortalThreads,
  openParentDivisionLeaderThread,
  fetchMessageRootById,
  PARENT_DIVISION_LEADER_THREAD_KIND,
  type ParentPortalThreadRow,
} from '../../lib/parentPortalMessaging';
import { fetchMessageThread } from '../../api/messages';
import { DirectMessageThreadView } from '../messages/DirectMessageThreadView';
import { ParentPortalMediaGallery } from './ParentPortalMediaGallery';
import { messageContentPreview } from '../../lib/messageContentUtils';
import type { ParentPortalColors } from '../../lib/parentPortalTheme';
import { markThreadRepliesReadForRecipient } from '../../lib/messageReadReceipts';
import {
  messageMediaEnabledForCamp,
  sendDirectMessageMedia,
  type PickedMessageMedia,
} from '../../lib/messageMedia';

type Props = {
  companyId: string;
  companySlug?: string | null;
  colors: ParentPortalColors;
  onThreadActive?: (active: boolean) => void;
  initialOpenThreadRootId?: string | null;
};

type SectionTab = 'chats' | 'photos';

export function ParentPortalMessagesView({
  companyId,
  companySlug,
  colors,
  onThreadActive,
  initialOpenThreadRootId,
}: Props) {
  const mainAreaHeight = useParentPortalMainAreaHeight();
  const styles = useMemo(() => createStyles(colors, mainAreaHeight), [colors, mainAreaHeight]);
  const [sectionTab, setSectionTab] = useState<SectionTab>('chats');
  const [rows, setRows] = useState<ParentPortalThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeRow, setActiveRow] = useState<ParentPortalThreadRow | null>(null);
  const [threadRoot, setThreadRoot] = useState<any>(null);
  const [threadReplies, setThreadReplies] = useState<any[]>([]);
  const [threadSending, setThreadSending] = useState(false);
  const [threadPendingMedia, setThreadPendingMedia] = useState<PickedMessageMedia | null>(null);
  const [opening, setOpening] = useState(false);

  const mediaEnabled = messageMediaEnabledForCamp(companySlug);

  useEffect(() => {
    onThreadActive?.(!!(activeRow && threadRoot));
    return () => onThreadActive?.(false);
  }, [activeRow, threadRoot, onThreadActive]);

  const refreshList = useCallback(async () => {
    setLoading(true);
    const { rows: list, error } = await listParentPortalThreads(supabase, companyId);
    if (error) Alert.alert('Messages', error);
    setRows(list);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (!initialOpenThreadRootId || threadRoot) return;
    void openThreadByRootId(initialOpenThreadRootId, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link from push
  }, [initialOpenThreadRootId]);

  const loadThread = useCallback(
    async (rootId: string) => {
      const replies = await fetchMessageThread(rootId, companyId);
      setThreadReplies(replies);
    },
    [companyId],
  );

  useEffect(() => {
    const rootId = threadRoot?.id as string | undefined;
    if (!rootId) return;

    void loadThread(rootId);

    const channel = supabase
      .channel(`parent-portal-thread-${rootId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as { parent_message_id?: string | null; id?: string };
          if (row?.parent_message_id === rootId || row?.id === rootId) {
            void loadThread(rootId);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as { parent_message_id?: string | null; id?: string };
          if (row?.parent_message_id === rootId || row?.id === rootId) {
            void loadThread(rootId);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [threadRoot?.id, loadThread]);

  const finishOpenThread = async (
    threadRootId: string,
    row: ParentPortalThreadRow | null,
    message: Record<string, unknown>,
  ) => {
    setActiveRow(row);
    setThreadRoot(message);
    await loadThread(threadRootId);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await markThreadRepliesReadForRecipient(supabase, threadRootId, user.id);
  };

  const openThreadByRootId = async (threadRootId: string, childId: string | null) => {
    setOpening(true);
    const row = rows.find((r) => r.child_id === childId) ?? null;
    const { message, error: fetchErr } = await fetchMessageRootById(supabase, threadRootId);
    if (fetchErr || !message) {
      Alert.alert('Messages', fetchErr ?? 'Thread not found');
      setOpening(false);
      return;
    }
    await finishOpenThread(threadRootId, row, message);
    setOpening(false);
  };

  const openThread = async (row: ParentPortalThreadRow) => {
    if (!row.division_leader_user_id) {
      Alert.alert('Messages', 'No division leader is assigned for this camper yet.');
      return;
    }
    setOpening(true);
    try {
      let threadRootId = row.thread_root_id;
      if (!threadRootId) {
        const { threadRootId: createdId, error } = await openParentDivisionLeaderThread(
          supabase,
          row.child_id,
        );
        if (error || !createdId) {
          Alert.alert('Messages', error ?? 'Could not open conversation');
          return;
        }
        threadRootId = createdId;
      }
      const { message, error: fetchErr } = await fetchMessageRootById(supabase, threadRootId);
      if (fetchErr || !message) {
        Alert.alert('Messages', fetchErr ?? 'Thread not found');
        return;
      }
      await finishOpenThread(threadRootId, row, message);
    } finally {
      setOpening(false);
    }
  };

  const threadMeta = () => ({
    child_id: threadRoot?.child_id ?? activeRow?.child_id ?? null,
    family_id: threadRoot?.family_id ?? null,
    thread_kind: PARENT_DIVISION_LEADER_THREAD_KIND,
  });

  const sendThreadReply = async (replyText: string) => {
    if (!threadRoot || !currentUserId || threadSending) return;
    const trimmed = replyText.trim();
    if (!trimmed && !threadPendingMedia) {
      Alert.alert('Empty reply', 'Write a message or attach a file.');
      return;
    }
    const recipientId =
      currentUserId === threadRoot.sender_id ? threadRoot.recipient_id : threadRoot.sender_id;
    if (!recipientId) {
      Alert.alert('Cannot reply', 'This conversation has no recipient.');
      return;
    }
    const meta = threadMeta();
    setThreadSending(true);
    try {
      const reSubject = `Re: ${String(threadRoot.subject ?? '').replace(/^Re: /, '')}`;
      if (threadPendingMedia) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', currentUserId)
          .maybeSingle();
        const senderDisplayName =
          prof?.full_name?.trim() || prof?.email?.split('@')[0] || null;
        const { error: mediaErr } = await sendDirectMessageMedia(supabase, {
          companyId,
          senderId: currentUserId,
          recipientId,
          subject: reSubject,
          parentMessageId: threadRoot.id,
          threadScopeId: threadRoot.id,
          caption: trimmed,
          media: threadPendingMedia,
          senderDisplayName,
          childId: meta.child_id,
          familyId: meta.family_id,
          threadKind: meta.thread_kind,
        });
        if (mediaErr) throw new Error(mediaErr);
        setThreadPendingMedia(null);
      } else {
        const { error } = await supabase.from('messages').insert({
          sender_id: currentUserId,
          recipient_id: recipientId,
          subject: reSubject,
          content: trimmed,
          parent_message_id: threadRoot.id,
          notification_type: 'message',
          read: false,
          company_id: companyId,
          child_id: meta.child_id,
          family_id: meta.family_id,
          thread_kind: meta.thread_kind,
        });
        if (error) throw error;
      }
      await loadThread(threadRoot.id);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to send');
      throw err;
    } finally {
      setThreadSending(false);
    }
  };

  if (activeRow && threadRoot) {
    return (
      <View style={styles.threadWrap}>
        <DirectMessageThreadView
          threadId={threadRoot.id}
          threadSubject={String(threadRoot.subject ?? activeRow.child_name)}
          detailMessage={threadRoot}
          threadReplies={threadReplies}
          currentUserId={currentUserId}
          threadPartyLabel={activeRow.division_leader_name ?? 'Division leader'}
          canReply
          messageMediaEnabled={mediaEnabled}
          threadPendingMedia={threadPendingMedia}
          setThreadPendingMedia={setThreadPendingMedia}
          threadSending={threadSending}
          onSend={sendThreadReply}
          onBack={() => {
            setActiveRow(null);
            setThreadRoot(null);
            setThreadReplies([]);
            setThreadPendingMedia(null);
            void refreshList();
          }}
          senderLabel={(row) =>
            row.sender_id === currentUserId ? 'You' : activeRow.division_leader_name ?? 'Division leader'
          }
          appearance="parentGlass"
          portalColors={colors}
        />
      </View>
    );
  }

  if (opening || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messages</Text>
      <Text style={styles.subtitle}>
        Chat with your camper&apos;s division leader and view shared photos &amp; videos.
      </Text>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, sectionTab === 'chats' && styles.tabBtnActive]}
          onPress={() => setSectionTab('chats')}
        >
          <Text style={[styles.tabBtnText, sectionTab === 'chats' && styles.tabBtnTextActive]}>Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, sectionTab === 'photos' && styles.tabBtnActive]}
          onPress={() => setSectionTab('photos')}
        >
          <Text style={[styles.tabBtnText, sectionTab === 'photos' && styles.tabBtnTextActive]}>
            Photos &amp; videos
          </Text>
        </TouchableOpacity>
      </View>
      {sectionTab === 'photos' ? (
        <ParentPortalMediaGallery
          companyId={companyId}
          currentUserId={currentUserId}
          colors={colors}
          onOpenThread={(rootId, childId) => void openThreadByRootId(rootId, childId)}
        />
      ) : null}
      {sectionTab === 'chats' && rows.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>Link campers to your family to start messaging.</Text>
        </View>
      ) : null}
      {sectionTab === 'chats'
        ? rows.map((row) => (
            <TouchableOpacity
              key={row.child_id}
              style={[styles.row, !row.division_leader_user_id && styles.rowDisabled]}
              disabled={!row.division_leader_user_id}
              onPress={() => void openThread(row)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{row.child_name.charAt(0)}</Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{row.child_name}</Text>
                <Text style={styles.rowLeader}>
                  {row.division_leader_name
                    ? `Division leader: ${row.division_leader_name}`
                    : 'Division leader not assigned'}
                </Text>
                {row.latest_preview ? (
                  <Text style={styles.rowPreview} numberOfLines={2}>
                    {messageContentPreview(row.latest_preview, 80)}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))
        : null}
    </View>
  );
}

function createStyles(colors: ParentPortalColors, mainAreaHeight: number) {
  return StyleSheet.create({
    container: { paddingBottom: 24 },
    threadWrap: {
      flex: 1,
      height: mainAreaHeight,
      maxHeight: mainAreaHeight,
      minHeight: 0,
      alignSelf: 'stretch',
    },
    title: {
      fontSize: 22,
      fontFamily: ppFont.semibold,
      color: colors.text,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: ppFont.regular,
      color: colors.textMuted,
      marginBottom: 12,
      lineHeight: 20,
    },
    tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    tabBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.elevated,
    },
    tabBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
    tabBtnText: { fontSize: 13, fontFamily: ppFont.semibold, color: colors.textMuted },
    tabBtnTextActive: { color: '#fff' },
    centered: { paddingVertical: 48, alignItems: 'center', gap: 12 },
    emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 24 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: PP.radiusLg,
      backgroundColor: colors.elevated,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowDisabled: { opacity: 0.45 },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.brandSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontSize: 18, fontFamily: ppFont.semibold, color: colors.brand },
    rowBody: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: 16, fontFamily: ppFont.semibold, color: colors.text },
    rowLeader: { fontSize: 12, fontFamily: ppFont.medium, color: colors.brand, marginTop: 2 },
    rowPreview: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  });
}
