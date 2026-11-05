import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { PP, ppFont, useParentPortalMainAreaHeight } from '../../lib/parentPortalUi';
import {
  listParentPortalThreads,
  openParentDivisionLeaderThread,
  fetchMessageRootById,
  parentPortalThreadListTitle,
  parentPortalThreadListSubtitle,
  PARENT_DIVISION_LEADER_THREAD_KIND,
  type ParentPortalThreadRow,
} from '../../lib/parentPortalMessaging';
import { formatParentMessageListDate } from '../../lib/campTime';
import { camperInitials } from '../../constants/parentPortalConstants';
import { fetchMessageThread } from '../../api/messages';
import { DirectMessageThreadView } from '../messages/DirectMessageThreadView';
import { ParentPortalMediaGallery } from './ParentPortalMediaGallery';
import { messageContentPreview } from '../../lib/messageContentUtils';
import type { ParentPortalColors } from '../../lib/parentPortalTheme';
import { markThreadRepliesReadForRecipient } from '../../lib/messageReadReceipts';
import { resolveThreadRecipientId } from '../../lib/messageThreadRecipient';
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

type SectionTab = 'chats' | 'groups' | 'buses' | 'photos';
type CampNote = { id: string; title: string; body: string; audience_kind: string | null; audience_label: string | null };

function AudienceReplyScreen({
  note,
  replies,
  draft,
  userId,
  onDraft,
  onBack,
  onSend,
}: {
  note: CampNote;
  replies: { id: string; sender_id: string; sender_name: string | null; body: string }[];
  draft: string;
  userId: string | null;
  onDraft: (value: string) => void;
  onBack: () => void;
  onSend: () => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <TouchableOpacity onPress={onBack}>
        <Text style={{ color: '#0f172a', fontWeight: '700' }}>Back</Text>
      </TouchableOpacity>
      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14 }}>
        <Text style={{ color: '#475569', fontSize: 12, fontWeight: '700' }}>{note.audience_label}</Text>
        <Text style={{ color: '#0f172a', fontWeight: '700', marginTop: 4 }}>{note.title}</Text>
        <Text style={{ color: '#1e293b', marginTop: 6 }}>{note.body}</Text>
      </View>
      {replies.map((reply) => (
        <View key={reply.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12 }}>
          <Text style={{ color: '#475569', fontSize: 12, fontWeight: '700' }}>
            {reply.sender_id === userId ? 'You' : reply.sender_name || 'Camp'}
          </Text>
          <Text style={{ color: '#0f172a', marginTop: 4 }}>{reply.body}</Text>
        </View>
      ))}
      <TextInput
        value={draft}
        onChangeText={onDraft}
        placeholder="Write a reply"
        placeholderTextColor="#64748b"
        style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, color: '#0f172a', minHeight: 72 }}
        multiline
      />
      <TouchableOpacity onPress={onSend} style={{ backgroundColor: '#1565C0', borderRadius: 12, padding: 12, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Reply</Text>
      </TouchableOpacity>
    </View>
  );
}

