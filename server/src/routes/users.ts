import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../database/db';
import { JWT_SECRET } from '../config';
import { isUserOnline } from '../services/presence';

const router = Router();

// Middleware: Optional or required auth
function getCallerId(req: any): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload.id || null;
  } catch {
    return null;
  }
}

// 1. Get player profile by User ID (Publicly viewable, no password hashes)
router.get('/:id/profile', (req, res) => {
  try {
    const userId = req.params.id;
    const user = db.prepare(`
      SELECT id, username, display_name, avatar_emoji, rank_name, level, xp,
             auctions_played, auctions_won, total_players_bought,
             mega_count, blitz_count, likes_count, created_at
      FROM users
      WHERE id = ?
    `).get(userId) as any;

    if (!user) {
      return res.status(404).json({ error: 'Player profile not found' });
    }

    const callerId = getCallerId(req);
    let hasLiked = false;
    if (callerId) {
      const likeRow = db.prepare(`
        SELECT id FROM profile_likes
        WHERE target_user_id = ? AND liker_user_id = ?
      `).get(userId, callerId);
      hasLiked = Boolean(likeRow);
    }

    const played = user.auctions_played || 0;
    const won = user.auctions_won || 0;
    const losses = Math.max(0, played - won);
    const winRate = played > 0 ? Math.round((won / played) * 100) : 0;

    res.json({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar_emoji: user.avatar_emoji || '🏏',
      rank_name: user.rank_name || 'Rookie',
      level: user.level || 1,
      xp: user.xp || 0,
      auctions_played: played,
      auctions_won: won,
      losses: losses,
      auctions_lost: losses,
      win_rate: winRate,
      blitz_count: user.blitz_count || 0,
      mega_count: user.mega_count || 0,
      likes_count: user.likes_count || 0,
      total_players_bought: user.total_players_bought || 0,
      has_liked: hasLiked,
      is_online: isUserOnline(user.id),
      created_at: user.created_at
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Toggle Like on a player profile (1 persistent like per account)
router.post('/:id/like', (req, res) => {
  const callerId = getCallerId(req);
  if (!callerId) {
    return res.status(401).json({ error: 'Authentication required to like profile' });
  }

  const targetUserId = req.params.id;
  if (callerId === targetUserId) {
    return res.status(400).json({ error: 'You cannot like your own profile' });
  }
  try {
    const target = db.prepare('SELECT id, likes_count FROM users WHERE id = ?').get(targetUserId) as any;
    if (!target) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const existingLike = db.prepare(`
      SELECT id FROM profile_likes
      WHERE target_user_id = ? AND liker_user_id = ?
    `).get(targetUserId, callerId) as any;

    let liked = false;
    if (existingLike) {
      // Unlike
      db.prepare('DELETE FROM profile_likes WHERE id = ?').run(existingLike.id);
      db.prepare('UPDATE users SET likes_count = MAX(0, COALESCE(likes_count, 1) - 1) WHERE id = ?').run(targetUserId);
      liked = false;
    } else {
      // Like
      db.prepare(`
        INSERT INTO profile_likes (id, target_user_id, liker_user_id, created_at)
        VALUES (?, ?, ?, ?)
      `).run(crypto.randomUUID(), targetUserId, callerId, Date.now());
      db.prepare('UPDATE users SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = ?').run(targetUserId);
      liked = true;
    }

    const updated = db.prepare('SELECT likes_count FROM users WHERE id = ?').get(targetUserId) as any;
    res.json({ success: true, liked, likes_count: updated?.likes_count || 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
