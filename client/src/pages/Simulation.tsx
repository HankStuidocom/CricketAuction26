import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Trophy, Flame, Award, ChevronRight } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { MatchResult } from '../types';

export default function Simulation() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { room, socket, simulationResult } = useGameStore();

  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Navigate when status changes to RESULTS
  useEffect(() => {
    if (room?.status === 'RESULTS') {
      navigate(`/results/${room.code}`);
    }
  }, [room?.status, room?.code, navigate]);

  if (!room) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <h2 className="text-xl font-bold text-white">Loading Simulation...</h2>
      </div>
    );
  }

  const matches: MatchResult[] = simulationResult?.matches || [];
  const currentMatch = matches[currentMatchIndex];

  const handleNextMatch = () => {
    if (currentMatchIndex < matches.length - 1) {
      setCurrentMatchIndex((prev) => prev + 1);
    } else {
      navigate(`/results/${room.code}`);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-card/60 p-6 rounded-2xl border border-white/10 text-center backdrop-blur-md">
        <span className="text-gold text-xs font-bold uppercase tracking-wider">PHASE 4: T20 SIMULATION</span>
        <h1 className="text-3xl font-black text-white mt-1">IPL 2026 T20 Tournament Matches</h1>
        <p className="text-white/60 text-xs mt-1">
          Automated T20 match simulation based on your team squad composition and captain multipliers.
        </p>
      </div>

      {/* Main Match Card */}
      {currentMatch ? (
        <motion.div
          key={currentMatchIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card p-6 sm:p-8 rounded-2xl border-2 border-gold/30 shadow-2xl space-y-6"
        >
          {/* Match header banner */}
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <span className="text-gold text-xs font-bold font-mono">
              MATCH {currentMatchIndex + 1} OF {matches.length}
            </span>
            <span className="badge bg-green-500/20 text-green-400 border border-green-500/40 text-xs">
              COMPLETED
            </span>
          </div>

          {/* Teams Scoreboard */}
          <div className="grid grid-cols-1 sm:grid-cols-5 items-center gap-4 py-4">
            {/* Team 1 */}
            <div className="sm:col-span-2 text-center sm:text-right space-y-1">
              <h3 className="text-2xl font-black text-white">{currentMatch.team1Id}</h3>
              <div className="text-3xl font-black text-gold">
                {currentMatch.team1Score}/{currentMatch.team1Wickets}
              </div>
              <div className="text-white/50 text-xs">{currentMatch.team1Overs} Overs</div>
            </div>

            {/* VS Badge */}
            <div className="text-center sm:col-span-1">
              <span className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-black text-xs text-white/60 mx-auto">
                VS
              </span>
            </div>

            {/* Team 2 */}
            <div className="sm:col-span-2 text-center sm:text-left space-y-1">
              <h3 className="text-2xl font-black text-white">{currentMatch.team2Id}</h3>
              <div className="text-3xl font-black text-gold">
                {currentMatch.team2Score}/{currentMatch.team2Wickets}
              </div>
              <div className="text-white/50 text-xs">{currentMatch.team2Overs} Overs</div>
            </div>
          </div>

          {/* Winner Banner */}
          <div className="bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 p-4 rounded-xl text-center border border-gold/40">
            <div className="text-xs text-gold/80 font-bold uppercase tracking-wider">RESULT</div>
            <div className="text-lg font-black text-gold mt-0.5">
              🏆 {currentMatch.winnerId} WINS BY {currentMatch.margin}!
            </div>
            {currentMatch.manOfMatch && (
              <div className="text-xs text-white/70 mt-1">
                ⭐ Man of the Match: <span className="text-white font-bold">{currentMatch.manOfMatch}</span>
              </div>
            )}
          </div>

          {/* Player Highlights */}
          {currentMatch.performances && currentMatch.performances.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50">TOP PERFORMANCES</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentMatch.performances.slice(0, 4).map((p, idx) => (
                  <div key={idx} className="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white text-sm">{p.playerName}</div>
                      <div className="text-white/50 text-xs">{p.teamId}</div>
                    </div>
                    <div className="text-right">
                      {p.runs !== undefined && <div className="text-gold font-bold text-sm">{p.runs} runs</div>}
                      {p.wickets !== undefined && <div className="text-green-400 font-bold text-sm">{p.wickets} wkts</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end pt-4 border-t border-white/10">
            <button
              onClick={handleNextMatch}
              className="btn bg-gold hover:bg-gold-light text-navy font-black px-6 py-3 text-sm flex items-center gap-2 shadow-lg shadow-gold/20"
            >
              {currentMatchIndex < matches.length - 1 ? (
                <>
                  NEXT MATCH <ChevronRight size={16} />
                </>
              ) : (
                <>
                  VIEW FINAL LEADERBOARD <Trophy size={16} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="bg-card p-12 rounded-2xl border border-white/10 text-center space-y-4">
          <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-lg font-bold text-white">Simulating Matches...</h3>
          <p className="text-white/50 text-xs">Generating ball-by-ball T20 match results.</p>
        </div>
      )}
    </div>
  );
}
