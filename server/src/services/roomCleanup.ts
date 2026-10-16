/**
 * Room Cleanup & Activity Tracking Service
 *
 * Policy:
 *  - Track meaningful room activity via `last_activity_at` (set on room creation and on any
 *    auction event). This is intentionally NOT reset by socket connect/disconnect so that
 *    a fully-disconnected lobby is not prematurely expired while players may be reconnecting.
 *  - Apply automatic expiry ONLY to LOBBY rooms that never started (auction_started_at IS NULL).
 *  - Warn the host after IDLE_WARN_MS (default 23 h) then auto-close after IDLE_CLOSE_MS (default 24 h).
 *  - NEVER automatically close LIVE, PAUSED, FINAL_ROUND, or COMPLETED rooms.
 *  - Permanently purge only old CANCELLED lobby rooms that have no bids and no squad data,
 *    after PURGE_RETENTION_MS (default 30 days). Safe to rerun.
 */
import db from '../database/db';

const IDLE_WARN_MS       = Number(process.env.LOBBY_IDLE_WARN_MS)       || 23 * 60 * 60 * 1000; // 23 h
const IDLE_CLOSE_MS      = Number(process.env.LOBBY_IDLE_CLOSE_MS)      || 24 * 60 * 60 * 1000; // 24 h
const PURGE_RETENTION_MS = Number(process.env.LOBBY_PURGE_RETENTION_MS) || 30 * 24 * 60 * 60 * 1000; // 30 d

/**
 * Touch last_activity_at for a room by its DB id.
 * Call this on any meaningful room event (bid placed, player sold, auction started, etc.)
 * NOT on socket connect/disconnect — disconnection is not inactivity.
 */
export function touchActivity(roomId: string): void {
  db.prepare('UPDATE rooms SET last_activity_at = ? WHERE id = ?').run(Date.now(), roomId);
}

/**
 * Returns IDs of LOBBY rooms whose last_activity_at (falling back to created_at)
 * exceeds the warn threshold and have not yet had a warning issued.
 * Only targets rooms that never started (auction_started_at IS NULL).
 */
export function getLobbyRoomsNeedingWarning(): string[] {
  const cutoff = Date.now() - IDLE_WARN_MS;
  const rows = db.prepare(`
    SELECT id FROM rooms
    WHERE status = 'LOBBY'
      AND auction_started_at IS NULL
      AND idle_warned_at IS NULL
      AND COALESCE(last_activity_at, created_at) < ?
  `).all(cutoff) as { id: string }[];
  return rows.map(r => r.id);
}

/**
 * Returns IDs of LOBBY rooms that have already been warned and are now past
 * the auto-close threshold.
 * Only targets rooms that never started (auction_started_at IS NULL).
 */
export function getLobbyRoomsToAutoClose(): string[] {
  const cutoff = Date.now() - IDLE_CLOSE_MS;
  const rows = db.prepare(`
    SELECT id FROM rooms
    WHERE status = 'LOBBY'
      AND auction_started_at IS NULL
      AND idle_warned_at IS NOT NULL
      AND COALESCE(last_activity_at, created_at) < ?
  `).all(cutoff) as { id: string }[];
  return rows.map(r => r.id);
}

/**
 * Marks a LOBBY room as CANCELLED due to idle timeout. Idempotent — skips rooms
 * that are not LOBBY or have already started.
 */
export function autoExpireLobbyRoom(roomId: string, reason = 'idle_timeout'): boolean {
  const room = db.prepare('SELECT id, status, auction_started_at FROM rooms WHERE id = ?').get(roomId) as any;
  if (!room || room.status !== 'LOBBY' || room.auction_started_at) return false;

  const result = db.prepare(`
    UPDATE rooms
    SET status = 'CANCELLED', cancelled_at = ?, cancelled_by = ?
    WHERE id = ? AND status = 'LOBBY' AND auction_started_at IS NULL
  `).run(Date.now(), reason, roomId);

  return (result.changes ?? 0) > 0;
}

/** Records an idle warning on a LOBBY room so we know one has been sent. */
export function markIdleWarned(roomId: string): void {
  db.prepare(
    "UPDATE rooms SET idle_warned_at = ? WHERE id = ? AND status = 'LOBBY'"
  ).run(Date.now(), roomId);
}

/**
 * Cancels a LOBBY room on behalf of the host (manual Close Room action).
 * Rejects if the room is not in LOBBY status (use End Auction for live games).
 * Returns false if the room doesn't exist or isn't a LOBBY.
 */
export function cancelRoomByHost(roomId: string, cancelledBy: string): boolean {
  const room = db.prepare('SELECT id, status FROM rooms WHERE id = ?').get(roomId) as any;
  if (!room || room.status !== 'LOBBY') return false;

  const result = db.prepare(`
    UPDATE rooms
    SET status = 'CANCELLED', cancelled_at = ?, cancelled_by = ?, last_activity_at = ?
    WHERE id = ? AND status = 'LOBBY'
  `).run(Date.now(), cancelledBy, Date.now(), roomId);

  return (result.changes ?? 0) > 0;
}

/**
 * Permanently deletes old CANCELLED lobby rooms that:
 *  - Were cancelled more than PURGE_RETENTION_MS ago
 *  - Never started (auction_started_at IS NULL)
 *  - Have no bids
 *  - Have no squad_players (no auction history)
 *
 * SAFE TO RERUN — will never delete active or completed game data.
 * Returns the number of rooms permanently removed.
 */
export function purgeOldCancelledLobbies(): number {
  const cutoff = Date.now() - PURGE_RETENTION_MS;

  const eligible = db.prepare(`
    SELECT r.id FROM rooms r
    WHERE r.status = 'CANCELLED'
      AND r.auction_started_at IS NULL
      AND COALESCE(r.cancelled_at, r.created_at) < ?
      AND NOT EXISTS (SELECT 1 FROM bids        b  WHERE b.room_id  = r.id)
      AND NOT EXISTS (SELECT 1 FROM squad_players sp WHERE sp.room_id = r.id)
  `).all(cutoff) as { id: string }[];

  if (eligible.length === 0) return 0;

  const ids = eligible.map(r => r.id);

  const deleteRelated = db.transaction((roomIds: string[]) => {
    for (const id of roomIds) {
      db.prepare('DELETE FROM auction_events    WHERE room_id = ?').run(id);
      db.prepare('DELETE FROM auction_queue     WHERE room_id = ?').run(id);
      db.prepare('DELETE FROM room_participants WHERE room_id = ?').run(id);
      db.prepare('DELETE FROM room_invites      WHERE room_id = ?').run(id);
      // Double-guard: only delete rooms that are still CANCELLED and never started
      db.prepare(
        "DELETE FROM rooms WHERE id = ? AND status = 'CANCELLED' AND auction_started_at IS NULL"
      ).run(id);
    }
  });

  deleteRelated(ids);
  return ids.length;
}
