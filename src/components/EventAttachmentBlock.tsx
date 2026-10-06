import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import {
  eventAttachmentKind,
  openEventAttachment,
  resolveEventAttachmentUrl,
} from '../lib/eventAttachment';

type EventAttachmentBlockProps = {
  fileUrl: string;
  fileName?: string | null;
};

export function EventAttachmentBlock({ fileUrl, fileName }: EventAttachmentBlockProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const label = fileName?.trim() || 'View attachment';
  const kind = eventAttachmentKind(fileName, fileUrl);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void resolveEventAttachmentUrl(fileUrl)
      .then((url) => {
        if (!cancelled) setResolvedUrl(url);
      })
      .catch(() => {
        if (!cancelled) setResolvedUrl(fileUrl);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Attachment</Text>
      <TouchableOpacity
        style={styles.linkRow}
        onPress={() => void openEventAttachment(fileUrl)}
        activeOpacity={0.8}
      >
        <Ionicons name="document-text-outline" size={20} color={theme.colors.textSecondary} />
        <Text style={styles.linkText} numberOfLines={2}>
          {label}
        </Text>
        <Ionicons name="open-outline" size={18} color={theme.colors.primary} />
      </TouchableOpacity>

      {loading ? (
        <View style={styles.previewLoading}>
          <ActivityIndicator size="small" color={theme.colors.secondary} />
        </View>
      ) : null}

      {!loading && resolvedUrl && kind === 'image' ? (
        <Image source={{ uri: resolvedUrl }} style={styles.imagePreview} resizeMode="contain" />
      ) : null}

      {!loading && kind === 'pdf' ? (
        <Text style={styles.hint}>Tap above to open the PDF.</Text>
      ) : null}

      {!loading && kind === 'other' ? (
        <Text style={styles.hint}>Tap above to open this file.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  previewLoading: {
    marginTop: 12,
    paddingVertical: 24,
    alignItems: 'center',
  },
  imagePreview: {
    marginTop: 12,
    width: '100%',
    height: 220,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
