import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { supabase } from '../../lib/supabase';
import {
  listStaffParentPortalAnnouncements,
  publishParentPortalAnnouncement,
  type ParentPortalAnnouncement,
} from '../../lib/parentPortalAnnouncements';
import { formatCampDateTime } from '../../lib/campTime';
import { StyledCard } from '../StyledCard';

type Props = {
  companyId: string;
  season: string;
};

export function StaffAnnouncementsPanel({ companyId, season }: Props) {
  const [rows, setRows] = useState<ParentPortalAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('Camp announcement');
  const [body, setBody] = useState('');
  const [publishing, setPublishing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { rows: list, error } = await listStaffParentPortalAnnouncements(supabase, companyId, season);
    if (error) Alert.alert('Announcements', error);
    setRows(list);
    setLoading(false);
  }, [companyId, season]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const publish = async () => {
    const text = body.trim();
    if (!text || publishing) return;
    setPublishing(true);
    const { error } = await publishParentPortalAnnouncement(
      supabase,
      companyId,
      season,
      title.trim() || 'Camp announcement',
      text,
    );
    setPublishing(false);
    if (error) {
      Alert.alert('Announcements', error);
      return;
    }
    setBody('');
    void refresh();
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <StyledCard style={styles.card}>
        <Text style={styles.title}>Publish to families</Text>
        <Text style={styles.sub}>
          Shows on parent portal home (season {season}). Camp-wide — not a private chat.
        </Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
        />
        <TextInput
          style={[styles.input, styles.bodyInput]}
          value={body}
          onChangeText={setBody}
          placeholder="Write your announcement…"
          multiline
        />
        <TouchableOpacity
          style={[styles.btn, (!body.trim() || publishing) && styles.btnOff]}
          disabled={!body.trim() || publishing}
          onPress={() => void publish()}
        >
          {publishing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="megaphone-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Publish to parent portal</Text>
            </>
          )}
        </TouchableOpacity>
      </StyledCard>

      <StyledCard style={styles.card}>
        <Text style={styles.listTitle}>Recent ({season})</Text>
        {loading ? (
          <ActivityIndicator color={theme.colors.secondary} style={{ marginTop: 16 }} />
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>No announcements yet.</Text>
        ) : (
          rows.map((row) => (
            <View key={row.id} style={styles.row}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              <Text style={styles.rowBody} numberOfLines={4}>
                {row.body}
              </Text>
              <Text style={styles.rowDate}>{formatCampDateTime(row.published_at)}</Text>
            </View>
          ))
        )}
      </StyledCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 32, gap: 16 },
  card: { padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  sub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 6, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 10,
    color: theme.colors.text,
  },
  bodyInput: { minHeight: 120, textAlignVertical: 'top' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
  },
  btnOff: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '600' },
  listTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  empty: { color: theme.colors.textSecondary, marginTop: 8 },
  row: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, paddingVertical: 12 },
  rowTitle: { fontWeight: '600', color: theme.colors.text },
  rowBody: { color: theme.colors.textSecondary, marginTop: 4, fontSize: 14 },
  rowDate: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 },
});
