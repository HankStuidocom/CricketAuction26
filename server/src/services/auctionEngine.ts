import db from '../database/db';
import { Room, RoomParticipant, Player } from '../types';
import crypto from 'crypto';

export function getNextValidBid(currentBid: number): number {
  if (currentBid < 100) return currentBid + 10;
  if (currentBid < 500) return currentBid + 25;
  return currentBid + 50;
}

export function processBid(roomCode: string, franchiseId: string, amount: number, idempotencyKey: string) {
  const tx = db.transaction(() => {
    const roomRow = db.prepare('SELECT * FROM rooms WHERE room_code = ?').get(roomCode) as unknown as Room | undefined;
    if (!roomRow) throw new Error('Room not found');
    const isLive = roomRow.status === 'LIVE' || roomRow.status === 'IN_PROGRESS' || roomRow.status === 'FINAL_ROUND';
    if (!isLive) throw new Error('Auction is not in progress');

    if (roomRow.bid_deadline && Date.now() > roomRow.bid_deadline) {
      throw new Error('Bid deadline passed');
    }

    const participantRow = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND franchise_id = ?')
      .get(roomRow.id, franchiseId) as unknown as RoomParticipant | undefined;
    if (!participantRow) throw new Error('Participant not in room');

    const nextValidBid = roomRow.current_bid_lakhs === 0 ? 
      (db.prepare('SELECT base_price_lakhs FROM players WHERE id = ?').get(roomRow.current_player_id) as any)?.base_price_lakhs || 50
      : getNextValidBid(roomRow.current_bid_lakhs);

    if (amount !== nextValidBid) throw new Error('Invalid bid amount');
    if (roomRow.current_bidder_franchise === franchiseId) throw new Error('Already the highest bidder');

    const squadSize = db.prepare('SELECT COUNT(*) as count FROM squad_players WHERE room_id = ? AND franchise_id = ?')
      .get(roomRow.id, franchiseId) as { count: number };
    if (squadSize.count >= roomRow.max_squad_size) throw new Error('Squad is full');

    const osCountRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM squad_players sp
      JOIN players p ON p.id = sp.player_id
      WHERE sp.room_id = ? AND sp.franchise_id = ? AND p.status = 'OS'
    `).get(roomRow.id, franchiseId) as { count: number };

    const currentPlayer = db.prepare('SELECT status FROM players WHERE id = ?').get(roomRow.current_player_id) as unknown as Player | undefined;
    if (currentPlayer && currentPlayer.status === 'OS' && osCountRow.count >= 4) {
      throw new Error('Max overseas players reached (4)');
    }

    const minBasePrice = 50;
    const requiredPurse = amount + (roomRow.max_squad_size - squadSize.count - 1) * minBasePrice;
    if (participantRow.purse_remaining_lakhs < requiredPurse) {
      throw new Error('Insufficient purse for safe bidding');
    }

    const existingBid = db.prepare('SELECT id FROM bids WHERE idempotency_key = ?').get(idempotencyKey);
    if (existingBid && (existingBid as any).id) return roomRow; // Already processed

    db.prepare(`
      INSERT INTO bids (id, room_id, player_id, bidder_franchise, amount_lakhs, placed_at, idempotency_key)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(), roomRow.id, roomRow.current_player_id, franchiseId,
      amount, Date.now(), idempotencyKey
    );

    const newDeadline = roomRow.is_unlimited_timer ? null : Date.now() + (roomRow.bid_timer_seconds * 1000);
    db.prepare(`
      UPDATE rooms 
      SET current_bid_lakhs = ?, current_bidder_franchise = ?, bid_deadline = ?
      WHERE id = ?
    `).run(amount, franchiseId, newDeadline, roomRow.id);

    return db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomRow.id) as unknown as Room;
  });

  return tx();
}

