import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ParentPortalColors } from '../../lib/parentPortalTheme';
import type { ParentPortalView } from '../../constants/parentPortalConstants';
import { PP, ppFont, ppShadow } from '../../lib/parentPortalUi';

type Tile = {
  id: ParentPortalView;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  tint: string;
};

const TILES: Tile[] = [
  { id: 'pickups', icon: 'car-outline', label: 'Change pickup', hint: 'Different time or person', tint: '#DBEAFE' },
  { id: 'absences', icon: 'calendar-outline', label: "Can't make it?", hint: 'Absent or running late', tint: '#FEF3C7' },
  { id: 'authorized', icon: 'people-outline', label: 'Who can pick up?', hint: 'Add a trusted adult', tint: '#E0E7FF' },
  { id: 'swim', icon: 'water-outline', label: 'Swim lessons', hint: 'View & confirm', tint: '#D1FAE5' },
];

type Props = {
  onNavigate: (view: ParentPortalView) => void;
  colors: ParentPortalColors;
};

export function ParentActionTiles({ onNavigate, colors }: Props) {
  return (
    <View style={styles.grid}>
      {TILES.map((tile) => (
        <TouchableOpacity
          key={tile.id}
          style={[styles.tile, ppShadow(colors), { backgroundColor: colors.elevated }]}
          onPress={() => onNavigate(tile.id)}
          activeOpacity={0.75}
        >
          <View style={[styles.iconWrap, { backgroundColor: tile.tint }]}>
            <Ionicons name={tile.icon} size={26} color={colors.brand} />
          </View>
          <Text style={[ppFont.bodyMedium, styles.label, { color: colors.text }]}>{tile.label}</Text>
          <Text style={[ppFont.caption, { color: colors.textMuted, textAlign: 'center' }]}>{tile.hint}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PP.md,
  },
  tile: {
    width: '47%',
    flexGrow: 1,
    minWidth: '46%',
    borderRadius: 16,
    padding: PP.lg,
    alignItems: 'center',
    minHeight: 130,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: PP.sm,
  },
  label: { textAlign: 'center', marginBottom: 4 },
});
