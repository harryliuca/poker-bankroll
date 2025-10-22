import { supabase } from './supabase';
import type { PokerSession, CreateSessionDTO, UpdateSessionDTO } from '@/types/database';

export const sessionService = {
  // Get all sessions for current user
  getSessions: async (userId: string): Promise<PokerSession[]> => {
    const { data, error } = await supabase
      .from('poker_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('actual_start_time', { ascending: false, nullsFirst: false })
      .order('session_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get sessions with filters
  getFilteredSessions: async (
    userId: string,
    filters?: {
      game_type?: string;
      variant?: string;
      location_type?: string;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<PokerSession[]> => {
    let query = supabase
      .from('poker_sessions')
      .select('*')
      .eq('user_id', userId);

    if (filters?.game_type) {
      query = query.eq('game_type', filters.game_type);
    }
    if (filters?.variant) {
      query = query.eq('variant', filters.variant);
    }
    if (filters?.location_type) {
      query = query.eq('location_type', filters.location_type);
    }
    if (filters?.start_date) {
      query = query.gte('session_date', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('session_date', filters.end_date);
    }

    const { data, error } = await query.order('session_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get single session
  getSession: async (sessionId: string): Promise<PokerSession | null> => {
    const { data, error } = await supabase
      .from('poker_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    return data;
  },

  // Create new session
  createSession: async (userId: string, session: CreateSessionDTO): Promise<PokerSession> => {
    const { data, error } = await supabase
      .from('poker_sessions')
      .insert({
        user_id: userId,
        ...session,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update session
  updateSession: async (session: UpdateSessionDTO): Promise<PokerSession> => {
    const { id, ...updates } = session;
    const { data, error } = await supabase
      .from('poker_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete session
  deleteSession: async (sessionId: string): Promise<void> => {
    const { error } = await supabase.from('poker_sessions').delete().eq('id', sessionId);
    if (error) throw error;
  },

  // Get recent sessions (limit)
  getRecentSessions: async (userId: string, limit = 10): Promise<PokerSession[]> => {
    const { data, error } = await supabase
      .from('poker_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('actual_start_time', { ascending: false, nullsFirst: false })
      .order('session_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },
};
