import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { staffQrPayload } from '../../lib/staffQrCode';
import { theme } from '../../theme/theme';

type Props = {
  staffName: string;
  qrToken: string;
};

export function StaffQrBadge({ staffName, qrToken }: Props) {
  const qrRef = useRef<any>(null);
  const payload = staffQrPayload(qrToken);
  const safeFileName = staffName.replace(/\s+/g, '-');

  const saveAndShareImage = () => {
    if (!qrRef.current?.toDataURL) {
      void Share.share({ message: `${staffName} — Time Clock QR: ${payload}` });
      return;
    }

    qrRef.current.toDataURL(async (dataUrl: string) => {
      try {
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        const file = new File(Paths.cache, `${safeFileName}-qr.png`);
        if (file.exists) {
          file.delete();
        }
        file.create({ overwrite: true });
        file.write(bytes);
        await Share.share({
          url: file.uri,
          title: `${staffName} QR Badge`,
          message: `Scan at Staff Time Clock — ${payload}`,
        });
      } catch (error) {
        Alert.alert(
          'Share failed',
          error instanceof Error ? error.message : 'Could not export QR badge.',
        );
      }
    });
  };

  const shareCodeText = async () => {
    await Share.share({
      message: `${staffName} — Time Clock QR code: ${payload}`,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.qrWrap}>
        <QRCode
          value={payload}
          size={220}
          getRef={(ref) => {
            qrRef.current = ref;
          }}
          backgroundColor="#ffffff"
        />
      </View>
      <Text style={styles.payload} selectable>
        {payload}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={saveAndShareImage}>
          <Ionicons name="share-outline" size={16} color={theme.colors.text} />
          <Text style={styles.actionText}>Share / Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => void shareCodeText()}>
          <Ionicons name="copy-outline" size={16} color={theme.colors.text} />
          <Text style={styles.actionText}>Share code</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function StaffQrBadgePlaceholder() {
  return (
    <View style={styles.placeholder}>
      <ActivityIndicator color={theme.colors.primary} />
      <Text style={styles.placeholderText}>Generating QR badge…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#f9fafb',
  },
  qrWrap: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.md,
  },
  payload: {
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  placeholderText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});
