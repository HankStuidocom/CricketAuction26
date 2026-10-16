import { Server, Socket } from 'socket.io';
import db from '../database/db';
import { processBid, finalizeCurrent, advanceToNextPlayer, getNextValidBid, relistCurrent, relistUnsoldPlayer, deferCurrentPlayer, recordAuctionCompletion } from '../services/auctionEngine';
import { processAIBids, initializeAITeams } from '../services/aiBidding';
import { setPresenceIo, registerUserSocket, removeSocketId } from '../services/presence';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { Room, RoomParticipant } from '../types';

export function buildFullRoomState(roomCode: string) {
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

  const unsoldList = db.prepare(`
    SELECT aq.status, aq.player_id, pl.player_name, pl.primary_role, pl.status as player_status, pl.country, pl.game_points, pl.base_price_lakhs
    FROM auction_queue aq
    JOIN players pl ON pl.id = aq.player_id
    WHERE aq.room_id = ? AND aq.status = 'UNSOLD'
    ORDER BY aq.queue_position ASC
  `).all(room.id);

  const upcomingList = db.prepare(`
    SELECT aq.status, aq.player_id, aq.queue_position, pl.player_name, pl.primary_role, pl.status as player_status, pl.country, pl.game_points, pl.base_price_lakhs
    FROM auction_queue aq
    JOIN players pl ON pl.id = aq.player_id
    WHERE aq.room_id = ? AND aq.status IN ('PENDING', 'RELISTED')
    ORDER BY CASE aq.status WHEN 'PENDING' THEN 0 ELSE 1 END, aq.queue_position ASC
    LIMIT 25
  `).all(room.id);

  const activityFeed = db.prepare(`
    SELECT * FROM auction_events WHERE room_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(room.id);

  const queueSummary = db.prepare(`
    SELECT status, COUNT(*) as count FROM auction_queue WHERE room_id = ? GROUP BY status
  `).all(room.id);

  const announcements = db.prepare(`
    SELECT * FROM auction_events 
    WHERE room_id = ? AND event_type = 'announcement' 
    ORDER BY created_at DESC LIMIT 10
  `).all(room.id).map((ev: any) => {
    try {
      const parsed = JSON.parse(ev.payload);
      return {
        id: ev.id,
        message: parsed.message,
        sender: 'AUCTION COMMISSIONER',
        timestamp: ev.created_at
      };
    } catch {
      return null;
    }
  }).filter(Boolean);

  const sanitizedRoom = { ...room };
  delete (sanitizedRoom as any).password_hash;
  (sanitizedRoom as any).has_password = Boolean(room.password_hash);

  return {
    ...sanitizedRoom,
    participants: enrichedParticipants,
    current_player: currentPlayer,
    sold_list: soldList,
    unsold_list: unsoldList,
    upcoming_list: upcomingList,
    activity_feed: activityFeed,
    queue_summary: queueSummary,
    announcements: announcements
  };
}

export function emitRoomState(io: Server, roomCode: string) {
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
    if (!room || !['IN_PROGRESS', 'LIVE', 'FINAL_ROUND'].includes(room.status)) return;

    const placed = processAIBids(normCode, () => {
      emitRoomState(io, normCode);
    });

    if (placed) {
      scheduleAIBidding(io, normCode);
    }
  }, delay);
}

function checkHostAuthority(room: any, socket: Socket): boolean {
  const callerUserId = socket.data.userId;
  if (!callerUserId) return false;
  const isRegisteredHost = Boolean(db.prepare('SELECT id FROM users WHERE id = ?').get(room.host_id));
  if (isRegisteredHost) {
    return socket.data.authUserId === room.host_id;
  }
  if (room.host_id === callerUserId) {
    return Boolean(socket.data.isHost);
  }
  const hostParticipant = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?').get(room.id, callerUserId) as any;
  return Boolean(hostParticipant && hostParticipant.is_host && socket.data.isHost);
}

export function setupSocketHandlers(io: Server) {
  setPresenceIo(io);

  io.on('connection', (socket: Socket) => {
    // Authenticate token if present
    const handshakeToken = (socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', ''));
    if (handshakeToken) {
      try {
        const decoded = jwt.verify(handshakeToken, JWT_SECRET) as any;
        socket.data.authUserId = decoded.id;
        socket.data.authUsername = decoded.username;
        if (decoded.id) {
          registerUserSocket(decoded.id, socket.id);
        }
      } catch {}
    }
    
    socket.on('join_room', (data) => {
      const { roomCode, userId, franchise, displayName, password, isSpectator, isManager, hostToken } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      
      // 1. Room existence check
      if (!room) {
        return socket.emit('join_error', { 
          code: 'ROOM_NOT_FOUND', 
          message: 'Room not found. Check the room code and try again.' 
        });
      }

      // 2. Room cancelled check
      if (room.status === 'CANCELLED') {
        return socket.emit('join_error', { 
          code: 'ROOM_CANCELLED', 
          message: 'This auction room has been closed by the host.' 
        });
      }

      const isRegisteredHost = Boolean(db.prepare('SELECT id FROM users WHERE id = ?').get(room.host_id));
      let effectiveUserId = socket.data.authUserId || userId;

      // Impersonation protection: prevent unauthenticated clients from spoofing any registered user account
      if (userId) {
        const isRegisteredUser = Boolean(db.prepare('SELECT id FROM users WHERE id = ?').get(userId));
        if (isRegisteredUser && socket.data.authUserId !== userId) {
          return socket.emit('join_error', { 
            code: 'AUTH_REQUIRED', 
            message: 'Authentication required to access this user account' 
          });
        }
      }

      if (isRegisteredHost && (userId === room.host_id || effectiveUserId === room.host_id)) {
        if (socket.data.authUserId !== room.host_id) {
          return socket.emit('join_error', { 
            code: 'AUTH_REQUIRED', 
            message: 'Authentication required to access host role for this room' 
          });
        }
      }

      socket.data.userId = effectiveUserId;
      socket.data.roomCode = normalizedCode;
      if (effectiveUserId) {
        registerUserSocket(effectiveUserId, socket.id);
      }

      // 3. Reconnect check: Is this user ALREADY a registered participant in this room?
      const existingUserSlot = db.prepare(
        'SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?'
      ).get(room.id, effectiveUserId) as unknown as RoomParticipant | undefined;

      let isHostUser = room.host_id === effectiveUserId;
      if (isHostUser) {
        if (isRegisteredHost) {
          if (socket.data.authUserId !== room.host_id) {
            isHostUser = false;
          }
        } else {
          const providedToken = hostToken || socket.handshake.auth?.hostToken;
          let validHostToken = false;
          if (providedToken) {
            try {
              const decoded = jwt.verify(providedToken, JWT_SECRET) as any;
              if (decoded && decoded.isHost && (decoded.roomCode === normalizedCode || decoded.roomId === room.id)) {
                validHostToken = true;
              }
            } catch {
              validHostToken = false;
            }
          } else if (room.host_id === effectiveUserId) {
            validHostToken = true;
          }
          if (!validHostToken) {
            isHostUser = false;
          }
        }
      }
      if (isHostUser) {
        socket.data.isHost = true;
      }

      // RECONNECT CASE A: Commissioner reconnecting
      if (isHostUser && room.host_franchise === 'ADMIN') {
        socket.join(normalizedCode);
        socket.emit('join_handshake_success', {
          role: 'COMMISSIONER',
          roomCode: normalizedCode,
          franchise: 'ADMIN',
          participant: null,
          isManager: true,
          room
        });
        socket.emit('room_joined', { room, participant: null, isManager: true });
        emitRoomState(io, normalizedCode);
        return;
      }

      // RECONNECT CASE B: Existing franchise owner reconnecting after refresh or disconnect
      if (existingUserSlot) {
        socket.join(normalizedCode);
        socket.emit('join_handshake_success', {
          role: 'RECONNECT',
          roomCode: normalizedCode,
          franchise: existingUserSlot.franchise_id,
          participant: existingUserSlot,
          isManager: false,
          room
        });
        socket.emit('room_joined', { room, participant: existingUserSlot });
        emitRoomState(io, normalizedCode);
        return;
      }

      // 4. Private Room Password verification for ALL new joiners (spectators, managers, players)
      if (room.is_private && room.password_hash) {
        if (!password || !bcrypt.compareSync(password, room.password_hash)) {
          return socket.emit('join_error', { 
            code: 'INVALID_PASSWORD', 
            message: 'Private-room password is incorrect' 
          });
        }
      }

      // 5. Pure Spectator Join (verified against password)
      if (isSpectator) {
        socket.join(normalizedCode);
        socket.emit('join_handshake_success', {
          role: 'SPECTATOR',
          roomCode: normalizedCode,
          franchise: null,
          participant: null,
          isSpectator: true,
          room
        });
        const state = buildFullRoomState(normalizedCode);
        if (state) socket.emit('room_state', state);
        return;
      }

      // 6. Game Manager Join (for first time host)
      if (isManager && isHostUser && room.host_franchise === 'ADMIN') {
        socket.join(normalizedCode);
        socket.emit('join_handshake_success', {
          role: 'COMMISSIONER',
          roomCode: normalizedCode,
          franchise: 'ADMIN',
          participant: null,
          isManager: true,
          room
        });
        socket.emit('room_joined', { room, participant: null, isManager: true });
        emitRoomState(io, normalizedCode);
        return;
      }

      // 7. Check if Auction has already started
      const isAuctionStarted = room.status !== 'LOBBY';
      if (isAuctionStarted) {
        // Can they take over an AI franchise?
        const aiSlot = franchise 
          ? db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND franchise_id = ? AND is_ai = 1').get(room.id, franchise) as any
          : db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND is_ai = 1 LIMIT 1').get(room.id) as any;

        if (aiSlot) {
          // Player adopts AI franchise
          db.prepare('UPDATE room_participants SET user_id = ?, is_ai = 0, ai_difficulty = NULL, display_name = ? WHERE id = ?')
            .run(effectiveUserId, displayName || 'Player', aiSlot.id);
          const adoptedParticipant = db.prepare('SELECT * FROM room_participants WHERE id = ?').get(aiSlot.id) as unknown as RoomParticipant;
          
          socket.join(normalizedCode);
          socket.emit('join_handshake_success', {
            role: 'FRANCHISE_OWNER',
            roomCode: normalizedCode,
            franchise: adoptedParticipant.franchise_id,
            participant: adoptedParticipant,
            room
          });
          socket.emit('room_joined', { room, participant: adoptedParticipant });
          emitRoomState(io, normalizedCode);
          return;
        }

        // If no AI franchise can be taken over, join as Spectator with clear notification
        socket.join(normalizedCode);
        socket.emit('join_handshake_success', {
          role: 'SPECTATOR',
          roomCode: normalizedCode,
          franchise: null,
          participant: null,
          isSpectator: true,
          notice: 'Auction already started; joined as spectator',
          room
        });
        const state = buildFullRoomState(normalizedCode);
        if (state) socket.emit('room_state', state);
        return;
      }

      // 8. Auto-assign open franchise if requested franchise is taken by another human or not specified
      const allParticipants = db.prepare('SELECT * FROM room_participants WHERE room_id = ?').all(room.id) as any[];
      const takenByHuman = new Set(allParticipants.filter((p: any) => !p.is_ai && p.user_id !== effectiveUserId).map((p: any) => p.franchise_id));

      const humanCount = takenByHuman.size;
      if (humanCount >= room.max_teams) {
        return socket.emit('join_error', { 
          code: 'ROOM_FULL', 
          message: 'Room is full (max teams reached)' 
        });
      }

      const allFranchises = ['CSK', 'MI', 'KKR', 'RCB', 'DC', 'PBKS', 'RR', 'SRH', 'GT', 'LSG'];
      let assignedFranchise = franchise;

      // If requested franchise is taken by another human player or not provided:
      if (!assignedFranchise || takenByHuman.has(assignedFranchise) || assignedFranchise === 'ADMIN') {
        assignedFranchise = allFranchises.find(f => !takenByHuman.has(f));
      }

      if (!assignedFranchise) {
        return socket.emit('join_error', { 
          code: 'ROOM_FULL', 
          message: 'Room is full (no open franchise slots available)' 
        });
      }

      socket.join(normalizedCode);
      let participant: RoomParticipant | undefined;
      const targetSlot = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND franchise_id = ?').get(room.id, assignedFranchise) as any;
      const playerDisplayName = displayName || (socket.data.authUsername ? socket.data.authUsername : 'Player');

      if (targetSlot && targetSlot.is_ai) {
        // Player replaces AI bot
        db.prepare('UPDATE room_participants SET user_id = ?, is_ai = 0, ai_difficulty = NULL, display_name = ? WHERE id = ?')
          .run(effectiveUserId, playerDisplayName, targetSlot.id);
        participant = db.prepare('SELECT * FROM room_participants WHERE id = ?').get(targetSlot.id) as unknown as RoomParticipant;
      } else if (!targetSlot) {
        const isHost = isHostUser ? 1 : 0;
        db.prepare(`
          INSERT INTO room_participants (id, room_id, user_id, franchise_id, display_name, purse_remaining_lakhs, is_host, joined_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(crypto.randomUUID(), room.id, effectiveUserId, assignedFranchise, playerDisplayName, room.starting_purse_lakhs, isHost, Date.now());
        participant = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND franchise_id = ?').get(room.id, assignedFranchise) as unknown as RoomParticipant;
      } else {
        participant = targetSlot;
      }

      socket.emit('join_handshake_success', {
        role: 'FRANCHISE_OWNER',
        roomCode: normalizedCode,
        franchise: assignedFranchise,
        participant,
        room
      });
      socket.emit('room_joined', { room, participant });
      emitRoomState(io, normalizedCode);
      io.to(normalizedCode).emit('participant_joined', { participant });
      io.emit('rooms_updated', { roomCode: normalizedCode });
    });

    socket.on('spectate_room', (data) => {
      const { roomCode } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return socket.emit('error', { message: 'Room not found' });
      socket.join(normalizedCode);
      const state = buildFullRoomState(normalizedCode);
      if (state) {
        socket.emit('room_state', state);
      }
    });

    socket.on('start_auction', (data) => {
      const { roomCode } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return socket.emit('error', { message: 'Room not found' });

      if (!checkHostAuthority(room, socket)) {
        return socket.emit('error', { message: 'Only host or commissioner can start the auction' });
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

      db.prepare('UPDATE rooms SET status = "LIVE", auction_started_at = ? WHERE id = ?').run(Date.now(), room.id);
      if (!room.current_player_id) {
        advanceToNextPlayer(room.id);
      }

      logEvent(room.id, 'started', { started_by: room.host_franchise });
      emitRoomState(io, normalizedCode);
      io.to(normalizedCode).emit('auction_started', { room: buildFullRoomState(normalizedCode) });
      io.emit('rooms_updated', { roomCode: normalizedCode, status: 'LIVE' });

      // Start AI bidding check
      scheduleAIBidding(io, normalizedCode);
    });

    socket.on('place_bid', (data) => {
      const { roomCode, franchise, idempotencyKey, amount } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      try {
        const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as any;
        if (!room) throw new Error('Room not found');

        const callerUserId = socket.data.authUserId || socket.data.userId;

        // Fairness rule: Commissioner / Game Manager cannot participate in franchise bidding
        if (room.host_id === callerUserId && room.host_franchise === 'ADMIN') {
          throw new Error('Commissioner / Game Manager cannot participate in franchise bidding');
        }

        // Impersonation check: Caller must own this franchise
        const participant = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND franchise_id = ?').get(room.id, franchise) as any;
        if (!participant) {
          throw new Error(`Franchise ${franchise} not found in this room`);
        }
        if (participant.is_ai) {
          throw new Error('Cannot bid on behalf of an AI franchise');
        }
        if (callerUserId && participant.user_id && participant.user_id !== callerUserId) {
          throw new Error(`Unauthorized: You do not own franchise ${franchise}`);
        }
        
        let bidAmount = amount;
        if (!bidAmount) {
          if (room.current_bid_lakhs === 0) {
            const player = db.prepare('SELECT base_price_lakhs FROM players WHERE id = ?').get(room.current_player_id) as any;
            bidAmount = player?.base_price_lakhs || 50;
          } else {
            bidAmount = getNextValidBid(room.current_bid_lakhs);
          }
        }

        const updatedRoom = processBid(normalizedCode, franchise, bidAmount, idempotencyKey, callerUserId);
        
        logEvent(updatedRoom.id, 'bid', { franchise, amount: bidAmount });
        emitRoomState(io, normalizedCode);
        io.to(normalizedCode).emit('bid_accepted', {
          bidder: franchise,
          newBid: bidAmount,
          nextValidBid: getNextValidBid(bidAmount),
          deadline: updatedRoom.bid_deadline
        });

        // Schedule AI response
        scheduleAIBidding(io, normalizedCode);

      } catch (err: any) {
        socket.emit('bid_rejected', { reason: err.message });
      }
    });

    socket.on('host_pause', (data) => {
      const { roomCode } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return;
      
      if (!checkHostAuthority(room, socket)) return socket.emit('error', { message: 'Only host or commissioner can pause' });

      db.prepare('UPDATE rooms SET status = "PAUSED", bid_deadline = NULL WHERE id = ?').run(room.id);
      logEvent(room.id, 'paused', { by: room.host_franchise });
      emitRoomState(io, normalizedCode);
      io.to(normalizedCode).emit('auction_paused', {});
      io.emit('rooms_updated', { roomCode: normalizedCode, status: 'PAUSED' });
    });

    socket.on('host_resume', (data) => {
      const { roomCode } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return;
      
      if (!checkHostAuthority(room, socket)) return socket.emit('error', { message: 'Only host or commissioner can resume' });

      const pendingCount = db.prepare(`SELECT COUNT(*) as count FROM auction_queue WHERE room_id = ? AND status = 'PENDING'`).get(room.id) as { count: number };
      const resumeStatus = pendingCount.count === 0 ? 'FINAL_ROUND' : 'LIVE';
      const newDeadline = room.is_unlimited_timer ? null : Date.now() + (room.bid_timer_seconds * 1000);
      db.prepare('UPDATE rooms SET status = ?, bid_deadline = ? WHERE id = ?').run(resumeStatus, newDeadline, room.id);
      logEvent(room.id, 'resumed', { by: room.host_franchise, status: resumeStatus });
      emitRoomState(io, normalizedCode);
      io.to(normalizedCode).emit('auction_resumed', { deadline: newDeadline, status: resumeStatus });
      io.emit('rooms_updated', { roomCode: normalizedCode, status: resumeStatus });

      scheduleAIBidding(io, normalizedCode);
    });

    socket.on('host_skip', (data) => {
      const { roomCode } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return;
      
      if (!checkHostAuthority(room, socket)) return socket.emit('error', { message: 'Only host or commissioner can skip' });

      finalizeCurrent(room.id);
      advanceToNextPlayer(room.id);
      logEvent(room.id, 'skipped', { by: room.host_franchise });
      emitRoomState(io, normalizedCode);

      scheduleAIBidding(io, normalizedCode);
    });

    socket.on('host_defer_current', (data) => {
      const { roomCode } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return;
      
      if (!checkHostAuthority(room, socket)) return socket.emit('error', { message: 'Only host or commissioner can defer a card' });
      if (room.current_bidder_franchise) return socket.emit('error', { message: 'Cannot defer card while bids are active' });

      const deferred = deferCurrentPlayer(room.id, 5);
      if (!deferred) return socket.emit('error', { message: 'No active player to defer' });
      advanceToNextPlayer(room.id);
      logEvent(room.id, 'deferred', { by: room.host_franchise, player_id: room.current_player_id });
      emitRoomState(io, normalizedCode);
      scheduleAIBidding(io, normalizedCode);
    });

    socket.on('host_mark_unsold', (data) => {
      const { roomCode } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return;
      
      if (!checkHostAuthority(room, socket)) return socket.emit('error', { message: 'Only host or commissioner can mark unsold' });

      db.prepare('UPDATE rooms SET current_bid_lakhs = 0, current_bidder_franchise = NULL WHERE id = ?').run(room.id);
      finalizeCurrent(room.id);
      advanceToNextPlayer(room.id);
      logEvent(room.id, 'unsold', { by: room.host_franchise });
      emitRoomState(io, normalizedCode);

      scheduleAIBidding(io, normalizedCode);
    });

    socket.on('host_relist_current', (data) => {
      const { roomCode } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return;
      if (!checkHostAuthority(room, socket)) return socket.emit('error', { message: 'Only the host or commissioner can relist a player' });
      if (room.current_bidder_franchise) return socket.emit('error', { message: 'A player with an active bid cannot be relisted' });

      const relisted = relistCurrent(room.id);
      if (!relisted) return socket.emit('error', { message: 'No active player to relist' });
      advanceToNextPlayer(room.id);
      logEvent(room.id, 'relisted', { by: room.host_franchise, player_id: room.current_player_id });
      emitRoomState(io, normalizedCode);
      scheduleAIBidding(io, normalizedCode);
    });

    socket.on('host_relist_unsold_player', (data) => {
      const { roomCode, playerId } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return;
      if (!checkHostAuthority(room, socket)) return socket.emit('error', { message: 'Only the host or commissioner can relist a player' });

      const ok = relistUnsoldPlayer(room.id, playerId);
      if (!ok) return socket.emit('error', { message: 'Could not relist player from unsold pile' });
      logEvent(room.id, 'unsold_relisted', { by: room.host_franchise, player_id: playerId });
      emitRoomState(io, normalizedCode);
    });

    socket.on('host_announcement', (data) => {
      const { roomCode, message } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return;
      if (!checkHostAuthority(room, socket)) return socket.emit('error', { message: 'Only the host or commissioner can broadcast announcements' });

      const cleanMsg = (message || '').trim();
      if (!cleanMsg) return;

      io.to(normalizedCode).emit('commissioner_announcement', {
        id: crypto.randomUUID(),
        message: cleanMsg,
        sender: 'AUCTION COMMISSIONER',
        timestamp: Date.now()
      });
      logEvent(room.id, 'announcement', { message: cleanMsg });
    });

    socket.on('host_kick_player', (data) => {
      const { roomCode, targetUserId } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return;
      if (!checkHostAuthority(room, socket)) return socket.emit('error', { message: 'Only the host or commissioner can manage teams' });

      const participant = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?').get(room.id, targetUserId) as unknown as RoomParticipant | undefined;
      if (!participant || participant.is_host) return socket.emit('error', { message: 'That player cannot be removed' });

      // Preserve a squad already won by the player and hand the team to the AI.
      db.prepare(`UPDATE room_participants SET user_id = ?, is_ai = 1, ai_difficulty = ?, display_name = ? WHERE id = ?`)
        .run(`ai-${participant.franchise_id.toLowerCase()}`, room.ai_difficulty || 'MEDIUM', `Arena Bot (${participant.franchise_id})`, participant.id);
      
      // Notify target socket(s) and remove from room channel
      for (const [id, s] of io.of('/').sockets) {
        if (s.data.userId === targetUserId && s.rooms.has(normalizedCode)) {
          s.emit('kicked_from_room', {
            message: `You were removed from franchise ${participant.franchise_id} by the commissioner.`
          });
          s.leave(normalizedCode);
        }
      }

      logEvent(room.id, 'player_kicked', { franchise: participant.franchise_id, targetUserId });
      emitRoomState(io, normalizedCode);
      scheduleAIBidding(io, normalizedCode);
    });

    socket.on('host_update_settings', (data) => {
      const { roomCode, bidTimerSeconds, isUnlimitedTimer } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return;
      if (!checkHostAuthority(room, socket)) return socket.emit('error', { message: 'Only the host or commissioner can change auction settings' });

      const timer = Number(bidTimerSeconds);
      if (!Number.isInteger(timer) || timer < 5 || timer > 120) {
        return socket.emit('error', { message: 'Bid timer must be between 5 and 120 seconds' });
      }
      const unlimited = isUnlimitedTimer ? 1 : 0;
      const isActiveStatus = ['IN_PROGRESS', 'LIVE', 'FINAL_ROUND'].includes(room.status);
      const deadline = unlimited || !isActiveStatus ? null : Date.now() + timer * 1000;
      db.prepare('UPDATE rooms SET bid_timer_seconds = ?, is_unlimited_timer = ?, bid_deadline = ? WHERE id = ?')
        .run(timer, unlimited, deadline, room.id);
      logEvent(room.id, 'settings_updated', { bid_timer_seconds: timer, unlimited: Boolean(unlimited) });
      emitRoomState(io, normalizedCode);
    });

    socket.on('host_end_auction', (data) => {
      const { roomCode, activeCardResolution } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return;
      if (!checkHostAuthority(room, socket)) return socket.emit('error', { message: 'Only host or commissioner can end the auction' });

      // Settle active lot if one exists
      if (room.current_player_id) {
        if (activeCardResolution === 'sell') {
          if (room.current_bidder_franchise && room.current_bid_lakhs > 0) {
            finalizeCurrent(room.id);
          } else {
            db.prepare(`UPDATE auction_queue SET status = 'UNSOLD' WHERE room_id = ? AND player_id = ?`)
              .run(room.id, room.current_player_id);
          }
        } else if (activeCardResolution === 'unsold') {
          db.prepare(`UPDATE auction_queue SET status = 'UNSOLD' WHERE room_id = ? AND player_id = ?`)
            .run(room.id, room.current_player_id);
        } else if (activeCardResolution === 'cancel') {
          db.prepare(`UPDATE auction_queue SET status = 'CANCELLED' WHERE room_id = ? AND player_id = ?`)
            .run(room.id, room.current_player_id);
        }
      }

      db.prepare('UPDATE rooms SET status = "COMPLETED", bid_deadline = NULL, current_player_id = NULL, current_bid_lakhs = 0, current_bidder_franchise = NULL, completed_at = ? WHERE id = ?')
        .run(Date.now(), room.id);
      recordAuctionCompletion(room.id);
      logEvent(room.id, 'auction_ended_by_host', { by: socket.data.userId, resolution: activeCardResolution });
      emitRoomState(io, normalizedCode);
      io.to(normalizedCode).emit('auction_completed', { message: 'Auction concluded by Commissioner' });
      io.emit('rooms_updated', { roomCode: normalizedCode, status: 'COMPLETED' });
    });

    socket.on('host_cancel_room', (data) => {
      const { roomCode } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return;
      if (!checkHostAuthority(room, socket)) return socket.emit('error', { message: 'Only host or commissioner can cancel the room' });

      db.prepare('UPDATE rooms SET status = ?, bid_deadline = NULL WHERE id = ?').run('CANCELLED', room.id);
      logEvent(room.id, 'room_cancelled', { by: socket.data.userId });
      emitRoomState(io, normalizedCode);
      io.to(normalizedCode).emit('room_cancelled', { message: 'Room has been cancelled by host' });
      io.emit('rooms_updated', { roomCode: normalizedCode, status: 'CANCELLED' });
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
        io.emit('rooms_updated', { roomCode: normalizedCode });
      }
    });

    // Allow players to switch or claim franchise slot during LOBBY phase
    socket.on('switch_franchise', (data) => {
      const { roomCode, userId, newFranchise, displayName } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return socket.emit('error', { message: 'Room not found' });

      // Only allow switching in LOBBY state
      if (room.status !== 'LOBBY') {
        return socket.emit('error', { message: 'Cannot switch teams after auction starts' });
      }

      const effectiveUserId = socket.data.userId || userId;
      const isHost = room.host_id === effectiveUserId;

      if (newFranchise === 'ADMIN') {
        if (!isHost) return socket.emit('error', { message: 'Only the host can become Game Manager' });
        // Remove host from participants table if they held a team slot
        const currentSlot = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?').get(room.id, effectiveUserId) as any;
        if (currentSlot) {
          db.prepare('DELETE FROM room_participants WHERE id = ?').run(currentSlot.id);
        }
        db.prepare('UPDATE rooms SET host_franchise = "ADMIN" WHERE id = ?').run(room.id);
        logEvent(room.id, 'franchise_switched', { userId: effectiveUserId, from: currentSlot?.franchise_id || 'UNKNOWN', to: 'ADMIN' });
        emitRoomState(io, normalizedCode);
        io.to(normalizedCode).emit('participant_joined', {});
        io.emit('rooms_updated', { roomCode: normalizedCode });
        return socket.emit('franchise_switched', { newFranchise: 'ADMIN', participant: null });
      }

      // Check if target franchise is already taken by another human
      const targetSlot = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND franchise_id = ?').get(room.id, newFranchise) as unknown as RoomParticipant | undefined;
      if (targetSlot && targetSlot.user_id !== effectiveUserId && !targetSlot.is_ai) {
        return socket.emit('error', { message: `${newFranchise} is already taken by another player` });
      }

      // Find the user's current slot
      const mySlot = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?').get(room.id, effectiveUserId) as unknown as RoomParticipant | undefined;
      
      // If user doesn't have a slot yet (claim team slot directly):
      if (!mySlot) {
        // If target slot is an AI slot, replace that AI slot
        if (targetSlot && targetSlot.is_ai) {
          db.prepare('DELETE FROM room_participants WHERE id = ?').run(targetSlot.id);
        }
        const user = db.prepare('SELECT display_name FROM users WHERE id = ?').get(effectiveUserId) as any;
        const playerDisplayName = user?.display_name || displayName || 'Player';
        db.prepare(`
          INSERT INTO room_participants (id, room_id, user_id, franchise_id, display_name, purse_remaining_lakhs, is_host, joined_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(crypto.randomUUID(), room.id, effectiveUserId, newFranchise, playerDisplayName, room.starting_purse_lakhs, isHost ? 1 : 0, Date.now());
        if (isHost) {
          db.prepare('UPDATE rooms SET host_franchise = ? WHERE id = ?').run(newFranchise, room.id);
        }
        logEvent(room.id, 'franchise_claimed', { userId: effectiveUserId, franchise: newFranchise });
        emitRoomState(io, normalizedCode);
        io.to(normalizedCode).emit('participant_joined', {});
        io.emit('rooms_updated', { roomCode: normalizedCode });
        const newPart = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?').get(room.id, effectiveUserId);
        return socket.emit('franchise_switched', { newFranchise, participant: newPart });
      }

      // If target slot is an AI slot, remove that AI slot first
      if (targetSlot && targetSlot.is_ai) {
        db.prepare('DELETE FROM room_participants WHERE id = ?').run(targetSlot.id);
      }

      // Update the user's current slot to the new franchise
      db.prepare('UPDATE room_participants SET franchise_id = ? WHERE id = ?').run(newFranchise, mySlot.id);
      if (isHost) {
        db.prepare('UPDATE rooms SET host_franchise = ? WHERE id = ?').run(newFranchise, room.id);
      }

      logEvent(room.id, 'franchise_switched', { userId: effectiveUserId, from: mySlot.franchise_id, to: newFranchise });
      emitRoomState(io, normalizedCode);
      io.to(normalizedCode).emit('participant_joined', {});
      io.emit('rooms_updated', { roomCode: normalizedCode });
      
      // Send the updated participant back to the switcher
      const updatedParticipant = db.prepare('SELECT * FROM room_participants WHERE id = ?').get(mySlot.id);
      socket.emit('franchise_switched', { newFranchise, participant: updatedParticipant });
    });

    // Host action: Fill remaining empty slots with AI bots
    socket.on('host_fill_ai', (data) => {
      const { roomCode } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as any;
      if (!room) return socket.emit('error', { message: 'Room not found' });
      if (!checkHostAuthority(room, socket)) {
        return socket.emit('error', { message: 'Only host or commissioner can fill AI bots' });
      }
      if (room.status !== 'LOBBY') {
        return socket.emit('error', { message: 'Can only fill AI bots in the lobby' });
      }

      const allFranchises = ['CSK', 'MI', 'KKR', 'RCB', 'DC', 'PBKS', 'RR', 'SRH', 'GT', 'LSG'];
      const participants = db.prepare('SELECT * FROM room_participants WHERE room_id = ?').all(room.id) as any[];
      const takenFranchises = new Set(participants.map((p: any) => p.franchise_id));

      let filled = 0;
      for (const fId of allFranchises) {
        if (participants.length + filled >= (room.max_teams || 10)) break;
        if (!takenFranchises.has(fId)) {
          db.prepare(`
            INSERT INTO room_participants (id, room_id, user_id, franchise_id, display_name, purse_remaining_lakhs, is_host, is_ai, ai_difficulty, joined_at)
            VALUES (?, ?, NULL, ?, ?, ?, 0, 1, 'MEDIUM', ?)
          `).run(crypto.randomUUID(), room.id, fId, `${fId} Bot`, room.starting_purse_lakhs, Date.now());
          filled++;
        }
      }

      db.prepare('UPDATE rooms SET ai_enabled = 1 WHERE id = ?').run(room.id);
      logEvent(room.id, 'filled_ai', { filledCount: filled });
      emitRoomState(io, normalizedCode);
      io.to(normalizedCode).emit('participant_joined', {});
      io.emit('rooms_updated', { roomCode: normalizedCode });
    });

    // Host action: Clear all AI bots to reopen slots for human players
    socket.on('host_clear_ai', (data) => {
      const { roomCode } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as any;
      if (!room) return socket.emit('error', { message: 'Room not found' });
      if (!checkHostAuthority(room, socket)) {
        return socket.emit('error', { message: 'Only host or commissioner can clear AI bots' });
      }
      if (room.status !== 'LOBBY') {
        return socket.emit('error', { message: 'Can only clear AI bots in the lobby' });
      }

      db.prepare('DELETE FROM room_participants WHERE room_id = ? AND is_ai = 1').run(room.id);
      db.prepare('UPDATE rooms SET ai_enabled = 0 WHERE id = ?').run(room.id);
      logEvent(room.id, 'cleared_ai', {});
      emitRoomState(io, normalizedCode);
      io.to(normalizedCode).emit('participant_joined', {});
      io.emit('rooms_updated', { roomCode: normalizedCode });
    });

    socket.on('disconnect', () => {
      removeSocketId(socket.id);
    });
  });

  // Global countdown timer check
  setInterval(() => {
    const rooms = db.prepare('SELECT * FROM rooms WHERE status IN (\'IN_PROGRESS\', \'LIVE\', \'FINAL_ROUND\') AND bid_deadline IS NOT NULL AND bid_deadline <= ?').all(Date.now()) as unknown as Room[];
    for (const room of rooms) {
      finalizeCurrent(room.id);
      advanceToNextPlayer(room.id);
      logEvent(room.id, 'timer_expired', {});
      emitRoomState(io, room.room_code);
      
      const updatedRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room.id) as unknown as Room;
      if (updatedRoom && updatedRoom.status === 'COMPLETED') {
        logEvent(room.id, 'completed', {});
        io.to(room.room_code).emit('auction_completed', { message: 'Auction finished' });
        io.emit('rooms_updated', { roomCode: room.room_code, status: 'COMPLETED' });
      } else {
        // Trigger AI bids for the newly active player
        scheduleAIBidding(io, room.room_code);
      }
    }
  }, 500);
}
