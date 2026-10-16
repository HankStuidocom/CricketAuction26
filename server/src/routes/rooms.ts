import { Router } from 'express';
import db from '../database/db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { advanceToNextPlayer } from '../services/auctionEngine';
import { emitRoomState, buildFullRoomState } from '../socket/roomHandlers';
import { touchActivity } from '../services/roomCleanup';
import { Room } from '../types';

const router = Router();

function enrichRoom(room: any) {
  // 1. Participant count & details
  const participants = db.prepare('SELECT * FROM room_participants WHERE room_id = ?').all(room.id) as any[];
  const teamsCount = participants.length;

  // 2. Host info & purse
  const host = db.prepare('SELECT * FROM users WHERE id = ?').get(room.host_id) as any;
  const hostParticipant = participants.find((p: any) => p.is_host === 1 || p.user_id === room.host_id);
  const remainingPurseLakhs = hostParticipant ? hostParticipant.purse_remaining_lakhs : room.starting_purse_lakhs;

  // 3. Highest bid in auction
  const maxBidRecord = db.prepare('SELECT MAX(amount_lakhs) as max_bid FROM bids WHERE room_id = ?').get(room.id) as any;
  const highestBidLakhs = Math.max(room.current_bid_lakhs || 0, maxBidRecord?.max_bid || 0);

  // 4. Team points & Leaderboard
  const teamStats = participants.map((p: any) => {
    const pointsRow = db.prepare(`
      SELECT COALESCE(SUM(pl.game_points), 0) as pts
      FROM squad_players sp
      JOIN players pl ON pl.id = sp.player_id
      WHERE sp.room_id = ? AND sp.franchise_id = ?
    `).get(room.id, p.franchise_id) as any;
    return {
      franchise_id: p.franchise_id,
      display_name: p.display_name,
      points: pointsRow?.pts || 0,
      purse_remaining_lakhs: p.purse_remaining_lakhs
    };
  });

  // Sort by points descending
  teamStats.sort((a: any, b: any) => b.points - a.points);
  const leadingTeam = teamStats[0] || { franchise_id: room.host_franchise || 'CSK', points: 0 };
  const runnerUpTeam = teamStats[1] || (teamStats.length > 0 ? null : { franchise_id: 'GT', points: 0 });

  const sanitizedRoom: any = { ...room };
  delete sanitizedRoom.password_hash;
  sanitizedRoom.has_password = Boolean(room.password_hash);
  sanitizedRoom.is_private = Boolean(room.is_private);

  return {
    ...sanitizedRoom,
    teams_count: teamsCount,
    host_user: host ? {
      username: host.username,
      display_name: host.display_name,
      avatar_emoji: host.avatar_emoji
    } : null,
    host_purse_lakhs: remainingPurseLakhs,
    highest_bid_lakhs: highestBidLakhs,
    leading_team: leadingTeam,
    runner_up_team: runnerUpTeam,
    team_leaderboard: teamStats
  };
}

