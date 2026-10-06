import { Linking } from 'react-native';
import { getSignedUrl, pathFromFileUrl } from '../api/storage';

export type EventAttachmentKind = 'image' | 'pdf' | 'other';

export function eventAttachmentKind(
  fileName?: string | null,
  fileUrl?: string | null,
): EventAttachmentKind {
  const hint = (fileName || fileUrl || '').toLowerCase();
  if (/\.(png|jpe?g|gif|webp)$/i.test(hint)) return 'image';
  if (/\.pdf$/i.test(hint)) return 'pdf';
  return 'other';
}

export async function resolveEventAttachmentUrl(fileUrl: string): Promise<string> {
  const path = pathFromFileUrl(fileUrl, 'rainy-day-documents');
  if (!path) return fileUrl;
  try {
    return await getSignedUrl('rainyDayDocuments', path);
  } catch {
    return fileUrl;
  }
}

export async function openEventAttachment(fileUrl: string): Promise<void> {
  const url = await resolveEventAttachmentUrl(fileUrl);
  await Linking.openURL(url);
}
