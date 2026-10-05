// ─────────────────────────────────────────────────────────────
//  Cricket Auction 26 — Shared TypeScript Types
// ─────────────────────────────────────────────────────────────

export type PlayerRole = 'Batter' | 'Wicketkeeper' | 'All-rounder' | 'Bowler';
export type PlayerTier = 'S' | 'A' | 'B' | 'C' | 'D';
export type RoomStatus = 'lobby' | 'auction' | 'squad' | 'simulation' | 'results';
export type AIPersonality =
  | 'Aggressive'
  | 'Balanced'
  | 'Budget'
  | 'BowlingSpecialist'
  | 'BattingSpecialist';
export type AIDifficulty = 'easy' | 'medium' | 'hard';

// ─────────────────────────────────────────────────────────────
//  Player
// ─────────────────────────────────────────────────────────────
export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  tier: PlayerTier;
  overallRating: number;        // 1-99
  battingRating: number;        // 1-99
  bowlingRating: number;        // 1-99
  fieldingRating: number;       // 1-99
  experienceRating: number;     // 1-99
  basePrice: number;            // in Lakhs (S=200, A=150, B=100, C=50, D=25)
  isSold: boolean;
  soldTo: string | null;        // GameTeam.id
  soldPrice: number | null;
}

// ─────────────────────────────────────────────────────────────
//  IPL Franchise Team (static data)
// ─────────────────────────────────────────────────────────────
export interface IPLTeam {
  id: string;
  name: string;
  abbr: string;
  city: string;
  color: string;          // primary hex
  secondaryColor: string; // secondary hex
}

// ─────────────────────────────────────────────────────────────
//  Game Team (runtime state for a player/AI in a room)
// ─────────────────────────────────────────────────────────────
export interface GameTeam {
  id: string;           // socket id or uuid for AI
  iplTeamId: string;
  managerName: string;
  purse: number;        // remaining purse in Lakhs
  players: Player[];
  isAI: boolean;
  aiPersonality: AIPersonality | null;
  isReady: boolean;
  isCaptainSet: boolean;
  captainId: string | null;
  viceCaptainId: string | null;
}

// ─────────────────────────────────────────────────────────────
//  Auction State
// ─────────────────────────────────────────────────────────────
export interface AuctionState {
  currentPlayerIndex: number;
  currentPlayer: Player | null;
  currentBid: number;
  currentBidderId: string | null;  // GameTeam.id
  timerSeconds: number;
  isActive: boolean;
  isPaused: boolean;
  soldPlayers: SoldEvent[];
  unsoldPlayers: Player[];
  skippedPlayerIds: string[];
}

// ─────────────────────────────────────────────────────────────
//  Room Settings
// ─────────────────────────────────────────────────────────────
export interface RoomSettings {
  startingPurse: number;   // Lakhs (default 900)
  auctionTimer: number;    // seconds (default 15)
  playerPoolSize: number;  // how many players from full list (default 60)
  minSquadSize: number;    // default 11
  maxSquadSize: number;    // default 15
  aiDifficulty: AIDifficulty;
}

// ─────────────────────────────────────────────────────────────
//  Room
// ─────────────────────────────────────────────────────────────
export interface Room {
  code: string;
  hostId: string;           // socket id of host
  teams: GameTeam[];
  status: RoomStatus;
  settings: RoomSettings;
  currentAuction: AuctionState | null;
  playerPool: Player[];     // shuffled pool for this room
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────
//  Events
// ─────────────────────────────────────────────────────────────
export interface BidEvent {
  roomCode: string;
  teamId: string;
  teamName: string;
  playerId: string;
  amount: number;
  timestamp: number;
}

export interface SoldEvent {
  player: Player;
  teamId: string;
  teamName: string;
  soldPrice: number;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────
//  Simulation / Results
// ─────────────────────────────────────────────────────────────
export interface PlayerPerformance {
  playerId: string;
  playerName: string;
  role: PlayerRole;
  runs: number;
  ballsFaced: number;
  wickets: number;
  oversBowled: number;
  runsConceded: number;
  catches: number;
  strikeRate: number;
  economy: number;
}

export interface MatchResult {
  matchId: string;
  team1Id: string;
  team2Id: string;
  team1Score: number;
  team1Wickets: number;
  team2Score: number;
  team2Wickets: number;
  winnerId: string | null;  // null = tie
  team1Performances: PlayerPerformance[];
  team2Performances: PlayerPerformance[];
  marginRuns: number;
  marginWickets: number;
}

export interface TeamStanding {
  teamId: string;
  iplTeamId: string;
  managerName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  nrr: number;            // Net Run Rate
  runsScored: number;
  runsConceded: number;
}

export interface SimulationResult {
  matches: MatchResult[];
  standings: TeamStanding[];
  winner: GameTeam;
  mvpPlayerId: string;
  mvpPlayerName: string;
}

// ─────────────────────────────────────────────────────────────
//  Team Rating (for results screen)
// ─────────────────────────────────────────────────────────────
export interface TeamRating {
  teamId: string;
  overall: number;
  batting: number;
  bowling: number;
  fielding: number;
  experience: number;
  balance: number;
  budgetEfficiency: number;
}
