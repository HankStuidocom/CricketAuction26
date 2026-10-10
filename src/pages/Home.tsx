import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus, LogIn, Users, Flame, ChevronRight, User } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ca26_user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col justify-between p-4 sm:p-6 pitch-bg">
      {/* Top Navigation */}
      <header className="flex justify-between items-center max-w-6xl w-full mx-auto py-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#181B21] border border-[rgba(255,255,255,0.08)] text-[#B6FF3B]">
            <Trophy size={20} />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-tight leading-none">IPL 2026</div>
            <div className="text-[10px] text-[#A3A7B0] font-bold tracking-widest uppercase">AUCTION ARENA</div>
          </div>
        </div>

        <div>
          {user ? (
            <div className="flex items-center gap-2 bg-[#111318] border border-[rgba(255,255,255,0.08)] px-3 py-1.5 rounded-full text-xs">
              <span className="w-2 h-2 rounded-full bg-[#B6FF3B]"></span>
              <span className="font-bold">{user.display_name || user.username}</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-xs font-bold bg-[#111318] border border-[rgba(255,255,255,0.08)] rounded-xl hover:bg-[#181B21] transition"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-2 text-xs font-bold bg-[#B6FF3B] text-black rounded-xl hover:bg-[#a3f024] transition"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto text-center my-auto py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#181B21] border border-[rgba(255,255,255,0.08)] rounded-full text-xs font-bold text-[#B6FF3B] mb-6">
          <Flame size={14} className="text-[#F5C542]" />
          <span>OFFICIAL 250 CRICKETER SQUAD POOL</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-tight mb-4">
          BUILD YOUR SQUAD.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B6FF3B] via-[#F5C542] to-[#B6FF3B]">
            WIN THE AUCTION.
          </span>
        </h1>

        <p className="text-sm sm:text-lg text-[#A3A7B0] max-w-xl mx-auto mb-10">
          Experience real-time multiplayer cricket bidding with up to 10 IPL franchises, live synchronized timers, and authentic player point evaluations.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
          <button
            onClick={() => navigate('/create')}
            className="flex-1 py-4 px-6 bg-[#B6FF3B] hover:bg-[#a3f024] text-black font-black text-sm rounded-xl transition shadow-[0_0_25px_rgba(182,255,59,0.3)] flex items-center justify-center gap-2"
          >
            <Plus size={18} /> CREATE AUCTION
          </button>
          <button
            onClick={() => navigate('/join')}
            className="flex-1 py-4 px-6 bg-[#181B21] border border-[rgba(255,255,255,0.08)] hover:bg-[#20242c] text-[#F5F5F5] font-extrabold text-sm rounded-xl transition flex items-center justify-center gap-2"
          >
            <LogIn size={18} /> JOIN AUCTION
          </button>
        </div>
      </main>

      {/* Footer Info Strip */}
      <footer className="max-w-4xl w-full mx-auto text-center text-xs text-[#A3A7B0] py-4 border-t border-[rgba(255,255,255,0.04)]">
        CSK · MI · KKR · DC · RCB · PBKS · RR · SRH · GT · LSG · 10 Franchises Multi-Player Engine
      </footer>
    </div>
  );
}
