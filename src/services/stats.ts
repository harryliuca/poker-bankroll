import { supabase, executeSupabaseQuery } from './supabase';
import type { UserStats } from '@/types/database';

export const statsService = {
  // Get all user stats
  getUserStats: async (userId: string): Promise<UserStats[]> => {
    const data = await executeSupabaseQuery(() =>
      supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .order('total_profit', { ascending: false })
    );

    return data || [];
  },

  // Get stats for specific game type
  getGameTypeStats: async (userId: string, gameType: string): Promise<UserStats[]> => {
    const data = await executeSupabaseQuery(() =>
      supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('game_type', gameType)
    );

    return data || [];
  },

  // Get overall stats summary
  getOverallStats: async (userId: string) => {
    const data = await executeSupabaseQuery(() =>
      supabase
        .from('profiles')
        .select('total_sessions, total_profit, total_hours, current_bankroll, last_session_date')
        .eq('id', userId)
        .single()
    );

    return data;
  },
};
