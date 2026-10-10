import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Franchise } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert integer lakhs to display string: 1250 -> "₹12.50 Cr" */
export function formatCr(lakhs: number): string {
  return `₹${(lakhs / 100).toFixed(2)} Cr`;
}

/** Convert integer lakhs to compact display: 1250 -> "₹12.5 Cr" */
export function formatCrCompact(lakhs: number): string {
  const cr = lakhs / 100;
  return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
}

/** Calculate next valid bid from current bid (integer lakhs) */
export function getNextBid(currentBid: number): number {
  if (currentBid < 100)  return currentBid + 10;  // < ₹1 Cr: +₹0.10 Cr
  if (currentBid < 500)  return currentBid + 25;  // < ₹5 Cr: +₹0.25 Cr
  return currentBid + 50;                          // ≥ ₹5 Cr: +₹0.50 Cr
}

/** Format ms timestamp to readable time */
export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/** Generate a short player ID segment */
export function generatePlayerId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export const ALL_FRANCHISES: Franchise[] = [
  { id: 'CSK',  name: 'Chennai Super Kings',          primary: '#F9CD05', secondary: '#124CA0', emoji: '🦁', logoUrl: '/teams/CSK.png', tagline: 'Whistle Podu' },
  { id: 'MI',   name: 'Mumbai Indians',                primary: '#004BA0', secondary: '#D1AB3E', emoji: '🌊', logoUrl: '/teams/MI.png', tagline: 'One Family' },
  { id: 'KKR',  name: 'Kolkata Knight Riders',         primary: '#3A225D', secondary: '#ECC542', emoji: '⚔️',  logoUrl: '/teams/KKR.png', tagline: 'Korbo Lorbo Jeetbo' },
  { id: 'RCB',  name: 'Royal Challengers Bengaluru',   primary: '#EC1C24', secondary: '#000000', emoji: '👑', logoUrl: '/teams/RCB.png', tagline: 'Play Bold' },
  { id: 'DC',   name: 'Delhi Capitals',                primary: '#17479E', secondary: '#D71920', emoji: '⚡', logoUrl: '/teams/DC.png', tagline: 'Roar Macha' },
  { id: 'PBKS', name: 'Punjab Kings',                  primary: '#D71920', secondary: '#A7A8AA', emoji: '🦁', logoUrl: '/teams/PBKS.png', tagline: 'Sadda Punjab' },
  { id: 'RR',   name: 'Rajasthan Royals',              primary: '#254AA5', secondary: '#F26522', emoji: '👑', logoUrl: '/teams/RR.png', tagline: 'Halla Bol' },
  { id: 'SRH',  name: 'Sunrisers Hyderabad',           primary: '#F26522', secondary: '#000000', emoji: '🌅', logoUrl: '/teams/SRH.png', tagline: 'Orange Army' },
  { id: 'GT',   name: 'Gujarat Titans',                primary: '#1C2B3A', secondary: '#CCA34C', emoji: '⚡', logoUrl: '/teams/GT.png', tagline: 'Aava De' },
  { id: 'LSG',  name: 'Lucknow Super Giants',          primary: '#003E7E', secondary: '#66D2EA', emoji: '🔥', logoUrl: '/teams/LSG.png', tagline: 'Gazab Andaz' },
];

export const FRANCHISE_MAP = Object.fromEntries(ALL_FRANCHISES.map(f => [f.id, f]));

export const FRANCHISE_COLORS: Record<string, { primary: string; secondary: string }> = Object.fromEntries(
  ALL_FRANCHISES.map(f => [f.id, { primary: f.primary, secondary: f.secondary }])
);

export function getFranchise(id: string): Franchise {
  return FRANCHISE_MAP[id] || { id, name: id, primary: '#6B7280', secondary: '#374151', emoji: '🏏', tagline: '' };
}

export const ROLE_COLORS: Record<string, string> = {
  'Batter':        '#3B82F6',
  'Bowler':        '#10B981',
  'All-Rounder':   '#F59E0B',
  'Wicket-Keeper': '#8B5CF6',
};

export const ROLE_SHORT: Record<string, string> = {
  'Batter':        'BAT',
  'Bowler':        'BOWL',
  'All-Rounder':   'AR',
  'Wicket-Keeper': 'WK',
};

/** Get persistent authenticated user ID or stable guest ID */
export function getOrCreateUserId(): string {
  try {
    const userStr = localStorage.getItem('ca26_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user?.id) return user.id;
    }
    let guestId = localStorage.getItem('ca26_guest_id');
    if (!guestId) {
      guestId = 'guest-' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('ca26_guest_id', guestId);
    }
    return guestId;
  } catch {
    return 'guest-' + Math.random().toString(36).substring(2, 10);
  }
}

/** Save room session to prevent losing franchise/identity on page refresh */
export function saveRoomSession(roomCode: string, data: { franchise: string; displayName: string; userId: string; password?: string }) {
  try {
    sessionStorage.setItem(`ca26_room_${roomCode.toUpperCase()}`, JSON.stringify(data));
  } catch {}
}

/** Retrieve saved room session */
export function getRoomSession(roomCode: string): { franchise?: string; displayName?: string; userId?: string; password?: string } {
  try {
    return JSON.parse(sessionStorage.getItem(`ca26_room_${roomCode.toUpperCase()}`) || '{}');
  } catch {
    return {};
  }
}

