import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { theme } from '../../theme/theme';
import { fetchMessageProfileLabels } from '../../lib/messageProfiles';
import { MessageMediaContent } from '../MessageMediaContent';
import {
  messageMediaEnabledForCamp,
  pickMessageMediaFromDevice,
  sendGroupMessageMedia,
} from '../../lib/messageMedia';

type GroupMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  message_kind?: string | null;
  media_storage_path?: string | null;
  media_mime?: string | null;
  media_file_name?: string | null;
  sender_name?: string;
};

type Props = {
  groupId: string;
  groupName: string;
  companyId: string | null | undefined;
  companySlug: string | null | undefined;
  currentUserId: string | null;
  senderDisplayName?: string | null;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function MessageGroupChatPanel({
  groupId,
  groupName,
  companyId,
  companySlug,
  currentUserId,
  senderDisplayName,
}: Props) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const mediaEnabled = messageMediaEnabledForCamp(companySlug);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('[group chat] load failed:', error.message);
      setLoading(false);
      return;
    }
    const rows = data ?? [];
    const ids = [...new Set(rows.map((r) => r.sender_id).filter(Boolean))];
    const labels =
      ids.length > 0 ? await fetchMessageProfileLabels(ids, companyId ?? undefined) : new Map();
    setMessages(
      rows.map((r) => ({
        ...r,
        sender_name: labels.get(r.sender_id) ?? 'Unknown',
      })),
    );
    setLoading(false);
  }, [groupId, companyId]);

  useEffect(() => {
    void loadMessages();
    const channel = supabase
      .channel(`group_messages:${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        () => {
          void loadMessages();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [groupId, loadMessages]);

  const notifyMembers = async (preview: string) => {
    if (!companyId || !currentUserId) return;
    const { data: members } = await supabase
      .from('message_group_members')
      .select('user_id')
      .eq('group_id', groupId);
    const others = (members ?? []).map((m) => m.user_id).filter((id) => id !== currentUserId);
    if (!others.length) return;
    const clipped = preview.length > 100 ? `${preview.slice(0, 100)}…` : preview;
    const name = senderDisplayName?.trim() || 'Someone';
    await supabase.from('messages').insert(
      others.map((recipient_id) => ({
        sender_id: currentUserId,
        recipient_id,
        subject: `New message in ${groupName}`,
        content: `${name}: ${clipped}`,
        read: false,
        group_id: groupId,
        company_id: companyId,
      })),
    );
  };

  const sendText = async () => {
    const text = draft.trim();
    if (!text || !currentUserId || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from('group_messages').insert({
        group_id: groupId,
        sender_id: currentUserId,
        content: text,
      });
      if (error) throw error;
      setDraft('');
      await notifyMembers(text);
      await loadMessages();
    } catch (e: any) {
      Alert.alert('Could not send', e?.message || 'Try again.');
    } finally {
      setSending(false);
    }
  };

  const attachAndSend = async () => {
    if (!currentUserId || !companyId || sending) return;
    const media = await pickMessageMediaFromDevice();
    if (!media) return;
    setSending(true);
    try {
      const { error, preview } = await sendGroupMessageMedia(supabase, {
        companyId,
        groupId,
        senderId: currentUserId,
        caption: draft.trim(),
        media,
      });
      if (error) throw new Error(error);
      setDraft('');
      await notifyMembers(preview);
      await loadMessages();
    } catch (e: any) {
      Alert.alert('Could not send attachment', e?.message || 'Try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={theme.colors.secondary} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.messagesBlock}>
        {messages.length === 0 ? (
          <Text style={styles.emptyHint}>No messages yet. Start the conversation below.</Text>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <View key={msg.id} style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                {!isMe ? <Text style={styles.bubbleName}>{msg.sender_name}</Text> : null}
                <MessageMediaContent
                  content={msg.content}
                  messageKind={msg.message_kind}
                  mediaStoragePath={msg.media_storage_path}
                  mediaMime={msg.media_mime}
                  mediaFileName={msg.media_file_name}
                  senderId={msg.sender_id}
                />
                <Text style={styles.bubbleTime}>{formatTime(msg.created_at)}</Text>
              </View>
            );
          })
        )}
      </View>
      <View style={styles.composer}>
        <View style={styles.composerRow}>
          {mediaEnabled ? (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => void attachAndSend()}
              disabled={sending}
              accessibilityLabel="Attach file"
            >
              <Ionicons name="attach" size={22} color={theme.colors.secondary} />
            </TouchableOpacity>
          ) : null}
          <TextInput
            style={styles.input}
            placeholder="Message the group…"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            maxLength={4000}
            value={draft}
            onChangeText={setDraft}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnOff]}
            disabled={!draft.trim() || sending}
            onPress={() => void sendText()}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.md,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  messagesBlock: {
    gap: theme.spacing.sm,
    minHeight: 80,
  },
  emptyHint: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: 4,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  bubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
  },
  bubbleName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  bubbleTime: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  composer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    fontSize: 16,
    color: theme.colors.text,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    backgroundColor: '#f9fafb',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: {
    opacity: 0.45,
  },
});
