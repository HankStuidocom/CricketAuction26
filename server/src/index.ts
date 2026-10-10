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

app.use(cors(corsOptions));
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

async function startServer() {
  // Init DB
  await db.init();
  initializeDatabase();

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
