import { Server, Socket } from 'socket.io';
import { Room, GameTeam } from '../types';
import { AuctionEngine } from '../engine/auctionEngine';
import { getAIBid } from '../ai/aiTeam';
import { simulateLeague } from '../engine/t20Simulator';
import { calculateTeamRating, calculateFinalScore } from '../engine/teamRating';

export function registerAuctionHandlers(
  io: Server,
  socket: Socket,
  rooms: Map<string, Room>,
  auctionEngine: AuctionEngine
): void {

  // Helper to resolve room code
  const getRoom = (data: { code?: string; roomCode?: string }): Room | undefined => {
    const raw = data.code || data.roomCode || '';
    return rooms.get(raw.toUpperCase());
  };

  // ── startAuction ────────────────────────────────────────
  socket.on(
    'startAuction',
    (
      data: { code?: string; roomCode?: string },
      callback?: (res: { success: boolean; error?: string }) => void
    ) => {
      const room = getRoom(data);
      if (!room) {
        if (callback) callback({ success: false, error: 'Room not found' });
        return;
      }
      if (room.hostId !== socket.id) {
        if (callback) callback({ success: false, error: 'Host only' });
        return;
      }
      if (room.status !== 'lobby') {
        if (callback) callback({ success: false, error: 'Auction already in progress' });
        return;
      }

      const humanTeams = room.teams.filter((t) => !t.isAI);
      const allReady = humanTeams.every((t) => t.isReady || t.id === room.hostId);
      if (!allReady) {
        if (callback) callback({ success: false, error: 'Not all teams are ready' });
        return;
      }

      auctionEngine.startAuction(room);
      io.to(room.code).emit('auctionStarted', { code: room.code });
      if (callback) callback({ success: true });

      // Schedule AI bids whenever a player is shown
      setupAIBidding(io, room, auctionEngine);
    }
  );

  // ── bid / placeBid ──────────────────────────────────────
  const handleBid = (
    data: { code?: string; roomCode?: string; amount: number },
    callback?: (res: { success: boolean; error?: string }) => void
  ) => {
    const room = getRoom(data);
    if (!room) {
      if (callback) callback({ success: false, error: 'Room not found' });
      return;
    }
    if (room.status !== 'auction') {
      if (callback) callback({ success: false, error: 'No active auction' });
      return;
    }

    const result = auctionEngine.placeBid(room, socket.id, data.amount);
    if (callback) callback(result);
  };

  socket.on('bid', handleBid);
  socket.on('placeBid', handleBid);

  // ── pauseAuction ────────────────────────────────────────
  socket.on(
    'pauseAuction',
    (
      data: { code?: string; roomCode?: string },
      callback?: (res: { success: boolean; error?: string }) => void
    ) => {
      const room = getRoom(data);
      if (!room) return callback?.({ success: false, error: 'Room not found' });
      if (room.hostId !== socket.id) return callback?.({ success: false, error: 'Host only' });

      auctionEngine.pauseAuction(room);
      if (callback) callback({ success: true });
    }
  );

  // ── resumeAuction ───────────────────────────────────────
  socket.on(
    'resumeAuction',
    (
      data: { code?: string; roomCode?: string },
      callback?: (res: { success: boolean; error?: string }) => void
    ) => {
      const room = getRoom(data);
      if (!room) return callback?.({ success: false, error: 'Room not found' });
      if (room.hostId !== socket.id) return callback?.({ success: false, error: 'Host only' });

      auctionEngine.resumeAuction(room);
      if (callback) callback({ success: true });
    }
  );

  // ── skipPlayer ──────────────────────────────────────────
  socket.on(
    'skipPlayer',
    (
      data: { code?: string; roomCode?: string },
      callback?: (res: { success: boolean; error?: string }) => void
    ) => {
      const room = getRoom(data);
      if (!room) return callback?.({ success: false, error: 'Room not found' });
      if (room.hostId !== socket.id) return callback?.({ success: false, error: 'Host only' });
      if (room.status !== 'auction') return callback?.({ success: false, error: 'No active auction' });

      auctionEngine.skipPlayer(room);
      if (callback) callback({ success: true });
    }
  );

  // ── lockSquad ───────────────────────────────────────────
  socket.on(
    'lockSquad',
    (
      data: {
        code?: string;
        roomCode?: string;
        captainId?: string;
        captain?: string;
        viceCaptainId?: string;
        viceCaptain?: string;
        squadIds?: string[];
        playingXI?: string[];
      },
      callback?: (res: { success: boolean; error?: string }) => void
    ) => {
      const room = getRoom(data);
      if (!room) return callback?.({ success: false, error: 'Room not found' });
      if (room.status !== 'squad') return callback?.({ success: false, error: 'Not in squad selection phase' });

      const team = room.teams.find((t) => t.id === socket.id);
      if (!team) return callback?.({ success: false, error: 'Team not found' });

      const chosenCaptain = data.captainId || data.captain || '';
      const chosenViceCaptain = data.viceCaptainId || data.viceCaptain || '';
      const chosenSquad = data.squadIds || data.playingXI || team.players.map((p) => p.id);

      // Validate squad size
      if (team.players.length > 0 && chosenSquad.length === 0) {
        return callback?.({ success: false, error: 'Must select squad players' });
      }

      team.captainId = chosenCaptain;
      team.viceCaptainId = chosenViceCaptain;
      team.isCaptainSet = true;

      if (callback) callback({ success: true });
      io.to(room.code).emit('room:squadLocked', { teamId: team.id });

      // Check if all human teams have locked
      const allLocked = room.teams.every((t) => t.isAI || t.isCaptainSet);
      if (allLocked) {
        for (const aiTeam of room.teams.filter((t) => t.isAI)) {
          autoAssignCaptain(aiTeam);
        }
        room.status = 'simulation';
        io.to(room.code).emit('room:status', { status: 'simulation' });

        // Auto-run simulation when all locked
        const result = simulateLeague(room.teams);
        const teamRatings = room.teams.map((t) => calculateTeamRating(t));
        const finalScores = room.teams.map((t) => ({
          teamId: t.id,
          score: calculateFinalScore(t, result.matches),
        }));
        room.status = 'results';

        const payload = {
          ...result,
          teamRatings,
          finalScores,
        };

        io.to(room.code).emit('simulation:results', payload);
        io.to(room.code).emit('simulationResult', payload);
      }
    }
  );

  // ── startSimulation ─────────────────────────────────────
  socket.on(
    'startSimulation',
    (
      data: { code?: string; roomCode?: string },
      callback?: (res: { success: boolean; error?: string }) => void
    ) => {
      const room = getRoom(data);
      if (!room) return callback?.({ success: false, error: 'Room not found' });
      if (room.hostId !== socket.id) return callback?.({ success: false, error: 'Host only' });

      // Run league simulation
      const result = simulateLeague(room.teams);
      const teamRatings = room.teams.map((t) => calculateTeamRating(t));
      const finalScores = room.teams.map((t) => ({
        teamId: t.id,
        score: calculateFinalScore(t, result.matches),
      }));

      room.status = 'results';

      const payload = {
        ...result,
        teamRatings,
        finalScores,
      };

      io.to(room.code).emit('simulation:results', payload);
      io.to(room.code).emit('simulationResult', payload);
      if (callback) callback({ success: true });
    }
  );

  // ── requestResults ──────────────────────────────────────
  socket.on(
    'requestResults',
    (
      data: { code?: string; roomCode?: string },
      callback?: (res: { success: boolean; error?: string; status?: string }) => void
    ) => {
      const room = getRoom(data);
      if (!room) return callback?.({ success: false, error: 'Room not found' });
      if (callback) callback({ success: true, status: room.status });
    }
  );
}

