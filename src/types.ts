// Shared types between frontend and server

export type PlayerRole = 'Batter' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper';
export type PlayerStatus = 'IND' | 'OS';
export type AuctionStatus = 'LOBBY' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type QueueStatus = 'PENDING' | 'ACTIVE' | 'SOLD' | 'UNSOLD' | 'RELISTED';
export type AIDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface Player {
  id: string;           // IPL26-001
  player_name: string;
  primary_role: PlayerRole;
  country: string;
  status: PlayerStatus; // IND | OS
  franchise_2026: string;
  squad_status: string;
  base_price_lakhs: number; // integer e.g. 50 = ₹0.5 Cr
  game_points: number;      // 7–15
  auction_status: string;
}

export interface Franchise {
  id: string;    // CSK, MI, etc
  name: string;
  primary: string;   // CSS color
  secondary: string;
  emoji: string;
  tagline: string;
}

export interface Participant {
  id: string;
  room_id: string;
  user_id: string | null;
  franchise_id: string;
  display_name: string;
  is_host: boolean;
  is_ai: boolean;
  ai_difficulty?: AIDifficulty;
  purse_remaining_lakhs: number;
  total_spent_lakhs: number;
  squad: SquadPlayer[];
}

export interface SquadPlayer {
  player: Player;
  sold_price_lakhs: number;
  sold_at: number;
}

export interface RoomSettings {
  room_code: string;
  room_name: string;
  is_private: boolean;
  max_teams: number;
  max_squad_size: number;
  starting_purse_lakhs: number;
  bid_timer_seconds: number;
  is_unlimited_timer: boolean;
  ai_enabled: boolean;
  ai_difficulty: AIDifficulty;
}

export interface RoomState {
  id: string;
  room_code: string;
  room_name: string;
  host_id: string;
  host_franchise: string;
  status: AuctionStatus;
  settings: RoomSettings;
  participants: Record<string, Participant>; // keyed by franchise_id
  current_player: Player | null;
  current_player_index: number;
  total_players: number;
  current_bid_lakhs: number;
  current_bidder_franchise: string | null;
  bid_deadline: number | null; // unix ms
  is_paused: boolean;
  sold_list: SoldRecord[];
  unsold_list: Player[];
  activity_feed: ActivityEvent[];
}

export interface SoldRecord {
  player: Player;
  franchise_id: string;
  franchise_display: string;
  sold_price_lakhs: number;
  sold_at: number;
}

export interface ActivityEvent {
  id: string;
  type: 'bid' | 'sold' | 'unsold' | 'joined' | 'left' | 'paused' | 'resumed' | 'skipped' | 'relisted';
  message: string;
  timestamp: number;
  franchise_id?: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  franchise_id?: string;
  text: string;
  timestamp: number;
  is_system: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_emoji: string;
  xp: number;
  level: number;
  rank_name: string;
  auctions_played: number;
  auctions_won: number;
  total_players_bought: number;
}

export interface AuctionResult {
  room_code: string;
  room_name: string;
  completed_at: number;
  teams: TeamResult[];
}

export interface TeamResult {
  franchise_id: string;
  display_name: string;
  total_spent_lakhs: number;
  purse_remaining_lakhs: number;
  squad: SquadPlayer[];
  total_points: number;
  rank: number;
}

// XP ranks
export const RANK_LADDER = [
  { level: 1, name: 'Rookie',         minXp: 0 },
  { level: 2, name: 'Scout',          minXp: 500 },
  { level: 3, name: 'Strategist',     minXp: 1500 },
  { level: 4, name: 'Auction Pro',    minXp: 3500 },
  { level: 5, name: 'Elite Manager',  minXp: 7000 },
  { level: 6, name: 'Legend',         minXp: 12000 },
];

export function getRankForXp(xp: number) {
  const rank = [...RANK_LADDER].reverse().find(r => xp >= r.minXp);
  return rank || RANK_LADDER[0];
}
