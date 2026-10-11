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
  PurseCoinsIcon 
} from '../components/GameIcons';
import { ArrowLeft, Flame, Users } from 'lucide-react';

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
    <div className="min-h-screen bg-[#090D16] text-[#DFE2EF] py-8 px-4 sm:px-6 max-w-5xl mx-auto font-sans relative">
      
      {/* Stadium spotlight glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Trophy Banner */}
      <div className="text-center mb-8 relative z-10 animate-fade-up">
        <div className="inline-flex p-4 rounded-[8px] bg-gradient-to-br from-[#F59E0B]/20 to-[#10B981]/10 border border-[#F59E0B]/40 mb-3 text-[#F59E0B] shadow-[0_0_35px_rgba(245,158,11,0.25)]">
          <TrophyCupIcon size={40} color="#F59E0B" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white uppercase">
          Tournament Complete
        </h1>
        <p className="text-xs sm:text-sm text-[#86948A] mt-1 max-w-md mx-auto">
          The auction gavel has dropped. Review the completed draft rosters, marquee signings, and capital allocations.
        </p>
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
              <div className="font-display font-black text-lg text-white">
                {topBuy.player_name}
              </div>
              <div className="text-xs text-[#86948A] flex items-center gap-1.5 mt-0.5">
                <span className="font-display font-bold text-[#10B981]">{topBuy.franchise_id}</span>
                <span>·</span>
                <span className="font-mono text-white font-bold">{formatCr(topBuy.sold_price_lakhs)}</span>
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
              {results.length} Players
            </div>
            <div className="text-[10px] text-[#86948A] mt-0.5">
              Drafted into team franchises
            </div>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <GamePanel 
        title={`Drafted Roster (${results.length} Players)`}
        glow="none"
        className="mb-8 relative z-10 p-0"
      >
        {results.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#86948A]">
            No players were acquired during this tournament session.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1F2937] text-[10px] uppercase font-mono font-bold text-[#86948A] tracking-wider bg-[#181B25]">
                  <th className="py-2.5 px-4">Player</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Franchise</th>
                  <th className="py-2.5 px-4 text-right">Sold Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]">
                {results.map((r, i) => (
                  <tr key={i} className="hover:bg-[#181B25] transition-colors">
                    <td className="py-2.5 px-4 font-display font-bold text-white">
                      {r.player_name}
                    </td>
                    <td className="py-2.5 px-3">
                      <RoleBadge role={r.primary_role} compact />
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

      {/* Footer Navigation */}
      <div className="flex justify-center gap-3 relative z-10">
        <GameButton
          onClick={() => navigate('/')}
          variant="primary"
          size="lg"
          icon={<ArrowLeft size={16} />}
        >
          Return to Arena Command
        </GameButton>

        <GameButton
          onClick={() => navigate('/create')}
          variant="secondary"
          size="lg"
          icon={<GavelIcon size={16} />}
        >
          Host New Tournament
        </GameButton>
      </div>

    </div>
  );
}
