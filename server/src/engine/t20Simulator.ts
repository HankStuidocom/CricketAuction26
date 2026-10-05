import { v4 as uuidv4 } from 'uuid';
import {
  GameTeam,
  MatchResult,
  Player,
  PlayerPerformance,
  PlayerRole,
  SimulationResult,
  TeamStanding,
} from '../types';

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

/** Clamp a number to [min, max]. */
const clamp = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val));

/** Random integer in [min, max] inclusive. */
const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Gaussian-ish random using Box-Muller, clamped to [0,1]. */
const gaussian = (mean: number, sd: number): number => {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return clamp(mean + z * sd, 0, 1);
};

// ─────────────────────────────────────────────────────────────
//  Individual Batter Simulation
// ─────────────────────────────────────────────────────────────

function simulateBatterInnings(
  player: Player,
  isCaptain: boolean,
  isVC: boolean,
  oppBowlingStrength: number  // 0-1
): { runs: number; balls: number } {
  const captainMult = isCaptain ? 1.5 : isVC ? 1.25 : 1.0;
  const baseRating = (player.battingRating / 99) * captainMult;
  const effective = gaussian(baseRating, 0.15) * (1 - oppBowlingStrength * 0.3);

  // Balls faced: role-based expected ball range
  const expectedBalls = (() => {
    switch (player.role as PlayerRole) {
      case 'Batter': return randInt(15, 45);
      case 'Wicketkeeper': return randInt(12, 40);
      case 'All-rounder': return randInt(8, 30);
      case 'Bowler': return randInt(1, 10);
    }
  })();

  const balls = clamp(
    Math.round(expectedBalls * (0.7 + Math.random() * 0.6)),
    0,
    120
  );

  // Strike rate: 80-180 depending on rating and randomness
  const strikeRate = clamp(80 + effective * 100, 60, 200);
  const runs = clamp(Math.round((balls * strikeRate) / 100), 0, 150);

  return { runs, balls };
}

// ─────────────────────────────────────────────────────────────
//  Individual Bowler Simulation
// ─────────────────────────────────────────────────────────────

function simulateBowlerInnings(
  player: Player,
  isCaptain: boolean,
  isVC: boolean,
  oppBattingStrength: number  // 0-1
): { wickets: number; overs: number; runsConceded: number } {
  if (player.role === 'Batter' || player.role === 'Wicketkeeper') {
    // Part-time bowlers rarely bowl; if they do, expect to go for runs
    if (Math.random() > 0.2) return { wickets: 0, overs: 0, runsConceded: 0 };
    return { wickets: 0, overs: 1, runsConceded: randInt(8, 16) };
  }

  const captainMult = isCaptain ? 1.5 : isVC ? 1.25 : 1.0;
  const baseRating = (player.bowlingRating / 99) * captainMult;
  const effective = gaussian(baseRating, 0.12) * (1 - oppBattingStrength * 0.25);

  // Overs: 2-4 for main bowlers
  const overs = player.role === 'All-rounder' ? randInt(1, 3) : randInt(2, 4);

  // Economy: 5-12 depending on quality
  const economy = clamp(12 - effective * 7, 5, 12);
  const runsConceded = Math.round(economy * overs);

  // Wickets: 0-4
  const wicketProb = clamp(0.05 + effective * 0.45, 0.05, 0.5);
  let wickets = 0;
  for (let i = 0; i < overs * 6; i++) {
    if (Math.random() < wicketProb / (overs * 6 / 3)) wickets++;
  }
  wickets = clamp(wickets, 0, 4);

  return { wickets, overs, runsConceded };
}

// ─────────────────────────────────────────────────────────────
//  Team Innings
// ─────────────────────────────────────────────────────────────

function simulateTeamInnings(
  team: GameTeam,
  oppBowlingStrength: number
): { totalRuns: number; wickets: number; performances: PlayerPerformance[] } {
  const captainId = team.captainId;
  const vcId = team.viceCaptainId;

  const performances: PlayerPerformance[] = [];
  let totalRuns = 0;
  let totalWickets = 0;

  for (const player of team.players) {
    const isCaptain = player.id === captainId;
    const isVC = player.id === vcId;

    // Batting
    const { runs, balls } = simulateBatterInnings(player, isCaptain, isVC, oppBowlingStrength);
    totalRuns += runs;
    if (runs === 0 && balls > 0) totalWickets++;

    // Fielding catches (random)
    const catches = Math.random() < 0.15 ? 1 : 0;

    performances.push({
      playerId: player.id,
      playerName: player.name,
      role: player.role,
      runs,
      ballsFaced: balls,
      wickets: 0,       // filled in bowling phase
      oversBowled: 0,
      runsConceded: 0,
      catches,
      strikeRate: balls > 0 ? parseFloat(((runs / balls) * 100).toFixed(1)) : 0,
      economy: 0,
    });
  }

  // Bowling — distribute overs among bowlers/all-rounders
  const oppBattingStrength = oppBowlingStrength; // reuse as batting proxy
  for (const player of team.players) {
    const perf = performances.find((p) => p.playerId === player.id)!;
    const isCaptain = player.id === captainId;
    const isVC = player.id === vcId;
    const { wickets, overs, runsConceded } = simulateBowlerInnings(
      player,
      isCaptain,
      isVC,
      oppBattingStrength
    );
    perf.wickets = wickets;
    perf.oversBowled = overs;
    perf.runsConceded = runsConceded;
    perf.economy = overs > 0 ? parseFloat((runsConceded / overs).toFixed(1)) : 0;
  }

  // Clamp realistic T20 scores
  const finalRuns = clamp(totalRuns, 80, 230);
  const finalWickets = clamp(totalWickets, 0, 10);

  return { totalRuns: finalRuns, wickets: finalWickets, performances };
}

