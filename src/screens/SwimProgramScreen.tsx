import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';

// ─── Types ───
type BraceletColor = "Red" | "Orange" | "Yellow" | "Green" | "Blue";
type SkillStatus = "Achieved" | "Working Towards" | "—";
type LevelStatus = "Complete" | "Incomplete" | "—";

interface BraceletRecord {
  id: number;
  name: string;
  group: string;
  divisionLeader: string;
  currentBracelet: BraceletColor | "";
  proctor1: string; date1: string; note1: string;
  proctor2: string; date2: string; note2: string;
  proctor3: string; date3: string; note3: string;
  emailSent: boolean;
}

interface LevelRecord {
  id: number;
  name: string;
  group: string;
  goldfish: SkillStatus[];
  goldfishLevel: LevelStatus;
  minnow: SkillStatus[];
  minnowLevel: LevelStatus;
  tadpole: SkillStatus[];
  tadpoleLevel: LevelStatus;
  redCross: LevelStatus;
  redCross2: LevelStatus;
  redCross3: LevelStatus;
  redCross4: LevelStatus;
  frog: LevelStatus;
  lastModified: string;
}

// ─── Mock data context ───
const GROUPS = ["Everest", "Fiji", "Bunnies", "Blue Jays", "Cheetahs", "Dolphins"];
const DIVISION_LEADERS = ["Alyssa Greene", "Marcus Chen", "Priya Patel", "Jordan Ruiz"];
const PROCTORS = ["MF", "JT", "VS", "KL", "AR"];
const BRACELETS: BraceletColor[] = ["Red", "Orange", "Yellow", "Green", "Blue"];
const FIRST_NAMES = ["Kellan", "Leo", "Mason", "Matthew", "Nitai", "Noah", "Oliver", "Peter", "Salvatore", "Tommy"];
const LAST_NAMES = ["Trautmann", "Blanco", "Fishkind", "Madura", "Meron", "Kleinman", "Orr", "Economou", "Mirra", "Einhorn"];

const seeded = (i: number, max: number) => Math.abs(Math.sin(i * 9.17) * 1e4) % max | 0;

const bracelets: BraceletRecord[] = Array.from({ length: 28 }, (_, i) => {
  const fn = FIRST_NAMES[seeded(i, FIRST_NAMES.length)];
  const ln = LAST_NAMES[seeded(i + 3, LAST_NAMES.length)];
  const color = BRACELETS[seeded(i + 1, BRACELETS.length)];
  const dates = ["June 30, 2025", "July 2, 2025", "July 7, 2025", "July 14, 2025"];
  return {
    id: i + 267,
    name: `${fn} ${ln}`,
    group: GROUPS[seeded(i, GROUPS.length)],
    divisionLeader: DIVISION_LEADERS[seeded(i + 2, DIVISION_LEADERS.length)],
    currentBracelet: i % 11 === 0 ? "" : "Orange",
    proctor1: PROCTORS[seeded(i, PROCTORS.length)],
    date1: dates[seeded(i, dates.length)],
    note1: i % 7 === 0 ? "" : "Passed",
    proctor2: i % 3 === 0 ? PROCTORS[seeded(i + 5, PROCTORS.length)] : "",
    date2: i % 3 === 0 ? dates[seeded(i + 1, dates.length)] : "",
    note2: i % 3 === 0 ? "Passed" : "",
    proctor3: "", date3: "", note3: "",
    emailSent: i % 13 !== 0,
  };
});

const skillFor = (i: number, off: number): SkillStatus => {
  const r = seeded(i + off, 10);
  if (r < 6) return "Achieved";
  if (r < 9) return "Working Towards";
  return "—";
};
const levelFromSkills = (skills: SkillStatus[]): LevelStatus => {
  if (skills.every(s => s === "Achieved")) return "Complete";
  if (skills.some(s => s !== "—")) return "Incomplete";
  return "—";
};

