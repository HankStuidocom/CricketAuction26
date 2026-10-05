import { PlayerRole, PlayerTier } from '../types';

/**
 * Format lakhs into readable currency string
 * e.g. 250 → "₹250L", 1000 → "₹1Cr", 1500 → "₹1.5Cr"
 */
export function formatPoints(lakhs: number): string {
  if (lakhs >= 100) {
    const crores = lakhs / 100;
    if (crores % 1 === 0) return `₹${crores}Cr`;
    return `₹${crores.toFixed(1)}Cr`;
  }
  return `₹${lakhs}L`;
}

/**
 * Get Tailwind color class for player role
 */
export function getRoleColor(role: PlayerRole): string {
  switch (role) {
    case 'BAT': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    case 'BOWL': return 'bg-red-500/20 text-red-300 border-red-500/40';
    case 'AR': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    case 'WK': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
    default: return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
  }
}

/**
 * Get role label
 */
export function getRoleLabel(role: PlayerRole): string {
  switch (role) {
    case 'BAT': return 'Batsman';
    case 'BOWL': return 'Bowler';
    case 'AR': return 'All-Rounder';
    case 'WK': return 'Wicket Keeper';
    default: return role;
  }
}

/**
 * Get Tailwind color class for tier
 */
export function getTierColor(tier: PlayerTier): string {
  switch (tier) {
    case 'S': return 'bg-yellow-500/30 text-yellow-300 border-yellow-400/60';
    case 'A': return 'bg-gray-300/20 text-gray-200 border-gray-300/40';
    case 'B': return 'bg-amber-700/30 text-amber-400 border-amber-600/40';
    case 'C': return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    case 'D': return 'bg-zinc-700/20 text-zinc-400 border-zinc-600/40';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}

/**
 * Get tier glow color (CSS box-shadow)
 */
export function getTierGlow(tier: PlayerTier): string {
  switch (tier) {
    case 'S': return '0 0 20px rgba(234, 179, 8, 0.5), 0 0 40px rgba(234, 179, 8, 0.2)';
    case 'A': return '0 0 15px rgba(209, 213, 219, 0.4)';
    case 'B': return '0 0 15px rgba(180, 83, 9, 0.4)';
    case 'C': return '0 0 8px rgba(100, 116, 139, 0.3)';
    case 'D': return 'none';
    default: return 'none';
  }
}

/**
 * Get tier border color for card border
 */
export function getTierBorderColor(tier: PlayerTier): string {
  switch (tier) {
    case 'S': return '#EAB308';
    case 'A': return '#D1D5DB';
    case 'B': return '#B45309';
    case 'C': return '#64748B';
    case 'D': return '#3F3F46';
    default: return '#374151';
  }
}

/**
 * Get tier label
 */
export function getTierLabel(tier: PlayerTier): string {
  switch (tier) {
    case 'S': return 'ICON';
    case 'A': return 'ELITE';
    case 'B': return 'PREMIUM';
    case 'C': return 'STANDARD';
    case 'D': return 'UNCAPPED';
    default: return tier;
  }
}

/**
 * Get team color by team id
 */
export function getTeamColor(teamId: string): string {
  const colors: Record<string, string> = {
    csk: '#F5A623',
    mi: '#004BA0',
    rcb: '#EC1C24',
    kkr: '#3A225D',
    dc: '#0078BC',
    pbks: '#ED1B24',
    rr: '#EA1A85',
    srh: '#F26522',
    gt: '#1C2951',
    lsg: '#A72B4B',
  };
  return colors[teamId] || '#6B7280';
}

/**
 * Get initials from player name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Get role short label (2-3 chars)
 */
export function getRoleShort(role: PlayerRole): string {
  return role;
}

/**
 * Format timer display
 */
export function formatTimer(seconds: number): string {
  return seconds.toString().padStart(2, '0');
}

/**
 * Calculate attribute bar percentage color
 */
export function getAttributeBarColor(value: number): string {
  if (value >= 80) return '#1DB954';
  if (value >= 60) return '#F5A623';
  if (value >= 40) return '#F97316';
  return '#EF4444';
}

/**
 * Clamp number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Get overall rating color
 */
export function getRatingColor(rating: number): string {
  if (rating >= 85) return '#F5A623';
  if (rating >= 75) return '#1DB954';
  if (rating >= 60) return '#60A5FA';
  return '#9CA3AF';
}
