import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Room, GameTeam, RoomSettings, AIPersonality } from '../types';
import { getShuffledPlayerPool } from '../data/players';
import { IPL_TEAMS } from '../data/iplTeams';

// ─────────────────────────────────────────────────────────────
//  Default room settings
// ─────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: RoomSettings = {
  startingPurse: 900,
  auctionTimer: 15,
  playerPoolSize: 60,
  minSquadSize: 11,
  maxSquadSize: 15,
  aiDifficulty: 'medium',
};

const AI_PERSONALITIES: AIPersonality[] = [
  'Aggressive',
  'Balanced',
  'Budget',
  'BowlingSpecialist',
  'BattingSpecialist',
];

// ─────────────────────────────────────────────────────────────
//  Room handler registration
// ─────────────────────────────────────────────────────────────

export function registerRoomHandlers(
  io: Server,
  socket: Socket,
  rooms: Map<string, Room>
): void {
  // ── createRoom ──────────────────────────────────────────
  const broadcastRoomUpdate = (roomObj: Room) => {
    const sanitized = sanitizeRoom(roomObj);
    io.to(roomObj.code).emit('room:updated', sanitized);
    io.to(roomObj.code).emit('roomUpdated', sanitized);
  };

  // ── createRoom ──────────────────────────────────────────
  socket.on(
    'createRoom',
    (
      data: { iplTeamId?: string; teamId?: string; managerName?: string; settings?: Partial<RoomSettings> },
      callback?: (res: { success: boolean; code?: string; error?: string }) => void
    ) => {
      try {
        const targetIplTeamId = data.iplTeamId || data.teamId || '';
        const iplTeam = IPL_TEAMS.find((t) => t.id === targetIplTeamId);
        if (!iplTeam) {
          if (callback) callback({ success: false, error: 'Invalid IPL team' });
          socket.emit('error', { message: 'Invalid IPL team' });
          return;
        }

        const code = generateRoomCode(rooms);
        const settings: RoomSettings = { ...DEFAULT_SETTINGS, ...data.settings };

        const hostTeam: GameTeam = {
          id: socket.id,
          iplTeamId: targetIplTeamId,
          managerName: data.managerName || 'Manager',
          purse: settings.startingPurse,
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
          hostId: socket.id,
          teams: [hostTeam],
          status: 'lobby',
          settings,
          currentAuction: null,
          playerPool: getShuffledPlayerPool(settings.playerPoolSize),
          createdAt: new Date(),
        };

        rooms.set(code, room);
        socket.join(code);

        console.log(`[Room] Created: ${code} by ${socket.id}`);
        const sanitized = sanitizeRoom(room);
        if (callback) callback({ success: true, code });
        socket.emit('roomCreated', { room: sanitized, teamId: hostTeam.id });
        broadcastRoomUpdate(room);
      } catch (err) {
        if (callback) callback({ success: false, error: 'Internal error creating room' });
        socket.emit('error', { message: 'Internal error creating room' });
      }
    }
  );

  // ── joinRoom & syncRoom ───────────────────────────────────
  socket.on(
    'joinRoom',
    (
      data: { code?: string; roomCode?: string; iplTeamId?: string; teamId?: string; managerName?: string },
      callback?: (res: { success: boolean; room?: object; error?: string }) => void
    ) => {
      try {
        const rawCode = data.code || data.roomCode || '';
        const code = rawCode.toUpperCase();
        const targetIplTeamId = data.iplTeamId || data.teamId || '';

        const room = rooms.get(code);
        if (!room) {
          if (callback) callback({ success: false, error: 'Room not found' });
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        socket.join(code);

        // Check if player is re-syncing/joining an existing team slot (e.g. Host created via REST)
        let existingTeam = room.teams.find(
          (t) => t.id === socket.id || (data.teamId && t.id === data.teamId) || (targetIplTeamId && t.iplTeamId === targetIplTeamId && !t.isAI)
        );

        if (existingTeam) {
          const oldId = existingTeam.id;
          existingTeam.id = socket.id;
          if (data.managerName) existingTeam.managerName = data.managerName;
          if (room.hostId === oldId || room.hostId.startsWith('rest_') || room.teams[0]?.id === socket.id) {
            room.hostId = socket.id;
          }
          console.log(`[Room] ${socket.id} re-synced existing team ${existingTeam.iplTeamId} in ${code}`);
          const sanitized = sanitizeRoom(room);
          if (callback) callback({ success: true, room: sanitized });
          socket.emit('roomJoined', { room: sanitized, teamId: existingTeam.id });
          broadcastRoomUpdate(room);
          return;
        }

        if (room.status !== 'lobby') {
          if (callback) callback({ success: false, error: 'Auction already started' });
          socket.emit('error', { message: 'Auction already started' });
          return;
        }
        if (room.teams.length >= 10) {
          if (callback) callback({ success: false, error: 'Room is full (max 10 teams)' });
          socket.emit('error', { message: 'Room is full (max 10 teams)' });
          return;
        }

        // Prevent duplicate IPL team selection among OTHER teams
        if (room.teams.some((t) => t.iplTeamId === targetIplTeamId)) {
          if (callback) callback({ success: false, error: 'IPL team already taken' });
          socket.emit('error', { message: 'IPL team already taken' });
          return;
        }

        const iplTeam = IPL_TEAMS.find((t) => t.id === targetIplTeamId);
        if (!iplTeam) {
          if (callback) callback({ success: false, error: 'Invalid IPL team' });
          socket.emit('error', { message: 'Invalid IPL team' });
          return;
        }

        const newTeam: GameTeam = {
          id: socket.id,
          iplTeamId: targetIplTeamId,
          managerName: data.managerName || 'Manager',
          purse: room.settings.startingPurse,
          players: [],
          isAI: false,
          aiPersonality: null,
          isReady: false,
          isCaptainSet: false,
          captainId: null,
          viceCaptainId: null,
        };

        room.teams.push(newTeam);

        console.log(`[Room] ${socket.id} joined ${code}`);
        const sanitized = sanitizeRoom(room);
        if (callback) callback({ success: true, room: sanitized });
        socket.emit('roomJoined', { room: sanitized, teamId: newTeam.id });
        broadcastRoomUpdate(room);
      } catch (err) {
        if (callback) callback({ success: false, error: 'Internal error joining room' });
        socket.emit('error', { message: 'Internal error joining room' });
      }
    }
  );

  // ── addAITeam ───────────────────────────────────────────
  socket.on(
    'addAITeam',
    (
      data: { code?: string; roomCode?: string; iplTeamId?: string; teamId?: string; personality?: AIPersonality },
      callback?: (res: { success: boolean; error?: string }) => void
    ) => {
      try {
        const rawCode = data.code || data.roomCode || '';
        const code = rawCode.toUpperCase();
        const targetIplTeamId = data.iplTeamId || data.teamId || '';

        const room = rooms.get(code);
        if (!room) return callback?.({ success: false, error: 'Room not found' });
        if (room.hostId !== socket.id) return callback?.({ success: false, error: 'Host only' });
        if (room.status !== 'lobby') return callback?.({ success: false, error: 'Auction already started' });
        if (room.teams.length >= 10) return callback?.({ success: false, error: 'Room full' });

        if (room.teams.some((t) => t.iplTeamId === targetIplTeamId)) {
          return callback?.({ success: false, error: 'IPL team already taken' });
        }

        const personality =
          data.personality ?? AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)];

        const aiTeam: GameTeam = {
          id: `ai_${uuidv4()}`,
          iplTeamId: targetIplTeamId,
          managerName: `AI (${targetIplTeamId.toUpperCase()})`,
          purse: room.settings.startingPurse,
          players: [],
          isAI: true,
          aiPersonality: personality,
          isReady: true, // AI is always ready
          isCaptainSet: false,
          captainId: null,
          viceCaptainId: null,
        };

        room.teams.push(aiTeam);
        if (callback) callback({ success: true });
        broadcastRoomUpdate(room);
      } catch (err) {
        if (callback) callback({ success: false, error: 'Internal error' });
      }
    }
  );

  // ── updateTeam ──────────────────────────────────────────
  socket.on(
    'updateTeam',
    (
      data: { code?: string; roomCode?: string; managerName?: string; iplTeamId?: string; teamId?: string },
      callback?: (res: { success: boolean; error?: string }) => void
    ) => {
      try {
        const rawCode = data.code || data.roomCode || '';
        const code = rawCode.toUpperCase();
        const targetIplTeamId = data.iplTeamId || data.teamId;

        const room = rooms.get(code);
        if (!room) return callback?.({ success: false, error: 'Room not found' });

        const team = room.teams.find((t) => t.id === socket.id);
        if (!team) return callback?.({ success: false, error: 'Team not found' });

        if (data.managerName) team.managerName = data.managerName.slice(0, 30);
        if (targetIplTeamId) {
          if (room.teams.some((t) => t.id !== socket.id && t.iplTeamId === targetIplTeamId)) {
            return callback?.({ success: false, error: 'IPL team already taken' });
          }
          team.iplTeamId = targetIplTeamId;
        }

        if (callback) callback({ success: true });
        broadcastRoomUpdate(room);
      } catch (err) {
        if (callback) callback({ success: false, error: 'Internal error' });
      }
    }
  );

  // ── setReady ────────────────────────────────────────────
  socket.on(
    'setReady',
    (
      data: { code?: string; roomCode?: string; ready?: boolean; isReady?: boolean },
      callback?: (res: { success: boolean; error?: string }) => void
    ) => {
      try {
        const rawCode = data.code || data.roomCode || '';
        const code = rawCode.toUpperCase();
        const isReadyVal = data.ready ?? data.isReady ?? true;

        const room = rooms.get(code);
        if (!room) return callback?.({ success: false, error: 'Room not found' });

        const team = room.teams.find((t) => t.id === socket.id);
        if (!team) return callback?.({ success: false, error: 'Team not found' });

        team.isReady = isReadyVal;
        if (callback) callback({ success: true });
        broadcastRoomUpdate(room);
      } catch (err) {
        if (callback) callback({ success: false, error: 'Internal error' });
      }
    }
  );

  // ── getRoomState ────────────────────────────────────────
  socket.on(
    'getRoomState',
    (
      data: { code: string },
      callback: (res: { success: boolean; room?: object; error?: string }) => void
    ) => {
      const room = rooms.get(data.code);
      if (!room) return callback({ success: false, error: 'Room not found' });
      callback({ success: true, room: sanitizeRoom(room) });
    }
  );

  // ── updateSettings ──────────────────────────────────────
  socket.on(
    'updateSettings',
    (
      data: { code: string; settings: Partial<RoomSettings> },
      callback: (res: { success: boolean; error?: string }) => void
    ) => {
      try {
        const room = rooms.get(data.code);
        if (!room) return callback({ success: false, error: 'Room not found' });
        if (room.hostId !== socket.id) return callback({ success: false, error: 'Host only' });
        if (room.status !== 'lobby') return callback({ success: false, error: 'Cannot change settings after auction starts' });

        room.settings = { ...room.settings, ...data.settings };
        callback({ success: true });
        io.to(room.code).emit('room:updated', sanitizeRoom(room));
      } catch (err) {
        callback({ success: false, error: 'Internal error' });
      }
    }
  );

  // ── leaveRoom ───────────────────────────────────────────
  socket.on(
    'leaveRoom',
    (data: { code: string }, callback?: (res: { success: boolean }) => void) => {
      handleLeave(io, socket, rooms, data.code);
      if (callback) callback({ success: true });
    }
  );

  // ── Handle disconnects ──────────────────────────────────
  socket.on('disconnect', () => {
    // Find any room this socket is in and clean up
    for (const [code, room] of rooms.entries()) {
      if (room.teams.some((t) => t.id === socket.id)) {
        handleLeave(io, socket, rooms, code);
        break;
      }
    }
  });
}

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

