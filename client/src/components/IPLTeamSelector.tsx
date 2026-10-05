import { motion } from 'framer-motion';
import clsx from 'clsx';
import { IPLTeam } from '../types';
import { IPL_TEAMS } from '../utils/constants';

interface IPLTeamSelectorProps {
  selectedTeamId: string | null;
  disabledTeamIds?: string[];
  onSelect: (team: IPLTeam) => void;
  showLabel?: boolean;
}

export default function IPLTeamSelector({
  selectedTeamId,
  disabledTeamIds = [],
  onSelect,
  showLabel = true,
}: IPLTeamSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {IPL_TEAMS.map((team, idx) => {
        const isSelected = selectedTeamId === team.id;
        const isDisabled = disabledTeamIds.includes(team.id);

        return (
          <motion.button
            key={team.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            onClick={() => !isDisabled && onSelect(team)}
            disabled={isDisabled}
            className={clsx(
              'relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200',
              isSelected
                ? 'border-gold shadow-lg scale-105'
                : isDisabled
                ? 'border-white/10 opacity-40 cursor-not-allowed'
                : 'border-white/10 hover:border-white/30 hover:scale-102 cursor-pointer'
            )}
            style={{
              borderColor: isSelected ? '#F5A623' : isDisabled ? undefined : undefined,
              boxShadow: isSelected ? `0 0 20px ${team.color}60` : undefined,
              background: isSelected
                ? `linear-gradient(135deg, ${team.color}20, ${team.secondaryColor}10)`
                : 'rgba(26,32,53,0.8)',
            }}
          >
            {/* Team color circle / avatar */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-black text-sm shadow-md"
              style={{
                background: `linear-gradient(135deg, ${team.color}, ${team.secondaryColor})`,
                boxShadow: `0 4px 12px ${team.color}50`,
              }}
            >
              <span className="text-white text-xs font-black">{team.abbr}</span>
            </div>

            {showLabel && (
              <div className="text-center">
                <div className="font-bold text-white text-xs leading-tight">{team.abbr}</div>
                <div className="text-white/50 text-[10px] leading-tight mt-0.5 hidden sm:block">
                  {team.city}
                </div>
              </div>
            )}

            {isSelected && (
              <motion.div
                layoutId="team-selector-ring"
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  border: `2px solid ${team.color}`,
                  boxShadow: `inset 0 0 10px ${team.color}20`,
                }}
              />
            )}

            {isDisabled && (
              <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/40">
                <span className="text-[10px] text-white/70 font-bold">TAKEN</span>
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
