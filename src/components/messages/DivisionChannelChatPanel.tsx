import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { supabase } from '../../lib/supabase';
import {
  fetchDivisionChannelTimeline,
  markDivisionChannelRead,
  postDivisionChannelMessage,
  sendDivisionChannelMessageMedia,
} from '../../lib/divisionChannelMessaging';
import { fetchMessageProfileLabels } from '../../lib/messageProfiles';
import { MessageMediaContent } from '../MessageMediaContent';
import { messageMediaEnabledForCamp } from '../../lib/messageMedia';
import type { PickedMessageMedia } from '../../lib/messageMedia';

type Props = {
  rootId: string;
  divisionName: string;
  companyId: string;
  companySlug?: string | null;
  onBack: () => void;
  onMarkedRead?: () => void;
};

type Post = {
  id: string;
  content: string;
  created_at: string;
  sender_id: string | null;
  sender_name: string;
  message_kind?: string | null;
  media_storage_path?: string | null;
  media_mime?: string | null;
  media_file_name?: string | null;
};

export function DivisionChannelChatPanel({
  rootId,
  divisionName,
  companyId,
  companySlug,
  onBack,
  onMarkedRead,
}: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const mediaEnabled = messageMediaEnabledForCamp(companySlug);

  const load = useCallback(async () => {
    const { rows, error } = await fetchDivisionChannelTimeline(supabase, rootId);
    if (error) {
      setLoading(false);
      return;
    }
    const senderIds = rows.map((m) => m.sender_id as string | null).filter(Boolean) as string[];
    const labels = await fetchMessageProfileLabels(senderIds, companyId);
    const replies = rows.filter((m) => m.parent_message_id === rootId);
    void markDivisionChannelRead(supabase, rootId).then(({ error: markErr }) => {
      if (!markErr) onMarkedRead?.();
    });

    setPosts(
      replies.map((m) => {
        const sid = m.sender_id as string | null;
        return {
          id: m.id as string,
          content: String(m.content ?? ''),
          created_at: String(m.created_at ?? ''),
          sender_id: sid,
          sender_name: sid ? labels.get(sid) ?? 'Staff' : 'System',
          message_kind: (m.message_kind as string | null) ?? null,
          media_storage_path: (m.media_storage_path as string | null) ?? null,
          media_mime: (m.media_mime as string | null) ?? null,
          media_file_name: (m.media_file_name as string | null) ?? null,
        };
      }),
    );
    setLoading(false);
  }, [rootId, companyId, onMarkedRead]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    void load();
    const channel = supabase
      .channel(`division-channel-m-${rootId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        void load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [rootId, load]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const { error } = await postDivisionChannelMessage(supabase, rootId, body);
    setSending(false);
    if (error) {
      Alert.alert('Channel', error);
      return;
    }
    setDraft('');
    await load();
  };

  const sendPickedMedia = async (media: PickedMessageMedia) => {
    if (sending) return;
    setSending(true);
    const { error } = await sendDivisionChannelMessageMedia(supabase, {
      rootId,
      companyId,
      caption: draft,
      media,
    });
    setSending(false);
    if (error) {
      Alert.alert('Channel', error);
      return;
    }
    setDraft('');
    await load();
  };

  const attachAndSend = () => {
    if (sending) return;
    void import('../../lib/messageMediaCapture').then(({ openMessageMediaCaptureMenu }) => {
      openMessageMediaCaptureMenu((media) => void sendPickedMedia(media));
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          <Text style={styles.backLabel}>Channels</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {divisionName}
        </Text>
        <Text style={styles.badge}>Division channel</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.secondary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={posts.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No posts yet — start the conversation.</Text>
          }
          renderItem={({ item }) => {
            const mine = item.sender_id === currentUserId;
            return (
              <View style={[styles.bubbleWrap, mine && styles.bubbleWrapMine]}>
                {!mine ? <Text style={styles.sender}>{item.sender_name}</Text> : null}
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleThem]}>
                  <MessageMediaContent
                    content={item.content}
                    messageKind={item.message_kind}
                    mediaStoragePath={item.media_storage_path}
                    mediaMime={item.media_mime}
                    mediaFileName={item.media_file_name}
                    senderId={item.sender_id}
                  />
                </View>
              </View>
            );
          }}
        />
      )}
      <View style={styles.composer}>
        <View style={styles.composerRow}>
          {mediaEnabled ? (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={attachAndSend}
              disabled={sending}
              accessibilityLabel="Attach photo or video"
            >
              <Ionicons name="attach" size={22} color={theme.colors.secondary} />
            </TouchableOpacity>
          ) : null}
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Message your division…"
            multiline
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => void handleSend()}
            disabled={!draft.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  backLabel: { color: theme.colors.primary, fontSize: 16 },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  badge: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  list: { padding: 12, paddingBottom: 24 },
  emptyList: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  emptyText: { textAlign: 'center', color: theme.colors.textSecondary },
  bubbleWrap: { marginBottom: 12, alignItems: 'flex-start', maxWidth: '88%' },
  bubbleWrapMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  sender: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 2 },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.background,
  },
  bubbleMine: { backgroundColor: theme.colors.primary },
  bubbleThem: {},
  composer: {
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  iconBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: theme.colors.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
