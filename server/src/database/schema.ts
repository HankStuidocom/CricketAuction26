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
  `);
}
