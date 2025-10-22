import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    storageKey: 'poker-bankroll-auth',
  },
});

if (typeof window !== 'undefined') {
  (window as any).__supabase = supabase;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetryAuth = (error: any) => {
  if (!error) return false;
  const status = error.status ?? error.code;
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return (
    status === 401 ||
    status === 403 ||
    message.includes('jwt') ||
    message.includes('auth session missing') ||
    message.includes('refresh token')
  );
};

type SupabaseOperation<T> = () => Promise<{ data: T; error: any }>;

export async function executeSupabaseQuery<T>(
  operation: SupabaseOperation<T>,
  options: { retries?: number } = {}
): Promise<T> {
  const maxRetries = options.retries ?? 3;
  let attempt = 0;
  let lastError: any;

  while (attempt < maxRetries) {
    const result = await operation();
    if (!result.error) {
      return result.data;
    }

    lastError = result.error;
    console.warn('[Supabase] query failed', {
      attempt,
      status: result.error.status ?? result.error.code,
      message: result.error.message,
    });

    if (shouldRetryAuth(result.error)) {
      attempt += 1;
      // Ensure session is initialized/refreshed before retrying
      const { data: current } = await supabase.auth.getSession();
      if (!current?.session) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('[Supabase] refresh failed', refreshError);
        } else {
          console.info('[Supabase] session refreshed', Boolean(refreshed.session));
        }
      }
      await wait(150 * attempt);
      continue;
    }

    console.error('[Supabase] giving up on query', result.error);
    throw result.error;
  }

  console.error('[Supabase] retries exhausted', lastError);
  throw lastError;
}
