import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { listParentPortalMedia, type ParentPortalMediaRow } from '../../lib/parentPortalMessaging';
import { MessageMediaContent } from '../MessageMediaContent';
import type { ParentPortalColors } from '../../lib/parentPortalTheme';
import { PP, ppFont } from '../../lib/parentPortalUi';

type Props = {
  companyId: string;
  currentUserId: string | null;
  colors: ParentPortalColors;
  onOpenThread: (threadRootId: string, childId: string | null) => void;
};

export function ParentPortalMediaGallery({ companyId, currentUserId, colors, onOpenThread }: Props) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [rows, setRows] = useState<ParentPortalMediaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { rows: media } = await listParentPortalMedia(supabase, companyId);
    setRows(media);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No photos or videos yet. Shared media from your threads will appear here.</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {rows.map((row) => {
        const isMe = currentUserId != null && row.sender_id === currentUserId;
        return (
          <TouchableOpacity
            key={row.message_id}
            style={styles.tile}
            activeOpacity={0.85}
            onPress={() => onOpenThread(row.thread_root_id, row.child_id)}
          >
            <Text style={styles.tileTitle} numberOfLines={1}>
              {row.child_name ?? 'Camper'}
            </Text>
            <Text style={styles.tileMeta}>{isMe ? 'You' : 'Camp'}</Text>
            <MessageMediaContent
              content={row.content ?? ''}
              messageKind={row.message_kind}
              mediaStoragePath={row.media_storage_path}
              mediaMime={row.media_mime}
              mediaFileName={row.media_file_name}
              senderId={row.sender_id}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function createStyles(colors: ParentPortalColors) {
  return StyleSheet.create({
    centered: { paddingVertical: 32, paddingHorizontal: 16, alignItems: 'center' },
    emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
    grid: { gap: 12 },
    tile: {
      borderRadius: PP.radiusLg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.elevated,
      padding: 12,
    },
    tileTitle: { fontSize: 13, fontFamily: ppFont.semibold, color: colors.brand },
    tileMeta: { fontSize: 11, color: colors.textMuted, marginBottom: 8 },
  });
}