export function finalizeCurrent(roomId: string) {
  const tx = db.transaction(() => {
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as unknown as Room | undefined;
    if (!room || !room.current_player_id) return null;

    if (room.current_bidder_franchise && room.current_bid_lakhs > 0) {
      db.prepare(`
        INSERT INTO squad_players (id, room_id, player_id, franchise_id, sold_price_lakhs, sold_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), room.id, room.current_player_id, room.current_bidder_franchise, room.current_bid_lakhs, Date.now());

      db.prepare(`
        UPDATE room_participants 
        SET purse_remaining_lakhs = purse_remaining_lakhs - ?,
            total_spent_lakhs = total_spent_lakhs + ?
        WHERE room_id = ? AND franchise_id = ?
      `).run(room.current_bid_lakhs, room.current_bid_lakhs, room.id, room.current_bidder_franchise);

      db.prepare(`UPDATE auction_queue SET status = 'SOLD' WHERE room_id = ? AND player_id = ?`)
        .run(room.id, room.current_player_id);
    } else {
      db.prepare(`UPDATE auction_queue SET status = 'UNSOLD' WHERE room_id = ? AND player_id = ?`)
        .run(room.id, room.current_player_id);
    }

    db.prepare(`
      UPDATE rooms 
      SET current_player_id = NULL, current_bid_lakhs = 0, current_bidder_franchise = NULL, bid_deadline = NULL
      WHERE id = ?
    `).run(room.id);

    return db.prepare('SELECT * FROM rooms WHERE id = ?').get(room.id) as unknown as Room;
  });
  return tx();
}

export function advanceToNextPlayer(roomId: string) {
  const tx = db.transaction(() => {
    const nextPlayer = db.prepare(`
      SELECT player_id FROM auction_queue 
      WHERE room_id = ? AND status IN ('PENDING', 'RELISTED')
      ORDER BY CASE status WHEN 'PENDING' THEN 0 ELSE 1 END, queue_position ASC LIMIT 1
    `).get(roomId) as { player_id: string } | undefined;

    if (nextPlayer) {
      const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as unknown as Room | undefined;
      const isRelisted = db.prepare(`SELECT status FROM auction_queue WHERE room_id = ? AND player_id = ?`).get(roomId, nextPlayer.player_id) as any;
      const pendingCount = db.prepare(`SELECT COUNT(*) as count FROM auction_queue WHERE room_id = ? AND status = 'PENDING'`).get(roomId) as { count: number };
      
      const isFinalRound = pendingCount.count === 0 && isRelisted?.status === 'RELISTED';
      const effectiveStatus = isFinalRound ? 'FINAL_ROUND' : (room?.status === 'LOBBY' ? 'LIVE' : (room?.status || 'LIVE'));
      const effectiveTimer = isFinalRound ? Math.min(room?.bid_timer_seconds || 10, 8) : (room?.bid_timer_seconds || 10);
      const isUnlimited = Boolean(room?.is_unlimited_timer);
      const isTimedPhase = effectiveStatus === 'LIVE' || effectiveStatus === 'IN_PROGRESS' || effectiveStatus === 'FINAL_ROUND';
      const newDeadline = (!isUnlimited && isTimedPhase) ? Date.now() + (effectiveTimer * 1000) : null;

      db.prepare(`UPDATE auction_queue SET status = 'ACTIVE' WHERE room_id = ? AND player_id = ?`)
        .run(roomId, nextPlayer.player_id);
        
      db.prepare(`UPDATE rooms SET current_player_id = ?, current_bid_lakhs = 0, current_bidder_franchise = NULL, bid_deadline = ?, status = ? WHERE id = ?`)
        .run(nextPlayer.player_id, newDeadline, effectiveStatus, roomId);
    } else {
      db.prepare('UPDATE rooms SET status = ?, completed_at = ? WHERE id = ?').run('COMPLETED', Date.now(), roomId);
    }
  });
  tx();
}

/**
 * Returns the active player to a final relist round. Relisted players are only
 * called after every original pending player has been auctioned.
 */
export function relistCurrent(roomId: string) {
  const tx = db.transaction(() => {
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as unknown as Room | undefined;
    if (!room || !room.current_player_id) return null;

    db.prepare(`UPDATE auction_queue SET status = 'RELISTED' WHERE room_id = ? AND player_id = ?`)
      .run(room.id, room.current_player_id);
    db.prepare(`
      UPDATE rooms
      SET current_player_id = NULL, current_bid_lakhs = 0, current_bidder_franchise = NULL, bid_deadline = NULL
      WHERE id = ?
    `).run(room.id);

    return room;
  });
  return tx();
}

/**
 * Moves an already UNSOLD player back to the final relisted round.
 */
export function relistUnsoldPlayer(roomId: string, playerId: string) {
  const tx = db.transaction(() => {
    const item = db.prepare(`SELECT * FROM auction_queue WHERE room_id = ? AND player_id = ? AND status = 'UNSOLD'`)
      .get(roomId, playerId);
    if (!item) return false;

    db.prepare(`UPDATE auction_queue SET status = 'RELISTED' WHERE room_id = ? AND player_id = ?`)
      .run(roomId, playerId);
    return true;
  });
  return tx();
}

/**
 * Temporarily defers the active player 5 positions down the active queue,
 * so they reappear shortly without waiting for the final round.
 */
export function deferCurrentPlayer(roomId: string, bumpPositions = 5) {
  const tx = db.transaction(() => {
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as unknown as Room | undefined;
    if (!room || !room.current_player_id) return null;

    const playerId = room.current_player_id;
    // Get all pending items in current order (excluding deferred player)
    const pendingItems = db.prepare(`
      SELECT player_id FROM auction_queue
      WHERE room_id = ? AND status = 'PENDING' AND player_id != ?
      ORDER BY queue_position ASC
    `).all(roomId, playerId) as { player_id: string }[];

    // Insert deferred player after bumpPositions (or at end if fewer pending)
    const insertIdx = Math.min(bumpPositions, pendingItems.length);
    pendingItems.splice(insertIdx, 0, { player_id: playerId });

    // Mark deferred player back to PENDING status
    db.prepare(`UPDATE auction_queue SET status = 'PENDING' WHERE room_id = ? AND player_id = ?`)
      .run(roomId, playerId);

    // Reindex all pending items with clean sequential integers (0, 1, 2...)
    const updateStmt = db.prepare(`UPDATE auction_queue SET queue_position = ? WHERE room_id = ? AND player_id = ?`);
    pendingItems.forEach((item, index) => {
      updateStmt.run(index, roomId, item.player_id);
    });

    db.prepare(`
      UPDATE rooms
      SET current_player_id = NULL, current_bid_lakhs = 0, current_bidder_franchise = NULL, bid_deadline = NULL
      WHERE id = ?
    `).run(room.id);

    return room;
  });
  return tx();
}



