// Database types for Poker Bankroll Tracker

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'CNY';
export type GameType = 'cash' | 'tournament' | 'sng';
export type LocationType = 'live' | 'online';
export type VariantCategory = 'holdem' | 'omaha' | 'stud' | 'mixed' | 'other';

export interface Profile {
  id: string;
  created_at: string;
  updated_at: string;

  // Settings
  currency: Currency;
  default_game_type: GameType;
  default_variant: string;
  timezone: string;

  // Stats
  total_sessions: number;
  total_profit: number;
  total_hours: number;
  current_bankroll: number;
  last_session_date: string | null;

  // Public profile
  is_public: boolean;
  public_username: string | null;
  display_name: string | null;
}

export interface PokerSession {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;

  // Session details
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  duration_hours: number | null;

  // Actual times for live tracking
  actual_start_time: string | null;
  actual_end_time: string | null;

  // Game info
  game_type: GameType;
  variant: string;
  stakes: string | null;

  // Location
  location: string | null;
  location_type: LocationType;

  // Financial
  buy_in: number;
  cash_out: number;
  total_rebuys: number;
  rebuy_count: number;
  profit: number; // Generated column

  // Stats
  hands_played: number | null;

  // Notes
  notes: string | null;
  session_name: string | null;

  // Status
  is_ongoing: boolean;
}

export type SessionUpdateType = 'rebuy' | 'addon' | 'chip_spend' | 'balance_check' | 'note' | 'break';

export interface SessionUpdate {
  id: string;
  session_id: string;
  created_at: string;

  update_type: SessionUpdateType;
  amount: number | null;
  current_stack: number | null;
  notes: string | null;
}

export interface GameVariant {
  id: string;
  canonical_name: string;
  display_name: string;
  category: VariantCategory;
  alternate_names: string[];
}

export interface UserStats {
  id: string;
  user_id: string;

  // Breakdown
  game_type: GameType | null;
  variant: string | null;
  location_type: LocationType | null;

  // Aggregates
  total_sessions: number;
  total_profit: number;
  total_hours: number;
  total_hands: number;

  // Derived
  win_rate: number | null;
  roi: number | null;

  // Tracking
  last_played: string | null;
  updated_at: string;
}

export interface SessionTag {
  id: string;
  session_id: string;
  tag: string;
}

// DTOs for creating/updating
export interface CreateSessionDTO {
  session_date: string;
  start_time?: string;
  end_time?: string;
  duration_hours?: number;
  actual_start_time?: string;
  actual_end_time?: string;
  game_type: GameType;
  variant: string;
  stakes?: string;
  location?: string;
  location_type: LocationType;
  buy_in: number;
  cash_out: number;
  hands_played?: number;
  notes?: string;
  session_name?: string;
  is_ongoing?: boolean;
}

export interface CreateSessionUpdateDTO {
  session_id: string;
  update_type: SessionUpdateType;
  amount?: number;
  current_stack?: number;
  notes?: string;
}

export interface UpdateSessionDTO extends Partial<CreateSessionDTO> {
  id: string;
}

export interface UpdateProfileDTO {
  currency?: Currency;
  default_game_type?: GameType;
  default_variant?: string;
  timezone?: string;
  current_bankroll?: number;
  is_public?: boolean;
  public_username?: string;
  display_name?: string;
}
