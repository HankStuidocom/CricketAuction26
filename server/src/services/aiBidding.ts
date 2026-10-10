import db from '../database/db';
import { Room, RoomParticipant, Player } from '../types';
import { getNextValidBid } from './auctionEngine';
import crypto from 'crypto';

export interface AIDecision {
  shouldBid: boolean;
  amount?: number;
  reason: string;
}

export function calculateAIMaxValuation(player: Player, participant: RoomParticipant, room: Room): number {
  // Fair market valuation based on player points (7 to 15)
  let baseValue = player.base_price_lakhs;
  if (player.game_points >= 15) {
    baseValue = 1800; // ~18 Cr
  } else if (player.game_points >= 13) {
    baseValue = 1300; // ~13 Cr
  } else if (player.game_points >= 12) {
    baseValue = 950;  // ~9.5 Cr
  } else if (player.game_points >= 10) {
    baseValue = 550;  // ~5.5 Cr
  } else if (player.game_points >= 8) {
    baseValue = 250;  // ~2.5 Cr
  } else {
    baseValue = Math.max(player.base_price_lakhs, 100);
  }

  // Role balance modifier
  const squad = db.prepare(`
    SELECT p.primary_role, COUNT(*) as count
    FROM squad_players sp
    JOIN players p ON p.id = sp.player_id
    WHERE sp.room_id = ? AND sp.franchise_id = ?
    GROUP BY p.primary_role
  `).all(room.id, participant.franchise_id) as { primary_role: string; count: number }[];
  
  const roleCounts = Object.fromEntries(squad.map(s => [s.primary_role, s.count]));
  const currentRoleCount = roleCounts[player.primary_role] || 0;
  
  if (currentRoleCount === 0) baseValue *= 1.25;
  else if (currentRoleCount === 1) baseValue *= 1.1;
  else if (currentRoleCount >= 3) baseValue *= 0.75;

  // Overseas slot modifier
  if (player.status === 'OS') {
    const osCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM squad_players sp
      JOIN players p ON p.id = sp.player_id
      WHERE sp.room_id = ? AND sp.franchise_id = ? AND p.status = 'OS'
    `).get(room.id, participant.franchise_id) as { count: number };
    
    if (osCount.count >= 4) return 0;
    if (osCount.count === 3) baseValue *= 0.8;
  }

  // Difficulty multiplier
  const difficulty = participant.ai_difficulty || 'MEDIUM';
  if (difficulty === 'EASY') baseValue *= 0.8;
  else if (difficulty === 'HARD') baseValue *= 1.25;

  // Purse ceiling: ensure AI keeps enough reserve to complete minimum squad
  const squadSize = db.prepare('SELECT COUNT(*) as count FROM squad_players WHERE room_id = ? AND franchise_id = ?')
    .get(room.id, participant.franchise_id) as { count: number };
  const slotsRemaining = room.max_squad_size - squadSize.count;
  const reserveNeeded = Math.max(0, slotsRemaining - 1) * 50;
  const maxAffordable = participant.purse_remaining_lakhs - reserveNeeded;

  return Math.max(player.base_price_lakhs, Math.min(Math.round(baseValue), maxAffordable));
}

export function makeAIDecision(roomCode: string, franchiseId: string): AIDecision | null {
  const normCode = (roomCode || '').trim().toUpperCase();
  const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normCode) as unknown as Room | undefined;
  if (!room || room.status !== 'IN_PROGRESS' || !room.current_player_id) return null;
  
  const participant = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND franchise_id = ? AND is_ai = 1')
    .get(room.id, franchiseId) as unknown as RoomParticipant | undefined;
  if (!participant) return null;
  
  // Check if already highest bidder
  if (room.current_bidder_franchise === franchiseId) {
    return { shouldBid: false, reason: 'Already highest bidder' };
  }
  
  // Check squad full
  const squadSize = db.prepare('SELECT COUNT(*) as count FROM squad_players WHERE room_id = ? AND franchise_id = ?')
    .get(room.id, franchiseId) as { count: number };
  if (squadSize.count >= room.max_squad_size) {
    return { shouldBid: false, reason: 'Squad full' };
  }
  
  // Check overseas limit
  const osCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM squad_players sp
    JOIN players p ON p.id = sp.player_id
    WHERE sp.room_id = ? AND sp.franchise_id = ? AND p.status = 'OS'
  `).get(room.id, franchiseId) as { count: number };
  
  const currentPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(room.current_player_id) as unknown as Player | undefined;
  if (!currentPlayer) return { shouldBid: false, reason: 'No current player' };
  
  if (currentPlayer.status === 'OS' && osCount.count >= 4) {
    return { shouldBid: false, reason: 'Max overseas reached' };
  }
  
  // Calculate next valid bid
  const nextBid = room.current_bid_lakhs === 0 ? currentPlayer.base_price_lakhs : getNextValidBid(room.current_bid_lakhs);
  
  // Check purse (with safe bidding reserve)
  const minBasePrice = 50;
  const requiredPurse = nextBid + (room.max_squad_size - squadSize.count - 1) * minBasePrice;
  if (participant.purse_remaining_lakhs < requiredPurse) {
    return { shouldBid: false, reason: 'Insufficient purse' };
  }
  
  // Valuation check
  const maxValuation = calculateAIMaxValuation(currentPlayer, participant, room);
  if (nextBid <= maxValuation) {
    return { shouldBid: true, amount: nextBid, reason: `Bid ${nextBid} <= Valuation ${maxValuation}` };
  }
  
  return { shouldBid: false, reason: `Bid ${nextBid} exceeds valuation ${maxValuation}` };
}