// List public rooms (with optional live filter and full leaderboard/purse enrichment)
router.get('/', (req, res) => {
  try {
    const liveOnly = req.query.live === 'true' || req.query.status === 'LIVE' || req.query.status === 'IN_PROGRESS';
    const statusParam = req.query.status as string | undefined;

    let query = `
      SELECT * FROM rooms 
      WHERE is_private = 0 
        AND room_code NOT LIKE 'TEST%'
        AND room_code NOT LIKE 'ID%'
        AND room_code NOT LIKE 'PR%'
        AND room_code NOT LIKE 'SMK%'
    `;
    if (liveOnly) {
      query += ` AND status IN ('IN_PROGRESS', 'LIVE', 'FINAL_ROUND', 'PAUSED')`;
    } else if (statusParam && statusParam !== 'ALL') {
      const sanitized = statusParam.replace(/[^A-Z_]/g, '');
      query += ` AND status = '${sanitized}'`;
    } else {
      query += ` AND status IN ('LOBBY', 'IN_PROGRESS', 'LIVE', 'FINAL_ROUND', 'PAUSED', 'COMPLETED')`;
    }
    query += ' ORDER BY created_at DESC LIMIT 50';
    const rooms = db.prepare(query).all() as any[];

    const enrichedRooms = rooms.map(enrichRoom);
    res.json(enrichedRooms);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List signed-in player's private rooms (hosted, joined, or invited)
router.get('/my/private', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authentication required' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const userId = payload.id || payload.hostId;
    if (!userId) return res.status(401).json({ error: 'Invalid token' });

    const rooms = db.prepare(`
      SELECT DISTINCT r.* FROM rooms r
      LEFT JOIN room_participants rp ON rp.room_id = r.id AND rp.user_id = ?
      LEFT JOIN room_invites ri ON ri.room_id = r.id AND ri.receiver_id = ?
      WHERE r.is_private = 1 
        AND r.status != 'CANCELLED'
        AND (r.host_id = ? OR rp.user_id IS NOT NULL OR ri.receiver_id IS NOT NULL)
        AND r.room_code NOT LIKE 'TEST%'
        AND r.room_code NOT LIKE 'ID%'
        AND r.room_code NOT LIKE 'PR%'
        AND r.room_code NOT LIKE 'SMK%'
      ORDER BY r.created_at DESC LIMIT 50
    `).all(userId, userId, userId) as any[];

    const enriched = rooms.map(enrichRoom);
    res.json(enriched);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Create room
router.post('/', (req, res) => {
  const { roomConfig, hostFranchise, hostDisplayName, hostId } = req.body;
  try {
    let effectiveHostId = (hostId || '').trim();
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as any;
        if (decoded && decoded.id) {
          effectiveHostId = decoded.id;
        }
      } catch {}
    }
    if (!effectiveHostId) {
      effectiveHostId = 'guest-' + Math.random().toString(36).substring(2, 10);
    }

    const idempotencyKey = (req.body.idempotency_key || req.body.idempotencyKey || '').trim();
    if (idempotencyKey) {
      const existing = db.prepare('SELECT * FROM rooms WHERE idempotency_key = ?').get(idempotencyKey) as any;
      if (existing) {
        const hostToken = jwt.sign(
          { hostId: existing.host_id || effectiveHostId, roomId: existing.id, roomCode: existing.room_code, isHost: true },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        return res.json({ success: true, roomCode: existing.room_code, roomId: existing.id, hostToken, deduplicated: true });
      }
    }

    const isGameManager = hostFranchise === 'ADMIN';
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomId = crypto.randomUUID();
    
    let passwordHash = null;
    if (roomConfig?.isPrivate && roomConfig?.password) {
      passwordHash = bcrypt.hashSync(roomConfig.password, 10);
    }
    
    const maxTeams = (roomConfig && roomConfig.maxTeams) || 10;
    const maxSquadSize = (roomConfig && roomConfig.maxSquadSize) || 10;
    const minSquadSize = Math.min(maxSquadSize, Math.max(3, (roomConfig && roomConfig.minSquadSize) || 5));

    db.prepare(`
      INSERT INTO rooms (
        id, room_code, room_name, host_id, host_franchise,
        is_private, password_hash,
        max_teams, max_squad_size, min_squad_size, starting_purse_lakhs, bid_timer_seconds,
        is_unlimited_timer, ai_enabled, ai_difficulty, idempotency_key, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      roomId, 
      roomCode, 
      (roomConfig && roomConfig.name) ? roomConfig.name : `Room ${roomCode}`, 
      effectiveHostId, 
      hostFranchise || 'CSK',
      roomConfig?.isPrivate ? 1 : 0,
      passwordHash,
      maxTeams, 
      maxSquadSize,
      minSquadSize,
      (roomConfig && roomConfig.startingPurse) || 12000, 
      (roomConfig && roomConfig.bidTimer) || 10,
      roomConfig?.isUnlimited ? 1 : 0,
      roomConfig?.aiEnabled ? 1 : 0,
      roomConfig?.aiDifficulty || 'MEDIUM',
      idempotencyKey || null,
      Date.now()
    );

    // Initialise activity timestamp so idle timer starts from room creation
    touchActivity(roomId);

    // A Game Manager hosts the arena without occupying a franchise slot or purse.
    // A normal host remains a playing franchise and keeps the existing host controls.
    if (!isGameManager) {
      db.prepare(`
        INSERT INTO room_participants (id, room_id, user_id, franchise_id, display_name, purse_remaining_lakhs, is_host, joined_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `).run(crypto.randomUUID(), roomId, effectiveHostId, hostFranchise || 'CSK', hostDisplayName || 'Host', (roomConfig && roomConfig.startingPurse) || 12000, Date.now());
    }

    // Initialize auction queue with pool size support (Blitz: 40, Standard: 80, Mega: 250, or custom)
    const players = db.prepare('SELECT id FROM players WHERE auction_status = "Available"').all() as any[];
    // Shuffle
    players.sort(() => Math.random() - 0.5);
    
    const poolLimit = Number(roomConfig?.poolSize);
    const selectedPlayers = (poolLimit && poolLimit > 0) ? players.slice(0, poolLimit) : players;

    const insertQueue = db.prepare(`
      INSERT INTO auction_queue (id, room_id, player_id, queue_position)
      VALUES (?, ?, ?, ?)
    `);
    
    const tx = db.transaction(() => {
      selectedPlayers.forEach((p, index) => {
        insertQueue.run(crypto.randomUUID(), roomId, p.id, index);
      });
    });
    tx();

    // Secure cryptographically-signed host token for the room creator
    const hostToken = jwt.sign(
      { hostId: effectiveHostId, roomId, roomCode, isHost: true },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Broadcast to all connected clients on Home and Matches to update room lists immediately
    const io = req.app.get('io');
    if (io) {
      io.emit('rooms_updated', { roomCode, isPrivate: Boolean(roomConfig?.isPrivate) });
    }

    res.json({ success: true, roomCode, roomId, hostToken });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Room info with full state
router.get('/:code', (req, res) => {
  try {
    const code = (req.params.code || '').trim().toUpperCase();
    const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(code) as unknown as Room | undefined;
    if (!room) return res.status(404).json({ error: 'Room not found' });
    
    const participants = db.prepare('SELECT * FROM room_participants WHERE room_id = ?').all(room.id);
    
    // Enrich with squad
    const enrichedParticipants = participants.map((p: any) => {
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
        total_points: squad.reduce((sum: number, s: any) => sum + (s.game_points || 0), 0)
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

    const sanitizedRoom: any = { ...room };
    delete sanitizedRoom.password_hash;
    sanitizedRoom.has_password = Boolean(room.password_hash);

    res.json({
      ...sanitizedRoom,
      participants: enrichedParticipants,
      current_player: currentPlayer,
      sold_list: soldList
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start room auction
router.post('/:code/start', (req, res) => {
  try {
    const code = (req.params.code || '').trim().toUpperCase();
    const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(code) as unknown as Room | undefined;
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // Verify caller has host authority
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    let authUserId: string | null = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        authUserId = decoded.id;
      } catch {}
    }

    const callerUserId = authUserId || req.body.userId || req.body.hostId;
    const isRegisteredHost = Boolean(db.prepare('SELECT id FROM users WHERE id = ?').get(room.host_id));
    if (isRegisteredHost) {
      if (authUserId !== room.host_id) {
        return res.status(403).json({ error: 'Forbidden: host authentication required to start auction' });
      }
    } else {
      if (callerUserId !== room.host_id) {
        return res.status(403).json({ error: 'Forbidden: only the room host can start the auction' });
      }
    }

    // Initialize AI teams if enabled
    if (room.ai_enabled) {
      const { initializeAITeams } = require('../services/aiBidding');
      initializeAITeams(room.id, code, {
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

    const io = req.app.get('io');
    if (io) {
      emitRoomState(io, code);
      io.to(code).emit('auction_started', { room: buildFullRoomState(code) });
      io.emit('rooms_updated', { roomCode: code, status: 'LIVE' });
    }

    const updatedRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room.id);
    res.json({ success: true, room: updatedRoom });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Completed results
router.get('/:code/results', (req, res) => {
  try {
    const code = (req.params.code || '').trim().toUpperCase();
    const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(code) as any;
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const players = db.prepare(`
      SELECT sp.id, sp.room_id, sp.player_id, sp.franchise_id, sp.sold_price_lakhs, sp.sold_at,
             p.player_name, p.primary_role, p.country, p.status, p.game_points, p.base_price_lakhs, p.franchise_2026
      FROM squad_players sp
      JOIN players p ON p.id = sp.player_id
      WHERE sp.room_id = ?
      ORDER BY sp.sold_price_lakhs DESC, sp.sold_at ASC
    `).all(room.id) as any[];

    const participants = db.prepare('SELECT * FROM room_participants WHERE room_id = ?').all(room.id) as any[];
    const teams = participants.map(p => {
      const squadForTeam = players.filter(pl => pl.franchise_id === p.franchise_id);
      const totalPoints = squadForTeam.reduce((sum, pl) => sum + (pl.game_points || 0), 0);
      const totalSpent = squadForTeam.reduce((sum, pl) => sum + (pl.sold_price_lakhs || 0), 0);
      const overseasCount = squadForTeam.filter(pl => pl.status === 'OS').length;
      const avgRating = squadForTeam.length > 0 ? Number((totalPoints / squadForTeam.length).toFixed(1)) : 0;
      const batters = squadForTeam.filter(pl => pl.primary_role === 'Batter').length;
      const bowlers = squadForTeam.filter(pl => pl.primary_role === 'Bowler').length;
      const allRounders = squadForTeam.filter(pl => pl.primary_role === 'All-Rounder').length;
      const keepers = squadForTeam.filter(pl => pl.primary_role === 'Wicket-Keeper').length;

      return {
        franchise_id: p.franchise_id,
        display_name: p.display_name,
        is_ai: Boolean(p.is_ai),
        purse_remaining_lakhs: p.purse_remaining_lakhs,
        total_spent_lakhs: totalSpent,
        total_points: totalPoints,
        avg_rating: avgRating,
        squad_count: squadForTeam.length,
        overseas_count: overseasCount,
        roles: { batters, bowlers, allRounders, keepers },
        squad: squadForTeam,
        rank: 1
      };
    });

    // Rank teams by total_points DESC, then avg_rating DESC, then purse_remaining_lakhs DESC
    teams.sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
      return b.purse_remaining_lakhs - a.purse_remaining_lakhs;
    });

    teams.forEach((t, i) => { t.rank = i + 1; });

    const totalSpentLakhs = players.reduce((sum, p) => sum + (p.sold_price_lakhs || 0), 0);
    const topBuy = players.length > 0 ? players[0] : null;

    let bestValuePlayer: any = null;
    let maxEfficiency = 0;
    for (const pl of players) {
      if (pl.sold_price_lakhs > 0) {
        const efficiency = (pl.game_points || 0) / (pl.sold_price_lakhs / 100);
        if (efficiency > maxEfficiency) {
          maxEfficiency = efficiency;
          bestValuePlayer = pl;
        }
      }
    }

    const topSpender = [...teams].sort((a, b) => b.total_spent_lakhs - a.total_spent_lakhs)[0] || null;
    const topRatedSquad = teams[0] || null;

    const sanitizedRoom = { ...room };
    delete sanitizedRoom.password_hash;

    res.json({
      room: sanitizedRoom,
      players,
      teams,
      topRatedSquad,
      champion: topRatedSquad,
      awards: {
        topBuy,
        bestValue: bestValuePlayer,
        topSpender,
        topRatedSquad
      },
      total_spent_lakhs: totalSpentLakhs,
      total_players_drafted: players.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
