import { Router } from 'express';
import db from '../database/db';
import { importPlayersFromExcel } from '../services/importPlayers';

const router = Router();

router.get('/players', (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search}%` : '%';
    const players = db.prepare('SELECT * FROM players WHERE player_name LIKE ? ORDER BY base_price_lakhs DESC').all(search);
    res.json(players);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/players/:id', (req, res) => {
  try {
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/import', (req, res) => {
  try {
    const result = importPlayersFromExcel();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/players/:id', (req, res) => {
  const { auction_status, base_price_lakhs, game_points } = req.body;
  try {
    const stmt = db.prepare(`
      UPDATE players 
      SET auction_status = COALESCE(?, auction_status),
          base_price_lakhs = COALESCE(?, base_price_lakhs),
          game_points = COALESCE(?, game_points)
      WHERE id = ?
    `);
    stmt.run(auction_status, base_price_lakhs, game_points, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