// ─────────────────────────────────────────────────────────────
//  AI Bidding Loop
// ─────────────────────────────────────────────────────────────

/**
 * Registers a listener on 'auction:playerShown' for AI teams.
 * Each time a new player comes up, AI teams evaluate and potentially bid.
 * AI teams also react to human bids via 'auction:bidPlaced'.
 */
function setupAIBidding(
  io: Server,
  room: Room,
  auctionEngine: AuctionEngine
): void {
  const aiTeams = room.teams.filter((t) => t.isAI);
  if (aiTeams.length === 0) return;

  /**
   * Trigger AI evaluation for all AI teams.
   * Each AI independently decides whether to bid.
   */
  const triggerAIBids = async (currentBidAfterEvent: number) => {
    if (!room.currentAuction?.isActive || room.currentAuction.isPaused) return;
    const player = room.currentAuction?.currentPlayer;
    if (!player) return;

    // Shuffle AI team order for fairness
    const shuffled = [...aiTeams].sort(() => Math.random() - 0.5);

    for (const aiTeam of shuffled) {
      // Skip if squad is full
      if (aiTeam.players.length >= room.settings.maxSquadSize) continue;
      // Skip if AI is already top bidder
      if (room.currentAuction?.currentBidderId === aiTeam.id) continue;

      const bidAmount = await getAIBid(room, aiTeam, currentBidAfterEvent, player);
      if (bidAmount !== null && room.currentAuction?.isActive) {
        const result = auctionEngine.placeBid(room, aiTeam.id, bidAmount);
        if (result.success) {
          // Re-trigger after placing a bid (allow other AI to counter)
          setTimeout(() => triggerAIBids(bidAmount), 200);
          break; // One AI bids at a time to keep it sequential
        }
      }
    }
  };

  // Listen for player shown events (new player up for auction)
  io.on('auction:playerShown', ({ player }) => {
    if (player) {
      setTimeout(() => triggerAIBids(player.basePrice), 500);
    }
  });

  // Register a direct in-process emitter hook via Socket.IO adapter
  // We use the room's namespace to subscribe to events
  const originalEmit = io.to(room.code).emit.bind(io.to(room.code));

  // Monkey-patch emit to intercept auction events for AI
  // This is done at the server level using the room's event bus
  room.currentAuction!.isActive = true; // ensure active

  // Start initial AI evaluation when the first player is shown
  // The auctionEngine will emit 'auction:playerShown' to the room
  // We set up a server-side listener via the socket adapter
  const ns = io.of('/');
  ns.adapter.on('broadcast', (packet: { nsp: string; data: unknown[] }) => {
    const [eventName, eventData] = packet.data as [string, Record<string, unknown>];
    if (eventName === 'auction:playerShown' && eventData) {
      triggerAIBids((eventData as { currentBid: number }).currentBid ?? 0);
    }
    if (eventName === 'auction:bidPlaced' && eventData) {
      const bidderId = (eventData as { teamId: string }).teamId;
      const amount = (eventData as { amount: number }).amount;
      // Trigger AI response to a human bid
      if (!aiTeams.some((t) => t.id === bidderId)) {
        setTimeout(() => triggerAIBids(amount), 300);
      }
    }
  });
}

// ─────────────────────────────────────────────────────────────
//  Auto-assign captain for AI teams
// ─────────────────────────────────────────────────────────────

function autoAssignCaptain(team: GameTeam): void {
  if (team.players.length === 0) return;
  const sorted = [...team.players].sort((a, b) => b.overallRating - a.overallRating);
  team.captainId = sorted[0].id;
  team.viceCaptainId = sorted[1]?.id ?? sorted[0].id;
  team.isCaptainSet = true;
}
