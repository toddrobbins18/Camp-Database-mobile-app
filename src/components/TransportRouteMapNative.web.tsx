import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TransportRouteMapNativeProps } from './transportRouteMapTypes';

export type { MapRoute, MapUnplottedCamper, TransportRouteMapNativeProps } from './transportRouteMapTypes';

/** Web fallback — react-native-maps is native-only. Use tyler-hill web for full map editing. */
export function TransportRouteMapNative({
  routes,
  unplottedCampers = [],
}: TransportRouteMapNativeProps) {
  const totalStops = routes.reduce((sum, route) => sum + route.stops.length, 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.banner}>
        <Ionicons name="map-outline" size={28} color="#64748b" />
        <Text style={styles.title}>Route map unavailable on web</Text>
        <Text style={styles.subtitle}>
          Open Transportation on tyler-hill (The Nest web app) for the full interactive map. This view
          still shows route summaries on mobile web.
        </Text>
      </View>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {routes.length === 0 ? (
          <Text style={styles.empty}>No routes visible.</Text>
        ) : (
          routes.map((route) => (
            <View key={route.id} style={styles.routeCard}>
              <View style={[styles.routeDot, { backgroundColor: route.color }]} />
              <View style={styles.routeBody}>
                <Text style={styles.routeName}>
                  {route.bus} · {route.name}
                </Text>
                <Text style={styles.routeMeta}>
                  {route.stops.length} stop{route.stops.length === 1 ? '' : 's'}
                </Text>
              </View>
            </View>
          ))
        )}
        {unplottedCampers.length > 0 ? (
          <Text style={styles.unplotted}>
            {unplottedCampers.length} unplotted camper{unplottedCampers.length === 1 ? '' : 's'}
          </Text>
        ) : null}
        {routes.length > 0 ? (
          <Text style={styles.footerMeta}>
            {routes.length} route{routes.length === 1 ? '' : 's'} · {totalStops} stops total
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  banner: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  title: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    gap: 8,
  },
  empty: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 24,
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeBody: {
    flex: 1,
  },
  routeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  routeMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  unplotted: {
    fontSize: 12,
    color: '#7c3aed',
    textAlign: 'center',
    marginTop: 4,
  },
  footerMeta: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
});