const levelRecords: LevelRecord[] = Array.from({ length: 24 }, (_, i) => {
  const fn = FIRST_NAMES[seeded(i + 4, FIRST_NAMES.length)];
  const ln = LAST_NAMES[seeded(i + 7, LAST_NAMES.length)];
  const goldfish = [skillFor(i, 1), skillFor(i, 2), skillFor(i, 3), skillFor(i, 4)];
  const minnow = [skillFor(i, 11), skillFor(i, 12), skillFor(i, 13), skillFor(i, 14), skillFor(i, 15), skillFor(i, 16)];
  const tadpole = [skillFor(i, 21), skillFor(i, 22), skillFor(i, 23), skillFor(i, 24)];
  return {
    id: i + 1,
    name: `${fn} ${ln}`,
    group: GROUPS[seeded(i + 2, GROUPS.length)],
    goldfish, goldfishLevel: levelFromSkills(goldfish),
    minnow, minnowLevel: levelFromSkills(minnow),
    tadpole, tadpoleLevel: levelFromSkills(tadpole),
    redCross: i % 5 === 0 ? "Complete" : "—",
    redCross2: i % 6 === 0 ? "Complete" : i % 4 === 0 ? "Incomplete" : "—",
    redCross3: i % 9 === 0 ? "Complete" : i % 7 === 0 ? "Incomplete" : "—",
    redCross4: i % 12 === 0 ? "Complete" : "—",
    frog: i % 8 === 0 ? "Complete" : "—",
    lastModified: "8/27/2025 · 12:10pm",
  };
});

const BRACELET_COLORS: Record<BraceletColor, { bg: string, text: string, border: string }> = {
  Red: { bg: '#fee2e2', text: '#ef4444', border: '#fca5a5' },
  Orange: { bg: '#ffedd5', text: '#f97316', border: '#fdba74' },
  Yellow: { bg: '#fef9c3', text: '#eab308', border: '#fde047' },
  Green: { bg: '#dcfce7', text: '#10b981', border: '#86efac' },
  Blue: { bg: '#e0f2fe', text: '#0ea5e9', border: '#7dd3fc' },
};