export function processAIBids(roomCode: string, onBidPlaced?: () => void): boolean {
  const normCode = (roomCode || '').trim().toUpperCase();
  const room = db.prepare('SELECT * FROM rooms WHERE UPPER(room_code) = ?').get(normCode) as unknown as Room | undefined;
  if (!room || room.status !== 'IN_PROGRESS') return false;
  
  const aiParticipants = db.prepare('SELECT * FROM room_participants WHERE room_id = ? AND is_ai = 1')
    .all(room.id) as unknown as RoomParticipant[];
  if (!aiParticipants.length) return false;

  // Shuffle so different bots react first
  const shuffled = [...aiParticipants].sort(() => Math.random() - 0.5);
  
  for (const ai of shuffled) {
    const decision = makeAIDecision(normCode, ai.franchise_id);
    if (decision?.shouldBid && decision.amount) {
      const idempotencyKey = `ai-${normCode}-${ai.franchise_id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      try {
        const { processBid } = require('./auctionEngine');
        processBid(normCode, ai.franchise_id, decision.amount, idempotencyKey);
        if (onBidPlaced) onBidPlaced();
        return true;
      } catch (err) {
        // AI bid failed, try next
      }
    }
  }
  return false;
}

export function initializeAITeams(roomId: string, roomCode: string, settings: { ai_enabled: boolean; ai_difficulty: string; max_teams: number; starting_purse_lakhs: number }) {
  if (!settings.ai_enabled) return;
  
  const franchises = ['CSK', 'MI', 'KKR', 'RCB', 'DC', 'PBKS', 'RR', 'SRH', 'GT', 'LSG'];
  const takenFranchises = db.prepare('SELECT franchise_id FROM room_participants WHERE room_id = ?')
    .all(roomId) as { franchise_id: string }[];
  const taken = new Set(takenFranchises.map(f => f.franchise_id));
  
  const available = franchises.filter(f => !taken.has(f));
  const needed = Math.min(settings.max_teams - takenFranchises.length, available.length);
  
  for (let i = 0; i < needed; i++) {
    const franchiseId = available[i];
    const difficulty = settings.ai_difficulty || 'MEDIUM';
    const names = ['Strategic Bot', 'Analytics Bot', 'Value Bot', 'Aggressive Bot', 'Patient Bot', 'Balanced Bot'];
    
    db.prepare(`
      INSERT INTO room_participants (id, room_id, user_id, franchise_id, display_name, purse_remaining_lakhs, is_host, is_ai, ai_difficulty, joined_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?)
    `).run(crypto.randomUUID(), roomId, `ai-${franchiseId.toLowerCase()}`, franchiseId, `${names[i % names.length]} (${franchiseId})`, settings.starting_purse_lakhs, difficulty, Date.now());
  }
}