import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../database/db';
import { JWT_SECRET } from '../config';
import { isUserOnline, emitToUser } from '../services/presence';

const router = Router();

// Middleware: Authenticate user via JWT Bearer token
function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// 1. List accepted friends with real-time online status
router.get('/', requireAuth, (req: any, res) => {
  try {
    const userId = req.user.id;
    const friends = db.prepare(`
      SELECT DISTINCT u.id, u.username, u.display_name, u.avatar_emoji, u.rank_name, u.level, u.xp,
             u.likes_count, u.auctions_played, u.auctions_won
      FROM users u
      JOIN friendships f ON (f.friend_id = u.id AND f.user_id = ?) OR (f.user_id = u.id AND f.friend_id = ?)
      WHERE u.id != ?
      ORDER BY u.display_name ASC
    `).all(userId, userId, userId) as any[];

    const enriched = friends.map(f => ({
      ...f,
      likes_count: f.likes_count || 0,
      auctions_played: f.auctions_played || 0,
      auctions_won: f.auctions_won || 0,
      is_online: isUserOnline(f.id)
    }));

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Incoming & outgoing friend requests
router.get('/requests', requireAuth, (req: any, res) => {
  try {
    const userId = req.user.id;
    const incoming = db.prepare(`
      SELECT fr.id, fr.sender_id, fr.receiver_id, fr.status, fr.created_at,
             u.username as sender_username, u.display_name as sender_display_name,
             u.avatar_emoji as sender_avatar, u.rank_name as sender_rank
      FROM friend_requests fr
      JOIN users u ON u.id = fr.sender_id
      WHERE fr.receiver_id = ? AND fr.status = 'PENDING'
      ORDER BY fr.created_at DESC
    `).all(userId) as any[];

    const outgoing = db.prepare(`
      SELECT fr.id, fr.sender_id, fr.receiver_id, fr.status, fr.created_at,
             u.username as receiver_username, u.display_name as receiver_display_name,
             u.avatar_emoji as receiver_avatar, u.rank_name as receiver_rank
      FROM friend_requests fr
      JOIN users u ON u.id = fr.receiver_id
      WHERE fr.sender_id = ? AND fr.status = 'PENDING'
      ORDER BY fr.created_at DESC
    `).all(userId) as any[];

    res.json({ incoming, outgoing });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Search users by Player Tag / ID / Username
router.get('/search', requireAuth, (req: any, res) => {
  try {
    const userId = req.user.id;
    const query = ((req.query.q as string) || '').trim();
    if (!query || query.length < 2) {
      return res.json([]);
    }

    const searchPattern = `%${query}%`;
    const users = db.prepare(`
      SELECT id, username, display_name, avatar_emoji, rank_name, level, likes_count, auctions_played, auctions_won
      FROM users
      WHERE id != ? AND (username LIKE ? OR display_name LIKE ? OR id = ?)
      LIMIT 20
    `).all(userId, searchPattern, searchPattern, query) as any[];

    // Fetch existing relationships
    const friends = db.prepare(`
      SELECT friend_id, user_id FROM friendships
      WHERE user_id = ? OR friend_id = ?
    `).all(userId, userId) as any[];

    const friendIds = new Set<string>();
    friends.forEach(f => {
      friendIds.add(f.user_id === userId ? f.friend_id : f.user_id);
    });

    const pendingRequests = db.prepare(`
      SELECT id, sender_id, receiver_id FROM friend_requests
      WHERE (sender_id = ? OR receiver_id = ?) AND status = 'PENDING'
    `).all(userId, userId) as any[];

    const pendingSent = new Set<string>();
    const pendingReceived = new Set<string>();
    pendingRequests.forEach(r => {
      if (r.sender_id === userId) pendingSent.add(r.receiver_id);
      if (r.receiver_id === userId) pendingReceived.add(r.sender_id);
    });

    const enriched = users.map(u => {
      let relationship: 'friend' | 'pending_sent' | 'pending_received' | 'none' = 'none';
      if (friendIds.has(u.id)) relationship = 'friend';
      else if (pendingSent.has(u.id)) relationship = 'pending_sent';
      else if (pendingReceived.has(u.id)) relationship = 'pending_received';

      return {
        ...u,
        relationship,
        is_online: isUserOnline(u.id)
      };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Send friend request
router.post('/request', requireAuth, (req: any, res) => {
  try {
    const senderId = req.user.id;
    const { targetId } = req.body;

    if (!targetId || targetId === senderId) {
      return res.status(400).json({ error: 'Invalid recipient' });
    }

    const targetUser = db.prepare('SELECT id, display_name FROM users WHERE id = ?').get(targetId) as any;
    if (!targetUser) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Check existing friendship
    const existingFriendship = db.prepare(`
      SELECT id FROM friendships
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `).get(senderId, targetId, targetId, senderId);
    if (existingFriendship) {
      return res.status(400).json({ error: 'Already friends with this player' });
    }

    // Check existing pending request
    const existingRequest = db.prepare(`
      SELECT id, status FROM friend_requests
      WHERE sender_id = ? AND receiver_id = ?
    `).get(senderId, targetId) as any;

    const reverseRequest = db.prepare(`
      SELECT id, status FROM friend_requests
      WHERE sender_id = ? AND receiver_id = ? AND status = 'PENDING'
    `).get(targetId, senderId) as any;

    // If reverse request is pending, auto-accept friendship!
    if (reverseRequest) {
      db.prepare(`UPDATE friend_requests SET status = 'ACCEPTED', updated_at = ? WHERE id = ?`).run(Date.now(), reverseRequest.id);
      db.prepare(`INSERT OR IGNORE INTO friendships (id, user_id, friend_id, created_at) VALUES (?, ?, ?, ?)`).run(crypto.randomUUID(), senderId, targetId, Date.now());
      db.prepare(`INSERT OR IGNORE INTO friendships (id, user_id, friend_id, created_at) VALUES (?, ?, ?, ?)`).run(crypto.randomUUID(), targetId, senderId, Date.now());
      emitToUser(targetId, 'friend_request_accepted', { friendId: senderId });
      return res.json({ success: true, status: 'ACCEPTED', message: 'Friend request accepted!' });
    }

    if (existingRequest && existingRequest.status === 'PENDING') {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    const requestId = crypto.randomUUID();
    if (existingRequest) {
      db.prepare(`UPDATE friend_requests SET status = 'PENDING', updated_at = ? WHERE id = ?`).run(Date.now(), existingRequest.id);
    } else {
      db.prepare(`
        INSERT INTO friend_requests (id, sender_id, receiver_id, status, created_at, updated_at)
        VALUES (?, ?, ?, 'PENDING', ?, ?)
      `).run(requestId, senderId, targetId, Date.now(), Date.now());
    }

    const sender = db.prepare('SELECT id, display_name, username, avatar_emoji FROM users WHERE id = ?').get(senderId) as any;
    emitToUser(targetId, 'friend_request_received', { sender });

    res.json({ success: true, message: 'Friend request sent' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Respond to friend request (accept / reject)
router.post('/respond', requireAuth, (req: any, res) => {
  try {
    const userId = req.user.id;
    const { requestId, action } = req.body;

    if (!requestId || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }

    const request = db.prepare('SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ?').get(requestId, userId) as any;
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (action === 'accept') {
      db.prepare(`UPDATE friend_requests SET status = 'ACCEPTED', updated_at = ? WHERE id = ?`).run(Date.now(), requestId);
      db.prepare(`INSERT OR IGNORE INTO friendships (id, user_id, friend_id, created_at) VALUES (?, ?, ?, ?)`).run(crypto.randomUUID(), userId, request.sender_id, Date.now());
      db.prepare(`INSERT OR IGNORE INTO friendships (id, user_id, friend_id, created_at) VALUES (?, ?, ?, ?)`).run(crypto.randomUUID(), request.sender_id, userId, Date.now());
      
      emitToUser(request.sender_id, 'friend_request_accepted', { friendId: userId });
      res.json({ success: true, message: 'Friend request accepted' });
    } else {
      db.prepare(`DELETE FROM friend_requests WHERE id = ?`).run(requestId);
      res.json({ success: true, message: 'Friend request declined' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Remove friend
router.delete('/:friendId', requireAuth, (req: any, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.friendId;

    db.prepare(`
      DELETE FROM friendships 
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `).run(userId, friendId, friendId, userId);

    db.prepare(`
      DELETE FROM friend_requests
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    `).run(userId, friendId, friendId, userId);

    res.json({ success: true, message: 'Friend removed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Invite friend to an auction room
router.post('/invite', requireAuth, (req: any, res) => {
  try {
    const senderId = req.user.id;
    const { roomCode, friendId } = req.body;

    if (!roomCode || !friendId) {
      return res.status(400).json({ error: 'Missing roomCode or friendId' });
    }

    const normCode = (roomCode || '').trim().toUpperCase();
    const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normCode) as any;
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // Verify room has capacity
    const participants = db.prepare('SELECT COUNT(*) as count FROM room_participants WHERE room_id = ?').get(room.id) as { count: number };
    if (participants && participants.count >= room.max_teams) {
      return res.status(400).json({ error: 'Room is already full' });
    }

    const sender = db.prepare('SELECT id, display_name, username, avatar_emoji FROM users WHERE id = ?').get(senderId) as any;
    const inviteId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO room_invites (id, room_id, sender_id, receiver_id, status, created_at)
      VALUES (?, ?, ?, ?, 'PENDING', ?)
    `).run(inviteId, room.id, senderId, friendId, Date.now());

    // Emit live invitation to friend if online
    emitToUser(friendId, 'room_invitation_received', {
      inviteId,
      roomCode: room.room_code,
      roomName: room.room_name,
      senderDisplayName: sender?.display_name || 'Your friend',
      senderAvatar: sender?.avatar_emoji || '🏏',
      isPrivate: Boolean(room.is_private)
    });

    res.json({ success: true, message: 'Invitation sent to player' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Pending room invitations for authenticated user
router.get('/invites', requireAuth, (req: any, res) => {
  try {
    const userId = req.user.id;
    const invites = db.prepare(`
      SELECT ri.id as invite_id, ri.status, ri.created_at,
             r.room_code, r.room_name, r.status as room_status, r.is_private,
             u.display_name as sender_name, u.avatar_emoji as sender_avatar
      FROM room_invites ri
      JOIN rooms r ON r.id = ri.room_id
      JOIN users u ON u.id = ri.sender_id
      WHERE ri.receiver_id = ? AND ri.status = 'PENDING' AND r.status IN ('LOBBY', 'IN_PROGRESS', 'LIVE', 'PAUSED')
      ORDER BY ri.created_at DESC
    `).all(userId) as any[];

    res.json(invites);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
