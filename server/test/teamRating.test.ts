import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { calculateTeamRating, calculateSquadBalance, calculateBudgetEfficiency, calculateFinalScore } from '../src/engine/teamRating';
import { GameTeam, MatchResult } from '../src/types';
import { PLAYERS } from '../src/data/players';

describe('teamRating', () => {
  const sampleTeam: GameTeam = {
    id: 't1',
    iplTeamId: 'csk',
    managerName: 'CSK Manager',
    purse: 500,
    players: PLAYERS.slice(0, 11).map((p) => ({ ...p, isSold: true, soldTo: 't1', soldPrice: 100 })),
    isAI: false,
    aiPersonality: null,
    isReady: true,
    isCaptainSet: true,
    captainId: PLAYERS[0].id,
    viceCaptainId: PLAYERS[1].id,
  };

  test('calculateTeamRating calculates overall and sub-ratings within [0, 99]', () => {
    const rating = calculateTeamRating(sampleTeam);

    assert.equal(rating.teamId, 't1');
    assert.ok(rating.overall >= 0 && rating.overall <= 99);
    assert.ok(rating.batting >= 0 && rating.batting <= 99);
    assert.ok(rating.bowling >= 0 && rating.bowling <= 99);
    assert.ok(rating.fielding >= 0 && rating.fielding <= 99);
    assert.ok(rating.experience >= 0 && rating.experience <= 99);
    assert.ok(rating.balance >= 0 && rating.balance <= 99);
    assert.ok(rating.budgetEfficiency >= 0 && rating.budgetEfficiency <= 99);
  });

  test('calculateSquadBalance evaluates role distribution', () => {
    const balance = calculateSquadBalance(sampleTeam);
    assert.ok(balance >= 0 && balance <= 99);
  });

  test('calculateBudgetEfficiency evaluates money spent vs player ratings', () => {
    const efficiency = calculateBudgetEfficiency(sampleTeam);
    assert.ok(efficiency >= 0 && efficiency <= 99);
  });

  test('calculateFinalScore produces composite score using rating and match results', () => {
    const mockMatches: MatchResult[] = [
      {
        matchId: 'm1',
        team1Id: 't1',
        team2Id: 't2',
        team1Score: 180,
        team2Score: 160,
        team1Wickets: 4,
        team2Wickets: 8,
        winnerId: 't1',
        team1Performances: [],
        team2Performances: [],
        marginRuns: 20,
        marginWickets: 0,
      },
    ];

    const score = calculateFinalScore(sampleTeam, mockMatches);
    assert.ok(score >= 0 && score <= 99);
  });
});
