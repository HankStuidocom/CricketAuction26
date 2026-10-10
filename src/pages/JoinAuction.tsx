import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_FRANCHISES, getOrCreateUserId, saveRoomSession } from '../lib/utils';
import { safeFetch } from '../lib/api';
import GameButton from '../components/GameButton';
import GamePanel from '../components/GamePanel';
import { 
  CricketBatBallIcon, 
  PrivateLockIcon, 
  ShieldCrestIcon, 
  GavelIcon, 
  CheckmarkIcon 
} from '../components/GameIcons';
import { ArrowLeft, AlertCircle, LogIn, Lock, Shield } from 'lucide-react';

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
      const room = await safeFetch<any>(`/api/rooms/${roomCode.toUpperCase().trim()}`);
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
      // Validate room existence
      const room = await safeFetch(`/api/rooms/${code}`);
      if (!room) throw new Error('Room not found');

      const userId = getOrCreateUserId();
      saveRoomSession(code, {
        franchise: selectedFranchise,
        displayName,
        userId,
        password: showPassword ? password : undefined
      });

      // Navigate to room lobby
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
    <div className="min-h-screen bg-[#020814] text-[#F8FAFC] flex flex-col justify-center items-center px-4 py-8 relative font-['DM_Sans',sans-serif]">
      
      {/* Top Header with Back Navigation */}
      <div className="w-full max-w-lg flex items-center justify-between mb-4 pb-3 border-b border-white/8">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8993A8] hover:text-white transition"
          title="Back to Home"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#102D5E] to-[#08152E] border border-white/15 flex items-center justify-center">
            <CricketBatBallIcon size={16} color="#D9FF4D" />
          </div>
          <span className="font-['Manrope'] font-black text-lg tracking-tight">
            Crick<span className="text-[#D9FF4D]">Auction</span>
          </span>
        </div>

        <div className="w-10"></div>
      </div>

      <GamePanel glow="none" className="w-full max-w-lg p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-[#091B3A] border border-[#00E5FF]/30 mb-3 text-[#00E5FF] shadow-[0_0_20px_rgba(0,229,255,0.25)]">
            <ShieldCrestIcon size={28} color="#00E5FF" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-['Manrope'] text-white">
            Join Auction Arena
          </h1>
          <p className="text-xs sm:text-sm text-[#8993A8] mt-1">
            Enter the 6-character tournament invite code to join your crew
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-xs sm:text-sm font-medium text-center flex items-center justify-center gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2 text-center font-['Manrope']">
              Arena Invite Code
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
                className="w-full bg-[#050E1D] border-2 border-white/15 focus:border-[#D9FF4D] rounded-2xl py-3.5 text-center text-3xl font-mono tracking-widest text-[#D9FF4D] focus:outline-none focus:shadow-[0_0_25px_rgba(217,255,77,0.3)] font-black uppercase transition"
              />
              {roomInfo && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs">
                  {roomInfo.is_private ? (
                    <span className="flex items-center gap-1 text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/30">
                      <Lock size={12} /> Private
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/30">
                      <Shield size={12} /> Public
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {showPassword && (
            <div className="p-4 bg-[#050E1D] border border-orange-500/30 rounded-xl animate-fade-up">
              <label className="block text-xs font-bold uppercase tracking-wider text-orange-300 mb-2 font-['Manrope'] flex items-center gap-1.5">
                <PrivateLockIcon size={14} color="#FB923C" />
                <span>Room Password Required</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to enter private room"
                className="w-full bg-[#020814] border border-white/12 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-400 font-bold"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2 font-['Manrope']">
              Your Player Gamer Tag
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#050E1D] border border-white/12 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D9FF4D] font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2 font-['Manrope'] flex items-center justify-between">
              <span>Preferred Franchise Slot</span>
              <span className="text-[#D9FF4D] font-bold text-xs">{selectedFranchise}</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ALL_FRANCHISES.map((f) => {
                const isSelected = selectedFranchise === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFranchise(f.id)}
                    className={`p-2 rounded-xl border text-center font-bold text-xs transition flex flex-col items-center justify-between min-h-[92px] ${
                      isSelected
                        ? 'border-[#D9FF4D] bg-[#0E2042] text-[#D9FF4D] shadow-[0_0_18px_rgba(217,255,77,0.3)] scale-[1.03]'
                        : 'border-white/10 bg-[#050E1D] text-[#8993A8] hover:border-white/25 hover:bg-[#08152B]'
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
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <GameButton
              type="submit"
              disabled={loading}
              loading={loading}
              variant="primary"
              size="lg"
              fullWidth
              icon={<GavelIcon size={18} color="#051120" />}
            >
              ENTER ARENA LOBBY
            </GameButton>
          </div>
        </form>
      </GamePanel>
    </div>
  );
}