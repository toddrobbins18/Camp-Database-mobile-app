/** Normalize message row media fields from PostgREST / cached shapes. */
export function messageRowMediaFields(row: Record<string, unknown>): {
  messageKind: string | null;
  mediaStoragePath: string | null;
  mediaMime: string | null;
  mediaFileName: string | null;
  content: string;
} {
  const messageKind =
    (row.message_kind as string | null | undefined) ??
    (row.messageKind as string | null | undefined) ??
    null;
  const mediaStoragePath =
    (row.media_storage_path as string | null | undefined) ??
    (row.mediaStoragePath as string | null | undefined) ??
    null;
  const mediaMime =
    (row.media_mime as string | null | undefined) ??
    (row.mediaMime as string | null | undefined) ??
    null;
  const mediaFileName =
    (row.media_file_name as string | null | undefined) ??
    (row.mediaFileName as string | null | undefined) ??
    null;
  const content = String(row.content ?? '');

  return { messageKind, mediaStoragePath, mediaMime, mediaFileName, content };
}

export function rowHasMessageMedia(row: Record<string, unknown>): boolean {
  const { messageKind, mediaStoragePath } = messageRowMediaFields(row);
  if (mediaStoragePath?.trim()) return true;
  const kind = (messageKind || 'text').toLowerCase();
  return kind === 'image' || kind === 'video' || kind === 'audio' || kind === 'file';
}
