import type { RefObject } from 'react';
import { View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { ParentEmailTemplateKey } from './parentEmailTemplates';
import { PARENT_REMINDER_HEIGHT, PARENT_REMINDER_WIDTH } from './parentReminderLayout';

async function waitForPaint(frames = 4): Promise<void> {
  for (let i = 0; i < frames; i += 1) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
}

/**
 * JPEG with camper name for email attachment. Requires native module from a dev-client rebuild
 * (`npx expo run:ios` / `run:android`) — not in Expo Go.
 */
export async function captureParentReminderJpegBase64(
  viewRef: RefObject<View | null>,
  _templateKey: ParentEmailTemplateKey,
): Promise<string> {
  if (!viewRef.current) {
    throw new Error('Reminder capture view not mounted');
  }

  let captureRef: typeof import('react-native-view-shot').captureRef;
  try {
    ({ captureRef } = await import('react-native-view-shot'));
  } catch {
    throw new Error('RNViewShot native module missing — rebuild the dev client');
  }

  await waitForPaint();

  const uri = await captureRef(viewRef, {
    format: 'jpg',
    quality: 0.92,
    width: PARENT_REMINDER_WIDTH,
    height: PARENT_REMINDER_HEIGHT,
  });

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return `data:image/jpeg;base64,${base64}`;
}
