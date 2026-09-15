import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isValid, parse } from 'date-fns';
import { theme } from '../theme/theme';
import { useCompany } from '../contexts/CompanyContext';
import {
  BRACELETS,
  DATE_FMT,
  LEVEL_OPTIONS,
  PASS_OPTIONS,
  PROCTORS,
  SKILL_OPTIONS,
  type BraceletColor,
  type BraceletRecord,
  type LevelRecord,
  type LevelStatus,
  type SkillStatus,
  fetchSwimRosterChildren,
  levelFromSkills,
  mergeBracelets,
  mergeLevels,
} from '../lib/swimProgram';

const BRACELET_COLORS: Record<BraceletColor, { bg: string; text: string; border: string }> = {
  Red: { bg: '#fee2e2', text: '#ef4444', border: '#fca5a5' },
  Orange: { bg: '#ffedd5', text: '#f97316', border: '#fdba74' },
  Yellow: { bg: '#fef9c3', text: '#eab308', border: '#fde047' },
  Green: { bg: '#dcfce7', text: '#10b981', border: '#86efac' },
  Blue: { bg: '#e0f2fe', text: '#0ea5e9', border: '#7dd3fc' },
};

function parseStoredDate(value: string): Date | undefined {
  if (!value) return undefined;
  const d = parse(value, DATE_FMT, new Date());
  if (isValid(d)) return d;
  const fallback = new Date(value);
  return isValid(fallback) ? fallback : undefined;
}

function OptionPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setOpen(true)}>
        <Text style={[styles.pickerBtnText, !value && styles.pickerPlaceholder]}>{value || '—'}</Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerSheetTitle}>{label}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <TouchableOpacity style={styles.pickerOption} onPress={() => { onChange(''); setOpen(false); }}>
                <Text style={styles.pickerOptionText}>—</Text>
              </TouchableOpacity>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.pickerOption, value === opt && styles.pickerOptionActive]}
                  onPress={() => { onChange(opt); setOpen(false); }}
                >
                  <Text style={[styles.pickerOptionText, value === opt && styles.pickerOptionTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const selected = parseStoredDate(value) ?? new Date();

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.pickerBtn}
        onPress={() => {
          if (!value) onChange(format(new Date(), DATE_FMT));
          setShow(true);
        }}
      >
        <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
        <Text style={[styles.pickerBtnText, !value && styles.pickerPlaceholder, { marginLeft: 6 }]}>
          {value || 'Pick date'}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={selected}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            setShow(Platform.OS === 'ios');
            if (d) onChange(format(d, DATE_FMT));
          }}
        />
      )}
    </View>
  );
}