function handleLeave(
  io: Server,
  socket: Socket,
  rooms: Map<string, Room>,
  code: string
): void {
  const room = rooms.get(code);
  if (!room) return;

  // If host leaves during lobby, dissolve the room
  if (socket.id === room.hostId && room.status === 'lobby') {
    rooms.delete(code);
    io.to(code).emit('room:dissolved', { reason: 'Host left' });
    return;
  }

  // Otherwise just remove the player's team
  room.teams = room.teams.filter((t) => t.id !== socket.id);
  socket.leave(code);

  // If host left during active auction, make another human host
  if (socket.id === room.hostId) {
    const newHost = room.teams.find((t) => !t.isAI);
    if (newHost) {
      room.hostId = newHost.id;
      io.to(code).emit('room:hostChanged', { newHostId: newHost.id });
    }
  }

  io.to(code).emit('room:updated', sanitizeRoom(room));
}

function generateRoomCode(rooms: Map<string, Room>): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code: string;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

/** Strip server-only internals before sending to clients. */
export function sanitizeRoom(room: Room): object {
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    settings: room.settings,
    teams: room.teams.map((t) => ({
      id: t.id,
      iplTeamId: t.iplTeamId,
      managerName: t.managerName,
      purse: t.purse,
      players: t.players,
      isAI: t.isAI,
      aiPersonality: t.aiPersonality,
      isReady: t.isReady,
      captainId: t.captainId,
      viceCaptainId: t.viceCaptainId,
    })),
    currentAuction: room.currentAuction
      ? {
          currentPlayer: room.currentAuction.currentPlayer,
          currentBid: room.currentAuction.currentBid,
          currentBidderId: room.currentAuction.currentBidderId,
          timerSeconds: room.currentAuction.timerSeconds,
          isActive: room.currentAuction.isActive,
          isPaused: room.currentAuction.isPaused,
          soldPlayers: room.currentAuction.soldPlayers,
          unsoldPlayers: room.currentAuction.unsoldPlayers,
        }
      : null,
    playerPool: room.playerPool.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      tier: p.tier,
      overallRating: p.overallRating,
      basePrice: p.basePrice,
      isSold: p.isSold,
      soldTo: p.soldTo,
      soldPrice: p.soldPrice,
    })),
  };
}
