import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Pressable,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { theme } from '../theme/theme';
import { CAMP_LOCATION, ROUTE_COLORS, isCampStop } from '../lib/transportBoardUtils';
import { todayDateString } from '../lib/transportDailyOverrides';
import { TransportRouteMapNative } from '../components/TransportRouteMapNative';
import { DAY_CAMP_REPORTS, useDayCampTransport } from '../hooks/useDayCampTransport';

type Tab = 'map' | 'unplotted' | 'reports';

function ymdFromDate(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

function dateFromYmd(ymd: string) {
  return new Date(`${ymd}T12:00:00`);
}

export function DayCampTransportScreen({ navigation }: { navigation: any }) {
  const t = useDayCampTransport();
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRouteSheet, setShowRouteSheet] = useState(true);
  const [showOverflow, setShowOverflow] = useState(false);
  const isToday = t.overrideDate === todayDateString();

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'map', label: 'Route Map' },
    { id: 'unplotted', label: 'Unplotted', badge: t.unplottedCampers.length || undefined },
    { id: 'reports', label: 'Reports' },
  ];

  const toolbarItems = [
    { key: 'mappoint', label: 'Apply MapPoint', icon: 'git-network-outline' as const, onPress: t.handleLoadMappointRoutes, loading: t.mappointImporting },
    { key: 'template', label: 'Route Template', icon: 'layers-outline' as const, onPress: t.handleApplyRouteTemplate, loading: t.applyingTemplate },
    { key: 'history', label: 'Historical', icon: 'time-outline' as const, onPress: t.handleApplyHistoricalAssignments, loading: t.applyingHistorical, disabled: t.unplottedCampers.length === 0 },
    { key: 'bulk', label: 'Bulk Upload', icon: 'cloud-upload-outline' as const, onPress: t.openBulkImport },
    { key: 'camper', label: 'Add Camper', icon: 'person-add-outline' as const, onPress: () => t.setAddCamperOpen(true) },
    { key: 'regeo', label: 'Re-geocode', icon: 'location-outline' as const, onPress: t.handleRegeocodeAll, loading: t.regeocoding },
    { key: 'route', label: 'Add Route', icon: 'add-circle-outline' as const, onPress: () => t.setAddRouteOpen(true) },
  ];

  const renderScopeDialog = () => (
    <Modal visible={t.scopeDialog.open} transparent animationType="fade">
      <Pressable style={styles.modalBackdrop} onPress={() => t.setScopeDialog((p) => ({ ...p, open: false }))}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>{t.scopeDialog.title}</Text>
          <Text style={styles.modalDesc}>{t.scopeDialog.description}</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalBtnOutline} onPress={() => t.setScopeDialog((p) => ({ ...p, open: false }))}>
              <Text style={styles.modalBtnOutlineText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnOutline} onPress={() => t.scopeDialog.onChoose('today')}>
              <Text style={styles.modalBtnOutlineText}>Today only</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => t.scopeDialog.onChoose('permanent')}>
              <Text style={styles.modalBtnPrimaryText}>Permanent</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderStopActionModal = () => {
    if (!t.stopAction) return null;
    const { routeId, stopIndex, stop } = t.stopAction;
    if (isCampStop(stop)) return null;
    return (
      <Modal visible transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => t.setStopAction(null)}>
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{stop.camperNames?.join(', ') || stop.name}</Text>
            <Text style={styles.modalDesc}>{stop.address}</Text>
            <TouchableOpacity
              style={styles.sheetBtn}
              onPress={() => {
                Alert.alert('Move to route', 'Select destination route', [
                  { text: 'Cancel', style: 'cancel' },
                  ...t.routeMeta.map((r) => ({
                    text: r.bus,
                    onPress: () => {
                      if (r.id !== routeId) {
                        t.handleMoveStop(routeId, stopIndex, r.id);
                      } else {
                        t.setStopAction(null);
                      }
                    },
                  })),
                ]);
              }}
            >
              <Ionicons name="swap-horizontal" size={18} color={theme.colors.secondary} />
              <Text style={styles.sheetBtnText}>Move to another route</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetBtn, styles.sheetBtnDanger]}
              onPress={() => t.handleRemoveStop(routeId, stopIndex)}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
              <Text style={[styles.sheetBtnText, { color: theme.colors.danger }]}>Remove stop</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetBtnCancel} onPress={() => t.setStopAction(null)}>
              <Text style={styles.sheetBtnCancelText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  const renderMapTab = () => (
    <View style={styles.mapTab}>
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.secondary} />
          <Text style={styles.dateBtnText}>{t.overrideDate}</Text>
          {isToday && <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>Today</Text></View>}
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dateFromYmd(t.overrideDate)}
            mode="date"
            display="default"
            onChange={(_, d) => {
              setShowDatePicker(false);
              if (d) t.setOverrideDate(ymdFromDate(d));
            }}
          />
        )}
        <View style={styles.amPmToggle}>
          <TouchableOpacity
            style={[styles.amPmBtn, t.timeOfDay === 'am' && styles.amPmBtnActive]}
            onPress={() => t.setTimeOfDay('am')}
          >
            <Ionicons name="sunny-outline" size={14} color={t.timeOfDay === 'am' ? theme.colors.text : theme.colors.textSecondary} />
            <Text style={[styles.amPmText, t.timeOfDay === 'am' && styles.amPmTextActive]}>AM</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.amPmBtn, t.timeOfDay === 'pm' && styles.amPmBtnActive]}
            onPress={() => t.setTimeOfDay('pm')}
          >
            <Ionicons name="moon-outline" size={14} color={t.timeOfDay === 'pm' ? theme.colors.text : theme.colors.textSecondary} />
            <Text style={[styles.amPmText, t.timeOfDay === 'pm' && styles.amPmTextActive]}>PM</Text>
          </TouchableOpacity>
        </View>
        {t.transportExceptions.length > 0 && (
          <View style={styles.exceptionBadge}>
            <Text style={styles.exceptionBadgeText}>{t.transportExceptions.length} exceptions</Text>
          </View>
        )}
        <TouchableOpacity style={styles.optimizeBtn} onPress={() => t.handleOptimizeRoutes()} disabled={t.optimizing}>
          {t.optimizing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="sparkles" size={14} color="#fff" />}
          <Text style={styles.optimizeBtnText}>{t.optimizing ? 'Optimizing…' : 'Optimize'}</Text>
        </TouchableOpacity>
      </View>

      {t.transportExceptions.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exceptionsScroll}>
          {t.transportExceptions.slice(0, 8).map((ex, i) => (
            <View key={`${ex.source}-${ex.camperName}-${i}`} style={styles.exceptionChip}>
              <Text style={styles.exceptionChipText} numberOfLines={1}>{ex.camperName}: {ex.label}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.mapRow}>
        <View style={[styles.mapContainer, !showRouteSheet && styles.mapContainerFull]}>
          {(t.boardLoading || t.mappointImporting) && (
            <View style={styles.mapLoading}>
              <ActivityIndicator color={theme.colors.secondary} />
              <Text style={styles.mapLoadingText}>{t.mappointImporting ? 'Loading MapPoint…' : 'Loading board…'}</Text>
            </View>
          )}
          <TransportRouteMapNative
            routes={t.displayedRoutes}
            allRoutes={t.allRoutes}
            unplottedCampers={t.unplottedCampers}
            campAddress={CAMP_LOCATION.address}
            onStopPress={(routeId, stopIndex, stop) => t.setStopAction({ routeId, stopIndex, stop })}
            onUnplottedPress={(camperId) => {
              Alert.alert('Assign camper', 'Choose a route', [
                { text: 'Cancel', style: 'cancel' },
                ...t.routeMeta.map((r) => ({
                  text: r.bus,
                  onPress: () => t.handleAssignCamperToRoute(camperId, r.id),
                })),
              ]);
            }}
          />
          <TouchableOpacity style={styles.routeSheetToggle} onPress={() => setShowRouteSheet((v) => !v)}>
            <Ionicons name={showRouteSheet ? 'chevron-down' : 'chevron-up'} size={18} color={theme.colors.text} />
            <Text style={styles.routeSheetToggleText}>{showRouteSheet ? 'Hide routes' : 'Show routes'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showRouteSheet && (
        <View style={styles.routeSheet}>
          <View style={styles.routeSheetHeader}>
            <Text style={styles.routeSheetTitle}>
              {t.timeOfDay === 'am' ? 'AM Routes (→ Camp)' : 'PM Routes (Camp →)'}
            </Text>
            <View style={styles.routeSheetActions}>
              <TouchableOpacity onPress={t.hideAllRoutes}><Text style={styles.linkText}>Hide all</Text></TouchableOpacity>
              <TouchableOpacity onPress={t.showAllRoutes}><Text style={styles.linkText}>Show all</Text></TouchableOpacity>
            </View>
          </View>
          <FlatList
            data={t.routes}
            keyExtractor={(r) => String(r.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.routeList}
            renderItem={({ item: r }) => {
              const isVisible = t.visibleRoutes.includes(r.id);
              const core = t.coreStops[r.id] || [];
              return (
                <TouchableOpacity
                  style={[styles.routeCard, isVisible && styles.routeCardActive, { borderLeftColor: r.color }]}
                  onPress={() => t.selectRouteOnMap(r.id)}
                >
                  <View style={styles.routeCardHeader}>
                    <View style={[styles.routeDot, { backgroundColor: r.color }]} />
                    <Text style={styles.routeBus} numberOfLines={1}>{r.bus}</Text>
                    <TouchableOpacity onPress={() => t.setEditRoute({ id: r.id, name: r.name, bus: r.bus, departure: r.departure, status: r.status, color: r.color, capacity: r.capacity })}>
                      <Ionicons name="create-outline" size={16} color={theme.colors.icon} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => t.handleOptimizeRoutes(r.id)} disabled={t.optimizing}>
                      <Ionicons name="sparkles-outline" size={16} color={theme.colors.icon} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.routeName} numberOfLines={1}>{r.name}</Text>
                  <Text style={styles.routeMeta}>{core.length} stops · {r.campers}/{r.capacity}</Text>
                  {isVisible && r.stops.length > 0 && (
                    <ScrollView style={styles.stopList} nestedScrollEnabled>
                      {r.stops.map((stop, i) => (
                        <TouchableOpacity
                          key={i}
                          style={styles.stopRow}
                          onPress={() => !isCampStop(stop) && t.setStopAction({ routeId: r.id, stopIndex: i, stop })}
                        >
                          <Text style={styles.stopName} numberOfLines={1}>
                            {isCampStop(stop) ? stop.name : stop.camperNames?.join(', ') || stop.name}
                          </Text>
                          {stop.pickupTime ? <Text style={styles.stopTime}>{stop.pickupTime}</Text> : null}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}
    </View>
  );

  const renderUnplottedTab = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.unplottedContent}>
      <View style={styles.unplottedToolbar}>
        <TouchableOpacity style={styles.toolChip} onPress={t.pickUnplottedCsv}>
          <Ionicons name="cloud-upload-outline" size={16} color={theme.colors.secondary} />
          <Text style={styles.toolChipText}>Import CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolChipPrimary} onPress={() => t.setAddCamperOpen(true)}>
          <Ionicons name="person-add-outline" size={16} color="#fff" />
          <Text style={styles.toolChipPrimaryText}>Add Camper</Text>
        </TouchableOpacity>
      </View>
      {t.unplottedCampers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>All campers have been assigned to routes!</Text>
        </View>
      ) : (
        t.unplottedCampers.map((c) => (
          <View key={c.id} style={styles.camperCard}>
            <View style={styles.camperCardHeader}>
              <View style={styles.camperIcon}>
                <Ionicons name="person" size={16} color="#8b5cf6" />
              </View>
              <View style={styles.camperInfo}>
                <View style={styles.camperTitleRow}>
                  <Text style={styles.camperName}>{c.name}</Text>
                  <TouchableOpacity onPress={() => t.handleRemoveUnplotted(c.id)}>
                    <Ionicons name="close" size={18} color={theme.colors.icon} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.camperAddress} numberOfLines={2}>{c.address || 'No address'}</Text>
                <Text style={styles.camperMeta}>Age {c.age} · {c.session}</Text>
                <TouchableOpacity
                  style={styles.assignBtn}
                  onPress={() => {
                    Alert.alert('Assign to route', c.name, [
                      { text: 'Cancel', style: 'cancel' },
                      ...t.routeMeta.map((r) => ({
                        text: r.bus,
                        onPress: () => t.handleAssignCamperToRoute(c.id, r.id),
                      })),
                    ]);
                  }}
                >
                  <Text style={styles.assignBtnText}>Assign to route…</Text>
                  <Ionicons name="chevron-down" size={14} color={theme.colors.secondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderReportsTab = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.reportsContent}>
      <View style={styles.reportDateRow}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.secondary} />
          <Text style={styles.dateBtnText}>{t.overrideDate}</Text>
        </TouchableOpacity>
        <Text style={styles.reportHint}>Season {t.season} · {t.timeOfDay.toUpperCase()} run for attendance PDF</Text>
      </View>
      {DAY_CAMP_REPORTS.map((r) => (
        <TouchableOpacity key={r.name} style={styles.reportCard} onPress={() => t.handleGenerateReport(r.name)}>
          <Text style={styles.reportTitle}>{r.name}</Text>
          <Text style={styles.reportDesc}>{r.desc}</Text>
          <Ionicons name="share-outline" size={18} color={theme.colors.secondary} style={styles.reportShareIcon} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Transport</Text>
          <Text style={styles.subtitle}>Bus routes, maps, coordination, and travel reports</Text>
        </View>
        <View style={styles.headerStats}>
          {t.referenceStatus && (
            <View style={styles.referenceBadge}>
              <Ionicons name="server-outline" size={14} color={theme.colors.secondary} />
              <Text style={styles.referenceBadgeText} numberOfLines={2}>
                {t.referenceStatus.loaded
                  ? `${t.referenceStatus.referenceSeason} · ${t.referenceStatus.priorCount} priors`
                  : 'No reference dataset'}
              </Text>
            </View>
          )}
          <View style={styles.totalBadge}>
            <Ionicons name="people" size={16} color={theme.colors.secondary} />
            <View>
              <Text style={styles.totalLabel}>Total Campers</Text>
              <Text style={styles.totalValue}>
                {t.totalCampers.total}
                <Text style={styles.totalSub}> ({t.totalCampers.assigned} routed · {t.totalCampers.unplotted} unplotted)</Text>
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolbar} contentContainerStyle={styles.toolbarContent}>
        {toolbarItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.toolbarBtn, item.disabled && styles.toolbarBtnDisabled]}
            onPress={item.onPress}
            disabled={item.loading || item.disabled}
          >
            {item.loading ? (
              <ActivityIndicator size="small" color={theme.colors.secondary} />
            ) : (
              <Ionicons name={item.icon} size={16} color={theme.colors.secondary} />
            )}
            <Text style={styles.toolbarBtnText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.toolbarBtn} onPress={() => setShowOverflow(true)}>
          <Ionicons name="ellipsis-horizontal" size={16} color={theme.colors.secondary} />
          <Text style={styles.toolbarBtnText}>More</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
            {tab.badge != null && tab.badge > 0 && (
              <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{tab.badge}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tabPanel}>
        {activeTab === 'map' && renderMapTab()}
        {activeTab === 'unplotted' && renderUnplottedTab()}
        {activeTab === 'reports' && renderReportsTab()}
      </View>

      {/* Add Route Modal */}
      <Modal visible={t.addRouteOpen} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => t.setAddRouteOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Add Route</Text>
            <TextInput style={styles.input} placeholder="Route name" value={t.newRoute.name} onChangeText={(v) => t.setNewRoute((p) => ({ ...p, name: v }))} />
            <TextInput style={styles.input} placeholder="Bus name" value={t.newRoute.bus} onChangeText={(v) => t.setNewRoute((p) => ({ ...p, bus: v }))} />
            <TextInput style={styles.input} placeholder="Departure (optional)" value={t.newRoute.departure} onChangeText={(v) => t.setNewRoute((p) => ({ ...p, departure: v }))} />
            <TextInput style={styles.input} placeholder="Capacity" keyboardType="number-pad" value={String(t.newRoute.capacity)} onChangeText={(v) => t.setNewRoute((p) => ({ ...p, capacity: parseInt(v, 10) || 50 }))} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnOutline} onPress={() => t.setAddRouteOpen(false)}><Text style={styles.modalBtnOutlineText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={t.handleAddRoute}><Text style={styles.modalBtnPrimaryText}>Add Route</Text></TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Camper Modal */}
      <Modal visible={t.addCamperOpen} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => t.setAddCamperOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Add Camper</Text>
            <TextInput style={styles.input} placeholder="Name" value={t.newUnplotted.name} onChangeText={(v) => t.setNewUnplotted((p) => ({ ...p, name: v }))} />
            <TextInput style={styles.input} placeholder="Home address" value={t.newUnplotted.address} onChangeText={(v) => t.setNewUnplotted((p) => ({ ...p, address: v }))} />
            <View style={styles.inputRow}>
              <TextInput style={[styles.input, styles.inputHalf]} placeholder="Age" keyboardType="number-pad" value={String(t.newUnplotted.age)} onChangeText={(v) => t.setNewUnplotted((p) => ({ ...p, age: Number(v) || 10 }))} />
              <TextInput style={[styles.input, styles.inputHalf]} placeholder="Session" value={t.newUnplotted.session} onChangeText={(v) => t.setNewUnplotted((p) => ({ ...p, session: v }))} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnOutline} onPress={() => t.setAddCamperOpen(false)}><Text style={styles.modalBtnOutlineText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => void t.handleAddUnplottedCamper()}><Text style={styles.modalBtnPrimaryText}>Add Camper</Text></TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Route Modal */}
      <Modal visible={!!t.editRoute} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => t.setEditRoute(null)}>
          <Pressable style={[styles.modalCard, styles.modalCardTall]} onPress={(e) => e.stopPropagation()}>
            {t.editRoute && (
              <>
                <Text style={styles.modalTitle}>Edit Route</Text>
                <TextInput style={styles.input} placeholder="Route name" value={t.editRoute.name} onChangeText={(v) => t.setEditRoute({ ...t.editRoute!, name: v })} />
                <TextInput style={styles.input} placeholder="Bus name" value={t.editRoute.bus} onChangeText={(v) => t.setEditRoute({ ...t.editRoute!, bus: v })} />
                <TextInput style={styles.input} placeholder="Departure" value={t.editRoute.departure} onChangeText={(v) => t.setEditRoute({ ...t.editRoute!, departure: v })} />
                <TextInput style={styles.input} placeholder="Capacity" keyboardType="number-pad" value={String(t.editRoute.capacity)} onChangeText={(v) => t.setEditRoute({ ...t.editRoute!, capacity: parseInt(v, 10) || 0 })} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
                  {ROUTE_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorSwatch, { backgroundColor: color }, t.editRoute!.color === color && styles.colorSwatchActive]}
                      onPress={() => t.setEditRoute({ ...t.editRoute!, color })}
                    />
                  ))}
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalBtnDanger} onPress={t.handleDeleteEditRoute}><Text style={styles.modalBtnDangerText}>Delete</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.modalBtnOutline} onPress={() => t.setEditRoute(null)}><Text style={styles.modalBtnOutlineText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.modalBtnPrimary} onPress={t.handleSaveEditRoute}><Text style={styles.modalBtnPrimaryText}>Save</Text></TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal visible={t.bulkImport.open} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => !t.bulkImport.running && t.setBulkImport((p) => ({ ...p, open: false }))}>
          <Pressable style={[styles.modalCard, styles.modalCardTall]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Bulk Upload Addresses</Text>
            <View style={styles.segmentRow}>
              {(['campers', 'stops', 'staff'] as const).map((target) => (
                <TouchableOpacity
                  key={target}
                  style={[styles.segmentBtn, t.bulkImport.target === target && styles.segmentBtnActive]}
                  onPress={() => t.setBulkImport((p) => ({ ...p, target }))}
                >
                  <Text style={[styles.segmentText, t.bulkImport.target === target && styles.segmentTextActive]}>{target}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {t.bulkImport.target === 'stops' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routePickRow}>
                {t.routeMeta.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.routePickChip, t.bulkImport.routeId === r.id && styles.routePickChipActive]}
                    onPress={() => t.setBulkImport((p) => ({ ...p, routeId: r.id }))}
                  >
                    <Text style={styles.routePickText}>{r.bus}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <View style={styles.segmentRow}>
              {(['append', 'replace'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.segmentBtn, t.bulkImport.mode === mode && styles.segmentBtnActive]}
                  onPress={() => t.setBulkImport((p) => ({ ...p, mode }))}
                >
                  <Text style={[styles.segmentText, t.bulkImport.mode === mode && styles.segmentTextActive]}>{mode}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {t.bulkImport.running && (
              <Text style={styles.progressText}>
                Geocoding {t.bulkImport.progress.done}/{t.bulkImport.progress.total}…
              </Text>
            )}
            {!t.bulkImport.running && t.bulkImport.log.ok + t.bulkImport.log.failed > 0 && (
              <Text style={styles.progressText}>
                {t.bulkImport.log.ok} added · {t.bulkImport.log.skipped} skipped · {t.bulkImport.log.failed} failed
              </Text>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnOutline} onPress={() => t.setBulkImport((p) => ({ ...p, open: false }))} disabled={t.bulkImport.running}>
                <Text style={styles.modalBtnOutlineText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => void t.pickBulkCsv()} disabled={t.bulkImport.running}>
                <Text style={styles.modalBtnPrimaryText}>{t.bulkImport.running ? 'Importing…' : 'Pick CSV'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Optimize Preview Modal */}
      <Modal visible={t.optimizePreview.open} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => t.setOptimizePreview((p) => ({ ...p, open: false }))}>
          <Pressable style={[styles.modalCard, styles.modalCardTall]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Route Optimization Preview</Text>
            <View style={styles.optimizeStats}>
              <View style={styles.optimizeStat}><Text style={styles.optimizeStatLabel}>Before</Text><Text style={styles.optimizeStatValue}>{t.optimizePreview.beforeMiles.toFixed(1)} mi</Text></View>
              <View style={styles.optimizeStat}><Text style={styles.optimizeStatLabel}>After</Text><Text style={[styles.optimizeStatValue, { color: theme.colors.secondary }]}>{t.optimizePreview.afterMiles.toFixed(1)} mi</Text></View>
              <View style={styles.optimizeStat}><Text style={styles.optimizeStatLabel}>Saved</Text><Text style={[styles.optimizeStatValue, { color: theme.colors.success }]}>{Math.max(0, t.optimizePreview.beforeMiles - t.optimizePreview.afterMiles).toFixed(1)} mi</Text></View>
            </View>
            <ScrollView style={styles.optimizeList}>
              {t.optimizePreview.perRoute.filter((p) => p.changed).map((p) => {
                const selected = t.optimizePreview.selectedRouteIds.includes(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.optimizeRow, selected && styles.optimizeRowSelected]}
                    onPress={() =>
                      t.setOptimizePreview((prev) => ({
                        ...prev,
                        selectedRouteIds: selected
                          ? prev.selectedRouteIds.filter((id) => id !== p.id)
                          : [...prev.selectedRouteIds, p.id],
                      }))
                    }
                  >
                    <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={18} color={theme.colors.secondary} />
                    <View style={styles.optimizeRowText}>
                      <Text style={styles.optimizeRowTitle}>{p.bus}</Text>
                      <Text style={styles.optimizeRowSub}>{p.beforeMi.toFixed(1)} → {p.afterMi.toFixed(1)} mi{p.addedCampers.length ? ` · +${p.addedCampers.length} campers` : ''}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnOutline} onPress={() => t.setOptimizePreview((p) => ({ ...p, open: false }))}><Text style={styles.modalBtnOutlineText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={t.applyOptimization}><Text style={styles.modalBtnPrimaryText}>Apply Selected</Text></TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Overflow menu */}
      <Modal visible={showOverflow} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setShowOverflow(false)}>
          <Pressable style={styles.overflowMenu} onPress={(e) => e.stopPropagation()}>
            <TouchableOpacity
              style={styles.overflowItem}
              onPress={() => {
                setShowOverflow(false);
                void t.pickMapPointReferenceCsv();
              }}
              disabled={t.importingReference}
            >
              <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.secondary} />
              <Text style={styles.overflowText}>
                {t.importingReference ? 'Importing reference…' : 'Import MapPoint Reference'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.overflowItem}
              onPress={() => {
                setShowOverflow(false);
                t.handleClearAllCampers();
              }}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
              <Text style={[styles.overflowText, { color: theme.colors.danger }]}>Clear All Campers</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {renderScopeDialog()}
      {renderStopActionModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm, gap: theme.spacing.sm },
  menuBtn: { padding: theme.spacing.xs, marginTop: 2 },
  headerText: { flex: 1 },
  title: { ...theme.typography.h2, fontSize: 22 },
  subtitle: { ...theme.typography.bodySmall, marginTop: 2 },
  headerStats: { alignItems: 'flex-end', gap: 6, maxWidth: 150 },
  referenceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: theme.colors.border },
  referenceBadgeText: { fontSize: 9, color: theme.colors.textSecondary, flexShrink: 1 },
  totalBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: 8, borderWidth: 1, borderColor: theme.colors.border },
  toolbarBtnDisabled: { opacity: 0.45 },
  totalLabel: { fontSize: 9, color: theme.colors.textSecondary, textTransform: 'uppercase' },
  totalValue: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  totalSub: { fontSize: 9, fontWeight: '400', color: theme.colors.textSecondary },
  toolbar: { maxHeight: 44, marginTop: theme.spacing.sm },
  toolbarContent: { paddingHorizontal: theme.spacing.md, gap: 8, alignItems: 'center' },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.surface, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: theme.colors.border },
  toolbarBtnText: { fontSize: 11, color: theme.colors.text, fontWeight: '500' },
  tabs: { flexDirection: 'row', marginTop: theme.spacing.sm, paddingHorizontal: theme.spacing.md, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, gap: 4 },
  tabActive: { backgroundColor: theme.colors.secondary + '15', borderColor: theme.colors.secondary },
  tabText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: theme.colors.secondary, fontWeight: '600' },
  tabBadge: { backgroundColor: theme.colors.secondary, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  tabPanel: { flex: 1, marginTop: theme.spacing.sm },
  mapTab: { flex: 1 },
  mapControls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: theme.spacing.md, marginBottom: 8 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: theme.colors.border },
  dateBtnText: { fontSize: 12, color: theme.colors.text, fontWeight: '500' },
  todayBadge: { backgroundColor: theme.colors.secondary + '20', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  todayBadgeText: { fontSize: 9, color: theme.colors.secondary, fontWeight: '600' },
  amPmToggle: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, padding: 2 },
  amPmBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  amPmBtnActive: { backgroundColor: theme.colors.background },
  amPmText: { fontSize: 11, color: theme.colors.textSecondary },
  amPmTextActive: { color: theme.colors.text, fontWeight: '600' },
  exceptionBadge: { backgroundColor: '#fef3c7', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  exceptionBadgeText: { fontSize: 10, color: '#92400e', fontWeight: '600' },
  optimizeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.secondary, borderRadius: theme.borderRadius.md, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 'auto' },
  optimizeBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  exceptionsScroll: { maxHeight: 32, marginBottom: 4, paddingHorizontal: theme.spacing.md },
  exceptionChip: { backgroundColor: '#fef3c7', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6, maxWidth: 180 },
  exceptionChipText: { fontSize: 10, color: '#92400e' },
  mapRow: { flex: 1, paddingHorizontal: theme.spacing.md },
  mapContainer: { flex: 1, minHeight: 220, borderRadius: theme.borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  mapContainerFull: { flex: 1 },
  mapLoading: { ...StyleSheet.absoluteFillObject, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mapLoadingText: { fontSize: 12, color: theme.colors.textSecondary },
  routeSheetToggle: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: theme.colors.border },
  routeSheetToggleText: { fontSize: 11, color: theme.colors.text },
  routeSheet: { maxHeight: 200, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingVertical: 8 },
  routeSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.md, marginBottom: 6 },
  routeSheetTitle: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'uppercase' },
  routeSheetActions: { flexDirection: 'row', gap: 12 },
  linkText: { fontSize: 11, color: theme.colors.secondary, fontWeight: '500' },
  routeList: { paddingHorizontal: theme.spacing.md, gap: 8 },
  routeCard: { width: 200, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, padding: 10, borderWidth: 1, borderColor: theme.colors.border, borderLeftWidth: 4, marginRight: 8 },
  routeCardActive: { borderColor: theme.colors.secondary, backgroundColor: theme.colors.secondary + '08' },
  routeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeBus: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.text },
  routeName: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2 },
  routeMeta: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2 },
  stopList: { maxHeight: 80, marginTop: 6 },
  stopRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  stopName: { flex: 1, fontSize: 10, color: theme.colors.text },
  stopTime: { fontSize: 9, color: theme.colors.textSecondary, marginLeft: 4 },
  tabContent: { flex: 1 },
  unplottedContent: { padding: theme.spacing.md, gap: 10 },
  unplottedToolbar: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  toolChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.border },
  toolChipText: { fontSize: 12, color: theme.colors.text },
  toolChipPrimary: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.secondary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  toolChipPrimaryText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  emptyCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  emptyText: { color: theme.colors.textSecondary, fontSize: 14 },
  camperCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: 12, borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed' },
  camperCardHeader: { flexDirection: 'row', gap: 10 },
  camperIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#8b5cf620', alignItems: 'center', justifyContent: 'center' },
  camperInfo: { flex: 1 },
  camperTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  camperName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  camperAddress: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  camperMeta: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 4 },
  assignBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.border },
  assignBtnText: { fontSize: 12, color: theme.colors.secondary },
  reportsContent: { padding: theme.spacing.md, gap: 10 },
  reportDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  reportHint: { fontSize: 10, color: theme.colors.textSecondary, flex: 1 },
  reportCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: 14, borderWidth: 1, borderColor: theme.colors.border },
  reportTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.secondary },
  reportDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, paddingRight: 24 },
  reportShareIcon: { position: 'absolute', top: 14, right: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: theme.spacing.md },
  modalCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, gap: 10 },
  modalCardTall: { maxHeight: '85%' },
  modalTitle: { ...theme.typography.h3, fontSize: 18 },
  modalDesc: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.background },
  inputRow: { flexDirection: 'row', gap: 8 },
  inputHalf: { flex: 1 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  modalBtnOutline: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  modalBtnOutlineText: { fontSize: 13, color: theme.colors.text, fontWeight: '500' },
  modalBtnPrimary: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.secondary },
  modalBtnPrimaryText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  modalBtnDanger: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.danger + '15' },
  modalBtnDangerText: { fontSize: 13, color: theme.colors.danger, fontWeight: '600' },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: theme.spacing.md, gap: 8 },
  sheetBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  sheetBtnDanger: { borderBottomWidth: 0 },
  sheetBtnText: { fontSize: 15, color: theme.colors.text },
  sheetBtnCancel: { alignItems: 'center', paddingVertical: 12 },
  sheetBtnCancelText: { fontSize: 15, color: theme.colors.textSecondary },
  segmentRow: { flexDirection: 'row', gap: 6 },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  segmentBtnActive: { backgroundColor: theme.colors.secondary + '15', borderColor: theme.colors.secondary },
  segmentText: { fontSize: 12, color: theme.colors.textSecondary, textTransform: 'capitalize' },
  segmentTextActive: { color: theme.colors.secondary, fontWeight: '600' },
  routePickRow: { maxHeight: 36, marginVertical: 4 },
  routePickChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, marginRight: 6 },
  routePickChipActive: { borderColor: theme.colors.secondary, backgroundColor: theme.colors.secondary + '15' },
  routePickText: { fontSize: 11, color: theme.colors.text },
  progressText: { fontSize: 12, color: theme.colors.textSecondary },
  colorRow: { maxHeight: 44 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16, marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchActive: { borderColor: theme.colors.text },
  optimizeStats: { flexDirection: 'row', gap: 8 },
  optimizeStat: { flex: 1, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, padding: 10, alignItems: 'center' },
  optimizeStatLabel: { fontSize: 9, color: theme.colors.textSecondary, textTransform: 'uppercase' },
  optimizeStatValue: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginTop: 2 },
  optimizeList: { maxHeight: 200, marginVertical: 8 },
  optimizeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  optimizeRowSelected: { backgroundColor: theme.colors.secondary + '08' },
  optimizeRowText: { flex: 1 },
  optimizeRowTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  optimizeRowSub: { fontSize: 11, color: theme.colors.textSecondary },
  overflowMenu: { position: 'absolute', top: 120, right: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: 8, minWidth: 180, borderWidth: 1, borderColor: theme.colors.border, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  overflowItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  overflowText: { fontSize: 14 },
});