// ─────────────────────────────────────────────────────────────
//  Team Strength Calculator
// ─────────────────────────────────────────────────────────────

function teamBowlingStrength(team: GameTeam): number {
  const bowlers = team.players.filter(
    (p) => p.role === 'Bowler' || p.role === 'All-rounder'
  );
  if (bowlers.length === 0) return 0.3;
  const avg = bowlers.reduce((s, p) => s + p.bowlingRating, 0) / bowlers.length;
  return avg / 99;
}

function teamBattingStrength(team: GameTeam): number {
  const batters = team.players.filter(
    (p) => p.role === 'Batter' || p.role === 'Wicketkeeper' || p.role === 'All-rounder'
  );
  if (batters.length === 0) return 0.3;
  const avg = batters.reduce((s, p) => s + p.battingRating, 0) / batters.length;
  return avg / 99;
}

// ─────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────

/** Simulate a single T20 match between two GameTeams. */
export function simulateMatch(team1: GameTeam, team2: GameTeam): MatchResult {
  const t1BowlingStr = teamBowlingStrength(team1);
  const t2BowlingStr = teamBowlingStrength(team2);

  const innings1 = simulateTeamInnings(team1, t2BowlingStr);
  const innings2 = simulateTeamInnings(team2, t1BowlingStr);

  const t1Score = innings1.totalRuns;
  const t2Score = innings2.totalRuns;

  let winnerId: string | null;
  let marginRuns = 0;
  let marginWickets = 0;

  if (t1Score > t2Score) {
    winnerId = team1.id;
    marginRuns = t1Score - t2Score;
  } else if (t2Score > t1Score) {
    winnerId = team2.id;
    marginWickets = 10 - innings2.wickets;
  } else {
    winnerId = null; // tie
  }

  return {
    matchId: uuidv4(),
    team1Id: team1.id,
    team2Id: team2.id,
    team1Score: t1Score,
    team1Wickets: innings1.wickets,
    team2Score: t2Score,
    team2Wickets: innings2.wickets,
    winnerId,
    team1Performances: innings1.performances,
    team2Performances: innings2.performances,
    marginRuns,
    marginWickets,
  };
}

/** Run a full round-robin league and return standings + simulation result. */
export function simulateLeague(teams: GameTeam[]): SimulationResult {
  const matches: MatchResult[] = [];
  const standingsMap = new Map<string, TeamStanding>();

  // Initialize standings
  for (const team of teams) {
    standingsMap.set(team.id, {
      teamId: team.id,
      iplTeamId: team.iplTeamId,
      managerName: team.managerName,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      nrr: 0,
      runsScored: 0,
      runsConceded: 0,
    });
  }

  // Round-robin
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const result = simulateMatch(teams[i], teams[j]);
      matches.push(result);

      const st1 = standingsMap.get(teams[i].id)!;
      const st2 = standingsMap.get(teams[j].id)!;

      st1.played++;
      st2.played++;
      st1.runsScored += result.team1Score;
      st1.runsConceded += result.team2Score;
      st2.runsScored += result.team2Score;
      st2.runsConceded += result.team1Score;

      if (result.winnerId === teams[i].id) {
        st1.won++;
        st1.points += 2;
        st2.lost++;
      } else if (result.winnerId === teams[j].id) {
        st2.won++;
        st2.points += 2;
        st1.lost++;
      } else {
        st1.tied++;
        st2.tied++;
        st1.points += 1;
        st2.points += 1;
      }
    }
  }

  // Calculate NRR
  for (const st of standingsMap.values()) {
    const oversPlayed = st.played * 20;
    st.nrr = oversPlayed > 0
      ? parseFloat(((st.runsScored - st.runsConceded) / oversPlayed).toFixed(3))
      : 0;
  }

  // Sort standings: points desc, nrr desc
  const standings = [...standingsMap.values()].sort((a, b) =>
    b.points !== a.points ? b.points - a.points : b.nrr - a.nrr
  );

  const winnerStanding = standings[0];
  const winner = teams.find((t) => t.id === winnerStanding.teamId)!;

  // MVP: player with most runs + most wickets combined score
  const mvp = findMVP(matches);

  return {
    matches,
    standings,
    winner,
    mvpPlayerId: mvp.playerId,
    mvpPlayerName: mvp.playerName,
  };
}

// ─────────────────────────────────────────────────────────────
//  MVP Calculation
// ─────────────────────────────────────────────────────────────

function findMVP(matches: MatchResult[]): { playerId: string; playerName: string } {
  const scoreMap = new Map<string, { name: string; score: number }>();

  for (const match of matches) {
    const allPerfs = [...match.team1Performances, ...match.team2Performances];
    for (const perf of allPerfs) {
      const existing = scoreMap.get(perf.playerId) ?? { name: perf.playerName, score: 0 };
      // Fantasy-style scoring: 1pt/run, 25pt/wicket, 10pt/catch
      existing.score += perf.runs + perf.wickets * 25 + perf.catches * 10;
      scoreMap.set(perf.playerId, existing);
    }
  }

  let mvpId = '';
  let mvpName = 'Unknown';
  let maxScore = -1;
  for (const [id, data] of scoreMap.entries()) {
    if (data.score > maxScore) {
      maxScore = data.score;
      mvpId = id;
      mvpName = data.name;
    }
  }

  return { playerId: mvpId, playerName: mvpName };
}
