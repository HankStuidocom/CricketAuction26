import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_FRANCHISES } from '../lib/utils';
import { safeFetch } from '../lib/api';
import { Shield, Settings2, CheckCircle2, ChevronRight, ChevronLeft, Lock } from 'lucide-react';

export default function CreateAuction() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Franchise & Display Name
  const [selectedFranchise, setSelectedFranchise] = useState('CSK');
  const [displayName, setDisplayName] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('ca26_user') || '{}');
      return user.display_name || user.username || 'Auction Boss';
    } catch {
      return 'Auction Boss';
    }
  });

  // Step 2: Settings
  const [roomName, setRoomName] = useState('IPL 2026 Mega Arena');
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxTeams, setMaxTeams] = useState(10);
  const [maxSquadSize, setMaxSquadSize] = useState(10);
  const [startingPurseCr, setStartingPurseCr] = useState(120);
  const [bidTimerSeconds, setBidTimerSeconds] = useState(10);
  const [isUnlimitedTimer, setIsUnlimitedTimer] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    setLoading(true);
    setError('');

    let hostId = 'guest-host';
    try {
      const user = JSON.parse(localStorage.getItem('ca26_user') || '{}');
      if (user.id) hostId = user.id;
    } catch {}

    const payload = {
      hostId,
      hostFranchise: selectedFranchise,
      hostDisplayName: displayName,
      roomConfig: {
        name: roomName,
        isPrivate,
        maxTeams,
        maxSquadSize,
        startingPurse: startingPurseCr * 100, // into Lakhs
        bidTimer: bidTimerSeconds,
        isUnlimited: isUnlimitedTimer,
        aiEnabled,
        aiDifficulty
      }
    };

    try {
      const data = await safeFetch<{ success: boolean; roomCode: string }>('/api/rooms', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      navigate(`/room/${data.roomCode}`, {
        state: { displayName, franchise: selectedFranchise }
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] py-8 px-4 sm:px-6 max-w-5xl mx-auto pitch-bg">
      {/* Header */}
      <div className="mb-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#181B21] border border-[rgba(255,255,255,0.08)] rounded-full text-xs font-bold text-[#B6FF3B] mb-2">
          <span>STEP {step} OF 3</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Create Auction Arena</h1>
        <p className="text-sm text-[#A3A7B0] mt-1">Configure your room, pick your IPL franchise, and set the auction parameters.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Step Wizard Container */}
      <div className="bg-[#111318] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 sm:p-8 shadow-2xl">
        
        {/* Step 1: Franchise Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A7B0] mb-2">
                Your Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-[#181B21] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#B6FF3B]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A7B0] mb-3">
                Select Your IPL Franchise
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {ALL_FRANCHISES.map((team) => {
                  const isSelected = selectedFranchise === team.id;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setSelectedFranchise(team.id)}
                      className={`relative p-4 rounded-xl border text-left transition flex flex-col justify-between h-32 ${
                        isSelected 
                          ? 'border-[#B6FF3B] bg-[#181B21] shadow-[0_0_15px_rgba(182,255,59,0.2)]' 
                          : 'border-[rgba(255,255,255,0.08)] bg-[#111318] hover:border-[rgba(255,255,255,0.2)]'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        {team.logoUrl ? (
                          <img src={team.logoUrl} alt={team.id} className="w-10 h-10 object-contain drop-shadow-md" />
                        ) : (
                          <span className="text-2xl">{team.emoji}</span>
                        )}
                        {isSelected && <CheckCircle2 size={18} className="text-[#B6FF3B]" />}
                      </div>
                      <div>
                        <div className="text-lg font-black" style={{ color: team.primary }}>
                          {team.id}
                        </div>
                        <div className="text-xs text-[#A3A7B0] truncate">
                          {team.name}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#B6FF3B] hover:bg-[#a3f024] text-black font-extrabold text-sm rounded-xl transition"
              >
                Next: Room Settings <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Auction Parameters */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A7B0] mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full bg-[#181B21] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#B6FF3B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A7B0] mb-2">
                  Starting Purse (₹ Crore)
                </label>
                <input
                  type="number"
                  min={50}
                  max={200}
                  value={startingPurseCr}
                  onChange={(e) => setStartingPurseCr(Number(e.target.value))}
                  className="w-full bg-[#181B21] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#B6FF3B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A7B0] mb-2">
                  Squad Size Limit (Players per team)
                </label>
                <input
                  type="number"
                  min={5}
                  max={25}
                  value={maxSquadSize}
                  onChange={(e) => setMaxSquadSize(Number(e.target.value))}
                  className="w-full bg-[#181B21] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#B6FF3B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A7B0] mb-2">
                  Bid Countdown Timer
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    disabled={isUnlimitedTimer}
                    min={5}
                    max={60}
                    value={bidTimerSeconds}
                    onChange={(e) => setBidTimerSeconds(Number(e.target.value))}
                    className="w-2/3 bg-[#181B21] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#B6FF3B] disabled:opacity-40"
                  />
                  <button
                    type="button"
                    onClick={() => setIsUnlimitedTimer(!isUnlimitedTimer)}
                    className={`w-1/3 px-3 py-2 text-xs font-bold rounded-xl border transition ${
                      isUnlimitedTimer 
                        ? 'border-[#B6FF3B] bg-[#B6FF3B]/10 text-[#B6FF3B]' 
                        : 'border-[rgba(255,255,255,0.08)] bg-[#181B21] text-[#A3A7B0]'
                    }`}
                  >
                    Unlimited
                  </button>
                </div>
              </div>
            </div>

            {/* AI Toggle */}
            <div className="p-4 bg-[#181B21] border border-[rgba(255,255,255,0.08)] rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-sm">Fill Open Slots with AI Teams</div>
                <div className="text-xs text-[#A3A7B0]">Bots will bid dynamically based on purse and team balance</div>
              </div>
              <button
                type="button"
                onClick={() => setAiEnabled(!aiEnabled)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                  aiEnabled ? 'bg-[#B6FF3B] justify-end' : 'bg-gray-700 justify-start'
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${aiEnabled ? 'bg-black' : 'bg-white'}`} />
              </button>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#181B21] border border-[rgba(255,255,255,0.08)] hover:bg-[#20242c] text-[#F5F5F5] font-bold text-sm rounded-xl transition"
              >
                <ChevronLeft size={18} /> Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#B6FF3B] hover:bg-[#a3f024] text-black font-extrabold text-sm rounded-xl transition"
              >
                Review Summary <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Launch */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold">Room Summary</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#181B21] border border-[rgba(255,255,255,0.08)] rounded-xl">
              <div>
                <span className="text-xs text-[#A3A7B0]">HOST</span>
                <p className="font-bold text-sm">{displayName} ({selectedFranchise})</p>
              </div>
              <div>
                <span className="text-xs text-[#A3A7B0]">STARTING PURSE</span>
                <p className="font-bold text-sm">₹{startingPurseCr} Cr</p>
              </div>
              <div>
                <span className="text-xs text-[#A3A7B0]">SQUAD SIZE</span>
                <p className="font-bold text-sm">{maxSquadSize} Players</p>
              </div>
              <div>
                <span className="text-xs text-[#A3A7B0]">TIMER</span>
                <p className="font-bold text-sm">{isUnlimitedTimer ? 'Unlimited' : `${bidTimerSeconds}s`}</p>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#181B21] border border-[rgba(255,255,255,0.08)] hover:bg-[#20242c] text-[#F5F5F5] font-bold text-sm rounded-xl transition"
              >
                <ChevronLeft size={18} /> Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleCreateRoom}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#B6FF3B] hover:bg-[#a3f024] text-black font-black text-sm rounded-xl transition shadow-[0_0_20px_rgba(182,255,59,0.3)] disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'CREATE & ENTER LOBBY'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