export function SwimProgramScreen({ navigation }: any) {
  const { companyId, season } = useCompany();
  const [activeTab, setActiveTab] = useState<'bracelets' | 'levels'>('bracelets');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [braceletData, setBraceletData] = useState<BraceletRecord[]>([]);
  const [levelData, setLevelData] = useState<LevelRecord[]>([]);
  const [selectedBracelet, setSelectedBracelet] = useState<BraceletRecord | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<LevelRecord | null>(null);

  const loadRoster = useCallback(async () => {
    if (!companyId || !season) {
      setBraceletData([]);
      setLevelData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const children = await fetchSwimRosterChildren(companyId, season);
      setBraceletData((prev) => {
        const existing = new Map(prev.map((b) => [b.id, b]));
        return mergeBracelets(existing, children);
      });
      setLevelData((prev) => {
        const existing = new Map(prev.map((l) => [l.id, l]));
        return mergeLevels(existing, children);
      });
    } catch (err) {
      console.error('[SwimProgram] roster load error:', err);
      Alert.alert('Error', 'Could not load swim roster.');
    } finally {
      setLoading(false);
    }
  }, [companyId, season]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  const filteredBracelets = useMemo(
    () =>
      braceletData.filter(
        (b) =>
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.group.toLowerCase().includes(search.toLowerCase()),
      ),
    [search, braceletData],
  );

  const filteredLevels = useMemo(
    () =>
      levelData.filter(
        (l) =>
          l.name.toLowerCase().includes(search.toLowerCase()) ||
          l.group.toLowerCase().includes(search.toLowerCase()),
      ),
    [search, levelData],
  );

  const braceletCounts = BRACELETS.reduce<Record<string, number>>((acc, c) => {
    acc[c] = braceletData.filter((b) => b.currentBracelet === c).length;
    return acc;
  }, {});

  const totalCompleteLevels = levelData.reduce(
    (acc, r) =>
      acc +
      [r.goldfishLevel, r.minnowLevel, r.tadpoleLevel, r.redCross, r.redCross2, r.redCross3, r.redCross4, r.frog].filter(
        (s) => s === 'Complete',
      ).length,
    0,
  );

  const updateBracelet = (id: string, patch: Partial<BraceletRecord>) => {
    setBraceletData((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    setSelectedBracelet((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
  };

  const updateLevel = (id: string, patch: Partial<LevelRecord> | ((r: LevelRecord) => Partial<LevelRecord>)) => {
    setLevelData((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const p = typeof patch === 'function' ? patch(r) : patch;
        return { ...r, ...p, lastModified: 'Just now' };
      }),
    );
    setSelectedLevel((prev) => {
      if (prev?.id !== id) return prev;
      const p = typeof patch === 'function' ? patch(prev) : patch;
      return { ...prev, ...p, lastModified: 'Just now' };
    });
  };

  const updateSkill = (id: string, group: 'goldfish' | 'minnow' | 'tadpole', idx: number, value: SkillStatus) => {
    updateLevel(id, (r) => {
      const next = [...r[group]];
      next[idx] = value;
      const levelKey = `${group}Level` as 'goldfishLevel' | 'minnowLevel' | 'tadpoleLevel';
      return { [group]: next, [levelKey]: levelFromSkills(next) } as Partial<LevelRecord>;
    });
  };

  const sendEmail = (record: BraceletRecord) => {
    updateBracelet(record.id, { emailSent: true });
    Alert.alert('Email queued', `Bracelet notice to ${record.name}'s family.`);
  };

  const renderBraceletPill = (color: BraceletColor | '') => {
    if (!color) return <Text style={styles.emptyText}>—</Text>;
    const c = BRACELET_COLORS[color];
    return (
      <View style={[styles.braceletPillSm, { backgroundColor: c.bg, borderColor: c.border }]}>
        <Text style={[styles.braceletPillTextSm, { color: c.text }]}>● {color}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Ionicons name="water" size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Swim Program</Text>
          <Text style={styles.headerSubtitle}>Bracelet tracking and skill-level reporting</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search camper or group..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.statsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {BRACELETS.map((color) => (
            <View key={color} style={styles.statCard}>
              <View
                style={[
                  styles.braceletPill,
                  { backgroundColor: BRACELET_COLORS[color].bg, borderColor: BRACELET_COLORS[color].border },
                ]}
              >
                <Text style={[styles.braceletPillText, { color: BRACELET_COLORS[color].text }]}>● {color}</Text>
              </View>
              <Text style={styles.statNumber}>{braceletCounts[color]}</Text>
              <Text style={styles.statLabel}>campers</Text>
            </View>
          ))}
          <View style={styles.statCard}>
            <View style={[styles.braceletPill, { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }]}>
              <Ionicons name="trophy" size={12} color="#10b981" />
            </View>
            <Text style={styles.statNumber}>{totalCompleteLevels}</Text>
            <Text style={styles.statLabel}>levels complete</Text>
          </View>
        </ScrollView>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bracelets' && styles.tabActive]}
          onPress={() => setActiveTab('bracelets')}
        >
          <Text style={[styles.tabText, activeTab === 'bracelets' && styles.tabTextActive]}>Swim Bracelets</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'levels' && styles.tabActive]}
          onPress={() => setActiveTab('levels')}
        >
          <Text style={[styles.tabText, activeTab === 'levels' && styles.tabTextActive]}>Swim Level Report</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView style={styles.content}>
          {activeTab === 'bracelets' ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Current bracelet status & test history</Text>
              </View>
              {filteredBracelets.length === 0 ? (
                <Text style={styles.emptyState}>No campers on roster for this season.</Text>
              ) : (
                filteredBracelets.map((b) => (
                  <TouchableOpacity key={b.id} style={styles.listItem} onPress={() => setSelectedBracelet(b)}>
                    <View style={styles.listMainInfo}>
                      <Text style={styles.camperName}>{b.name}</Text>
                      <Text style={styles.camperGroup}>
                        {b.group} • {b.divisionLeader.split(' ')[0]}
                      </Text>
                    </View>
                    <View style={styles.listSubInfo}>
                      <View style={styles.infoBlock}>
                        <Text style={styles.infoLabel}>Current Bracelet</Text>
                        {renderBraceletPill(b.currentBracelet)}
                      </View>
                      <View style={styles.infoBlock}>
                        <Text style={styles.infoLabel}>Test 1</Text>
                        <Text style={styles.infoValue}>{b.proctor1 || '—'}</Text>
                        <Text style={styles.infoDate}>{b.date1 || '—'}</Text>
                      </View>
                      <View style={styles.actionBlock}>
                        {b.emailSent ? (
                          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                        ) : (
                          <View style={styles.sendButton}>
                            <Ionicons name="mail" size={14} color={theme.colors.primary} />
                            <Text style={styles.sendButtonText}>Send</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Skill checklist by level</Text>
                <Text style={styles.cardHint}>Tap a row for full breakdown</Text>
              </View>
              {filteredLevels.length === 0 ? (
                <Text style={styles.emptyState}>No campers on roster for this season.</Text>
              ) : (
                filteredLevels.map((l) => (
                  <TouchableOpacity key={l.id} style={styles.listItem} onPress={() => setSelectedLevel(l)}>
                    <View style={styles.listMainInfo}>
                      <Text style={styles.camperName}>{l.name}</Text>
                      <Text style={styles.camperGroup}>{l.group}</Text>
                    </View>
                    <View style={styles.listSubInfoLevels}>
                      <View style={styles.levelBlock}>
                        <Text style={styles.infoLabel}>Goldfish</Text>
                        <Text style={l.goldfishLevel === 'Complete' ? styles.levelComplete : styles.levelIncomplete}>
                          {l.goldfishLevel}
                        </Text>
                      </View>
                      <View style={styles.levelBlock}>
                        <Text style={styles.infoLabel}>Minnow</Text>
                        <Text style={l.minnowLevel === 'Complete' ? styles.levelComplete : styles.levelIncomplete}>
                          {l.minnowLevel}
                        </Text>
                      </View>
                      <View style={styles.levelBlock}>
                        <Text style={styles.infoLabel}>Tadpole</Text>
                        <Text style={l.tadpoleLevel === 'Complete' ? styles.levelComplete : styles.levelIncomplete}>
                          {l.tadpoleLevel}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.lastModified}>Last modified {l.lastModified}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Bracelet detail modal */}
      <Modal visible={!!selectedBracelet} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.detailModal}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>{selectedBracelet?.name}</Text>
            <TouchableOpacity onPress={() => setSelectedBracelet(null)}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          {selectedBracelet && (
            <ScrollView style={styles.detailBody}>
              <View style={styles.detailMetaRow}>
                <View style={styles.detailMetaItem}>
                  <Text style={styles.fieldLabel}>Group</Text>
                  <Text style={styles.detailMetaValue}>{selectedBracelet.group}</Text>
                </View>
                <View style={styles.detailMetaItem}>
                  <Text style={styles.fieldLabel}>Division Leader</Text>
                  <Text style={styles.detailMetaValue}>{selectedBracelet.divisionLeader}</Text>
                </View>
              </View>

              <Text style={styles.sectionHeading}>Current Bracelet</Text>
              <View style={styles.colorRow}>
                <TouchableOpacity
                  style={[styles.colorChip, !selectedBracelet.currentBracelet && styles.colorChipActive]}
                  onPress={() => updateBracelet(selectedBracelet.id, { currentBracelet: '' })}
                >
                  <Text style={styles.colorChipText}>—</Text>
                </TouchableOpacity>
                {BRACELETS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorChip,
                      { backgroundColor: BRACELET_COLORS[c].bg, borderColor: BRACELET_COLORS[c].border },
                      selectedBracelet.currentBracelet === c && styles.colorChipActive,
                    ]}
                    onPress={() => updateBracelet(selectedBracelet.id, { currentBracelet: c })}
                  >
                    <Text style={[styles.colorChipText, { color: BRACELET_COLORS[c].text }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {[1, 2, 3].map((n) => {
                const pk = `proctor${n}` as 'proctor1' | 'proctor2' | 'proctor3';
                const dk = `date${n}` as 'date1' | 'date2' | 'date3';
                const nk = `note${n}` as 'note1' | 'note2' | 'note3';
                return (
                  <View key={n} style={styles.testSection}>
                    <Text style={styles.sectionHeading}>Test {n}</Text>
                    <OptionPicker
                      label="Proctor"
                      value={selectedBracelet[pk]}
                      options={PROCTORS}
                      onChange={(v) => updateBracelet(selectedBracelet.id, { [pk]: v })}
                    />
                    <DateField
                      label="Date"
                      value={selectedBracelet[dk]}
                      onChange={(v) => updateBracelet(selectedBracelet.id, { [dk]: v })}
                    />
                    <OptionPicker
                      label="Result"
                      value={selectedBracelet[nk]}
                      options={PASS_OPTIONS}
                      onChange={(v) => updateBracelet(selectedBracelet.id, { [nk]: v })}
                    />
                  </View>
                );
              })}

              <View style={styles.emailRow}>
                {selectedBracelet.emailSent ? (
                  <TouchableOpacity
                    style={styles.emailBtnOutline}
                    onPress={() => updateBracelet(selectedBracelet.id, { emailSent: false })}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                    <Text style={styles.emailBtnText}>Mark as not sent</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.emailBtn} onPress={() => sendEmail(selectedBracelet)}>
                    <Ionicons name="mail" size={16} color="#fff" />
                    <Text style={styles.emailBtnTextPrimary}>Send email</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Level detail modal */}
      <Modal visible={!!selectedLevel} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.detailModal}>
          <View style={styles.detailHeader}>
            <View>
              <Text style={styles.detailTitle}>{selectedLevel?.name}</Text>
              <Text style={styles.detailSubtitle}>{selectedLevel?.group}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedLevel(null)}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          {selectedLevel && (
            <ScrollView style={styles.detailBody}>
              {(
                [
                  { label: 'Goldfish', code: '1A', key: 'goldfish' as const, levelKey: 'goldfishLevel' as const },
                  { label: 'Minnow', code: '1B', key: 'minnow' as const, levelKey: 'minnowLevel' as const },
                  { label: 'Tadpole', code: '1C', key: 'tadpole' as const, levelKey: 'tadpoleLevel' as const },
                ] as const
              ).map((group) => (
                <View key={group.key} style={styles.levelSection}>
                  <View style={styles.levelSectionHeader}>
                    <Text style={styles.sectionHeading}>{group.label}</Text>
                    <OptionPicker
                      label="Level"
                      value={selectedLevel[group.levelKey]}
                      options={LEVEL_OPTIONS}
                      onChange={(v) =>
                        updateLevel(selectedLevel.id, { [group.levelKey]: v as LevelStatus })
                      }
                    />
                  </View>
                  {selectedLevel[group.key].map((skill, i) => (
                    <OptionPicker
                      key={`${group.key}-${i}`}
                      label={`${group.code}${i + 1}`}
                      value={skill}
                      options={SKILL_OPTIONS}
                      onChange={(v) => updateSkill(selectedLevel.id, group.key, i, v as SkillStatus)}
                    />
                  ))}
                </View>
              ))}

              {(
                [
                  ['Red Cross L1', 'redCross'],
                  ['Red Cross L2', 'redCross2'],
                  ['Red Cross L3', 'redCross3'],
                  ['Red Cross L4', 'redCross4'],
                  ['Frog Level', 'frog'],
                ] as const
              ).map(([label, key]) => (
                <OptionPicker
                  key={key}
                  label={label}
                  value={selectedLevel[key]}
                  options={LEVEL_OPTIONS}
                  onChange={(v) => updateLevel(selectedLevel.id, { [key]: v as LevelStatus })}
                />
              ))}

              <Text style={styles.lastModifiedFooter}>Last modified {selectedLevel.lastModified}</Text>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  menuButton: { marginRight: 8, padding: 4 },
  header: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#7dd3fc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  headerSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  statsContainer: { paddingLeft: 16, marginBottom: 16, height: 100 },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginRight: 12,
    width: 110,
    alignItems: 'flex-start',
  },
  braceletPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  braceletPillText: { fontSize: 11, fontWeight: '600' },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.primary },
  content: { flex: 1, padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#fafafa',
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  cardHint: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  emptyState: { padding: 24, textAlign: 'center', color: theme.colors.textSecondary },
  listItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  listMainInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  camperName: { fontSize: 16, fontWeight: '600', color: theme.colors.text, flex: 1 },
  camperGroup: { fontSize: 14, color: theme.colors.textSecondary },
  listSubInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listSubInfoLevels: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  infoBlock: { flex: 1 },
  actionBlock: { justifyContent: 'center', alignItems: 'center', width: 60 },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sendButtonText: { fontSize: 12, color: theme.colors.primary, marginLeft: 4 },
  levelBlock: { width: '33%', marginBottom: 8 },
  infoLabel: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 4 },
  infoValue: { fontSize: 13, fontWeight: '500', color: theme.colors.text },
  infoDate: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  braceletPillSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  braceletPillTextSm: { fontSize: 11, fontWeight: '600' },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary },
  levelComplete: { fontSize: 12, fontWeight: '600', color: '#10b981' },
  levelIncomplete: { fontSize: 12, fontWeight: '500', color: '#f59e0b' },
  lastModified: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 8 },
  detailModal: { flex: 1, backgroundColor: '#fff' },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  detailSubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
  detailBody: { flex: 1, padding: 16 },
  detailMetaRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  detailMetaItem: { flex: 1 },
  detailMetaValue: { fontSize: 15, fontWeight: '500', color: theme.colors.text },
  sectionHeading: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 8, marginTop: 8 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  colorChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  colorChipActive: { borderWidth: 2, borderColor: theme.colors.primary },
  colorChipText: { fontSize: 13, fontWeight: '600' },
  testSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  fieldBlock: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
  },
  pickerBtnText: { fontSize: 14, color: theme.colors.text },
  pickerPlaceholder: { color: theme.colors.textSecondary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '60%',
  },
  pickerSheetTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: theme.colors.text },
  pickerOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pickerOptionActive: { backgroundColor: '#eff6ff' },
  pickerOptionText: { fontSize: 16, color: theme.colors.text },
  pickerOptionTextActive: { color: theme.colors.primary, fontWeight: '600' },
  emailRow: { marginTop: 20, marginBottom: 32 },
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emailBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emailBtnText: { fontSize: 15, color: theme.colors.text },
  emailBtnTextPrimary: { fontSize: 15, color: '#fff', fontWeight: '600' },
  levelSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  levelSectionHeader: { marginBottom: 4 },
  lastModifiedFooter: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
    marginBottom: 32,
  },
});
