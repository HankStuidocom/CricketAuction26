import 'dotenv/config';
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import { Room } from './types';
import { PLAYERS, getShuffledPlayerPool } from './data/players';
import { IPL_TEAMS } from './data/iplTeams';
import { AuctionEngine } from './engine/auctionEngine';
import { registerRoomHandlers, sanitizeRoom } from './socket/roomHandlers';
import { registerAuctionHandlers } from './socket/auctionHandlers';

// ─────────────────────────────────────────────────────────────
//  Config
// ─────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

// ─────────────────────────────────────────────────────────────
//  Express Setup
// ─────────────────────────────────────────────────────────────

const app = express();

app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);
app.use(express.json());

// ── Health check endpoint ────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'cricket-auction-26-server',
    timestamp: new Date().toISOString(),
    activeRooms: rooms.size,
  });
});

// ── Room info endpoint (debug/lobby listing) ─────────────────
app.get('/api/rooms', (_req: Request, res: Response) => {
  const roomList = [...rooms.values()].map((r) => ({
    code: r.code,
    status: r.status,
    teamCount: r.teams.length,
    createdAt: r.createdAt,
  }));
  res.json(roomList);
});

// ── Single Room info endpoint ─────────────────────────────────
app.get('/api/rooms/:code', (req: Request, res: Response) => {
  const code = (req.params.code || '').toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({ room: sanitizeRoom(room) });
});

// ── Room creation REST endpoint ───────────────────────────────
app.post('/api/rooms/create', (req: Request, res: Response) => {
  try {
    const { teamId, iplTeamId, managerName, settings } = req.body || {};
    const selectedIplTeamId = iplTeamId || teamId;
    const iplTeam = IPL_TEAMS.find((t) => t.id === selectedIplTeamId);
    if (!iplTeam) {
      return res.status(400).json({ error: 'Invalid IPL team' });
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    do {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (rooms.has(code));

    const defaultSettings = {
      startingPurse: 8000,
      auctionTimer: 15,
      playerPoolSize: 60,
      minSquadSize: 2,
      maxSquadSize: 10,
      aiDifficulty: 'medium' as const,
    };

    const mergedSettings = { ...defaultSettings, ...settings };

    const hostTeam = {
      id: `rest_${Date.now()}`,
      iplTeamId: selectedIplTeamId,
      managerName: managerName || 'Manager',
      purse: mergedSettings.startingPurse,
      players: [],
      isAI: false,
      aiPersonality: null,
      isReady: false,
      isCaptainSet: false,
      captainId: null,
      viceCaptainId: null,
    };

    const room: Room = {
      code,
      hostId: hostTeam.id,
      teams: [hostTeam],
      status: 'lobby',
      settings: mergedSettings,
      currentAuction: null,
      playerPool: getShuffledPlayerPool(mergedSettings.playerPoolSize),
      createdAt: new Date(),
    };

    rooms.set(code, room);
    res.json({ success: true, room: sanitizeRoom(room) });
  } catch (err) {
    res.status(500).json({ error: 'Internal error creating room' });
  }
});

// ── Players database endpoint ───────────────────────────────
app.get('/api/players', (_req: Request, res: Response) => {
  res.json(PLAYERS);
});

// ─────────────────────────────────────────────────────────────
//  HTTP + Socket.io Server
// ─────────────────────────────────────────────────────────────

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

// ─────────────────────────────────────────────────────────────
//  In-memory store
// ─────────────────────────────────────────────────────────────

const rooms = new Map<string, Room>();

// ─────────────────────────────────────────────────────────────
//  Auction Engine
// ─────────────────────────────────────────────────────────────

const auctionEngine = new AuctionEngine(io);

// ─────────────────────────────────────────────────────────────
//  Socket.io Connection Handler
// ─────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  registerRoomHandlers(io, socket, rooms);
  registerAuctionHandlers(io, socket, rooms, auctionEngine);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
  });

  socket.on('error', (err) => {
    console.error(`[Socket] Error on ${socket.id}:`, err);
  });
});

// ─────────────────────────────────────────────────────────────
//  Room cleanup: remove stale rooms older than 6 hours
// ─────────────────────────────────────────────────────────────

setInterval(() => {
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt.getTime() > SIX_HOURS) {
      rooms.delete(code);
      console.log(`[Cleanup] Removed stale room: ${code}`);
    }
  }
}, 60 * 60 * 1000); // run every hour

// ─────────────────────────────────────────────────────────────
//  Start
// ─────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`\n🏏  Cricket Auction 26 Server`);
  console.log(`    Listening on http://localhost:${PORT}`);
  console.log(`    Health: http://localhost:${PORT}/health`);
  console.log(`    Client origin: ${CLIENT_ORIGIN}\n`);
});

export { io, rooms };
