// ─── Player Types ──────────────────────────────────────────────────────────────

export type PlayerRole = 'BAT' | 'BOWL' | 'AR' | 'WK';
export type PlayerTier = 'S' | 'A' | 'B' | 'C' | 'D';
export type BowlingStyle = 'FAST' | 'MEDIUM' | 'SPIN' | 'NONE';
export type BattingHand = 'RIGHT' | 'LEFT';

export interface PlayerAttributes {
  batting: number;    // 1-100
  bowling: number;    // 1-100
  fielding: number;   // 1-100
  experience: number; // 1-100
  form: number;       // 1-100
  fitness: number;    // 1-100
}

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  tier: PlayerTier;
  nationality: 'INDIAN' | 'OVERSEAS';
  battingHand: BattingHand;
  bowlingStyle: BowlingStyle;
  attributes: PlayerAttributes;
  overallRating: number;   // 1-100
  basePrice: number;       // in crores (lakhs as integer, e.g. 20 = 20L)
  isCapped: boolean;
  age: number;
  specialties: string[];
  ipoTeam?: string;        // Previous IPL team
}

// ─── IPL Team Types ────────────────────────────────────────────────────────────

export interface IPLTeam {
  id: string;
  name: string;
  abbr: string;
  city: string;
  color: string;          // primary hex color
  secondaryColor: string; // secondary hex color
}

// ─── Game Team (runtime) ───────────────────────────────────────────────────────

export interface GameTeam {
  id: string;
  iplTeamId?: string;
  iplTeam?: IPLTeam;
  managerId?: string;
  managerName: string;
  isAI: boolean;
  aiDifficulty?: 'EASY' | 'MEDIUM' | 'HARD' | string;
  purse: number;
  players?: Player[];
  squad?: BoughtPlayer[];
  playingXI?: string[];
  captain?: string;
  captainId?: string | null;
  viceCaptain?: string;
  viceCaptainId?: string | null;
  isReady: boolean;
  isEliminated?: boolean;
}

export interface BoughtPlayer extends Player {
  boughtFor?: number;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}

// ─── Room & Settings ───────────────────────────────────────────────────────────

export type PlayerPool = 'QUICK' | 'FULL' | 'CUSTOM' | number;
export type AIDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'easy' | 'medium' | 'hard';

export interface RoomSettings {
  startingPurse: number;
  bidTimerSeconds?: number;
  auctionTimer?: number;
  playerPool?: PlayerPool;
  playerPoolSize?: number;
  customPlayerCount?: number;
  aiTeams?: boolean;
  aiDifficulty?: AIDifficulty;
  maxTeams?: number;
  minSquadSize?: number;
  maxSquadSize?: number;
}

export type RoomStatus = 
  | 'LOBBY'
  | 'AUCTION_ACTIVE'
  | 'SQUAD_BUILDING'
  | 'SIMULATING'
  | 'RESULTS';

export interface Room {
  code: string;
  hostId: string;         // socket id of host
  teams: GameTeam[];
  settings: RoomSettings;
  status: RoomStatus;
  playerPool: Player[];   // all players available for auction
  createdAt: number;
}

// ─── Auction State ─────────────────────────────────────────────────────────────

export type AuctionPhase = 
  | 'WAITING'         // waiting for next player
  | 'PLAYER_UP'       // player presented, bidding starts
  | 'BIDDING'         // active bidding
  | 'GOING_ONCE'
  | 'GOING_TWICE'
  | 'SOLD'
  | 'UNSOLD'
  | 'AUCTION_COMPLETE';

export interface AuctionState {
  currentPlayer: Player | null;
  currentBid: number;
  currentBidderId: string | null;   // team id
  currentBidderName: string | null;
  phase: AuctionPhase;
  timeRemaining: number;
  soldPlayers: SoldRecord[];
  unsoldPlayers: Player[];
  playerIndex: number;
  totalPlayers: number;
  lastBidTimestamp: number;
}

export interface SoldRecord {
  player: Player;
  teamId: string;
  teamName: string;
  price: number;
  timestamp: number;
}

// ─── Simulation Types ──────────────────────────────────────────────────────────

export interface PlayerPerformance {
  playerId: string;
  playerName: string;
  teamId: string;
  runs?: number;
  wickets?: number;
  catches?: number;
  fours?: number;
  sixes?: number;
  strikeRate?: number;
  economy?: number;
  isManOfMatch?: boolean;
}

export interface MatchResult {
  team1Id: string;
  team2Id: string;
  team1Score: number;
  team2Score: number;
  team1Wickets: number;
  team2Wickets: number;
  team1Overs: number;
  team2Overs: number;
  winnerId: string;
  margin: string;     // e.g. "5 wickets" or "23 runs"
  manOfMatch: string; // player name
  performances: PlayerPerformance[];
}

export interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  abbr: string;
  color: string;
  managerName: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  points: number;
  nrr: number;       // Net Run Rate
  teamRating: number;
}

export interface SimulationResult {
  matches: MatchResult[];
  leaderboard: LeaderboardEntry[];
  champion: GameTeam;
  auctionStats: AuctionStats;
}

export interface AuctionStats {
  mostExpensivePlayer: { player: Player; price: number; teamId: string };
  bestBargain: { player: Player; price: number; value: number };
  biggestSpender: { teamId: string; spent: number };
  highestRatedSquad: { teamId: string; rating: number };
  totalMoneySpent: number;
  unsoldCount: number;
}

// ─── Socket Events ─────────────────────────────────────────────────────────────

export interface SocketEvents {
  // Client → Server
  joinRoom: { roomCode: string; teamId: string; managerName: string };
  leaveRoom: { roomCode: string };
  setReady: { roomCode: string; isReady: boolean };
  startAuction: { roomCode: string };
  placeBid: { roomCode: string; amount: number };
  lockSquad: { roomCode: string; playingXI: string[]; captain: string; viceCaptain: string };
  
  // Server → Client
  roomUpdated: Room;
  auctionUpdate: AuctionState;
  simulationResult: SimulationResult;
  error: { message: string };
  bidPlaced: { teamId: string; teamName: string; amount: number };
  playerSold: SoldRecord;
  playerUnsold: { player: Player };
}
