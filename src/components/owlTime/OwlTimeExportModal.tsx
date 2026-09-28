import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import {
  owlTimeExportFormatMeta,
  shareOwlTimeExport,
  type OwlTimeExportFormat,
  type OwlTimeReportDataset,
} from '../../lib/owlTimeReportExport';

type Props = {
  visible: boolean;
  onClose: () => void;
  dataset: OwlTimeReportDataset | null;
};

const FORMAT_OPTIONS: { id: OwlTimeExportFormat; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'csv', icon: 'grid-outline' },
  { id: 'pdf', icon: 'document-text-outline' },
  { id: 'xlsx', icon: 'document-outline' },
];

const PREVIEW_ROW_LIMIT = 10;

export function OwlTimeExportModal({ visible, onClose, dataset }: Props) {
  const [format, setFormat] = useState<OwlTimeExportFormat>('pdf');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (visible) setFormat('pdf');
  }, [visible, dataset?.kind, dataset?.dateLabel]);

  const previewRows = dataset?.rows.slice(0, PREVIEW_ROW_LIMIT) ?? [];
  const hiddenCount = Math.max(0, (dataset?.rows.length ?? 0) - previewRows.length);
  const filename = dataset ? `${dataset.kind}-${dataset.season}-${dataset.dateLabel}` : '';

  const handleShare = async () => {
    if (!dataset?.rows.length) return;
    setSharing(true);
    try {
      await shareOwlTimeExport(format, dataset);
    } catch (e: unknown) {
      Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Export {dataset?.title ?? 'Report'}</Text>
            <Text style={styles.subtitle}>{dataset?.subtitle ?? 'Choose a format to share.'}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {dataset?.meta?.length ? (
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>
                {dataset.rows.length} row{dataset.rows.length !== 1 ? 's' : ''}
              </Text>
            </View>
            {dataset.meta.map((item) => (
              <View key={item.label} style={styles.metaBadgeOutline}>
                <Text style={styles.metaBadgeOutlineText}>
                  {item.label}: {item.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Format</Text>
        <View style={styles.formatList}>
          {FORMAT_OPTIONS.map(({ id, icon }) => {
            const meta = owlTimeExportFormatMeta(id);
            const selected = format === id;
            return (
              <TouchableOpacity
                key={id}
                style={[styles.formatOption, selected && styles.formatOptionSelected]}
                onPress={() => setFormat(id)}
              >
                <View style={[styles.formatIcon, selected && styles.formatIconSelected]}>
                  <Ionicons name={icon} size={18} color={selected ? '#fff' : theme.colors.textSecondary} />
                </View>
                <View style={styles.formatText}>
                  <Text style={styles.formatLabel}>{meta.label}</Text>
                  <Text style={styles.formatDesc}>{meta.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Preview</Text>
        {!dataset || dataset.rows.length === 0 ? (
          <View style={styles.emptyPreview}>
            <Text style={styles.emptyPreviewText}>No rows to export for the current filters.</Text>
          </View>
        ) : (
          <ScrollView horizontal style={styles.previewScroll}>
            <View>
              <View style={styles.tableHeaderRow}>
                {dataset.headers.map((header) => (
                  <Text key={header} style={styles.tableHeaderCell}>
                    {header}
                  </Text>
                ))}
              </View>
              {previewRows.map((row, rowIndex) => (
                <View key={rowIndex} style={[styles.tableRow, rowIndex % 2 === 1 && styles.tableRowAlt]}>
                  {row.map((cell, cellIndex) => (
                    <Text key={cellIndex} style={styles.tableCell}>
                      {String(cell ?? '')}
                    </Text>
                  ))}
                </View>
              ))}
              {hiddenCount > 0 ? (
                <Text style={styles.moreRows}>
                  + {hiddenCount} more row{hiddenCount !== 1 ? 's' : ''} in the exported file
                </Text>
              ) : null}
            </View>
          </ScrollView>
        )}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shareBtn, (!dataset?.rows.length || sharing) && styles.shareBtnDisabled]}
            onPress={() => void handleShare()}
            disabled={!dataset?.rows.length || sharing}
          >
            {sharing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="share-outline" size={18} color="#fff" />
                <Text style={styles.shareBtnText}>
                  Share {owlTimeExportFormatMeta(format).label}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        {filename ? <Text style={styles.filename}>{filename}</Text> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerText: { flex: 1 },
  title: { ...theme.typography.h3, fontSize: 18 },
  subtitle: { ...theme.typography.bodySmall, marginTop: 4 },
  closeBtn: { padding: 4 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  metaBadge: {
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaBadgeText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  metaBadgeOutline: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaBadgeOutlineText: { fontSize: 12, color: theme.colors.textSecondary },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.md,
    marginTop: 12,
    marginBottom: 6,
  },
  formatList: { paddingHorizontal: theme.spacing.md, gap: 8 },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  formatOptionSelected: {
    borderColor: theme.colors.secondary,
    backgroundColor: '#eff6ff',
  },
  formatIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatIconSelected: { backgroundColor: theme.colors.secondary },
  formatText: { flex: 1 },
  formatLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  formatDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  emptyPreview: {
    marginHorizontal: theme.spacing.md,
    padding: 24,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  emptyPreviewText: { fontSize: 13, color: theme.colors.textSecondary },
  previewScroll: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
  },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: theme.colors.primary },
  tableHeaderCell: {
    width: 120,
    padding: 8,
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  tableRow: { flexDirection: 'row' },
  tableRowAlt: { backgroundColor: '#f8fafc' },
  tableCell: {
    width: 120,
    padding: 8,
    fontSize: 11,
    color: theme.colors.text,
  },
  moreRows: {
    padding: 10,
    fontSize: 11,
    color: theme.colors.textSecondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.secondary,
  },
  shareBtnDisabled: { opacity: 0.5 },
  shareBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  filename: {
    textAlign: 'center',
    fontSize: 11,
    color: theme.colors.textSecondary,
    paddingBottom: 8,
    backgroundColor: theme.colors.surface,
  },
});
