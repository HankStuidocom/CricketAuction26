import React from 'react';
import { 
  RoleBatterIcon, 
  RoleBowlerIcon, 
  RoleAllRounderIcon, 
  RoleWicketKeeperIcon,
  OverseasGlobeIcon,
  CrownHostIcon,
  BotsAiIcon,
  GavelIcon
} from './GameIcons';

// 1. Role Badge
export function RoleBadge({ role, compact = false }: { role: string; compact?: boolean }) {
  const roleConfig: Record<string, { label: string; short: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
    'Batter': {
      label: 'BATTER',
      short: 'BAT',
      bg: 'bg-blue-500/15',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      icon: <RoleBatterIcon size={compact ? 12 : 14} color="#60A5FA" />
    },
    'Bowler': {
      label: 'BOWLER',
      short: 'BOWL',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: <RoleBowlerIcon size={compact ? 12 : 14} color="#34D399" />
    },
    'All-Rounder': {
      label: 'ALL-ROUNDER',
      short: 'AR',
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      icon: <RoleAllRounderIcon size={compact ? 12 : 14} color="#FBBF24" />
    },
    'Wicket-Keeper': {
      label: 'WICKET-KEEPER',
      short: 'WK',
      bg: 'bg-purple-500/15',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      icon: <RoleWicketKeeperIcon size={compact ? 12 : 14} color="#C084FC" />
    }
  };

  const config = roleConfig[role] || roleConfig['Batter'];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-['Manrope'] font-bold uppercase tracking-wider border ${config.bg} ${config.text} ${config.border} ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
      {config.icon}
      <span>{compact ? config.short : config.label}</span>
    </span>
  );
}

// 2. Nationality / Origin Badge (IND vs Overseas)
export function StatusOriginBadge({ status, country }: { status: string; country?: string }) {
  const isOverseas = status === 'OS' || (status && status.toUpperCase().includes('OS'));

  if (isOverseas) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/30 font-['Manrope'] font-extrabold text-[9px] uppercase tracking-wider">
        <OverseasGlobeIcon size={12} color="#FB923C" />
        <span>{country ? country : 'OVERSEAS'}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-['Manrope'] font-extrabold text-[9px] uppercase tracking-wider">
      <span>🇮🇳 {country || 'INDIA'}</span>
    </span>
  );
}

// 3. Points Hex Badge
export function PointsBadge({ points }: { points: number }) {
  return (
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 font-['Manrope'] font-black text-[10px] tracking-wide shadow-[0_0_10px_rgba(245,158,11,0.2)]">
      <span className="text-[10px]">★</span>
      <span>{points} PTS</span>
    </div>
  );
}

// 4. Live Broadcast Badge
export function LivePill({ label = 'LIVE' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FF2A55]/20 border border-[#FF2A55]/50 text-[#FF3B66] font-['Manrope'] font-extrabold text-[10px] tracking-wider uppercase animate-pulse">
      <span className="w-1.5 h-1.5 rounded-full bg-[#FF2A55]"></span>
      <span>{label}</span>
    </span>
  );
}

// 5. Host Badge
export function HostBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 font-['Manrope'] font-extrabold text-[9px] uppercase tracking-wider">
      <CrownHostIcon size={11} color="#FBBF24" />
      <span>HOST</span>
    </span>
  );
}

// 6. AI Bot Badge
export function AiBotBadge({ difficulty }: { difficulty?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-['Manrope'] font-extrabold text-[9px] uppercase tracking-wider">
      <BotsAiIcon size={11} color="#D8B4FE" />
      <span>AI BOT {difficulty ? `(${difficulty})` : ''}</span>
    </span>
  );
}
