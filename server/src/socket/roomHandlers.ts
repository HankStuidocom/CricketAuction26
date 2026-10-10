import { Server, Socket } from 'socket.io';
import db from '../database/db';
import { processBid, finalizeCurrent, advanceToNextPlayer } from '../services/auctionEngine';
import crypto from 'crypto';
import { Room } from '../types';

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    
    socket.on('join_room', (data) => {
      const { roomCode, userId, franchise, displayName, password } = data;
      const normalizedCode = (roomCode || '').trim().toUpperCase();
      const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normalizedCode) as unknown as Room | undefined;
      if (!room) return socket.emit('error', { message: 'Room not found' });
      
      socket.join(normalizedCode);
      
      let p = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND franchise_id = ?').get(room.id, franchise);
      
      // If not present and not full, add them (simplified)
      if (!p) {
         try {
           db.prepare(`
             INSERT INTO room_participants (id, room_id, user_id, franchise_id, display_name, purse_remaining_lakhs, joined_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
           `).run(crypto.randomUUID(), room.id, userId, franchise, displayName, room.starting_purse_lakhs, Date.now());
           p = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND franchise_id = ?').get(room.id, franchise);
         } catch(e) {
           return socket.emit('error', { message: 'Could not join team' });
         }
      }

      socket.emit('room_joined', { room, participant: p });
      io.to(roomCode).emit('participant_joined', { participant: p });
    });

    socket.on('start_auction', (data) => {
      const { roomCode } = data;
      const room = db.prepare('SELECT * FROM rooms WHERE room_code = ?').get(roomCode) as unknown as Room | undefined;
      if (!room) return socket.emit('error', { message: 'Room not found' });

      db.prepare('UPDATE rooms SET status = "IN_PROGRESS", auction_started_at = ? WHERE id = ?').run(Date.now(), room.id);
      if (!room.current_player_id) {
        advanceToNextPlayer(room.id);
      }

      const updatedRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room.id) as unknown as Room;
      io.to(roomCode).emit('auction_started', { room: updatedRoom });
      io.to(roomCode).emit('room_state', updatedRoom);
    });

    socket.on('place_bid', (data) => {
      const { roomCode, franchise, idempotencyKey, amount } = data;
      try {
        const room = db.prepare('SELECT current_bid_lakhs, current_player_id FROM rooms WHERE room_code = ?').get(roomCode) as any;
        const bidAmt = amount || (room.current_bid_lakhs === 0 ? 50 : 0); // Simplified default logic if client forgets
        const updatedRoom = processBid(roomCode, franchise, amount || getFallbackAmount(room.current_bid_lakhs), idempotencyKey);
        io.to(roomCode).emit('room_state', updatedRoom);
      } catch (err: any) {
        socket.emit('bid_rejected', { reason: err.message });
      }
    });

    socket.on('host_pause', (data) => {
      const { roomCode } = data;
      const room = db.prepare('SELECT * FROM rooms WHERE room_code = ?').get(roomCode) as unknown as Room | undefined;
      if (room) {
        db.prepare('UPDATE rooms SET status = "PAUSED", bid_deadline = NULL WHERE id = ?').run(room.id);
        io.to(roomCode).emit('auction_paused', {});
      }
    });

    socket.on('host_resume', (data) => {
      const { roomCode } = data;
      const room = db.prepare('SELECT * FROM rooms WHERE room_code = ?').get(roomCode) as unknown as Room | undefined;
      if (room) {
        const newDeadline = room.is_unlimited_timer ? null : Date.now() + (room.bid_timer_seconds * 1000);
        db.prepare('UPDATE rooms SET status = "IN_PROGRESS", bid_deadline = ? WHERE id = ?').run(newDeadline, room.id);
        io.to(roomCode).emit('auction_resumed', { deadline: newDeadline });
      }
    });

    socket.on('host_skip', (data) => {
       const { roomCode } = data;
       const room = db.prepare('SELECT * FROM rooms WHERE room_code = ?').get(roomCode) as unknown as Room | undefined;
       if (room) {
           finalizeCurrent(room.id);
           advanceToNextPlayer(room.id);
           const updatedRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room.id);
           io.to(roomCode).emit('room_state', updatedRoom);
       }
    });

    socket.on('host_mark_unsold', (data) => {
       const { roomCode } = data;
       const room = db.prepare('SELECT * FROM rooms WHERE room_code = ?').get(roomCode) as unknown as Room | undefined;
       if (room) {
           db.prepare('UPDATE rooms SET current_bid_lakhs = 0, current_bidder_franchise = NULL WHERE id = ?').run(room.id);
           finalizeCurrent(room.id);
           advanceToNextPlayer(room.id);
           const updatedRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room.id);
           io.to(roomCode).emit('room_state', updatedRoom);
       }
    });

    socket.on('send_chat', (data) => {
      const { roomCode, message, sender } = data;
      io.to(roomCode).emit('chat_message', { sender, message, timestamp: Date.now() });
    });
  });

  // Global timer check
  setInterval(() => {
    const rooms = db.prepare('SELECT * FROM rooms WHERE status = "IN_PROGRESS" AND bid_deadline IS NOT NULL AND bid_deadline <= ?').all(Date.now()) as unknown as Room[];
    for (const room of rooms) {
      finalizeCurrent(room.id);
      advanceToNextPlayer(room.id);
      const updatedRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room.id) as unknown as Room;
      io.to(room.room_code).emit('room_state', updatedRoom);
      if (updatedRoom && updatedRoom.status === 'COMPLETED') {
        io.to(room.room_code).emit('auction_completed', { message: 'Auction finished' });
      }
    }
  }, 500);
}

function getFallbackAmount(current: number) {
  if (current < 100) return current + 10;
  if (current < 500) return current + 25;
  return current + 50;
}
