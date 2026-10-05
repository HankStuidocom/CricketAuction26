import { motion } from 'framer-motion';
import clsx from 'clsx';
import { GameTeam } from '../types';
import { formatPoints } from '../utils/formatting';
import { IPL_TEAMS } from '../utils/constants';
import { Users } from 'lucide-react';

interface TeamCardProps {
  team: GameTeam;
  isCurrentBidder?: boolean;
  isMyTeam?: boolean;
  compact?: boolean;
}

export default function TeamCard({ team, isCurrentBidder, isMyTeam, compact }: TeamCardProps) {
  const iplTeam =
    team.iplTeam ||
    IPL_TEAMS.find((t) => t.id === team.iplTeamId) ||
    IPL_TEAMS.find((t) => t.id === team.id) ||
    IPL_TEAMS[0];

  const playersList = team.players || team.squad || [];

  if (compact) {
    return (
      <motion.div
        animate={isCurrentBidder ? { scale: [1, 1.02, 1] } : { scale: 1 }}
        transition={{ repeat: isCurrentBidder ? Infinity : 0, duration: 1 }}
        className={clsx(
          'flex items-center gap-2 p-2 rounded-lg border transition-all',
          isCurrentBidder
            ? 'border-gold/60 bg-gold/10 shadow-md'
            : isMyTeam
            ? 'border-cricket-green/40 bg-cricket-green/5'
            : team.isEliminated
            ? 'border-white/5 opacity-40'
            : 'border-white/10 bg-card'
        )}
      >
        {/* Team color indicator */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-[10px] shrink-0"
          style={{ background: `linear-gradient(135deg, ${iplTeam.color}, ${iplTeam.secondaryColor})` }}
        >
          {iplTeam.abbr}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {isMyTeam && <span className="text-[10px] text-cricket-green">YOU</span>}
            <span className="text-xs font-bold text-white truncate">
              {team.isAI ? `AI (${iplTeam.abbr})` : team.managerName}
            </span>
            {isCurrentBidder && (
              <span className="text-[10px] text-gold font-bold ml-auto shrink-0">BIDDING</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gold font-mono">{formatPoints(team.purse)}</span>
            <span className="text-[10px] text-white/40">
              <Users size={8} className="inline mr-0.5" />{playersList.length}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      animate={isCurrentBidder ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ repeat: isCurrentBidder ? Infinity : 0, duration: 1.2 }}
      className={clsx(
        'flex flex-col gap-3 p-4 rounded-xl border-2 transition-all',
        isCurrentBidder
          ? 'border-gold shadow-lg'
          : isMyTeam
          ? 'border-cricket-green/40'
          : team.isEliminated
          ? 'border-white/5 opacity-50'
          : 'border-white/10'
      )}
      style={{
        background: isCurrentBidder
          ? 'linear-gradient(135deg, rgba(245,166,35,0.1), rgba(26,32,53,1))'
          : 'rgba(26,32,53,0.8)',
        boxShadow: isCurrentBidder ? `0 0 20px ${iplTeam.color}40` : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md"
          style={{ background: `linear-gradient(135deg, ${iplTeam.color}, ${iplTeam.secondaryColor})` }}
        >
          {iplTeam.abbr}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">{iplTeam.name}</span>
            {isMyTeam && (
              <span className="badge bg-cricket-green/20 text-cricket-green border border-cricket-green/40 text-[10px]">
                YOU
              </span>
            )}
            {team.isAI && (
              <span className="badge bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px]">
                AI
              </span>
            )}
          </div>
          <div className="text-white/50 text-xs mt-0.5">{team.managerName}</div>
        </div>
        {isCurrentBidder && (
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="text-gold text-xs font-black"
          >
            BIDDING
          </motion.div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-gold font-black text-lg">{formatPoints(team.purse)}</div>
          <div className="text-white/40 text-[10px]">REMAINING</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-white font-black text-lg">{playersList.length}</div>
          <div className="text-white/40 text-[10px]">PLAYERS</div>
        </div>
      </div>

      {/* Eliminated overlay */}
      {team.isEliminated && (
        <div className="text-center text-danger text-xs font-bold">❌ ELIMINATED</div>
      )}
    </motion.div>
  );
}
