import React, { forwardRef } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import type { ParentEmailTemplateKey } from '../../lib/parentEmailTemplates';
import {
  PARENT_REMINDER_HEIGHT,
  PARENT_REMINDER_NAME as N,
  PARENT_REMINDER_WIDTH,
  parentReminderImageSource,
} from '../../lib/parentReminderLayout';

type Props = {
  templateKey: ParentEmailTemplateKey;
  camperName: string;
};

/** Off-screen full-size layer captured to JPEG (web canvas parity). */
export const ParentReminderShotLayer = forwardRef<View, Props>(function ParentReminderShotLayer(
  { templateKey, camperName },
  ref,
) {
  const name = camperName.trim() || 'Camper';

  return (
    <View ref={ref} collapsable={false} style={styles.frame}>
      <Image
        key={templateKey}
        source={parentReminderImageSource(templateKey)}
        style={styles.bg}
        resizeMode="stretch"
      />
      <View
        style={[
          styles.nameBox,
          {
            left: N.x,
            top: N.y,
            width: N.width,
            height: N.height,
          },
        ]}
      >
        <Text
          style={[styles.nameText, { fontSize: N.fontSize, color: N.color }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.55}
        >
          {name}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    width: PARENT_REMINDER_WIDTH,
    height: PARENT_REMINDER_HEIGHT,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  bg: {
    width: PARENT_REMINDER_WIDTH,
    height: PARENT_REMINDER_HEIGHT,
  },
  nameBox: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  nameText: {
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
});
