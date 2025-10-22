import { supabase } from './supabase';
import type { UserStats } from '@/types/database';

export const statsService = {
  // Get all user stats
  getUserStats: async (userId: string): Promise<UserStats[]> => {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .order('total_profit', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get stats for specific game type
  getGameTypeStats: async (userId: string, gameType: string): Promise<UserStats[]> => {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('game_type', gameType);

    if (error) throw error;
    return data || [];
  },

  // Get overall stats summary
  getOverallStats: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('total_sessions, total_profit, total_hours, current_bankroll, last_session_date')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },
};
