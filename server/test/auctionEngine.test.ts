import assert from 'node:assert/strict';
import { test, describe, beforeEach, afterEach } from 'node:test';
import { Server } from 'socket.io';
import { createServer, Server as HttpServer } from 'http';
import { AuctionEngine } from '../src/engine/auctionEngine';
import { Room, GameTeam } from '../src/types';
import { PLAYERS } from '../src/data/players';

describe('AuctionEngine', () => {
  let httpServer: HttpServer;
  let io: Server;
  let engine: AuctionEngine;
  let sampleRoom: Room;

  beforeEach(() => {
    httpServer = createServer();
    io = new Server(httpServer);
    engine = new AuctionEngine(io);

    const team1: GameTeam = {
      id: 'team_1',
      iplTeamId: 'csk',
      managerName: 'Manager 1',
      purse: 1000,
      players: [],
      isAI: false,
      aiPersonality: null,
      isReady: true,
      isCaptainSet: false,
      captainId: null,
      viceCaptainId: null,
    };

    const team2: GameTeam = {
      id: 'team_2',
      iplTeamId: 'mi',
      managerName: 'Manager 2',
      purse: 1000,
      players: [],
      isAI: false,
      aiPersonality: null,
      isReady: true,
      isCaptainSet: false,
      captainId: null,
      viceCaptainId: null,
    };

    sampleRoom = {
      code: 'TEST01',
      hostId: 'team_1',
      teams: [team1, team2],
      status: 'lobby',
      settings: {
        startingPurse: 1000,
        auctionTimer: 10,
        playerPoolSize: 20,
        minSquadSize: 11,
        maxSquadSize: 15,
        aiDifficulty: 'medium',
      },
      currentAuction: null,
      playerPool: PLAYERS.slice(0, 20).map((p) => ({ ...p, isSold: false, soldTo: null, soldPrice: null })),
      createdAt: new Date(),
    };
  });

  afterEach(() => {
    if (sampleRoom) {
      (engine as any).clearTimer(sampleRoom.code);
    }
    if (io) {
      io.close();
    }
  });

  test('startAuction initializes auction state and shows first player', () => {
    engine.startAuction(sampleRoom);

    assert.equal(sampleRoom.status, 'auction');
    assert.notEqual(sampleRoom.currentAuction, null);
    assert.equal(sampleRoom.currentAuction?.isActive, true);
    assert.equal(sampleRoom.currentAuction?.currentPlayerIndex, 0);
    assert.equal(sampleRoom.currentAuction?.currentPlayer?.id, PLAYERS[0].id);
    assert.equal(sampleRoom.currentAuction?.currentBid, PLAYERS[0].basePrice);
  });

  test('placeBid validates bids correctly', () => {
    engine.startAuction(sampleRoom);
    const auction = sampleRoom.currentAuction!;
    const basePrice = auction.currentBid;

    // Lower or equal bid should fail
    const failLow = engine.placeBid(sampleRoom, 'team_1', basePrice);
    assert.equal(failLow.success, false);

    // Valid bid (base + increment) should succeed
    const validBidAmount = basePrice + 10;
    const res = engine.placeBid(sampleRoom, 'team_1', validBidAmount);
    assert.equal(res.success, true);
    assert.equal(auction.currentBid, validBidAmount);
    assert.equal(auction.currentBidderId, 'team_1');

    // Highest bidder cannot outbid themselves
    const selfBid = engine.placeBid(sampleRoom, 'team_1', validBidAmount + 10);
    assert.equal(selfBid.success, false);
    assert.match(selfBid.reason || '', /already the highest bidder/i);
  });

  test('soldPlayer updates team purse and squad', () => {
    engine.startAuction(sampleRoom);
    const playerToSell = sampleRoom.currentAuction!.currentPlayer!;
    const bidAmount = playerToSell.basePrice + 10;

    engine.placeBid(sampleRoom, 'team_1', bidAmount);
    engine.soldPlayer(sampleRoom);

    const team1 = sampleRoom.teams.find((t) => t.id === 'team_1')!;
    assert.equal(team1.purse, 1000 - bidAmount);
    assert.equal(team1.players.length, 1);
    assert.equal(team1.players[0].id, playerToSell.id);
    assert.equal(playerToSell.isSold, true);
    assert.equal(playerToSell.soldTo, 'team_1');
  });

  test('soldPlayer handles unsold player when no bids placed', () => {
    engine.startAuction(sampleRoom);
    const playerUnsold = sampleRoom.currentAuction!.currentPlayer!;

    engine.soldPlayer(sampleRoom);

    assert.equal(sampleRoom.currentAuction?.unsoldPlayers.length, 1);
    assert.equal(sampleRoom.currentAuction?.unsoldPlayers[0].id, playerUnsold.id);
  });

  test('calculateMinReserve accurately calculates reserve needed for remaining squad', () => {
    const team = sampleRoom.teams[0];
    // Min squad = 11, team has 0 players. Reserve needed for (11 - 0 - 1) = 10 players @ 25L each = 250L
    const reserve = engine.calculateMinReserve(team, sampleRoom);
    assert.equal(reserve, 250);
  });

  test('pauseAuction and resumeAuction alter pause state', () => {
    engine.startAuction(sampleRoom);
    engine.pauseAuction(sampleRoom);
    assert.equal(sampleRoom.currentAuction?.isPaused, true);

    engine.resumeAuction(sampleRoom);
    assert.equal(sampleRoom.currentAuction?.isPaused, false);
  });
});
