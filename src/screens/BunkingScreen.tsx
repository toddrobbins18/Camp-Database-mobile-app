import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';
import { fetchBunkingCampersFromRoster } from '../lib/bunkingRoster';
import { optimizeCabins, type OptCamper } from '../lib/bunking-optimizer';
import { parseCSV, pickFirst } from '../lib/sunshineCsv';
import { pickAndReadCsvText } from '../lib/pickCsvDocument';

type Camper = { id: string; name: string; town?: string; gender?: string; division?: string; requests?: string[]; disrequests?: string[] };

type Cabin = {
  id: string;
  name: string;
  capacity: number;
  campers: Camper[];
  gender?: string;
  ageGroup?: string;
};

const BUNKING_STORAGE_KEY = 'camp-hub-bunking-boards';
const COED_DIVISIONS = ['nursery', 'pre-k', 'prek', 'pre k'];
const BUNKING_CSV_TEMPLATE =
  'name,division,town,gender,requests,disrequests\n' +
  'Emma J.,Pre-K,Glen Cove,Girl,"Mia T., Sophia C.",\n' +
  'Mia T.,Pre-K,Glen Cove,Girl,Emma J.,\n' +
  'Liam P.,3rd Grade,Roslyn,Boy,Noah W.,Lucas A.\n' +
  'Noah W.,3rd Grade,Roslyn,Boy,Liam P.,\n';

function splitList(s: string): string[] {
  return s.split(/[,;|]/).map((x) => x.trim()).filter(Boolean);
}

function isCamper(value: unknown): value is Camper {
  if (!value || typeof value !== "object") return false;
  const camper = value as Partial<Camper>;
  return typeof camper.id === "string" && typeof camper.name === "string";
}

function isCabin(value: unknown): value is Cabin {
  if (!value || typeof value !== "object") return false;
  const cabin = value as Partial<Cabin>;
  return (
    typeof cabin.id === "string" &&
    typeof cabin.name === "string" &&
    typeof cabin.capacity === "number" &&
    Array.isArray(cabin.campers) &&
    cabin.campers.every(isCamper)
  );
}

const initialCabins: Cabin[] = [];

