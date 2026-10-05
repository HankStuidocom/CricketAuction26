import { Server } from 'socket.io';
import {
  Room,
  GameTeam,
  AuctionState,
  Player,
  SoldEvent,
} from '../types';

/** Minimum bid increment in Lakhs */
const BID_INCREMENT = 10;

/**
 * AuctionEngine manages the lifecycle of a single auction session inside a Room.
 * It owns the per-room timer and emits Socket.io events to the room channel.
 */
export class AuctionEngine {
  private io: Server;
  /** roomCode → NodeJS.Timeout */
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  // ─────────────────────────────────────────────────────────
  //  Public API
  // ─────────────────────────────────────────────────────────

  /** Initialise auction state on a room and show the first player. */
  startAuction(room: Room): void {
    room.status = 'auction';
    room.currentAuction = {
      currentPlayerIndex: -1,
      currentPlayer: null,
      currentBid: 0,
      currentBidderId: null,
      timerSeconds: room.settings.auctionTimer,
      isActive: true,
      isPaused: false,
      soldPlayers: [],
      unsoldPlayers: [],
      skippedPlayerIds: [],
    };
    this.nextPlayer(room);
  }

  /** Advance to the next player in the pool. */
  nextPlayer(room: Room): void {
    this.clearTimer(room.code);

    if (!room.currentAuction) return;
    const auction = room.currentAuction;

    // Find next unsold, unskipped player
    const remaining = room.playerPool.filter(
      (p) =>
        !p.isSold &&
        !auction.skippedPlayerIds.includes(p.id)
    );

    if (remaining.length === 0 || this.isAuctionComplete(room)) {
      this.finalizeAuction(room);
      return;
    }

    const player = remaining[0];
    auction.currentPlayerIndex = room.playerPool.indexOf(player);
    auction.currentPlayer = player;
    auction.currentBid = player.basePrice;
    auction.currentBidderId = null;
    auction.timerSeconds = room.settings.auctionTimer;

    this.io.to(room.code).emit('auction:playerShown', {
      player,
      currentBid: auction.currentBid,
      timerSeconds: auction.timerSeconds,
    });

    this.startTimer(room);
  }

  /**
   * Place a bid for a team.
   * Returns `{ success: true }` or `{ success: false, reason: string }`.
   */
  placeBid(
    room: Room,
    teamId: string,
    amount: number
  ): { success: boolean; reason?: string } {
    if (!room.currentAuction) return { success: false, reason: 'No active auction' };
    const auction = room.currentAuction;

    if (!auction.isActive || auction.isPaused) {
      return { success: false, reason: 'Auction is not active' };
    }

    if (!auction.currentPlayer) {
      return { success: false, reason: 'No current player' };
    }

    const team = room.teams.find((t) => t.id === teamId);
    if (!team) return { success: false, reason: 'Team not found' };

    const validation = this.validateBid(room, team, amount);
    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    // Bid accepted
    auction.currentBid = amount;
    auction.currentBidderId = teamId;

    // Reset timer on new bid
    this.resetTimer(room);

    const event = {
      teamId,
      teamName: team.managerName,
      iplTeamId: team.iplTeamId,
      playerId: auction.currentPlayer.id,
      amount,
      timestamp: Date.now(),
    };

    this.io.to(room.code).emit('auction:bidPlaced', event);
    return { success: true };
  }

  /**
   * Validate a bid against all game rules.
   */
  validateBid(
    room: Room,
    team: GameTeam,
    amount: number
  ): { valid: boolean; reason?: string } {
    const auction = room.currentAuction!;

    if (amount <= auction.currentBid) {
      return { valid: false, reason: `Bid must be greater than current bid of ${auction.currentBid}L` };
    }

    if (amount < auction.currentBid + BID_INCREMENT) {
      return {
        valid: false,
        reason: `Minimum increment is ${BID_INCREMENT}L. Minimum bid: ${auction.currentBid + BID_INCREMENT}L`,
      };
    }

    const reserve = this.calculateMinReserve(team, room);
    if (team.purse - amount < reserve) {
      return {
        valid: false,
        reason: `Insufficient purse. Must keep at least ${reserve}L in reserve.`,
      };
    }

    if (team.players.length >= room.settings.maxSquadSize) {
      return { valid: false, reason: 'Squad is full' };
    }

    if (team.id === auction.currentBidderId) {
      return { valid: false, reason: 'You are already the highest bidder' };
    }

    return { valid: true };
  }

  /** Finalise the sale of the current player. */
  soldPlayer(room: Room): void {
    const auction = room.currentAuction;
    if (!auction || !auction.currentPlayer) return;

    const player = auction.currentPlayer;
    const buyingTeam = room.teams.find((t) => t.id === auction.currentBidderId);

    if (!buyingTeam) {
      // Nobody bid — mark unsold and move on
      auction.unsoldPlayers.push(player);
      this.io.to(room.code).emit('auction:unsold', { player });
      this.nextPlayer(room);
      return;
    }

    // Update player
    player.isSold = true;
    player.soldTo = buyingTeam.id;
    player.soldPrice = auction.currentBid;

    // Update team
    buyingTeam.purse -= auction.currentBid;
    buyingTeam.players.push({ ...player });

    const soldEvent: SoldEvent = {
      player: { ...player },
      teamId: buyingTeam.id,
      teamName: buyingTeam.managerName,
      soldPrice: auction.currentBid,
      timestamp: Date.now(),
    };

    auction.soldPlayers.push(soldEvent);

    this.io.to(room.code).emit('auction:sold', soldEvent);

    // Broadcast updated purse for the buying team
    this.io.to(room.code).emit('auction:teamUpdated', {
      teamId: buyingTeam.id,
      purse: buyingTeam.purse,
      players: buyingTeam.players,
    });

    this.nextPlayer(room);
  }

