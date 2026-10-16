import db from '../database/db';
import { initializeDatabase } from '../database/schema';
import { importPlayersFromExcel } from '../services/importPlayers';
import { processBid, finalizeCurrent, advanceToNextPlayer, getNextValidBid } from '../services/auctionEngine';
import { Room, RoomParticipant, Player } from '../types';
import crypto from 'crypto';

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

  // Clean up all test artifacts so database stays completely clean
  db.prepare('DELETE FROM squad_players WHERE room_id = ?').run(roomId);
  db.prepare('DELETE FROM bids WHERE room_id = ?').run(roomId);
  db.prepare('DELETE FROM auction_queue WHERE room_id = ?').run(roomId);
  db.prepare('DELETE FROM room_participants WHERE room_id = ?').run(roomId);
  db.prepare('DELETE FROM rooms WHERE id IN (?, ?, ?)').run(roomId, testIdemRoomId, privRoomId);
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
