import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Award, DollarSign, Star, RefreshCw, Home } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { formatPoints } from '../utils/formatting';

export default function Results() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { room, simulationResult } = useGameStore();

  const leaderboard = simulationResult?.leaderboard || [];
  const champion = simulationResult?.champion || leaderboard[0];
  const stats = simulationResult?.auctionStats;

  return (
    <div className="min-h-screen py-10 px-4 max-w-6xl mx-auto space-y-8">
      {/* Champion Banner */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-gold/30 via-gold/10 to-card p-8 rounded-3xl border-2 border-gold text-center relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 p-8 text-gold/10 pointer-events-none">
          <Trophy size={160} />
        </div>

        <span className="text-gold text-xs font-bold uppercase tracking-widest badge bg-gold/20 border border-gold/40 px-4 py-1">
          TOURNAMENT CHAMPION 🏆
        </span>

        <h1 className="text-4xl sm:text-6xl font-black text-white mt-4 tracking-tight">
          {champion
            ? ('iplTeam' in champion && champion.iplTeam
                ? champion.iplTeam.name
                : ('teamName' in champion && (champion as any).teamName) || champion.managerName)
            : 'CHAMPION'}
        </h1>

        <p className="text-gold text-lg font-bold mt-2">
          Managed by <span className="text-white">{champion?.managerName || 'Manager'}</span>
        </p>

        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => navigate('/create')}
            className="btn bg-gold hover:bg-gold-light text-navy font-black px-6 py-3 text-sm flex items-center gap-2 shadow-lg"
          >
            <RefreshCw size={16} /> NEW AUCTION
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 text-sm flex items-center gap-2"
          >
            <Home size={16} /> HOME
          </button>
        </div>
      </motion.div>

      {/* Leaderboard Table */}
      <div className="bg-card p-6 rounded-2xl border border-white/10 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Trophy className="text-gold" size={20} /> Tournament Standings
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-xs font-bold uppercase">
                <th className="py-3 px-4">POS</th>
                <th className="py-3 px-4">TEAM</th>
                <th className="py-3 px-4">MANAGER</th>
                <th className="py-3 px-4 text-center">PLAYED</th>
                <th className="py-3 px-4 text-center">WON</th>
                <th className="py-3 px-4 text-center">LOST</th>
                <th className="py-3 px-4 text-right">POINTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {leaderboard.map((entry, idx) => (
                <tr
                  key={entry.teamId}
                  className={`hover:bg-white/5 transition ${
                    idx === 0 ? 'bg-gold/10 font-bold' : ''
                  }`}
                >
                  <td className="py-4 px-4 font-mono font-bold text-gold">
                    {idx === 0 ? '👑 1' : `#${idx + 1}`}
                  </td>
                  <td className="py-4 px-4 font-bold text-white flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color || '#F5A623' }}
                    />
                    {entry.teamName} ({entry.abbr})
                  </td>
                  <td className="py-4 px-4 text-white/70">{entry.managerName}</td>
                  <td className="py-4 px-4 text-center text-white/60">{entry.matchesPlayed}</td>
                  <td className="py-4 px-4 text-center text-green-400 font-bold">{entry.matchesWon}</td>
                  <td className="py-4 px-4 text-center text-red-400">{entry.matchesLost}</td>
                  <td className="py-4 px-4 text-right font-mono font-black text-gold text-base">
                    {entry.points} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auction Key Stats */}
      {stats && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="text-gold" size={20} /> Auction Highlights & Stats
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Most Expensive */}
            {stats.mostExpensivePlayer && (
              <div className="bg-card p-4 rounded-xl border border-white/10 space-y-1">
                <div className="text-gold text-xs font-bold uppercase">💰 MOST EXPENSIVE</div>
                <div className="font-bold text-white text-base">
                  {stats.mostExpensivePlayer.player?.name || 'N/A'}
                </div>
                <div className="text-gold font-mono font-bold text-sm">
                  {formatPoints(stats.mostExpensivePlayer.price)}
                </div>
              </div>
            )}

            {/* Best Bargain */}
            {stats.bestBargain && (
              <div className="bg-card p-4 rounded-xl border border-white/10 space-y-1">
                <div className="text-green-400 text-xs font-bold uppercase">🧠 BEST BARGAIN</div>
                <div className="font-bold text-white text-base">
                  {stats.bestBargain.player?.name || 'N/A'}
                </div>
                <div className="text-green-400 font-mono font-bold text-sm">
                  {formatPoints(stats.bestBargain.price)}
                </div>
              </div>
            )}

            {/* Total Spent */}
            <div className="bg-card p-4 rounded-xl border border-white/10 space-y-1">
              <div className="text-white/50 text-xs font-bold uppercase">📈 TOTAL SPENT</div>
              <div className="font-bold text-white text-base">
                {formatPoints(stats.totalMoneySpent || 0)}
              </div>
              <div className="text-white/40 text-xs">Across all teams</div>
            </div>

            {/* Unsold count */}
            <div className="bg-card p-4 rounded-xl border border-white/10 space-y-1">
              <div className="text-white/50 text-xs font-bold uppercase">❌ UNSOLD PLAYERS</div>
              <div className="font-bold text-white text-base">{stats.unsoldCount || 0}</div>
              <div className="text-white/40 text-xs">Passed without bids</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
