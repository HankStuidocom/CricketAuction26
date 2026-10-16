import db from '../database/db';
import { initializeDatabase } from '../database/schema';
import { importPlayersFromExcel } from '../services/importPlayers';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as ClientIO } from 'socket.io-client';
import { setupSocketHandlers } from '../socket/roomHandlers';
import crypto from 'crypto';
import path from 'path';

async function runSmokeTest() {
  console.log('--- Starting Multiplayer Lobby Smoke Test ---');
  await db.init();
  initializeDatabase();

  const excelPath = path.join(__dirname, '../../data/IPL_2026_Auction_Player_List.xlsx');
  importPlayersFromExcel();

  // Setup test server on port 3099
  const httpServer = createServer();
  const io = new Server(httpServer, { cors: { origin: '*' } });
  setupSocketHandlers(io);

  await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
  const port = (httpServer.address() as any).port;
  console.log(`Test Socket.IO server running on port ${port}`);

  const serverUrl = `http://localhost:${port}`;

  // Step 1: Create room in DB with Host (CSK)
  const roomCode = 'SMK' + Math.floor(1000 + Math.random() * 9000);
  const roomId = crypto.randomUUID();
  const startingPurse = 12000;
  const hostUserId = 'host-user-' + Math.floor(Math.random() * 1000);
  const friendUserId = 'friend-user-' + Math.floor(Math.random() * 1000);

  db.prepare(`
    INSERT INTO rooms (
      id, room_code, room_name, host_id, host_franchise,
      status, max_teams, max_squad_size, starting_purse_lakhs, bid_timer_seconds, created_at
    ) VALUES (?, ?, ?, ?, ?, 'LOBBY', 10, 10, ?, 10, ?)
  `).run(roomId, roomCode, 'Friend Smoke Test Room', hostUserId, 'CSK', startingPurse, Date.now());

  // Insert Host participant
  db.prepare(`
    INSERT INTO room_participants (id, room_id, user_id, franchise_id, display_name, purse_remaining_lakhs, is_host, joined_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `).run(crypto.randomUUID(), roomId, hostUserId, 'CSK', 'HostPlayer', startingPurse, Date.now());

  // Insert players into auction_queue
  const players = db.prepare('SELECT id FROM players LIMIT 5').all() as any[];
  const insertQueue = db.prepare('INSERT INTO auction_queue (id, room_id, player_id, queue_position, status) VALUES (?, ?, ?, ?, "PENDING")');
  players.forEach((p, idx) => {
    insertQueue.run(crypto.randomUUID(), roomId, p.id, idx);
  });

  console.log(`[PASS] Room created in DB: ${roomCode} with Host (CSK) and ${players.length} queued players`);

  // Client 1: Host
  const clientHost = ClientIO(serverUrl);
  // Client 2: Friend (Player B)
  const clientFriend = ClientIO(serverUrl);

  await Promise.all([
    new Promise((resolve) => clientHost.on('connect', () => resolve(true))),
    new Promise((resolve) => clientFriend.on('connect', () => resolve(true)))
  ]);
  console.log('[PASS] Both sockets connected');

  // Host joins room via socket
  await new Promise<void>((resolve) => {
    clientHost.once('room_joined', () => resolve());
    clientHost.emit('join_room', {
      roomCode,
      userId: hostUserId,
      franchise: 'CSK',
      displayName: 'HostPlayer'
    });
  });
  console.log('[PASS] Host joined socket room');

  // Step 2: Friend joins requesting 'CSK' (which is already taken by Host)
  // Verify server auto-assigns an open franchise (NOT CSK)
  let friendAssignedFranchise = '';
  await new Promise<void>((resolve) => {
    let hostSawUpdate = false;
    let friendSawSuccess = false;

    clientHost.once('participant_joined', () => {
      hostSawUpdate = true;
      if (hostSawUpdate && friendSawSuccess) resolve();
    });

    clientFriend.once('join_handshake_success', (data: any) => {
      friendAssignedFranchise = data.franchise;
      console.log(`[PASS] Friend joined and auto-assigned open franchise: ${friendAssignedFranchise}`);
      friendSawSuccess = true;
      if (hostSawUpdate && friendSawSuccess) resolve();
    });

    clientFriend.emit('join_room', {
      roomCode,
      userId: friendUserId,
      franchise: 'CSK', // deliberate collision
      displayName: 'FriendPlayer'
    });
  });

  if (friendAssignedFranchise === 'CSK') {
    throw new Error('Collision failed: Friend should NOT be assigned CSK when Host already owns it');
  }

  // Verify participant count is now 2 in DB
  const participants = db.prepare('SELECT * FROM room_participants WHERE room_id = ?').all(roomId) as any[];
  console.log(`[PASS] Total participants in room: ${participants.length}/10`);
  if (participants.length !== 2) throw new Error(`Expected 2 participants, got ${participants.length}`);

  // Step 3: Friend switches franchise to 'RCB' in lobby
  await new Promise<void>((resolve) => {
    clientFriend.once('franchise_switched', (data: any) => {
      console.log(`[PASS] Friend switched franchise to: ${data.newFranchise}`);
      if (data.newFranchise !== 'RCB') throw new Error(`Expected RCB, got ${data.newFranchise}`);
      resolve();
    });
    clientFriend.emit('switch_franchise', {
      roomCode,
      userId: friendUserId,
      newFranchise: 'RCB',
      displayName: 'FriendPlayer'
    });
  });

  // Step 4: Host clicks Fill with Bots
  await new Promise<void>((resolve) => {
    let hostSawState = false;
    let friendSawState = false;

    const checkDone = () => {
      if (hostSawState && friendSawState) resolve();
    };

    clientHost.once('room_state', (state: any) => {
      const bots = state.participants.filter((p: any) => p.is_ai);
      console.log(`[PASS] Host received room_state with ${bots.length} AI bots (Total: ${state.participants.length}/10)`);
      hostSawState = true;
      checkDone();
    });

    clientFriend.once('room_state', (state: any) => {
      const bots = state.participants.filter((p: any) => p.is_ai);
      console.log(`[PASS] Friend received room_state with ${bots.length} AI bots (Total: ${state.participants.length}/10)`);
      friendSawState = true;
      checkDone();
    });

    clientHost.emit('host_fill_ai', { roomCode });
  });

  // Verify DB now has 10 participants (2 humans + 8 bots)
  const fullParticipants = db.prepare('SELECT * FROM room_participants WHERE room_id = ?').all(roomId) as any[];
  console.log(`[PASS] Full participants count in DB: ${fullParticipants.length}/10`);
  if (fullParticipants.length !== 10) throw new Error(`Expected 10 participants, got ${fullParticipants.length}`);

  // Step 5: Start auction with 2 players + bots
  await new Promise<void>((resolve) => {
    clientHost.once('auction_started', () => {
      console.log('[PASS] Host received auction_started event');
    });
    clientFriend.once('auction_started', () => {
      console.log('[PASS] Friend received auction_started event');
      resolve();
    });
    clientHost.emit('start_auction', { roomCode, userId: hostUserId });
  });

  // Verify room is now LIVE in DB
  const liveRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
  console.log(`[PASS] Room status in DB: ${liveRoom.status}`);
  if (liveRoom.status !== 'LIVE') throw new Error(`Expected LIVE, got ${liveRoom.status}`);

  // Clean up test room and participants
  db.prepare('DELETE FROM room_participants WHERE room_id = ?').run(roomId);
  db.prepare('DELETE FROM auction_queue WHERE room_id = ?').run(roomId);
  db.prepare('DELETE FROM rooms WHERE id = ?').run(roomId);

  clientHost.disconnect();
  clientFriend.disconnect();
  httpServer.close();

  console.log('--- ALL MULTIPLAYER SMOKE TESTS PASSED! ---');
  process.exit(0);
}

runSmokeTest().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