  /**
   * Skip the current player (host action).
   * The player goes to the skipped list and can be re-auctioned at the end.
   */
  skipPlayer(room: Room): void {
    const auction = room.currentAuction;
    if (!auction || !auction.currentPlayer) return;
    auction.skippedPlayerIds.push(auction.currentPlayer.id);
    this.io.to(room.code).emit('auction:skipped', { player: auction.currentPlayer });
    this.nextPlayer(room);
  }

  /** Pause the auction timer (host only). */
  pauseAuction(room: Room): void {
    if (!room.currentAuction) return;
    room.currentAuction.isPaused = true;
    this.clearTimer(room.code);
    this.io.to(room.code).emit('auction:paused', {
      timerSeconds: room.currentAuction.timerSeconds,
    });
  }

  /** Resume the auction timer (host only). */
  resumeAuction(room: Room): void {
    if (!room.currentAuction || !room.currentAuction.isPaused) return;
    room.currentAuction.isPaused = false;
    this.io.to(room.code).emit('auction:resumed', {
      timerSeconds: room.currentAuction.timerSeconds,
    });
    this.startTimer(room);
  }

  /**
   * Calculate the minimum purse reserve a team must maintain.
   * Teams need enough money to buy at least (minSquad - current) players
   * at the lowest base price (25L each).
   */
  calculateMinReserve(team: GameTeam, room: Room): number {
    const playersNeeded = Math.max(
      0,
      room.settings.minSquadSize - team.players.length - 1
    );
    return playersNeeded * 25; // D-tier minimum
  }

  /** Returns true when the auction should end. */
  isAuctionComplete(room: Room): boolean {
    if (!room.currentAuction) return false;
    const auction = room.currentAuction;

    // All teams are full
    const allFull = room.teams.every(
      (t) => t.players.length >= room.settings.maxSquadSize
    );
    if (allFull) return true;

    // No remaining players to sell
    const remaining = room.playerPool.filter(
      (p) => !p.isSold && !auction.skippedPlayerIds.includes(p.id)
    );
    return remaining.length === 0;
  }

  // ─────────────────────────────────────────────────────────
  //  Timer Management
  // ─────────────────────────────────────────────────────────

  private startTimer(room: Room): void {
    this.clearTimer(room.code);

    if (!room.currentAuction) return;
    const auction = room.currentAuction;

    let ticksRemaining = auction.timerSeconds;

    const interval = setInterval(() => {
      if (auction.isPaused || !auction.isActive) return;

      ticksRemaining--;
      auction.timerSeconds = ticksRemaining;

      // Warn at 5 seconds
      if (ticksRemaining === 5) {
        this.io.to(room.code).emit('auction:goingOnce', {
          currentBid: auction.currentBid,
          currentBidderId: auction.currentBidderId,
          timerSeconds: ticksRemaining,
        });
      }

      if (ticksRemaining === 3) {
        this.io.to(room.code).emit('auction:goingTwice', {
          currentBid: auction.currentBid,
          currentBidderId: auction.currentBidderId,
          timerSeconds: ticksRemaining,
        });
      }

      // Emit tick every second
      this.io.to(room.code).emit('auction:tick', { timerSeconds: ticksRemaining });

      if (ticksRemaining <= 0) {
        clearInterval(interval);
        this.timers.delete(room.code);
        this.soldPlayer(room);
      }
    }, 1000);

    this.timers.set(room.code, interval);
  }

  private resetTimer(room: Room): void {
    this.clearTimer(room.code);
    if (room.currentAuction) {
      room.currentAuction.timerSeconds = room.settings.auctionTimer;
      this.startTimer(room);
    }
  }

  private clearTimer(roomCode: string): void {
    const existing = this.timers.get(roomCode);
    if (existing) {
      clearInterval(existing);
      this.timers.delete(roomCode);
    }
  }

  // ─────────────────────────────────────────────────────────
  //  Finalize
  // ─────────────────────────────────────────────────────────

  private finalizeAuction(room: Room): void {
    this.clearTimer(room.code);
    if (room.currentAuction) {
      room.currentAuction.isActive = false;
      room.currentAuction.currentPlayer = null;
    }
    room.status = 'squad';

    this.io.to(room.code).emit('auction:complete', {
      soldPlayers: room.currentAuction?.soldPlayers ?? [],
      unsoldPlayers: room.currentAuction?.unsoldPlayers ?? [],
      teams: room.teams.map((t) => ({
        id: t.id,
        iplTeamId: t.iplTeamId,
        managerName: t.managerName,
        purse: t.purse,
        players: t.players,
      })),
    });
  }
}
