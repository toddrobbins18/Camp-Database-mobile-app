import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';

export const FRONT_OFFICE_MODULE = { screen: 'DayCampModule' as const, params: { moduleId: 'front-office' } };

/** Back navigation from Front Office sub-tools on mobile. */
export function FrontOfficeBackButton({ navigation }: { navigation: { navigate: (screen: string, params?: object) => void } }) {
  return (
    <TouchableOpacity
      style={styles.backRow}
      onPress={() => navigation.navigate(FRONT_OFFICE_MODULE.screen, FRONT_OFFICE_MODULE.params)}
      accessibilityRole="button"
      accessibilityLabel="Back to Front Office"
    >
      <Ionicons name="arrow-back" size={18} color={theme.colors.primary} />
      <Text style={styles.backText}>Front Office</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 2,
  },
  backText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
});
