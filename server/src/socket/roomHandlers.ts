import { Server, Socket } from 'socket.io';
import db from '../database/db';
import { processBid, finalizeCurrent, advanceToNextPlayer, getNextValidBid } from '../services/auctionEngine';
import { processAIBids, initializeAITeams } from '../services/aiBidding';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Room, RoomParticipant } from '../types';

function buildFullRoomState(roomCode: string) {
  const normCode = (roomCode || '').trim().toUpperCase();
  const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normCode) as unknown as Room | undefined;
  if (!room) return null;

  const participants = db.prepare('SELECT * FROM room_participants WHERE room_id = ?').all(room.id) as unknown as RoomParticipant[];
  
  // Enrich participants with squad info
  const enrichedParticipants = participants.map(p => {
    const squad = db.prepare(`
      SELECT sp.*, pl.player_name, pl.primary_role, pl.status, pl.game_points, pl.base_price_lakhs
      FROM squad_players sp
      JOIN players pl ON pl.id = sp.player_id
      WHERE sp.room_id = ? AND sp.franchise_id = ?
    `).all(room.id, p.franchise_id);
    
    return {
      ...p,
      squad,
      squad_count: squad.length,
      total_points: squad.reduce((sum, s: any) => sum + (s.game_points || 0), 0)
    };
  });

  let currentPlayer = null;
  if (room.current_player_id) {
    currentPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(room.current_player_id);
  }

  const soldList = db.prepare(`
    SELECT sp.*, pl.player_name, pl.primary_role, pl.status, pl.game_points
    FROM squad_players sp
    JOIN players pl ON pl.id = sp.player_id
    WHERE sp.room_id = ?
    ORDER BY sp.sold_at DESC
  `).all(room.id);

  const activityFeed = db.prepare(`
    SELECT * FROM auction_events WHERE room_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(room.id);

  return {
    ...room,
    participants: enrichedParticipants,
    current_player: currentPlayer,
    sold_list: soldList,
    activity_feed: activityFeed
  };
}

function emitRoomState(io: Server, roomCode: string) {
  const normCode = (roomCode || '').trim().toUpperCase();
  const state = buildFullRoomState(normCode);
  if (state) {
    io.to(normCode).emit('room_state', state);
  }
}

function logEvent(roomId: string, type: string, payload: any) {
  db.prepare(`
    INSERT INTO auction_events (id, room_id, event_type, payload, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), roomId, type, JSON.stringify(payload), Date.now());
}

