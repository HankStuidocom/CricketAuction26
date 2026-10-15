import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../database/db';
import { importPlayersFromExcel } from '../services/importPlayers';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret2026';
const ADMIN_KEY = process.env.ADMIN_KEY;

// Middleware to guard mutation routes against unauthorized access
function requireAdminAuth(req: any, res: any, next: any) {
  // 1. Check dedicated Admin Secret Header if configured
  const adminKey = req.headers['x-admin-key'];
  if (ADMIN_KEY && adminKey === ADMIN_KEY) {
    return next();
  }

  // 2. Check verified Admin JWT Bearer Token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded && (decoded.isAdmin || decoded.role === 'admin' || decoded.username === 'admin')) {
        req.adminUser = decoded;
        return next();
      }
      // Check database if user account has admin privileges
      if (decoded?.id) {
        const user = db.prepare('SELECT username, rank_name FROM users WHERE id = ?').get(decoded.id) as any;
        if (user && (user.username === 'admin' || user.rank_name === 'Admin' || user.rank_name === 'Commissioner')) {
          req.adminUser = user;
          return next();
        }
      }
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired admin token' });
    }
  }

  return res.status(401).json({ error: 'Unauthorized: Valid Admin credentials or verified Admin JWT required' });
}

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

router.post('/import', requireAdminAuth, (req, res) => {
  try {
    const result = importPlayersFromExcel();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/players/:id', requireAdminAuth, (req, res) => {
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
