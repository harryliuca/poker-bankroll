import { supabase } from './supabase';
import type { SessionUpdate, CreateSessionUpdateDTO } from '@/types/database';

export const sessionUpdateService = {
  // Get all updates for a session
  getSessionUpdates: async (sessionId: string): Promise<SessionUpdate[]> => {
    const { data, error } = await supabase
      .from('session_updates')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Create a new session update
  createUpdate: async (update: CreateSessionUpdateDTO): Promise<SessionUpdate> => {
    const { data, error } = await supabase
      .from('session_updates')
      .insert(update)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete an update
  deleteUpdate: async (updateId: string): Promise<void> => {
    const { error } = await supabase.from('session_updates').delete().eq('id', updateId);
    if (error) throw error;
  },
};
