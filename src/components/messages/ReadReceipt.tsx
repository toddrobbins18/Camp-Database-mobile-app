import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import {
  getReadReceiptLabel,
  isMessageReadFlag,
  type ReadReceiptFields,
} from '../../lib/messageReadReceipts';

const READ_BLUE = '#0ea5e9';
const DELIVERED_GREY = '#8696a0';

type Props = {
  message: ReadReceiptFields;
  style?: object;
  /** Inbox/sent list — icon + “Read …” / “Delivered”. */
  variant?: 'list' | 'whatsapp';
};

export function ReadReceipt({ message, style, variant = 'list' }: Props) {
  const read = isMessageReadFlag(message.read);
  const label = getReadReceiptLabel(message);

  if (variant === 'whatsapp') {
    return (
      <Ionicons
        name={read ? 'checkmark-done' : 'checkmark'}
        size={16}
        color={read ? READ_BLUE : DELIVERED_GREY}
        style={style as object}
        accessibilityLabel={read ? 'Read' : 'Delivered'}
      />
    );
  }

  if (!label) return null;

  return (
    <View style={[styles.row, style]} accessibilityLabel={label}>
      <Ionicons
        name={read ? 'checkmark-done' : 'checkmark'}
        size={14}
        color={read ? READ_BLUE : DELIVERED_GREY}
      />
      <Text style={[styles.text, read && styles.textRead]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  text: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  textRead: {
    color: READ_BLUE,
    fontWeight: '600',
  },
});
