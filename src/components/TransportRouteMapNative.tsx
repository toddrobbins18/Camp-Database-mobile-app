import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker, Polygon, Polyline, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { CAMP_LOCATION, isCampStop, normAddr } from '../lib/transportBoardUtils';
import { BUS_COUNSELOR_STOP_LABEL, isCounselorPickupStop } from '../lib/transportCounselorPickup';
import { campersInsideLasso } from '../lib/transportMapLasso';
import type { TransportRouteStop } from '../lib/transportRoster';

const UNPLOTTED_COLOR = '#8b5cf6';
const MIN_ZOOM_DELTA = 0.002;
const MAX_ZOOM_DELTA = 2;

export type MapRoute = {
  id: number;
  name: string;
  bus: string;
  color: string;
  stops: TransportRouteStop[];
};

export type MapUnplottedCamper = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  age: number;
  session: string;
};

export type LiveBusMarker = {
  id: string;
  busLabel: string;
  latitude: number;
  longitude: number;
  userName?: string | null;
  updatedAt?: string;
};

export type TransportRouteMapNativeProps = {
  routes: MapRoute[];
  allRoutes?: MapRoute[];
  unplottedCampers?: MapUnplottedCamper[];
  liveBuses?: LiveBusMarker[];
  campAddress?: string;
  campLat?: number;
  campLng?: number;
  onMoveStop?: (fromRouteId: number, stopIndex: number, toRouteId: number) => void;
  onRemoveStop?: (routeId: number, stopIndex: number) => void;
  onAssignCamper?: (camperId: number, routeId: number) => void;
  onAssignCampers?: (camperIds: number[], routeId: number) => void;
  onRequestNewRouteForCampers?: (camperIds: number[]) => void;
  onStopPress?: (routeId: number, stopIndex: number, stop: TransportRouteStop) => void;
  onUnplottedPress?: (camperId: number) => void;
};

function routeCoordinates(
  route: MapRoute,
  campAddress?: string,
): { latitude: number; longitude: number }[] {
  const coords: { latitude: number; longitude: number }[] = [];
  for (const stop of route.stops) {
    if (isCampStop(stop, campAddress)) continue;
    const next = { latitude: stop.lat, longitude: stop.lng };
    const prev = coords[coords.length - 1];
    if (!prev || Math.abs(prev.latitude - next.latitude) > 0.000001 || Math.abs(prev.longitude - next.longitude) > 0.000001) {
      coords.push(next);
    }
  }
  return coords;
}

function StopMarker({
  color,
  label,
  size = 24,
}: {
  color: string;
  label: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.marker,
        {
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.markerText, { fontSize: label.length >= 2 ? 9 : 10 }]}>{label}</Text>
    </View>
  );
}

