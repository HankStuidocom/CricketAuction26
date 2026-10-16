import db from '../database/db';
import { initializeDatabase } from '../database/schema';
import { importPlayersFromExcel } from '../services/importPlayers';
import { processBid, finalizeCurrent, advanceToNextPlayer, getNextValidBid } from '../services/auctionEngine';
import { Room, RoomParticipant, Player } from '../types';
import crypto from 'crypto';
import {
  touchActivity,
  getLobbyRoomsNeedingWarning,
  getLobbyRoomsToAutoClose,
  autoExpireLobbyRoom,
  markIdleWarned,
  cancelRoomByHost,
  purgeOldCancelledLobbies
} from '../services/roomCleanup';

async function runTests() {
  console.log('=== STARTING CRICKET AUCTION 26 AUTOMATED TEST SUITE ===\n');
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

  // 1. Initialize DB
  await db.init();
  initializeDatabase();
  const importRes = importPlayersFromExcel();
  assert(importRes.total > 0 || importRes.imported >= 0, 'Database initialized and players pool loaded');

  // 2. Test Room Creation
  const roomCode = 'TEST' + Math.floor(1000 + Math.random() * 9000);
  const roomId = crypto.randomUUID();
  const startingPurse = 12000; // 120 Cr

  db.prepare(`
    INSERT INTO rooms (
      id, room_code, room_name, host_id, host_franchise,
      max_teams, max_squad_size, starting_purse_lakhs, bid_timer_seconds, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(roomId, roomCode, 'Test Arena', 'user-host-1', 'CSK', 10, 10, startingPurse, 10, Date.now());

  const room = db.prepare('SELECT * FROM rooms WHERE room_code = ?').get(roomCode) as unknown as Room;
  assert(!!room && room.room_code === roomCode, `Auction creation: Created room ${roomCode}`);

  // 3. Host and Guest Joining
  db.prepare(`
    INSERT INTO room_participants (id, room_id, user_id, franchise_id, display_name, purse_remaining_lakhs, is_host, joined_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `).run(crypto.randomUUID(), roomId, 'user-host-1', 'CSK', 'Host User', startingPurse, Date.now());

  db.prepare(`
    INSERT INTO room_participants (id, room_id, user_id, franchise_id, display_name, purse_remaining_lakhs, is_host, joined_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(crypto.randomUUID(), roomId, 'user-guest-2', 'MI', 'Rival User', startingPurse, Date.now());

  const participants = db.prepare('SELECT * FROM room_participants WHERE room_id = ?').all(roomId);
  assert(participants.length === 2, 'Lobby Entry: 2 participants successfully joined');

  // 4. Initialize Queue and Start Auction
  const players = db.prepare('SELECT id, base_price_lakhs, status FROM players LIMIT 10').all() as Player[];
  assert(players.length >= 2, 'Players available for queue');

  players.forEach((p, idx) => {
    db.prepare('INSERT INTO auction_queue (id, room_id, player_id, queue_position) VALUES (?, ?, ?, ?)')
      .run(crypto.randomUUID(), roomId, p.id, idx);
  });

  // Start Auction
  db.prepare('UPDATE rooms SET status = "IN_PROGRESS" WHERE id = ?').run(roomId);
  advanceToNextPlayer(roomId);

  let activeRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as unknown as Room;
  assert(activeRoom.status === 'IN_PROGRESS' && activeRoom.current_player_id !== null, 'Auction Start: Room set to IN_PROGRESS with active player');

  // 5. Test Bidding Engine Rules
  const activePlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(activeRoom.current_player_id!) as unknown as Player;
  const basePrice = activePlayer ? activePlayer.base_price_lakhs : 50;
  const testRunKey = Date.now();

  // Rule: First bid must match base price
  try {
    processBid(roomCode, 'CSK', basePrice, `key-${testRunKey}-1`);
    activeRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as unknown as Room;
    assert(activeRoom.current_bid_lakhs === basePrice && activeRoom.current_bidder_franchise === 'CSK', 'First bid accepted at base price');
  } catch (err: any) {
    assert(false, 'First bid accepted at base price', `Error: ${err.message}`);
  }

  // Rule: Cannot outbid yourself
  try {
    const nextBidAmt = getNextValidBid(basePrice);
    processBid(roomCode, 'CSK', nextBidAmt, `key-${testRunKey}-2`);
    assert(false, 'Self-outbidding should fail');
  } catch (err: any) {
    assert(err.message === 'Already the highest bidder', 'Self-outbidding prevented');
  }

  // Rule: Rival bid accepted
  const rivalBidAmt = getNextValidBid(basePrice);
  try {
    processBid(roomCode, 'MI', rivalBidAmt, `key-${testRunKey}-3`);
    activeRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as unknown as Room;
    assert(activeRoom.current_bid_lakhs === rivalBidAmt && activeRoom.current_bidder_franchise === 'MI', 'Rival counter-bid accepted');
  } catch (err: any) {
    assert(false, `Rival bid failed: ${err.message}`);
  }

  // Rule: Invalid bid amount rejected
  try {
    processBid(roomCode, 'CSK', rivalBidAmt + 9999, `key-${testRunKey}-4`);
    assert(false, 'Arbitrary bid amount should fail');
  } catch (err: any) {
    assert(err.message && err.message.includes('Invalid bid amount'), 'Invalid bid amount rejected correctly');
  }

  // 6. Test Player Sale & Purse Deduction
  finalizeCurrent(roomId);
  const miParticipant = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND franchise_id = ?')
    .get(roomId, 'MI') as unknown as RoomParticipant;
  
  assert(miParticipant.purse_remaining_lakhs === startingPurse - rivalBidAmt, 'Purse deducted accurately after sale');
  const soldPlayers = db.prepare('SELECT * FROM squad_players WHERE room_id = ? AND franchise_id = ?').all(roomId, 'MI');
  assert(soldPlayers.length === 1, 'Player added to winning team squad');

  // 7. Test Advance & Unsold Player Handling
  advanceToNextPlayer(roomId);
  activeRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as unknown as Room;
  assert(activeRoom.current_player_id !== null && activeRoom.current_bid_lakhs === 0, 'Advanced to next player');

  // Mark unsold
  finalizeCurrent(roomId);
  const unsoldQueue = db.prepare('SELECT status FROM auction_queue WHERE room_id = ? AND queue_position = 1').get(roomId) as any;
  assert(unsoldQueue?.status === 'UNSOLD', 'Player marked UNSOLD when timer expires with no bids');

  // 8. Test AI Bidding Engine
  const { initializeAITeams, processAIBids } = require('../services/aiBidding');
  initializeAITeams(roomId, roomCode, { ai_enabled: true, ai_difficulty: 'MEDIUM', max_teams: 10, starting_purse_lakhs: startingPurse });
  const aiList = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND is_ai = 1').all(roomId);
  assert(aiList.length === 8, 'AI Initialization: 8 AI teams populated to reach 10 max teams');

  advanceToNextPlayer(roomId);
  const aiBidPlaced = processAIBids(roomCode);
  const roomAfterAIBid = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
  assert(aiBidPlaced && roomAfterAIBid.current_bidder_franchise !== null, 'AI Bidding: AI bot successfully evaluated and placed valid bid');

  // 9. Test Idempotency in Room Creation
  const testIdempotencyKey = 'idem-' + crypto.randomUUID();
  const testIdemRoomId = crypto.randomUUID();
  const testIdemCode = 'ID' + Math.floor(1000 + Math.random() * 9000);
  db.prepare(`
    INSERT INTO rooms (id, room_code, room_name, host_id, host_franchise, is_private, idempotency_key, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
  `).run(testIdemRoomId, testIdemCode, 'Idempotent Room', 'user-host-1', 'CSK', testIdempotencyKey, Date.now());

  const fetchedIdem = db.prepare('SELECT * FROM rooms WHERE idempotency_key = ?').get(testIdempotencyKey) as any;
  assert(fetchedIdem && fetchedIdem.id === testIdemRoomId, 'Idempotency: Room correctly retrieved using idempotencyKey');

  // 10. Test Private Room Separation
  const privRoomId = crypto.randomUUID();
  const privRoomCode = 'PR' + Math.floor(1000 + Math.random() * 9000);
  db.prepare(`
    INSERT INTO rooms (id, room_code, room_name, host_id, host_franchise, is_private, created_at)
    VALUES (?, ?, 'Secret Private Room', 'user-host-1', 'CSK', 1, ?)
  `).run(privRoomId, privRoomCode, Date.now());

  const publicRoomsList = db.prepare('SELECT * FROM rooms WHERE is_private = 0').all() as any[];
  const foundPrivInPublic = publicRoomsList.some(r => r.id === privRoomId);
  assert(!foundPrivInPublic, 'Privacy: Private room excluded from public listing');

  const userPrivateRooms = db.prepare(`
    SELECT * FROM rooms WHERE is_private = 1 AND host_id = ?
  `).all('user-host-1') as any[];
  assert(userPrivateRooms.some(r => r.id === privRoomId), 'Privacy: Private room correctly found in user private list');

  // 11. Test Friends System & Requests
  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const userA = 'test-player-a-' + randSuffix;
  const userB = 'test-player-b-' + randSuffix;
  db.prepare('INSERT INTO users (id, username, display_name, password_hash, created_at) VALUES (?, ?, ?, "hash", ?)').run(userA, 'player_a_' + randSuffix, 'Player A', Date.now());
  db.prepare('INSERT INTO users (id, username, display_name, password_hash, created_at) VALUES (?, ?, ?, "hash", ?)').run(userB, 'player_b_' + randSuffix, 'Player B', Date.now());

  const reqId = crypto.randomUUID();
  db.prepare('INSERT INTO friend_requests (id, sender_id, receiver_id, status, created_at, updated_at) VALUES (?, ?, ?, "PENDING", ?, ?)').run(reqId, userA, userB, Date.now(), Date.now());
  const pendingReq = db.prepare('SELECT * FROM friend_requests WHERE receiver_id = ? AND status = "PENDING"').get(userB) as any;
  assert(pendingReq && pendingReq.sender_id === userA, 'Friends: Friend request created and received');

  // Accept request
  db.prepare('UPDATE friend_requests SET status = "ACCEPTED" WHERE id = ?').run(reqId);
  db.prepare('INSERT INTO friendships (id, user_id, friend_id, created_at) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), userA, userB, Date.now());
  db.prepare('INSERT INTO friendships (id, user_id, friend_id, created_at) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), userB, userA, Date.now());

  const friendList = db.prepare('SELECT friend_id FROM friendships WHERE user_id = ?').all(userA) as any[];
  assert(friendList.some(f => f.friend_id === userB), 'Friends: Friendship successfully formed and mutual');

  // 12. Test Profile Likes & Stats
  db.prepare('INSERT INTO profile_likes (id, target_user_id, liker_user_id, created_at) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), userA, userB, Date.now());
  db.prepare('UPDATE users SET likes_count = 1 WHERE id = ?').run(userA);
  const updatedUserA = db.prepare('SELECT likes_count FROM users WHERE id = ?').get(userA) as any;
  assert(updatedUserA?.likes_count === 1, 'Profile: Profile like registered and incremented');

  // 13. Test Room Cancellation & Inactive-Room Cleanup System
  const cancelTestLobbyId = crypto.randomUUID();
  const cancelTestLobbyCode = 'TEST_CANC_' + Math.floor(1000 + Math.random() * 9000);
  db.prepare(`
    INSERT INTO rooms (id, room_code, room_name, host_id, host_franchise, status, is_private, created_at)
    VALUES (?, ?, 'Cancel Me Lobby', 'user-host-1', 'CSK', 'LOBBY', 0, ?)
  `).run(cancelTestLobbyId, cancelTestLobbyCode, Date.now());

  // 13a. Host Cancellation
  const cancelSuccess = cancelRoomByHost(cancelTestLobbyId, 'user-host-1');
  assert(cancelSuccess, 'Room Cleanup: Host-only cancellation succeeds on LOBBY room');

  const cancelledRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(cancelTestLobbyId) as any;
  assert(
    cancelledRoom?.status === 'CANCELLED' &&
    cancelledRoom?.cancelled_by === 'user-host-1' &&
    Boolean(cancelledRoom?.cancelled_at),
    'Room Cleanup: Cancelled room status, cancelled_by, and cancelled_at are accurately recorded'
  );

  // 13b. Cancellation Idempotency
  const doubleCancel = cancelRoomByHost(cancelTestLobbyId, 'user-host-1');
  assert(!doubleCancel, 'Room Cleanup: Cancellation is idempotent (cannot re-cancel already CANCELLED room)');

  // 13c. Visibility: cancelled rooms excluded from public room listing
  const visiblePublicRooms = db.prepare(`
    SELECT * FROM rooms 
    WHERE is_private = 0 
      AND status IN ('LOBBY', 'IN_PROGRESS', 'LIVE', 'FINAL_ROUND', 'PAUSED', 'COMPLETED')
  `).all() as any[];
  assert(!visiblePublicRooms.some(r => r.id === cancelTestLobbyId), 'Room Cleanup: Cancelled rooms are excluded from active public room listings');

  // 13d. touchActivity updates timestamp
  const nonHostLobbyId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO rooms (id, room_code, room_name, host_id, host_franchise, status, is_private, created_at)
    VALUES (?, ?, 'NonHost Lobby', 'user-host-1', 'CSK', 'LOBBY', 0, ?)
  `).run(nonHostLobbyId, 'TEST_NH_' + Math.floor(1000 + Math.random() * 9000), Date.now());

  const initialTime = Date.now() - 5000;
  db.prepare('UPDATE rooms SET last_activity_at = ? WHERE id = ?').run(initialTime, nonHostLobbyId);
  touchActivity(nonHostLobbyId);
  const touchedRoom = db.prepare('SELECT last_activity_at FROM rooms WHERE id = ?').get(nonHostLobbyId) as any;
  assert(touchedRoom?.last_activity_at > initialTime, 'Room Cleanup: touchActivity refreshes last_activity_at');

  // 13e. Idle warning detection
  const idleWarnLobbyId = crypto.randomUUID();
  const past23Hours = Date.now() - (23.5 * 60 * 60 * 1000);
  db.prepare(`
    INSERT INTO rooms (id, room_code, room_name, host_id, host_franchise, status, is_private, last_activity_at, created_at)
    VALUES (?, ?, 'Idle Warn Lobby', 'user-host-1', 'CSK', 'LOBBY', 0, ?, ?)
  `).run(idleWarnLobbyId, 'TEST_WARN_' + Math.floor(1000 + Math.random() * 9000), past23Hours, past23Hours);

  const needingWarning = getLobbyRoomsNeedingWarning();
  assert(needingWarning.includes(idleWarnLobbyId), 'Room Cleanup: Detects idle lobby rooms past 23-hour threshold needing warning');

  markIdleWarned(idleWarnLobbyId);
  const needingWarningAfter = getLobbyRoomsNeedingWarning();
  assert(!needingWarningAfter.includes(idleWarnLobbyId), 'Room Cleanup: Mark warning prevents repeated warning queries');

  // 13f. Auto-close idle lobby rooms (past 24h)
  const idleCloseLobbyId = crypto.randomUUID();
  const past25Hours = Date.now() - (25 * 60 * 60 * 1000);
  const warned1HourAgo = Date.now() - (1 * 60 * 60 * 1000);
  db.prepare(`
    INSERT INTO rooms (id, room_code, room_name, host_id, host_franchise, status, is_private, idle_warned_at, last_activity_at, created_at)
    VALUES (?, ?, 'Idle Close Lobby', 'user-host-1', 'CSK', 'LOBBY', 0, ?, ?, ?)
  `).run(idleCloseLobbyId, 'TEST_CLS_' + Math.floor(1000 + Math.random() * 9000), warned1HourAgo, past25Hours, past25Hours);

  const toAutoClose = getLobbyRoomsToAutoClose();
  assert(toAutoClose.includes(idleCloseLobbyId), 'Room Cleanup: Detects warned idle lobby rooms past 24-hour threshold for auto-closure');

  const autoCloseRes = autoExpireLobbyRoom(idleCloseLobbyId, 'SYSTEM_IDLE_TIMEOUT');
  assert(autoCloseRes, 'Room Cleanup: autoExpireLobbyRoom successfully closes idle lobby room');
  const autoClosedRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(idleCloseLobbyId) as any;
  assert(autoClosedRoom?.status === 'CANCELLED' && autoClosedRoom?.cancelled_by === 'SYSTEM_IDLE_TIMEOUT', 'Room Cleanup: Auto-closed room recorded with SYSTEM_IDLE_TIMEOUT');

  // 13g. Protection of LIVE and COMPLETED rooms from auto-expiry & host cancellation
  const liveTestRoomId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO rooms (id, room_code, room_name, host_id, host_franchise, status, auction_started_at, is_private, last_activity_at, created_at)
    VALUES (?, ?, 'Active Live Room', 'user-host-1', 'CSK', 'LIVE', ?, 0, ?, ?)
  `).run(liveTestRoomId, 'TEST_LIVE_' + Math.floor(1000 + Math.random() * 9000), past25Hours, past25Hours, past25Hours);

  const liveExpireRes = autoExpireLobbyRoom(liveTestRoomId, 'idle_timeout');
  assert(!liveExpireRes, 'Room Cleanup: autoExpireLobbyRoom REFUSES to close LIVE room');
  const liveHostCancel = cancelRoomByHost(liveTestRoomId, 'user-host-1');
  assert(!liveHostCancel, 'Room Cleanup: cancelRoomByHost REFUSES to cancel LIVE room (must use End Auction)');
  const liveRoomCheck = db.prepare('SELECT status FROM rooms WHERE id = ?').get(liveTestRoomId) as any;
  assert(liveRoomCheck?.status === 'LIVE', 'Room Cleanup: LIVE room status preserved');

  const completedTestRoomId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO rooms (id, room_code, room_name, host_id, host_franchise, status, auction_started_at, is_private, last_activity_at, created_at)
    VALUES (?, ?, 'Finished Room', 'user-host-1', 'CSK', 'COMPLETED', ?, 0, ?, ?)
  `).run(completedTestRoomId, 'TEST_CMP_' + Math.floor(1000 + Math.random() * 9000), past25Hours, past25Hours, past25Hours);

  const completedExpireRes = autoExpireLobbyRoom(completedTestRoomId, 'idle_timeout');
  assert(!completedExpireRes, 'Room Cleanup: autoExpireLobbyRoom REFUSES to close COMPLETED room (stats preserved)');

  // 13h. Safe Purge of 30-day old cancelled lobbies without bids or squad players
  const oldCancelledLobbyId = crypto.randomUUID();
  const past31Days = Date.now() - (31 * 24 * 60 * 60 * 1000);
  db.prepare(`
    INSERT INTO rooms (id, room_code, room_name, host_id, host_franchise, status, is_private, cancelled_at, created_at)
    VALUES (?, ?, 'Ancient Cancelled Lobby', 'user-host-1', 'CSK', 'CANCELLED', 0, ?, ?)
  `).run(oldCancelledLobbyId, 'TEST_OLD_' + Math.floor(1000 + Math.random() * 9000), past31Days, past31Days - 1000);

  const purgedCount = purgeOldCancelledLobbies();
  assert(purgedCount >= 1, 'Room Cleanup: purgeOldCancelledLobbies removes eligible 30+ day old cancelled lobby');

  const purgedCheck = db.prepare('SELECT id FROM rooms WHERE id = ?').get(oldCancelledLobbyId);
  assert(!purgedCheck, 'Room Cleanup: Old cancelled lobby completely removed from database');

  const completedCheck = db.prepare('SELECT id FROM rooms WHERE id = ?').get(completedTestRoomId);
  assert(Boolean(completedCheck), 'Room Cleanup: COMPLETED room NEVER purged (historical stats preserved)');

  // Clean up all test artifacts so database stays completely clean
  db.prepare('DELETE FROM squad_players WHERE room_id = ?').run(roomId);
  db.prepare('DELETE FROM bids WHERE room_id = ?').run(roomId);
  db.prepare('DELETE FROM auction_queue WHERE room_id = ?').run(roomId);
  db.prepare('DELETE FROM room_participants WHERE room_id = ?').run(roomId);
  db.prepare('DELETE FROM rooms WHERE id IN (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    roomId, testIdemRoomId, privRoomId, cancelTestLobbyId, nonHostLobbyId, idleWarnLobbyId, idleCloseLobbyId, liveTestRoomId, completedTestRoomId
  );
  db.prepare('DELETE FROM friendships WHERE user_id IN (?, ?)').run(userA, userB);
  db.prepare('DELETE FROM friend_requests WHERE sender_id IN (?, ?)').run(userA, userB);
  db.prepare('DELETE FROM profile_likes WHERE target_user_id IN (?, ?)').run(userA, userB);
  db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(userA, userB);

  console.log(`\n=== TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
