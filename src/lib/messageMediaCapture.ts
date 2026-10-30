import { Alert, ActionSheetIOS, Platform } from 'react-native';
import {
  classifyMessageMediaMime,
  pickMessageMediaFromDevice,
  type PickedMessageMedia,
} from './messageMedia';

export type MessageMediaCaptureAction =
  | 'camera_photo'
  | 'camera_video'
  | 'library'
  | 'voice'
  | 'file';

const NATIVE_BUILD_HINT =
  'Camera, microphone, and photo library need a dev build with the latest native modules. From the mobile app folder run: npx expo run:ios (or npx expo run:android), then open that build—not an older simulator install.';

function alertNativeModuleMissing(): void {
  Alert.alert('App update required', NATIVE_BUILD_HINT);
}

async function loadImagePicker() {
  try {
    return await import('expo-image-picker');
  } catch {
    alertNativeModuleMissing();
    return null;
  }
}

async function loadAudio() {
  try {
    return await import('expo-av');
  } catch {
    alertNativeModuleMissing();
    return null;
  }
}

function assetToPicked(
  uri: string,
  fileName: string,
  mimeType: string,
): PickedMessageMedia | null {
  const kind = classifyMessageMediaMime(mimeType, fileName);
  if (!kind) return null;
  return { uri, fileName, mimeType, kind };
}

export async function captureMessageMedia(
  action: MessageMediaCaptureAction,
): Promise<PickedMessageMedia | null> {
  switch (action) {
    case 'camera_photo': {
      const ImagePicker = await loadImagePicker();
      if (!ImagePicker) return null;
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera', 'Camera permission is required to take photos or videos.');
        return null;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        exif: false,
      });
      if (result.canceled || !result.assets?.[0]) return null;
      const a = result.assets[0];
      const fileName = a.fileName ?? `photo-${Date.now()}.jpg`;
      const mimeType = a.mimeType ?? 'image/jpeg';
      return assetToPicked(a.uri, fileName, mimeType);
    }
    case 'camera_video': {
      const ImagePicker = await loadImagePicker();
      if (!ImagePicker) return null;
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera', 'Camera permission is required to take photos or videos.');
        return null;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
        videoMaxDuration: 120,
      });
      if (result.canceled || !result.assets?.[0]) return null;
      const a = result.assets[0];
      const fileName = a.fileName ?? `video-${Date.now()}.mp4`;
      const mimeType = a.mimeType ?? 'video/mp4';
      return assetToPicked(a.uri, fileName, mimeType);
    }
    case 'library': {
      const ImagePicker = await loadImagePicker();
      if (!ImagePicker) return null;
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Photos', 'Photo library access is required.');
        return null;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.85,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });
      if (result.canceled || !result.assets?.[0]) return null;
      const a = result.assets[0];
      const isVideo = a.type === 'video';
      const fileName =
        a.fileName ?? (isVideo ? `video-${Date.now()}.mp4` : `photo-${Date.now()}.jpg`);
      const mimeType = a.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg');
      return assetToPicked(a.uri, fileName, mimeType);
    }
    case 'voice': {
      return recordVoiceMessage();
    }
    case 'file':
      return pickMessageMediaFromDevice();
    default:
      return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let activeRecording: any = null;

export async function startVoiceRecording(): Promise<boolean> {
  if (activeRecording) return true;
  const { Audio } = (await loadAudio()) ?? {};
  if (!Audio) return false;
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Microphone', 'Microphone permission is required to record voice messages.');
    return false;
  }
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await recording.startAsync();
  activeRecording = recording;
  return true;
}

export async function stopVoiceRecording(): Promise<PickedMessageMedia | null> {
  const recording = activeRecording;
  activeRecording = null;
  if (!recording) return null;
  const { Audio } = (await loadAudio()) ?? {};
  try {
    await recording.stopAndUnloadAsync();
    if (Audio) {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    }
    const uri = recording.getURI() as string | null;
    if (!uri) return null;
    return {
      uri,
      fileName: `voice-${Date.now()}.m4a`,
      mimeType: 'audio/mp4',
      kind: 'audio',
    };
  } catch {
    return null;
  }
}

export function cancelVoiceRecording(): void {
  if (!activeRecording) return;
  void activeRecording.stopAndUnloadAsync().catch(() => undefined);
  activeRecording = null;
}

async function recordVoiceMessage(): Promise<PickedMessageMedia | null> {
  const audio = await loadAudio();
  if (!audio) return null;

  return new Promise((resolve) => {
    Alert.alert(
      'Voice message',
      'Tap Record, speak, then tap Stop when finished.',
      [
        {
          text: 'Record',
          onPress: () => {
            void (async () => {
              const ok = await startVoiceRecording();
              if (!ok) {
                resolve(null);
                return;
              }
              Alert.alert('Recording…', 'Tap Stop when you are done.', [
                {
                  text: 'Stop',
                  onPress: () => {
                    void stopVoiceRecording().then(resolve);
                  },
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => {
                    cancelVoiceRecording();
                    resolve(null);
                  },
                },
              ]);
            })();
          },
        },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
    );
  });
}

const MENU_OPTIONS: { action: MessageMediaCaptureAction; label: string }[] = [
  { action: 'camera_photo', label: 'Take photo' },
  { action: 'camera_video', label: 'Record video' },
  { action: 'library', label: 'Photo library' },
  { action: 'voice', label: 'Voice message' },
  { action: 'file', label: 'File or document' },
];

export function openMessageMediaCaptureMenu(
  onSelected: (media: PickedMessageMedia) => void,
): void {
  const pick = (action: MessageMediaCaptureAction) => {
    void captureMessageMedia(action).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ExponentImagePicker') || msg.includes('native module')) {
        alertNativeModuleMissing();
        return;
      }
      console.warn('[messageMediaCapture]', msg);
    }).then((media) => {
      if (media) onSelected(media);
    });
  };

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...MENU_OPTIONS.map((o) => o.label), 'Cancel'],
        cancelButtonIndex: MENU_OPTIONS.length,
        title: 'Attach',
      },
      (index) => {
        if (index == null || index >= MENU_OPTIONS.length) return;
        pick(MENU_OPTIONS[index].action);
      },
    );
    return;
  }

  Alert.alert(
    'Attach',
    undefined,
    [
      ...MENU_OPTIONS.map((o) => ({
        text: o.label,
        onPress: () => pick(o.action),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ],
  );
}
