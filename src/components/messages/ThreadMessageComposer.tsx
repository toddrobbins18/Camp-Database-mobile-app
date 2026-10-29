import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import type { PickedMessageMedia } from '../../lib/messageMedia';

type Props = {
  threadId: string;
  messageMediaEnabled: boolean;
  threadPendingMedia: PickedMessageMedia | null;
  setThreadPendingMedia: (v: PickedMessageMedia | null) => void;
  threadSending: boolean;
  onSend: (text: string) => void | Promise<void>;
  onPickMedia: () => void;
};

/** Isolated composer so typing does not re-render the message list (fixes iOS one-char input bug). */
function ThreadMessageComposerInner({
  threadId,
  messageMediaEnabled,
  threadPendingMedia,
  setThreadPendingMedia,
  threadSending,
  onSend,
  onPickMedia,
}: Props) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const onSendRef = useRef(onSend);
  onSendRef.current = onSend;
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setDraft('');
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, [threadId]);

  const handleSend = () => {
    const text = draft.trim();
    if (threadSending || (!text && !threadPendingMedia)) return;
    void (async () => {
      try {
        await onSendRef.current(text);
        setDraft('');
      } catch {
        /* keep draft */
      }
    })();
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {threadPendingMedia ? (
        <View style={styles.attachmentChip}>
          <Ionicons name="document-attach-outline" size={16} color={theme.colors.secondary} />
          <Text style={styles.attachmentName} numberOfLines={1}>
            {threadPendingMedia.fileName}
          </Text>
          <TouchableOpacity onPress={() => setThreadPendingMedia(null)} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.bar}>
        {messageMediaEnabled ? (
          <TouchableOpacity style={styles.attachBtn} onPress={onPickMedia}>
            <Ionicons name="add" size={28} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Message"
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          maxLength={4000}
          value={draft}
          onChangeText={setDraft}
          blurOnSubmit={false}
          editable={!threadSending}
          autoCorrect
          autoCapitalize="sentences"
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (threadSending || (!draft.trim() && !threadPendingMedia)) && styles.sendBtnDisabled,
          ]}
          disabled={threadSending || (!draft.trim() && !threadPendingMedia)}
          onPress={handleSend}
        >
          {threadSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Ignore onSend/onPickMedia identity so inbox realtime updates do not remount the TextInput. */
export const ThreadMessageComposer = React.memo(ThreadMessageComposerInner, (prev, next) => {
  return (
    prev.threadId === next.threadId &&
    prev.threadSending === next.threadSending &&
    prev.messageMediaEnabled === next.messageMediaEnabled &&
    prev.threadPendingMedia?.fileName === next.threadPendingMedia?.fileName &&
    prev.threadPendingMedia?.uri === next.threadPendingMedia?.uri
  );
});

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  attachBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    maxHeight: 120,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginBottom: 2,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: { opacity: 0.45 },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  attachmentName: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
  },
});
