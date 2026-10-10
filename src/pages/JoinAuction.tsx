import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_FRANCHISES } from '../lib/utils';
import { safeFetch } from '../lib/api';
import { Search, LogIn, Shield, Users } from 'lucide-react';

export default function JoinAuction() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [displayName, setDisplayName] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('ca26_user') || '{}');
      return user.display_name || user.username || 'Guest Player';
    } catch {
      return 'Guest Player';
    }
  });
  const [selectedFranchise, setSelectedFranchise] = useState('MI');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return setError('Please enter a room code');

    setLoading(true);
    setError('');

    try {
      // Validate room existence
      const room = await safeFetch(`/api/rooms/${roomCode.toUpperCase().trim()}`);
      if (!room) throw new Error('Room not found');

      // Navigate to room lobby
      navigate(`/room/${roomCode.toUpperCase().trim()}`, {
        state: { displayName, franchise: selectedFranchise }
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col justify-center items-center px-4 pitch-bg">
      <div className="w-full max-w-lg bg-[#111318] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-[#181B21] border border-[rgba(255,255,255,0.08)] mb-3 text-[#B6FF3B]">
            <LogIn size={28} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Join Auction Room</h1>
          <p className="text-sm text-[#A3A7B0] mt-1">Enter the 6-character room code to start bidding</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A7B0] mb-2 text-center">
              Room Code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="e.g. 7K2P9A"
              className="w-full bg-[#181B21] border border-[rgba(255,255,255,0.08)] rounded-xl py-4 text-center text-2xl font-mono tracking-widest text-[#B6FF3B] focus:outline-none focus:border-[#B6FF3B]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A7B0] mb-2">
              Your Display Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#181B21] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#B6FF3B]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A7B0] mb-2">
              Preferred Franchise
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ALL_FRANCHISES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFranchise(f.id)}
                  className={`p-2 rounded-lg border text-center font-bold text-xs transition ${
                    selectedFranchise === f.id
                      ? 'border-[#B6FF3B] bg-[#181B21] text-[#B6FF3B]'
                      : 'border-[rgba(255,255,255,0.08)] bg-[#111318] text-[#A3A7B0] hover:border-[rgba(255,255,255,0.2)]'
                  }`}
                >
                  <div className="h-7 flex items-center justify-center mb-1">
                    {f.logoUrl ? (
                      <img src={f.logoUrl} alt={f.id} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span>{f.emoji}</span>
                    )}
                  </div>
                  <div>{f.id}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#B6FF3B] hover:bg-[#a3f024] text-black font-extrabold text-sm rounded-xl transition shadow-[0_0_20px_rgba(182,255,59,0.3)] disabled:opacity-50"
          >
            {loading ? 'Joining Room...' : 'ENTER AUCTION LOBBY'}
          </button>
        </form>
      </div>
    </div>
  );
}
