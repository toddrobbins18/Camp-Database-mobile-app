import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { supabase } from '../lib/supabase';
import { useCompany } from '../contexts/CompanyContext';

type Camper = { id: string; name: string; town?: string; gender?: string; division?: string; requests?: string[]; disrequests?: string[] };

type Cabin = {
  id: string;
  name: string;
  capacity: number;
  campers: Camper[];
  gender?: string;
  ageGroup?: string;
};

const BUNKING_STORAGE_KEY = "camp-hub-bunking-boards";

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

const initialCabins: Cabin[] = [
  { id: "a", name: "Cabin A — Pine Lodge", capacity: 8, gender: "Girls", ageGroup: "10-12", campers: [
    { id: "c1", name: "Emma J." }, { id: "c2", name: "Sophia C." }, { id: "c3", name: "Ava M." },
    { id: "c4", name: "Mia T." }, { id: "c5", name: "Isabella D." }, { id: "c6", name: "Olivia W." },
  ]},
  { id: "b", name: "Cabin B — Oak House", capacity: 8, gender: "Boys", ageGroup: "10-12", campers: [
    { id: "c7", name: "Liam P." }, { id: "c8", name: "Noah W." }, { id: "c9", name: "Oliver B." },
    { id: "c10", name: "Lucas A." }, { id: "c11", name: "Mason W." },
  ]},
  { id: "f", name: "Cabin F — Spruce Nest", capacity: 8, gender: "Girls", ageGroup: "8-10", campers: [] },
];

export function BunkingScreen({ navigation }: any) {
  const { companyId } = useCompany();
  const [cabins, setCabins] = useState<Cabin[]>(initialCabins);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [camperOptionsModal, setCamperOptionsModal] = useState<{ camper: Camper; cabinId: string; cabinName: string } | null>(null);
  const [moveCamperModal, setMoveCamperModal] = useState<{ camperId: string; fromCabinId: string } | null>(null);

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
        <View style={styles.headerIcon}>
          <Ionicons name="bed-outline" size={24} color="#fff" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Bunking Boards</Text>
          <Text style={styles.headerSubtitle}>Tap a camper to move them</Text>
        </View>
        <TouchableOpacity style={styles.lockButton} onPress={() => setLocked(!locked)}>
          <Ionicons name={locked ? "lock-closed" : "lock-open"} size={20} color={locked ? theme.colors.primary : theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalAssigned}</Text>
            <Text style={styles.statLabel}>Assigned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{utilizationPct}%</Text>
            <Text style={styles.statLabel}>Full</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalCapacity - totalAssigned}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
        </View>

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
  lockButton: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
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
  }
});
