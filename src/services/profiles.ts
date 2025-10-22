import { supabase } from './supabase';
import type { Profile, UpdateProfileDTO } from '@/types/database';

export const profileService = {
  // Get user profile
  getProfile: async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  // Update profile
  updateProfile: async (userId: string, updates: UpdateProfileDTO): Promise<Profile> => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get public profile by username
  getPublicProfile: async (username: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('public_username', username)
      .eq('is_public', true)
      .single();

    if (error) throw error;
    return data;
  },
};
