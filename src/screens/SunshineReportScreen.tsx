import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { isNorthShoreDayCamp } from '../constants/camps';
import { syncSunshineFromRoster } from '../lib/sunshineRoster';
import { isNorthShoreSunshineGroup, sunshineGroupSortOrder } from '../lib/sunshineGroups';
import { parseCSV, pickFirst, SUNSHINE_CSV_TEMPLATE } from '../lib/sunshineCsv';
import { pickAndReadCsvText } from '../lib/pickCsvDocument';
import { TAG_COLORS, normalizeGroupName, todayISO, type SunshineTagOption } from '../constants/sunshineReportConstants';

type Group = { id: string; name: string; sort_order: number };
type Camper = { id: string; full_name: string; group_id: string | null; parent_email: string | null; sort_order: number };
type Report = {
  id?: string;
  camper_id: string;
  report_date: string;
  sports: string[];
  activities: string[];
  lunch: string[];
  bm: boolean;
  napped: boolean;
  send_email: boolean;
  email_sent_at: string | null;
};

function YesNoToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      style={[styles.yesNoBtn, value ? styles.yesNoYes : styles.yesNoNo]}
    >
      <Text style={[styles.yesNoText, value ? styles.yesNoTextYes : styles.yesNoTextNo]}>{value ? 'Yes' : 'No'}</Text>
    </TouchableOpacity>
  );
}

