import React from 'react';
import { Franchise } from '../types';
import { formatCr } from '../lib/utils';
import { CrownHostIcon, BotsAiIcon, CheckmarkIcon, PurseCoinsIcon, OverseasGlobeIcon } from './GameIcons';

interface TeamCardProps {
  franchise: Franchise;
  displayName?: string;
  isHost?: boolean;
  isAi?: boolean;
  aiDifficulty?: string;
  purseRemainingLakhs?: number;
  squadCount?: number;
  maxSquad?: number;
  overseasCount?: number;
  isSelected?: boolean;
  isSelectable?: boolean;
  onSelect?: () => void;
  statusBadge?: string;
  className?: string;
  compact?: boolean;
}

export default function TeamCard({
  franchise,
  displayName,
  isHost = false,
  isAi = false,
  aiDifficulty,
  purseRemainingLakhs,
  squadCount,
  maxSquad = 10,
  overseasCount,
  isSelected = false,
  isSelectable = false,
  onSelect,
  statusBadge,
  className = '',
  compact = false
}: TeamCardProps) {
  const primaryColor = franchise.primary || '#3B82F6';

  return (
    <div
      onClick={isSelectable ? onSelect : undefined}
      className={`
        relative rounded-2xl overflow-hidden transition-all duration-200
        ${isSelectable ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.99]' : ''}
        ${isSelected 
          ? 'bg-gradient-to-b from-[#10244C] to-[#081329] border-2 shadow-[0_0_24px_rgba(217,255,77,0.35)]' 
          : 'bg-gradient-to-b from-[#09152B]/90 via-[#060E1E]/95 to-[#030814]/98 border border-white/10 hover:border-white/25'}
        ${className}
      `}
      style={{
        borderColor: isSelected ? '#D9FF4D' : undefined
      }}
    >
      {/* Top team accent bar */}
      <div 
        className="h-1 w-full"
        style={{ backgroundColor: primaryColor }}
      />

      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#D9FF4D] text-[#051120] flex items-center justify-center shadow-lg z-10">
          <CheckmarkIcon size={14} color="#051120" />
        </div>
      )}

      <div className={compact ? 'p-2.5' : 'p-3.5 sm:p-4'}>
        {/* Header: Crest + Franchise Info */}
        <div className="flex items-center gap-3">
          <div 
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1.5 flex-shrink-0 relative overflow-hidden shadow-inner"
            style={{ borderColor: `${primaryColor}40` }}
          >
            {franchise.logoUrl ? (
              <img 
                src={franchise.logoUrl} 
                alt={franchise.name} 
                className="max-h-full max-w-full object-contain drop-shadow" 
              />
            ) : (
              <span className="text-xl">{franchise.emoji}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span 
                className="font-['Manrope'] font-black text-sm tracking-wide"
                style={{ color: primaryColor }}
              >
                {franchise.id}
              </span>

              {isHost && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[8px] font-extrabold uppercase">
                  <CrownHostIcon size={9} color="#FBBF24" /> HOST
                </span>
              )}

              {isAi && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[8px] font-extrabold uppercase">
                  <BotsAiIcon size={9} color="#D8B4FE" /> AI
                </span>
              )}

              {statusBadge && (
                <span className="px-1.5 py-0.2 rounded bg-white/10 text-[#8993A8] text-[8px] font-bold">
                  {statusBadge}
                </span>
              )}
            </div>

            <h4 className="font-['Manrope'] font-bold text-xs text-white truncate">
              {displayName || franchise.name}
            </h4>

            {franchise.tagline && !displayName && (
              <span className="text-[10px] text-[#8993A8] block italic truncate">
                "{franchise.tagline}"
              </span>
            )}
          </div>
        </div>

        {/* Financial & Squad Stats (when active in room) */}
        {(purseRemainingLakhs !== undefined || squadCount !== undefined) && (
          <div className="mt-3 pt-2.5 border-t border-white/5 grid grid-cols-2 gap-2 text-[10px]">
            {purseRemainingLakhs !== undefined && (
              <div>
                <span className="text-[#8993A8] block text-[9px] uppercase font-bold flex items-center gap-1">
                  <PurseCoinsIcon size={10} color="#8993A8" /> Purse
                </span>
                <span className="font-['Manrope'] font-black text-xs text-white">
                  {formatCr(purseRemainingLakhs)}
                </span>
              </div>
            )}

            {squadCount !== undefined && (
              <div className="text-right">
                <span className="text-[#8993A8] block text-[9px] uppercase font-bold flex items-center justify-end gap-1">
                  Squad ({squadCount}/{maxSquad})
                </span>
                <span className="font-['Manrope'] font-bold text-xs text-[#D9FF4D]">
                  {overseasCount !== undefined ? `${overseasCount}/4 OS` : `${squadCount} Bought`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
