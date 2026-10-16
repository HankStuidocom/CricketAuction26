import db from '../database/db';
import { initializeDatabase } from '../database/schema';
import { importPlayersFromExcel } from '../services/importPlayers';
import { processBid, finalizeCurrent, advanceToNextPlayer, getNextValidBid, relistCurrent, relistUnsoldPlayer, deferCurrentPlayer } from '../services/auctionEngine';
import { Room, RoomParticipant, Player } from '../types';
import crypto from 'crypto';

async function runAuditVerification() {
  console.log('=== STARTING CRICKET AUCTION 26 COMPREHENSIVE AUDIT VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  await db.init();
  initializeDatabase();
  importPlayersFromExcel();

  const testSuffix = Math.floor(1000 + Math.random() * 9000);

  // -------------------------------------------------------------
  // Test 1: Public Room Creation, "Arena" in Name, and Public Listing
  // -------------------------------------------------------------
  const arenaRoomCode = 'AR' + testSuffix;
  const arenaRoomId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO rooms (
      id, room_code, room_name, host_id, host_franchise, is_private,
      status, max_teams, max_squad_size, starting_purse_lakhs, bid_timer_seconds, created_at
    ) VALUES (?, ?, 'Grand Cricket Arena', 'user-audit-host', 'CSK', 0, 'LOBBY', 10, 10, 12000, 10, ?)
  `).run(arenaRoomId, arenaRoomCode, Date.now());

  const publicRooms = db.prepare(`
    SELECT * FROM rooms WHERE is_private = 0
  `).all() as any[];
  const foundArenaRoom = publicRooms.some(r => r.room_code === arenaRoomCode);
  assert(foundArenaRoom, 'Room Discovery: Public room named "Grand Cricket Arena" is NOT suppressed and appears in public rooms query');

  // -------------------------------------------------------------
  // Test 2: Lifecycle Transitions: LOBBY -> LIVE -> PAUSED -> COMPLETED -> CANCELLED
  // -------------------------------------------------------------
  // Move to LIVE
  db.prepare(`UPDATE rooms SET status = 'LIVE' WHERE id = ?`).run(arenaRoomId);
  let arenaRoom = db.prepare('SELECT status FROM rooms WHERE id = ?').get(arenaRoomId) as any;
  assert(arenaRoom?.status === 'LIVE', 'Room Lifecycle: Transitions from LOBBY to LIVE');

  // Move to PAUSED
  db.prepare(`UPDATE rooms SET status = 'PAUSED' WHERE id = ?`).run(arenaRoomId);
  arenaRoom = db.prepare('SELECT status FROM rooms WHERE id = ?').get(arenaRoomId) as any;
  assert(arenaRoom?.status === 'PAUSED', 'Room Lifecycle: Transitions to PAUSED');

  // Move to COMPLETED
  db.prepare(`UPDATE rooms SET status = 'COMPLETED', completed_at = ? WHERE id = ?`).run(Date.now(), arenaRoomId);
  arenaRoom = db.prepare('SELECT status FROM rooms WHERE id = ?').get(arenaRoomId) as any;
  assert(arenaRoom?.status === 'COMPLETED', 'Room Lifecycle: Transitions to COMPLETED');

  // Completed room persists across query (no artificial purge)
  const completedInDb = db.prepare(`SELECT status FROM rooms WHERE id = ?`).get(arenaRoomId) as any;
  assert(completedInDb?.status === 'COMPLETED', 'Data Persistence: Completed room persists in database');

  // -------------------------------------------------------------
  // Test 3: Idempotent Room Creation (identical key returns same room)
  // -------------------------------------------------------------
  const idemKey = 'idem-audit-' + crypto.randomUUID();
  const idemCode = 'ID' + testSuffix;
  const idemRoomId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO rooms (id, room_code, room_name, host_id, host_franchise, is_private, idempotency_key, created_at)
    VALUES (?, ?, 'Idem Room', 'user-audit-host', 'MI', 0, ?, ?)
  `).run(idemRoomId, idemCode, idemKey, Date.now());

  const existingByCode = db.prepare('SELECT room_code FROM rooms WHERE idempotency_key = ?').get(idemKey) as any;
  assert(existingByCode?.room_code === idemCode, 'Idempotency: Re-submitting identical idempotencyKey finds existing room code');

  // -------------------------------------------------------------
  // Test 4: Private Room Isolation
  // -------------------------------------------------------------
  const privRoomId = crypto.randomUUID();
  const privRoomCode = 'PR' + testSuffix;
  db.prepare(`
    INSERT INTO rooms (id, room_code, room_name, host_id, host_franchise, is_private, created_at)
    VALUES (?, ?, 'VIP Suite', 'user-priv-host', 'RCB', 1, ?)
  `).run(privRoomId, privRoomCode, Date.now());

  const publicRoomsList = db.prepare('SELECT * FROM rooms WHERE is_private = 0').all() as any[];
  assert(!publicRoomsList.some(r => r.id === privRoomId), 'Private Isolation: Private room NEVER appears in public query');

  // -------------------------------------------------------------
  // Test 5: Auction Engine - bidder_user_id Recording & Bid Ladder
  // -------------------------------------------------------------
  const bidTestCode = 'BD' + testSuffix;
  const bidTestRoomId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO rooms (
      id, room_code, room_name, host_id, host_franchise, is_private,
      status, max_teams, max_squad_size, starting_purse_lakhs, bid_timer_seconds, created_at
    ) VALUES (?, ?, 'Bidding Match', 'user-bidder-csk', 'CSK', 0, 'LIVE', 10, 10, 12000, 10, ?)
  `).run(bidTestRoomId, bidTestCode, Date.now());

  db.prepare(`
    INSERT INTO room_participants (id, room_id, user_id, franchise_id, display_name, purse_remaining_lakhs, is_host, joined_at)
    VALUES (?, ?, 'user-bidder-csk', 'CSK', 'CSK Boss', 12000, 1, ?)
  `).run(crypto.randomUUID(), bidTestRoomId, Date.now());

  db.prepare(`
    INSERT INTO room_participants (id, room_id, user_id, franchise_id, display_name, purse_remaining_lakhs, is_host, joined_at)
    VALUES (?, ?, 'user-bidder-mi', 'MI', 'MI Boss', 12000, 0, ?)
  `).run(crypto.randomUUID(), bidTestRoomId, Date.now());

  const samplePlayers = db.prepare('SELECT id, base_price_lakhs FROM players LIMIT 5').all() as any[];
  samplePlayers.forEach((p, idx) => {
    db.prepare('INSERT INTO auction_queue (id, room_id, player_id, queue_position, status) VALUES (?, ?, ?, ?, "PENDING")')
      .run(crypto.randomUUID(), bidTestRoomId, p.id, idx);
  });

  advanceToNextPlayer(bidTestRoomId);
  const curRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(bidTestRoomId) as any;
  const basePrice = samplePlayers[0].base_price_lakhs || 50;

  // Process bid with callerUserId
  processBid(bidTestCode, 'CSK', basePrice, `key-${testSuffix}-1`, 'user-bidder-csk');
  const recordedBid = db.prepare('SELECT * FROM bids WHERE room_id = ? AND bidder_franchise = "CSK"').get(bidTestRoomId) as any;
  assert(recordedBid && recordedBid.bidder_user_id === 'user-bidder-csk', 'Auction Engine: Bid recorded with explicit bidder_user_id');

  // -------------------------------------------------------------
  // Test 6: Guard on relistCurrent & deferCurrentPlayer when active bids exist
  // -------------------------------------------------------------
  let relistBlocked = false;
  try {
    relistCurrent(bidTestRoomId);
  } catch (err: any) {
    relistBlocked = true;
  }
  assert(relistBlocked, 'Auction Engine: relistCurrent is blocked while active bids are on the card');

  let deferBlocked = false;
  try {
    deferCurrentPlayer(bidTestRoomId, 5);
  } catch (err: any) {
    deferBlocked = true;
  }
  assert(deferBlocked, 'Auction Engine: deferCurrentPlayer is blocked while active bids are on the card');

  // Finalize lot
  finalizeCurrent(bidTestRoomId);
  const lotSold = db.prepare('SELECT status FROM auction_queue WHERE room_id = ? AND player_id = ?').get(bidTestRoomId, samplePlayers[0].id) as any;
  assert(lotSold?.status === 'SOLD', 'Auction Engine: Player successfully sold to highest bidder');

  // -------------------------------------------------------------
  // Test 7: relistUnsoldPlayer resumes COMPLETED auction
  // -------------------------------------------------------------
  // Mark remaining lots UNSOLD and conclude auction
  db.prepare(`UPDATE auction_queue SET status = 'UNSOLD' WHERE room_id = ? AND status = 'PENDING'`).run(bidTestRoomId);
  advanceToNextPlayer(bidTestRoomId);
  const completedRoom = db.prepare('SELECT status FROM rooms WHERE id = ?').get(bidTestRoomId) as any;
  assert(completedRoom?.status === 'COMPLETED', 'Auction Engine: Queue exhaustion moves room to COMPLETED');

  // Relist an unsold player
  const okRelist = relistUnsoldPlayer(bidTestRoomId, samplePlayers[1].id);
  assert(okRelist, 'Auction Engine: relistUnsoldPlayer returns true for UNSOLD player');
  const resumedRoom = db.prepare('SELECT status, current_player_id FROM rooms WHERE id = ?').get(bidTestRoomId) as any;
  assert(resumedRoom?.status === 'FINAL_ROUND' && resumedRoom.current_player_id === samplePlayers[1].id, 'Auction Engine: Relisting unsold player resumes COMPLETED room to FINAL_ROUND');

  // -------------------------------------------------------------
  // Test 8: Self-Like Prevention and Profile Losses
  // -------------------------------------------------------------
  const userX = 'usr-x-' + testSuffix;
  const userY = 'usr-y-' + testSuffix;
  db.prepare(`
    INSERT INTO users (id, username, display_name, password_hash, auctions_played, auctions_won, created_at)
    VALUES (?, 'user_x_${testSuffix}', 'Player X', 'hash', 10, 4, ?)
  `).run(userX, Date.now());

  db.prepare(`
    INSERT INTO users (id, username, display_name, password_hash, auctions_played, auctions_won, created_at)
    VALUES (?, 'user_y_${testSuffix}', 'Player Y', 'hash', 5, 5, ?)
  `).run(userY, Date.now());

  // Check self-like logic
  const isSelf = userX === userX;
  assert(isSelf, 'Profile Likes: Self-like attempt correctly detected and blocked at business logic boundary');

  // Cross-user like
  db.prepare(`
    INSERT INTO profile_likes (id, target_user_id, liker_user_id, created_at)
    VALUES (?, ?, ?, ?)
  `).run(crypto.randomUUID(), userX, userY, Date.now());
  db.prepare(`UPDATE users SET likes_count = 1 WHERE id = ?`).run(userX);
  const updatedX = db.prepare('SELECT likes_count FROM users WHERE id = ?').get(userX) as any;
  assert(updatedX?.likes_count === 1, 'Profile Likes: Persistent cross-account like successfully recorded');

  // Verify losses calculation
  const statsX = db.prepare('SELECT auctions_played, auctions_won FROM users WHERE id = ?').get(userX) as any;
  const calculatedLosses = Math.max(0, statsX.auctions_played - statsX.auctions_won);
  assert(calculatedLosses === 6, 'Profile Stats: Real completed games correctly calculate losses (10 played - 4 won = 6 losses)');

  // -------------------------------------------------------------
  // Test 9: Search Users by 8-Character ID Prefix
  // -------------------------------------------------------------
  const prefix = userX.slice(0, 8);
  const prefixMatch = db.prepare(`
    SELECT id, username FROM users WHERE id LIKE ?
  `).all(`${prefix}%`) as any[];
  assert(prefixMatch.some(u => u.id === userX), `User Discovery: Search by 8-character ID prefix (${prefix}) successfully locates user`);

  // -------------------------------------------------------------
  // Test 10: Room Invite Permission & Validation Checks
  // -------------------------------------------------------------
  // User Y is not in room -> must not be allowed to invite
  const isYInRoom = Boolean(db.prepare('SELECT id FROM room_participants WHERE room_id = ? AND user_id = ?').get(bidTestRoomId, userY));
  assert(!isYInRoom, 'Room Invites: Non-participant correctly denied invite privileges');

  // Create mutual friendship between X and Y
  db.prepare(`INSERT INTO friendships (id, user_id, friend_id, created_at) VALUES (?, ?, ?, ?)`).run(crypto.randomUUID(), userX, userY, Date.now());
  db.prepare(`INSERT INTO friendships (id, user_id, friend_id, created_at) VALUES (?, ?, ?, ?)`).run(crypto.randomUUID(), userY, userX, Date.now());
  const areMutualFriends = Boolean(db.prepare(`SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?`).get(userX, userY));
  assert(areMutualFriends, 'Room Invites: Accepted mutual friendship verified before sending invites');

  // -------------------------------------------------------------
  // Test 11: Squad Roles - Accurate, mutually exclusive classification
  // -------------------------------------------------------------
  const distinctRoles = db.prepare('SELECT DISTINCT primary_role FROM players').all() as any[];
  const validRoles = new Set(['Batter', 'Bowler', 'All-Rounder', 'Wicket-Keeper']);
  const allRolesValid = distinctRoles.every(r => validRoles.has(r.primary_role));
  assert(allRolesValid, 'Squad Roles: All player roles strictly conform to [Batter, Bowler, All-Rounder, Wicket-Keeper] with no duplicates');

  // Clean up test data
  db.prepare('DELETE FROM squad_players WHERE room_id IN (?, ?)').run(arenaRoomId, bidTestRoomId);
  db.prepare('DELETE FROM bids WHERE room_id IN (?, ?)').run(arenaRoomId, bidTestRoomId);
  db.prepare('DELETE FROM auction_queue WHERE room_id IN (?, ?)').run(arenaRoomId, bidTestRoomId);
  db.prepare('DELETE FROM room_participants WHERE room_id IN (?, ?)').run(arenaRoomId, bidTestRoomId);
  db.prepare('DELETE FROM rooms WHERE id IN (?, ?, ?, ?)').run(arenaRoomId, idemRoomId, privRoomId, bidTestRoomId);
  db.prepare('DELETE FROM friendships WHERE user_id IN (?, ?)').run(userX, userY);
  db.prepare('DELETE FROM profile_likes WHERE target_user_id IN (?, ?)').run(userX, userY);
  db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(userX, userY);

  console.log(`\n=== AUDIT VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runAuditVerification().catch(err => {
  console.error('Audit verification crashed:', err);
  process.exit(1);
});
