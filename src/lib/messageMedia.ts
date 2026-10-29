import type { SupabaseClient } from '@supabase/supabase-js';

export const MESSAGE_MEDIA_BUCKET = 'message-media';

export const MESSAGE_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
] as const;

export const MESSAGE_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
] as const;

export const MESSAGE_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/aac',
] as const;

export const MESSAGE_FILE_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
] as const;

export type MessageKind = 'text' | 'image' | 'video' | 'audio' | 'file';

export type PickedMessageMedia = {
  uri: string;
  mimeType: string;
  fileName: string;
  kind: MessageKind;
};

export function messageMediaEnabledForCamp(_slug: string | null | undefined): boolean {
  return true;
}

const EXTENSION_KIND: { ext: string; kind: MessageKind }[] = [
  { ext: 'jpg', kind: 'image' },
  { ext: 'jpeg', kind: 'image' },
  { ext: 'png', kind: 'image' },
  { ext: 'webp', kind: 'image' },
  { ext: 'gif', kind: 'image' },
  { ext: 'heic', kind: 'image' },
  { ext: 'mp4', kind: 'video' },
  { ext: 'mov', kind: 'video' },
  { ext: 'm4v', kind: 'video' },
  { ext: 'mp3', kind: 'audio' },
  { ext: 'm4a', kind: 'audio' },
  { ext: 'wav', kind: 'audio' },
  { ext: 'pdf', kind: 'file' },
  { ext: 'doc', kind: 'file' },
  { ext: 'docx', kind: 'file' },
  { ext: 'xls', kind: 'file' },
  { ext: 'xlsx', kind: 'file' },
  { ext: 'ppt', kind: 'file' },
  { ext: 'pptx', kind: 'file' },
  { ext: 'txt', kind: 'file' },
  { ext: 'csv', kind: 'file' },
  { ext: 'zip', kind: 'file' },
];

function kindFromFileName(fileName: string): MessageKind | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  return EXTENSION_KIND.find((e) => e.ext === ext)?.kind ?? null;
}

export function classifyMessageMediaMime(mimeType: string, fileName?: string): MessageKind | null {
  const mime = mimeType?.toLowerCase() ?? '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (MESSAGE_FILE_MIME_TYPES.includes(mime as (typeof MESSAGE_FILE_MIME_TYPES)[number])) {
    return 'file';
  }
  if (fileName) return kindFromFileName(fileName);
  return null;
}

export function messagePreviewLabel(
  kind: MessageKind | string | null | undefined,
  content: string,
  fileName?: string | null,
): string {
  if (kind === 'image') return content.trim() ? content.trim() : 'Photo';
  if (kind === 'video') return content.trim() ? content.trim() : 'Video';
  if (kind === 'audio') return content.trim() ? content.trim() : 'Audio';
  if (kind === 'file') {
    if (content.trim()) return content.trim();
    return fileName?.trim() || 'Attachment';
  }
  return content;
}

export function defaultMediaMessageSubject(kind: MessageKind): string {
  switch (kind) {
    case 'video':
      return 'Video';
    case 'audio':
      return 'Audio';
    case 'file':
      return 'Attachment';
    case 'image':
    default:
      return 'Photo';
  }
}

export function buildMessageMediaStoragePath(options: {
  companyId: string;
  scope: 'direct' | 'group';
  scopeId: string;
  messageId: string;
  fileName: string;
}): string {
  const safeName = options.fileName.replace(/[^\w.\-()+]/g, '_');
  return `${options.companyId}/${options.scope}/${options.scopeId}/${options.messageId}/${safeName}`;
}

async function readUriAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  return response.arrayBuffer();
}

export async function uploadMessageMediaFromUri(
  supabase: SupabaseClient,
  path: string,
  uri: string,
  mimeType: string,
): Promise<{ error: string | null }> {
  try {
    const body = await readUriAsArrayBuffer(uri);
    const { error } = await supabase.storage.from(MESSAGE_MEDIA_BUCKET).upload(path, body, {
      cacheControl: '3600',
      upsert: false,
      contentType: mimeType || 'application/octet-stream',
    });
    if (error) {
      console.error('[messageMedia] upload failed:', error.message);
      return { error: 'Media upload failed. Please try again.' };
    }
    return { error: null };
  } catch (e) {
    console.error('[messageMedia] read uri failed:', e);
    return { error: 'Could not read selected file.' };
  }
}

async function blobToDataUri(blob: Blob, mimeHint?: string | null): Promise<string> {
  const mime = mimeHint || blob.type || 'application/octet-stream';
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const encode =
    typeof globalThis.btoa === 'function'
      ? globalThis.btoa.bind(globalThis)
      : (s: string) => {
          throw new Error('btoa unavailable');
        };
  return `data:${mime};base64,${encode(binary)}`;
}

