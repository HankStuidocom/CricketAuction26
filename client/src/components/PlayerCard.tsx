import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Player, BoughtPlayer } from '../types';
import {
  formatPoints,
  getRoleColor,
  getRoleLabel,
  getTierColor,
  getTierLabel,
  getTierGlow,
  getTierBorderColor,
  getInitials,
  getAttributeBarColor,
  getRatingColor,
} from '../utils/formatting';

type CardVariant = 'auction' | 'squad' | 'mini';

interface PlayerCardProps {
  player: Player | BoughtPlayer;
  variant?: CardVariant;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  isSelected?: boolean;
  showBoughtPrice?: boolean;
  onClick?: () => void;
}

function AttributeBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/50 text-[10px] w-8 shrink-0 font-bold">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: getAttributeBarColor(value) }}
        />
      </div>
      <span className="text-white/70 text-[10px] w-6 text-right font-mono">{value}</span>
    </div>
  );
}

export default function PlayerCard({
  player,
  variant = 'auction',
  isCaptain,
  isViceCaptain,
  isSelected,
  showBoughtPrice,
  onClick,
}: PlayerCardProps) {
  const isBought = 'boughtFor' in player;
  const borderColor = getTierBorderColor(player.tier);
  const glowStyle = getTierGlow(player.tier);

  if (variant === 'mini') {
    return (
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        className={clsx(
          'relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
          isSelected ? 'border-gold bg-gold/10' : 'border-white/10 bg-card hover:border-white/30'
        )}
      >
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0"
          style={{ background: `linear-gradient(135deg, ${borderColor}80, ${borderColor}40)` }}
        >
          {getInitials(player.name)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {(isCaptain || ('isCaptain' in player && player.isCaptain)) && <span className="text-xs">👑</span>}
            {(isViceCaptain || ('isViceCaptain' in player && player.isViceCaptain)) && <span className="text-xs">⭐</span>}
            <span className="font-bold text-sm text-white truncate">{player.name}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={clsx('badge border text-[10px]', getRoleColor(player.role))}>
              {player.role}
            </span>
            {showBoughtPrice && isBought && (
              <span className="text-gold text-[10px] font-bold">{formatPoints(player.boughtFor || 0)}</span>
            )}
          </div>
        </div>

        <div
          className="text-lg font-black"
          style={{ color: getRatingColor(player.overallRating) }}
        >
          {player.overallRating}
        </div>
      </motion.div>
    );
  }

  if (variant === 'squad') {
    return (
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={clsx(
          'relative flex flex-col gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
          isSelected ? 'border-gold' : 'hover:border-white/30'
        )}
        style={{
          borderColor: isSelected ? '#F5A623' : borderColor,
          background: 'linear-gradient(135deg, #1A2035, #232d4a)',
          boxShadow: isSelected ? glowStyle : undefined,
        }}
      >
        {/* Captain / VC badges */}
        {(isCaptain || ('isCaptain' in player && player.isCaptain)) && (
          <div className="absolute -top-2 -right-2 bg-gold text-navy text-[10px] font-black px-2 py-0.5 rounded-full shadow">
            👑 C
          </div>
        )}
        {(isViceCaptain || ('isViceCaptain' in player && player.isViceCaptain)) && (
          <div className="absolute -top-2 -right-2 bg-white/80 text-navy text-[10px] font-black px-2 py-0.5 rounded-full shadow">
            ⭐ VC
          </div>
        )}

        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm"
            style={{ background: `linear-gradient(135deg, ${borderColor}80, ${borderColor}40)` }}
          >
            {getInitials(player.name)}
          </div>
          <div className="flex-1">
            <div className="font-bold text-white text-sm">{player.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={clsx('badge border text-[10px]', getRoleColor(player.role))}>
                {getRoleLabel(player.role)}
              </span>
              <span className={clsx('badge border text-[10px]', getTierColor(player.tier))}>
                {getTierLabel(player.tier)}
              </span>
            </div>
          </div>
          <div
            className="text-2xl font-black"
            style={{ color: getRatingColor(player.overallRating) }}
          >
            {player.overallRating}
          </div>
        </div>

        {showBoughtPrice && isBought && (
          <div className="flex justify-between items-center pt-2 border-t border-white/10">
            <span className="text-white/50 text-xs">Bought for</span>
            <span className="text-gold font-bold text-sm">{formatPoints(player.boughtFor || 0)}</span>
          </div>
        )}
      </motion.div>
    );
  }

  // ── Auction variant (large) ──────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ x: -60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="relative flex flex-col rounded-2xl border-2 overflow-hidden"
      style={{
        borderColor,
        background: 'linear-gradient(160deg, #1A2035 0%, #0A0F1E 100%)',
        boxShadow: glowStyle,
      }}
    >
      {/* Tier banner */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: `linear-gradient(90deg, ${borderColor}, transparent)` }}
      />

      {/* Header */}
      <div className="p-5 pb-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={clsx('badge border text-xs', getRoleColor(player.role))}>
                {getRoleLabel(player.role)}
              </span>
              <span className={clsx('badge border text-xs', getTierColor(player.tier))}>
                {getTierLabel(player.tier)}
              </span>
              {player.nationality === 'OVERSEAS' && (
                <span className="badge bg-purple-500/20 text-purple-300 border-purple-500/40 border text-xs">
                  OVERSEAS
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-white leading-tight">{player.name}</h2>
            <div className="flex items-center gap-1 mt-1 text-white/50 text-sm">
              <span>🇮🇳</span>
              <span>{player.isCapped ? 'Capped' : 'Uncapped'}</span>
              {player.age && <span>• Age {player.age}</span>}
            </div>
          </div>

          {/* Overall Rating */}
          <div className="text-center">
            <div
              className="text-5xl font-black leading-none"
              style={{ color: getRatingColor(player.overallRating), textShadow: `0 0 20px currentColor` }}
            >
              {player.overallRating}
            </div>
            <div className="text-white/40 text-xs mt-1">OVR</div>
          </div>
        </div>

        {/* Avatar */}
        <div className="flex justify-center my-4">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black shadow-xl"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${borderColor}60, ${borderColor}20)`,
              border: `3px solid ${borderColor}60`,
              boxShadow: `0 0 30px ${borderColor}40`,
            }}
          >
            {getInitials(player.name)}
          </div>
        </div>
      </div>

      {/* Attributes */}
      <div className="px-5 py-3 space-y-2 border-t border-white/10">
        <AttributeBar label="BAT" value={player.attributes.batting} />
        <AttributeBar label="BOWL" value={player.attributes.bowling} />
        <AttributeBar label="FIELD" value={player.attributes.fielding} />
        <AttributeBar label="EXP" value={player.attributes.experience} />
      </div>

      {/* Specialties */}
      {player.specialties && player.specialties.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-1">
          {player.specialties.map(s => (
            <span key={s} className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Base Price footer */}
      <div className="px-5 py-3 bg-white/5 flex justify-between items-center">
        <span className="text-white/50 text-xs">BASE PRICE</span>
        <span className="text-gold font-black text-lg">{formatPoints(player.basePrice)}</span>
      </div>
    </motion.div>
  );
}
