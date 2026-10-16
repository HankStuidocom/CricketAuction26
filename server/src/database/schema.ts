import db from './db';

export function initializeDatabase() {
  db.exec(`
    -- Users/participants
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_emoji TEXT DEFAULT '🏏',
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      rank_name TEXT DEFAULT 'Rookie',
      auctions_played INTEGER DEFAULT 0,
      auctions_won INTEGER DEFAULT 0,
      total_players_bought INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    -- Players from Excel
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      player_name TEXT NOT NULL,
      primary_role TEXT NOT NULL,
      country TEXT NOT NULL,
      status TEXT NOT NULL,
      franchise_2026 TEXT,
      squad_status TEXT,
      base_price_lakhs INTEGER NOT NULL,
      game_points INTEGER NOT NULL,
      auction_status TEXT DEFAULT 'Available'
    );

    -- Auction rooms
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      room_code TEXT UNIQUE NOT NULL,
      room_name TEXT NOT NULL,
      host_id TEXT NOT NULL,
      host_franchise TEXT NOT NULL,
      is_private INTEGER DEFAULT 0,
      password_hash TEXT,
      status TEXT DEFAULT 'LOBBY',
      max_teams INTEGER DEFAULT 10,
      max_squad_size INTEGER DEFAULT 10,
      min_squad_size INTEGER DEFAULT 5,
      starting_purse_lakhs INTEGER DEFAULT 12000,
      bid_timer_seconds INTEGER DEFAULT 10,
      is_unlimited_timer INTEGER DEFAULT 0,
      ai_enabled INTEGER DEFAULT 0,
      ai_difficulty TEXT DEFAULT 'MEDIUM',
      current_player_id TEXT,
      current_bid_lakhs INTEGER DEFAULT 0,
      current_bidder_franchise TEXT,
      bid_deadline INTEGER,
      auction_started_at INTEGER,
      completed_at INTEGER,
      last_activity_at INTEGER,
      cancelled_at INTEGER,
      cancelled_by TEXT,
      idle_warned_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (host_id) REFERENCES users(id)
    );

    -- Room participants (team slots)
    CREATE TABLE IF NOT EXISTS room_participants (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_id TEXT,
      franchise_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      is_host INTEGER DEFAULT 0,
      is_ai INTEGER DEFAULT 0,
      ai_difficulty TEXT,
      purse_remaining_lakhs INTEGER NOT NULL,
      total_spent_lakhs INTEGER DEFAULT 0,
      joined_at INTEGER NOT NULL,
      UNIQUE(room_id, franchise_id),
      UNIQUE(room_id, user_id),
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    );

    -- Player queue for auction
    CREATE TABLE IF NOT EXISTS auction_queue (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      queue_position INTEGER NOT NULL,
      status TEXT DEFAULT 'PENDING',
      UNIQUE(room_id, player_id),
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    -- Bids
    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      bidder_franchise TEXT NOT NULL,
      bidder_user_id TEXT,
      amount_lakhs INTEGER NOT NULL,
      placed_at INTEGER NOT NULL,
      idempotency_key TEXT UNIQUE,
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    );

    -- Sold players / squad
    CREATE TABLE IF NOT EXISTS squad_players (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      franchise_id TEXT NOT NULL,
      sold_price_lakhs INTEGER NOT NULL,
      sold_at INTEGER NOT NULL,
      UNIQUE(room_id, player_id),
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    -- Auction events log
    CREATE TABLE IF NOT EXISTS auction_events (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    );

    -- Friendships (accepted mutual friends)
    CREATE TABLE IF NOT EXISTS friendships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(user_id, friend_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (friend_id) REFERENCES users(id)
    );

    -- Friend requests
    CREATE TABLE IF NOT EXISTS friend_requests (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(sender_id, receiver_id),
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    );

    -- User blocks
    CREATE TABLE IF NOT EXISTS user_blocks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      blocked_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(user_id, blocked_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (blocked_id) REFERENCES users(id)
    );

    -- Room invites
    CREATE TABLE IF NOT EXISTS room_invites (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    );

    -- Profile likes (1 like per account per profile)
    CREATE TABLE IF NOT EXISTS profile_likes (
      id TEXT PRIMARY KEY,
      target_user_id TEXT NOT NULL,
      liker_user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(target_user_id, liker_user_id),
      FOREIGN KEY (target_user_id) REFERENCES users(id),
      FOREIGN KEY (liker_user_id) REFERENCES users(id)
    );
  `);

  const safeAlter = (sql: string) => {
    try {
      db.exec(sql);
    } catch {
      // Ignore if column or index already exists
    }
  };

  safeAlter('ALTER TABLE rooms ADD COLUMN min_squad_size INTEGER DEFAULT 5');
  safeAlter('ALTER TABLE rooms ADD COLUMN idempotency_key TEXT');
  safeAlter('CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_idempotency_key ON rooms(idempotency_key)');
  safeAlter('ALTER TABLE users ADD COLUMN mega_count INTEGER DEFAULT 0');
  safeAlter('ALTER TABLE users ADD COLUMN blitz_count INTEGER DEFAULT 0');
  safeAlter('ALTER TABLE users ADD COLUMN likes_count INTEGER DEFAULT 0');
  // Room cleanup & activity tracking columns (safe to re-run)
  safeAlter('ALTER TABLE rooms ADD COLUMN last_activity_at INTEGER');
  safeAlter('ALTER TABLE rooms ADD COLUMN cancelled_at INTEGER');
  safeAlter('ALTER TABLE rooms ADD COLUMN cancelled_by TEXT');
  safeAlter('ALTER TABLE rooms ADD COLUMN idle_warned_at INTEGER');
}
