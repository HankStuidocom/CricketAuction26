import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, Award, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ALL_FRANCHISES, formatCr } from '../lib/utils';
import { safeFetch } from '../lib/api';

export default function Results() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    safeFetch(`/api/rooms/${code}/results`)
      .then((data) => {
        setResults(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [code]);

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] py-8 px-4 sm:px-6 max-w-5xl mx-auto pitch-bg">
      <div className="text-center mb-8">
        <div className="inline-flex p-3 rounded-2xl bg-[#181B21] border border-[rgba(255,255,255,0.08)] mb-3 text-[#F5C542]">
          <Trophy size={36} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Auction Completed!</h1>
        <p className="text-sm text-[#A3A7B0] mt-1">Here is the final squad breakdown and player sales report.</p>
      </div>

      <div className="bg-[#111318] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 sm:p-8 shadow-2xl mb-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Award className="text-[#B6FF3B]" /> Purchased Players ({results.length})
        </h3>

        {results.length === 0 ? (
          <div className="text-center py-8 text-sm text-[#A3A7B0]">
            No players were sold in this auction.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.08)] text-xs text-[#A3A7B0]">
                  <th className="pb-3">Player</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Franchise</th>
                  <th className="pb-3">Sold Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                {results.map((r, i) => (
                  <tr key={i} className="hover:bg-[#181B21]">
                    <td className="py-3 font-bold">{r.player_name}</td>
                    <td className="py-3 text-[#A3A7B0]">{r.primary_role}</td>
                    <td className="py-3 font-bold text-[#B6FF3B]">{r.franchise_id}</td>
                    <td className="py-3 font-mono">{formatCr(r.sold_price_lakhs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3.5 bg-[#B6FF3B] hover:bg-[#a3f024] text-black font-extrabold text-sm rounded-xl transition shadow-[0_0_20px_rgba(182,255,59,0.3)] flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Return to Home Arena
        </button>
      </div>
    </div>
  );
}
