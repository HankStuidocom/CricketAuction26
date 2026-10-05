import { GameTeam, MatchResult, Player, TeamRating } from '../types';

// ─────────────────────────────────────────────────────────────
//  calculateTeamRating
// ─────────────────────────────────────────────────────────────

/**
 * Returns an overall team rating broken down by category.
 * All values are on a 0-99 scale.
 */
export function calculateTeamRating(team: GameTeam): TeamRating {
  const players = team.players;
  if (players.length === 0) {
    return {
      teamId: team.id,
      overall: 0,
      batting: 0,
      bowling: 0,
      fielding: 0,
      experience: 0,
      balance: 0,
      budgetEfficiency: 0,
    };
  }

  const avg = (getter: (p: Player) => number) =>
    Math.round(players.reduce((s, p) => s + getter(p), 0) / players.length);

  const batting = avg((p) => p.battingRating);
  const bowling = avg((p) => p.bowlingRating);
  const fielding = avg((p) => p.fieldingRating);
  const experience = avg((p) => p.experienceRating);
  const balance = calculateSquadBalance(team);
  const budgetEfficiency = calculateBudgetEfficiency(team);

  // Weighted overall
  const overall = Math.round(
    batting * 0.30 +
    bowling * 0.30 +
    fielding * 0.10 +
    experience * 0.15 +
    balance * 0.10 +
    budgetEfficiency * 0.05
  );

  return {
    teamId: team.id,
    overall,
    batting,
    bowling,
    fielding,
    experience,
    balance,
    budgetEfficiency,
  };
}

// ─────────────────────────────────────────────────────────────
//  calculateBudgetEfficiency
// ─────────────────────────────────────────────────────────────

/**
 * Score 0-99 reflecting how efficiently the team used their purse.
 * High efficiency = bought high-rated players without overpaying.
 */
export function calculateBudgetEfficiency(team: GameTeam): number {
  const players = team.players.filter((p) => p.soldPrice !== null && p.soldPrice! > 0);
  if (players.length === 0) return 50;

  let totalValue = 0;
  for (const p of players) {
    const fairValue = p.basePrice * (1 + (p.overallRating - 50) / 25);
    const paidValue = p.soldPrice!;
    // 100 = paid exactly fair value; penalise overpaying, reward underpaying
    const ratio = fairValue / paidValue;
    totalValue += clamp(ratio * 70, 20, 99);
  }

  return Math.round(totalValue / players.length);
}

// ─────────────────────────────────────────────────────────────
//  calculateSquadBalance
// ─────────────────────────────────────────────────────────────

/**
 * Score 0-99 reflecting squad role distribution.
 * Ideal squad: 4-5 batters, 4-5 bowlers, 1-2 all-rounders, 1 wicketkeeper.
 */
export function calculateSquadBalance(team: GameTeam): number {
  const players = team.players;
  if (players.length === 0) return 0;

  const counts: Record<string, number> = {
    Batter: 0,
    Bowler: 0,
    'All-rounder': 0,
    Wicketkeeper: 0,
  };

  for (const p of players) {
    counts[p.role] = (counts[p.role] ?? 0) + 1;
  }

  const total = players.length;

  // Ideal ratios
  const ideals: Record<string, [number, number]> = {
    Batter: [3, 5],
    Bowler: [3, 5],
    'All-rounder': [1, 3],
    Wicketkeeper: [1, 2],
  };

  let score = 99;
  for (const [role, [min, max]] of Object.entries(ideals)) {
    const count = counts[role] ?? 0;
    const scaledMin = Math.floor((min / 11) * total);
    const scaledMax = Math.ceil((max / 11) * total);
    if (count < scaledMin) score -= (scaledMin - count) * 10;
    if (count > scaledMax) score -= (count - scaledMax) * 5;
  }

  return clamp(score, 0, 99);
}

// ─────────────────────────────────────────────────────────────
//  calculateFinalScore
// ─────────────────────────────────────────────────────────────

/**
 * Compute a final composite score for ranking teams on the results screen.
 * Combines team rating with actual simulation performance.
 */
export function calculateFinalScore(
  team: GameTeam,
  matchResults: MatchResult[]
): number {
  const rating = calculateTeamRating(team);

  // Aggregate performance from match results
  let wins = 0;
  let runsScored = 0;
  let runsConceded = 0;
  let matchesPlayed = 0;

  for (const match of matchResults) {
    const isTeam1 = match.team1Id === team.id;
    const isTeam2 = match.team2Id === team.id;
    if (!isTeam1 && !isTeam2) continue;

    matchesPlayed++;
    if (match.winnerId === team.id) wins++;
    if (isTeam1) {
      runsScored += match.team1Score;
      runsConceded += match.team2Score;
    } else {
      runsScored += match.team2Score;
      runsConceded += match.team1Score;
    }
  }

  const winRate = matchesPlayed > 0 ? wins / matchesPlayed : 0;
  const nrr = matchesPlayed > 0 ? (runsScored - runsConceded) / (matchesPlayed * 20) : 0;

  // Weighted composite
  const performanceScore = clamp(
    winRate * 60 + clamp(nrr * 20 + 50, 0, 40),
    0,
    99
  );

  return Math.round(rating.overall * 0.4 + performanceScore * 0.6);
}

// ─────────────────────────────────────────────────────────────
//  Utility
// ─────────────────────────────────────────────────────────────

const clamp = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val));
