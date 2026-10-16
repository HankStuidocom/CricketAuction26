import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initializeDatabase } from './database/schema';
import { importPlayersFromExcel } from './services/importPlayers';
import { setupSocketHandlers } from './socket/roomHandlers';
import db from './database/db';

import authRoutes from './routes/auth';
import roomRoutes from './routes/rooms';
import adminRoutes from './routes/admin';
import friendsRoutes from './routes/friends';
import usersRoutes from './routes/users';

const app = express();
const httpServer = createServer(app);

const corsOptions = {
  origin: '*', // Allow all origins for flexibility between local dev and Vercel/Render
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const io = new Server(httpServer, {
  cors: corsOptions
});

app.set('io', io);

app.use(cors(corsOptions));
app.use(express.json());

const gracefulShutdown = async (signal: string) => {
  console.log(`[Shutdown] Received ${signal}, flushing persistent database state...`);
  try {
    await db.flushToPostgres();
  } catch (err: any) {
    console.error('[Shutdown] Flush error:', err.message);
  }
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

async function startServer() {
  // Init DB
  await db.init();
  initializeDatabase();

  // Purge any pre-existing dummy/stale/completed rooms so only real player-created rooms appear
  try {
    const dummyFilter = `
      status IN ('COMPLETED', 'CANCELLED')
      OR room_code LIKE 'TEST%'
      OR room_code LIKE 'ID%'
      OR room_code LIKE 'PR%'
      OR room_name LIKE '%Arena%'
      OR room_name LIKE '%Test%'
      OR room_name LIKE 'Room CV2SNY'
      OR room_name LIKE 'Multiplayer Reliability%'
      OR created_at < 1792154000000
    `;
    db.prepare(`DELETE FROM squad_players WHERE room_id IN (SELECT id FROM rooms WHERE ${dummyFilter})`).run();
    db.prepare(`DELETE FROM bids WHERE room_id IN (SELECT id FROM rooms WHERE ${dummyFilter})`).run();
    db.prepare(`DELETE FROM auction_queue WHERE room_id IN (SELECT id FROM rooms WHERE ${dummyFilter})`).run();
    db.prepare(`DELETE FROM room_participants WHERE room_id IN (SELECT id FROM rooms WHERE ${dummyFilter})`).run();
    db.prepare(`DELETE FROM room_invites WHERE room_id IN (SELECT id FROM rooms WHERE ${dummyFilter})`).run();
    db.prepare(`DELETE FROM auction_events WHERE room_id IN (SELECT id FROM rooms WHERE ${dummyFilter})`).run();
    const purged = db.prepare(`DELETE FROM rooms WHERE ${dummyFilter}`).run();
    console.log(`[Database] Purged legacy dummy rooms on startup (${purged.changes || 0} removed)`);
  } catch (err: any) {
    console.warn('[Database] Purge warning:', err.message);
  }

  // Import on first run
  const playersCount = db.prepare('SELECT COUNT(*) as count FROM players').get() as { count: number };
  if (!playersCount || playersCount.count === 0) {
    console.log('No players found. Importing from Excel...');
    const result = importPlayersFromExcel();
    console.log('Import result:', result);
  }

  // Setup routes
  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/friends', friendsRoutes);
  app.use('/api/users', usersRoutes);

  // Catch-all API 404 Handler (Guarantees JSON instead of HTML error pages)
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: `API route '${req.originalUrl}' not found` });
  });

  // Global Error Handler Middleware for API (Guarantees JSON instead of HTML stack traces)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error'
    });
  });

  // Setup socket
  setupSocketHandlers(io);

  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