export function BunkingScreen({ navigation }: any) {
  const { companyId, season } = useCompany();
  const [cabins, setCabins] = useState<Cabin[]>(initialCabins);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterCount, setRosterCount] = useState<number | null>(null);
  
  // Modals
  const [camperOptionsModal, setCamperOptionsModal] = useState<{ camper: Camper; cabinId: string; cabinName: string } | null>(null);
  const [moveCamperModal, setMoveCamperModal] = useState<{ camperId: string; fromCabinId: string } | null>(null);
  const [addCabinOpen, setAddCabinOpen] = useState(false);
  const [addCamperOpen, setAddCamperOpen] = useState(false);
  const [editCabinId, setEditCabinId] = useState<string | null>(null);
  const [newCabin, setNewCabin] = useState({ name: '', capacity: '8', gender: '', ageGroup: '' });
  const [newCamper, setNewCamper] = useState({ name: '', cabinId: '' });
  const [pendingImport, setPendingImport] = useState<OptCamper[] | null>(null);
  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const [optimizeCapacity, setOptimizeCapacity] = useState('8');
  const [importingCsv, setImportingCsv] = useState(false);

  const lastWrittenRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    const fetchBoard = async () => {
      if (!companyId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("bunking_boards")
        .select("data")
        .eq("company_id", companyId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("Failed to load bunking board:", error);
      } else if (data?.data && Array.isArray(data.data) && (data.data as unknown[]).every(isCabin)) {
        const next = data.data as unknown as Cabin[];
        lastWrittenRef.current = JSON.stringify(next);
        setCabins(next);
      }
      setLoading(false);
    };
    fetchBoard();
    return () => { cancelled = true; };
  }, [companyId]);

  useEffect(() => {
    if (!companyId || !season) return;
    fetchBunkingCampersFromRoster(companyId, season)
      .then((campers) => setRosterCount(campers.length))
      .catch(() => setRosterCount(null));
  }, [companyId, season]);

  const handleLoadFromRoster = async () => {
    if (!companyId) return;
    setLoadingRoster(true);
    try {
      const campers = await fetchBunkingCampersFromRoster(companyId, season);
      if (!campers.length) {
        Alert.alert('No campers', `No active campers found for season ${season}.`);
        return;
      }
      setRosterCount(campers.length);
      setPendingImport(campers);
      setOptimizeOpen(true);
      Alert.alert('Roster loaded', `Loaded ${campers.length} campers from ${season} roster.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not load roster');
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await Share.share({
        title: 'Bunking template',
        message: BUNKING_CSV_TEMPLATE,
      });
    } catch {
      Alert.alert('Template', 'Could not share template.');
    }
  };

  const handleCSVImport = async () => {
    if (locked) return;
    setImportingCsv(true);
    try {
      const picked = await pickAndReadCsvText();
      if (!picked.ok) {
        if (picked.error !== 'canceled') {
          Alert.alert('Import CSV', picked.message || 'Could not read file.');
        }
        return;
      }
      const rows = parseCSV(picked.text);
      if (!rows.length) {
        Alert.alert('Import CSV', 'CSV is empty.');
        return;
      }

      const parsed: OptCamper[] = [];
      let skipped = 0;
      let hasCabinCol = false;
      const cabinUpdates: { name: string; cabin: string }[] = [];

      rows.forEach((r, idx) => {
        const fullName = pickFirst(r, ['name', 'camper', 'full name', 'child', 'camper name']).trim();
        const first = pickFirst(r, ['first name', 'first', 'firstname', 'given name']).trim();
        const last = pickFirst(r, ['last name', 'last', 'lastname', 'surname', 'family name']).trim();
        const name = fullName || [first, last].filter(Boolean).join(' ').trim();
        if (!name) {
          skipped++;
          return;
        }
        const cabinName = pickFirst(r, ['cabin', 'cabin name']).trim();
        if (cabinName) {
          hasCabinCol = true;
          cabinUpdates.push({ name, cabin: cabinName });
        }
        parsed.push({
          id: `c-${Date.now()}-${idx}`,
          name,
          division: pickFirst(r, ['division', 'group', 'age group', 'grade']).trim(),
          town: pickFirst(r, ['town', 'city', 'hometown', 'village', 'primary childhood homecity', 'home city', 'primary city']).trim(),
          gender: pickFirst(r, ['gender', 'sex']).trim(),
          requests: splitList(pickFirst(r, ['requests', 'request', 'friends', 'with', 'share group with', 'share with'])),
          disrequests: splitList(pickFirst(r, ['disrequests', 'do not pair', 'do_not_pair', 'avoid', 'not with', 'do not share group with', 'do not share with'])),
        });
      });

      if (hasCabinCol && parsed.every((p) => !p.division && !p.town && !p.requests?.length)) {
        let added = 0;
        let createdCabins = 0;
        const updates = cabins.map((c) => ({ ...c, campers: [...c.campers] }));
        const updatesByName = new Map(updates.map((c) => [c.name.toLowerCase(), c]));
        for (const row of cabinUpdates) {
          let cabin = updatesByName.get(row.cabin.toLowerCase());
          if (!cabin) {
            cabin = { id: `cabin-${Date.now()}-${createdCabins}`, name: row.cabin, capacity: 8, campers: [] };
            updates.push(cabin);
            updatesByName.set(row.cabin.toLowerCase(), cabin);
            createdCabins++;
          }
          if (cabin.campers.length >= cabin.capacity) {
            skipped++;
            continue;
          }
          cabin.campers.push({ id: `c-${Date.now()}-${added}`, name: row.name });
          added++;
        }
        await saveBoard(updates);
        Alert.alert(
          'Import complete',
          `Imported ${added} camper${added === 1 ? '' : 's'}` +
            (createdCabins ? `, created ${createdCabins} cabin${createdCabins === 1 ? '' : 's'}` : '') +
            (skipped ? `, skipped ${skipped}` : '') +
            '.',
        );
        return;
      }

      setPendingImport(parsed);
      setOptimizeOpen(true);
      Alert.alert(
        'CSV loaded',
        skipped
          ? `Loaded ${parsed.length} campers (${skipped} skipped — missing name).`
          : `Loaded ${parsed.length} campers — ready to optimize.`,
      );
    } catch (e: any) {
      Alert.alert('Import error', e?.message || String(e));
    } finally {
      setImportingCsv(false);
    }
  };

  const handleRunOptimize = async () => {
    if (!pendingImport?.length) {
      Alert.alert('Optimize', 'No campers loaded.');
      return;
    }
    const capacity = Math.max(1, Number(optimizeCapacity) || 8);
    const detailById = new Map(pendingImport.map((c) => [c.id, c]));
    const { cabins: optCabins } = optimizeCabins(pendingImport, {
      defaultCapacity: capacity,
      coedDivisions: COED_DIVISIONS,
    });
    if (!optCabins.length) {
      Alert.alert('Optimize', 'Optimizer produced no cabins.');
      return;
    }

    const enrich = (cm: { id: string; name: string }): Camper => {
      const d = detailById.get(cm.id);
      return d
        ? {
            id: cm.id,
            name: cm.name,
            town: d.town,
            gender: d.gender,
            division: d.division,
            requests: d.requests,
            disrequests: d.disrequests,
          }
        : { id: cm.id, name: cm.name };
    };

    const existing = cabins.map((c) => ({ ...c, campers: [] as Camper[] }));
    const used = new Set<string>();
    const final: typeof existing = [];
    let createdCount = 0;

    optCabins.forEach((opt) => {
      const match = existing.find(
        (ex) =>
          !used.has(ex.id) &&
          (ex.ageGroup || '').toLowerCase() === (opt.ageGroup || '').toLowerCase() &&
          (ex.gender || '').toLowerCase() === (opt.gender || '').toLowerCase(),
      );
      if (match) {
        used.add(match.id);
        final.push({
          ...match,
          capacity: Math.max(match.capacity, opt.capacity),
          campers: opt.campers.map(enrich),
        });
      } else {
        createdCount++;
        final.push({
          id: opt.id,
          name: opt.name,
          capacity: opt.capacity,
          gender: opt.gender,
          ageGroup: opt.ageGroup,
          campers: opt.campers.map(enrich),
        });
      }
    });

    existing.forEach((ex) => {
      if (!used.has(ex.id)) final.push(ex);
    });

    await saveBoard(final);
    setOptimizeOpen(false);
    setPendingImport(null);
    const placed = optCabins.reduce((s, c) => s + c.campers.length, 0);
    Alert.alert(
      'Optimized',
      `Placed ${placed} camper${placed === 1 ? '' : 's'} across ${optCabins.length} cabin${optCabins.length === 1 ? '' : 's'}` +
        (createdCount ? ` (added ${createdCount} new).` : '.'),
    );
  };

  const handleSaveCabin = async () => {
    if (!newCabin.name.trim()) {
      Alert.alert('Add cabin', 'Cabin name is required.');
      return;
    }
    const capacity = Math.max(1, Number(newCabin.capacity) || 8);
    if (editCabinId) {
      const next = cabins.map((c) =>
        c.id === editCabinId
          ? {
              ...c,
              name: newCabin.name.trim(),
              capacity,
              gender: newCabin.gender || undefined,
              ageGroup: newCabin.ageGroup || undefined,
            }
          : c,
      );
      await saveBoard(next);
    } else {
      const id = `cabin-${Date.now()}`;
      await saveBoard([
        ...cabins,
        {
          id,
          name: newCabin.name.trim(),
          capacity,
          gender: newCabin.gender || undefined,
          ageGroup: newCabin.ageGroup || undefined,
          campers: [],
        },
      ]);
    }
    setAddCabinOpen(false);
    setEditCabinId(null);
    setNewCabin({ name: '', capacity: '8', gender: '', ageGroup: '' });
  };

  const handleAddCamper = async () => {
    if (!newCamper.name.trim() || !newCamper.cabinId) {
      Alert.alert('Add camper', 'Name and cabin are required.');
      return;
    }
    const cabin = cabins.find((c) => c.id === newCamper.cabinId);
    if (!cabin) return;
    if (cabin.campers.length >= cabin.capacity) {
      Alert.alert('Add camper', 'That cabin is full.');
      return;
    }
    const id = `c-${Date.now()}`;
    const next = cabins.map((c) =>
      c.id === newCamper.cabinId
        ? { ...c, campers: [...c.campers, { id, name: newCamper.name.trim() }] }
        : c,
    );
    await saveBoard(next);
    setAddCamperOpen(false);
    setNewCamper({ name: '', cabinId: '' });
  };

  const openAutoOptimize = () => {
    const current = cabins.flatMap((c) =>
      c.campers.map((cm) => ({
        id: cm.id,
        name: cm.name,
        division: cm.division || c.ageGroup || '',
        gender: cm.gender,
        town: cm.town,
        requests: cm.requests,
        disrequests: cm.disrequests,
      })),
    );
    setOptimizeCapacity('8');
    setPendingImport(current);
    setOptimizeOpen(true);
  };

  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel("bunking_boards_shared_mobile")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bunking_boards", filter: `company_id=eq.${companyId}` },
        (payload) => {
          const newRow = (payload.new ?? {}) as { data?: unknown };
          if (!newRow.data || !Array.isArray(newRow.data)) return;
          if (!(newRow.data as unknown[]).every(isCabin)) return;
          const incoming = JSON.stringify(newRow.data);
          if (incoming === lastWrittenRef.current) return;
          lastWrittenRef.current = incoming;
          setCabins(newRow.data as unknown as Cabin[]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  const saveBoard = async (newCabins: Cabin[]) => {
    if (!companyId) return;
    setCabins(newCabins);
    const serialized = JSON.stringify(newCabins);
    lastWrittenRef.current = serialized;
    
    const { data: userData } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("bunking_boards")
      .upsert(
        { company_id: companyId, data: newCabins as unknown as never, updated_by: userData.user?.id },
        { onConflict: "company_id" }
      );
    if (error) console.error("Failed to save bunking board:", error);
  };

  const handleMoveCamper = (toCabinId: string) => {
    if (!moveCamperModal || locked) return;
    const { camperId, fromCabinId } = moveCamperModal;
    if (fromCabinId === toCabinId) { 
        setMoveCamperModal(null); 
        setCamperOptionsModal(null);
        return; 
    }

    const newCabins = cabins.map((cabin) => {
      if (cabin.id === fromCabinId) return { ...cabin, campers: cabin.campers.filter((c) => c.id !== camperId) };
      return cabin;
    });

    const fromCabin = cabins.find((c) => c.id === fromCabinId);
    const toCabin = newCabins.find((c) => c.id === toCabinId);
    
    if (!fromCabin || !toCabin) return;
    if (toCabin.campers.length >= toCabin.capacity) {
        Alert.alert("Error", "That cabin is full.");
        return;
    }

    const camper = fromCabin.campers.find((c) => c.id === camperId);
    if (!camper) return;

    const finalCabins = newCabins.map(cabin => {
        if (cabin.id === toCabinId) return { ...cabin, campers: [...cabin.campers, camper] };
        return cabin;
    });

    saveBoard(finalCabins);
    setMoveCamperModal(null);
    setCamperOptionsModal(null);
  };

  const totalCapacity = cabins.reduce((s, c) => s + c.capacity, 0);
  const totalAssigned = cabins.reduce((s, c) => s + c.campers.length, 0);
  const utilizationPct = totalCapacity ? Math.round((totalAssigned / totalCapacity) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuButton}>
          <Ionicons name="menu-outline" size={26} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Ionicons name="bed-outline" size={24} color="#fff" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Bunking Boards</Text>
          <Text style={styles.headerSubtitle}>
            Group campers into cabins — season {season}
            {rosterCount != null ? ` · ${rosterCount} on roster` : ''}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.actionBarScroll}
        contentContainerStyle={styles.actionBarContent}
      >
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={handleLoadFromRoster}
          disabled={loadingRoster || locked}
        >
          {loadingRoster ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={14} color="#fff" />
              <Text style={styles.actionBtnPrimaryText}>Load from Roster</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleDownloadTemplate}>
          <Ionicons name="download-outline" size={14} color={theme.colors.text} />
          <Text style={styles.actionBtnText}>Template</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleCSVImport}
          disabled={importingCsv || locked}
        >
          {importingCsv ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={14} color={theme.colors.text} />
              <Text style={styles.actionBtnText}>Import CSV</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            setEditCabinId(null);
            setNewCabin({ name: '', capacity: '8', gender: '', ageGroup: '' });
            setAddCabinOpen(true);
          }}
          disabled={locked}
        >
          <Ionicons name="home-outline" size={14} color={theme.colors.text} />
          <Text style={styles.actionBtnText}>Add Cabin</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={openAutoOptimize} disabled={locked}>
          <Ionicons name="sparkles-outline" size={14} color={theme.colors.text} />
          <Text style={styles.actionBtnText}>Auto-Optimize</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            setNewCamper({ name: '', cabinId: cabins[0]?.id ?? '' });
            setAddCamperOpen(true);
          }}
          disabled={locked || cabins.length === 0}
        >
          <Ionicons name="person-add-outline" size={14} color={theme.colors.text} />
          <Text style={styles.actionBtnText}>Add Camper</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, locked && styles.actionBtnLocked]}
          onPress={() => setLocked(!locked)}
        >
          <Ionicons
            name={locked ? 'lock-closed' : 'lock-open-outline'}
            size={14}
            color={locked ? theme.colors.primary : theme.colors.text}
          />
          <Text style={[styles.actionBtnText, locked && styles.actionBtnLockedText]}>
            {locked ? 'Board Locked' : 'Lock Board'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView style={styles.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalAssigned}</Text>
            <Text style={styles.statLabel}>Campers Assigned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalCapacity}</Text>
            <Text style={styles.statLabel}>Total Capacity</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{utilizationPct}%</Text>
            <Text style={styles.statLabel}>Utilization</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalCapacity - totalAssigned}</Text>
            <Text style={styles.statLabel}>Open Spots</Text>
          </View>
        </ScrollView>

        {cabins.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No cabins yet</Text>
            <Text style={styles.emptyText}>
              Load from Roster or Import CSV, then run Auto-Optimize to build cabin assignments.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleLoadFromRoster} disabled={loadingRoster}>
              <Text style={styles.primaryButtonText}>Load from Roster</Text>
            </TouchableOpacity>
          </View>
        )}

        {cabins.map((cabin) => {
          const pct = Math.round((cabin.campers.length / cabin.capacity) * 100);
          const isFull = cabin.campers.length >= cabin.capacity;

          return (
            <View key={cabin.id} style={styles.cabinCard}>
              <View style={styles.cabinHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cabinName}>{cabin.name}</Text>
                  <View style={styles.cabinBadges}>
                    {cabin.gender && <Text style={styles.badge}>{cabin.gender}</Text>}
                    {cabin.ageGroup && <Text style={styles.badge}>Ages {cabin.ageGroup}</Text>}
                  </View>
                </View>
                <View style={[styles.capacityBadge, isFull ? styles.capacityBadgeFull : null]}>
                  <Text style={[styles.capacityText, isFull ? styles.capacityTextFull : null]}>
                    {cabin.campers.length}/{cabin.capacity}
                  </Text>
                </View>
              </View>

              <View style={styles.campersList}>
                {cabin.campers.map((camper) => (
                  <TouchableOpacity
                    key={camper.id}
                    style={[styles.camperRow, locked && styles.camperRowLocked]}
                    disabled={locked}
                    onPress={() => setCamperOptionsModal({ camper, cabinId: cabin.id, cabinName: cabin.name })}
                  >
                    <View style={styles.camperInitials}>
                      <Text style={styles.initialsText}>{camper.name.split(" ").map((n) => n[0]).join("").substring(0,2)}</Text>
                    </View>
                    <Text style={styles.camperName}>{camper.name}</Text>
                    {!locked && <Ionicons name="chevron-forward" size={16} color={theme.colors.border} />}
                  </TouchableOpacity>
                ))}
                
                {Array.from({ length: cabin.capacity - cabin.campers.length }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.emptySlot}>
                    <Text style={styles.emptySlotText}>{locked ? "—" : "Empty slot"}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${pct}%`, backgroundColor: isFull ? theme.colors.warning : theme.colors.primary }]} />
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Camper Options Modal */}
      <Modal visible={!!camperOptionsModal && !moveCamperModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{camperOptionsModal?.camper.name}</Text>
              <TouchableOpacity onPress={() => setCamperOptionsModal(null)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>Currently in {camperOptionsModal?.cabinName}</Text>
              
              <View style={styles.camperDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Division:</Text>
                  <Text style={styles.detailValue}>{camperOptionsModal?.camper.division || '—'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Town:</Text>
                  <Text style={styles.detailValue}>{camperOptionsModal?.camper.town || '—'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Gender:</Text>
                  <Text style={styles.detailValue}>{camperOptionsModal?.camper.gender || '—'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => setMoveCamperModal({ camperId: camperOptionsModal!.camper.id, fromCabinId: camperOptionsModal!.cabinId })}
              >
                <Ionicons name="swap-horizontal" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>Move to another cabin</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.dangerButton}
                onPress={() => {
                  if (camperOptionsModal) {
                    const newCabins = cabins.map((c) => 
                      c.id === camperOptionsModal.cabinId 
                        ? { ...c, campers: c.campers.filter((cm) => cm.id !== camperOptionsModal.camper.id) } 
                        : c
                    );
                    saveBoard(newCabins);
                    setCamperOptionsModal(null);
                  }
                }}
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.error} style={{ marginRight: 8 }} />
                <Text style={styles.dangerButtonText}>Remove from cabin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Move Camper Modal */}
      <Modal visible={!!moveCamperModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Destination</Text>
              <TouchableOpacity onPress={() => setMoveCamperModal(null)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.cabinSelectScroll}>
              {cabins.map(cabin => {
                const isFull = cabin.campers.length >= cabin.capacity;
                const isCurrent = cabin.id === moveCamperModal?.fromCabinId;
                return (
                  <TouchableOpacity 
                    key={cabin.id}
                    style={[styles.cabinSelectRow, isFull && !isCurrent && styles.cabinSelectRowDisabled]}
                    disabled={isFull && !isCurrent}
                    onPress={() => handleMoveCamper(cabin.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cabinSelectName}>{cabin.name}</Text>
                      {isCurrent && <Text style={styles.cabinSelectCurrent}>Current Cabin</Text>}
                    </View>
                    <Text style={[styles.cabinSelectCapacity, isFull ? styles.capacityTextFull : null]}>
                      {cabin.campers.length}/{cabin.capacity}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add / Edit Cabin */}
      <Modal visible={addCabinOpen} transparent animationType="slide" onRequestClose={() => setAddCabinOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editCabinId ? 'Edit Cabin' : 'Add Cabin'}</Text>
              <TouchableOpacity onPress={() => setAddCabinOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.formLabel}>Cabin Name</Text>
            <TextInput
              style={styles.formInput}
              value={newCabin.name}
              onChangeText={(v) => setNewCabin((p) => ({ ...p, name: v }))}
              placeholder="e.g. Cabin G — Willow"
            />
            <Text style={styles.formLabel}>Capacity</Text>
            <TextInput
              style={styles.formInput}
              value={newCabin.capacity}
              onChangeText={(v) => setNewCabin((p) => ({ ...p, capacity: v }))}
              keyboardType="number-pad"
            />
            <Text style={styles.formLabel}>Gender (optional)</Text>
            <TextInput
              style={styles.formInput}
              value={newCabin.gender}
              onChangeText={(v) => setNewCabin((p) => ({ ...p, gender: v }))}
              placeholder="Girls, Boys, or Co-ed"
            />
            <Text style={styles.formLabel}>Age Group (optional)</Text>
            <TextInput
              style={styles.formInput}
              value={newCabin.ageGroup}
              onChangeText={(v) => setNewCabin((p) => ({ ...p, ageGroup: v }))}
              placeholder="e.g. 10-12"
            />
            <View style={styles.formFooter}>
              <TouchableOpacity style={styles.outlineButton} onPress={() => setAddCabinOpen(false)}>
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleSaveCabin}>
                <Text style={styles.primaryButtonText}>{editCabinId ? 'Save Changes' : 'Add Cabin'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Camper */}
      <Modal visible={addCamperOpen} transparent animationType="slide" onRequestClose={() => setAddCamperOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Camper</Text>
              <TouchableOpacity onPress={() => setAddCamperOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.formLabel}>Camper Name</Text>
            <TextInput
              style={styles.formInput}
              value={newCamper.name}
              onChangeText={(v) => setNewCamper((p) => ({ ...p, name: v }))}
              placeholder="e.g. Sarah K."
            />
            <Text style={styles.formLabel}>Cabin</Text>
            <ScrollView style={styles.cabinSelectScroll}>
              {cabins.map((cabin) => {
                const isFull = cabin.campers.length >= cabin.capacity;
                const selected = newCamper.cabinId === cabin.id;
                return (
                  <TouchableOpacity
                    key={cabin.id}
                    style={[styles.cabinSelectRow, selected && styles.cabinSelectRowSelected]}
                    disabled={isFull}
                    onPress={() => setNewCamper((p) => ({ ...p, cabinId: cabin.id }))}
                  >
                    <Text style={styles.cabinSelectName}>{cabin.name}</Text>
                    <Text style={styles.cabinSelectCapacity}>
                      {cabin.campers.length}/{cabin.capacity}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.formFooter}>
              <TouchableOpacity style={styles.outlineButton} onPress={() => setAddCamperOpen(false)}>
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleAddCamper}>
                <Text style={styles.primaryButtonText}>Add Camper</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Auto-Optimize */}
      <Modal
        visible={optimizeOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setOptimizeOpen(false);
          setPendingImport(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Auto-Optimize Cabins</Text>
              <TouchableOpacity
                onPress={() => {
                  setOptimizeOpen(false);
                  setPendingImport(null);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Loaded {pendingImport?.length ?? 0} campers. Groups by town first, then mutual requests, while honoring do-not-pair rules.
            </Text>
            <Text style={styles.formLabel}>Default cabin capacity</Text>
            <TextInput
              style={styles.formInput}
              value={optimizeCapacity}
              onChangeText={setOptimizeCapacity}
              keyboardType="number-pad"
            />
            {pendingImport && pendingImport.length > 0 ? (
              <View style={styles.optimizePreview}>
                <Text style={styles.optimizePreviewTitle}>Preview</Text>
                <Text style={styles.optimizePreviewText} numberOfLines={3}>
                  Divisions: {[...new Set(pendingImport.map((c) => c.division || '—'))].join(', ')}
                </Text>
              </View>
            ) : null}
            <View style={styles.formFooter}>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => {
                  setOptimizeOpen(false);
                  setPendingImport(null);
                }}
              >
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleRunOptimize}>
                <Ionicons name="sparkles-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.primaryButtonText}>Run Optimizer</Text>
              </TouchableOpacity>
            </View>
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
  menuButton: {
    marginRight: 8,
    padding: 4,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
  },
  actionBarScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    maxHeight: 52,
  },
  actionBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
  },
  actionBtnPrimary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  actionBtnPrimaryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnLocked: {
    backgroundColor: '#eff6ff',
    borderColor: theme.colors.primary,
  },
  actionBtnLockedText: {
    color: theme.colors.primary,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
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
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    color: theme.colors.text,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
    paddingRight: 8,
  },
  statCard: {
    minWidth: 120,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  cabinCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cabinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#fafafa',
  },
  cabinName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  cabinBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    fontSize: 10,
    backgroundColor: '#e2e8f0',
    color: '#475569',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  capacityBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  capacityBadgeFull: {
    backgroundColor: '#fef3c7',
  },
  capacityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  capacityTextFull: {
    color: '#b45309',
  },
  campersList: {
    padding: 8,
  },
  camperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    marginBottom: 6,
  },
  camperRowLocked: {
    opacity: 0.8,
  },
  camperInitials: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  initialsText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  camperName: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  emptySlot: {
    padding: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    marginBottom: 6,
    alignItems: 'center',
  },
  emptySlotText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#f1f5f9',
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    marginBottom: 24,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  camperDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    width: 70,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
  },
  modalActions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.error,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  dangerButtonText: {
    color: theme.colors.error,
    fontSize: 15,
    fontWeight: '600',
  },
  cabinSelectScroll: {
    maxHeight: 400,
  },
  cabinSelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cabinSelectRowDisabled: {
    opacity: 0.4,
  },
  cabinSelectName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  cabinSelectCurrent: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 2,
  },
  cabinSelectCapacity: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  cabinSelectRowSelected: {
    backgroundColor: '#eff6ff',
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: '#fafafa',
  },
  formFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  outlineButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  optimizePreview: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#f8fafc',
  },
  optimizePreviewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  optimizePreviewText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