function scheduleAIBidding(io: Server, roomCode: string) {
  const normCode = (roomCode || '').trim().toUpperCase();
  const delay = 800 + Math.floor(Math.random() * 1000);
  setTimeout(() => {
    const room = db.prepare('SELECT status FROM rooms WHERE UPPER(room_code) = ?').get(normCode) as any;
    if (!room || room.status !== 'IN_PROGRESS') return;

    const placed = processAIBids(normCode, () => {
      emitRoomState(io, normCode);
    });

    if (placed) {
      scheduleAIBidding(io, normCode);
    }
  }, delay);
}

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    
    socket.on('join_room', (data) => {
      const { roomCode, userId, franchise, displayName, password } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return socket.emit('error', { message: 'Room not found' });

      // Check password for private rooms
      if (room.is_private && room.password_hash) {
        if (!password || !bcrypt.compareSync(password, room.password_hash)) {
          return socket.emit('error', { message: 'Invalid room password' });
        }
      }

      // Check if franchise is taken by another human user
      const existing = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND franchise_id = ?').get(room.id, franchise) as unknown as RoomParticipant | undefined;
      if (existing && existing.user_id !== userId && !existing.is_ai) {
        return socket.emit('error', { message: 'Franchise already taken' });
      }

      socket.join(normalizedCode);

      let participant = existing;

      // If not present, add them (or reclaim if AI)
      if (!participant) {
        try {
          // Check if room is full (non-AI participants)
          const humanCount = db.prepare('SELECT COUNT(*) as count FROM room_participants WHERE room_id = ? AND is_ai = 0').get(room.id) as { count: number };
          if (humanCount.count >= room.max_teams) {
            return socket.emit('error', { message: 'Room is full' });
          }

          const isHost = room.host_id === userId ? 1 : 0;
          db.prepare(`
            INSERT INTO room_participants (id, room_id, user_id, franchise_id, display_name, purse_remaining_lakhs, is_host, joined_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(crypto.randomUUID(), room.id, userId, franchise, displayName, room.starting_purse_lakhs, isHost, Date.now());
          
          participant = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND franchise_id = ?').get(room.id, franchise) as unknown as RoomParticipant;
        } catch (e) {
          return socket.emit('error', { message: 'Could not join team' });
        }
      } else if (participant.is_ai && userId) {
        // Reclaim AI slot
        db.prepare('UPDATE room_participants SET user_id = ?, is_ai = 0, ai_difficulty = NULL, display_name = ? WHERE id = ?')
          .run(userId, displayName, participant.id);
        participant = db.prepare('SELECT * FROM room_participants WHERE id = ?').get(participant.id) as unknown as RoomParticipant;
      }

      socket.emit('room_joined', { room, participant });
      emitRoomState(io, normalizedCode);
    });

    socket.on('start_auction', (data) => {
      const { roomCode, userId } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return socket.emit('error', { message: 'Room not found' });

      // Verify host (check by host_id on room or is_host on participant)
      const isHost = room.host_id === userId;
      const hostParticipant = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND (user_id = ? OR is_host = 1)').get(room.id, userId) as any;
      if (!isHost && (!hostParticipant || !hostParticipant.is_host)) {
        return socket.emit('error', { message: 'Only host can start auction' });
      }

      // Initialize AI teams if enabled
      if (room.ai_enabled) {
        initializeAITeams(room.id, normalizedCode, {
          ai_enabled: room.ai_enabled === 1,
          ai_difficulty: room.ai_difficulty,
          max_teams: room.max_teams,
          starting_purse_lakhs: room.starting_purse_lakhs
        });
      }

      db.prepare('UPDATE rooms SET status = "IN_PROGRESS", auction_started_at = ? WHERE id = ?').run(Date.now(), room.id);
      if (!room.current_player_id) {
        advanceToNextPlayer(room.id);
      }

      logEvent(room.id, 'started', { started_by: hostParticipant?.franchise_id || room.host_franchise });
      emitRoomState(io, normalizedCode);
      io.to(normalizedCode).emit('auction_started', { room: buildFullRoomState(normalizedCode) });

      // Start AI bidding check
      scheduleAIBidding(io, normalizedCode);
    });

    socket.on('place_bid', (data) => {
      const { roomCode, franchise, idempotencyKey, amount } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      try {
        const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as any;
        if (!room) throw new Error('Room not found');
        
        let bidAmount = amount;
        if (!bidAmount) {
          if (room.current_bid_lakhs === 0) {
            const player = db.prepare('SELECT base_price_lakhs FROM players WHERE id = ?').get(room.current_player_id) as any;
            bidAmount = player?.base_price_lakhs || 50;
          } else {
            bidAmount = getNextValidBid(room.current_bid_lakhs);
          }
        }

        const updatedRoom = processBid(normalizedCode, franchise, bidAmount, idempotencyKey);
        
        logEvent(updatedRoom.id, 'bid', { franchise, amount: bidAmount });
        emitRoomState(io, normalizedCode);

        // Schedule AI response
        scheduleAIBidding(io, normalizedCode);

      } catch (err: any) {
        socket.emit('bid_rejected', { reason: err.message });
      }
    });

    socket.on('host_pause', (data) => {
      const { roomCode, userId } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return;
      
      const isHost = room.host_id === userId;
      const hostParticipant = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?').get(room.id, userId) as any;
      if (!isHost && (!hostParticipant || !hostParticipant.is_host)) return socket.emit('error', { message: 'Only host can pause' });

      db.prepare('UPDATE rooms SET status = "PAUSED", bid_deadline = NULL WHERE id = ?').run(room.id);
      logEvent(room.id, 'paused', { by: hostParticipant?.franchise_id || room.host_franchise });
      emitRoomState(io, normalizedCode);
      io.to(normalizedCode).emit('auction_paused', {});
    });

    socket.on('host_resume', (data) => {
      const { roomCode, userId } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return;
      
      const isHost = room.host_id === userId;
      const hostParticipant = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?').get(room.id, userId) as any;
      if (!isHost && (!hostParticipant || !hostParticipant.is_host)) return socket.emit('error', { message: 'Only host can resume' });

      const newDeadline = room.is_unlimited_timer ? null : Date.now() + (room.bid_timer_seconds * 1000);
      db.prepare('UPDATE rooms SET status = "IN_PROGRESS", bid_deadline = ? WHERE id = ?').run(newDeadline, room.id);
      logEvent(room.id, 'resumed', { by: hostParticipant?.franchise_id || room.host_franchise });
      emitRoomState(io, normalizedCode);
      io.to(normalizedCode).emit('auction_resumed', { deadline: newDeadline });

      scheduleAIBidding(io, normalizedCode);
    });

    socket.on('host_skip', (data) => {
      const { roomCode, userId } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return;
      
      const isHost = room.host_id === userId;
      const hostParticipant = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?').get(room.id, userId) as any;
      if (!isHost && (!hostParticipant || !hostParticipant.is_host)) return socket.emit('error', { message: 'Only host can skip' });

      finalizeCurrent(room.id);
      advanceToNextPlayer(room.id);
      logEvent(room.id, 'skipped', { by: hostParticipant?.franchise_id || room.host_franchise });
      emitRoomState(io, normalizedCode);

      scheduleAIBidding(io, normalizedCode);
    });

    socket.on('host_mark_unsold', (data) => {
      const { roomCode, userId } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return;
      
      const isHost = room.host_id === userId;
      const hostParticipant = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?').get(room.id, userId) as any;
      if (!isHost && (!hostParticipant || !hostParticipant.is_host)) return socket.emit('error', { message: 'Only host can mark unsold' });

      db.prepare('UPDATE rooms SET current_bid_lakhs = 0, current_bidder_franchise = NULL WHERE id = ?').run(room.id);
      finalizeCurrent(room.id);
      advanceToNextPlayer(room.id);
      logEvent(room.id, 'unsold', { by: hostParticipant?.franchise_id || room.host_franchise });
      emitRoomState(io, normalizedCode);

      scheduleAIBidding(io, normalizedCode);
    });

    socket.on('send_chat', (data) => {
      const { roomCode, message, sender } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      io.to(normalizedCode).emit('chat_message', { sender, message, timestamp: Date.now() });
    });

    socket.on('leave_room', (data) => {
      const { roomCode, userId } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return;

      const participant = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?').get(room.id, userId) as unknown as RoomParticipant | undefined;
      if (participant && !participant.is_host) {
        if (room.ai_enabled) {
          db.prepare('UPDATE room_participants SET user_id = NULL, is_ai = 1, ai_difficulty = ? WHERE id = ?')
            .run(room.ai_difficulty, participant.id);
        } else {
          db.prepare('DELETE FROM room_participants WHERE id = ?').run(participant.id);
        }
        emitRoomState(io, normalizedCode);
      }
    });

    socket.on('disconnect', () => {
      // Cleaned up by socket.io
    });
  });

  // Global countdown timer check
  setInterval(() => {
    const rooms = db.prepare('SELECT * FROM rooms WHERE status = "IN_PROGRESS" AND bid_deadline IS NOT NULL AND bid_deadline <= ?').all(Date.now()) as unknown as Room[];
    for (const room of rooms) {
      finalizeCurrent(room.id);
      advanceToNextPlayer(room.id);
      logEvent(room.id, 'timer_expired', {});
      emitRoomState(io, room.room_code);
      
      const updatedRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room.id) as unknown as Room;
      if (updatedRoom && updatedRoom.status === 'COMPLETED') {
        logEvent(room.id, 'completed', {});
        io.to(room.room_code).emit('auction_completed', { message: 'Auction finished' });
      } else {
        // Trigger AI bids for the newly active player
        scheduleAIBidding(io, room.room_code);
      }
    }
  }, 500);
}