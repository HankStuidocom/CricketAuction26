import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { FRANCHISE_MAP, formatCr } from '../lib/utils';
import { safeFetch } from '../lib/api';
import GameButton from '../components/GameButton';
import GamePanel from '../components/GamePanel';
import { RoleBadge } from '../components/GameBadge';
import { 
  TrophyCupIcon, 
  GavelIcon, 
  PurseCoinsIcon,
  CrownHostIcon
} from '../components/GameIcons';
import { ArrowLeft, Flame, Users, Sparkles, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface ResultPlayer {
  id: string;
  player_name: string;
  primary_role: string;
  country: string;
  status: string;
  game_points: number;
  base_price_lakhs: number;
  sold_price_lakhs: number;
  franchise_id: string;
}

interface TeamStanding {
  franchise_id: string;
  display_name: string;
  is_ai: boolean;
  purse_remaining_lakhs: number;
  total_spent_lakhs: number;
  total_points: number;
  avg_rating: number;
  squad_count: number;
  overseas_count: number;
  roles: { batters: number; bowlers: number; allRounders: number; keepers: number };
  squad: ResultPlayer[];
  rank: number;
}

export default function Results() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<ResultPlayer[]>([]);
  const [teams, setTeams] = useState<TeamStanding[]>([]);
  const [awards, setAwards] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'standings' | 'players' | 'awards'>('standings');
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFranchise, setFilterFranchise] = useState<string>('ALL');

  useEffect(() => {
    confetti({
      particleCount: 140,
      spread: 90,
      origin: { y: 0.45 }
    });

    safeFetch<any>(`/api/rooms/${code}/results`)
      .then((data) => {
        if (Array.isArray(data)) {
          // Flat array fallback
          setPlayers(data);
          // Synthesize minimal teams
          const teamMap: Record<string, TeamStanding> = {};
          data.forEach(p => {
            if (!teamMap[p.franchise_id]) {
              teamMap[p.franchise_id] = {
                franchise_id: p.franchise_id,
                display_name: p.franchise_id,
                is_ai: false,
                purse_remaining_lakhs: 0,
                total_spent_lakhs: 0,
                total_points: 0,
                avg_rating: 0,
                squad_count: 0,
                overseas_count: 0,
                roles: { batters: 0, bowlers: 0, allRounders: 0, keepers: 0 },
                squad: [],
                rank: 1
              };
            }
            teamMap[p.franchise_id].squad.push(p);
            teamMap[p.franchise_id].total_spent_lakhs += p.sold_price_lakhs || 0;
            teamMap[p.franchise_id].total_points += p.game_points || 0;
            teamMap[p.franchise_id].squad_count += 1;
            if (p.status === 'OS') teamMap[p.franchise_id].overseas_count += 1;
            if (p.primary_role === 'Batter') teamMap[p.franchise_id].roles.batters += 1;
            else if (p.primary_role === 'Bowler') teamMap[p.franchise_id].roles.bowlers += 1;
            else if (p.primary_role === 'All-Rounder') teamMap[p.franchise_id].roles.allRounders += 1;
            else if (p.primary_role === 'Wicket-Keeper') teamMap[p.franchise_id].roles.keepers += 1;
          });
          const synthesized = Object.values(teamMap).sort((a, b) => b.total_points - a.total_points);
          synthesized.forEach((t, i) => { 
            t.rank = i + 1;
            t.avg_rating = t.squad_count > 0 ? Number((t.total_points / t.squad_count).toFixed(1)) : 0;
          });
          setTeams(synthesized);
        } else if (data) {
          setPlayers(data.players || []);
          setTeams(data.teams || []);
          setAwards(data.awards || null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [code]);

  // Derived awards
  const totalSpentLakhs = players.reduce((acc, r) => acc + (r.sold_price_lakhs || 0), 0);
  const topBuy = awards?.topBuy || (players.length > 0 ? [...players].sort((a, b) => (b.sold_price_lakhs || 0) - (a.sold_price_lakhs || 0))[0] : null);
  const championTeam = teams[0] || null;

  // Filtered players
  const filteredPlayers = players.filter(p => {
    const matchesSearch = !searchQuery.trim() || p.player_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFranchise = filterFranchise === 'ALL' || p.franchise_id === filterFranchise;
    return matchesSearch && matchesFranchise;
  });

  return (
    <div className="min-h-screen bg-[#090D16] text-[#DFE2EF] py-8 px-4 sm:px-6 max-w-5xl mx-auto font-sans relative">
      
      {/* Stadium spotlight glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Trophy Banner */}
      <div className="text-center mb-8 relative z-10 animate-fade-up">
        <div className="inline-flex p-4 rounded-[8px] bg-gradient-to-br from-[#F59E0B]/20 to-[#10B981]/10 border border-[#F59E0B]/40 mb-3 text-[#F59E0B] shadow-[0_0_35px_rgba(245,158,11,0.25)]">
          <TrophyCupIcon size={40} color="#F59E0B" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white uppercase">
          Auction Complete
        </h1>
        <p className="text-xs sm:text-sm text-[#86948A] mt-1 max-w-md mx-auto">
          The auction has ended. Review final standings, squad ratings, marquee buys, and purse allocations.
        </p>

        {championTeam && (
          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#FFB95F] text-xs font-display font-bold">
            <CrownHostIcon size={14} color="#F59E0B" />
            <span>Top Rated Squad: {championTeam.display_name} ({championTeam.franchise_id}) — {championTeam.total_points} Rating Pts</span>
          </div>
        )}
      </div>

      {/* Post-Match Awards 3-Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6 relative z-10">
        {/* Card 1: Top Buy */}
        <div className="p-4 rounded-[6px] bg-[#111827] border border-[#10B981]/30 shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#10B981] flex items-center gap-1.5">
            <Flame size={12} className="text-[#10B981]" /> MARQUEE TOP BUY
          </span>
          {topBuy ? (
            <div className="mt-2">
              <div className="font-display font-black text-lg text-white truncate">
                {topBuy.player_name}
              </div>
              <div className="text-xs text-[#86948A] flex items-center gap-1.5 mt-0.5">
                <span className="font-display font-bold text-[#10B981]">{topBuy.franchise_id}</span>
                <span>·</span>
                <span className="font-mono text-white font-bold">{formatCr(topBuy.sold_price_lakhs)}</span>
                <span>·</span>
                <span className="text-[#FFB95F] font-mono font-bold">{topBuy.game_points}/15 ★</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#86948A] mt-2">No player purchases</p>
          )}
        </div>

        {/* Card 2: Total Tournament Purse Spent */}
        <div className="p-4 rounded-[6px] bg-[#111827] border border-[#06B6D4]/30 shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#06B6D4] flex items-center gap-1.5">
            <PurseCoinsIcon size={12} color="#06B6D4" /> TOTAL CAPITAL SPENT
          </span>
          <div className="mt-2">
            <div className="font-mono font-bold text-2xl text-white">
              {formatCr(totalSpentLakhs)}
            </div>
            <div className="text-[10px] text-[#86948A] mt-0.5">
              Across all participating franchises
            </div>
          </div>
        </div>

        {/* Card 3: Players Drafted */}
        <div className="p-4 rounded-[6px] bg-[#111827] border border-[#F59E0B]/30 shadow-sm">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F59E0B] flex items-center gap-1.5">
            <Users size={12} className="text-[#F59E0B]" /> ROSTERS COMPLETED
          </span>
          <div className="mt-2">
            <div className="font-mono font-bold text-2xl text-white">
              {players.length} Players
            </div>
            <div className="text-[10px] text-[#86948A] mt-0.5">
              Drafted into team franchises
            </div>
          </div>
        </div>
      </div>

      {/* Subnavigation Tabs */}
      <div className="flex border-b border-[#1F2937] mb-6 gap-6 text-xs font-bold font-display uppercase tracking-wider relative z-10">
        <button
          onClick={() => setActiveTab('standings')}
          className={`pb-2.5 transition cursor-pointer ${
            activeTab === 'standings' 
              ? 'text-[#10B981] border-b-2 border-[#10B981]' 
              : 'text-[#86948A] hover:text-[#DFE2EF]'
          }`}
        >
          Team Standings ({teams.length})
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={`pb-2.5 transition cursor-pointer ${
            activeTab === 'players' 
              ? 'text-[#10B981] border-b-2 border-[#10B981]' 
              : 'text-[#86948A] hover:text-[#DFE2EF]'
          }`}
        >
          Drafted Roster ({players.length})
        </button>
        <button
          onClick={() => setActiveTab('awards')}
          className={`pb-2.5 transition cursor-pointer ${
            activeTab === 'awards' 
              ? 'text-[#10B981] border-b-2 border-[#10B981]' 
              : 'text-[#86948A] hover:text-[#DFE2EF]'
          }`}
        >
          Awards & Highlights
        </button>
      </div>

      {/* TAB 1: TEAM STANDINGS */}
      {activeTab === 'standings' && (
        <div className="space-y-3 mb-8 relative z-10 animate-fade-up">
          {teams.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#86948A] bg-[#111827] border border-[#1F2937] rounded-[6px]">
              No franchise standings available.
            </div>
          ) : (
            teams.map((team) => {
              const franchise = FRANCHISE_MAP[team.franchise_id];
              const isExpanded = expandedTeam === team.franchise_id;
              const isChamp = team.rank === 1;

              return (
                <div 
                  key={team.franchise_id} 
                  className={`rounded-[6px] bg-[#111827] border transition overflow-hidden shadow-sm ${
                    isChamp ? 'border-[#F59E0B]/50' : 'border-[#1F2937] hover:border-[#10B981]/40'
                  }`}
                >
                  <div 
                    onClick={() => setExpandedTeam(isExpanded ? null : team.franchise_id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-[#151D2F] transition"
                  >
                    {/* Left: Rank, Logo, Franchise Details */}
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center font-display font-black text-sm flex-shrink-0 ${
                        isChamp ? 'bg-[#F59E0B] text-[#090D16] shadow-[0_0_12px_rgba(245,158,11,0.5)]' : 'bg-[#0F131C] text-[#86948A] border border-[#1F2937]'
                      }`}>
                        {isChamp ? '👑' : `#${team.rank}`}
                      </div>

                      <div className="w-10 h-10 rounded-[4px] bg-[#0F131C] border border-[#1F2937] p-1 flex items-center justify-center flex-shrink-0 shadow-inner">
                        {franchise?.logoUrl ? (
                          <img src={franchise.logoUrl} alt={team.franchise_id} className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-lg">{franchise?.emoji || '🦁'}</span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm sm:text-base text-white">
                            {team.display_name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wider" style={{ backgroundColor: `${franchise?.primary || '#10B981'}25`, color: franchise?.primary || '#10B981' }}>
                            {team.franchise_id}
                          </span>
                          {team.is_ai && (
                            <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-1 rounded-[2px]">BOT</span>
                          )}
                        </div>
                        <span className="text-xs text-[#86948A] font-mono mt-0.5 block">
                          {team.squad_count} Players · {team.overseas_count} Overseas · Avg {team.avg_rating} ★
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1 text-[10px] font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            🏏 {team.roles?.batters || 0} Bat
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/30">
                            🎯 {team.roles?.bowlers || 0} Bowl
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            ⚡ {team.roles?.allRounders || 0} All
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            🧤 {team.roles?.keepers || 0} WK
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Points & Finances HUD */}
                    <div className="flex items-center justify-between sm:justify-end gap-5">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#86948A] block">Squad Rating</span>
                        <span className="font-mono font-black text-lg sm:text-xl text-[#10B981]">
                          {team.total_points} PTS
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#86948A] block">Purse Left / Spent</span>
                        <div className="font-mono font-bold text-xs text-white">
                          <span className="text-[#06B6D4]">{formatCr(team.purse_remaining_lakhs)}</span>
                          <span className="text-[#86948A]"> / </span>
                          <span className="text-[#86948A]">{formatCr(team.total_spent_lakhs)}</span>
                        </div>
                      </div>

                      <div className="text-[#86948A] hidden sm:block">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Squad List */}
                  {isExpanded && (
                    <div className="border-t border-[#1F2937] bg-[#0B0F19] p-3 sm:p-4">
                      <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#86948A] mb-2.5">
                        Acquired Squad ({team.squad.length} Players)
                      </h4>
                      {team.squad.length === 0 ? (
                        <p className="text-xs text-[#86948A]">No players acquired.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {team.squad.map((p, idx) => (
                            <div key={idx} className="p-2.5 rounded-[4px] bg-[#111827] border border-[#1F2937] flex items-center justify-between text-xs">
                              <div>
                                <span className="font-display font-bold text-white block">{p.player_name}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <RoleBadge role={p.primary_role} compact />
                                  <span className="text-[10px] font-mono text-[#FFB95F] font-bold">{p.game_points}/15 ★</span>
                                  {p.status === 'OS' && <span className="text-[9px] font-mono text-[#06B6D4]">OS</span>}
                                </div>
                              </div>
                              <span className="font-mono font-bold text-[#10B981]">
                                {formatCr(p.sold_price_lakhs)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: DRAFTED PLAYERS TABLE */}
      {activeTab === 'players' && (
        <div className="space-y-4 mb-8 relative z-10 animate-fade-up">
          
          {/* Search and Franchise Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86948A]" />
              <input
                type="text"
                placeholder="Search drafted player by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-[4px] bg-[#111827] border border-[#1F2937] text-xs font-mono text-white placeholder-[#86948A] focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <select
              value={filterFranchise}
              onChange={(e) => setFilterFranchise(e.target.value)}
              className="py-2 px-3 rounded-[4px] bg-[#111827] border border-[#1F2937] text-xs font-mono text-white focus:outline-none focus:border-[#10B981]"
            >
              <option value="ALL">All Franchises</option>
              {['CSK', 'MI', 'KKR', 'RCB', 'DC', 'PBKS', 'RR', 'SRH', 'GT', 'LSG'].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <GamePanel 
            title={`Drafted Players (${filteredPlayers.length})`}
            glow="none"
            className="p-0 overflow-hidden"
          >
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#86948A]">
                No players match your search filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1F2937] text-[10px] uppercase font-mono font-bold text-[#86948A] tracking-wider bg-[#181B25]">
                      <th className="py-2.5 px-4">Player</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Rating</th>
                      <th className="py-2.5 px-3">Winning Franchise</th>
                      <th className="py-2.5 px-4 text-right">Sold Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]">
                    {filteredPlayers.map((r, i) => (
                      <tr key={i} className="hover:bg-[#181B25] transition-colors">
                        <td className="py-2.5 px-4">
                          <span className="font-display font-bold text-white block">{r.player_name}</span>
                          <span className="text-[10px] text-[#86948A] font-mono">{r.status === 'OS' ? `Overseas (${r.country || 'OS'})` : 'India'}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <RoleBadge role={r.primary_role} compact />
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#FFB95F]">
                          {r.game_points}/15 ★
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 font-display font-bold" style={{ color: FRANCHISE_MAP[r.franchise_id]?.primary || '#10B981' }}>
                            {FRANCHISE_MAP[r.franchise_id]?.logoUrl && (
                              <img src={FRANCHISE_MAP[r.franchise_id].logoUrl} alt={r.franchise_id} className="w-4 h-4 object-contain" />
                            )}
                            <span>{r.franchise_id}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-[#10B981]">
                          {formatCr(r.sold_price_lakhs)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GamePanel>

        </div>
      )}

      {/* TAB 3: AWARDS & HIGHLIGHTS */}
      {activeTab === 'awards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 relative z-10 animate-fade-up">
          {/* Award: Marquee Buy */}
          <div className="p-5 rounded-[6px] bg-[#111827] border border-[#10B981]/40 shadow-md">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#10B981] flex items-center gap-2 mb-2">
              <Flame size={15} /> MARQUEE TOP BUY
            </span>
            {topBuy ? (
              <div className="space-y-1">
                <h3 className="font-display font-black text-xl text-white">{topBuy.player_name}</h3>
                <p className="text-xs text-[#86948A]">
                  Acquired by <b className="text-[#10B981]">{topBuy.franchise_id}</b> for <b className="text-white font-mono">{formatCr(topBuy.sold_price_lakhs)}</b>
                </p>
                <div className="pt-2 text-xs font-mono text-[#FFB95F]">
                  Player Rating: {topBuy.game_points}/15 ★
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#86948A]">None recorded</p>
            )}
          </div>

          {/* Award: Best Value */}
          <div className="p-5 rounded-[6px] bg-[#111827] border border-[#06B6D4]/40 shadow-md">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#06B6D4] flex items-center gap-2 mb-2">
              <Sparkles size={15} /> BEST VALUE SIGNING
            </span>
            {awards?.bestValue ? (
              <div className="space-y-1">
                <h3 className="font-display font-black text-xl text-white">{awards.bestValue.player_name}</h3>
                <p className="text-xs text-[#86948A]">
                  Acquired by <b className="text-[#06B6D4]">{awards.bestValue.franchise_id}</b> for <b className="text-white font-mono">{formatCr(awards.bestValue.sold_price_lakhs)}</b>
                </p>
                <div className="pt-2 text-xs font-mono text-[#06B6D4]">
                  Efficiency: {awards.bestValue.game_points} Points at {formatCr(awards.bestValue.sold_price_lakhs)}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#86948A]">None recorded</p>
            )}
          </div>

          {/* Award: Top Spender */}
          <div className="p-5 rounded-[6px] bg-[#111827] border border-[#F59E0B]/40 shadow-md">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F59E0B] flex items-center gap-2 mb-2">
              <PurseCoinsIcon size={15} color="#F59E0B" /> HIGHEST CAPITAL DEPLOYER
            </span>
            {awards?.topSpender ? (
              <div className="space-y-1">
                <h3 className="font-display font-black text-xl text-white">{awards.topSpender.display_name} ({awards.topSpender.franchise_id})</h3>
                <p className="text-xs text-[#86948A]">
                  Spent <b className="text-white font-mono">{formatCr(awards.topSpender.total_spent_lakhs)}</b> to acquire {awards.topSpender.squad_count} players.
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#86948A]">None recorded</p>
            )}
          </div>

          {/* Award: Top Rated Squad */}
          <div className="p-5 rounded-[6px] bg-[#111827] border border-[#F59E0B]/50 shadow-md">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F59E0B] flex items-center gap-2 mb-2">
              <CrownHostIcon size={15} color="#F59E0B" /> TOP RATED SQUAD
            </span>
            {championTeam ? (
              <div className="space-y-1">
                <h3 className="font-display font-black text-xl text-white">{championTeam.display_name} ({championTeam.franchise_id})</h3>
                <p className="text-xs text-[#86948A]">
                  Highest overall squad strength rating with <b className="text-[#10B981] font-mono">{championTeam.total_points} PTS</b>.
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#86948A]">None recorded</p>
            )}
          </div>
        </div>
      )}

      {/* Responsive Footer Navigation: stacked on mobile, row on tablet/desktop */}
      <div className="flex flex-col sm:flex-row justify-center gap-3 relative z-10 pt-4">
        <GameButton
          onClick={() => navigate('/')}
          variant="primary"
          size="lg"
          icon={<ArrowLeft size={16} />}
          className="w-full sm:w-auto"
        >
          Return to Home
        </GameButton>

        <GameButton
          onClick={() => navigate('/create')}
          variant="secondary"
          size="lg"
          icon={<GavelIcon size={16} />}
          className="w-full sm:w-auto"
        >
          Host New Game
        </GameButton>
      </div>

    </div>
  );
}
