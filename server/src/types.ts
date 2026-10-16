export interface User {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  avatar_emoji: string;
  xp: number;
  level: number;
  rank_name: string;
  auctions_played: number;
  auctions_won: number;
  total_players_bought: number;
  mega_count?: number;
  blitz_count?: number;
  likes_count?: number;
  created_at: number;
}

export interface Player {
  id: string;
  player_name: string;
  primary_role: string;
  country: string;
  status: string;
  franchise_2026: string | null;
  squad_status: string | null;
  base_price_lakhs: number;
  game_points: number;
  auction_status: string;
}

export type RoomStatus = 'LOBBY' | 'LIVE' | 'FINAL_ROUND' | 'COMPLETED' | 'CANCELLED' | 'IN_PROGRESS' | 'PAUSED';

export type JoinRole = 'COMMISSIONER' | 'FRANCHISE_OWNER' | 'RECONNECT' | 'SPECTATOR';

export type JoinErrorCode = 
  | 'ROOM_NOT_FOUND' 
  | 'ROOM_FULL' 
  | 'FRANCHISE_TAKEN' 
  | 'INVALID_PASSWORD' 
  | 'AUCTION_STARTED' 
  | 'ROOM_CANCELLED' 
  | 'SERVER_WAKING';

export interface Room {
  id: string;
  room_code: string;
  room_name: string;
  host_id: string;
  host_franchise: string;
  is_private: number;
  password_hash: string | null;
  status: RoomStatus | string;
  max_teams: number;
  max_squad_size: number;
  min_squad_size: number;
  starting_purse_lakhs: number;
  bid_timer_seconds: number;
  is_unlimited_timer: number;
  ai_enabled: number;
  ai_difficulty: string;
  current_player_id: string | null;
  current_bid_lakhs: number;
  current_bidder_franchise: string | null;
  bid_deadline: number | null;
  auction_started_at: number | null;
  completed_at: number | null;
  idempotency_key?: string | null;
  last_activity_at?: number | null;
  cancelled_at?: number | null;
  cancelled_by?: string | null;
  idle_warned_at?: number | null;
  created_at: number;
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string | null;
  franchise_id: string;
  display_name: string;
  is_host: number;
  is_ai: number;
  ai_difficulty: string | null;
  purse_remaining_lakhs: number;
  total_spent_lakhs: number;
  joined_at: number;
}

export interface AuctionQueue {
  id: string;
  room_id: string;
  player_id: string;
  queue_position: number;
  status: string;
}

export interface Bid {
  id: string;
  room_id: string;
  player_id: string;
  bidder_franchise: string;
  bidder_user_id: string | null;
  amount_lakhs: number;
  placed_at: number;
  idempotency_key: string | null;
}

export interface SquadPlayer {
  id: string;
  room_id: string;
  player_id: string;
  franchise_id: string;
  sold_price_lakhs: number;
  sold_at: number;
}
