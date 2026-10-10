import React from 'react';
import { Player } from '../types';
import { formatCr, FRANCHISE_MAP } from '../lib/utils';
import { RoleBadge, StatusOriginBadge, PointsBadge } from './GameBadge';
import { CricketBatBallIcon } from './GameIcons';

interface PlayerHeroCardProps {
  player: Player | null | undefined;
  statusText?: string;
  isSold?: boolean;
  isUnsold?: boolean;
  soldPriceLakhs?: number;
  soldToFranchise?: string;
  className?: string;
}

export default function PlayerHeroCard({
  player,
  statusText,
  isSold = false,
  isUnsold = false,
  soldPriceLakhs,
  soldToFranchise,
  className = ''
}: PlayerHeroCardProps) {
  if (!player) {
    return (
      <div className={`relative rounded-3xl bg-gradient-to-b from-[#0B1730] to-[#040914] border border-white/10 p-8 text-center flex flex-col items-center justify-center min-h-[280px] ${className}`}>
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8993A8] mb-3 animate-pulse">
          <CricketBatBallIcon size={32} color="#8993A8" />
        </div>
        <h3 className="font-['Manrope'] font-extrabold text-base text-white tracking-wide uppercase">
          Awaiting Next Player
        </h3>
        <p className="text-xs text-[#8993A8] mt-1 max-w-xs">
          The auction gavel is ready. The next superstar in the IPL 2026 pool will appear shortly.
        </p>
      </div>
    );
  }

  const franchise = player.franchise_2026 ? FRANCHISE_MAP[player.franchise_2026] : null;
  const accentColor = franchise?.primary || '#3B82F6';

  return (
    <div 
      className={`
        relative rounded-3xl overflow-hidden
        bg-gradient-to-b from-[#0D1C38] via-[#071124] to-[#030814]
        border border-white/15
        shadow-[0_12px_40px_rgba(0,0,0,0.8)]
        transition-all duration-300
        ${className}
      `}
      style={{
        boxShadow: `0 0 35px ${accentColor}25, 0 12px 40px rgba(0,0,0,0.8)`
      }}
    >
      {/* Stadium Spotlight Background Mesh */}
      <div 
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none opacity-20 blur-3xl"
        style={{ backgroundColor: accentColor }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Top Franchise Accent Border */}
      <div 
        className="h-1.5 w-full shadow-[0_0_15px_currentColor]"
        style={{ backgroundColor: accentColor, color: accentColor }}
      />

      {/* Card Header Strip */}
      <div className="relative z-10 flex justify-between items-center px-4 sm:px-6 pt-4 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <RoleBadge role={player.primary_role} />
          <StatusOriginBadge status={player.status} country={player.country} />
        </div>

        <PointsBadge points={player.game_points} />
      </div>

      {/* Player Identity Main Section */}
      <div className="relative z-10 px-4 sm:px-6 py-4 text-center">
        {/* Franchise Crest & Pool info */}
        {franchise && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-2">
            {franchise.logoUrl ? (
              <img src={franchise.logoUrl} alt={franchise.name} className="w-4 h-4 object-contain" />
            ) : (
              <span>{franchise.emoji}</span>
            )}
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8993A8]">
              {franchise.name}
            </span>
          </div>
        )}

        {/* Large Bold Player Name */}
        <h2 className="font-['Manrope'] font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-none drop-shadow-md">
          {player.player_name}
        </h2>

        {/* ID & Squad Status */}
        <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-[#8993A8] font-mono">
          <span>{player.id}</span>
          <span>•</span>
          <span className="text-[#D9FF4D] font-sans font-bold">{player.squad_status || 'Auction Pool'}</span>
        </div>
      </div>

      {/* Base Price & Status Shelf */}
      <div className="relative z-10 px-4 sm:px-6 pb-5 pt-2">
        <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between backdrop-blur-md">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8993A8] block">
              Starting Base Price
            </span>
            <span className="font-['Manrope'] font-black text-lg sm:text-xl text-white">
              {formatCr(player.base_price_lakhs)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8993A8] block">
              Auction Status
            </span>
            <span className={`font-['Manrope'] font-black text-sm uppercase ${isSold ? 'text-[#D9FF4D]' : isUnsold ? 'text-[#FF344C]' : 'text-[#00E5FF]'}`}>
              {statusText || (isSold ? 'SOLD' : isUnsold ? 'UNSOLD' : 'AVAILABLE')}
            </span>
          </div>
        </div>
      </div>

      {/* Overlay: SOLD Celebration */}
      {isSold && (
        <div className="absolute inset-0 bg-[#05172E]/95 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 animate-sold text-center">
          <div className="w-16 h-16 rounded-full bg-[#D9FF4D]/20 border-2 border-[#D9FF4D] flex items-center justify-center text-3xl mb-3 shadow-[0_0_30px_rgba(217,255,77,0.5)]">
            🔨
          </div>
          <span className="font-['Manrope'] font-black text-3xl sm:text-4xl text-[#D9FF4D] tracking-wider uppercase">
            SOLD!
          </span>
          {soldToFranchise && (
            <div className="mt-2 text-white font-extrabold text-base sm:text-lg flex items-center gap-2">
              <span>TO</span>
              <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/20 text-[#D9FF4D]">
                {soldToFranchise}
              </span>
            </div>
          )}
          {soldPriceLakhs && (
            <div className="mt-2 font-['Manrope'] font-black text-2xl text-white">
              {formatCr(soldPriceLakhs)}
            </div>
          )}
        </div>
      )}

      {/* Overlay: UNSOLD */}
      {isUnsold && (
        <div className="absolute inset-0 bg-[#1A080E]/95 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-up">
          <div className="w-14 h-14 rounded-full bg-[#FF344C]/20 border border-[#FF344C] flex items-center justify-center text-2xl mb-2">
            ❌
          </div>
          <span className="font-['Manrope'] font-black text-2xl sm:text-3xl text-[#FF344C] tracking-wider uppercase">
            UNSOLD
          </span>
          <span className="text-xs text-[#8993A8] mt-1">
            Moved to relist reserve queue
          </span>
        </div>
      )}
    </div>
  );
}
