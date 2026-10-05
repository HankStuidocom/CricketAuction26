import { useState, useEffect } from 'react';
import { Search, Filter, Shield } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import PlayerCard from '../components/PlayerCard';
import { Player } from '../types';
import { SERVER_URL } from '../utils/constants';

export default function PlayerDatabase() {
  const { room } = useGameStore();
  const [playersList, setPlayersList] = useState<Player[]>(room?.playerPool || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [loading, setLoading] = useState(playersList.length === 0);

  useEffect(() => {
    if (room?.playerPool && room.playerPool.length > 0) {
      setPlayersList(room.playerPool);
      setLoading(false);
      return;
    }

    fetch(`${SERVER_URL}/api/players`)
      .then((res) => res.json())
      .then((data) => {
        setPlayersList(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch players:', err);
        setLoading(false);
      });
  }, [room?.playerPool]);

  const filteredPlayers = playersList.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'ALL' || p.role === selectedRole;
    const matchesTier = selectedTier === 'ALL' || p.tier === selectedTier;
    return matchesSearch && matchesRole && matchesTier;
  });

  return (
    <div className="min-h-screen py-8 px-4 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-card/60 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
        <span className="text-gold text-xs font-bold uppercase tracking-wider">IPL 2026 PLAYERS</span>
        <h1 className="text-3xl font-black text-white mt-1">Indian Player Pool ({playersList.length})</h1>
        <p className="text-white/60 text-xs mt-1">
          Explore all Indian cricket players available in the auction database with ratings & base prices.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-card p-4 rounded-xl border border-white/10 flex flex-wrap gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search player name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-gold"
          />
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'BAT', 'BOWL', 'AR', 'WK'].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedRole === role
                  ? 'bg-gold text-navy'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {/* Tier Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'S', 'A', 'B', 'C', 'D'].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedTier === tier
                  ? 'bg-gold text-navy'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              TIER {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Players Grid */}
      {loading ? (
        <div className="bg-card p-12 rounded-2xl border border-white/10 text-center">
          <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/50 text-sm">Loading Indian player database...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlayers.map((player) => (
            <PlayerCard key={player.id} player={player} variant="squad" />
          ))}
        </div>
      )}

      {!loading && filteredPlayers.length === 0 && (
        <div className="bg-card p-12 rounded-2xl border border-white/10 text-center">
          <p className="text-white/50 text-sm">No players match your search filter.</p>
        </div>
      )}
    </div>
  );
}
