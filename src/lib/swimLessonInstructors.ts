import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';

const storageKey = (companyId: string) => `swim-lesson-instructors:${companyId}`;

export async function loadSavedInstructorNames(companyId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(companyId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is string => typeof n === 'string' && n.trim().length > 0);
  } catch {
    return [];
  }
}

export async function saveInstructorName(companyId: string, name: string): Promise<string[]> {
  const trimmed = name.trim();
  if (!trimmed) return loadSavedInstructorNames(companyId);
  const existing = await loadSavedInstructorNames(companyId);
  const next = [...existing];
  if (!next.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
    next.push(trimmed);
    next.sort((a, b) => a.localeCompare(b));
    await AsyncStorage.setItem(storageKey(companyId), JSON.stringify(next));
  }
  return next;
}

export async function fetchSwimLessonInstructorOptions(
  supabase: SupabaseClient,
  companyId: string,
  season: string,
): Promise<string[]> {
  const [{ data: staffRows }, { data: lessonRows }, saved] = await Promise.all([
    supabase
      .from('staff')
      .select('name')
      .eq('company_id', companyId)
      .eq('season', season)
      .neq('status', 'inactive')
      .order('name'),
    supabase.from('swim_lessons').select('instructor').eq('company_id', companyId),
    loadSavedInstructorNames(companyId),
  ]);

  const names = new Set<string>(saved);
  for (const row of staffRows ?? []) {
    if (row.name?.trim()) names.add(row.name.trim());
  }
  for (const row of lessonRows ?? []) {
    if (row.instructor?.trim()) names.add(row.instructor.trim());
  }

  return [...names].sort((a, b) => a.localeCompare(b));
}
