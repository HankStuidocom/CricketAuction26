import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_FRANCHISES, getOrCreateUserId, saveRoomSession } from '../lib/utils';
import { safeFetch } from '../lib/api';
import { Search, LogIn, Shield, Users, Lock, AlertCircle, ArrowLeft } from 'lucide-react';

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
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');

  const checkRoom = async () => {
    if (!roomCode.trim() || roomCode.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const room = await safeFetch(`/api/rooms/${roomCode.toUpperCase().trim()}`);
      setRoomInfo(room);
      if (room.is_private) {
        setShowPassword(true);
      } else {
        setShowPassword(false);
      }
    } catch (err: any) {
      setError(err.message);
      setRoomInfo(null);
      setShowPassword(false);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return setError('Please enter a room code');
    if (showPassword && !password.trim()) return setError('Please enter room password');

    setLoading(true);
    setError('');

    try {
      const code = roomCode.toUpperCase().trim();
      // Validate room existence (and password if private)
      const room = await safeFetch(`/api/rooms/${code}`);
      if (!room) throw new Error('Room not found');

      const userId = getOrCreateUserId();
      saveRoomSession(code, {
        franchise: selectedFranchise,
        displayName,
        userId,
        password: showPassword ? password : undefined
      });

      // Navigate to room lobby with password and userId
      navigate(`/room/${code}`, {
        state: { displayName, franchise: selectedFranchise, userId, password: showPassword ? password : undefined }
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05172E] via-[#020B18] to-[#020A16] text-[#F5F7FF] flex flex-col justify-center items-center px-4 py-8 relative font-['DM_Sans',sans-serif]">
      {/* Top Header with Back Navigation */}
      <div className="w-full max-w-lg flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8993A8] hover:text-white transition"
          title="Back to Home"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          <i className="brand-mark"></i>
          <span className="font-extrabold text-lg tracking-tight font-['Manrope']">
            Crick<span className="text-[#D9FF4D]">Auction</span>
          </span>
        </div>

        <div className="w-10"></div>
      </div>

      <div className="w-full max-w-lg bg-[#0B1730] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-[#061224] border border-white/10 mb-3 text-[#D9FF4D]">
            <LogIn size={26} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-['Manrope'] text-white">Join Auction Room</h1>
          <p className="text-xs sm:text-sm text-[#8993A8] mt-1">Enter the 6-character room code to start bidding</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs sm:text-sm font-medium text-center flex items-center justify-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2 text-center">
              Room Code
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={6}
                value={roomCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setRoomCode(val);
                  if (val.length === 6) checkRoom();
                }}
                onBlur={checkRoom}
                placeholder="e.g. 7K2P9A"
                className="w-full bg-[#061224] border border-white/10 rounded-xl py-3.5 text-center text-2xl font-mono tracking-widest text-[#D9FF4D] focus:outline-none focus:border-[#D9FF4D] pr-12 font-black"
              />
              {roomInfo && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs">
                  {roomInfo.is_private ? (
                    <span className="flex items-center gap-1 text-orange-400 font-bold">
                      <Lock size={14} /> Private
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-green-400 font-bold">
                      <Shield size={14} /> Public
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {showPassword && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2">
                Room Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter room password"
                className="w-full bg-[#061224] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D9FF4D]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2">
              Your Display Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#061224] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D9FF4D]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2">
              Preferred Franchise
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ALL_FRANCHISES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFranchise(f.id)}
                  className={`p-2 rounded-xl border text-center font-bold text-xs transition flex flex-col items-center justify-between min-h-[92px] ${
                    selectedFranchise === f.id
                      ? 'border-[#D9FF4D] bg-[#0E1E3C] text-[#D9FF4D] shadow-[0_0_15px_rgba(217,255,77,0.25)] scale-[1.02]'
                      : 'border-white/10 bg-[#061224] text-[#8993A8] hover:border-white/20'
                  }`}
                >
                  <div className="h-11 w-full flex items-center justify-center my-auto">
                    {f.logoUrl ? (
                      <img src={f.logoUrl} alt={f.id} className="max-h-10 max-w-[44px] object-contain drop-shadow-md" />
                    ) : (
                      <span className="text-xl">{f.emoji}</span>
                    )}
                  </div>
                  <div className="text-[10px] font-black tracking-wider mt-1">{f.id}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#D9FF4D] hover:bg-[#c7f035] text-[#07111E] font-black text-xs uppercase tracking-wider rounded-xl transition shadow-[0_0_20px_rgba(217,255,77,0.3)] disabled:opacity-50"
          >
            {loading ? 'Joining Room...' : 'ENTER AUCTION LOBBY'}
          </button>
        </form>
      </div>
    </div>
  );
}