function TagBadges({ values, options }: { values: string[]; options: SunshineTagOption[] }) {
  if (!values.length) {
    return (
      <View style={styles.tagAddHint}>
        <Ionicons name="add" size={12} color={theme.colors.textSecondary} />
        <Text style={styles.tagAddText}>Add</Text>
      </View>
    );
  }
  return (
    <View style={styles.tagRow}>
      {values.map((v) => {
        const opt = options.find((o) => o.label === v);
        const colors = TAG_COLORS[opt?.color ?? 'gray'];
        return (
          <View key={v} style={[styles.tagBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.tagBadgeText, { color: colors.text }]}>{v}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function SunshineReportScreen({ navigation }: any) {
  const { companyId, companySlug, season } = useCompany();
  const northShoreSunshineOnly = isNorthShoreDayCamp(companySlug);

  const [date, setDate] = useState(todayISO());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState('');
  const [campers, setCampers] = useState<Camper[]>([]);
  const [tagOptions, setTagOptions] = useState<SunshineTagOption[]>([]);
  const [reports, setReports] = useState<Record<string, Report>>({});
  const [loading, setLoading] = useState(true);
  const [syncingRoster, setSyncingRoster] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');

  const [addCamperOpen, setAddCamperOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [newCamper, setNewCamper] = useState({ full_name: '', parent_email: '', group_id: '' });
  const [newGroup, setNewGroup] = useState('');

  const [tagModal, setTagModal] = useState<{
    camperId: string;
    field: 'sports' | 'activities' | 'lunch';
    title: string;
  } | null>(null);

  const findLocalGroupByName = (name: string) =>
    groups.find((group) => normalizeGroupName(group.name) === normalizeGroupName(name));

  const syncExistingGroup = (group: Group, message: string) => {
    setGroups((prev) => {
      const next = prev.some((current) => current.id === group.id) ? prev : [...prev, group];
      return [...next].sort((a, b) => a.sort_order - b.sort_order);
    });
    setActiveGroupId(group.id);
    setAddGroupOpen(false);
    setNewGroup('');
    Alert.alert('Info', message);
  };

  const fetchGroupByName = async (name: string): Promise<Group | null> => {
    if (!companyId) return null;
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    const localGroup = findLocalGroupByName(trimmedName);
    if (localGroup) return localGroup;

    const { data, error } = await supabase
      .from('sunshine_groups')
      .select('*')
      .eq('company_id', companyId)
      .eq('season', season)
      .ilike('name', trimmedName)
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return (data as Group | null) ?? null;
  };

  const refreshAll = useCallback(
    async (options?: { syncRoster?: boolean }) => {
      if (!companyId) return;

      if (options?.syncRoster) {
        setSyncingRoster(true);
        try {
          const result = await syncSunshineFromRoster(companyId, season, {
            northShoreSunshineOnly,
          });
          if (result.campers === 0) {
            Alert.alert(
              'Roster sync',
              result.skippedNoGroup > 0
                ? `No groups found — ${result.skippedNoGroup} campers missing FULLSUMMERGROUP. Run CampMinder sync.`
                : 'No campers on roster for this season.',
            );
          } else {
            Alert.alert('Roster loaded', `Loaded ${result.campers} campers across ${result.groups} groups.`);
          }
        } catch (e: any) {
          Alert.alert('Roster sync failed', e?.message || String(e));
        } finally {
          setSyncingRoster(false);
        }
      }

      const [g, c, t] = await Promise.all([
        supabase.from('sunshine_groups').select('*').eq('company_id', companyId).eq('season', season).order('sort_order'),
        supabase.from('sunshine_campers').select('*').eq('company_id', companyId).eq('season', season).order('sort_order'),
        supabase.from('sunshine_tag_options').select('*').eq('company_id', companyId).order('sort_order'),
      ]);

      if (g.error) {
        Alert.alert('Error', `Could not load groups: ${g.error.message}`);
        setGroups([]);
        setActiveGroupId('');
        return;
      }

      if (g.data) {
        const visibleGroups = northShoreSunshineOnly
          ? g.data
              .filter((group) => isNorthShoreSunshineGroup(group.name))
              .sort((a, b) => sunshineGroupSortOrder(a.name) - sunshineGroupSortOrder(b.name))
          : g.data;
        setGroups(visibleGroups);
        setActiveGroupId((prev) =>
          visibleGroups.some((group) => group.id === prev) ? prev : visibleGroups.length ? visibleGroups[0].id : '',
        );
      }

      if (c.error) {
        Alert.alert('Error', `Could not load campers: ${c.error.message}`);
      } else if (c.data) {
        const visibleGroupIds = new Set(
          (g.data ?? [])
            .filter((group) => !northShoreSunshineOnly || isNorthShoreSunshineGroup(group.name))
            .map((group) => group.id),
        );
        const visibleCampers = northShoreSunshineOnly
          ? c.data.filter((camper) => camper.group_id && visibleGroupIds.has(camper.group_id))
          : c.data;
        setCampers(visibleCampers);
      }

      if (t.data) setTagOptions(t.data as SunshineTagOption[]);
    },
    [companyId, season, northShoreSunshineOnly],
  );

  const fetchReports = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase
      .from('sunshine_reports')
      .select('*')
      .eq('company_id', companyId)
      .eq('report_date', date);

    const map: Record<string, Report> = {};
    (data || []).forEach((r: any) => {
      map[r.camper_id] = r;
    });
    setReports(map);
    setLoading(false);
  }, [companyId, date]);

  useEffect(() => {
    if (companyId) void refreshAll({ syncRoster: false });
  }, [companyId, season, refreshAll]);

  useEffect(() => {
    if (companyId && date) void fetchReports();
  }, [date, companyId, fetchReports]);

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const groupCampers = useMemo(
    () => campers.filter((c) => c.group_id === activeGroupId),
    [campers, activeGroupId],
  );

  const camperCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const camper of campers) {
      if (camper.group_id) counts[camper.group_id] = (counts[camper.group_id] ?? 0) + 1;
    }
    return counts;
  }, [campers]);

  const filteredGroups = useMemo(() => {
    const query = groupSearch.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(query));
  }, [groups, groupSearch]);

  const sportOptions = tagOptions.filter((t) => t.category === 'sport');
  const activityOptions = tagOptions.filter((t) => t.category === 'activity');
  const lunchOptions = tagOptions.filter((t) => t.category === 'lunch');

  const upsertReport = async (camperId: string, patch: Partial<Report>) => {
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
    const next: Report = { ...existing, ...patch };
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

    if (error) Alert.alert('Error', `Failed to save: ${error.message}`);
    else if (data) setReports((prev) => ({ ...prev, [camperId]: data as Report }));
  };

  const toggleTag = (camperId: string, field: 'sports' | 'activities' | 'lunch', label: string) => {
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
    Alert.alert('Success', `Marked ${toSend.length} report(s) as sent to parents.`);
  };

  const handleAddCamper = async () => {
    if (!companyId) return;
    const groupId = newCamper.group_id || activeGroupId;
    if (!newCamper.full_name.trim() || !groupId) {
      Alert.alert('Error', 'Name and group are required.');
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
        season,
      })
      .select()
      .single();
    if (error) {
      Alert.alert('Error', `Failed to add camper: ${error.message}`);
      return;
    }
    setCampers((prev) => [...prev, data as Camper]);
    setAddCamperOpen(false);
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
      .insert({ company_id: companyId, name: trimmedName, sort_order: maxOrder + 1, season })
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
      Alert.alert('Error', `Failed to add group: ${error.message}`);
      return;
    }

    setGroups((prev) => [...prev, data as Group]);
    setActiveGroupId((data as Group).id);
    setAddGroupOpen(false);
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
          if (error) {
            Alert.alert('Error', `Failed to delete: ${error.message}`);
            return;
          }
          setCampers((prev) => prev.filter((c) => c.id !== id));
          setReports((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
          Alert.alert('Success', 'Camper removed.');
        },
      },
    ]);
  };

  const handleCSVImport = async () => {
    if (!companyId) return;
    const picked = await pickAndReadCsvText();
    if (!picked.ok) {
      if (picked.error !== 'canceled') Alert.alert('Import failed', picked.message || picked.error);
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
        season: string;
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
          .insert({ company_id: companyId, name, sort_order: nextOrder, season })
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
          groupByName.set(normalizedName, data as Group);
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
          season,
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
        `Imported ${data?.length ?? 0} camper(s)` +
          (createdGroupCount ? `, created ${createdGroupCount} group(s)` : '') +
          (skipped ? `, skipped ${skipped}` : '') +
          '.',
      );
    } catch (e: any) {
      Alert.alert('Import error', e?.message || String(e));
    }
  };

  const handleCSVDownloadTemplate = async () => {
    try {
      await Share.share({ title: 'Sunshine campers template', message: SUNSHINE_CSV_TEMPLATE });
    } catch {
      Alert.alert('Template', 'Could not share template.');
    }
  };

  const tagModalOptions =
    tagModal?.field === 'sports'
      ? sportOptions
      : tagModal?.field === 'activities'
        ? activityOptions
        : lunchOptions;

  const tagModalValues = tagModal ? reports[tagModal.camperId]?.[tagModal.field] || [] : [];

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
        <Ionicons name="menu-outline" size={26} color={theme.colors.text} />
      </TouchableOpacity>
      <View style={styles.headerTextContainer}>
        <Text style={styles.headerTitle}>Sunshine Report</Text>
        <Text style={styles.headerSubtitle}>
          Daily camper tracking — groups and campers load from roster (FULLSUMMERGROUP) for {season}.
        </Text>
      </View>
    </View>
  );

  if (loading && !groups.length && !campers.length) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 32 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolbarScroll} contentContainerStyle={styles.toolbar}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.text} />
          <Text style={styles.dateBtnText}>{format(new Date(`${date}T12:00:00`), 'dd/MM/yyyy')}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={new Date(`${date}T12:00:00`)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (d) setDate(format(d, 'yyyy-MM-dd'));
            }}
          />
        )}
        <TouchableOpacity
          style={[styles.toolBtn, styles.toolBtnOutline]}
          disabled={syncingRoster}
          onPress={() => void refreshAll({ syncRoster: true })}
        >
          <Ionicons name="refresh-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.toolBtnOutlineText}>{syncingRoster ? 'Loading…' : 'Reload from Roster'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toolBtn, styles.toolBtnOutline]} onPress={() => void handleCSVDownloadTemplate()}>
          <Ionicons name="download-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.toolBtnOutlineText}>Template</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toolBtn, styles.toolBtnOutline]} onPress={() => void handleCSVImport()}>
          <Ionicons name="cloud-upload-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.toolBtnOutlineText}>Import CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toolBtn, styles.toolBtnOutline]} onPress={() => setAddGroupOpen(true)}>
          <Ionicons name="folder-open-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.toolBtnOutlineText}>Group</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolBtn, styles.toolBtnOutline]}
          onPress={() => {
            setNewCamper({ full_name: '', parent_email: '', group_id: activeGroupId });
            setAddCamperOpen(true);
          }}
        >
          <Ionicons name="person-add-outline" size={14} color={theme.colors.primary} />
          <Text style={styles.toolBtnOutlineText}>Add Camper</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toolBtn, styles.toolBtnPrimary]} onPress={() => void sendEndOfDayEmails()}>
          <Ionicons name="mail-outline" size={14} color="#fff" />
          <Text style={styles.toolBtnPrimaryText}>Send to Parents</Text>
        </TouchableOpacity>
      </ScrollView>

      {groups.length > 0 && (
        <View style={styles.groupSection}>
          <View style={styles.groupSearchRow}>
            <View style={styles.groupSearchBox}>
              <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.groupSearchInput}
                placeholder="Search groups…"
                value={groupSearch}
                onChangeText={setGroupSearch}
              />
            </View>
            <Text style={styles.groupStats}>
              {activeGroup?.name ?? 'Group'} · {groupCampers.length} campers
              {groupSearch.trim()
                ? ` · ${filteredGroups.length} of ${groups.length} shown`
                : ` · ${groups.length} groups`}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupChipsScroll}>
            {filteredGroups.length === 0 ? (
              <Text style={styles.noGroupsMatch}>No groups match "{groupSearch.trim()}"</Text>
            ) : (
              filteredGroups.map((g) => {
                const selected = g.id === activeGroupId;
                const count = camperCountByGroup[g.id] ?? 0;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.groupChip, selected && styles.groupChipActive]}
                    onPress={() => setActiveGroupId(g.id)}
                  >
                    <Text style={[styles.groupChipText, selected && styles.groupChipTextActive]}>{g.name}</Text>
                    {count > 0 && (
                      <Text style={[styles.groupChipCount, selected && styles.groupChipCountActive]}>{count}</Text>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      <ScrollView style={styles.tableScroll} horizontal>
        <View>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, { width: 140 }]}>Child's Name</Text>
            <Text style={[styles.th, { width: 100 }]}>Group</Text>
            <Text style={[styles.th, { width: 120 }]}>Sports</Text>
            <Text style={[styles.th, { width: 120 }]}>Activities</Text>
            <Text style={[styles.th, { width: 120 }]}>Lunch</Text>
            <Text style={[styles.th, { width: 56, textAlign: 'center' }]}>BM</Text>
            <Text style={[styles.th, { width: 72, textAlign: 'center' }]}>Napped?</Text>
            <Text style={[styles.th, { width: 80, textAlign: 'center' }]}>Send</Text>
            <Text style={[styles.th, { width: 72 }]}>Sent</Text>
            <Text style={[styles.th, { width: 40 }]} />
          </View>

          <ScrollView style={{ maxHeight: 480 }}>
            {groupCampers.length === 0 && !loading ? (
              <Text style={styles.emptyState}>
                No campers in {activeGroup?.name ?? 'this group'}. Use Add Camper or Import CSV to get started.
              </Text>
            ) : (
              groupCampers.map((camper) => {
                const r = reports[camper.id];
                return (
                  <View key={camper.id} style={styles.tableRow}>
                    <Text style={[styles.td, styles.tdName, { width: 140 }]}>{camper.full_name}</Text>
                    <Text style={[styles.td, { width: 100, color: theme.colors.textSecondary }]}>{activeGroup?.name}</Text>

                    <TouchableOpacity
                      style={[styles.td, { width: 120 }]}
                      onPress={() => setTagModal({ camperId: camper.id, field: 'sports', title: 'Sports' })}
                    >
                      <TagBadges values={r?.sports || []} options={sportOptions} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.td, { width: 120 }]}
                      onPress={() => setTagModal({ camperId: camper.id, field: 'activities', title: 'Activities' })}
                    >
                      <TagBadges values={r?.activities || []} options={activityOptions} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.td, { width: 120 }]}
                      onPress={() => setTagModal({ camperId: camper.id, field: 'lunch', title: 'Lunch' })}
                    >
                      <TagBadges values={r?.lunch || []} options={lunchOptions} />
                    </TouchableOpacity>

                    <View style={[styles.tdCenter, { width: 56 }]}>
                      <YesNoToggle value={r?.bm ?? false} onChange={(v) => void upsertReport(camper.id, { bm: v })} />
                    </View>
                    <View style={[styles.tdCenter, { width: 72 }]}>
                      <YesNoToggle value={r?.napped ?? false} onChange={(v) => void upsertReport(camper.id, { napped: v })} />
                    </View>
                    <View style={[styles.tdCenter, { width: 80 }]}>
                      <Switch
                        value={r?.send_email ?? true}
                        onValueChange={(v) => void upsertReport(camper.id, { send_email: v })}
                        trackColor={{ true: theme.colors.primary }}
                      />
                    </View>
                    <View style={[styles.td, { width: 72 }]}>
                      {r?.email_sent_at ? (
                        <Text style={styles.sentTime}>
                          {new Date(r.email_sent_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </Text>
                      ) : (
                        <Text style={styles.emptyText}>—</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.tdCenter, { width: 40 }]}
                      onPress={() => handleDeleteCamper(camper.id, camper.full_name)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Tag picker modal */}
      <Modal visible={!!tagModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setTagModal(null)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{tagModal?.title}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {tagModalOptions.map((opt) => {
                const selected = tagModalValues.includes(opt.label);
                const colors = TAG_COLORS[opt.color] ?? TAG_COLORS.gray;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={styles.tagOptionRow}
                    onPress={() => tagModal && toggleTag(tagModal.camperId, tagModal.field, opt.label)}
                  >
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={selected ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <View style={[styles.tagBadge, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.tagBadgeText, { color: colors.text }]}>{opt.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setTagModal(null)}>
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Camper modal */}
      <Modal visible={addCamperOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.formModal}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Add Camper</Text>
            <TouchableOpacity onPress={() => setAddCamperOpen(false)}>
              <Ionicons name="close" size={26} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.formBody}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={newCamper.full_name}
              onChangeText={(v) => setNewCamper((p) => ({ ...p, full_name: v }))}
              placeholder="e.g. Jane Doe"
            />
            <Text style={styles.fieldLabel}>Parent Email (optional)</Text>
            <TextInput
              style={styles.fieldInput}
              value={newCamper.parent_email}
              onChangeText={(v) => setNewCamper((p) => ({ ...p, parent_email: v }))}
              placeholder="parent@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.fieldLabel}>Group</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {groups.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.groupChip, (newCamper.group_id || activeGroupId) === g.id && styles.groupChipActive]}
                  onPress={() => setNewCamper((p) => ({ ...p, group_id: g.id }))}
                >
                  <Text
                    style={[
                      styles.groupChipText,
                      (newCamper.group_id || activeGroupId) === g.id && styles.groupChipTextActive,
                    ]}
                  >
                    {g.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => void handleAddCamper()}>
              <Text style={styles.primaryBtnText}>Add Camper</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Group modal */}
      <Modal visible={addGroupOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.formModal}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Add Group</Text>
            <TouchableOpacity onPress={() => setAddGroupOpen(false)}>
              <Ionicons name="close" size={26} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.formBody}>
            <Text style={styles.fieldLabel}>Group Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={newGroup}
              onChangeText={setNewGroup}
              placeholder="e.g. Pandas"
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={() => void handleAddGroup()}>
              <Text style={styles.primaryBtnText}>Add Group</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuButton: { marginRight: 8, padding: 4 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text },
  headerSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
  toolbarScroll: { borderBottomWidth: 1, borderBottomColor: theme.colors.border, maxHeight: 52 },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dateBtnText: { fontSize: 13, fontWeight: '500', color: theme.colors.text },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toolBtnOutline: { borderWidth: 1, borderColor: theme.colors.primary, backgroundColor: '#fff' },
  toolBtnOutlineText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
  toolBtnPrimary: { backgroundColor: theme.colors.primary },
  toolBtnPrimaryText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  groupSection: { padding: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  groupSearchRow: { gap: 8, marginBottom: 8 },
  groupSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    gap: 8,
  },
  groupSearchInput: { flex: 1, fontSize: 14 },
  groupStats: { fontSize: 12, color: theme.colors.textSecondary },
  groupChipsScroll: { maxHeight: 44 },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#fafafa',
  },
  groupChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  groupChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  groupChipTextActive: { color: '#fff' },
  groupChipCount: { fontSize: 10, marginLeft: 4, color: theme.colors.textSecondary },
  groupChipCountActive: { color: 'rgba(255,255,255,0.85)' },
  noGroupsMatch: { fontSize: 12, color: theme.colors.textSecondary, paddingVertical: 8 },
  tableScroll: { flex: 1 },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f4f4f5',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  th: { fontWeight: '600', fontSize: 12, color: theme.colors.textSecondary, paddingHorizontal: 8 },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  td: { fontSize: 13, paddingHorizontal: 8, justifyContent: 'center' },
  tdName: { fontWeight: '500' },
  tdCenter: { alignItems: 'center', justifyContent: 'center' },
  emptyState: { padding: 24, textAlign: 'center', color: theme.colors.textSecondary, width: 600 },
  emptyText: { fontSize: 12, color: '#ccc' },
  sentTime: { fontSize: 11, color: '#10b981' },
  yesNoBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  yesNoYes: { backgroundColor: '#f3e8ff' },
  yesNoNo: { backgroundColor: '#dbeafe' },
  yesNoText: { fontSize: 11, fontWeight: '600' },
  yesNoTextYes: { color: '#6b21a8' },
  yesNoTextNo: { color: '#1e3a8a' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tagBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  tagBadgeText: { fontSize: 10, fontWeight: '500' },
  tagAddHint: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  tagAddText: { fontSize: 11, color: theme.colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: theme.colors.text },
  tagOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  modalDoneBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalDoneText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  formModal: { flex: 1, backgroundColor: '#fff' },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  formTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  formBody: { padding: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6 },
  fieldInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
