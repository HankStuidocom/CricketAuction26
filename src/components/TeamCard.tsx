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
        relative rounded-[6px] overflow-hidden transition-all duration-200
        ${isSelectable ? 'cursor-pointer hover:border-[#10B981]/40' : ''}
        ${isSelected 
          ? 'bg-[#1A2234] border-2 border-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
          : 'bg-[#111827] border border-[#1F2937] hover:border-[#3C4A42]'}
        ${className}
      `}
    >
      {/* Top team accent bar */}
      <div 
        className="h-1 w-full"
        style={{ backgroundColor: primaryColor }}
      />

      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-[4px] bg-[#10B981] text-[#090D16] flex items-center justify-center shadow-lg z-10">
          <CheckmarkIcon size={12} color="#090D16" />
        </div>
      )}

      <div className={compact ? 'p-2.5' : 'p-3.5 sm:p-4'}>
        {/* Header: Crest + Franchise Info */}
        <div className="flex items-center gap-3">
          <div 
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-[4px] bg-[#0F131C] border border-[#1F2937] flex items-center justify-center p-1.5 flex-shrink-0 relative overflow-hidden"
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
                className="font-['Outfit'] font-extrabold text-sm tracking-wide"
                style={{ color: primaryColor }}
              >
                {franchise.id}
              </span>

              {isHost && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-[2px] bg-[#F59E0B]/15 text-[#FFB95F] text-[8px] font-mono font-bold uppercase">
                  <CrownHostIcon size={9} color="#FFB95F" /> HOST
                </span>
              )}

              {isAi && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-[2px] bg-purple-500/15 text-purple-300 text-[8px] font-mono font-bold uppercase">
                  <BotsAiIcon size={9} color="#D8B4FE" /> AI
                </span>
              )}

              {statusBadge && (
                <span className="px-1.5 py-0.2 rounded-[2px] bg-[#1F2937] text-[#BBCABF] text-[8px] font-mono font-medium">
                  {statusBadge}
                </span>
              )}
            </div>

            <h4 className="font-['Outfit'] font-bold text-xs text-[#DFE2EF] truncate">
              {displayName || franchise.name}
            </h4>

            {franchise.tagline && !displayName && (
              <span className="text-[10px] text-[#86948A] block italic truncate">
                "{franchise.tagline}"
              </span>
            )}
          </div>
        </div>

        {/* Financial & Squad Stats (when active in room) */}
        {(purseRemainingLakhs !== undefined || squadCount !== undefined) && (
          <div className="mt-3 pt-2.5 border-t border-[#1F2937] grid grid-cols-2 gap-2 text-[10px]">
            {purseRemainingLakhs !== undefined && (
              <div>
                <span className="text-[#86948A] block text-[9px] uppercase font-bold flex items-center gap-1">
                  <PurseCoinsIcon size={10} color="#86948A" /> Purse
                </span>
                <span className="font-mono font-bold text-xs text-[#DFE2EF]">
                  {formatCr(purseRemainingLakhs)}
                </span>
              </div>
            )}

            {squadCount !== undefined && (
              <div className="text-right">
                <span className="text-[#86948A] block text-[9px] uppercase font-bold flex items-center justify-end gap-1">
                  Squad ({squadCount}/{maxSquad})
                </span>
                <span className="font-mono font-bold text-xs text-[#10B981]">
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
