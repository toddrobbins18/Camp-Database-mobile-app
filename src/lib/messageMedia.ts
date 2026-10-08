import type { SupabaseClient } from '@supabase/supabase-js';
import { isNestSandboxCompany } from '../constants/camps';

export const MESSAGE_MEDIA_BUCKET = 'message-media';

export const MESSAGE_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const MESSAGE_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
] as const;

export type MessageKind = 'text' | 'image' | 'video';

export type PickedMessageMedia = {
  uri: string;
  mimeType: string;
  fileName: string;
  kind: MessageKind;
};

export function messageMediaEnabledForCamp(slug: string | null | undefined): boolean {
  return isNestSandboxCompany(slug);
}

export function classifyMessageMediaMime(mimeType: string): MessageKind | null {
  if (MESSAGE_IMAGE_MIME_TYPES.includes(mimeType as (typeof MESSAGE_IMAGE_MIME_TYPES)[number])) {
    return 'image';
  }
  if (MESSAGE_VIDEO_MIME_TYPES.includes(mimeType as (typeof MESSAGE_VIDEO_MIME_TYPES)[number])) {
    return 'video';
  }
  return null;
}

export function messagePreviewLabel(kind: MessageKind | string | null | undefined, content: string): string {
  if (kind === 'image') return content.trim() ? content.trim() : 'Photo';
  if (kind === 'video') return content.trim() ? content.trim() : 'Video';
  return content;
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
      contentType: mimeType,
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

export async function createSignedMessageMediaUrl(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(MESSAGE_MEDIA_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);
  if (error || !data?.signedUrl) {
    console.warn('[messageMedia] signed URL failed:', error?.message);
    return null;
  }
  return data.signedUrl;
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
  });

  if (error) {
    console.error('[messageMedia] direct insert failed:', error.message);
    await supabase.storage.from(MESSAGE_MEDIA_BUCKET).remove([storagePath]);
    return { error: 'Could not send media message. Please try again.' };
  }

  return { error: null };
}
