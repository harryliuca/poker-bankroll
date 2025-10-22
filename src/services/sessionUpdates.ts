import { supabase, executeSupabaseQuery } from './supabase';
import type { SessionUpdate, CreateSessionUpdateDTO } from '@/types/database';

export const sessionUpdateService = {
  // Get all updates for a session
  getSessionUpdates: async (sessionId: string): Promise<SessionUpdate[]> => {
    const data = await executeSupabaseQuery(() =>
      supabase
        .from('session_updates')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
    );

    return data || [];
  },

  // Create a new session update
  createUpdate: async (update: CreateSessionUpdateDTO): Promise<SessionUpdate> => {
    const data = await executeSupabaseQuery(() =>
      supabase
        .from('session_updates')
        .insert(update)
        .select()
        .single()
    );

    return data;
  },

  // Delete an update
  deleteUpdate: async (updateId: string): Promise<void> => {
    await executeSupabaseQuery(() =>
      supabase
        .from('session_updates')
        .delete()
        .eq('id', updateId)
    );
  },
};
