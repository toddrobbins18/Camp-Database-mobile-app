import React, { useEffect, useState } from 'react';
import { View, Text, Image, ActivityIndicator, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { createSignedMessageMediaUrl, type MessageKind } from '../lib/messageMedia';
import { MessageBody } from './MessageBody';
import { theme } from '../theme/theme';

type Props = {
  content: string;
  messageKind?: string | null;
  mediaStoragePath?: string | null;
  mediaMime?: string | null;
  mediaFileName?: string | null;
  senderId?: string | null;
  notificationType?: string | null;
  style?: object;
};

function MediaOpenRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.fileRow} onPress={onPress}>
      <Ionicons name={icon} size={20} color={theme.colors.secondary} />
      <Text style={styles.fileName} numberOfLines={2}>
        {label}
      </Text>
      <Ionicons name="open-outline" size={18} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );
}

export function MessageMediaContent({
  content,
  messageKind = 'text',
  mediaStoragePath,
  mediaFileName,
  senderId,
  notificationType,
  style,
}: Props) {
  const kind = (messageKind || 'text') as MessageKind;
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mediaStoragePath || kind === 'text') {
      setUrl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void createSignedMessageMediaUrl(supabase, mediaStoragePath).then((signed) => {
      if (cancelled) return;
      setUrl(signed);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [mediaStoragePath, kind]);

  if (kind === 'text' || !mediaStoragePath) {
    return (
      <MessageBody
        content={content}
        senderId={senderId}
        notificationType={notificationType}
        style={style}
      />
    );
  }

  if (loading) {
    return (
      <View style={[styles.row, style]}>
        <ActivityIndicator size="small" color={theme.colors.secondary} />
        <Text style={styles.muted}>Loading attachment…</Text>
      </View>
    );
  }

  if (!url) {
    return <Text style={styles.error}>Could not load attachment.</Text>;
  }

  const open = () => void Linking.openURL(url);
  const fileLabel = mediaFileName?.trim() || 'Open attachment';

  return (
    <View style={style}>
      {kind === 'image' ? (
        <TouchableOpacity onPress={open} activeOpacity={0.9}>
          <Image source={{ uri: url }} style={styles.image} resizeMode="contain" accessibilityLabel="Shared photo" />
        </TouchableOpacity>
      ) : null}
      {kind === 'video' ? (
        <MediaOpenRow icon="videocam-outline" label={fileLabel || 'Play video'} onPress={open} />
      ) : null}
      {kind === 'audio' ? (
        <MediaOpenRow icon="musical-notes-outline" label={fileLabel || 'Play audio'} onPress={open} />
      ) : null}
      {kind === 'file' ? <MediaOpenRow icon="document-attach-outline" label={fileLabel} onPress={open} /> : null}
      {content?.trim() ? (
        <MessageBody
          content={content}
          senderId={senderId}
          notificationType={notificationType}
          style={{ marginTop: 8 }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  muted: { fontSize: 12, color: theme.colors.textSecondary },
  error: { fontSize: 12, color: '#b91c1c' },
  image: { width: '100%', maxHeight: 280, borderRadius: 8, backgroundColor: theme.colors.background },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fileName: { flex: 1, fontSize: 14, color: theme.colors.text },
});
