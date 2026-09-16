import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { CAMP_LOCATION, isCampStop, normAddr } from '../lib/transportBoardUtils';
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

export type TransportRouteMapNativeProps = {
  routes: MapRoute[];
  allRoutes?: MapRoute[];
  unplottedCampers?: MapUnplottedCamper[];
  campAddress?: string;
  onMoveStop?: (fromRouteId: number, stopIndex: number, toRouteId: number) => void;
  onRemoveStop?: (routeId: number, stopIndex: number) => void;
  onAssignCamper?: (camperId: number, routeId: number) => void;
  onStopPress?: (routeId: number, stopIndex: number, stop: TransportRouteStop) => void;
  onUnplottedPress?: (camperId: number) => void;
};

function routeCoordinates(route: MapRoute): { latitude: number; longitude: number }[] {
  const coords: { latitude: number; longitude: number }[] = [];
  for (const stop of route.stops) {
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

export function TransportRouteMapNative({
  routes,
  unplottedCampers = [],
  campAddress = CAMP_LOCATION.address,
  onStopPress,
  onUnplottedPress,
}: TransportRouteMapNativeProps) {
  const mapRef = useRef<MapView>(null);
  const hasFitRef = useRef(false);
  const [region, setRegion] = useState<Region | null>(null);

  const allPoints = useMemo(() => {
    const routePoints = routes.flatMap((r) => r.stops.map((s) => ({ lat: s.lat, lng: s.lng })));
    const camperPoints = unplottedCampers.map((c) => ({ lat: c.lat, lng: c.lng }));
    return [...routePoints, ...camperPoints, { lat: CAMP_LOCATION.lat, lng: CAMP_LOCATION.lng }];
  }, [routes, unplottedCampers]);

  const initialRegion: Region = useMemo(() => {
    if (allPoints.length === 0) {
      return {
        latitude: CAMP_LOCATION.lat,
        longitude: CAMP_LOCATION.lng,
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

  return (
    <View style={styles.mapWrap}>
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={initialRegion}
      showsUserLocation={false}
      zoomEnabled
      scrollEnabled
      onRegionChangeComplete={setRegion}
    >
      {routes.map((route) => {
        const coords = routeCoordinates(route);
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
          const isCamp = isCampStop(stop) || (!!campAddress && normAddr(stop.address) === normAddr(campAddress));
          if (!isCamp) stopNum += 1;
          const label = isCamp ? 'C' : String(stopNum);
          const color = isCamp ? '#16a34a' : route.color;
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
});
