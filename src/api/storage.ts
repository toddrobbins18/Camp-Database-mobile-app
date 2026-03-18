/**
 * Supabase storage uploads – same bucket names and path conventions as Lovable web.
 * Buckets: profile-photos, daily-wolf-documents, rainy-day-documents, division-schedules, trip-attachments.
 * All buckets are private; use createSignedUrl for viewing.
 */

import { supabase } from '../lib/supabase';

const BUCKETS = {
  profilePhotos: 'profile-photos',
  dailyWolfDocuments: 'daily-wolf-documents',
  rainyDayDocuments: 'rainy-day-documents',
  divisionSchedules: 'division-schedules',
  tripAttachments: 'trip-attachments',
} as const;

/** Path: company_id/entity_type/entity_id/timestamp.ext */
export async function uploadProfilePhoto(params: {
  companyId: string;
  entityType: 'camper' | 'staff';
  entityId: string;
  file: Blob | ArrayBuffer;
  fileExt?: string;
}): Promise<string> {
  const { companyId, entityType, entityId, file, fileExt = 'jpg' } = params;
  const fileName = `${companyId}/${entityType}/${entityId}/${Date.now()}.${fileExt}`;
  const { error } = await supabase.storage
    .from(BUCKETS.profilePhotos)
    .upload(fileName, file, { upsert: true });
  if (error) throw error;
  return fileName;
}

/** Path: company_id/season/date-timestamp-filename (match web DailyWolf) */
export async function uploadDailyWolfDocument(params: {
  companyId: string;
  season: string;
  date: string; // YYYY-MM-DD
  fileName: string;
  file: Blob | ArrayBuffer;
}): Promise<string> {
  const { companyId, season, date, fileName: originalName, file } = params;
  const timestamp = Date.now();
  const filePath = `${companyId}/${season}/${date}-${timestamp}-${originalName}`;
  const { error } = await supabase.storage
    .from(BUCKETS.dailyWolfDocuments)
    .upload(filePath, file, { contentType: 'application/pdf', upsert: false });
  if (error) throw error;
  return filePath;
}

/** Path: company_id/season/date-timestamp-filename (match web RainyDaySchedule) */
export async function uploadRainyDayDocument(params: {
  companyId: string;
  season: string;
  date: string; // YYYY-MM-DD
  fileName: string;
  file: Blob | ArrayBuffer;
}): Promise<string> {
  const { companyId, season, date, fileName: originalName, file } = params;
  const timestamp = Date.now();
  const filePath = `${companyId}/${season}/${date}-${timestamp}-${originalName}`;
  const { error } = await supabase.storage
    .from(BUCKETS.rainyDayDocuments)
    .upload(filePath, file, { contentType: 'application/pdf', upsert: false });
  if (error) throw error;
  return filePath;
}

/** Path: company_id/division_id/yyyy-MM-dd-timestamp.ext (match web DivisionScheduleUploader) */
export async function uploadDivisionSchedule(params: {
  companyId: string;
  divisionId: string;
  scheduleDate: string; // YYYY-MM-DD
  file: Blob | ArrayBuffer;
  fileExt: string;
}): Promise<string> {
  const { companyId, divisionId, scheduleDate, file, fileExt } = params;
  const fileName = `${companyId}/${divisionId}/${scheduleDate}-${Date.now()}.${fileExt}`;
  const { error } = await supabase.storage
    .from(BUCKETS.divisionSchedules)
    .upload(fileName, file);
  if (error) throw error;
  return fileName;
}

/** Path: company_id/trip_id/timestamp.ext (company_id so RLS "view by company" works) */
export async function uploadTripAttachment(params: {
  companyId: string;
  tripId: string;
  file: Blob | ArrayBuffer;
  fileExt: string;
}): Promise<string> {
  const { companyId, tripId, file, fileExt } = params;
  const fileName = `${companyId}/${tripId}/${Date.now()}.${fileExt}`;
  const { error } = await supabase.storage
    .from(BUCKETS.tripAttachments)
    .upload(fileName, file);
  if (error) throw error;
  return fileName;
}

/** Get a signed URL for private bucket files (e.g. view PDF/image). Expires in 1 hour by default. */
export async function getSignedUrl(
  bucket: keyof typeof BUCKETS,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const bucketId = BUCKETS[bucket];
  const { data, error } = await supabase.storage
    .from(bucketId)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl ?? '';
}

/** Extract storage path from a full storage URL (e.g. from file_url in DB). */
export function pathFromFileUrl(fileUrl: string, bucketName: string): string | null {
  const prefix = `/${bucketName}/`;
  const i = fileUrl.indexOf(prefix);
  if (i === -1) return null;
  const after = fileUrl.slice(i + prefix.length);
  const q = after.indexOf('?');
  return q === -1 ? after : after.slice(0, q);
}

/** Remove file from storage (e.g. on delete). */
export async function removeStorageFile(
  bucket: keyof typeof BUCKETS,
  path: string
): Promise<void> {
  const { error } = await supabase.storage.from(BUCKETS[bucket]).remove([path]);
  if (error) throw error;
}

export { BUCKETS };
