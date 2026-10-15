import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_FRANCHISES, getOrCreateUserId, saveRoomSession } from '../lib/utils';
import { safeFetch } from '../lib/api';
import GameButton from '../components/GameButton';
import GamePanel from '../components/GamePanel';
import { 
  CricketBatBallIcon, 
  PrivateLockIcon, 
  ShieldCrestIcon, 
  GavelIcon 
} from '../components/GameIcons';
import { ArrowLeft, AlertCircle, Lock, Shield, Users } from 'lucide-react';
import { ServerHealthBadge } from '../components/ServerHealthBadge';

export default function JoinAuction() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [displayName, setDisplayName] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('ca26_user') || '{}');
      return user.display_name || user.username || 'Tactical Player';
    } catch {
      return 'Tactical Player';
    }
  });
  const [selectedFranchise, setSelectedFranchise] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');

  // Taken franchise IDs (by other human players)
  const takenFranchises: string[] = roomInfo?.participants
    ?.filter((p: any) => !p.is_ai && p.franchise_id)
    .map((p: any) => p.franchise_id) || [];

  // Auto-select the first available slot when room loads
  useEffect(() => {
    if (roomInfo) {
      const firstAvailable = ALL_FRANCHISES.find(f => !takenFranchises.includes(f.id));
      if (firstAvailable && !selectedFranchise) {
        setSelectedFranchise(firstAvailable.id);
      }
      // If previously selected is now taken, reset to next available
      if (selectedFranchise && takenFranchises.includes(selectedFranchise)) {
        const nextAvailable = ALL_FRANCHISES.find(f => !takenFranchises.includes(f.id));
        setSelectedFranchise(nextAvailable?.id || '');
      }
    }
  }, [roomInfo]);

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
      // Auto-select first available franchise
      const taken = room.participants
        ?.filter((p: any) => !p.is_ai && p.franchise_id)
        .map((p: any) => p.franchise_id) || [];
      const firstFree = ALL_FRANCHISES.find(f => !taken.includes(f.id));
      setSelectedFranchise(firstFree?.id || 'MI');
    } catch (err: any) {
      setError(err.message);
      setRoomInfo(null);
      setShowPassword(false);
      setSelectedFranchise('');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return setError('Please enter a room code');
    if (!roomInfo) return setError('Please search for the room first');
    if (!selectedFranchise) return setError('Please select an available franchise');
    if (showPassword && !password.trim()) return setError('Please enter room password');

    setLoading(true);
    setError('');

    try {
      const code = roomCode.toUpperCase().trim();
      const userId = getOrCreateUserId();
      saveRoomSession(code, {
        franchise: selectedFranchise,
        displayName,
        userId,
        password: showPassword ? password : undefined
      });

      // Navigate to room lobby — the Lobby component will emit join_room via socket
      navigate(`/room/${code}`, {
        state: { displayName, franchise: selectedFranchise, userId, password: showPassword ? password : undefined }
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const availableSlots = ALL_FRANCHISES.filter(f => !takenFranchises.includes(f.id)).length;

  return (
    <div className="min-h-screen bg-[#090D16] text-[#DFE2EF] flex flex-col justify-center items-center px-4 py-8 relative font-sans">
      
      {/* Top Header */}
      <div className="w-full max-w-lg flex items-center justify-between mb-4 pb-3 border-b border-[#1F2937]">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 rounded-[6px] bg-[#111827] border border-[#1F2937] flex items-center justify-center text-[#86948A] hover:text-[#DFE2EF] hover:border-[#10B981] transition"
          title="Back to Home"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[6px] bg-[#111827] border border-[#1F2937] flex items-center justify-center shadow-inner">
            <CricketBatBallIcon size={16} color="#10B981" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-white">
            CRICK<span className="text-[#10B981]">AUCTION</span>
          </span>
          <span className="text-[10px] font-mono font-bold text-[#86948A] bg-[#1C1F29] px-1.5 py-0.5 rounded-[4px] border border-[#1F2937]">
            CONNECT
          </span>
        </div>

        <ServerHealthBadge compact />
      </div>

      <GamePanel glow="none" className="w-full max-w-lg p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-[6px] bg-[#1C1F29] border border-[#06B6D4]/40 mb-3 text-[#06B6D4] shadow-[0_0_16px_rgba(6,182,212,0.25)]">
            <ShieldCrestIcon size={24} color="#06B6D4" />
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-white uppercase">
            Join Tactical Arena
          </h1>
          <p className="text-xs text-[#86948A] mt-1">
            Enter the 6-character room code, then pick your franchise
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#FFB4AB] rounded-[6px] text-xs font-medium text-center flex items-center justify-center gap-2">
            <AlertCircle size={15} className="text-[#EF4444] flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-5">

          {/* ── STEP 1: Room Code ── */}
          <div>
            <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#86948A] mb-2 text-center">
              Arena Access Code
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={6}
                value={roomCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  setRoomCode(val);
                  if (val.length === 6) checkRoom();
                  if (val.length < 6) { setRoomInfo(null); setSelectedFranchise(''); }
                }}
                onBlur={checkRoom}
                placeholder="e.g. 7K2P9A"
                className="w-full bg-[#0F131C] border-2 border-[#1F2937] focus:border-[#10B981] rounded-[6px] py-3 text-center text-3xl font-mono tracking-widest text-[#10B981] focus:outline-none focus:shadow-[0_0_20px_rgba(16,185,129,0.25)] font-bold uppercase transition"
              />
              {roomInfo && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs">
                  {roomInfo.is_private ? (
                    <span className="flex items-center gap-1 text-[#F59E0B] font-mono text-[11px] font-bold bg-[#F59E0B]/10 px-2 py-0.5 rounded-[4px] border border-[#F59E0B]/30">
                      <Lock size={11} /> PRIVATE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[#10B981] font-mono text-[11px] font-bold bg-[#10B981]/10 px-2 py-0.5 rounded-[4px] border border-[#10B981]/30">
                      <Shield size={11} /> PUBLIC
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Room Preview strip ── */}
          {roomInfo && (
            <div className="p-3 rounded-[6px] bg-[#111827] border border-[#10B981]/30 flex items-center justify-between">
              <div>
                <p className="text-sm font-display font-bold text-white">{roomInfo.room_name}</p>
                <p className="text-[11px] text-[#86948A] mt-0.5">
                  Host: <span className="text-[#DFE2EF]">{roomInfo.host_franchise}</span>
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-[#10B981] font-mono font-bold text-sm">
                  <Users size={14} />
                  <span>{roomInfo.participants?.length || 0}/{roomInfo.max_teams || 10}</span>
                </div>
                <p className="text-[11px] text-[#86948A]">{availableSlots} slots free</p>
              </div>
            </div>
          )}

          {/* ── Password (if private) ── */}
          {showPassword && (
            <div className="p-3.5 bg-[#181B25] border border-[#F59E0B]/40 rounded-[6px]">
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#F59E0B] mb-1.5 flex items-center gap-1.5">
                <PrivateLockIcon size={14} color="#F59E0B" />
                <span>Room Passkey Required</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter room password"
                className="w-full bg-[#0F131C] border border-[#1F2937] rounded-[6px] px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#F59E0B] font-mono font-bold"
              />
            </div>
          )}

          {/* ── Display Name ── */}
          <div>
            <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#86948A] mb-1.5">
              Player Display Tag
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#0F131C] border border-[#1F2937] rounded-[6px] px-3.5 py-2.5 text-sm text-[#DFE2EF] focus:outline-none focus:border-[#10B981] font-display font-bold"
            />
          </div>

          {/* ── Franchise Selector — only after room is found ── */}
          {roomInfo && (
            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#86948A] mb-2 flex items-center justify-between">
                <span>Select Your Franchise</span>
                {selectedFranchise && (
                  <span className="text-[#10B981] font-mono font-bold text-xs">{selectedFranchise} ✓</span>
                )}
              </label>
              <div className="grid grid-cols-5 gap-2">
                {ALL_FRANCHISES.map((f) => {
                  const isTaken = takenFranchises.includes(f.id);
                  const takenByName = roomInfo.participants?.find((p: any) => p.franchise_id === f.id && !p.is_ai)?.display_name;
                  const isSelected = selectedFranchise === f.id;

                  return (
                    <button
                      key={f.id}
                      type="button"
                      disabled={isTaken}
                      onClick={() => !isTaken && setSelectedFranchise(f.id)}
                      title={isTaken ? `Taken by ${takenByName}` : f.id}
                      className={`p-2 rounded-[6px] border text-center font-bold text-xs transition flex flex-col items-center justify-between min-h-[80px] relative ${
                        isTaken
                          ? 'border-[#EF4444]/30 bg-[#111827] opacity-40 cursor-not-allowed'
                          : isSelected
                          ? 'border-[#10B981] bg-[#1C1F29] text-[#10B981] shadow-[0_0_16px_rgba(16,185,129,0.25)] scale-[1.02]'
                          : 'border-[#1F2937] bg-[#111827] text-[#86948A] hover:border-[#3C4A42] hover:bg-[#181B25] cursor-pointer'
                      }`}
                    >
                      {isTaken && (
                        <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-[#EF4444] flex items-center justify-center">
                          <span className="text-[7px] text-white font-black">✕</span>
                        </div>
                      )}
                      <div className="h-9 w-full flex items-center justify-center my-auto">
                        {f.logoUrl ? (
                          <img src={f.logoUrl} alt={f.id} className={`max-h-8 max-w-[38px] object-contain drop-shadow ${isTaken ? 'grayscale' : ''}`} />
                        ) : (
                          <span className="text-lg">{f.emoji}</span>
                        )}
                      </div>
                      <div className="text-[10px] font-display font-black tracking-wider mt-1">{f.id}</div>
                      {isTaken && (
                        <div className="text-[8px] text-[#EF4444] truncate w-full text-center font-bold">TAKEN</div>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[#86948A] mt-2 text-center">
                Red slots are taken · Grey slots are available · You can change in lobby
              </p>
            </div>
          )}

          {/* ── Enter button ── */}
          <div className="pt-2">
            <GameButton
              type="submit"
              disabled={loading || !roomInfo || !selectedFranchise}
              loading={loading}
              variant="primary"
              size="lg"
              fullWidth
              icon={<GavelIcon size={18} color="#090D16" />}
            >
              {!roomInfo ? 'FIND ROOM FIRST (ENTER CODE)' : `ENTER AS ${selectedFranchise || '...'}`}
            </GameButton>
          </div>
        </form>
      </GamePanel>
    </div>
  );
}