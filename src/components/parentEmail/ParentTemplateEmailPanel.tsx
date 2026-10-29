import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { supabase } from '../../lib/supabase';
import { PARENT_EMAIL_TEMPLATE_OPTIONS, type ParentEmailTemplateKey } from '../../lib/parentEmailTemplates';
import { ParentReminderShotLayer } from './ParentReminderShotLayer';

type Props = {
  companyId: string | undefined;
  childId: string;
  camperName: string;
  parentEmail: string | null | undefined;
};

export function ParentTemplateEmailPanel({ companyId, childId, camperName, parentEmail }: Props) {
  const [sendingKey, setSendingKey] = useState<ParentEmailTemplateKey | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [shotTemplate, setShotTemplate] = useState<ParentEmailTemplateKey>('sunscreen');
  const shotRef = useRef<View>(null);

  if (!parentEmail?.trim()) {
    return (
      <Text style={styles.hint}>Add a parent email to send quick template messages.</Text>
    );
  }

  const send = async (templateKey: ParentEmailTemplateKey, label: string) => {
    if (!companyId) return;
    setSendingKey(templateKey);

    let image_base64: string | undefined;
    let attachmentSkipped = false;
    try {
      setShotTemplate(templateKey);
      setCapturing(true);
      await new Promise((resolve) => setTimeout(resolve, 120));
      const { captureParentReminderJpegBase64 } = await import('../../lib/parentReminderCapture');
      image_base64 = await captureParentReminderJpegBase64(shotRef, templateKey);
    } catch (e) {
      attachmentSkipped = true;
      console.warn('Reminder JPEG capture skipped; sending HTML email only', e);
    } finally {
      setCapturing(false);
    }

    const { data, error } = await supabase.functions.invoke('send-parent-template-email', {
      body: {
        company_id: companyId,
        child_id: childId,
        template_key: templateKey,
        image_base64,
      },
    });
    setSendingKey(null);

    if (error || !data?.success) {
      Alert.alert('Could not send', data?.error ?? error?.message ?? 'Failed to send email');
      return;
    }
    if (data.sent === false) {
      Alert.alert(
        'Preview only',
        data.message ?? `Would email "${label}" to ${data.recipient}. Configure M365 to send live.`,
      );
      return;
    }
    const attachmentNote = attachmentSkipped
      ? '\n\nNote: Image attachment needs a rebuilt dev app (npx expo run:ios). Email body still sent.'
      : '';
    Alert.alert('Sent', `"${label}" emailed to ${data.recipient}${attachmentNote}`);
  };

  const confirmSend = (templateKey: ParentEmailTemplateKey, label: string) => {
    Alert.alert(
      'Email parent?',
      `Send "${label}" to ${parentEmail} for ${camperName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => void send(templateKey, label) },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {capturing ? (
        <View pointerEvents="none" style={styles.offscreen} collapsable={false}>
          <ParentReminderShotLayer ref={shotRef} templateKey={shotTemplate} camperName={camperName} />
        </View>
      ) : null}

      <View style={styles.headerRow}>
        <Ionicons name="mail-outline" size={16} color={theme.colors.textSecondary} />
        <Text style={styles.title}>Quick email to parent</Text>
      </View>
      <Text style={styles.subtitle}>One tap sends to {parentEmail}</Text>
      <View style={styles.grid}>
        {PARENT_EMAIL_TEMPLATE_OPTIONS.map(({ key, label, icon }) => (
          <TouchableOpacity
            key={key}
            style={styles.chip}
            disabled={!!sendingKey}
            onPress={() => confirmSend(key, label)}
          >
            {sendingKey === key ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <>
                <Ionicons name={icon} size={14} color={theme.colors.primary} />
                <Text style={styles.chipText}>{label}</Text>
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  offscreen: {
    position: 'absolute',
    left: -10000,
    top: 0,
    opacity: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '500',
  },
});
