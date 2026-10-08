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
  {
    id: 'pickups',
    icon: 'calendar-outline',
    label: 'Change pickup',
    hint: 'Request a different pickup time or person for today or a future date.',
    tint: '#DBEAFE',
  },
  {
    id: 'absences',
    icon: 'time-outline',
    label: 'Report absence',
    hint: "Let camp know if your child won't attend or will arrive late.",
    tint: '#FEF3C7',
  },
  {
    id: 'authorized',
    icon: 'shield-checkmark-outline',
    label: 'Authorized adults',
    hint: 'Manage who is approved to pick up your camper.',
    tint: '#D1FAE5',
  },
  {
    id: 'swim',
    icon: 'water-outline',
    label: 'Swim lessons',
    hint: 'View scheduled lessons and confirm attendance.',
    tint: '#CFFAFE',
  },
];

type Props = {
  onNavigate: (view: ParentPortalView) => void;
  colors: ParentPortalColors;
  glass?: boolean;
};

export function ParentActionTiles({ onNavigate, colors, glass }: Props) {
  return (
    <View style={styles.grid}>
      {TILES.map((tile) => (
        <TouchableOpacity
          key={tile.id}
          style={[
            styles.tile,
            ppShadow(colors),
            { backgroundColor: glass ? 'rgba(255,255,255,0.55)' : colors.elevated },
            glass ? { borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' } : null,
          ]}
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
