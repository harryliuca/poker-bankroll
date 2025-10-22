import { supabase, executeSupabaseQuery } from './supabase';
import type { Profile, UpdateProfileDTO } from '@/types/database';

export const profileService = {
  // Get user profile
  getProfile: async (userId: string): Promise<Profile | null> => {
    const data = await executeSupabaseQuery(() =>
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    );

    return data;
  },

  // Update profile
  updateProfile: async (userId: string, updates: UpdateProfileDTO): Promise<Profile> => {
    const data = await executeSupabaseQuery(() =>
      supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()
    );

    return data;
  },

  // Get public profile by username
  getPublicProfile: async (username: string): Promise<Profile | null> => {
    const data = await executeSupabaseQuery(() =>
      supabase
        .from('profiles')
        .select('*')
        .eq('public_username', username)
        .eq('is_public', true)
        .single()
    );

    return data;
  },
};
