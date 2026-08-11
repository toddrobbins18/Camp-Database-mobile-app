import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Share,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { pickAndReadCsvText } from '../lib/pickCsvDocument';
import { parseCSV, pickFirst, SUNSHINE_CSV_TEMPLATE } from '../lib/sunshineCsv';
import {
  normalizeGroupName,
  TAG_COLORS,
  todayISO,
  type SunshineCamper,
  type SunshineGroup,
  type SunshineReport,
  type SunshineTagOption,
} from '../constants/sunshineReportConstants';

type TagField = 'sports' | 'activities' | 'lunch';
type ModalKind = 'addCamper' | 'addGroup' | 'tags' | null;

export function SunshineReportScreen({ navigation }: any) {
  const { companyId } = useCompany();
  const [date, setDate] = useState(todayISO());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [groups, setGroups] = useState<SunshineGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState('');
  const [campers, setCampers] = useState<SunshineCamper[]>([]);
  const [tagOptions, setTagOptions] = useState<SunshineTagOption[]>([]);
  const [reports, setReports] = useState<Record<string, SunshineReport>>({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalKind>(null);
  const [tagModal, setTagModal] = useState<{ camperId: string; field: TagField } | null>(null);
  const [newCamper, setNewCamper] = useState({ full_name: '', parent_email: '', group_id: '' });
  const [newGroup, setNewGroup] = useState('');

  const findLocalGroupByName = (name: string) =>
    groups.find((group) => normalizeGroupName(group.name) === normalizeGroupName(name));

  const syncExistingGroup = (group: SunshineGroup, message: string) => {
    setGroups((prev) => {
      const next = prev.some((current) => current.id === group.id) ? prev : [...prev, group];
      return [...next].sort((a, b) => a.sort_order - b.sort_order);
    });
    setActiveGroupId(group.id);
    setModal(null);
    setNewGroup('');
    Alert.alert('Info', message);
  };

  const fetchGroupByName = useCallback(
    async (name: string) => {
      if (!companyId) return null;
      const trimmedName = name.trim();
      if (!trimmedName) return null;
      const localGroup = findLocalGroupByName(trimmedName);
      if (localGroup) return localGroup;
      const { data } = await supabase
        .from('sunshine_groups')
        .select('*')
        .eq('company_id', companyId)
        .ilike('name', trimmedName)
        .limit(1)
        .maybeSingle();
      return (data as SunshineGroup | null) ?? null;
    },
    [companyId, groups],
  );

  const refreshAll = useCallback(async () => {
    if (!companyId) return;
    const [g, c, t] = await Promise.all([
      supabase.from('sunshine_groups').select('*').eq('company_id', companyId).order('sort_order'),
      supabase.from('sunshine_campers').select('*').eq('company_id', companyId).order('sort_order'),
      supabase.from('sunshine_tag_options').select('*').eq('company_id', companyId).order('sort_order'),
    ]);
    if (g.data) {
      setGroups(g.data);
      if (g.data.length && !activeGroupId) setActiveGroupId(g.data[0].id);
    }
    if (c.data) setCampers(c.data);
    if (t.data) setTagOptions(t.data as SunshineTagOption[]);
  }, [companyId, activeGroupId]);

  const fetchReports = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase
      .from('sunshine_reports')
      .select('*')
      .eq('company_id', companyId)
      .eq('report_date', date);
    const map: Record<string, SunshineReport> = {};
    (data || []).forEach((r: SunshineReport) => {
      map[r.camper_id] = r;
    });
    setReports(map);
    setLoading(false);
  }, [companyId, date]);

  useEffect(() => {
    if (companyId) void refreshAll();
  }, [companyId, refreshAll]);

  useEffect(() => {
    if (companyId) void fetchReports();
  }, [companyId, date, fetchReports]);

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const groupCampers = useMemo(
    () => campers.filter((c) => c.group_id === activeGroupId),
    [campers, activeGroupId],
  );

  const sportOptions = tagOptions.filter((t) => t.category === 'sport');
  const activityOptions = tagOptions.filter((t) => t.category === 'activity');
  const lunchOptions = tagOptions.filter((t) => t.category === 'lunch');

  const upsertReport = async (camperId: string, patch: Partial<SunshineReport>) => {
    if (!companyId) return;
    const existing = reports[camperId] || {
      camper_id: camperId,
      report_date: date,
      sports: [],
      activities: [],
      lunch: [],
      bm: false,
      napped: false,
      send_email: true,
      email_sent_at: null,
    };
    const next: SunshineReport = { ...existing, ...patch };
    setReports((prev) => ({ ...prev, [camperId]: next }));

    const { data, error } = await supabase
      .from('sunshine_reports')
      .upsert(
        {
          company_id: companyId,
          camper_id: camperId,
          report_date: date,
          sports: next.sports,
          activities: next.activities,
          lunch: next.lunch,
          bm: next.bm,
          napped: next.napped,
          send_email: next.send_email,
          email_sent_at: next.email_sent_at,
        },
        { onConflict: 'camper_id,report_date' },
      )
      .select()
      .single();

    if (error) Alert.alert('Save failed', error.message);
    else if (data) setReports((prev) => ({ ...prev, [camperId]: data as SunshineReport }));
  };

  const toggleTag = (camperId: string, field: TagField, label: string) => {
    const r = reports[camperId];
    const current = r?.[field] || [];
    const next = current.includes(label) ? current.filter((x) => x !== label) : [...current, label];
    void upsertReport(camperId, { [field]: next });
  };

  const sendEndOfDayEmails = async () => {
    const toSend = groupCampers.filter((c) => {
      const r = reports[c.id];
      return r?.send_email && !r.email_sent_at && c.parent_email;
    });
    if (!toSend.length) {
      Alert.alert('Info', 'No reports queued to send.');
      return;
    }
    const now = new Date().toISOString();
    for (const c of toSend) {
      await supabase
        .from('sunshine_reports')
        .update({ email_sent_at: now })
        .eq('camper_id', c.id)
        .eq('report_date', date);
      setReports((prev) => ({ ...prev, [c.id]: { ...prev[c.id], email_sent_at: now } }));
    }
    Alert.alert('Success', `Marked ${toSend.length} report${toSend.length === 1 ? '' : 's'} as sent to parents.`);
  };

  const handleAddCamper = async () => {
    if (!companyId) return;
    const groupId = newCamper.group_id || activeGroupId;
    if (!newCamper.full_name.trim() || !groupId) {
      Alert.alert('Required', 'Name and group are required.');
      return;
    }
    const maxOrder = Math.max(0, ...campers.filter((c) => c.group_id === groupId).map((c) => c.sort_order));
    const { data, error } = await supabase
      .from('sunshine_campers')
      .insert({
        company_id: companyId,
        full_name: newCamper.full_name.trim(),
        parent_email: newCamper.parent_email.trim() || null,
        group_id: groupId,
        sort_order: maxOrder + 1,
      })
      .select()
      .single();
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setCampers((prev) => [...prev, data as SunshineCamper]);
    setModal(null);
    setNewCamper({ full_name: '', parent_email: '', group_id: '' });
    Alert.alert('Success', 'Camper added.');
  };

  const handleAddGroup = async () => {
    if (!companyId) return;
    const trimmedName = newGroup.trim();
    if (!trimmedName) return;
    const existingGroup = await fetchGroupByName(trimmedName);
    if (existingGroup) {
      syncExistingGroup(existingGroup, `"${existingGroup.name}" already exists — switched to it.`);
      return;
    }
    const maxOrder = Math.max(0, ...groups.map((g) => g.sort_order));
    const { data, error } = await supabase
      .from('sunshine_groups')
      .insert({ company_id: companyId, name: trimmedName, sort_order: maxOrder + 1 })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        const duplicateGroup = await fetchGroupByName(trimmedName);
        if (duplicateGroup) {
          syncExistingGroup(duplicateGroup, `"${duplicateGroup.name}" already exists — switched to it.`);
          return;
        }
      }
      Alert.alert('Error', error.message);
      return;
    }
    setGroups((prev) => [...prev, data as SunshineGroup]);
    setActiveGroupId((data as SunshineGroup).id);
    setModal(null);
    setNewGroup('');
    Alert.alert('Success', 'Group added.');
  };

  const handleDeleteCamper = (id: string, name: string) => {
    Alert.alert('Remove camper', `Remove ${name}? This will also delete their reports.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('sunshine_campers').delete().eq('id', id);
          if (error) Alert.alert('Error', error.message);
          else {
            setCampers((prev) => prev.filter((c) => c.id !== id));
            setReports((prev) => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
          }
        },
      },
    ]);
  };

  const handleCSVImport = async () => {
    if (!companyId) return;
    const picked = await pickAndReadCsvText();
    if (!picked.ok) {
      if (picked.error !== 'canceled') Alert.alert('Import failed', picked.message ?? picked.error);
      return;
    }
    try {
      const rows = parseCSV(picked.text);
      if (!rows.length) {
        Alert.alert('Import failed', 'CSV appears empty.');
        return;
      }
      const groupByName = new Map(groups.map((g) => [normalizeGroupName(g.name), g]));
      let createdGroupCount = 0;
      const newCampersPayload: Array<{
        company_id: string;
        full_name: string;
        parent_email: string | null;
        group_id: string;
        sort_order: number;
      }> = [];

      const wantedGroupNames = new Set<string>();
      for (const r of rows) {
        const gName = pickFirst(r, ['group', 'group name', 'cabin']).trim();
        if (gName && !groupByName.has(normalizeGroupName(gName))) wantedGroupNames.add(gName);
      }
      let nextOrder = Math.max(0, ...groups.map((g) => g.sort_order));
      for (const name of wantedGroupNames) {
        nextOrder += 1;
        const normalizedName = normalizeGroupName(name);
        const { data, error } = await supabase
          .from('sunshine_groups')
          .insert({ company_id: companyId, name, sort_order: nextOrder })
          .select()
          .single();
        if (error) {
          if (error.code === '23505') {
            const existingGroup = await fetchGroupByName(name);
            if (existingGroup) {
              groupByName.set(normalizedName, existingGroup);
              continue;
            }
          }
          Alert.alert('Import failed', `Failed to create group "${name}": ${error.message}`);
          return;
        }
        if (data) {
          groupByName.set(normalizedName, data as SunshineGroup);
          createdGroupCount++;
        }
      }

      const orderByGroup = new Map<string, number>();
      campers.forEach((c) => {
        if (c.group_id) orderByGroup.set(c.group_id, Math.max(orderByGroup.get(c.group_id) ?? 0, c.sort_order));
      });

      let skipped = 0;
      for (const r of rows) {
        const name = pickFirst(r, ['full name', 'name', 'camper', 'child', "child's name", 'child name']).trim();
        const email = pickFirst(r, ['parent email', 'email', 'parent_email']).trim();
        const gName = pickFirst(r, ['group', 'group name', 'cabin']).trim();
        if (!name) {
          skipped++;
          continue;
        }
        const group = gName ? groupByName.get(normalizeGroupName(gName)) : groups.find((g) => g.id === activeGroupId);
        if (!group) {
          skipped++;
          continue;
        }
        const next = (orderByGroup.get(group.id) ?? 0) + 1;
        orderByGroup.set(group.id, next);
        newCampersPayload.push({
          company_id: companyId,
          full_name: name,
          parent_email: email || null,
          group_id: group.id,
          sort_order: next,
        });
      }

      if (!newCampersPayload.length) {
        Alert.alert('Import failed', 'No valid rows found. Expected headers: name, parent_email, group');
        return;
      }

      const { data, error } = await supabase.from('sunshine_campers').insert(newCampersPayload).select();
      if (error) {
        Alert.alert('Import failed', error.message);
        return;
      }
      await refreshAll();
      Alert.alert(
        'Import complete',
        `Imported ${data?.length ?? 0} camper${data?.length === 1 ? '' : 's'}` +
          (createdGroupCount ? `, created ${createdGroupCount} group${createdGroupCount === 1 ? '' : 's'}` : '') +
          (skipped ? `, skipped ${skipped}` : '') +
          '.',
      );
    } catch (e: any) {
      Alert.alert('Import error', e?.message ?? String(e));
    }
  };

  const handleCSVDownloadTemplate = async () => {
    try {
      await Share.share({ message: SUNSHINE_CSV_TEMPLATE, title: 'sunshine-campers-template.csv' });
    } catch {
      Alert.alert('Template', SUNSHINE_CSV_TEMPLATE);
    }
  };

  const renderTagCell = (camperId: string, field: TagField, values: string[], options: SunshineTagOption[]) => (
    <TouchableOpacity
      style={styles.tagCell}
      onPress={() => setTagModal({ camperId, field })}
    >
      {values.length === 0 ? (
        <Text style={styles.tagAddText}>+ Add</Text>
      ) : (
        <View style={styles.tagWrap}>
          {values.map((v) => {
            const opt = options.find((o) => o.label === v);
            const colors = TAG_COLORS[opt?.color ?? 'gray'];
            return (
              <View key={v} style={[styles.tagPill, { backgroundColor: colors.bg }]}>
                <Text style={[styles.tagPillText, { color: colors.text }]}>{v}</Text>
              </View>
            );
          })}
        </View>
      )}
    </TouchableOpacity>
  );

  const YesNoToggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      style={[styles.yesNoBtn, value ? styles.yesNoYes : styles.yesNoNo]}
    >
      <Text style={[styles.yesNoText, value ? styles.yesNoTextYes : styles.yesNoTextNo]}>{value ? 'Yes' : 'No'}</Text>
    </TouchableOpacity>
  );

  const tagModalOptions =
    tagModal?.field === 'sports' ? sportOptions : tagModal?.field === 'activities' ? activityOptions : lunchOptions;
  const tagModalValues = tagModal ? reports[tagModal.camperId]?.[tagModal.field] || [] : [];

  if (!companyId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.mutedText}>Select a camp to use Sunshine Report.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu-outline" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Sunshine Report</Text>
          <Text style={styles.headerSubtitle}>
            Daily camper tracking — fill out throughout the day, then send to parents at the end of day.
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolbarScroll} contentContainerStyle={styles.toolbar}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.text} />
          <Text style={styles.dateBtnText}>{date}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.outlineBtn} onPress={handleCSVDownloadTemplate}>
          <Ionicons name="download-outline" size={14} color={theme.colors.text} />
          <Text style={styles.outlineBtnText}>Template</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.outlineBtn} onPress={handleCSVImport}>
          <Ionicons name="cloud-upload-outline" size={14} color={theme.colors.text} />
          <Text style={styles.outlineBtnText}>Import CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.outlineBtn} onPress={() => setModal('addGroup')}>
          <Ionicons name="folder-open-outline" size={14} color={theme.colors.text} />
          <Text style={styles.outlineBtnText}>Group</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={() => {
            setNewCamper({ full_name: '', parent_email: '', group_id: activeGroupId });
            setModal('addCamper');
          }}
        >
          <Ionicons name="person-add-outline" size={14} color={theme.colors.text} />
          <Text style={styles.outlineBtnText}>Add Camper</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={sendEndOfDayEmails}>
          <Ionicons name="mail-outline" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>Send to Parents</Text>
        </TouchableOpacity>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={new Date(`${date}T12:00:00`)}
          mode="date"
          onChange={(_, selected) => {
            setShowDatePicker(false);
            if (selected) setDate(selected.toISOString().slice(0, 10));
          }}
        />
      )}

      {groups.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          {groups.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.tabButton, activeGroupId === g.id && styles.tabButtonActive]}
              onPress={() => setActiveGroupId(g.id)}
            >
              <Text style={[styles.tabText, activeGroupId === g.id && styles.tabTextActive]}>{g.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView horizontal style={styles.tableOuter}>
        <View>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, { width: 140 }]}>Child&apos;s Name</Text>
            <Text style={[styles.th, { width: 100 }]}>Group</Text>
            <Text style={[styles.th, { width: 180 }]}>Sports</Text>
            <Text style={[styles.th, { width: 180 }]}>Activities</Text>
            <Text style={[styles.th, { width: 180 }]}>Lunch</Text>
            <Text style={[styles.th, { width: 60, textAlign: 'center' }]}>BM</Text>
            <Text style={[styles.th, { width: 72, textAlign: 'center' }]}>Napped?</Text>
            <Text style={[styles.th, { width: 88, textAlign: 'center' }]}>Send Email</Text>
            <Text style={[styles.th, { width: 72 }]}>Sent</Text>
            <Text style={[styles.th, { width: 40 }]} />
          </View>

          {loading && groupCampers.length === 0 ? (
            <ActivityIndicator style={{ margin: 24 }} color={theme.colors.secondary} />
          ) : groupCampers.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.mutedText}>
                No campers in {activeGroup?.name ?? 'this group'}. Tap Add Camper or Import CSV to get started.
              </Text>
            </View>
          ) : (
            groupCampers.map((camper) => {
              const r = reports[camper.id];
              return (
                <View key={camper.id} style={styles.tableRow}>
                  <Text style={[styles.tdName, { width: 140 }]} numberOfLines={2}>
                    {camper.full_name}
                  </Text>
                  <View style={[styles.td, { width: 100 }]}>
                    <View style={styles.groupBadge}>
                      <Text style={styles.groupBadgeText}>{activeGroup?.name}</Text>
                    </View>
                  </View>
                  <View style={{ width: 180 }}>{renderTagCell(camper.id, 'sports', r?.sports || [], sportOptions)}</View>
                  <View style={{ width: 180 }}>{renderTagCell(camper.id, 'activities', r?.activities || [], activityOptions)}</View>
                  <View style={{ width: 180 }}>{renderTagCell(camper.id, 'lunch', r?.lunch || [], lunchOptions)}</View>
                  <View style={[styles.tdCenter, { width: 60 }]}>
                    <YesNoToggle value={r?.bm ?? false} onChange={(v) => void upsertReport(camper.id, { bm: v })} />
                  </View>
                  <View style={[styles.tdCenter, { width: 72 }]}>
                    <YesNoToggle value={r?.napped ?? false} onChange={(v) => void upsertReport(camper.id, { napped: v })} />
                  </View>
                  <View style={[styles.tdCenter, { width: 88 }]}>
                    <Switch
                      value={r?.send_email ?? true}
                      onValueChange={(v) => void upsertReport(camper.id, { send_email: v })}
                      trackColor={{ true: theme.colors.secondary }}
                    />
                  </View>
                  <View style={[styles.td, { width: 72 }]}>
                    {r?.email_sent_at ? (
                      <View style={styles.sentWrap}>
                        <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
                        <Text style={styles.sentTime}>
                          {new Date(r.email_sent_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.sentDash}>—</Text>
                    )}
                  </View>
                  <TouchableOpacity style={{ width: 40, alignItems: 'center' }} onPress={() => handleDeleteCamper(camper.id, camper.full_name)}>
                    <Ionicons name="trash-outline" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Tag picker modal */}
      <Modal visible={!!tagModal} transparent animationType="fade" onRequestClose={() => setTagModal(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setTagModal(null)}>
          <View style={styles.tagModalCard}>
            <Text style={styles.modalTitle}>Select tags</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {tagModalOptions.map((opt) => {
                const selected = tagModalValues.includes(opt.label);
                const colors = TAG_COLORS[opt.color];
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={styles.tagOptionRow}
                    onPress={() => tagModal && toggleTag(tagModal.camperId, tagModal.field, opt.label)}
                  >
                    {selected ? <Ionicons name="checkmark" size={16} color={theme.colors.secondary} /> : <View style={{ width: 16 }} />}
                    <View style={[styles.tagPill, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.tagPillText, { color: colors.text }]}>{opt.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {tagModalOptions.length === 0 && <Text style={styles.mutedText}>No tag options configured.</Text>}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add camper modal */}
      <Modal visible={modal === 'addCamper'} animationType="slide" onRequestClose={() => setModal(null)}>
        <SafeAreaView style={styles.formModal}>
          <Text style={styles.modalTitle}>Add Camper</Text>
          <Text style={styles.modalDesc}>Add a new camper to the daily report.</Text>
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={newCamper.full_name} onChangeText={(v) => setNewCamper({ ...newCamper, full_name: v })} placeholder="e.g. Jane Doe" />
          <Text style={styles.label}>Parent Email (optional)</Text>
          <TextInput style={styles.input} value={newCamper.parent_email} onChangeText={(v) => setNewCamper({ ...newCamper, parent_email: v })} placeholder="parent@example.com" autoCapitalize="none" />
          <Text style={styles.label}>Group</Text>
          {groups.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.optionRow, (newCamper.group_id || activeGroupId) === g.id && styles.optionRowActive]}
              onPress={() => setNewCamper({ ...newCamper, group_id: g.id })}
            >
              <Text style={styles.optionText}>{g.name}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setModal(null)}>
              <Text style={styles.outlineBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddCamper}>
              <Text style={styles.primaryBtnText}>Add Camper</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Add group modal */}
      <Modal visible={modal === 'addGroup'} animationType="slide" onRequestClose={() => setModal(null)}>
        <SafeAreaView style={styles.formModal}>
          <Text style={styles.modalTitle}>Add Group</Text>
          <Text style={styles.modalDesc}>Create a new group/cabin for organizing campers.</Text>
          <Text style={styles.label}>Group Name</Text>
          <TextInput style={styles.input} value={newGroup} onChangeText={setNewGroup} placeholder="e.g. Pandas" />
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setModal(null)}>
              <Text style={styles.outlineBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddGroup}>
              <Text style={styles.primaryBtnText}>Add Group</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  mutedText: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuButton: { marginRight: 8, marginTop: 2 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  headerSubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 20 },
  toolbarScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  dateBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  outlineBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  tabsContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tabButton: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: theme.colors.secondary },
  tabText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.secondary },
  tableOuter: { flex: 1 },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f4f4f5',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  th: { fontWeight: '600', fontSize: 12, color: theme.colors.textSecondary, paddingHorizontal: 8 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  td: { paddingHorizontal: 8, justifyContent: 'center' },
  tdName: { fontSize: 14, fontWeight: '600', color: theme.colors.text, paddingHorizontal: 8 },
  tdCenter: { alignItems: 'center', justifyContent: 'center' },
  groupBadge: { backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  groupBadgeText: { fontSize: 11, fontWeight: '600', color: '#14532d' },
  tagCell: { minHeight: 36, paddingHorizontal: 8, justifyContent: 'center' },
  tagAddText: { fontSize: 11, color: theme.colors.textSecondary },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tagPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  tagPillText: { fontSize: 10, fontWeight: '600' },
  yesNoBtn: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  yesNoYes: { backgroundColor: '#f3e8ff' },
  yesNoNo: { backgroundColor: '#dbeafe' },
  yesNoText: { fontSize: 11, fontWeight: '700' },
  yesNoTextYes: { color: '#581c87' },
  yesNoTextNo: { color: '#1e3a8a' },
  sentWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sentTime: { fontSize: 10, color: theme.colors.success },
  sentDash: { fontSize: 12, color: '#cbd5e1' },
  emptyRow: { padding: 24, width: 900 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  tagModalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  modalDesc: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 12 },
  tagOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  formModal: { flex: 1, backgroundColor: '#fff', padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  optionRow: { padding: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, marginBottom: 6 },
  optionRowActive: { borderColor: theme.colors.secondary, backgroundColor: '#eff6ff' },
  optionText: { fontSize: 14, color: theme.colors.text },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
});
