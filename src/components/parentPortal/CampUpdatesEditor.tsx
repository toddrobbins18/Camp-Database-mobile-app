import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { theme } from '../../theme/theme';
import { formatCampDateTime } from '../../lib/campTime';
import {
  fetchCampUpdateForSeason,
  saveCampUpdateForSeason,
  type ParentPortalCampUpdateDraft,
} from '../../lib/parentPortalCampUpdates';

type CampUpdatesEditorProps = {
  companyId: string;
  season: string;
};

export function CampUpdatesEditor({ companyId, season }: CampUpdatesEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ParentPortalCampUpdateDraft>({
    title: 'Camp updates',
    body: '',
    is_published: false,
  });
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const row = await fetchCampUpdateForSeason(supabase, companyId, season);
      if (row) {
        setDraft({ title: row.title, body: row.body, is_published: row.is_published });
        setUpdatedAt(row.updated_at);
        setPublishedAt(row.published_at);
      } else {
        setDraft({ title: 'Camp updates', body: '', is_published: false });
        setUpdatedAt(null);
        setPublishedAt(null);
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load camp update');
    } finally {
      setLoading(false);
    }
  }, [companyId, season]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (draft.is_published && !draft.body.trim()) {
      Alert.alert('Missing message', 'Add a message before publishing to families.');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const saved = await saveCampUpdateForSeason(supabase, companyId, season, draft, user?.id);
      setUpdatedAt(saved.updated_at);
      setPublishedAt(saved.published_at);
      Alert.alert('Saved', draft.is_published ? 'Camp update published' : 'Camp update saved');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save camp update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="megaphone-outline" size={20} color="#92400e" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Camp updates</Text>
          <Text style={styles.subtitle}>Parent portal Home tab · season {season}</Text>
        </View>
        <View style={[styles.badge, draft.is_published ? styles.badgePublished : styles.badgeDraft]}>
          <Text style={[styles.badgeText, draft.is_published ? styles.badgeTextPublished : undefined]}>
            {draft.is_published ? 'Published' : 'Draft'}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.secondary} style={{ marginVertical: 16 }} />
      ) : (
        <>
          <Text style={styles.label}>Headline</Text>
          <TextInput
            style={styles.input}
            value={draft.title}
            onChangeText={(title) => setDraft((d) => ({ ...d, title }))}
            placeholder="Camp updates"
          />
          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={draft.body}
            onChangeText={(body) => setDraft((d) => ({ ...d, body }))}
            placeholder="Don't forget! Friday is Water Day…"
            multiline
            textAlignVertical="top"
          />
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Show in parent portal</Text>
              <Text style={styles.switchHint}>Families see this on their Home tab when published.</Text>
            </View>
            <Switch
              value={draft.is_published}
              onValueChange={(is_published) => setDraft((d) => ({ ...d, is_published }))}
            />
          </View>
          {(updatedAt || publishedAt) ? (
            <Text style={styles.meta}>
              {publishedAt ? `Published ${formatCampDateTime(publishedAt)}` : 'Not published yet'}
              {updatedAt ? ` · Last saved ${formatCampDateTime(updatedAt)}` : ''}
            </Text>
          ) : null}
          <TouchableOpacity style={styles.saveBtn} onPress={() => void save()} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{draft.is_published ? 'Save & publish' : 'Save draft'}</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  badgeDraft: { backgroundColor: theme.colors.background },
  badgePublished: { backgroundColor: '#059669', borderColor: '#059669' },
  badgeText: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
  badgeTextPublished: { color: '#fff' },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  textarea: { minHeight: 100 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  switchHint: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  meta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 10 },
  saveBtn: {
    marginTop: 14,
    backgroundColor: theme.colors.secondary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
