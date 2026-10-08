import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCampBrandTheme } from '../hooks/useCampBrandTheme';

type Props = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function BrandPrimaryButton({
  label,
  onPress,
  icon,
  disabled,
  loading,
  compact,
  style,
  textStyle,
}: Props) {
  const { brand } = useCampBrandTheme();

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        compact && styles.btnCompact,
        { backgroundColor: brand },
        (disabled || loading) && styles.btnDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={compact ? 16 : 18} color="#fff" /> : null}
          <Text style={[styles.text, compact && styles.textCompact, textStyle]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
  },
  btnCompact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  btnDisabled: { opacity: 0.55 },
  text: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  textCompact: {
    fontSize: 13,
  },
});
