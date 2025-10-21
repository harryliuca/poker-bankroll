import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const webStorage =
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
    ? {
        getItem: async (key: string) => {
          try {
            return window.localStorage.getItem(key);
          } catch (error) {
            console.warn('Supabase storage getItem failed', error);
            return null;
          }
        },
        setItem: async (key: string, value: string) => {
          try {
            window.localStorage.setItem(key, value);
          } catch (error) {
            console.warn('Supabase storage setItem failed', error);
          }
        },
        removeItem: async (key: string) => {
          try {
            window.localStorage.removeItem(key);
          } catch (error) {
            console.warn('Supabase storage removeItem failed', error);
          }
        },
      }
    : null;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: webStorage ?? AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

if (typeof window !== 'undefined') {
  (window as any).__supabase = supabase;
}
