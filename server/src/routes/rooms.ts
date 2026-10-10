import { Router } from 'express';
import db from '../database/db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { advanceToNextPlayer } from '../services/auctionEngine';
import { Room } from '../types';

const router = Router();

// List public rooms
router.get('/', (req, res) => {
  try {
    const rooms = db.prepare('SELECT * FROM rooms WHERE is_private = 0 ORDER BY created_at DESC LIMIT 50').all();
    res.json(rooms);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create room
router.post('/', (req, res) => {
  const { roomConfig, hostFranchise, hostDisplayName, hostId } = req.body;
  try {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomId = crypto.randomUUID();
    
    let passwordHash = null;
    if (roomConfig?.isPrivate && roomConfig?.password) {
      passwordHash = bcrypt.hashSync(roomConfig.password, 10);
    }
    
    db.prepare(`
      INSERT INTO rooms (
        id, room_code, room_name, host_id, host_franchise,
        is_private, password_hash,
        max_teams, max_squad_size, starting_purse_lakhs, bid_timer_seconds,
        is_unlimited_timer, ai_enabled, ai_difficulty, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      roomId, 
      roomCode, 
      (roomConfig && roomConfig.name) ? roomConfig.name : `Room ${roomCode}`, 
      hostId || 'guest-host', 
      hostFranchise || 'CSK',
      roomConfig?.isPrivate ? 1 : 0,
      passwordHash,
      (roomConfig && roomConfig.maxTeams) || 10, 
      (roomConfig && roomConfig.maxSquadSize) || 25,
      (roomConfig && roomConfig.startingPurse) || 12000, 
      (roomConfig && roomConfig.bidTimer) || 10,
      roomConfig?.isUnlimited ? 1 : 0,
      roomConfig?.aiEnabled ? 1 : 0,
      roomConfig?.aiDifficulty || 'MEDIUM',
      Date.now()
    );

    // add host as participant
    db.prepare(`
      INSERT INTO room_participants (id, room_id, user_id, franchise_id, display_name, purse_remaining_lakhs, is_host, joined_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `).run(crypto.randomUUID(), roomId, hostId || 'guest-host', hostFranchise || 'CSK', hostDisplayName || 'Host', (roomConfig && roomConfig.startingPurse) || 12000, Date.now());

    // Initialize auction queue
    const players = db.prepare('SELECT id FROM players WHERE auction_status = "Available"').all() as any[];
    // Shuffle
    players.sort(() => Math.random() - 0.5);
    
    const insertQueue = db.prepare(`
      INSERT INTO auction_queue (id, room_id, player_id, queue_position)
      VALUES (?, ?, ?, ?)
    `);
    
    const tx = db.transaction(() => {
      players.forEach((p, index) => {
        insertQueue.run(crypto.randomUUID(), roomId, p.id, index);
      });
    });
    tx();

    res.json({ success: true, roomCode });
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

    res.json({
      ...room,
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

    db.prepare('UPDATE rooms SET status = "IN_PROGRESS", auction_started_at = ? WHERE id = ?').run(Date.now(), room.id);
    if (!room.current_player_id) {
      advanceToNextPlayer(room.id);
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
    const room = db.prepare('SELECT id FROM rooms WHERE UPPER(room_code) = ?').get(code) as any;
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const results = db.prepare(`
      SELECT sp.*, p.player_name, p.primary_role 
      FROM squad_players sp
      JOIN players p ON p.id = sp.player_id
      WHERE sp.room_id = ?
    `).all(room.id);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;