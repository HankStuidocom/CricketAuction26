import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { ALL_FRANCHISES, FRANCHISE_MAP, formatCr } from '../lib/utils';
import { safeFetch } from '../lib/api';
import GameButton from '../components/GameButton';
import GamePanel from '../components/GamePanel';
import { RoleBadge } from '../components/GameBadge';
import { 
  TrophyCupIcon, 
  CricketBatBallIcon, 
  GavelIcon, 
  PurseCoinsIcon, 
  CrownHostIcon 
} from '../components/GameIcons';
import { ArrowLeft, Award, Flame, Users } from 'lucide-react';

export default function Results() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.5 }
    });

    safeFetch<any[]>(`/api/rooms/${code}/results`)
      .then((data) => {
        setResults(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [code]);

  // Calculate Awards
  const totalSpentLakhs = results.reduce((acc, r) => acc + (r.sold_price_lakhs || 0), 0);
  const topBuy = results.length > 0 
    ? [...results].sort((a, b) => (b.sold_price_lakhs || 0) - (a.sold_price_lakhs || 0))[0] 
    : null;

  return (
    <div className="min-h-screen bg-[#020814] text-[#F8FAFC] py-8 px-4 sm:px-6 max-w-5xl mx-auto font-['DM_Sans',sans-serif] relative">
      
      {/* Stadium spotlight glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Trophy Banner */}
      <div className="text-center mb-8 relative z-10 animate-fade-up">
        <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/40 mb-3 text-amber-400 shadow-[0_0_35px_rgba(255,184,0,0.3)]">
          <TrophyCupIcon size={44} color="#FFB800" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-['Manrope'] text-white">
          Tournament Complete!
        </h1>
        <p className="text-xs sm:text-sm text-[#8993A8] mt-1 max-w-md mx-auto">
          The IPL 2026 auction gavel has dropped. Review the final draft rosters, marquee signings, and franchise expenditures.
        </p>
      </div>

      {/* Post-Match Awards 3-Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6 relative z-10">
        {/* Card 1: Top Buy */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#10244C] to-[#061224] border border-[#D9FF4D]/30 shadow-lg">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#D9FF4D] block flex items-center gap-1">
            <Flame size={12} className="text-[#D9FF4D]" /> Marquee Record Buy
          </span>
          {topBuy ? (
            <div className="mt-2">
              <div className="font-['Manrope'] font-black text-lg text-white">
                {topBuy.player_name}
              </div>
              <div className="text-xs text-[#8993A8] flex items-center gap-1.5 mt-0.5">
                <span className="font-bold text-[#D9FF4D]">{topBuy.franchise_id}</span>
                <span>·</span>
                <span className="font-mono text-white font-bold">{formatCr(topBuy.sold_price_lakhs)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#8993A8] mt-2">No player purchases</p>
          )}
        </div>

        {/* Card 2: Total Tournament Purse Spent */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0C1E3C] to-[#061022] border border-[#00E5FF]/30 shadow-lg">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#00E5FF] block flex items-center gap-1">
            <PurseCoinsIcon size={12} color="#00E5FF" /> Total Capital Spent
          </span>
          <div className="mt-2">
            <div className="font-['Manrope'] font-black text-2xl text-white font-mono">
              {formatCr(totalSpentLakhs)}
            </div>
            <div className="text-[10px] text-[#8993A8] mt-0.5">
              Across all participating franchises
            </div>
          </div>
        </div>

        {/* Card 3: Players Drafted */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#16102C] to-[#080614] border border-purple-500/30 shadow-lg">
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 block flex items-center gap-1">
            <Users size={12} className="text-purple-300" /> Rosters Completed
          </span>
          <div className="mt-2">
            <div className="font-['Manrope'] font-black text-2xl text-white font-mono">
              {results.length} Players
            </div>
            <div className="text-[10px] text-[#8993A8] mt-0.5">
              Successfully sold and drafted
            </div>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <GamePanel 
        title={`Purchased Roster (${results.length} Players)`}
        glow="none"
        className="mb-8 relative z-10"
      >
        {results.length === 0 ? (
          <div className="text-center py-10 text-sm text-[#8993A8]">
            No players were sold during this session.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase font-black text-[#8993A8] tracking-wider">
                  <th className="pb-3">Player</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Franchise</th>
                  <th className="pb-3 text-right">Sold Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {results.map((r, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 font-bold font-['Manrope'] text-white">
                      {r.player_name}
                    </td>
                    <td className="py-3">
                      <RoleBadge role={r.primary_role} compact />
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5 font-black" style={{ color: FRANCHISE_MAP[r.franchise_id]?.primary || '#D9FF4D' }}>
                        {FRANCHISE_MAP[r.franchise_id]?.logoUrl && (
                          <img src={FRANCHISE_MAP[r.franchise_id].logoUrl} alt={r.franchise_id} className="w-5 h-5 object-contain" />
                        )}
                        <span>{r.franchise_id}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-mono font-black text-[#D9FF4D]">
                      {formatCr(r.sold_price_lakhs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GamePanel>

      {/* Footer Navigation */}
      <div className="flex justify-center gap-4 relative z-10">
        <GameButton
          onClick={() => navigate('/')}
          variant="primary"
          size="lg"
          icon={<ArrowLeft size={16} />}
        >
          Return to Home Arena
        </GameButton>

        <GameButton
          onClick={() => navigate('/create')}
          variant="glass"
          size="lg"
          icon={<GavelIcon size={16} />}
        >
          Host New Tournament
        </GameButton>
      </div>

    </div>
  );
}
