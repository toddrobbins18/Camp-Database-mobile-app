import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { CAMP_LOCATION, isCampStop, normAddr } from '../lib/transportBoardUtils';
import type { TransportRouteStop } from '../lib/transportRoster';

const UNPLOTTED_COLOR = '#8b5cf6';

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

  useEffect(() => {
    if (hasFitRef.current || allPoints.length < 2) return;
    hasFitRef.current = true;
    mapRef.current?.fitToCoordinates(
      allPoints.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      { edgePadding: { top: 48, right: 48, bottom: 48, left: 48 }, animated: true },
    );
  }, [allPoints]);

  return (
    <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion} showsUserLocation={false}>
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
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
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
