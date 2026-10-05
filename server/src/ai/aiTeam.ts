import { GameTeam, Player, Room, AIPersonality, AIDifficulty } from '../types';

/** How many ms to wait before the AI places a bid (min, max). */
const THINK_TIME: Record<AIDifficulty, [number, number]> = {
  easy: [500, 1200],
  medium: [300, 800],
  hard: [150, 400],
};

/** Base willingness multiplier per personality. */
const PERSONALITY_MULTIPLIER: Record<AIPersonality, number> = {
  Aggressive: 1.30,
  Balanced: 1.10,
  Budget: 0.85,
  BowlingSpecialist: 1.15,
  BattingSpecialist: 1.15,
};

/**
 * Role preference weights for specialist personalities.
 * Values > 1 mean the AI values this role more.
 */
const ROLE_PREFERENCE: Record<AIPersonality, Record<string, number>> = {
  Aggressive: {
    Batter: 1.1,
    Bowler: 1.0,
    'All-rounder': 1.2,
    Wicketkeeper: 1.0,
  },
  Balanced: {
    Batter: 1.0,
    Bowler: 1.0,
    'All-rounder': 1.1,
    Wicketkeeper: 1.0,
  },
  Budget: {
    Batter: 1.0,
    Bowler: 1.0,
    'All-rounder': 1.0,
    Wicketkeeper: 1.0,
  },
  BowlingSpecialist: {
    Batter: 0.75,
    Bowler: 1.40,
    'All-rounder': 1.10,
    Wicketkeeper: 0.80,
  },
  BattingSpecialist: {
    Batter: 1.40,
    Bowler: 0.75,
    'All-rounder': 1.10,
    Wicketkeeper: 1.20,
  },
};

/** Difficulty bid-ceiling multipliers (relative to player overall rating value). */
const DIFFICULTY_CEILING: Record<AIDifficulty, number> = {
  easy: 0.9,
  medium: 1.0,
  hard: 1.15,
};

/**
 * Determines whether an AI team should bid and at what amount.
 * Returns a bid amount (number) or null if the AI decides to pass.
 */
export const getAIBid = (
  room: Room,
  aiTeam: GameTeam,
  currentBid: number,
  currentPlayer: Player
): Promise<number | null> => {
  return new Promise((resolve) => {
    const [minDelay, maxDelay] = THINK_TIME[room.settings.aiDifficulty];
    const delay = Math.floor(Math.random() * (maxDelay - minDelay) + minDelay);

    setTimeout(() => {
      const bid = computeBid(room, aiTeam, currentBid, currentPlayer);
      resolve(bid);
    }, delay);
  });
};

// ─────────────────────────────────────────────────────────────
//  Internal computation helpers
// ─────────────────────────────────────────────────────────────

function computeBid(
  room: Room,
  aiTeam: GameTeam,
  currentBid: number,
  currentPlayer: Player
): number | null {
  const personality = aiTeam.aiPersonality ?? 'Balanced';
  const difficulty = room.settings.aiDifficulty;

  // ── 1. Squad needs analysis ──────────────────────────────
  const roleCount = getRoleCounts(aiTeam.players);
  const roleNeed = assessRoleNeed(roleCount, currentPlayer.role, room.settings.maxSquadSize);

  // ── 2. Purse management ──────────────────────────────────
  const playersNeeded = Math.max(0, room.settings.minSquadSize - aiTeam.players.length);
  const reserveNeeded = playersNeeded > 1 ? (playersNeeded - 1) * 25 : 0;
  const effectivePurse = aiTeam.purse - reserveNeeded;

  if (effectivePurse <= currentBid) return null; // Can't afford
  if (aiTeam.players.length >= room.settings.maxSquadSize) return null; // Squad full

  // ── 3. Calculate maximum willingness to pay ──────────────
  const baseValue = ratingToValue(currentPlayer.overallRating, currentPlayer.basePrice);
  const personalityMult = PERSONALITY_MULTIPLIER[personality];
  const roleMult = ROLE_PREFERENCE[personality][currentPlayer.role] ?? 1.0;
  const difficultyMult = DIFFICULTY_CEILING[difficulty];
  const roleNeedMult = 1 + roleNeed * 0.2; // Up to 1.4x if role is critically needed

  // Randomness: ±10%
  const jitter = 0.9 + Math.random() * 0.2;

  const maxWilling = Math.floor(
    baseValue * personalityMult * roleMult * difficultyMult * roleNeedMult * jitter
  );

  // ── 4. Decide whether to bid ─────────────────────────────
  const proposedBid = currentBid + 10; // minimum increment

  if (proposedBid > maxWilling) return null;  // too expensive
  if (proposedBid > effectivePurse) return null; // can't afford

  // Budget personality sometimes backs out early to save purse
  if (personality === 'Budget' && currentBid > currentPlayer.basePrice * 1.5) {
    if (Math.random() < 0.5) return null;
  }

  // Aggressive personality occasionally overbids slightly
  if (personality === 'Aggressive' && Math.random() < 0.2) {
    const aggBid = proposedBid + 10;
    if (aggBid <= effectivePurse && aggBid <= maxWilling + 20) {
      return Math.min(aggBid, effectivePurse);
    }
  }

  return Math.min(proposedBid, effectivePurse);
}

/** Convert a 1-99 overall rating + base price into a monetary value in Lakhs. */
function ratingToValue(overall: number, basePrice: number): number {
  // Linear mapping: rating 50 → 1× base, rating 99 → 3× base
  const multiplier = 1 + ((overall - 50) / 49) * 2;
  return Math.max(basePrice, Math.floor(basePrice * multiplier));
}

function getRoleCounts(players: Player[]): Record<string, number> {
  return players.reduce<Record<string, number>>((acc, p) => {
    acc[p.role] = (acc[p.role] ?? 0) + 1;
    return acc;
  }, {});
}

/**
 * Returns a value 0-2 indicating how badly the AI needs this role.
 * 0 = don't need, 1 = would be nice, 2 = critically needed.
 */
function assessRoleNeed(
  counts: Record<string, number>,
  role: string,
  maxSquad: number
): number {
  const c = counts[role] ?? 0;
  const targets: Record<string, number> = {
    Batter: 4,
    Bowler: 4,
    'All-rounder': 2,
    Wicketkeeper: 1,
  };
  const target = targets[role] ?? 2;
  if (c === 0) return 2;
  if (c < target) return 1;
  return 0;
}
