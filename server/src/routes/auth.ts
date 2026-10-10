import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/db';
import crypto from 'crypto';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret2026';

router.post('/register', (req, res) => {
  const { username, displayName, password } = req.body;
  if (!username || !password || !displayName) return res.status(400).json({ error: 'Missing fields' });

  try {
    const hash = bcrypt.hashSync(password, 10);
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO users (id, username, display_name, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, username, displayName, hash, Date.now());
    
    res.status(201).json({ success: true, message: 'User registered' });
  } catch (err: any) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Username taken' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    delete user.password_hash;
    res.json({ token, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    delete user.password_hash;
    res.json(user);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
