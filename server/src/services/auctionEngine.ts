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
    if (roomRow.status !== 'IN_PROGRESS') throw new Error('Auction is not in progress');

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
      WHERE room_id = ? AND status = 'PENDING'
      ORDER BY queue_position ASC LIMIT 1
    `).get(roomId) as { player_id: string } | undefined;

    if (nextPlayer) {
      const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as unknown as Room | undefined;
      const player = db.prepare('SELECT base_price_lakhs FROM players WHERE id = ?').get(nextPlayer.player_id) as any;
      const newDeadline = (room && !room.is_unlimited_timer && room.status === 'IN_PROGRESS') ? Date.now() + (room.bid_timer_seconds * 1000) : null;

      db.prepare(`UPDATE auction_queue SET status = 'ACTIVE' WHERE room_id = ? AND player_id = ?`)
        .run(roomId, nextPlayer.player_id);
        
      db.prepare(`UPDATE rooms SET current_player_id = ?, current_bid_lakhs = 0, current_bidder_franchise = NULL, bid_deadline = ? WHERE id = ?`)
        .run(nextPlayer.player_id, newDeadline, roomId);
    } else {
      db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run('COMPLETED', roomId);
    }
  });
  tx();
}
