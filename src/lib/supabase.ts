import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use our Supabase project (env preferred; fallback for dev)
export const supabaseUrl =
  String(
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
      process.env.VITE_SUPABASE_URL ??
      'https://qjbkvnzeejbqxbcbskdu.supabase.co'
  ).trim();

export const supabaseAnonKey = String(
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYmt2bnplZWpicXhiY2Jza2R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzAzMjcsImV4cCI6MjA4ODU0NjMyN30.6SdzLftFAn_HgTQrlmSbqEIk_gZCBZJnZsMmo1yz48U'
).trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