export function SwimProgramScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'bracelets' | 'levels'>('bracelets');
  const [search, setSearch] = useState("");
  const [braceletData, setBraceletData] = useState<BraceletRecord[]>(bracelets);
  const [levelData, setLevelData] = useState<LevelRecord[]>(levelRecords);

  const [editingBracelet, setEditingBracelet] = useState<BraceletRecord | null>(null);

  const filteredBracelets = useMemo(() => 
    braceletData.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || b.group.toLowerCase().includes(search.toLowerCase())),
    [search, braceletData]
  );
  
  const filteredLevels = useMemo(() => 
    levelData.filter(l => l.name.toLowerCase().includes(search.toLowerCase()) || l.group.toLowerCase().includes(search.toLowerCase())),
    [search, levelData]
  );

  const braceletCounts = BRACELETS.reduce<Record<string, number>>((acc, c) => {
    acc[c] = braceletData.filter(b => b.currentBracelet === c).length;
    return acc;
  }, {});
  
  const totalCompleteLevels = levelData.reduce((acc, r) => acc + [r.goldfishLevel, r.minnowLevel, r.tadpoleLevel, r.redCross, r.redCross2, r.redCross3, r.redCross4, r.frog].filter(s => s === "Complete").length, 0);

  const updateBracelet = (id: number, color: BraceletColor | "") => {
    setBraceletData(prev => prev.map(b => b.id === id ? { ...b, currentBracelet: color } : b));
    setEditingBracelet(null);
  };

  const sendEmail = (id: number) => {
    setBraceletData(prev => prev.map(b => b.id === id ? { ...b, emailSent: true } : b));
    Alert.alert("Email queued", "Bracelet notice sent to family.");
  };

  const unsendEmail = (id: number) => {
    setBraceletData(prev => prev.map(b => b.id === id ? { ...b, emailSent: false } : b));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
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
          {BRACELETS.map(color => (
            <View key={color} style={styles.statCard}>
              <View style={[styles.braceletPill, { backgroundColor: BRACELET_COLORS[color].bg, borderColor: BRACELET_COLORS[color].border }]}>
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

      <ScrollView style={styles.content}>
        {activeTab === 'bracelets' ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Current bracelet status & test history</Text>
            </View>
            {filteredBracelets.map(b => (
              <View key={b.id} style={styles.listItem}>
                <View style={styles.listMainInfo}>
                  <Text style={styles.camperName}>{b.name}</Text>
                  <Text style={styles.camperGroup}>{b.group} • {b.divisionLeader.split(" ")[0]}</Text>
                </View>
                <View style={styles.listSubInfo}>
                  <View style={styles.infoBlock}>
                    <Text style={styles.infoLabel}>Current Bracelet</Text>
                    <TouchableOpacity onPress={() => setEditingBracelet(b)}>
                      {b.currentBracelet ? (
                        <View style={[styles.braceletPillSm, { backgroundColor: BRACELET_COLORS[b.currentBracelet].bg, borderColor: BRACELET_COLORS[b.currentBracelet].border }]}>
                          <Text style={[styles.braceletPillTextSm, { color: BRACELET_COLORS[b.currentBracelet].text }]}>{b.currentBracelet}</Text>
                        </View>
                      ) : (
                        <Text style={styles.emptyText}>Tap to set</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  <View style={styles.infoBlock}>
                    <Text style={styles.infoLabel}>Test 1</Text>
                    <Text style={styles.infoValue}>{b.proctor1 || '—'}</Text>
                    <Text style={styles.infoDate}>{b.date1}</Text>
                  </View>
                  <View style={styles.actionBlock}>
                    {b.emailSent ? (
                      <TouchableOpacity onPress={() => unsendEmail(b.id)}>
                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.sendButton} onPress={() => sendEmail(b.id)}>
                        <Ionicons name="mail" size={14} color={theme.colors.primary} />
                        <Text style={styles.sendButtonText}>Send</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Skill checklist by level</Text>
            </View>
            {filteredLevels.map(l => (
              <View key={l.id} style={styles.listItem}>
                <View style={styles.listMainInfo}>
                  <Text style={styles.camperName}>{l.name}</Text>
                  <Text style={styles.camperGroup}>{l.group}</Text>
                </View>
                <View style={styles.listSubInfoLevels}>
                  <View style={styles.levelBlock}>
                    <Text style={styles.infoLabel}>Goldfish</Text>
                    <Text style={l.goldfishLevel === 'Complete' ? styles.levelComplete : styles.levelIncomplete}>{l.goldfishLevel}</Text>
                  </View>
                  <View style={styles.levelBlock}>
                    <Text style={styles.infoLabel}>Minnow</Text>
                    <Text style={l.minnowLevel === 'Complete' ? styles.levelComplete : styles.levelIncomplete}>{l.minnowLevel}</Text>
                  </View>
                  <View style={styles.levelBlock}>
                    <Text style={styles.infoLabel}>Tadpole</Text>
                    <Text style={l.tadpoleLevel === 'Complete' ? styles.levelComplete : styles.levelIncomplete}>{l.tadpoleLevel}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bracelet Edit Modal */}
      <Modal visible={!!editingBracelet} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Bracelet for {editingBracelet?.name}</Text>
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => editingBracelet && updateBracelet(editingBracelet.id, "")}
            >
              <Text style={styles.modalOptionText}>— None —</Text>
            </TouchableOpacity>
            {BRACELETS.map(c => (
              <TouchableOpacity 
                key={c}
                style={[styles.modalOption, { backgroundColor: BRACELET_COLORS[c].bg, borderColor: BRACELET_COLORS[c].border }]}
                onPress={() => editingBracelet && updateBracelet(editingBracelet.id, c)}
              >
                <Text style={[styles.modalOptionText, { color: BRACELET_COLORS[c].text, fontWeight: 'bold' }]}>{c}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setEditingBracelet(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
  },
  menuButton: {
    marginRight: 8,
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
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  statsContainer: {
    paddingLeft: 16,
    marginBottom: 16,
    height: 100,
  },
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
  braceletPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
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
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
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
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  listItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  listMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  camperName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  camperGroup: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  listSubInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listSubInfoLevels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  infoBlock: {
    flex: 1,
  },
  actionBlock: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sendButtonText: {
    fontSize: 12,
    color: theme.colors.primary,
    marginLeft: 4,
  },
  levelBlock: {
    width: '33%',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
  },
  infoDate: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  braceletPillSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  braceletPillTextSm: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  levelComplete: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  levelIncomplete: {
    fontSize: 12,
    fontWeight: '500',
    color: '#f59e0b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: 16,
  },
  modalCancel: {
    marginTop: 8,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  }
});
