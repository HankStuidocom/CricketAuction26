import { Router } from 'express';
import db from '../database/db';
import crypto from 'crypto';
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
    
    db.prepare(`
      INSERT INTO rooms (
        id, room_code, room_name, host_id, host_franchise,
        max_teams, max_squad_size, starting_purse_lakhs, bid_timer_seconds, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      roomId, roomCode, (roomConfig && roomConfig.name) ? roomConfig.name : `Room ${roomCode}`, hostId || 'guest-host', hostFranchise || 'CSK',
      (roomConfig && roomConfig.maxTeams) || 10, (roomConfig && roomConfig.maxSquadSize) || 25,
      (roomConfig && roomConfig.startingPurse) || 12000, (roomConfig && roomConfig.bidTimer) || 10, Date.now()
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

// Room info
router.get('/:code', (req, res) => {
  try {
    const room = db.prepare('SELECT * FROM rooms WHERE room_code = ?').get(req.params.code);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start room auction
router.post('/:code/start', (req, res) => {
  try {
    const room = db.prepare('SELECT * FROM rooms WHERE room_code = ?').get(req.params.code) as unknown as Room | undefined;
    if (!room) return res.status(404).json({ error: 'Room not found' });

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
    const room = db.prepare('SELECT id FROM rooms WHERE room_code = ?').get(req.params.code) as any;
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
