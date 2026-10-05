import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { simulateMatch, simulateLeague } from '../src/engine/t20Simulator';
import { GameTeam } from '../src/types';
import { PLAYERS } from '../src/data/players';

describe('t20Simulator', () => {
  const createTestTeam = (id: string, iplTeamId: string, name: string): GameTeam => ({
    id,
    iplTeamId,
    managerName: name,
    purse: 1000,
    players: PLAYERS.slice(0, 11).map((p) => ({ ...p, isSold: true, soldTo: id, soldPrice: 100 })),
    isAI: false,
    aiPersonality: null,
    isReady: true,
    isCaptainSet: true,
    captainId: PLAYERS[0].id,
    viceCaptainId: PLAYERS[1].id,
  });

  test('simulateMatch produces valid T20 match scores and performances', () => {
    const team1 = createTestTeam('t1', 'csk', 'CSK Manager');
    const team2 = createTestTeam('t2', 'mi', 'MI Manager');

    const result = simulateMatch(team1, team2);

    assert.equal(result.team1Id, 't1');
    assert.equal(result.team2Id, 't2');
    assert.ok(result.team1Score >= 80 && result.team1Score <= 230);
    assert.ok(result.team2Score >= 80 && result.team2Score <= 230);
    assert.ok(result.team1Wickets >= 0 && result.team1Wickets <= 10);
    assert.ok(result.team2Wickets >= 0 && result.team2Wickets <= 10);
    assert.equal(result.team1Performances.length, 11);
    assert.equal(result.team2Performances.length, 11);
  });

  test('simulateLeague runs full round-robin tournament and ranks standings', () => {
    const team1 = createTestTeam('t1', 'csk', 'CSK Manager');
    const team2 = createTestTeam('t2', 'mi', 'MI Manager');
    const team3 = createTestTeam('t3', 'rcb', 'RCB Manager');

    const league = simulateLeague([team1, team2, team3]);

    // 3 teams round-robin = (3 * 2) / 2 = 3 matches
    assert.equal(league.matches.length, 3);
    assert.equal(league.standings.length, 3);

    // Each team plays 2 matches
    for (const standing of league.standings) {
      assert.equal(standing.played, 2);
      assert.equal(standing.won + standing.lost + standing.tied, 2);
    }

    assert.ok(league.winner);
    assert.ok(league.mvpPlayerName);
  });
});
