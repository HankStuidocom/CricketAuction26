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
        relative rounded-[8px] overflow-hidden
        bg-[#111827]
        border border-[#1F2937]
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
        className="h-1 w-full"
        style={{ backgroundColor: accentColor }}
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
      <div className="relative z-10 px-4 sm:px-6 py-3 text-center">
        {/* Hero Athlete Portrait with floating franchise badge */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto mb-3 rounded-[6px] overflow-hidden border border-[#1F2937] shadow-[0_12px_28px_rgba(0,0,0,0.7)] group">
          <img 
            src={player.primary_role === 'Bowler' ? '/images/player_bowler.jpg' : '/images/player_hero.jpg'} 
            alt={player.player_name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {franchise && franchise.logoUrl && (
            <div className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-[4px] bg-[#0F131C] border border-[#1F2937] p-1 flex items-center justify-center shadow">
              <img src={franchise.logoUrl} alt={franchise.name} className="max-w-full max-h-full object-contain" />
            </div>
          )}
        </div>

        {/* Franchise Crest & Pool info */}
        {franchise && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[3px] bg-[#0F131C] border border-[#1F2937] mb-2">
            {franchise.logoUrl ? (
              <img src={franchise.logoUrl} alt={franchise.name} className="w-3.5 h-3.5 object-contain" />
            ) : (
              <span>{franchise.emoji}</span>
            )}
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#86948A]">
              2026 Team: {franchise.name}
            </span>
          </div>
        )}

        {/* Large Bold Player Name */}
        <h2 className="font-['Outfit'] font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#DFE2EF] tracking-tight leading-none drop-shadow-md">
          {player.player_name}
        </h2>

        {/* ID & Squad Status */}
        <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-[#86948A] font-mono">
          <span>{player.id}</span>
          <span>•</span>
          <span className="text-[#10B981] font-mono font-bold">IPL 2026 Auction Pool</span>
        </div>
      </div>

      {/* Base Price & Status Shelf */}
      <div className="relative z-10 px-4 sm:px-6 pb-5 pt-2">
        <div className="p-3 sm:p-3.5 rounded-[6px] bg-[#0F131C] border border-[#1F2937] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#86948A] block">
              Starting Base Price
            </span>
            <span className="font-mono font-bold text-lg sm:text-xl text-[#DFE2EF]">
              {formatCr(player.base_price_lakhs)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#86948A] block">
              Auction Status
            </span>
            <span className={`font-['Outfit'] font-bold text-sm uppercase ${isSold ? 'text-[#10B981]' : isUnsold ? 'text-[#EF4444]' : 'text-[#06B6D4]'}`}>
              {statusText || (isSold ? 'SOLD' : isUnsold ? 'UNSOLD' : 'AVAILABLE')}
            </span>
          </div>
        </div>
      </div>

      {/* Overlay: SOLD Celebration */}
      {isSold && (
        <div className="absolute inset-0 bg-[#090D16]/95 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 animate-sold text-center">
          <div className="w-16 h-16 rounded-full bg-[#10B981]/20 border-2 border-[#10B981] flex items-center justify-center text-3xl mb-3 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
            🔨
          </div>
          <span className="font-['Outfit'] font-extrabold text-3xl sm:text-4xl text-[#10B981] tracking-wider uppercase">
            SOLD!
          </span>
          {soldToFranchise && (
            <div className="mt-2 text-[#DFE2EF] font-bold text-base sm:text-lg flex items-center gap-2">
              <span>TO</span>
              <span className="px-3 py-1 rounded-[4px] bg-[#1C1F29] border border-[#10B981]/40 text-[#10B981]">
                {soldToFranchise}
              </span>
            </div>
          )}
          {soldPriceLakhs && (
            <div className="mt-2 font-mono font-bold text-2xl text-[#DFE2EF]">
              {formatCr(soldPriceLakhs)}
            </div>
          )}
        </div>
      )}

      {/* Overlay: UNSOLD */}
      {isUnsold && (
        <div className="absolute inset-0 bg-[#090D16]/95 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-up">
          <div className="w-14 h-14 rounded-full bg-[#EF4444]/20 border border-[#EF4444] flex items-center justify-center text-2xl mb-2">
            ❌
          </div>
          <span className="font-['Outfit'] font-extrabold text-2xl sm:text-3xl text-[#EF4444] tracking-wider uppercase">
            UNSOLD
          </span>
          <span className="text-xs text-[#86948A] mt-1">
            Moved to relist reserve queue
          </span>
        </div>
      )}
    </div>
  );
}
