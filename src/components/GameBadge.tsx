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
      bg: 'bg-[#06B6D4]/15',
      text: 'text-[#4CD7F6]',
      border: 'border-[#06B6D4]/30',
      icon: <RoleBatterIcon size={compact ? 11 : 12} color="#4CD7F6" />
    },
    'Bowler': {
      label: 'BOWLER',
      short: 'BOWL',
      bg: 'bg-[#10B981]/15',
      text: 'text-[#10B981]',
      border: 'border-[#10B981]/30',
      icon: <RoleBowlerIcon size={compact ? 11 : 12} color="#10B981" />
    },
    'All-Rounder': {
      label: 'ALL-ROUNDER',
      short: 'AR',
      bg: 'bg-[#F59E0B]/15',
      text: 'text-[#FFB95F]',
      border: 'border-[#F59E0B]/30',
      icon: <RoleAllRounderIcon size={compact ? 11 : 12} color="#FFB95F" />
    },
    'Wicket-Keeper': {
      label: 'WICKET-KEEPER',
      short: 'WK',
      bg: 'bg-purple-500/15',
      text: 'text-purple-300',
      border: 'border-purple-500/30',
      icon: <RoleWicketKeeperIcon size={compact ? 11 : 12} color="#C084FC" />
    }
  };

  const config = roleConfig[role] || roleConfig['Batter'];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 h-[22px] rounded-[3px] font-mono font-bold uppercase tracking-wider border ${config.bg} ${config.text} ${config.border} ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
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
      <span className="inline-flex items-center gap-1 px-2 h-[22px] rounded-[3px] bg-[#F59E0B]/15 text-[#FFB95F] border border-[#F59E0B]/30 font-mono font-bold text-[9px] uppercase tracking-wider">
        <OverseasGlobeIcon size={11} color="#FFB95F" />
        <span>{country ? country : 'OVERSEAS'}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 h-[22px] rounded-[3px] bg-[#06B6D4]/15 text-[#4CD7F6] border border-[#06B6D4]/30 font-mono font-bold text-[9px] uppercase tracking-wider">
      <span>🇮🇳 {country || 'INDIA'}</span>
    </span>
  );
}

// 3. Points Hex Badge
export function PointsBadge({ points }: { points: number }) {
  return (
    <div 
      className="inline-flex items-center gap-1 px-2 h-[22px] rounded-[3px] bg-[#F59E0B]/15 border border-[#F59E0B]/35 text-[#FFB95F] font-mono font-bold text-[10px] tracking-wide"
      title="Player Rating (1–15 scale from official auction database)"
    >
      <span className="text-[10px]">★</span>
      <span>{points}/15 Rating</span>
    </div>
  );
}

// 4. Live Broadcast Badge
export function LivePill({ label = 'LIVE' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 h-[22px] rounded-full bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#FFB4AB] font-['Outfit'] font-bold text-[10px] tracking-wider uppercase">
      <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse"></span>
      <span>{label}</span>
    </span>
  );
}

// 5. Host Badge
export function HostBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 h-[22px] rounded-[3px] bg-[#F59E0B]/15 text-[#FFB95F] border border-[#F59E0B]/35 font-mono font-bold text-[9px] uppercase tracking-wider">
      <CrownHostIcon size={11} color="#FFB95F" />
      <span>HOST</span>
    </span>
  );
}

// 6. AI Bot Badge
export function AiBotBadge({ difficulty }: { difficulty?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 h-[22px] rounded-[3px] bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono font-bold text-[9px] uppercase tracking-wider">
      <BotsAiIcon size={11} color="#D8B4FE" />
      <span>AI BOT {difficulty ? `(${difficulty})` : ''}</span>
    </span>
  );
}