/** Signed URL for web; on native falls back to authenticated storage download → data URI. */
export async function createSignedMessageMediaUrl(
  supabase: SupabaseClient,
  storagePath: string,
  mimeHint?: string | null,
): Promise<string | null> {
  const path = storagePath.trim();
  if (!path) return null;

  await supabase.auth.refreshSession().catch(() => undefined);

  const { data, error } = await supabase.storage
    .from(MESSAGE_MEDIA_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (!error && data?.signedUrl) {
    return data.signedUrl;
  }
  if (error) {
    console.warn('[messageMedia] signed URL failed:', error.message);
  }

  const { data: blob, error: dlErr } = await supabase.storage.from(MESSAGE_MEDIA_BUCKET).download(path);
  if (dlErr || !blob) {
    console.warn('[messageMedia] download failed:', dlErr?.message);
    return null;
  }
  try {
    return await blobToDataUri(blob, mimeHint);
  } catch (e) {
    console.warn('[messageMedia] blob to data URI failed:', e);
    return null;
  }
}

function newMessageId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function sendDirectMessageMedia(
  supabase: SupabaseClient,
  options: {
    companyId: string;
    senderId: string;
    recipientId: string;
    subject: string;
    parentMessageId?: string | null;
    threadScopeId: string;
    caption: string;
    media: PickedMessageMedia;
    senderDisplayName?: string | null;
    notificationType?: string;
    childId?: string | null;
    familyId?: string | null;
    threadKind?: string | null;
  },
): Promise<{ error: string | null }> {
  const messageId = newMessageId();
  const storagePath = buildMessageMediaStoragePath({
    companyId: options.companyId,
    scope: 'direct',
    scopeId: options.threadScopeId,
    messageId,
    fileName: options.media.fileName,
  });

  const upload = await uploadMessageMediaFromUri(
    supabase,
    storagePath,
    options.media.uri,
    options.media.mimeType,
  );
  if (upload.error) return upload;

  const { error } = await supabase.from('messages').insert({
    id: messageId,
    company_id: options.companyId,
    sender_id: options.senderId,
    recipient_id: options.recipientId,
    subject: options.subject,
    content: options.caption.trim(),
    parent_message_id: options.parentMessageId ?? null,
    notification_type: options.notificationType ?? 'message',
    read: false,
    sender_display_name: options.senderDisplayName?.trim() || null,
    message_kind: options.media.kind,
    media_storage_path: storagePath,
    media_mime: options.media.mimeType,
    media_file_name: options.media.fileName,
    ...(options.childId ? { child_id: options.childId } : {}),
    ...(options.familyId ? { family_id: options.familyId } : {}),
    ...(options.threadKind ? { thread_kind: options.threadKind } : {}),
  });

  if (error) {
    console.error('[messageMedia] direct insert failed:', error.message);
    await supabase.storage.from(MESSAGE_MEDIA_BUCKET).remove([storagePath]);
    return { error: 'Could not send media message. Please try again.' };
  }

  return { error: null };
}

export async function pickMessageMediaFromDevice(): Promise<PickedMessageMedia | null> {
  const DocumentPicker = await import('expo-document-picker');
  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'video/*', 'audio/*', 'application/pdf', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const fileName = asset.name ?? `media-${Date.now()}`;
  const mimeType = asset.mimeType ?? 'application/octet-stream';
  const kind = classifyMessageMediaMime(mimeType, fileName);
  if (!kind) return null;
  return { uri: asset.uri, mimeType, fileName, kind };
}

export async function sendGroupMessageMedia(
  supabase: SupabaseClient,
  options: {
    companyId: string;
    groupId: string;
    senderId: string;
    caption: string;
    media: PickedMessageMedia;
  },
): Promise<{ error: string | null; preview: string }> {
  const messageId = newMessageId();
  const storagePath = buildMessageMediaStoragePath({
    companyId: options.companyId,
    scope: 'group',
    scopeId: options.groupId,
    messageId,
    fileName: options.media.fileName,
  });

  const upload = await uploadMessageMediaFromUri(
    supabase,
    storagePath,
    options.media.uri,
    options.media.mimeType,
  );
  if (upload.error) return { error: upload.error, preview: '' };

  const caption = options.caption.trim();
  const { error } = await supabase.from('group_messages').insert({
    id: messageId,
    group_id: options.groupId,
    sender_id: options.senderId,
    content: caption,
    message_kind: options.media.kind,
    media_storage_path: storagePath,
    media_mime: options.media.mimeType,
    media_file_name: options.media.fileName,
  });

  if (error) {
    console.error('[messageMedia] group insert failed:', error.message);
    await supabase.storage.from(MESSAGE_MEDIA_BUCKET).remove([storagePath]);
    return { error: 'Could not send media message. Please try again.', preview: '' };
  }

  const preview = messagePreviewLabel(options.media.kind, caption, options.media.fileName);
  return { error: null, preview };
}
