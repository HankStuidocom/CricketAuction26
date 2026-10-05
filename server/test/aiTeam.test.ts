import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { getAIBid } from '../src/ai/aiTeam';
import { GameTeam, Room, Player } from '../src/types';
import { PLAYERS } from '../src/data/players';

describe('aiTeam', () => {
  const room: Room = {
    code: 'AIR01',
    hostId: 'human_1',
    teams: [],
    status: 'auction',
    settings: {
      startingPurse: 1000,
      auctionTimer: 10,
      playerPoolSize: 60,
      minSquadSize: 11,
      maxSquadSize: 15,
      aiDifficulty: 'medium',
    },
    currentAuction: null,
    playerPool: PLAYERS,
    createdAt: new Date(),
  };

  const aiTeam: GameTeam = {
    id: 'ai_1',
    iplTeamId: 'csk',
    managerName: 'AI CSK',
    purse: 1000,
    players: [],
    isAI: true,
    aiPersonality: 'Aggressive',
    isReady: true,
    isCaptainSet: false,
    captainId: null,
    viceCaptainId: null,
  };

  test('getAIBid returns a bid amount or null', async () => {
    const player: Player = PLAYERS[0];
    const bid = await getAIBid(room, aiTeam, player.basePrice, player);
    if (bid !== null) {
      assert.ok(bid >= player.basePrice + 10);
      assert.ok(bid <= aiTeam.purse);
    }
  });

  test('getAIBid returns null if AI cannot afford bid', async () => {
    const poorAiTeam: GameTeam = { ...aiTeam, purse: 50 };
    const expensivePlayer: Player = PLAYERS[0]; // Base price 200
    const bid = await getAIBid(room, poorAiTeam, 200, expensivePlayer);
    assert.equal(bid, null);
  });
});
