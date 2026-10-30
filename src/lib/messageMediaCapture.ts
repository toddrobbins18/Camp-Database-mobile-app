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
  'Camera and mic need a dev build with native modules. In Camp-Database-mobile-app run: npx expo run:ios (or run:android), then open that app—not Expo Go with an old binary.';

function alertNativeModuleMissing(onFallback?: () => void): void {
  const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'default' }[] = [];
  if (onFallback) {
    buttons.push({ text: 'Pick file instead', onPress: onFallback });
  }
  buttons.push({ text: 'OK', style: 'cancel' });
  Alert.alert('Native camera unavailable', NATIVE_BUILD_HINT, buttons);
}

let imagePickerNativeOk: boolean | null = null;

async function hasImagePickerNativeModule(): Promise<boolean> {
  if (imagePickerNativeOk !== null) return imagePickerNativeOk;
  try {
    const { requireOptionalNativeModule } = await import('expo-modules-core');
    const native = requireOptionalNativeModule('ExponentImagePicker');
    imagePickerNativeOk = native != null;
  } catch {
    imagePickerNativeOk = false;
  }
  return imagePickerNativeOk;
}

type ImagePickerModule = typeof import('expo-image-picker');

async function loadImagePicker(): Promise<ImagePickerModule | null> {
  const hasNative = await hasImagePickerNativeModule();
  if (!hasNative) return null;
  try {
    const mod = await import('expo-image-picker');
    if (typeof mod.requestCameraPermissionsAsync !== 'function') {
      imagePickerNativeOk = false;
      return null;
    }
    return mod;
  } catch {
    imagePickerNativeOk = false;
    return null;
  }
}

async function loadAudio() {
  try {
    const { requireOptionalNativeModule } = await import('expo-modules-core');
    const native = requireOptionalNativeModule('ExponentAV');
    if (!native) return null;
    return await import('expo-av');
  } catch {
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

async function runImagePickerAction(
  action: 'camera_photo' | 'camera_video' | 'library',
): Promise<PickedMessageMedia | null> {
  const ImagePicker = await loadImagePicker();
  if (!ImagePicker) {
    return new Promise((resolve) => {
      alertNativeModuleMissing(() => {
        void pickMessageMediaFromDevice().then(resolve);
      });
    });
  }

  try {
    if (action === 'camera_photo') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera', 'Camera permission is required.');
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
    if (action === 'camera_video') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera', 'Camera permission is required.');
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('ExponentImagePicker') || msg.includes('native module')) {
      imagePickerNativeOk = false;
      return new Promise((resolve) => {
        alertNativeModuleMissing(() => {
          void pickMessageMediaFromDevice().then(resolve);
        });
      });
    }
    console.warn('[messageMediaCapture]', msg);
    return null;
  }
}

export async function captureMessageMedia(
  action: MessageMediaCaptureAction,
): Promise<PickedMessageMedia | null> {
  switch (action) {
    case 'camera_photo':
      return runImagePickerAction('camera_photo');
    case 'camera_video':
      return runImagePickerAction('camera_video');
    case 'library':
      return runImagePickerAction('library');
    case 'voice':
      return recordVoiceMessage();
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
  const av = await loadAudio();
  if (!av?.Audio) {
    Alert.alert('Microphone unavailable', NATIVE_BUILD_HINT);
    return false;
  }
  const { Audio } = av;
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
  const av = await loadAudio();
  try {
    await recording.stopAndUnloadAsync();
    if (av?.Audio) {
      await av.Audio.setAudioModeAsync({ allowsRecordingIOS: false });
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
  const av = await loadAudio();
  if (!av) {
    Alert.alert('Microphone unavailable', NATIVE_BUILD_HINT);
    return null;
  }

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
    void captureMessageMedia(action)
      .then((media) => {
        if (media) onSelected(media);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('ExponentImagePicker') || msg.includes('native module')) {
          alertNativeModuleMissing(() => {
            void pickMessageMediaFromDevice().then((m) => {
              if (m) onSelected(m);
            });
          });
          return;
        }
        console.warn('[messageMediaCapture]', msg);
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