function LiveBusMarkerView({ label }: { label: string }) {
  return (
    <View style={styles.liveBusMarker}>
      <Ionicons name="bus" size={14} color="#fff" />
      <Text style={styles.liveBusLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function TransportRouteMapNative({
  routes,
  allRoutes,
  unplottedCampers = [],
  liveBuses = [],
  campAddress = CAMP_LOCATION.address,
  campLat = CAMP_LOCATION.lat,
  campLng = CAMP_LOCATION.lng,
  onAssignCamper,
  onAssignCampers,
  onRequestNewRouteForCampers,
  onStopPress,
  onUnplottedPress,
}: TransportRouteMapNativeProps) {
  const mapRef = useRef<MapView>(null);
  const hasFitRef = useRef(false);
  const [region, setRegion] = useState<Region | null>(null);
  const [lassoMode, setLassoMode] = useState(false);
  const [drawPath, setDrawPath] = useState<{ latitude: number; longitude: number }[]>([]);
  const [lassoSelection, setLassoSelection] = useState<MapUnplottedCamper[] | null>(null);
  const [lassoHint, setLassoHint] = useState<string | null>(null);
  const availableRoutes = allRoutes ?? routes;

  const allPoints = useMemo(() => {
    const routePoints = routes.flatMap((r) => r.stops.map((s) => ({ lat: s.lat, lng: s.lng })));
    const camperPoints = unplottedCampers.map((c) => ({ lat: c.lat, lng: c.lng }));
    const busPoints = liveBuses.map((b) => ({ lat: b.latitude, lng: b.longitude }));
    return [...routePoints, ...camperPoints, ...busPoints, { lat: campLat, lng: campLng }];
  }, [routes, unplottedCampers, liveBuses, campLat, campLng]);

  const initialRegion: Region = useMemo(() => {
    if (allPoints.length === 0) {
      return {
        latitude: campLat,
        longitude: campLng,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      };
    }
    const lats = allPoints.map((p) => p.lat);
    const lngs = allPoints.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latDelta = Math.max((maxLat - minLat) * 1.4, 0.02);
    const lngDelta = Math.max((maxLng - minLng) * 1.4, 0.02);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [allPoints]);

  const fitAllPoints = useCallback(() => {
    if (allPoints.length === 0) return;
    if (allPoints.length === 1) {
      const next: Region = {
        latitude: allPoints[0].lat,
        longitude: allPoints[0].lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      mapRef.current?.animateToRegion(next, 250);
      setRegion(next);
      return;
    }
    mapRef.current?.fitToCoordinates(
      allPoints.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      { edgePadding: { top: 48, right: 48, bottom: 48, left: 48 }, animated: true },
    );
  }, [allPoints]);

  useEffect(() => {
    setRegion(initialRegion);
    hasFitRef.current = false;
  }, [initialRegion]);

  useEffect(() => {
    if (hasFitRef.current || allPoints.length < 2) return;
    hasFitRef.current = true;
    fitAllPoints();
  }, [allPoints, fitAllPoints]);

  const zoomBy = useCallback(
    (factor: number) => {
      const base = region ?? initialRegion;
      const next: Region = {
        latitude: base.latitude,
        longitude: base.longitude,
        latitudeDelta: Math.min(Math.max(base.latitudeDelta * factor, MIN_ZOOM_DELTA), MAX_ZOOM_DELTA),
        longitudeDelta: Math.min(Math.max(base.longitudeDelta * factor, MIN_ZOOM_DELTA), MAX_ZOOM_DELTA),
      };
      mapRef.current?.animateToRegion(next, 200);
      setRegion(next);
    },
    [region, initialRegion],
  );

  const zoomIn = useCallback(() => zoomBy(0.5), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(2), [zoomBy]);

  const resetLasso = useCallback(() => {
    setDrawPath([]);
    setLassoSelection(null);
    setLassoHint(null);
  }, []);

  const finishLasso = useCallback(() => {
    if (drawPath.length < 6) {
      setLassoHint('Loop was too small — draw around the addresses');
      setDrawPath([]);
      return;
    }
    const found = campersInsideLasso(
      unplottedCampers.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng)),
      drawPath.map((p) => ({ lat: p.latitude, lng: p.longitude })),
    );
    if (found.length === 0) {
      setLassoSelection(null);
      setLassoHint('No unassigned campers inside that loop');
      return;
    }
    setLassoSelection(found);
    setLassoHint(null);
    setLassoMode(false);
  }, [drawPath, unplottedCampers]);

  return (
    <View style={styles.mapWrap}>
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={initialRegion}
      showsUserLocation={false}
      zoomEnabled={!lassoMode}
      scrollEnabled={!lassoMode}
      rotateEnabled={!lassoMode}
      pitchEnabled={!lassoMode}
      onRegionChangeComplete={lassoMode ? undefined : setRegion}
      onPanDrag={
        lassoMode
          ? (e) => {
              const coord = e.nativeEvent.coordinate;
              if (!coord) return;
              setDrawPath((prev) => {
                const last = prev[prev.length - 1];
                if (
                  last &&
                  Math.abs(last.latitude - coord.latitude) < 0.00002 &&
                  Math.abs(last.longitude - coord.longitude) < 0.00002
                ) {
                  return prev;
                }
                return [...prev, coord];
              });
            }
          : undefined
      }
    >
      {routes.map((route) => {
        const coords = routeCoordinates(route, campAddress);
        if (coords.length > 1) {
          return (
            <Polyline
              key={`line-${route.id}`}
              coordinates={coords}
              strokeColor={route.color}
              strokeWidth={3}
            />
          );
        }
        return null;
      })}

      {routes.map((route) => {
        let stopNum = 0;
        return route.stops.map((stop, stopIndex) => {
          const isCamp = isCampStop(stop, campAddress);
          const isCounselor = isCounselorPickupStop(stop);
          if (!isCamp && !isCounselor) stopNum += 1;
          const label = isCamp ? 'C' : isCounselor ? BUS_COUNSELOR_STOP_LABEL : String(stopNum);
          const color = isCamp ? '#16a34a' : isCounselor ? '#0f766e' : route.color;
          return (
            <Marker
              key={`${route.id}-${stopIndex}-${stop.address}`}
              coordinate={{ latitude: stop.lat, longitude: stop.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => onStopPress?.(route.id, stopIndex, stop)}
            >
              <StopMarker color={color} label={label} />
            </Marker>
          );
        });
      })}

      {unplottedCampers.map((camper) =>
        camper.lat && camper.lng ? (
          <Marker
            key={`unplotted-${camper.id}`}
            coordinate={{ latitude: camper.lat, longitude: camper.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            onPress={() => onUnplottedPress?.(camper.id)}
          >
            <View style={styles.unplottedMarker}>
              <Ionicons name="person" size={10} color="#fff" />
            </View>
          </Marker>
        ) : null,
      )}

      {liveBuses.map((bus) => (
        <Marker
          key={`live-bus-${bus.id}`}
          coordinate={{ latitude: bus.latitude, longitude: bus.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          title={bus.busLabel}
          description={bus.userName ? `Driver: ${bus.userName}` : 'Live bus location'}
        >
          <LiveBusMarkerView label={bus.busLabel} />
        </Marker>
      ))}

      {drawPath.length > 1 ? (
        <Polyline
          coordinates={drawPath}
          strokeColor={UNPLOTTED_COLOR}
          strokeWidth={3}
          lineDashPattern={[6, 4]}
        />
      ) : null}
      {drawPath.length > 2 ? (
        <Polygon
          coordinates={drawPath}
          strokeColor={UNPLOTTED_COLOR}
          fillColor="rgba(139, 92, 246, 0.18)"
          strokeWidth={2}
        />
      ) : null}
    </MapView>
    <View style={styles.zoomControls}>
      <TouchableOpacity style={styles.zoomBtn} onPress={zoomIn} accessibilityLabel="Zoom in">
        <Ionicons name="add" size={20} color="#334155" />
      </TouchableOpacity>
      <View style={styles.zoomDivider} />
      <TouchableOpacity style={styles.zoomBtn} onPress={zoomOut} accessibilityLabel="Zoom out">
        <Ionicons name="remove" size={20} color="#334155" />
      </TouchableOpacity>
      <View style={styles.zoomDivider} />
      <TouchableOpacity style={styles.zoomBtn} onPress={fitAllPoints} accessibilityLabel="Fit all routes">
        <Ionicons name="scan-outline" size={18} color="#334155" />
      </TouchableOpacity>
    </View>
    <TouchableOpacity
      style={[styles.lassoBtn, lassoMode && styles.lassoBtnActive]}
      onPress={() => {
        if (lassoMode) {
          if (drawPath.length >= 6) finishLasso();
          else {
            setLassoMode(false);
            resetLasso();
          }
          return;
        }
        resetLasso();
        setLassoMode(true);
        setLassoHint('Draw a loop around purple pins, then tap Done');
      }}
    >
      <Ionicons name="pencil" size={14} color={lassoMode ? '#fff' : '#5b21b6'} />
      <Text style={[styles.lassoBtnText, lassoMode && styles.lassoBtnTextActive]}>
        {lassoMode ? (drawPath.length >= 6 ? 'Done' : 'Drawing…') : 'Circle to add'}
      </Text>
    </TouchableOpacity>
    {lassoHint ? (
      <View style={styles.lassoHint}>
        <Text style={styles.lassoHintText}>{lassoHint}</Text>
      </View>
    ) : null}
    {lassoSelection && lassoSelection.length > 0 ? (
      <View style={styles.lassoPanel}>
        <View style={styles.lassoPanelHeader}>
          <View>
            <Text style={styles.lassoPanelTitle}>
              {lassoSelection.length} camper{lassoSelection.length === 1 ? '' : 's'} circled
            </Text>
            <Text style={styles.lassoPanelSub} numberOfLines={2}>
              {lassoSelection.map((c) => c.name).join(', ')}
            </Text>
          </View>
          <TouchableOpacity onPress={resetLasso} accessibilityLabel="Clear circled addresses">
            <Ionicons name="close" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lassoBusRow}>
          {availableRoutes.map((route) => (
            <TouchableOpacity
              key={route.id}
              style={styles.lassoBusChip}
              onPress={() => {
                const ids = lassoSelection.map((c) => c.id);
                if (onAssignCampers) onAssignCampers(ids, route.id);
                else ids.forEach((id) => onAssignCamper?.(id, route.id));
                resetLasso();
              }}
            >
              <Text style={styles.lassoBusChipText}>{route.bus}</Text>
            </TouchableOpacity>
          ))}
          {onRequestNewRouteForCampers ? (
            <TouchableOpacity
              style={[styles.lassoBusChip, styles.lassoBusChipNew]}
              onPress={() => {
                onRequestNewRouteForCampers(lassoSelection.map((c) => c.id));
                resetLasso();
              }}
            >
              <Text style={styles.lassoBusChipText}>New bus</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
        <TouchableOpacity
          onPress={() => {
            resetLasso();
            setLassoMode(true);
            setLassoHint('Draw a loop around purple pins, then tap Done');
          }}
        >
          <Text style={styles.lassoDrawAgain}>Draw again</Text>
        </TouchableOpacity>
      </View>
    ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    flex: 1,
    width: '100%',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  zoomControls: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  zoomBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  marker: {
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  markerText: {
    color: '#fff',
    fontWeight: '700',
  },
  unplottedMarker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: UNPLOTTED_COLOR,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBusMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#0f766e',
    borderWidth: 2,
    borderColor: '#fff',
    maxWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  liveBusLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  lassoBtn: {
    position: 'absolute',
    top: 156,
    left: 8,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  lassoBtnActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  lassoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5b21b6',
  },
  lassoBtnTextActive: {
    color: '#fff',
  },
  lassoHint: {
    position: 'absolute',
    top: 196,
    right: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  lassoHintText: {
    fontSize: 11,
    color: '#5b21b6',
    lineHeight: 15,
  },
  lassoPanel: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 8,
  },
  lassoPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  lassoPanelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  lassoPanelSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    maxWidth: 240,
  },
  lassoBusRow: {
    flexGrow: 0,
  },
  lassoBusChip: {
    marginRight: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#7c3aed',
  },
  lassoBusChipNew: {
    backgroundColor: '#0f766e',
  },
  lassoBusChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  lassoDrawAgain: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
});