function AudienceNoteList({
  notes,
  empty,
  onOpen,
}: {
  notes: CampNote[];
  empty: string;
  onOpen: (note: CampNote) => void;
}) {
  if (notes.length === 0) {
    return (
      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16 }}>
        <Text style={{ color: '#334155' }}>{empty}</Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {notes.map((note) => (
        <TouchableOpacity key={note.id} onPress={() => onOpen(note)} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ color: '#475569', fontSize: 12, fontWeight: '700' }}>{note.audience_label}</Text>
          <Text style={{ color: '#0f172a', fontWeight: '700', marginTop: 2 }}>{note.title}</Text>
          <Text style={{ color: '#1e293b', marginTop: 4 }} numberOfLines={2}>{note.body}</Text>
          <Text style={{ color: '#64748b', marginTop: 8, fontSize: 12 }}>Open to reply</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

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
  const [campNotes, setCampNotes] = useState<CampNote[]>([]);
  const [openNote, setOpenNote] = useState<CampNote | null>(null);
  const [noteReplies, setNoteReplies] = useState<{ id: string; sender_id: string; sender_name: string | null; body: string }[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeRow, setActiveRow] = useState<ParentPortalThreadRow | null>(null);
  const [threadRoot, setThreadRoot] = useState<any>(null);
  const [threadReplies, setThreadReplies] = useState<any[]>([]);
  const [threadSending, setThreadSending] = useState(false);
  const [threadPendingMedia, setThreadPendingMedia] = useState<PickedMessageMedia | null>(null);
  const [opening, setOpening] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const mediaEnabled = messageMediaEnabledForCamp(companySlug);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [row.child_name, row.division_leader_name, row.latest_preview, row.group_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, searchQuery]);

  useEffect(() => {
    onThreadActive?.(!!(activeRow && threadRoot));
    return () => onThreadActive?.(false);
  }, [activeRow, threadRoot, onThreadActive]);

  const refreshList = useCallback(async () => {
    setLoading(true);
    const { rows: list, error } = await listParentPortalThreads(supabase, companyId);
    if (error) Alert.alert('Messages', error);
    setRows(list);
    const notes = await supabase
      .from('parent_portal_announcements')
      .select('id, title, body, published_at, audience_kind, audience_label')
      .eq('company_id', companyId)
      .eq('is_published', true)
      .in('audience_kind', ['group', 'bus'])
      .order('published_at', { ascending: false })
      .limit(20);
    setCampNotes((notes.data ?? []) as CampNote[]);
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
    const recipientId = resolveThreadRecipientId(
      threadRoot as { sender_id?: string | null; recipient_id?: string | null },
      currentUserId,
      threadReplies,
    );
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
          threadPartyLabel={parentPortalThreadListTitle(activeRow)}
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
      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={[styles.segmentBtn, sectionTab === 'chats' && styles.segmentBtnActive]}
          onPress={() => setSectionTab('chats')}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={16}
            color={sectionTab === 'chats' ? '#fff' : colors.textMuted}
          />
          <Text style={[styles.segmentText, sectionTab === 'chats' && styles.segmentTextActive]}>
            Chats
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, sectionTab === 'groups' && styles.segmentBtnActive]}
          onPress={() => setSectionTab('groups')}
        >
          <Ionicons name="people-outline" size={16} color={sectionTab === 'groups' ? '#fff' : colors.textMuted} />
          <Text style={[styles.segmentText, sectionTab === 'groups' && styles.segmentTextActive]}>Groups</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, sectionTab === 'buses' && styles.segmentBtnActive]}
          onPress={() => setSectionTab('buses')}
        >
          <Ionicons name="bus-outline" size={16} color={sectionTab === 'buses' ? '#fff' : colors.textMuted} />
          <Text style={[styles.segmentText, sectionTab === 'buses' && styles.segmentTextActive]}>Buses</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, sectionTab === 'photos' && styles.segmentBtnActive]}
          onPress={() => setSectionTab('photos')}
        >
          <Ionicons
            name="images-outline"
            size={16}
            color={sectionTab === 'photos' ? '#fff' : colors.textMuted}
          />
          <Text style={[styles.segmentText, sectionTab === 'photos' && styles.segmentTextActive]}>
            Photos
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
      {sectionTab === 'groups' || sectionTab === 'buses' ? (
        openNote && openNote.audience_kind === (sectionTab === 'groups' ? 'group' : 'bus') ? (
          <AudienceReplyScreen
            note={openNote}
            replies={noteReplies}
            draft={noteDraft}
            userId={currentUserId}
            onDraft={setNoteDraft}
            onBack={() => setOpenNote(null)}
            onSend={async () => {
              const text = noteDraft.trim();
              if (!text || !currentUserId || !openNote) return;
              const { error } = await supabase.from('parent_audience_replies').insert({
                announcement_id: openNote.id,
                sender_id: currentUserId,
                sender_name: 'Parent',
                body: text,
              });
              if (error) {
                Alert.alert('Messages', error.message);
                return;
              }
              setNoteDraft('');
              const next = await supabase
                .from('parent_audience_replies')
                .select('id, sender_id, sender_name, body')
                .eq('announcement_id', openNote.id)
                .order('created_at', { ascending: true });
              setNoteReplies((next.data ?? []) as { id: string; sender_id: string; sender_name: string | null; body: string }[]);
            }}
          />
        ) : (
          <AudienceNoteList
            notes={campNotes.filter((note) => note.audience_kind === (sectionTab === 'groups' ? 'group' : 'bus'))}
            empty={sectionTab === 'groups' ? 'No group messages yet.' : 'No bus messages yet.'}
            onOpen={async (note) => {
              setOpenNote(note);
              const next = await supabase
                .from('parent_audience_replies')
                .select('id, sender_id, sender_name, body')
                .eq('announcement_id', note.id)
                .order('created_at', { ascending: true });
              setNoteReplies((next.data ?? []) as { id: string; sender_id: string; sender_name: string | null; body: string }[]);
            }}
          />
        )
      ) : null}
      {sectionTab === 'chats' && rows.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>Link campers to your family to start messaging.</Text>
        </View>
      ) : null}
      {sectionTab === 'chats' && rows.length > 0 ? (
        <>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.inboxCard}>
            {filteredRows.length === 0 ? (
              <Text style={styles.emptySearch}>No conversations match your search.</Text>
            ) : (
              filteredRows.map((row, index) => {
                const preview = row.latest_preview
                  ? messageContentPreview(row.latest_preview, 80)
                  : 'No messages yet';
                const title = parentPortalThreadListTitle(row);
                return (
                  <TouchableOpacity
                    key={row.child_id}
                    style={[
                      styles.inboxRow,
                      index > 0 && styles.inboxRowBorder,
                      !row.division_leader_user_id && styles.rowDisabled,
                    ]}
                    disabled={!row.division_leader_user_id}
                    onPress={() => void openThread(row)}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{camperInitials(title)}</Text>
                    </View>
                    <View style={styles.rowBody}>
                      <View style={styles.rowTitleRow}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {title}
                        </Text>
                        {row.latest_at ? (
                          <Text style={styles.rowDate}>{formatParentMessageListDate(row.latest_at)}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.rowCamper} numberOfLines={1}>
                        {parentPortalThreadListSubtitle(row)}
                      </Text>
                      <Text style={styles.rowPreview} numberOfLines={1}>
                        {preview}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </>
      ) : null}
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
    segmentRow: {
      flexDirection: 'row',
      gap: 4,
      padding: 4,
      borderRadius: PP.radiusLg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.elevated,
      marginBottom: 14,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: PP.radiusMd,
    },
    segmentBtnActive: { backgroundColor: colors.brand },
    segmentText: { fontSize: 14, fontFamily: ppFont.semibold, color: colors.textMuted },
    segmentTextActive: { color: '#fff' },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: PP.radiusLg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.elevated,
      marginBottom: 12,
      paddingHorizontal: 12,
      minHeight: 44,
    },
    searchIcon: { marginRight: 8 },
    searchInput: {
      flex: 1,
      fontSize: 16,
      fontFamily: ppFont.regular,
      color: colors.text,
      paddingVertical: 10,
    },
    inboxCard: {
      backgroundColor: colors.elevated,
      overflow: 'hidden',
    },
    inboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    inboxRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    centered: { paddingVertical: 48, alignItems: 'center', gap: 12 },
    emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 24 },
    emptySearch: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: 32,
      paddingHorizontal: 16,
    },
    rowDisabled: { opacity: 0.45 },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontSize: 15, fontFamily: ppFont.semibold, color: '#fff' },
    rowBody: { flex: 1, minWidth: 0 },
    rowTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    rowTitle: { flex: 1, fontSize: 16, fontFamily: ppFont.semibold, color: colors.text },
    rowDate: { fontSize: 12, fontFamily: ppFont.regular, color: colors.textMuted },
    rowCamper: { fontSize: 12, fontFamily: ppFont.semibold, color: colors.brand, marginTop: 1 },
    rowPreview: { fontSize: 14, fontFamily: ppFont.regular, color: colors.textMuted, marginTop: 2 },
  });
}
